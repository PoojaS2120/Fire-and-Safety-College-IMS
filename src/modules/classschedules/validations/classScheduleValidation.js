
const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

exports.createScheduleSchema = Joi.object({
  course_id: objectId.required(),
  batch_id: objectId.required(),
  faculty_id: objectId.required(),
  subject: Joi.string().trim().min(2).max(150).required(),
  date: Joi.date().iso().required(),
  start_time: Joi.string().pattern(timePattern).required(),
  end_time: Joi.string().pattern(timePattern).required()
}).custom((value, helpers) => {
  if (value.start_time >= value.end_time) {
    return helpers.error('any.invalid', {
      message: 'End time must be after start time'
    });
  }
  return value;
}).messages({
  'any.invalid': 'End time must be after start time'
});

exports.updateScheduleSchema = Joi.object({
  course_id: objectId,
  batch_id: objectId,
  faculty_id: objectId,
  subject: Joi.string().trim().min(2).max(150),
  date: Joi.date().iso(),
  start_time: Joi.string().pattern(timePattern),
  end_time: Joi.string().pattern(timePattern)
}).min(1);

exports.scheduleQuerySchema = Joi.object({
  course_id: objectId,
  batch_id: objectId,
  faculty_id: objectId,
  date: Joi.date().iso(),
  status: Joi.string().valid('scheduled', 'cancelled')
});