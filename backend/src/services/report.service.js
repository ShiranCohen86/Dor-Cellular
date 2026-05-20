const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Repair = require('../models/Repair');
const Customer = require('../models/Customer');

// Helper: build a date match window
function dateMatch(from, to) {
  const dateFilter = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);
  return Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};
}

// Daily sales aggregated by day
async function dailySales({ from, to, branchId } = {}) {
  const match = { status: { $in: ['completed', 'partially_refunded'] }, ...dateMatch(from, to) };
  if (branchId) match.branchId = branchId;
  return Order.aggregate([
    { $match: match },
    { $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      orders: { $sum: 1 },
      revenue: { $sum: '$total' },
      tax: { $sum: '$taxAmount' },
      refunded: { $sum: '$refundedAmount' },
    } },
    { $sort: { _id: 1 } },
  ]);
}

async function monthlyProfit({ year } = {}) {
  const y = year || new Date().getFullYear();
  const from = new Date(`${y}-01-01`);
  const to = new Date(`${y}-12-31T23:59:59`);
  const orders = await Order.aggregate([
    { $match: { status: { $in: ['completed', 'partially_refunded'] }, createdAt: { $gte: from, $lte: to } } },
    { $unwind: '$items' },
    { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'product' } },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    { $group: {
      _id: { $month: '$createdAt' },
      revenue: { $sum: '$items.lineTotal' },
      cost: { $sum: { $multiply: ['$items.quantity', { $ifNull: ['$product.purchasePrice', 0] }] } },
    } },
    { $project: { month: '$_id', revenue: 1, cost: 1, profit: { $subtract: ['$revenue', '$cost'] }, _id: 0 } },
    { $sort: { month: 1 } },
  ]);
  return orders;
}

async function bestSellers({ from, to, limit = 10 } = {}) {
  const match = { status: { $in: ['completed', 'partially_refunded'] }, ...dateMatch(from, to) };
  return Order.aggregate([
    { $match: match },
    { $unwind: '$items' },
    { $group: {
      _id: '$items.productId',
      name: { $first: '$items.name' },
      sku: { $first: '$items.sku' },
      qty: { $sum: '$items.quantity' },
      revenue: { $sum: '$items.lineTotal' },
    } },
    { $sort: { qty: -1 } },
    { $limit: Number(limit) },
  ]);
}

// Dead stock: products that haven't sold within the lookback window.
async function deadStock({ days = 90 } = {}) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const soldIds = await Order.distinct('items.productId', { createdAt: { $gte: since } });
  return Product.find({ _id: { $nin: soldIds }, totalStock: { $gt: 0 }, isActive: true })
    .sort('-totalStock')
    .limit(200)
    .lean();
}

async function employeeLeaderboard({ from, to } = {}) {
  const match = { status: { $in: ['completed', 'partially_refunded'] }, ...dateMatch(from, to) };
  return Order.aggregate([
    { $match: match },
    { $group: { _id: '$salespersonId', orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    { $project: { name: '$user.name', role: '$user.role', orders: 1, revenue: 1 } },
    { $sort: { revenue: -1 } },
  ]);
}

async function vatReport({ from, to } = {}) {
  const match = { status: { $in: ['completed', 'partially_refunded'] }, ...dateMatch(from, to) };
  const [agg] = await Order.aggregate([
    { $match: match },
    { $group: {
      _id: null,
      subtotal: { $sum: '$subtotal' },
      tax: { $sum: '$taxAmount' },
      total: { $sum: '$total' },
      discounts: { $sum: '$discountAmount' },
      refunded: { $sum: '$refundedAmount' },
      count: { $sum: 1 },
    } },
  ]);
  return agg || { subtotal: 0, tax: 0, total: 0, discounts: 0, refunded: 0, count: 0 };
}

async function dashboardSummary() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [todayAgg, openRepairs, lowStockCount, customerCount] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: today }, status: { $in: ['completed', 'partially_refunded'] } } },
      { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    Repair.countDocuments({ status: { $in: ['received', 'diagnosed', 'waiting_for_parts', 'in_repair'] } }),
    Product.countDocuments({ $expr: { $lte: ['$totalStock', '$minStockAlert'] }, isActive: true }),
    Customer.countDocuments({ isActive: true }),
  ]);
  return {
    todayRevenue: todayAgg[0]?.revenue || 0,
    todayOrders: todayAgg[0]?.count || 0,
    openRepairs,
    lowStockCount,
    customerCount,
  };
}

async function ordersPerMonth({ year } = {}) {
  const y = parseInt(year) || new Date().getFullYear();
  const from = new Date(`${y}-01-01`);
  const to   = new Date(`${y}-12-31T23:59:59`);
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    { $group: {
      _id: { $month: '$createdAt' },
      total:     { $sum: 1 },
      completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
      cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
      refunded:  { $sum: { $cond: [{ $in: ['$status', ['refunded', 'partially_refunded']] }, 1, 0] } },
      draft:     { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
    } },
    { $sort: { _id: 1 } },
  ]);
  // Fill missing months with zeros so chart always shows 12 bars
  const byMonth = Object.fromEntries(rows.map((r) => [r._id, r]));
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    total:     byMonth[i + 1]?.total     || 0,
    completed: byMonth[i + 1]?.completed || 0,
    cancelled: byMonth[i + 1]?.cancelled || 0,
    refunded:  byMonth[i + 1]?.refunded  || 0,
    draft:     byMonth[i + 1]?.draft     || 0,
  }));
}

module.exports = {
  dailySales, monthlyProfit, bestSellers, deadStock,
  employeeLeaderboard, vatReport, dashboardSummary, ordersPerMonth,
};
