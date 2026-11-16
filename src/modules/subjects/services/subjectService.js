const mongoose = require('mongoose');
const Subject = require('../models/Subject');
const Course = require('../../courses/models/Course'); // Add this import

const createError = (status, message) => {
  const err = new Error(message);
  err.statusCode = status;
  throw err;
};

// ================= CREATE =================
exports.createSubject = async (data, userId) => {
  // 1. Verify the Course exists
  const course = await Course.findById(data.course_id);
  if (!course) createError(404, 'Selected course not found.');

  // 2. Check for duplicate subject name in the same course
  const existing = await Subject.findOne({ 
    name: { $regex: new RegExp(`^${data.name}$`, 'i') }, 
    course_id: data.course_id 
  });
  if (existing) {
    createError(400, 'This subject already exists in the selected course.');
  }

  return await Subject.create({
    ...data,
    created_by: userId,
  });
};

// ================= READ ALL =================
exports.getSubjects = async (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.course_id) filter.course_id = query.course_id; // Filter subjects by specific course
  
  if (query.search) {
    filter.name = { $regex: query.search, $options: 'i' };
  }

  const [subjects, total] = await Promise.all([
    Subject.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('course_id', 'name duration') // <--- This brings in the Course Name
      .populate('created_by', 'name') 
      .lean(),
    Subject.countDocuments(filter),
  ]);

  return {
    subjects,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ================= READ ONE =================
exports.getSubjectById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) createError(400, 'Invalid subject ID format.');

  const subject = await Subject.findById(id)
    .populate('course_id', 'name')
    .populate('created_by', 'name email');
    
  if (!subject) createError(404, 'Subject not found.');

  return subject;
};

// ================= UPDATE =================
exports.updateSubject = async (id, data) => {
  if (!mongoose.Types.ObjectId.isValid(id)) createError(400, 'Invalid subject ID format.');

  const subject = await Subject.findById(id);
  if (!subject) createError(404, 'Subject not found.');

  // If changing course, verify the new course exists
  if (data.course_id) {
    const course = await Course.findById(data.course_id);
    if (!course) createError(404, 'Selected course not found.');
  }

  Object.assign(subject, data);
  await subject.save();
  
  return subject;
};

// ================= DELETE =================
exports.deleteSubject = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) createError(400, 'Invalid subject ID format.');

  const subject = await Subject.findById(id);
  if (!subject) createError(404, 'Subject not found.');

  subject.status = 'inactive';
  await subject.save();

  return { message: 'Subject deactivated successfully.' };
};