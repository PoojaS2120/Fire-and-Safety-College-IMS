const mongoose = require('mongoose');
const ConcessionMaster = require('../models/ConcessionMaster');
const Student = require('../../students/models/Student');

const createError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

exports.createConcession = async (data, userId) => {
  const existing = await ConcessionMaster.findOne({
    code: String(data.code || '').toUpperCase(),
  });
  if (existing) {
    throw createError(400, 'A concession with this code already exists.');
  }
  if (data.concession_type === 'group' && (!data.min_students || data.min_students < 2)) {
    throw createError(400, 'Group concession requires min_students >= 2 (e.g., 4).');
  }
  if (data.type === 'percentage' && (data.value <= 0 || data.value > 100)) {
    throw createError(400, 'Percentage concession must be between 0 and 100.');
  }
  if (
    data.applicable_to === 'specific_fees' &&
    (!Array.isArray(data.specific_fee_ids) || data.specific_fee_ids.length === 0)
  ) {
    throw createError(400, 'specific_fee_ids is required when applicable_to = specific_fees.');
  }
  return ConcessionMaster.create({
    ...data,
    code: data.code.toUpperCase(),
    created_by: userId,
  });
};

exports.getConcessions = async (query) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.concession_type) filter.concession_type = query.concession_type;
  return ConcessionMaster.find(filter)
    .populate('created_by', 'name')
    .sort({ createdAt: -1 });
};

exports.getConcessionById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError(400, 'Invalid concession ID.');
  }
  const concession = await ConcessionMaster.findById(id);
  if (!concession) throw createError(404, 'Concession not found.');
  return concession;
};

exports.updateConcession = async (id, data) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError(400, 'Invalid concession ID.');
  }
  const concession = await ConcessionMaster.findById(id);
  if (!concession) throw createError(404, 'Concession not found.');

  if (data.code && data.code.toUpperCase() !== concession.code) {
    const existing = await ConcessionMaster.findOne({
      code: data.code.toUpperCase(),
    });
    if (existing) throw createError(400, 'A concession with this code already exists.');
    data.code = data.code.toUpperCase();
  }
  Object.assign(concession, data);
  await concession.save();
  return concession;
};

exports.deleteConcession = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError(400, 'Invalid concession ID.');
  }
  const concession = await ConcessionMaster.findById(id);
  if (!concession) throw createError(404, 'Concession not found.');

  const using = await Student.countDocuments({
    concession_id: id,
    status: 'active',
  });
  if (using > 0) {
    throw createError(
      400,
      `Cannot delete. ${using} student(s) are currently using this concession.`
    );
  }
  concession.status = 'inactive';
  await concession.save();
  return { message: 'Concession deactivated successfully.' };
};