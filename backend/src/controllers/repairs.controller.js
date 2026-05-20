const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/repair.service');

exports.list = asyncHandler(async (req, res) => res.json(await svc.list(req.query)));
exports.get = asyncHandler(async (req, res) => res.json(await svc.getById(req.params.id)));
exports.create = asyncHandler(async (req, res) => res.status(201).json(await svc.create(req.body, req.user)));
exports.update = asyncHandler(async (req, res) => res.json(await svc.update(req.params.id, req.body)));
exports.changeStatus = asyncHandler(async (req, res) =>
  res.json(await svc.changeStatus(req.params.id, req.body, req.user, req.app.get('io'))));
exports.signDelivery = asyncHandler(async (req, res) =>
  res.json(await svc.signDelivery(req.params.id, req.body.signature, req.user)));
exports.performance = asyncHandler(async (req, res) => res.json({ items: await svc.technicianPerformance(req.query) }));
