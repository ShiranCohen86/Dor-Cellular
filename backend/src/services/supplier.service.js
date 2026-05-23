const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');
const { paginate, escapeRegex } = require('../utils/pagination');

function genPONumber() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PO-${stamp}-${rand}`;
}

async function listSuppliers(query) {
  const filter = {};
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
  if (query.q) { const safe = escapeRegex(query.q); filter.$or = [{ name: new RegExp(safe, 'i') }, { email: new RegExp(safe, 'i') }]; }
  return paginate(Supplier, filter, query);
}

async function getSupplier(id) {
  const supplier = await Supplier.findById(id);
  if (!supplier) throw ApiError.notFound('Supplier not found');
  return supplier;
}

async function createSupplier(data, actorId) {
  const supplier = await Supplier.create(data);
  AuditLog.create({ userId: actorId, action: 'supplier.created', entity: 'Supplier', entityId: supplier._id, meta: { name: supplier.name } }).catch(() => {});
  return supplier;
}

async function updateSupplier(id, patch) {
  const supplier = await Supplier.findByIdAndUpdate(id, patch, { new: true });
  if (!supplier) throw ApiError.notFound('Supplier not found');
  return supplier;
}

async function listPOs(query) {
  const filter = {};
  if (query.supplierId) filter.supplierId = query.supplierId;
  if (query.status) filter.status = query.status;
  if (query.branchId) filter.branchId = query.branchId;
  return paginate(PurchaseOrder, filter, query, { populate: 'supplierId branchId createdBy' });
}

async function getPO(id) {
  const po = await PurchaseOrder.findById(id).populate('supplierId branchId createdBy');
  if (!po) throw ApiError.notFound('Purchase order not found');
  return po;
}

async function createPO(data, user) {
  let subtotal = 0;
  const items = [];
  for (const it of data.items) {
    const product = await Product.findById(it.productId);
    if (!product) throw ApiError.notFound(`Product ${it.productId} not found`);
    const unitCost = it.unitCost ?? product.purchasePrice;
    subtotal += unitCost * it.quantity;
    items.push({ productId: product._id, name: product.name, sku: product.sku, quantity: it.quantity, unitCost });
  }
  const tax = +(subtotal * 0.17).toFixed(2);
  const po = await PurchaseOrder.create({
    poNumber: genPONumber(),
    supplierId: data.supplierId,
    branchId: data.branchId || user.branchId,
    items,
    subtotal: +subtotal.toFixed(2),
    tax,
    total: +(subtotal + tax).toFixed(2),
    expectedDate: data.expectedDate,
    notes: data.notes,
    createdBy: user.id,
    status: data.status || 'draft',
  });
  if (po.status !== 'draft') {
    await Supplier.updateOne({ _id: po.supplierId }, { $inc: { outstandingDebt: po.total } });
  }
  AuditLog.create({ userId: user.id, action: 'supplier.po.created', entity: 'PurchaseOrder', entityId: po._id, meta: { poNumber: po.poNumber, total: po.total, supplierId: po.supplierId, items: po.items.length } }).catch(() => {});
  return po;
}

async function updatePOStatus(id, status, user) {
  const po = await PurchaseOrder.findById(id);
  if (!po) throw ApiError.notFound('Purchase order not found');
  if (!PurchaseOrder.STATUS.includes(status)) throw ApiError.badRequest('Invalid status');
  if (po.status === 'draft' && status !== 'draft') {
    await Supplier.updateOne({ _id: po.supplierId }, { $inc: { outstandingDebt: po.total } });
  }
  po.status = status;
  await po.save();
  return po;
}

// Receive items into stock. items: [{ productId, quantity }]
async function receivePO(id, receivedItems, user, io) {
  const po = await PurchaseOrder.findById(id);
  if (!po) throw ApiError.notFound('Purchase order not found');
  if (po.status === 'received' || po.status === 'cancelled') throw ApiError.badRequest('PO is closed');

  let allReceived = true;
  for (const recv of receivedItems) {
    const line = po.items.find((i) => String(i.productId) === String(recv.productId));
    if (!line) throw ApiError.badRequest(`Product ${recv.productId} is not on this PO`);
    const remaining = line.quantity - line.receivedQuantity;
    const toReceive = Math.min(recv.quantity, remaining);
    if (toReceive <= 0) continue;
    line.receivedQuantity += toReceive;
  }
  for (const line of po.items) {
    if (line.receivedQuantity < line.quantity) allReceived = false;
  }
  po.status = allReceived ? 'received' : 'partial';
  if (allReceived) po.receivedAt = new Date();
  await po.save();
  AuditLog.create({ userId: user.id, action: 'supplier.po.received', entity: 'PurchaseOrder', entityId: po._id, meta: { poNumber: po.poNumber, status: po.status } }).catch(() => {});
  return po;
}

async function paySupplier(id, amount) {
  const supplier = await Supplier.findById(id);
  if (!supplier) throw ApiError.notFound('Supplier not found');
  supplier.outstandingDebt = Math.max(0, supplier.outstandingDebt - amount);
  await supplier.save();
  return supplier;
}

module.exports = {
  listSuppliers, getSupplier, createSupplier, updateSupplier,
  listPOs, getPO, createPO, updatePOStatus, receivePO, paySupplier,
};
