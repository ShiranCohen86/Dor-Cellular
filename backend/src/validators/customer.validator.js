const Joi = require('joi');

exports.create = {
  body: Joi.object({
    name: Joi.string().min(2).required(),
    phone: Joi.string().min(6).required(),
    email: Joi.string().email().allow('', null),
    idNumber: Joi.string().allow('', null),
    address: Joi.string().allow('', null),
    city: Joi.string().allow('', null),
    birthday: Joi.date().allow(null),
    notes: Joi.string().allow('', null),
    isVip: Joi.boolean(),
    marketingConsent: Joi.boolean(),
    tags: Joi.array().items(Joi.string()),
  }),
};
exports.update = { body: exports.create.body.fork(['name', 'phone'], (s) => s.optional()) };
exports.loyalty = { body: Joi.object({ delta: Joi.number().integer().required() }) };
