// const Joi = require('joi');

// exports.loginSchema = Joi.object({
//   email: Joi.string().email().required(),
//   password: Joi.string().required()
// });

const Joi = require('joi');

exports.loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// NEW: Validation for Student App Login
exports.studentLoginSchema = Joi.object({
  phone: Joi.string().trim().pattern(/^[0-9+\-\s()]{7,15}$/).required()
});