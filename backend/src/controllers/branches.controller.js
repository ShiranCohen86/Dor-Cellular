const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/branch.service');

exports.list = asyncHandler(async (_req, res) => res.json({ items: await svc.list() }));
exports.get = asyncHandler(async (req, res) => res.json(await svc.get(req.params.id)));
exports.create = asyncHandler(async (req, res) => res.status(201).json(await svc.create(req.body)));
exports.update = asyncHandler(async (req, res) => res.json(await svc.update(req.params.id, req.body)));
exports.inventory = asyncHandler(async (req, res) => res.json({ items: await svc.inventoryByBranch(req.params.id) }));
