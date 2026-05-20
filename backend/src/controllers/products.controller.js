const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/product.service');

exports.list = asyncHandler(async (req, res) => res.json(await svc.list(req.query)));
exports.get = asyncHandler(async (req, res) => res.json(await svc.getById(req.params.id)));
exports.scan = asyncHandler(async (req, res) => res.json(await svc.getByBarcode(req.params.code)));
exports.create = asyncHandler(async (req, res) => res.status(201).json(await svc.create(req.body, req.user?.id)));
exports.update = asyncHandler(async (req, res) => res.json(await svc.update(req.params.id, req.body, req.user?.id)));
exports.remove = asyncHandler(async (req, res) => res.json(await svc.remove(req.params.id, req.user?.id)));

exports.adjust = asyncHandler(async (req, res) => {
  const io = req.app.get('io');
  const product = await svc.adjustStock({
    productId: req.params.id,
    branchId: req.body.branchId,
    delta: req.body.delta,
    type: req.body.type,
    reason: req.body.reason,
    performedBy: req.user.id,
    io,
  });
  res.json(product);
});

exports.movements = asyncHandler(async (req, res) => res.json(await svc.listMovements(req.params.id, req.query)));
exports.lowStock = asyncHandler(async (req, res) => res.json({ items: await svc.lowStock(req.query.branchId) }));

exports.bulkImport = asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body) ? req.body : req.body.rows || [];
  res.json(await svc.bulkImport(rows, req.user.id));
});

exports.transfer = asyncHandler(async (req, res) => {
  const io = req.app.get('io');
  res.json(await svc.transferStock({ ...req.body, performedBy: req.user.id, io }));
});
