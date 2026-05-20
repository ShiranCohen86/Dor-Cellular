const Branch = require('../models/Branch');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');

async function list() {
  return Branch.find().sort('name').lean();
}

async function get(id) {
  const branch = await Branch.findById(id);
  if (!branch) throw ApiError.notFound('Branch not found');
  return branch;
}

async function create(data) {
  return Branch.create(data);
}

async function update(id, patch) {
  const branch = await Branch.findByIdAndUpdate(id, patch, { new: true });
  if (!branch) throw ApiError.notFound('Branch not found');
  return branch;
}

async function inventoryByBranch(branchId) {
  return Product.aggregate([
    { $match: { isActive: true } },
    { $project: {
      name: 1, sku: 1, brand: 1, model: 1, minStockAlert: 1,
      stock: { $ifNull: [{ $getField: { field: branchId, input: '$stockByBranch' } }, 0] },
    } },
    { $sort: { name: 1 } },
  ]);
}

module.exports = { list, get, create, update, inventoryByBranch };
