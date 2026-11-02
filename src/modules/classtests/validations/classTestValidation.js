
const Joi = require('joi');

const objectId = Joi.string()
  .hex()
  .length(24);

// ==========================================
// CREATE CLASS TEST VALIDATION
// ==========================================

const createClassTestSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(2)
    .max(120)
    .required(),

  description: Joi.string()
    .allow('')
    .max(1000),

  course_id: objectId.required(),

  batch_id: objectId.required(),

  // Optional for Faculty.
  // Super Admin must provide it in the service.
  faculty_id: objectId,

  subject: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required(),

  test_date: Joi.date()
    .iso()
    .required(),

  max_marks: Joi.number()
    .positive()
    .precision(2)
    .required(),

  passing_marks: Joi.number()
    .min(0)
    .precision(2)
    .required(),

  duration_minutes: Joi.number()
    .integer()
    .min(1)
    .allow(null),

  status: Joi.string()
    .valid('draft', 'scheduled', 'completed', 'cancelled')
})
  .unknown(false);

// ==========================================
// UPDATE CLASS TEST VALIDATION
// ==========================================

const updateClassTestSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(2)
    .max(120),

  description: Joi.string()
    .allow('')
    .max(1000),

  course_id: objectId,

  batch_id: objectId,

  faculty_id: objectId,

  subject: Joi.string()
    .trim()
    .min(2)
    .max(100),

  test_date: Joi.date()
    .iso(),

  max_marks: Joi.number()
    .positive()
    .precision(2),

  passing_marks: Joi.number()
    .min(0)
    .precision(2),

  duration_minutes: Joi.number()
    .integer()
    .min(1)
    .allow(null),

  status: Joi.string()
    .valid('draft', 'scheduled', 'completed', 'cancelled')
})
  .min(1)
  .unknown(false);

// ==========================================
// BULK MARKS ENTRY VALIDATION
// ==========================================

const bulkMarksSchema = Joi.object({
  marks: Joi.array()
    .items(
      Joi.object({
        student_id: objectId.required(),

        marks_obtained: Joi.number()
          .min(0)
          .precision(2)
          .required(),

        remarks: Joi.string()
          .allow('')
          .max(500)
      }).unknown(false)
    )
    .min(1)
    .max(500)
    .required()
})
  .unknown(false);

// ==========================================
// INDIVIDUAL MARKS UPDATE VALIDATION
// ==========================================

const markSchema = Joi.object({
  marks_obtained: Joi.number()
    .min(0)
    .precision(2)
    .required(),

  remarks: Joi.string()
    .allow('')
    .max(500)
})
  .min(1)
  .unknown(false);

// ==========================================
// BULK IMPORT VALIDATION
// ==========================================

const bulkImportSchema = Joi.object({
  update_existing: Joi.boolean()
    .default(true),

  skip_invalid_rows: Joi.boolean()
    .default(false)
})
  .unknown(false);

// ==========================================
// CLASS TEST LIST FILTER VALIDATION
// ==========================================

const listQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10),

  course_id: objectId,

  batch_id: objectId,

  faculty_id: objectId,

  subject: Joi.string()
    .max(100),

  status: Joi.string()
    .valid(
      'draft',
      'scheduled',
      'completed',
      'cancelled',
      'archived'
    ),

  from_date: Joi.date()
    .iso(),

  to_date: Joi.date()
    .iso(),

  search: Joi.string()
    .trim()
    .max(120)
})
  .unknown(false);

// ==========================================
// EXPORT VALIDATION
// ==========================================

const exportQuerySchema = Joi.object({
  format: Joi.string()
    .valid('xlsx', 'csv')
    .default('xlsx'),

  include_remarks: Joi.boolean()
    .default(true)
})
  .unknown(false);

// ==========================================
// EXPORT ALL VALIDATIONS
// ==========================================

module.exports = {
  createClassTestSchema,
  updateClassTestSchema,
  bulkMarksSchema,
  markSchema,
  bulkImportSchema,
  listQuerySchema,
  exportQuerySchema
};
