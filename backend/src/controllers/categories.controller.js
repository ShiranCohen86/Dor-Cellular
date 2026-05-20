const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/category.service');

exports.list = asyncHandler(async (req, res) => res.json({ items: await svc.list(req.query) }));
exports.create = asyncHandler(async (req, res) => res.status(201).json(await svc.create(req.body)));
exports.update = asyncHandler(async (req, res) => res.json(await svc.update(req.params.id, req.body)));
exports.remove = asyncHandler(async (req, res) => res.json(await svc.remove(req.params.id)));
