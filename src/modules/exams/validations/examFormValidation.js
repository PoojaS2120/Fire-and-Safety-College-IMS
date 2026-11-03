const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

exports.submitExamFormSchema = Joi.object({
  exam_id: objectId.required(),
  student_id: objectId.optional(), // staff can submit for a student; student gets from token
}).unknown(false);

exports.overrideExamFormSchema = Joi.object({
  reason: Joi.string().trim().min(5).max(500).required(),
}).unknown(false);

exports.listExamFormsSchema = Joi.object({
  exam_id: objectId.optional(),
  student_id: objectId.optional(),
  status: Joi.string().valid('pending', 'submitted', 'blocked', 'overridden').optional(),
  course_id: objectId.optional(),
  batch_id: objectId.optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(false);

exports.eligibilityQuerySchema = Joi.object({
  exam_id: objectId.required(),
  student_id: objectId.optional(),
}).unknown(false);