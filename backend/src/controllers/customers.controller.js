const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/customer.service');

exports.list = asyncHandler(async (req, res) => res.json(await svc.list(req.query)));
exports.get = asyncHandler(async (req, res) => res.json(await svc.getById(req.params.id)));
exports.create = asyncHandler(async (req, res) => res.status(201).json(await svc.create(req.body, req.user?.id)));
exports.update = asyncHandler(async (req, res) => res.json(await svc.update(req.params.id, req.body, req.user?.id)));
exports.remove = asyncHandler(async (req, res) => res.json(await svc.remove(req.params.id, req.user?.id)));
exports.purchases = asyncHandler(async (req, res) => res.json({ items: await svc.purchaseHistory(req.params.id) }));
exports.repairs = asyncHandler(async (req, res) => res.json({ items: await svc.repairHistory(req.params.id) }));
exports.loyalty = asyncHandler(async (req, res) => res.json(await svc.adjustLoyalty(req.params.id, req.body.delta)));
exports.birthdays = asyncHandler(async (req, res) => res.json({ items: await svc.upcomingBirthdays(req.query.days) }));
