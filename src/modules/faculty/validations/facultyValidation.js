const Joi = require('joi');

const objectId = Joi.string().hex().length(24).messages({
  'string.pattern.base': 'Must be a valid 24-character ObjectId',
  'string.length': 'Must be a 24-character ObjectId',
});

exports.assignFacultySchema = Joi.object({
  faculty_id: objectId.required(),
  course_id: objectId.required(),
  batch_id: objectId.required(),
  subject: Joi.string().trim().min(2).max(150).required(),
}).unknown(false);

exports.listAssignmentsSchema = Joi.object({
  faculty_id: objectId.optional(),
  course_id: objectId.optional(),
  batch_id: objectId.optional(),
  subject: Joi.string().trim().max(150).optional(),
}).unknown(false);