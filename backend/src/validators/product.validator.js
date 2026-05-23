const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

exports.create = {
  body: Joi.object({
    sku:          Joi.string().trim().required(),
    barcode:      Joi.string().trim().allow('', null),
    imei:         Joi.string().trim().allow('', null),
    serialNumber: Joi.string().trim().allow('', null),
    name:         Joi.string().trim().required(),
    brand:        Joi.string().trim().required(),
    model:        Joi.string().trim().allow('', null),
    description:  Joi.string().allow('', null),
    categoryId:   objectId.required(),
    supplierId:   objectId.allow(null),
    purchasePrice: Joi.number().min(0).required(),
    salePrice:     Joi.number().min(0).required(),
    color:     Joi.string().allow('', null),
    storageGB: Joi.number().integer().min(0),
    ramGB:     Joi.number().integer().min(0),
    images:   Joi.array().items(Joi.string()),
    isActive: Joi.boolean(),
  }),
};

exports.update = { body: exports.create.body.fork(Object.keys(exports.create.body.describe().keys), (s) => s.optional()) };
