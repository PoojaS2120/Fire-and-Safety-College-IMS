
const Joi = require('joi');

const ALLOWED_ROLES = [
  'office_staff',
  'faculty',
  'librarian',
  'student',
];

exports.createUserSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid(...ALLOWED_ROLES).required(),
  phone: Joi.string().optional(),
});

exports.updateUserSchema = Joi.object({
  name: Joi.string().optional(),
  phone: Joi.string().optional(),
  role: Joi.string().valid(...ALLOWED_ROLES).optional(),
});
