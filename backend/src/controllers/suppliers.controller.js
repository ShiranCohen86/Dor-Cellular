const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/supplier.service');

exports.list = asyncHandler(async (req, res) => res.json(await svc.listSuppliers(req.query)));
exports.get = asyncHandler(async (req, res) => res.json(await svc.getSupplier(req.params.id)));
exports.create = asyncHandler(async (req, res) => res.status(201).json(await svc.createSupplier(req.body, req.user?.id)));
exports.update = asyncHandler(async (req, res) => res.json(await svc.updateSupplier(req.params.id, req.body)));
exports.pay = asyncHandler(async (req, res) => res.json(await svc.paySupplier(req.params.id, req.body.amount)));

exports.listPOs = asyncHandler(async (req, res) => res.json(await svc.listPOs(req.query)));
exports.getPO = asyncHandler(async (req, res) => res.json(await svc.getPO(req.params.id)));
exports.createPO = asyncHandler(async (req, res) => res.status(201).json(await svc.createPO(req.body, req.user)));
exports.updatePOStatus = asyncHandler(async (req, res) =>
  res.json(await svc.updatePOStatus(req.params.id, req.body.status, req.user)));
exports.receivePO = asyncHandler(async (req, res) =>
  res.json(await svc.receivePO(req.params.id, req.body.items, req.user, req.app.get('io'))));
