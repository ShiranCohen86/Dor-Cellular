const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const svc = require('../services/order.service');
const pdfService = require('../services/pdf.service');
const emailSvc = require('../services/email.service');
const Customer = require('../models/Customer');

exports.list = asyncHandler(async (req, res) => {
  const query = { ...req.query };
  if (req.user.role === 'customer') {
    if (!req.user.customerId) return res.json({ items: [], total: 0, page: 1, pages: 0 });
    query.customerId = String(req.user.customerId);
  }
  res.json(await svc.list(query));
});
exports.get = asyncHandler(async (req, res) => {
  const order = await svc.getById(req.params.id);
  if (req.user.role === 'customer' && String(order.customerId?._id ?? order.customerId) !== String(req.user.customerId)) {
    throw ApiError.forbidden('Access denied');
  }
  res.json(order);
});

exports.create = asyncHandler(async (req, res) => {
  const order = await svc.create(req.body, req.user, req.app.get('io'));
  res.status(201).json(order);

  // Fire-and-forget: email the store owner with order details
  if (order.customerId) {
    Customer.findById(order.customerId).select('name phone').lean()
      .then((customer) => emailSvc.sendNewOrderEmail(order, customer?.name, customer?.phone))
      .catch(() => {});
  } else {
    emailSvc.sendNewOrderEmail(order, req.user?.name, null).catch(() => {});
  }
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
