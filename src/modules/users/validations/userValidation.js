
// const Joi = require('joi');

// const objectId = Joi.string().hex().length(24).messages({
//   'string.hex': 'Role must be a valid Database ID',
//   'string.length': 'Role must be a 24-character ID',
// });

// exports.listUsersSchema = Joi.object({
//   page: Joi.number().integer().min(1).default(1),
//   limit: Joi.number().integer().min(1).max(100).default(10), // ✅ Changed default to 10
//   role: Joi.alternatives().try(
//     objectId,
//     Joi.string().valid('staff', 'student', 'faculty', 'librarian', 'office_staff', 'admin') // ✅ Allow role names
//   ).optional(),
//   is_active: Joi.boolean().optional(),
//   search: Joi.string().trim().max(150).allow('').optional(),
//   q: Joi.string().trim().max(150).allow('').optional(),
// }).unknown(false);


const Joi = require('joi');

const objectId = Joi.string().hex().length(24).messages({
  'string.hex': 'Role must be a valid Database ID',
  'string.length': 'Role must be a 24-character ID',
});

// 1. Re-add the missing schemas
exports.createUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  email: Joi.string().email().max(200).required(),
  password: Joi.string().min(8).required(),
  role: objectId.required(), 
  phone: Joi.string().trim().pattern(/^[0-9+\-\s()]{7,15}$/).allow('', null).optional(),
}).unknown(false);

exports.updateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).optional(),
  phone: Joi.string().trim().pattern(/^[0-9+\-\s()]{7,15}$/).allow('', null).optional(),
  role: objectId.optional(), 
}).min(1).unknown(false);

exports.adminResetPasswordSchema = Joi.object({
  password: Joi.string().min(8).required(), // Note: Your frontend sends "123456789" which is 9 chars, so this passes!
}).unknown(false);

exports.listUsersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10), 
  role: Joi.alternatives().try(
    objectId,
    Joi.string().valid('staff', 'student', 'faculty', 'librarian', 'office_staff', 'admin') 
  ).optional(),
  is_active: Joi.boolean().optional(),
  search: Joi.string().trim().max(150).allow('').optional(),
  q: Joi.string().trim().max(150).allow('').optional(),
}).unknown(false);