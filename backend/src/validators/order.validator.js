const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const itemSchema = Joi.object({
  productId: objectId.required(),
  quantity: Joi.number().integer().min(1).required(),
  unitPrice: Joi.number().min(0),
  discount: Joi.number().min(0),
  imei: Joi.string().allow('', null),
});

const paymentSchema = Joi.object({
  method: Joi.string().valid('cash', 'credit_card', 'bit', 'paypal', 'installments', 'store_credit').required(),
  amount: Joi.number().min(0).required(),
  reference: Joi.string().allow('', null),
  installments: Joi.number().integer().min(1),
});

exports.create = {
  body: Joi.object({
    branchId: objectId,
    customerId: objectId.allow(null),
    items: Joi.array().items(itemSchema).min(1).required(),
    payments: Joi.array().items(paymentSchema).default([]),
    tradeIn: Joi.object({
      description: Joi.string(),
      imei: Joi.string().allow('', null),
      condition: Joi.string(),
      creditAmount: Joi.number().min(0),
    }),
    discountType: Joi.string().valid('fixed', 'percent', 'coupon', 'none'),
    discountValue: Joi.number().min(0),
    couponCode: Joi.string().allow('', null),
    notes: Joi.string().allow('', null),
  }),
};

exports.addPayment = { body: paymentSchema };
exports.refund = {
  body: Joi.object({
    amount: Joi.number().min(0),
    reason: Joi.string().allow('', null),
    restock: Joi.boolean(),
  }),
};
