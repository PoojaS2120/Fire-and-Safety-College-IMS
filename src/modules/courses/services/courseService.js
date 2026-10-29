const { required } = require('joi');
const Course = require('../models/Course');
const FeeComponent = require('../models/FeeComponent');
const Batch = require('../models/Batch');

// --- COURSES ---
exports.createCourse = async (courseData, adminId) => {
  const existing = await Course.findOne({ name: courseData.name });
  if (existing) throw { statusCode: 400, message: 'Course already exists' };

  const course = await Course.create({ ...courseData, created_by: adminId });
  return course;
};

exports.getCourses = async () => {
  // Return courses and populate the creator's name
  return await Course.find().populate('created_by', 'name');
};

// --- FEE COMPONENTS ---
exports.addFeeComponent = async (courseId, feeData) => {
  const course = await Course.findById(courseId);
  if (!course) throw { statusCode: 404, message: 'Course not found' };

  const fee = await FeeComponent.create({ ...feeData, course_id: courseId });
  return fee;
};

exports.getCourseFees = async (courseId) => {
  return await FeeComponent.find({ course_id: courseId, status: 'active' });
};

// --- BATCHES ---
exports.createBatch = async (courseId, batchData) => {
  const course = await Course.findById(courseId);
  if (!course) throw { statusCode: 404, message: 'Course not found' };

  const batch = await Batch.create({ ...batchData, course_id: courseId });
  return batch;
};

exports.getBatchesByCourse = async (courseId) => {
  return await Batch.find({ course_id: courseId, status: 'active' });
};