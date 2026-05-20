const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/report.service');

exports.dashboard = asyncHandler(async (req, res) => res.json(await svc.dashboardSummary()));
exports.dailySales = asyncHandler(async (req, res) => res.json({ items: await svc.dailySales(req.query) }));
exports.monthlyProfit = asyncHandler(async (req, res) => res.json({ items: await svc.monthlyProfit(req.query) }));
exports.bestSellers = asyncHandler(async (req, res) => res.json({ items: await svc.bestSellers(req.query) }));
exports.deadStock = asyncHandler(async (req, res) => res.json({ items: await svc.deadStock(req.query) }));
exports.employees = asyncHandler(async (req, res) => res.json({ items: await svc.employeeLeaderboard(req.query) }));
exports.vat = asyncHandler(async (req, res) => res.json(await svc.vatReport(req.query)));
exports.ordersPerMonth = asyncHandler(async (req, res) => res.json({ items: await svc.ordersPerMonth(req.query) }));

// Excel export (CSV — easier than pulling in xlsx lib)
exports.exportCsv = asyncHandler(async (req, res) => {
  const items = await svc.dailySales(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="daily-sales.csv"');
  res.write('date,orders,revenue,tax,refunded\n');
  for (const r of items) res.write(`${r._id},${r.orders},${r.revenue},${r.tax},${r.refunded}\n`);
  res.end();
});
