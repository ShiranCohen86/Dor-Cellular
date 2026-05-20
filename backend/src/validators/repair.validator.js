const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

exports.create = {
  body: Joi.object({
    customerId: objectId.required(),
    branchId: objectId,
    technicianId: objectId.allow(null),
    deviceBrand: Joi.string().required(),
    deviceModel: Joi.string().required(),
    imei: Joi.string().allow('', null),
    color: Joi.string().allow('', null),
    accessories: Joi.string().allow('', null),
    faultDescription: Joi.string().required(),
    estimatedCost: Joi.number().min(0),
    intakeSignature: Joi.string().allow('', null),
    intakeNotes: Joi.string().allow('', null),
    promisedDate: Joi.date(),
  }),
};

exports.update = {
  body: Joi.object({
    diagnosis: Joi.string().allow('', null),
    technicianNotes: Joi.string().allow('', null),
    estimatedCost: Joi.number().min(0),
    finalCost: Joi.number().min(0),
    partsCost: Joi.number().min(0),
    laborCost: Joi.number().min(0),
    paid: Joi.boolean(),
    promisedDate: Joi.date(),
    technicianId: objectId.allow(null),
    accessories: Joi.string().allow('', null),
    color: Joi.string().allow('', null),
  }),
};

exports.status = {
  body: Joi.object({
    status: Joi.string().valid('received', 'diagnosed', 'waiting_for_parts', 'in_repair', 'ready', 'delivered', 'cancelled').required(),
    notes: Joi.string().allow('', null),
  }),
};

exports.sign = {
  body: Joi.object({ signature: Joi.string().required() }),
};
