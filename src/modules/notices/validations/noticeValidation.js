const Joi = require('joi');

const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ObjectId');

exports.createNoticeSchema = Joi.object({
  title: Joi.string().trim().max(200).required(),

  description: Joi.string().trim().required(),

  targetType: Joi.string()
    .valid('all', 'course', 'batch')
    .default('all'),

  targetCourse: Joi.when('targetType', {
    is: 'course',
    then: objectId.required(),
    otherwise: objectId.allow(null)
  }),

  targetBatch: Joi.when('targetType', {
    is: 'batch',
    then: objectId.required(),
    otherwise: objectId.allow(null)
  })
});

exports.updateNoticeSchema = Joi.object({
  title: Joi.string().trim().max(200),

  description: Joi.string().trim(),

  targetType: Joi.string().valid('all', 'course', 'batch'),

  targetCourse: objectId.allow(null),

  targetBatch: objectId.allow(null)
}).min(1);

exports.updateNoticeStatusSchema = Joi.object({
  status: Joi.string()
    .valid('published', 'withdrawn')
    .required()
});