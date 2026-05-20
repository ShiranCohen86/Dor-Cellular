const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/order.service');
const pdfService = require('../services/pdf.service');

exports.list = asyncHandler(async (req, res) => res.json(await svc.list(req.query)));
exports.get = asyncHandler(async (req, res) => res.json(await svc.getById(req.params.id)));

exports.create = asyncHandler(async (req, res) => {
  const order = await svc.create(req.body, req.user, req.app.get('io'));
  res.status(201).json(order);
});

exports.addPayment = asyncHandler(async (req, res) => {
  const order = await svc.addPayment(req.params.id, req.body, req.user);
  res.json(order);
});

exports.refund = asyncHandler(async (req, res) => {
  const order = await svc.refund(req.params.id, req.body, req.user, req.app.get('io'));
  res.json(order);
});

exports.cancel = asyncHandler(async (req, res) => {
  const order = await svc.cancel(req.params.id, req.user);
  res.json(order);
});

exports.invoicePdf = asyncHandler(async (req, res) => {
  const order = await svc.getById(req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${order.invoiceNumber}.pdf"`);
  pdfService.streamInvoice(order, res);
});
