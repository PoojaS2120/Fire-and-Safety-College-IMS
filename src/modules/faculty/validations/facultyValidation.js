const Joi = require('joi');

exports.assignFacultySchema = Joi.object({
  faculty_id: Joi.string().required(), // MongoDB ObjectId as string
  course_id: Joi.string().required(),
  batch_id: Joi.string().required(),
  subject: Joi.string().required()
});