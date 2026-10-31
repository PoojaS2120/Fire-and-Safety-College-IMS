
const mongoose = require('mongoose');

const ClassSchedule = require('../models/ClassSchedule');
const Course = require('../../courses/models/Course');
const Batch = require('../../courses/models/Batch');
const User = require('../../auth/models/User');
const FacultyAssignment = require('../../faculty/models/FacultyAssignment');

const throwError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const validateReferences = async (data) => {
  const [course, batch, faculty, assignment] = await Promise.all([
    Course.findById(data.course_id),
    Batch.findById(data.batch_id),
    User.findById(data.faculty_id),
    FacultyAssignment.findOne({
      faculty_id: data.faculty_id,
      course_id: data.course_id,
      batch_id: data.batch_id,
      subject: data.subject
    })
  ]);

  if (!course || course.status !== 'active') {
    throwError(400, 'Invalid or inactive course');
  }

  if (!batch || batch.status !== 'active') {
    throwError(400, 'Invalid or inactive batch');
  }

  if (batch.course_id.toString() !== data.course_id.toString()) {
    throwError(400, 'Selected batch does not belong to this course');
  }

  if (!faculty || faculty.role !== 'faculty' || !faculty.is_active) {
    throwError(400, 'Invalid or inactive faculty');
  }

  if (!assignment) {
    throwError(400, 'Faculty is not assigned to this course, batch and subject');
  }
};

const validateTime = (start, end) => {
  if (start >= end) {
    throwError(400, 'End time must be after start time');
  }
};

const checkConflict = async (data, excludeId = null) => {
  const filter = {
    date: new Date(data.date),
    status: 'scheduled',
    $or: [
      { faculty_id: data.faculty_id },
      { batch_id: data.batch_id }
    ],
    start_time: { $lt: data.end_time },
    end_time: { $gt: data.start_time }
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const conflict = await ClassSchedule.findOne(filter);

  if (conflict) {
    if (conflict.faculty_id.toString() === data.faculty_id.toString()) {
      throwError(409, 'Faculty already has another class during this time');
    }

    throwError(409, 'Batch already has another class during this time');
  }
};

exports.createSchedule = async (data, userId) => {
  validateTime(data.start_time, data.end_time);

  await validateReferences(data);
  await checkConflict(data);

  return ClassSchedule.create({
    ...data,
    created_by: userId
  });
};

exports.getSchedules = async (query) => {
  const filter = {};

  if (query.course_id) filter.course_id = query.course_id;
  if (query.batch_id) filter.batch_id = query.batch_id;
  if (query.faculty_id) filter.faculty_id = query.faculty_id;
  if (query.status) filter.status = query.status;

  if (query.date) {
    const selectedDate = new Date(query.date);
    const start = new Date(selectedDate);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(selectedDate);
    end.setUTCHours(23, 59, 59, 999);

    filter.date = { $gte: start, $lte: end };
  }

  return ClassSchedule.find(filter)
    .populate('course_id', 'name')
    .populate('batch_id', 'name')
    .populate('faculty_id', 'name email')
    .populate('created_by', 'name email')
    .sort({ date: 1, start_time: 1 });
};

exports.getScheduleById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throwError(400, 'Invalid schedule ID');
  }

  const schedule = await ClassSchedule.findById(id)
    .populate('course_id', 'name')
    .populate('batch_id', 'name')
    .populate('faculty_id', 'name email')
    .populate('created_by', 'name email');

  if (!schedule) throwError(404, 'Schedule not found');

  return schedule;
};

exports.updateSchedule = async (id, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throwError(400, 'Invalid schedule ID');
  }

  const existing = await ClassSchedule.findById(id);

  if (!existing) throwError(404, 'Schedule not found');

  if (existing.status === 'cancelled') {
    throwError(400, 'Cancelled schedule cannot be updated');
  }

  const data = {
    course_id: updateData.course_id || existing.course_id,
    batch_id: updateData.batch_id || existing.batch_id,
    faculty_id: updateData.faculty_id || existing.faculty_id,
    subject: updateData.subject || existing.subject,
    date: updateData.date || existing.date,
    start_time: updateData.start_time || existing.start_time,
    end_time: updateData.end_time || existing.end_time
  };

  validateTime(data.start_time, data.end_time);

  await validateReferences(data);
  await checkConflict(data, id);

  Object.assign(existing, data);

  await existing.save();

  return existing;
};

exports.cancelSchedule = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throwError(400, 'Invalid schedule ID');
  }

  const schedule = await ClassSchedule.findById(id);

  if (!schedule) throwError(404, 'Schedule not found');

  if (schedule.status === 'cancelled') {
    throwError(400, 'Schedule is already cancelled');
  }

  schedule.status = 'cancelled';
  await schedule.save();

  return schedule;
};
