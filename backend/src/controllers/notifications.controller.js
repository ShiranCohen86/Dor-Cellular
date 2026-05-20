const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/notification.service');

exports.list = asyncHandler(async (req, res) => res.json(await svc.list(req.query, req.user)));
exports.markRead = asyncHandler(async (req, res) => res.json(await svc.markRead(req.params.id)));
exports.markAllRead = asyncHandler(async (req, res) => res.json(await svc.markAllRead(req.user)));
