const Joi = require('joi');

exports.createUserSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('office_staff', 'faculty', 'librarian').required(),
  phone: Joi.string().optional()
});