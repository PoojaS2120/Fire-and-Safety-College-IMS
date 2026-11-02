
const Joi = require('joi');

const objectId = Joi.string()
  .hex()
  .length(24);

const createExamSchema = Joi.object({
  title: Joi.string().trim().max(120).required(),

  description: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .optional(),

  course_id: objectId.required(),

  batch_id: objectId.required(),

  faculty_id: objectId.optional(),

  subject: Joi.string().trim().max(100).required(),

  exam_type: Joi.string()
    .valid('oral', 'written')
    .required(),

  exam_date: Joi.date().iso().required(),

  form_start_date: Joi.date().iso().required(),

  form_end_date: Joi.date()
    .iso()
    .min(Joi.ref('form_start_date'))
    .required(),

  max_marks: Joi.number().positive().required(),

  passing_marks: Joi.number()
    .min(0)
    .max(Joi.ref('max_marks'))
    .required(),

  duration_minutes: Joi.number()
    .integer()
    .min(1)
    .allow(null)
    .optional(),

  status: Joi.string()
    .valid(
      'draft',
      'scheduled',
      'ongoing',
      'completed',
      'cancelled',
      'archived'
    )
    .optional(),
}).unknown(false);

const updateExamSchema = Joi.object({
  title: Joi.string().trim().max(120),

  description: Joi.string()
    .trim()
    .max(1000)
    .allow(''),

  course_id: objectId,

  batch_id: objectId,

  faculty_id: objectId,

  subject: Joi.string().trim().max(100),

  exam_type: Joi.string().valid('oral', 'written'),

  exam_date: Joi.date().iso(),

  form_start_date: Joi.date().iso(),

  form_end_date: Joi.date().iso(),

  max_marks: Joi.number().positive(),

  passing_marks: Joi.number().min(0),

  duration_minutes: Joi.number()
    .integer()
    .min(1)
    .allow(null),

  status: Joi.string().valid(
    'draft',
    'scheduled',
    'ongoing',
    'completed',
    'cancelled',
    'archived'
  ),
})
  .min(1)
  .unknown(false);

const listExamSchema = Joi.object({
  course_id: objectId.optional(),

  batch_id: objectId.optional(),

  faculty_id: objectId.optional(),

  exam_type: Joi.string()
    .valid('oral', 'written')
    .optional(),

  status: Joi.string()
    .valid(
      'draft',
      'scheduled',
      'ongoing',
      'completed',
      'cancelled',
      'archived'
    )
    .optional(),

  subject: Joi.string().trim().optional(),

  search: Joi.string().trim().allow('').optional(),

  start_date: Joi.date().iso().optional(),

  end_date: Joi.date().iso().optional(),

  page: Joi.number().integer().min(1).default(1),

  limit: Joi.number().integer().min(1).max(100).default(10),

  sort_by: Joi.string()
    .valid('exam_date', 'createdAt', 'title')
    .default('exam_date'),

  sort_order: Joi.string()
    .valid('asc', 'desc')
    .default('desc'),
}).unknown(false);

const bulkMarksSchema = Joi.object({
  marks: Joi.array()
    .items(
      Joi.object({
        student_id: objectId.required(),

        marks_obtained: Joi.number()
          .min(0)
          .required(),

        remarks: Joi.string()
          .trim()
          .max(500)
          .allow('')
          .optional(),
      }).unknown(false)
    )
    .min(1)
    .required(),
}).unknown(false);

const updateMarkSchema = Joi.object({
  marks_obtained: Joi.number().min(0).required(),

  remarks: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .optional(),
}).unknown(false);

const markParamsSchema = Joi.object({
  id: objectId.required(),

  studentId: objectId.required(),
});

const examIdParamsSchema = Joi.object({
  id: objectId.required(),
});

module.exports = {
  createExamSchema,
  updateExamSchema,
  listExamSchema,
  bulkMarksSchema,
  updateMarkSchema,
  markParamsSchema,
  examIdParamsSchema,
};
