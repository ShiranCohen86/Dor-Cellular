const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const itemSchema = Joi.object({
  productId: objectId.required(),
  quantity:  Joi.number().integer().min(1).required(),
});

exports.create = {
  body: Joi.object({
    branchId:   objectId,
    customerId: objectId.allow(null),
    items:      Joi.array().items(itemSchema).min(1).required(),
    notes:      Joi.string().allow('', null),
  }),
};
