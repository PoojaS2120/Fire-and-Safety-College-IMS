
const mongoose = require('mongoose');
const path = require('path');

const Notice = require('../models/Notice');
const Course = require('../../courses/models/Course');
const Batch = require('../../courses/models/Batch');
const uploadService = require('../../uploads/services/uploadService');

const isValidId = (id) =>
  typeof id === 'string' || id instanceof mongoose.Types.ObjectId
    ? mongoose.Types.ObjectId.isValid(id)
    : false;

const populateNotice = (query) => {
  return query
    .populate('targetCourse', 'name')
    .populate('targetBatch', 'name')
    .populate('createdBy', 'name email')
    .populate('attachment', 'originalName mimeType size');
};

// CREATE NOTICE
exports.createNotice = async (data, createdBy) => {
  if (!isValidId(createdBy)) {
    throw { statusCode: 400, message: 'Invalid creator ID' };
  }

  const noticeData = { ...data };

  if (data.targetType === 'course') {
    if (!isValidId(data.targetCourse)) {
      throw { statusCode: 400, message: 'Invalid course ID' };
    }

    const course = await Course.findById(data.targetCourse);

    if (!course) {
      throw { statusCode: 404, message: 'Target course not found' };
    }

    noticeData.targetCourse = course._id;
    noticeData.targetBatch = null;
  }

  else if (data.targetType === 'batch') {
    if (!isValidId(data.targetBatch)) {
      throw { statusCode: 400, message: 'Invalid batch ID' };
    }

    const batch = await Batch.findById(data.targetBatch);

    if (!batch) {
      throw { statusCode: 404, message: 'Target batch not found' };
    }

    noticeData.targetBatch = batch._id;
    noticeData.targetCourse = batch.course_id;
  }

  else if (data.targetType === 'all') {
    noticeData.targetCourse = null;
    noticeData.targetBatch = null;
  }

  return Notice.create({
    ...noticeData,
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

  const limit = Math.min(
    Math.max(parseInt(query.limit, 10) || 20, 1),
    100
  );

  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    populateNotice(Notice.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)),

    Notice.countDocuments(filter)
  ]);

  return { rows, total, page, limit };
};

// GET NOTICE DETAILS
exports.getNotice = async (id) => {
  if (!isValidId(id)) {
    throw { statusCode: 400, message: 'Invalid notice ID' };
  }

  const notice = await populateNotice(Notice.findById(id));

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

    if (!courseId || !isValidId(courseId)) {
      throw { statusCode: 400, message: 'Invalid target course ID' };
    }

    const course = await Course.findById(courseId);

    if (!course) {
      throw { statusCode: 404, message: 'Target course not found' };
    }

    updatedData.targetCourse = course._id;
    updatedData.targetBatch = null;
  }

  else if (targetType === 'batch') {
    const batchId = data.targetBatch || notice.targetBatch;

    if (!batchId || !isValidId(batchId)) {
      throw { statusCode: 400, message: 'Invalid target batch ID' };
    }

    const batch = await Batch.findById(batchId);

    if (!batch) {
      throw { statusCode: 404, message: 'Target batch not found' };
    }

    if (
      data.targetCourse &&
      (
        !isValidId(data.targetCourse) ||
        data.targetCourse.toString() !== batch.course_id.toString()
      )
    ) {
      throw {
        statusCode: 400,
        message: 'Selected batch does not belong to the selected course'
      };
    }

    updatedData.targetBatch = batch._id;
    updatedData.targetCourse = batch.course_id;
  }

  else if (targetType === 'all') {
    updatedData.targetCourse = null;
    updatedData.targetBatch = null;
  }

  updatedData.targetType = targetType;

  return populateNotice(
    Notice.findByIdAndUpdate(
      id,
      { $set: updatedData },
      {
        returnDocument: 'after',
        runValidators: true
      }
    )
  );
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
  notice.publishedAt =
    status === 'published' ? new Date() : null;

  await notice.save();

  return populateNotice(Notice.findById(id));
};

// DELETE NOTICE
exports.deleteNotice = async (id) => {
  if (!isValidId(id)) {
    throw { statusCode: 400, message: 'Invalid notice ID' };
  }

  const notice = await Notice.findById(id);

  if (!notice) {
    throw { statusCode: 404, message: 'Notice not found' };
  }

  // Delete the associated uploaded PDF, if present
  if (notice.attachment) {
    await uploadService.deleteUploadById(notice.attachment);
  }

  await notice.deleteOne();

  return notice;
};

// UPLOAD PDF NOTICE
exports.createPdfNotice = async (data, file, createdBy) => {
  if (!isValidId(createdBy)) {
    throw { statusCode: 400, message: 'Invalid creator ID' };
  }

  if (!file) {
    throw {
      statusCode: 400,
      message: 'Please select a PDF file'
    };
  }

  // Validate PDF extension and MIME type
  if (
    path.extname(file.originalname).toLowerCase() !== '.pdf' ||
    file.mimetype !== 'application/pdf'
  ) {
    throw {
      statusCode: 400,
      message: 'Only PDF files are allowed'
    };
  }

  // Validate course and batch IDs
  if (
    !isValidId(data.targetCourse) ||
    !isValidId(data.targetBatch)
  ) {
    throw {
      statusCode: 400,
      message: 'Invalid course or batch ID'
    };
  }

  // Validate course
  const course = await Course.findById(data.targetCourse);

  if (!course) {
    throw {
      statusCode: 404,
      message: 'Course not found'
    };
  }

  // Validate batch belongs to selected course
  const batch = await Batch.findOne({
    _id: data.targetBatch,
    course_id: course._id
  });

  if (!batch) {
    throw {
      statusCode: 400,
      message: 'Selected batch does not belong to the selected course'
    };
  }

  // Save PDF using centralized Upload module
  const upload = await uploadService.saveUpload(file, createdBy);

  try {
    const title =
      data.title?.trim() ||
      path.parse(file.originalname).name;

    const notice = await Notice.create({
      title,

      description:
        data.description?.trim() ||
        `PDF notice: ${file.originalname}`,

      targetType: 'batch',
      targetCourse: course._id,
      targetBatch: batch._id,

      attachment: upload._id,
      createdBy
    });

    return await populateNotice(
      Notice.findById(notice._id)
    );

  } catch (error) {
    // Roll back uploaded file if notice creation fails
    await uploadService
      .deleteUpload(upload._id, createdBy)
      .catch(() => {});

    throw error;
  }
};
