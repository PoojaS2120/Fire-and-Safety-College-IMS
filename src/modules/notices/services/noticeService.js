const mongoose = require('mongoose');
const Notice = require('../models/Notice');
const Course = require('../../courses/models/Course');
const Batch = require('../../courses/models/Batch');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// CREATE NOTICE
exports.createNotice = async (data, createdBy) => {
  if (!isValidId(createdBy)) {
    throw { statusCode: 400, message: 'Invalid creator ID' };
  }

  if (data.targetType === 'course') {
    const course = await Course.findById(data.targetCourse);
    if (!course) {
      throw { statusCode: 400, message: 'Target course not found' };
    }
  }

  if (data.targetType === 'batch') {
    const batch = await Batch.findById(data.targetBatch);
    if (!batch) {
      throw { statusCode: 400, message: 'Target batch not found' };
    }
  }

  return Notice.create({
    ...data,
    createdBy
  });
};

// LIST NOTICES
exports.listNotices = async (query = {}) => {
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.targetType) filter.targetType = query.targetType;

  if (query.targetCourse && isValidId(query.targetCourse)) {
    filter.targetCourse = query.targetCourse;
  }

  if (query.targetBatch && isValidId(query.targetBatch)) {
    filter.targetBatch = query.targetBatch;
  }

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    Notice.find(filter)
      .populate('targetCourse', 'name')
      .populate('targetBatch', 'name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Notice.countDocuments(filter)
  ]);

  return { rows, total, page, limit };
};

// GET NOTICE DETAILS
exports.getNotice = async (id) => {
  if (!isValidId(id)) {
    throw { statusCode: 400, message: 'Invalid notice ID' };
  }

  const notice = await Notice.findById(id)
    .populate('targetCourse', 'name')
    .populate('targetBatch', 'name')
    .populate('createdBy', 'name email');

  if (!notice) {
    throw { statusCode: 404, message: 'Notice not found' };
  }

  return notice;
};

// UPDATE NOTICE
exports.updateNotice = async (id, data) => {
  if (!isValidId(id)) {
    throw { statusCode: 400, message: 'Invalid notice ID' };
  }

  const notice = await Notice.findById(id);

  if (!notice) {
    throw { statusCode: 404, message: 'Notice not found' };
  }

  if (notice.status === 'published') {
    throw {
      statusCode: 400,
      message: 'Withdraw the notice before editing it'
    };
  }

  const updatedData = { ...data };
  const targetType = data.targetType || notice.targetType;

  if (targetType === 'course') {
    const courseId = data.targetCourse || notice.targetCourse;

    if (!courseId || !(await Course.findById(courseId))) {
      throw { statusCode: 400, message: 'Target course not found' };
    }

    updatedData.targetCourse = courseId;
    updatedData.targetBatch = null;
  } else if (targetType === 'batch') {
    const batchId = data.targetBatch || notice.targetBatch;

    if (!batchId || !(await Batch.findById(batchId))) {
      throw { statusCode: 400, message: 'Target batch not found' };
    }

    updatedData.targetBatch = batchId;
    updatedData.targetCourse = null;
  } else if (targetType === 'all') {
    updatedData.targetCourse = null;
    updatedData.targetBatch = null;
  }

  return Notice.findByIdAndUpdate(
    id,
    { $set: updatedData },
    { returnDocument: 'after', runValidators: true }
  )
    .populate('targetCourse', 'name')
    .populate('targetBatch', 'name')
    .populate('createdBy', 'name email');
};

// PUBLISH / WITHDRAW NOTICE
exports.updateNoticeStatus = async (id, status) => {
  if (!isValidId(id)) {
    throw { statusCode: 400, message: 'Invalid notice ID' };
  }

  const notice = await Notice.findById(id);

  if (!notice) {
    throw { statusCode: 404, message: 'Notice not found' };
  }

  notice.status = status;
  notice.publishedAt = status === 'published' ? new Date() : null;

  await notice.save();

  return notice;
};

// DELETE NOTICE
exports.deleteNotice = async (id) => {
  if (!isValidId(id)) {
    throw { statusCode: 400, message: 'Invalid notice ID' };
  }

  const notice = await Notice.findByIdAndDelete(id);

  if (!notice) {
    throw { statusCode: 404, message: 'Notice not found' };
  }

  return notice;
};