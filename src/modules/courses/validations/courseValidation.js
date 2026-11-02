// const Joi = require('joi');

// exports.createCourseSchema = Joi.object({
//   name: Joi.string().required(),
//   duration: Joi.string().required(),
//   description: Joi.string().optional()
// });

// exports.createFeeComponentSchema = Joi.object({
//   name: Joi.string().required(),
//   amount: Joi.number().min(0).required(),
//   required_for_exam: Joi.boolean().optional()
// });

// // NEW: Batch Validation
// exports.createBatchSchema = Joi.object({
//   name: Joi.string().required(),
//   start_date: Joi.date().required(),
//   end_date: Joi.date().required()
// });

// exports.updateFeeComponentSchema = Joi.object({
//   name: Joi.string().optional(),
//   amount: Joi.number().min(0).optional(),
//   required_for_exam: Joi.boolean().optional(),
//   status: Joi.string().valid('active', 'inactive').optional()
// }).min(1); // Requires at least one field to be sent

const Joi = require('joi');

// ===== COURSES =====
exports.createCourseSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  duration: Joi.string().trim().required(),
  description: Joi.string().allow('').optional()
});

exports.updateCourseSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).optional(),
  duration: Joi.string().trim().optional(),
  description: Joi.string().allow('').optional(),
  status: Joi.string().valid('active', 'inactive').optional()
}).min(1); // Requires at least one field to update

// ===== FEE COMPONENTS =====
exports.createFeeComponentSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  amount: Joi.number().min(0).required(),
  required_for_exam: Joi.boolean().optional()
});

exports.updateFeeComponentSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  amount: Joi.number().min(0).optional(),
  required_for_exam: Joi.boolean().optional(),
  status: Joi.string().valid('active', 'inactive').optional()
}).min(1);

// ===== BATCHES =====
exports.createBatchSchema = Joi.object({
  name: Joi.string().trim().required(),
  start_date: Joi.date().required(),
  end_date: Joi.date().greater(Joi.ref('start_date')).required()
    .messages({ 'date.greater': 'End date must be after start date' })
});

exports.updateBatchSchema = Joi.object({
  name: Joi.string().trim().optional(),
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional(),
  status: Joi.string().valid('active', 'closed').optional()
}).min(1);