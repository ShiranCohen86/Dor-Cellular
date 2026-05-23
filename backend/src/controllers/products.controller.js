const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/product.service');
const QRCode = require('qrcode');
const env = require('../config/env');

exports.list = asyncHandler(async (req, res) => res.json(await svc.list(req.query)));
exports.get = asyncHandler(async (req, res) => res.json(await svc.getById(req.params.id)));
exports.scan = asyncHandler(async (req, res) => res.json(await svc.getByBarcode(req.params.code)));
exports.create = asyncHandler(async (req, res) => res.status(201).json(await svc.create(req.body, req.user?.id)));
exports.update = asyncHandler(async (req, res) => res.json(await svc.update(req.params.id, req.body, req.user?.id)));
exports.remove = asyncHandler(async (req, res) => res.json(await svc.remove(req.params.id, req.user?.id)));

exports.bulkImport = asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body) ? req.body : req.body.rows || [];
  res.json(await svc.bulkImport(rows, req.user.id));
});

exports.getQr = asyncHandler(async (req, res) => {
  const product = await svc.getById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const shopUrl = `${env.FRONTEND_URL}/shop?product=${product._id}`;
  res.setHeader('Content-Type', 'image/png');
  await QRCode.toFileStream(res, shopUrl, { width: 400, margin: 2 });
});

