const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');
const { paginate, escapeRegex } = require('../utils/pagination');

async function list(query) {
  const filter = {};
  if (query.categoryId) filter.categoryId = query.categoryId;
  if (query.supplierId) filter.supplierId = query.supplierId;
  if (query.brand) filter.brand = query.brand;
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
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
  await product.save();
  AuditLog.create({ userId: actorId, action: 'product.updated', entity: 'Product', entityId: product._id, meta: { name: product.name, sku: product.sku } }).catch(() => {});
  return product;
}

async function remove(id, actorId) {
  const product = await Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!product) throw ApiError.notFound('Product not found');
  AuditLog.create({ userId: actorId, action: 'product.deleted', entity: 'Product', entityId: product._id, meta: { name: product.name, sku: product.sku } }).catch(() => {});
  return { ok: true };
}

async function bulkImport(rows, performedBy) {
  const results = { created: 0, updated: 0, errors: [] };
  for (const [i, row] of rows.entries()) {
    try {
      const existing = row.sku ? await Product.findOne({ sku: row.sku.toUpperCase() }) : null;
      if (existing) {
        Object.assign(existing, row);
        await existing.save();
        results.updated += 1;
      } else {
        await new Product(row).save();
        results.created += 1;
      }
    } catch (err) {
      results.errors.push({ row: i + 1, sku: row.sku, error: err.message });
    }
  }
  return results;
}

module.exports = { list, getById, getByBarcode, create, update, remove, bulkImport };
