const Joi = require('joi');

exports.createUserSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  // Updated to strictly use office_staff
  role: Joi.string().valid('office_staff', 'faculty', 'librarian').required(),
  phone: Joi.string().optional()
});

exports.updateUserSchema = Joi.object({
  name: Joi.string().optional(),
  phone: Joi.string().optional(),
  role: Joi.string().valid('office_staff', 'faculty', 'librarian').optional()
});