const mongoose = require('mongoose');

const ClassSchedule = require('../models/ClassSchedule');
const Course = require('../../courses/models/Course');
const Batch = require('../../courses/models/Batch');
const User = require('../../auth/models/User');
const FacultyAssignment = require('../../faculty/models/FacultyAssignment');
const Student = require('../../students/models/Student');

const throwError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

// ==========================================================
// VALIDATE REFERENCES (course, batch, faculty, assignment)
// ==========================================================
const validateReferences = async (data) => {
  const [course, batch, faculty, assignment] = await Promise.all([
    Course.findById(data.course_id),
    Batch.findById(data.batch_id),
    User.findById(data.faculty_id),
    FacultyAssignment.findOne({
      faculty_id: data.faculty_id,
      course_id: data.course_id,
      batch_id: data.batch_id,
      subject: data.subject,
    }),
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

// ==========================================================
// CONFLICT DETECTION
// ==========================================================
const checkConflict = async (data, excludeId = null) => {
  const filter = {
    date: new Date(data.date),
    status: 'scheduled',
    $or: [{ faculty_id: data.faculty_id }, { batch_id: data.batch_id }],
    start_time: { $lt: data.end_time },
    end_time: { $gt: data.start_time },
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

// ==========================================================
// CREATE (works for both super_admin and faculty)
// ==========================================================
exports.createSchedule = async (data, user) => {
  // If creator is faculty, force faculty_id to be self
  const payload = {
    ...data,
    faculty_id:
      user.role === 'faculty' ? user.id : data.faculty_id,
  };

  // If faculty is NOT assigned to this course/batch/subject, block
  if (user.role === 'faculty') {
    const assigned = await FacultyAssignment.findOne({
      faculty_id: user.id,
      course_id: payload.course_id,
      batch_id: payload.batch_id,
      subject: payload.subject,
    });
    if (!assigned) {
      throwError(
        403,
        'You are not assigned to this course, batch, and subject. Cannot create schedule.'
      );
    }
  }

  validateTime(payload.start_time, payload.end_time);
  await validateReferences(payload);
  await checkConflict(payload);

  return ClassSchedule.create({
    ...payload,
    created_by: user.id,
  });
};

// ==========================================================
// LIST (with role-based scope)
// ==========================================================
exports.getSchedules = async (query, user) => {
  const filter = {};

  if (query.course_id) filter.course_id = query.course_id;
  if (query.batch_id) filter.batch_id = query.batch_id;
  if (query.subject) filter.subject = query.subject;
  if (query.status) filter.status = query.status;

  // Role-based scope
  if (user.role === 'faculty') {
    filter.faculty_id = user.id;
  } else if (user.role === 'student') {
    const student = await Student.findOne({ user_id: user.id }).select(
      'course_id batch_id'
    );
    if (!student) throwError(404, 'Student profile not found');
    filter.course_id = student.course_id;
    filter.batch_id = student.batch_id;
    filter.status = { $ne: 'cancelled' };
  } else {
    // Admin / office_staff can filter by faculty
    if (query.faculty_id) filter.faculty_id = query.faculty_id;
  }

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

// ==========================================================
// GET BY ID (with access control)
// ==========================================================
exports.getScheduleById = async (id, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throwError(400, 'Invalid schedule ID');
  }

  const schedule = await ClassSchedule.findById(id)
    .populate('course_id', 'name')
    .populate('batch_id', 'name')
    .populate('faculty_id', 'name email')
    .populate('created_by', 'name email');

  if (!schedule) throwError(404, 'Schedule not found');

  // Faculty can only view own
  if (
    user.role === 'faculty' &&
    String(schedule.faculty_id._id) !== String(user.id)
  ) {
    throwError(403, 'You can only view your own schedules');
  }

  // Student can only view own batch
  if (user.role === 'student') {
    const student = await Student.findOne({ user_id: user.id }).select(
      'course_id batch_id'
    );
    if (
      !student ||
      String(schedule.course_id._id) !== String(student.course_id) ||
      String(schedule.batch_id._id) !== String(student.batch_id)
    ) {
      throwError(403, 'You can only view your own batch schedules');
    }
  }

  return schedule;
};

// ==========================================================
// UPDATE
// ==========================================================
exports.updateSchedule = async (id, updateData, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throwError(400, 'Invalid schedule ID');
  }

  const existing = await ClassSchedule.findById(id);
  if (!existing) throwError(404, 'Schedule not found');

  if (existing.status === 'cancelled') {
    throwError(400, 'Cancelled schedule cannot be updated');
  }

  // Faculty can only update own
  if (
    user.role === 'faculty' &&
    String(existing.faculty_id) !== String(user.id)
  ) {
    throwError(403, 'You can only update your own schedules');
  }

  const data = {
    course_id: updateData.course_id || existing.course_id,
    batch_id: updateData.batch_id || existing.batch_id,
    faculty_id: updateData.faculty_id || existing.faculty_id,
    subject: updateData.subject || existing.subject,
    date: updateData.date || existing.date,
    start_time: updateData.start_time || existing.start_time,
    end_time: updateData.end_time || existing.end_time,
  };

  validateTime(data.start_time, data.end_time);
  await validateReferences(data);
  await checkConflict(data, id);

  Object.assign(existing, data);
  await existing.save();

  return existing;
};

// ==========================================================
// CANCEL
// ==========================================================
exports.cancelSchedule = async (id, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throwError(400, 'Invalid schedule ID');
  }

  const schedule = await ClassSchedule.findById(id);
  if (!schedule) throwError(404, 'Schedule not found');

  if (schedule.status === 'cancelled') {
    throwError(400, 'Schedule is already cancelled');
  }

  if (
    user.role === 'faculty' &&
    String(schedule.faculty_id) !== String(user.id)
  ) {
    throwError(403, 'You can only cancel your own schedules');
  }

  schedule.status = 'cancelled';
  await schedule.save();

  return schedule;
};