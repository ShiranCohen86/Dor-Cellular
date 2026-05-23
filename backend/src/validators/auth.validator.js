const Joi = require('joi');

const password = Joi.string().min(10).max(128);
const email = Joi.string().email({ tlds: { allow: false } }).lowercase().trim();

exports.register = {
  body: Joi.object({
    name:     Joi.string().min(2).max(80).required(),
    email:    email.required(),
    password: password.required(),
    phone:    Joi.string().allow(''),
    address:  Joi.string().allow(''),
    role:     Joi.string().valid('admin', 'manager', 'salesperson', 'technician', 'employee'),
    branchId: Joi.string().hex().length(24),
  }),
};

exports.login = {
  body: Joi.object({
    email:    email.required(),
    password: Joi.string().required(),
  }),
};

exports.googleAuth = {
  body: Joi.object({
    idToken: Joi.string().required(),
  }),
};

exports.refresh = {
  body: Joi.object({ refreshToken: Joi.string().required() }),
};

exports.requestReset = {
  body: Joi.object({ email: email.required() }),
};

exports.resetPassword = {
  body: Joi.object({ token: Joi.string().required(), newPassword: password.required() }),
};

exports.changePassword = {
  body: Joi.object({ currentPassword: Joi.string().required(), newPassword: password.required() }),
};

exports.updateProfile = {
  body: Joi.object({ name: Joi.string().min(2).max(80), phone: Joi.string().allow('') }),
};

exports.updateUser = {
  params: Joi.object({ id: Joi.string().hex().length(24).required() }),
  body: Joi.object({ role: Joi.string(), isActive: Joi.boolean() }),
};
