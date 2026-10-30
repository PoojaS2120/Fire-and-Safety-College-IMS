
const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const GENDERS = ['male', 'female', 'other'];

const LIFECYCLE_STAGES = [
  'enquiry',
  'admission',
  'documents',
  'fees',
  'material',
  'schedule',
  'class_test',
  'exam',
  'exam_form',
  'test',
  'result',
  'tc_lc',
];

const STAGE_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'blocked',
];

const STUDENT_STATUSES = [
  'active',
  'completed',
  'left',
  'tc_issued',
  'deactive',
];

// CREATE STUDENT
exports.createStudentSchema = Joi.object({
  student_id: Joi.string().trim().max(20).required(),

  user_id: objectId.required(),

  full_name: Joi.string().trim().min(2).max(150).required(),

  dob: Joi.date().iso().less('now').required(),

  gender: Joi.string()
    .valid(...GENDERS)
    .allow(null)
    .optional(),

  phone: Joi.string()
    .trim()
    .pattern(/^[0-9+\-\s()]{7,15}$/)
    .required(),

  email: Joi.string()
    .trim()
    .email()
    .max(200)
    .allow('', null)
    .optional(),

  address: Joi.string().trim().min(1).required(),

  guardian_name: Joi.string()
    .trim()
    .max(150)
    .allow('', null)
    .optional(),

  guardian_phone: Joi.string()
    .trim()
    .pattern(/^[0-9+\-\s()]{7,15}$/)
    .allow('', null)
    .optional(),

  qualification: Joi.string().trim().max(150).required(),

  course_id: objectId.required(),

  batch_id: objectId.allow('', null).optional(),

  admitted_on: Joi.date().iso().required(),
});

// UPDATE STUDENT PROFILE
// Lifecycle, stage status, student status, student ID and user ID
// are intentionally excluded from generic profile updates.
exports.updateStudentSchema = Joi.object({
  full_name: Joi.string().trim().min(2).max(150).optional(),

  dob: Joi.date().iso().less('now').optional(),

  gender: Joi.string()
    .valid(...GENDERS)
    .allow(null)
    .optional(),

  phone: Joi.string()
    .trim()
    .pattern(/^[0-9+\-\s()]{7,15}$/)
    .optional(),

  email: Joi.string()
    .trim()
    .email()
    .max(200)
    .allow('', null)
    .optional(),

  address: Joi.string().trim().min(1).optional(),

  guardian_name: Joi.string()
    .trim()
    .max(150)
    .allow('', null)
    .optional(),

  guardian_phone: Joi.string()
    .trim()
    .pattern(/^[0-9+\-\s()]{7,15}$/)
    .allow('', null)
    .optional(),

  qualification: Joi.string().trim().max(150).optional(),

  course_id: objectId.optional(),

  batch_id: objectId.allow('', null).optional(),
})
  .min(1)
  .unknown(false);

// UPDATE ACTIVE / COMPLETED / LEFT / TC ISSUED STATUS
exports.updateStudentStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...STUDENT_STATUSES)
    .required(),
});

// LIST, SEARCH, FILTER AND PAGINATION
exports.listStudentsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),

  limit: Joi.number().integer().min(1).max(100).default(10),

  q: Joi.string().trim().max(150).allow('').optional(),

  status: Joi.string().valid(...STUDENT_STATUSES).optional(),

  lifecycle_stage: Joi.string()
    .valid(...LIFECYCLE_STAGES)
    .optional(),

  stage_status: Joi.string()
    .valid(...STAGE_STATUSES)
    .optional(),

  courseId: objectId.optional(),

  batchId: objectId.optional(),
})
  .unknown(false);
