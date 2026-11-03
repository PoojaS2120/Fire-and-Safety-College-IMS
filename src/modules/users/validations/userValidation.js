
// // const Joi = require('joi');

// // const ALLOWED_ROLES = [
// //   'office_staff',
// //   'faculty',
// //   'librarian',
// //   'student',
// // ];

// // exports.createUserSchema = Joi.object({
// //   name: Joi.string().required(),
// //   email: Joi.string().email().required(),
// //   password: Joi.string().min(6).required(),
// // <<<<<<< HEAD
// //   // Updated to strictly use office_staff
// //   role: Joi.string().valid('office_staff', 'faculty', 'librarian','student').required(),
// //   phone: Joi.string().optional()
// // =======
// //   role: Joi.string().valid(...ALLOWED_ROLES).required(),
// //   phone: Joi.string().optional(),
// // >>>>>>> 50187e1098abad144fe5950556319d8b651f77d1
// // });

// // exports.updateUserSchema = Joi.object({
// //   name: Joi.string().optional(),
// //   phone: Joi.string().optional(),
// // <<<<<<< HEAD
// //   role: Joi.string().valid('office_staff', 'faculty', 'librarian', 'student').optional()
// // });
// // =======
// //   role: Joi.string().valid(...ALLOWED_ROLES).optional(),
// // });
// // >>>>>>> 50187e1098abad144fe5950556319d8b651f77d1

// const Joi = require('joi');

// // Allowed roles for standard User creation (Super Admin is created via seed only)
// const ALLOWED_ROLES = [
//   'office_staff',
//   'faculty',
//   'librarian',
//   'student'
// ];

// exports.createUserSchema = Joi.object({
//   name: Joi.string().required(),
//   email: Joi.string().email().required(),
//   password: Joi.string().min(6).required(),
//   role: Joi.string().valid(...ALLOWED_ROLES).required(),
//   phone: Joi.string().optional()
// });

// exports.updateUserSchema = Joi.object({
//   name: Joi.string().optional(),
//   phone: Joi.string().optional(),
//   role: Joi.string().valid(...ALLOWED_ROLES).optional()
// });

const Joi = require('joi');

const ALLOWED_ROLES = ['office_staff', 'faculty', 'librarian', 'student'];

exports.createUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  email: Joi.string().email().max(200).required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid(...ALLOWED_ROLES).required(),
  phone: Joi.string().trim().pattern(/^[0-9+\-\s()]{7,15}$/).allow('', null).optional(),
}).unknown(false);

exports.updateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).optional(),
  phone: Joi.string().trim().pattern(/^[0-9+\-\s()]{7,15}$/).allow('', null).optional(),
  role: Joi.string().valid(...ALLOWED_ROLES).optional(),
}).min(1).unknown(false);

exports.adminResetPasswordSchema = Joi.object({
  password: Joi.string().min(8).required(),
}).unknown(false);

exports.listUsersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  role: Joi.string().valid(...ALLOWED_ROLES, 'super_admin').optional(),
  is_active: Joi.boolean().optional(),
  search: Joi.string().trim().max(150).allow('').optional(),
  q: Joi.string().trim().max(150).allow('').optional(),
}).unknown(false);