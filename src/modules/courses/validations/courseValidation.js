const Joi = require('joi');

exports.createCourseSchema = Joi.object({
  name: Joi.string().required(),
  duration: Joi.string().required(),
  description: Joi.string().optional()
});

exports.createFeeComponentSchema = Joi.object({
  name: Joi.string().required(),
  amount: Joi.number().min(0).required(),
  required_for_exam: Joi.boolean().optional()
});

// NEW: Batch Validation
exports.createBatchSchema = Joi.object({
  name: Joi.string().required(),
  start_date: Joi.date().required(),
  end_date: Joi.date().required()
});

exports.updateFeeComponentSchema = Joi.object({
  name: Joi.string().optional(),
  amount: Joi.number().min(0).optional(),
  required_for_exam: Joi.boolean().optional(),
  status: Joi.string().valid('active', 'inactive').optional()
}).min(1); // Requires at least one field to be sent