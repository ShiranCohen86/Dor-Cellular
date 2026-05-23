const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');
const { paginate, escapeRegex } = require('../utils/pagination');
const productService = require('./product.service');

function genInvoiceNumber() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${stamp}-${rand}`;
}

async function genUniqueInvoiceNumber(retries = 5) {
  for (let i = 0; i < retries; i++) {
    const num = genInvoiceNumber();
    const exists = await Order.exists({ invoiceNumber: num });
    if (!exists) return num;
  }
  throw ApiError.internal('Failed to generate unique invoice number');
}

// Compute totals from items + order-level discount. Tax is per-item, computed as
// included in salePrice * taxRate/(100+taxRate) for VAT-inclusive pricing.
function computeTotals(order) {
  let subtotal = 0;
  let taxAmount = 0;
  for (const it of order.items) {
    const gross = it.unitPrice * it.quantity - (it.discount || 0);
    it.lineTotal = Math.max(0, gross);
    subtotal += it.lineTotal;
    const taxRate = it.taxRate ?? 17;
    taxAmount += it.lineTotal * (taxRate / (100 + taxRate));
  }

  let discountAmount = 0;
  if (order.discountType === 'percent') discountAmount = subtotal * (order.discountValue / 100);
  else if (order.discountType === 'fixed' || order.discountType === 'coupon') discountAmount = order.discountValue;
  discountAmount = Math.min(discountAmount, subtotal);

  const tradeInCredit = order.tradeIn?.creditAmount || 0;

  order.subtotal = +subtotal.toFixed(2);
  order.discountAmount = +discountAmount.toFixed(2);
  order.taxAmount = +taxAmount.toFixed(2);
  order.total = +Math.max(0, subtotal - discountAmount - tradeInCredit).toFixed(2);

  order.paidAmount = +order.payments.reduce((accumulatedAmount, payment) => accumulatedAmount + payment.amount, 0).toFixed(2);
  order.balanceDue = +(order.total - order.paidAmount).toFixed(2);
}

async function list(query) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.customerId) filter.customerId = query.customerId;
  if (query.branchId) filter.branchId = query.branchId;
  if (query.salespersonId) filter.salespersonId = query.salespersonId;
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }
  if (query.q) filter.invoiceNumber = new RegExp(escapeRegex(query.q), 'i');
  return paginate(Order, filter, query, { populate: 'customerId salespersonId branchId' });
}

async function getById(id) {
  const order = await Order.findById(id).populate('customerId salespersonId branchId');
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

// Create a sales order. Decrements stock per item, attaches payments and tradeIn.
async function create(data, user, io) {
  if (!data.items?.length) throw ApiError.badRequest('At least one item is required');

  // For customer-role users: resolve or create their Customer record so the order is linkable
  if (user.role === 'customer' && !data.customerId) {
    if (user.customerId) {
      data.customerId = user.customerId;
    } else if (user.email) {
      let customer = await Customer.findOne({ email: user.email });
      if (!customer) customer = await Customer.create({ name: user.name, phone: user.phone || '', email: user.email });
      data.customerId = customer._id;
    }
  }

  const session = await mongoose.startSession();
  let saved;
  try {
    await session.withTransaction(async () => {
      // Hydrate items from product
      const items = [];
      for (const it of data.items) {
        const product = await Product.findById(it.productId).session(session);
        if (!product) throw ApiError.notFound(`Product ${it.productId} not found`);
        items.push({
          productId: product._id,
          name: product.name,
          sku: product.sku,
          imei: it.imei || product.imei,
          quantity: it.quantity,
          unitPrice: it.unitPrice ?? product.salePrice,
          discount: it.discount || 0,
          taxRate: product.taxRate,
          lineTotal: 0,
          warrantyMonths: product.warrantyMonths,
        });
      }

      const order = new Order({
        invoiceNumber: await genUniqueInvoiceNumber(),
        branchId: data.branchId || user.branchId,
        customerId: data.customerId,
        salespersonId: user.id,
        items,
        payments: data.payments || [],
        tradeIn: data.tradeIn,
        discountType: data.discountType || 'none',
        discountValue: data.discountValue || 0,
        couponCode: data.couponCode,
        notes: data.notes,
        status: 'draft',
      });
      computeTotals(order);
      if (order.payments.length) order.status = 'completed'; // partial-paid counts as completed; balanceDue tracks remaining debt

      await order.save({ session });
      saved = order;

      // Customer side-effects — only for completed (paid) orders
      if (order.customerId && order.status === 'completed') {
        const points = Math.floor(order.total / 10);
        const update = { $inc: { loyaltyPoints: points } };
        if (order.balanceDue > 0) update.$inc.outstandingDebt = order.balanceDue;
        await Customer.updateOne({ _id: order.customerId }, update, { session });
      }
    });
    AuditLog.create({ userId: user.id, action: 'order.created', entity: 'Order', entityId: saved._id, meta: { invoiceNumber: saved.invoiceNumber, total: saved.total, items: saved.items.length, customerId: saved.customerId } }).catch(() => {});
    return saved;
  } finally {
    session.endSession();
  }
}

async function addPayment(id, payment, user) {
  const order = await Order.findById(id);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.status === 'cancelled' || order.status === 'refunded') throw ApiError.badRequest('Order is closed');
  order.payments.push(payment);
  const prevBalance = order.balanceDue;
  computeTotals(order);
  await order.save();
  if (order.customerId) {
    const debtDelta = order.balanceDue - prevBalance; // negative when paying down
    await Customer.updateOne({ _id: order.customerId }, { $inc: { outstandingDebt: debtDelta } });
  }
  AuditLog.create({ userId: user?.id, action: 'order.payment.added', entity: 'Order', entityId: order._id, meta: { invoiceNumber: order.invoiceNumber, amount: payment.amount, method: payment.method, balanceDue: order.balanceDue } }).catch(() => {});
  return order;
}

async function refund(id, { amount, reason, restock = true }, user, io) {
  const session = await mongoose.startSession();
  let saved;
  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(id).session(session);
      if (!order) throw ApiError.notFound('Order not found');
      if (order.status === 'refunded') throw ApiError.badRequest('Already fully refunded');
      const refundAmount = amount || order.total;
      if (refundAmount > order.total - order.refundedAmount) throw ApiError.badRequest('Refund exceeds total');

      order.refundedAmount = +(order.refundedAmount + refundAmount).toFixed(2);
      order.refundReason = reason;
      order.refundedAt = new Date();
      order.status = order.refundedAmount >= order.total ? 'refunded' : 'partially_refunded';
      await order.save({ session });

      if (restock) {
        for (const it of order.items) {
          await productService.adjustStock({
            productId: it.productId, branchId: order.branchId, delta: it.quantity,
            type: 'return', refType: 'Order', refId: order._id, performedBy: user.id, io,
          });
        }
      }
      saved = order;
    });
    AuditLog.create({ userId: user?.id, action: 'order.refunded', entity: 'Order', entityId: saved._id, meta: { invoiceNumber: saved.invoiceNumber, amount: saved.refundedAmount, reason: saved.refundReason, status: saved.status } }).catch(() => {});
    return saved;
  } finally {
    session.endSession();
  }
}

async function cancel(id, user) {
  const order = await Order.findById(id);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.status !== 'draft') throw ApiError.badRequest('Only draft orders can be cancelled this way; use refund');
  order.status = 'cancelled';
  await order.save();
  AuditLog.create({ userId: user?.id, action: 'order.cancelled', entity: 'Order', entityId: order._id, meta: { invoiceNumber: order.invoiceNumber, total: order.total } }).catch(() => {});
  return order;
}

module.exports = { list, getById, create, addPayment, refund, cancel, computeTotals, genInvoiceNumber };
