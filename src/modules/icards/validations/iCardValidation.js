
const Joi = require('joi');

const photoSchema = Joi.object({
  file_name: Joi.string().allow('', null),
  file_path: Joi.string().allow('', null),
  mime_type: Joi.string().allow('', null),
});

const iCardFields = {
  full_name: Joi.string().trim().min(1).max(150),
  date_of_birth: Joi.date().iso().allow(null),
  blood_group: Joi.string().trim().allow('', null).max(10),
  address: Joi.string().trim().allow('').max(1000),
  mobile_number: Joi.string().trim().allow('').max(20),
  photo: photoSchema.allow(null),
};

// List and search validation
exports.listICardStudentsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().allow('').optional(),
  status: Joi.string()
    .valid('active', 'completed', 'left', 'tc_issued', 'blocked')
    .optional(),
});

// Create iCard validation
exports.createICardSchema = Joi.object({
  studentId: Joi.string().hex().length(24).required(),
  ...iCardFields,
});

// Update iCard validation
exports.updateICardSchema = Joi.object({
  ...iCardFields,
}).min(1);

// List saved iCards validation
exports.listSavedICardsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().allow('').optional(),
  studentId: Joi.string().hex().length(24).optional(),
});
