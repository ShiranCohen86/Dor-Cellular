const Joi = require('joi');
const objectId = Joi.string().hex().length(24);

exports.createSupplier = {
  body: Joi.object({
    name: Joi.string().required(),
    contactPerson: Joi.string().allow('', null),
    phone: Joi.string().allow('', null),
    email: Joi.string().email().allow('', null),
    address: Joi.string().allow('', null),
    taxId: Joi.string().allow('', null),
    paymentTerms: Joi.string().allow('', null),
    notes: Joi.string().allow('', null),
  }),
};
exports.updateSupplier = { body: exports.createSupplier.body.fork(['name'], (s) => s.optional()) };
exports.pay = { body: Joi.object({ amount: Joi.number().min(0).required() }) };

exports.createPO = {
  body: Joi.object({
    supplierId: objectId.required(),
    branchId: objectId,
    items: Joi.array().items(Joi.object({
      productId: objectId.required(),
      quantity: Joi.number().integer().min(1).required(),
      unitCost: Joi.number().min(0),
    })).min(1).required(),
    expectedDate: Joi.date(),
    notes: Joi.string().allow('', null),
    status: Joi.string().valid('draft', 'sent'),
  }),
};

exports.poStatus = {
  body: Joi.object({ status: Joi.string().valid('draft', 'sent', 'partial', 'received', 'cancelled').required() }),
};

exports.receive = {
  body: Joi.object({
    items: Joi.array().items(Joi.object({
      productId: objectId.required(),
      quantity: Joi.number().integer().min(1).required(),
    })).min(1).required(),
  }),
};
