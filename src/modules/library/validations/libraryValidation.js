
const Joi = require('joi');

const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ObjectId');

// ---------- CATEGORIES ----------
exports.createCategorySchema = Joi.object({
  name: Joi.string().max(100).required(),
  description: Joi.string().max(200).allow(null, '')
});

exports.updateCategorySchema = Joi.object({
  name: Joi.string().max(100),
  description: Joi.string().max(200).allow(null, '')
}).min(1);

// ---------- BOOKS ----------
exports.createBookSchema = Joi.object({
  category: objectId.required(),
  title: Joi.string().max(250).required(),
  author: Joi.string().max(150).required(),
  bookCode: Joi.string().max(30).required(),
  totalQty: Joi.number().integer().min(0).required()
});

exports.updateBookSchema = Joi.object({
  category: objectId,
  title: Joi.string().max(250),
  author: Joi.string().max(150),
  bookCode: Joi.string().max(30),
  totalQty: Joi.number().integer().min(0)
}).min(1);

// ---------- BOOK STATUS ----------
exports.updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('active', 'retired')
    .required()
});

// ---------- ISSUE BOOK ----------
exports.issueBookSchema = Joi.object({
  bookId: objectId.required(),
  studentId: objectId.required(),
  dueDate: Joi.date().iso().required()
});
