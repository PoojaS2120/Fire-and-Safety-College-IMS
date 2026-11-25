
// const Joi = require('joi');

// // ===== COURSES =====
// exports.createCourseSchema = Joi.object({
//   name: Joi.string().trim().min(2).max(150).required(),
//   duration: Joi.string().trim().required(),
//   description: Joi.string().allow('').optional()
// });

// exports.updateCourseSchema = Joi.object({
//   name: Joi.string().trim().min(2).max(150).optional(),
//   duration: Joi.string().trim().optional(),
//   description: Joi.string().allow('').optional(),
//   status: Joi.string().valid('active', 'inactive').optional()
// }).min(1); // Requires at least one field to update

// // ===== FEE COMPONENTS =====
// exports.createFeeComponentSchema = Joi.object({
//   name: Joi.string().trim().min(2).max(100).required(),
//   amount: Joi.number().min(0).required(),
//   required_for_exam: Joi.boolean().optional()
// });

// exports.updateFeeComponentSchema = Joi.object({
//   name: Joi.string().trim().min(2).max(100).optional(),
//   amount: Joi.number().min(0).optional(),
//   required_for_exam: Joi.boolean().optional(),
//   status: Joi.string().valid('active', 'inactive').optional()
// }).min(1);

// // ===== BATCHES =====
// exports.createBatchSchema = Joi.object({
//   name: Joi.string().trim().required(),
//   start_date: Joi.date().required(),
//   end_date: Joi.date().greater(Joi.ref('start_date')).required()
//     .messages({ 'date.greater': 'End date must be after start date' })
// });

// exports.updateBatchSchema = Joi.object({
//   name: Joi.string().trim().optional(),
//   start_date: Joi.date().optional(),
//   end_date: Joi.date().optional(),
//   status: Joi.string().valid('active', 'closed').optional()
// }).min(1);




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
// 🚨 UPDATED — supports one-time fee + custom installment plans

const installmentPlanSchema = Joi.object({
  plan_name: Joi.string().trim().min(1).max(100).required(),
  number_of_installments: Joi.number().integer().min(2).max(12).required(),
  total_amount: Joi.number().min(0).required(),
  installment_amounts: Joi.array()
    .items(Joi.number().min(0))
    .min(1)
    .required(),
  due_days_from_start: Joi.array()
    .items(Joi.number().integer().min(0))
    .optional()
}).unknown(false);

exports.createFeeComponentSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),

  // 🚨 NEW — one-time payment amount
  one_time_amount: Joi.number().min(0).required(),

  // 🚨 NEW — installment plans (optional, array)
  installment_plans: Joi.array()
    .items(installmentPlanSchema)
    .optional()
    .default([]),

  required_for_exam: Joi.boolean().optional()
}).unknown(false);

exports.updateFeeComponentSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),

  // 🚨 NEW
  one_time_amount: Joi.number().min(0).optional(),

  // 🚨 NEW
  installment_plans: Joi.array()
    .items(installmentPlanSchema)
    .optional(),

  required_for_exam: Joi.boolean().optional(),
  status: Joi.string().valid('active', 'inactive').optional()
}).min(1).unknown(false);

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