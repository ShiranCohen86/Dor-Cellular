const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');
const { paginate, escapeRegex } = require('../utils/pagination');

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

function computeTotals(order) {
  let subtotal = 0;
  for (const it of order.items) {
    it.lineTotal = +(it.unitPrice * it.quantity).toFixed(2);
    subtotal += it.lineTotal;
  }
  order.subtotal = +subtotal.toFixed(2);
  order.total = order.subtotal;
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

async function create(data, user) {
  if (!data.items?.length) throw ApiError.badRequest('At least one item is required');

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
      const items = [];
      for (const it of data.items) {
        const product = await Product.findById(it.productId).session(session);
        if (!product) throw ApiError.notFound(`Product ${it.productId} not found`);
        items.push({
          productId: product._id,
          name: product.name,
          sku: product.sku,
          quantity: it.quantity,
          unitPrice: it.unitPrice ?? product.salePrice,
          lineTotal: 0,
        });
      }

      const order = new Order({
        invoiceNumber: await genUniqueInvoiceNumber(),
        branchId: data.branchId || user.branchId,
        customerId: data.customerId,
        salespersonId: user.id,
        items,
        notes: data.notes,
        status: 'draft',
      });
      computeTotals(order);
      await order.save({ session });
      saved = order;
    });
    AuditLog.create({ userId: user.id, action: 'order.created', entity: 'Order', entityId: saved._id, meta: { invoiceNumber: saved.invoiceNumber, total: saved.total, items: saved.items.length, customerId: saved.customerId } }).catch(() => {});
    return saved;
  } finally {
    session.endSession();
  }
}

async function cancel(id, user) {
  const order = await Order.findById(id);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.status !== 'draft') throw ApiError.badRequest('Only draft orders can be cancelled');
  order.status = 'cancelled';
  await order.save();
  AuditLog.create({ userId: user?.id, action: 'order.cancelled', entity: 'Order', entityId: order._id, meta: { invoiceNumber: order.invoiceNumber, total: order.total } }).catch(() => {});
  return order;
}

module.exports = { list, getById, create, cancel, genInvoiceNumber };
