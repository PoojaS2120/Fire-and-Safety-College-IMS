const Joi = require('joi');

exports.createSubjectSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  course_id: Joi.string().hex().length(24).required(), // Must be a valid Mongo ID
  description: Joi.string().trim().allow('', null).optional(),
}).unknown(false);

exports.updateSubjectSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150),
  course_id: Joi.string().hex().length(24), // Allow moving a subject to another course if needed
  description: Joi.string().trim().allow('', null),
  status: Joi.string().valid('active', 'inactive'),
}).min(1).unknown(false);