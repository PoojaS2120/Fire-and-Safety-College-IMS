
const mongoose = require('mongoose');

const isValidObjectId = (value) =>
  typeof value === 'string' &&
  mongoose.Types.ObjectId.isValid(value);

const validateCreateMaterial = (req, res, next) => {
  const {
    title,
    description,
    course_id,
    batch_id,
    subject,
    topic,
    upload_id,
  } = req.body;

  const errors = [];

  if (!title || typeof title !== 'string' || !title.trim()) {
    errors.push('Title is required.');
  } else if (title.trim().length > 150) {
    errors.push('Title cannot exceed 150 characters.');
  }

  if (
    description !== undefined &&
    (typeof description !== 'string' || description.length > 1000)
  ) {
    errors.push('Description cannot exceed 1000 characters.');
  }

  if (!isValidObjectId(course_id)) {
    errors.push('Valid course_id is required.');
  }

  if (!isValidObjectId(batch_id)) {
    errors.push('Valid batch_id is required.');
  }

  if (!isValidObjectId(upload_id)) {
    errors.push('Valid upload_id is required.');
  }

  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    errors.push('Subject is required.');
  }

  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    errors.push('Topic is required.');
  }

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors,
    });
  }

  next();
};

const validateUpdateMaterial = (req, res, next) => {
  const allowedFields = ['title', 'description', 'subject', 'topic'];
  const errors = [];
  const submittedFields = Object.keys(req.body);

  if (!submittedFields.length) {
    errors.push('At least one field is required.');
  }

  const invalidFields = submittedFields.filter(
    (field) => !allowedFields.includes(field)
  );

  if (invalidFields.length) {
    errors.push(`Invalid fields: ${invalidFields.join(', ')}`);
  }

  for (const field of ['title', 'subject', 'topic']) {
    if (
      req.body[field] !== undefined &&
      (typeof req.body[field] !== 'string' || !req.body[field].trim())
    ) {
      errors.push(`${field} cannot be empty.`);
    }
  }

  if (
    req.body.title !== undefined &&
    req.body.title.trim().length > 150
  ) {
    errors.push('Title cannot exceed 150 characters.');
  }

  if (
    req.body.description !== undefined &&
    (typeof req.body.description !== 'string' ||
      req.body.description.length > 1000)
  ) {
    errors.push('Description cannot exceed 1000 characters.');
  }

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors,
    });
  }

  next();
};

const validateMaterialStatus = (req, res, next) => {
  if (!['active', 'archived'].includes(req.body.status)) {
    return res.status(400).json({
      success: false,
      message: 'Status must be active or archived.',
    });
  }

  next();
};

module.exports = {
  validateCreateMaterial,
  validateUpdateMaterial,
  validateMaterialStatus,
};
