const mongoose = require('mongoose');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');
const { paginate, parsePagination, escapeRegex } = require('../utils/pagination');

async function list(query) {
  const filter = {};
  if (query.categoryId) filter.categoryId = query.categoryId;
  if (query.supplierId) filter.supplierId = query.supplierId;
  if (query.brand) filter.brand = query.brand;
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
  if (query.lowStock === 'true') filter.$expr = { $lte: ['$totalStock', '$minStockAlert'] };
  if (query.q) {
    const safe = escapeRegex(query.q);
    filter.$or = [
      { name: new RegExp(safe, 'i') },
      { sku: new RegExp(safe, 'i') },
      { barcode: query.q },
      { imei: query.q },
      { brand: new RegExp(safe, 'i') },
      { model: new RegExp(safe, 'i') },
    ];
  }
  return paginate(Product, filter, query, { populate: 'categoryId supplierId' });
}

async function getById(id) {
  const product = await Product.findById(id).populate('categoryId supplierId');
  if (!product) throw ApiError.notFound('Product not found');
  return product;
}

async function getByBarcode(barcode) {
  const product = await Product.findOne({ $or: [{ barcode }, { sku: barcode.toUpperCase() }, { imei: barcode }] });
  if (!product) throw ApiError.notFound('Product not found');
  return product;
}

async function create(data, actorId) {
  if (data.imei) {
    const dup = await Product.findOne({ imei: data.imei });
    if (dup) throw ApiError.conflict('IMEI already exists');
  }
  const product = new Product(data);
  if (data.stockByBranch) product.recomputeTotalStock();
  await product.save();
  AuditLog.create({ userId: actorId, action: 'product.created', entity: 'Product', entityId: product._id, meta: { name: product.name, sku: product.sku } }).catch(() => {});
  return product;
}

async function update(id, patch, actorId) {
  if (patch.imei) {
    const dup = await Product.findOne({ imei: patch.imei, _id: { $ne: id } });
    if (dup) throw ApiError.conflict('IMEI already exists');
  }
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Product not found');
  Object.assign(product, patch);
  if (patch.stockByBranch) product.recomputeTotalStock();
  await product.save();
  AuditLog.create({ userId: actorId, action: 'product.updated', entity: 'Product', entityId: product._id, meta: { name: product.name, sku: product.sku } }).catch(() => {});
  return product;
}

async function remove(id, actorId) {
  // Soft delete by deactivating to preserve historical references.
  const product = await Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!product) throw ApiError.notFound('Product not found');
  AuditLog.create({ userId: actorId, action: 'product.deleted', entity: 'Product', entityId: product._id, meta: { name: product.name, sku: product.sku } }).catch(() => {});
  return { ok: true };
}

// Adjust stock for a product+branch. delta can be negative.
// Records a StockMovement entry and emits a low-stock notification if applicable.
async function adjustStock({ productId, branchId, delta, type = 'adjustment', reason, refType, refId, performedBy, io }) {
  const session = await mongoose.startSession();
  try {
    let lowStockHit = false;
    let product;
    await session.withTransaction(async () => {
      product = await Product.findById(productId).session(session);
      if (!product) throw ApiError.notFound('Product not found');

      const key = String(branchId);
      const current = product.stockByBranch.get(key) || 0;
      const next = current + delta;
      if (next < 0) throw ApiError.badRequest(`Insufficient stock at branch (current: ${current}, requested: ${-delta})`);
      product.stockByBranch.set(key, next);
      product.recomputeTotalStock();
      await product.save({ session });

      await StockMovement.create([{
        productId, branchId, type, quantity: delta, reason, refType, refId, performedBy,
      }], { session });

      lowStockHit = product.totalStock <= product.minStockAlert && delta < 0;
    });
    if (lowStockHit) {
      const notif = await Notification.create({
        type: 'low_stock',
        title: `Low stock: ${product.name}`,
        message: `Only ${product.totalStock} units left (min ${product.minStockAlert}).`,
        severity: 'warning',
        targetRole: 'manager',
        refType: 'Product',
        refId: product._id,
      });
      io?.emit('notification', notif);
    }
    return product;
  } finally {
    session.endSession();
  }
}

async function listMovements(productId, query) {
  const { page, limit, skip, sort } = parsePagination(query);
  const filter = { productId };
  if (query.type) filter.type = query.type;
  if (query.branchId) filter.branchId = query.branchId;
  const [items, total] = await Promise.all([
    StockMovement.find(filter).sort(sort).skip(skip).limit(limit).populate('performedBy', 'name').lean(),
    StockMovement.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

async function lowStock(branchId) {
  const filter = { $expr: { $lte: ['$totalStock', '$minStockAlert'] }, isActive: true };
  if (branchId) filter[`stockByBranch.${branchId}`] = { $gte: 0 };
  const items = await Product.find(filter).limit(200).lean();
  return items;
}

// Bulk import a CSV array of objects: [{ sku, name, brand, model, categoryId, purchasePrice, salePrice, quantity, branchId, ... }]
async function bulkImport(rows, performedBy) {
  const results = { created: 0, updated: 0, errors: [] };
  for (const [i, row] of rows.entries()) {
    try {
      const existing = row.sku ? await Product.findOne({ sku: row.sku.toUpperCase() }) : null;
      if (existing) {
        Object.assign(existing, row);
        if (row.quantity != null && row.branchId) {
          existing.stockByBranch.set(String(row.branchId), Number(row.quantity));
          existing.recomputeTotalStock();
        }
        await existing.save();
        results.updated += 1;
      } else {
        const newProduct = new Product(row);
        if (row.quantity != null && row.branchId) {
          newProduct.stockByBranch.set(String(row.branchId), Number(row.quantity));
          newProduct.recomputeTotalStock();
        }
        await newProduct.save();
        results.created += 1;
      }
    } catch (err) {
      results.errors.push({ row: i + 1, sku: row.sku, error: err.message });
    }
  }
  return results;
}

// Transfer stock between branches.
async function transferStock({ productId, fromBranchId, toBranchId, quantity, performedBy, notes, io }) {
  if (quantity <= 0) throw ApiError.badRequest('Quantity must be > 0');
  if (String(fromBranchId) === String(toBranchId)) throw ApiError.badRequest('Source and destination must differ');

  await adjustStock({
    productId, branchId: fromBranchId, delta: -quantity, type: 'transfer_out',
    reason: notes || 'Branch transfer', performedBy, io,
  });
  await adjustStock({
    productId, branchId: toBranchId, delta: quantity, type: 'transfer_in',
    reason: notes || 'Branch transfer', performedBy, io,
  });
  return { ok: true };
}

module.exports = {
  list, getById, getByBarcode, create, update, remove,
  adjustStock, listMovements, lowStock, bulkImport, transferStock,
};
