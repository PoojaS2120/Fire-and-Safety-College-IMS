// const Joi = require('joi');

// const ALLOWED_ROLES = ['office_staff', 'faculty', 'librarian', 'student'];

// exports.createUserSchema = Joi.object({
//   name: Joi.string().trim().min(2).max(150).required(),
//   email: Joi.string().email().max(200).required(),
//   password: Joi.string().min(8).required(),
//   role: Joi.string().valid(...ALLOWED_ROLES).required(),
//   phone: Joi.string().trim().pattern(/^[0-9+\-\s()]{7,15}$/).allow('', null).optional(),
// }).unknown(false);

// exports.updateUserSchema = Joi.object({
//   name: Joi.string().trim().min(2).max(150).optional(),
//   phone: Joi.string().trim().pattern(/^[0-9+\-\s()]{7,15}$/).allow('', null).optional(),
//   role: Joi.string().valid(...ALLOWED_ROLES).optional(),
// }).min(1).unknown(false);

// exports.adminResetPasswordSchema = Joi.object({
//   password: Joi.string().min(8).required(),
// }).unknown(false);

// exports.listUsersSchema = Joi.object({
//   page: Joi.number().integer().min(1).default(1),
//   limit: Joi.number().integer().min(1).max(100).default(20),
//   role: Joi.string().valid(...ALLOWED_ROLES, 'super_admin').optional(),
//   is_active: Joi.boolean().optional(),
//   search: Joi.string().trim().max(150).allow('').optional(),
//   q: Joi.string().trim().max(150).allow('').optional(),
// }).unknown(false);




const Joi = require('joi');

// Helper for MongoDB ObjectId validation
const objectId = Joi.string().hex().length(24).messages({
  'string.hex': 'Role must be a valid Database ID',
  'string.length': 'Role must be a 24-character ID',
});

exports.createUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  email: Joi.string().email().max(200).required(),
  password: Joi.string().min(8).required(),
  role: objectId.required(), // 🚨 Now expects the Role ObjectId
  phone: Joi.string().trim().pattern(/^[0-9+\-\s()]{7,15}$/).allow('', null).optional(),
}).unknown(false);

exports.updateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).optional(),
  phone: Joi.string().trim().pattern(/^[0-9+\-\s()]{7,15}$/).allow('', null).optional(),
  role: objectId.optional(), // 🚨 Now expects the Role ObjectId
}).min(1).unknown(false);

exports.adminResetPasswordSchema = Joi.object({
  password: Joi.string().min(8).required(),
}).unknown(false);

exports.listUsersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  role: objectId.optional(), // Can filter by ObjectId
  is_active: Joi.boolean().optional(),
  search: Joi.string().trim().max(150).allow('').optional(),
  q: Joi.string().trim().max(150).allow('').optional(),
}).unknown(false);