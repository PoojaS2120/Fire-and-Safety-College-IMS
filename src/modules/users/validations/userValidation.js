
// const Joi = require('joi');

// const ALLOWED_ROLES = [
//   'office_staff',
//   'faculty',
//   'librarian',
//   'student',
// ];

// exports.createUserSchema = Joi.object({
//   name: Joi.string().required(),
//   email: Joi.string().email().required(),
//   password: Joi.string().min(6).required(),
// <<<<<<< HEAD
//   // Updated to strictly use office_staff
//   role: Joi.string().valid('office_staff', 'faculty', 'librarian','student').required(),
//   phone: Joi.string().optional()
// =======
//   role: Joi.string().valid(...ALLOWED_ROLES).required(),
//   phone: Joi.string().optional(),
// >>>>>>> 50187e1098abad144fe5950556319d8b651f77d1
// });

// exports.updateUserSchema = Joi.object({
//   name: Joi.string().optional(),
//   phone: Joi.string().optional(),
// <<<<<<< HEAD
//   role: Joi.string().valid('office_staff', 'faculty', 'librarian', 'student').optional()
// });
// =======
//   role: Joi.string().valid(...ALLOWED_ROLES).optional(),
// });
// >>>>>>> 50187e1098abad144fe5950556319d8b651f77d1

const Joi = require('joi');

// Allowed roles for standard User creation (Super Admin is created via seed only)
const ALLOWED_ROLES = [
  'office_staff',
  'faculty',
  'librarian',
  'student'
];

exports.createUserSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid(...ALLOWED_ROLES).required(),
  phone: Joi.string().optional()
});

exports.updateUserSchema = Joi.object({
  name: Joi.string().optional(),
  phone: Joi.string().optional(),
  role: Joi.string().valid(...ALLOWED_ROLES).optional()
});