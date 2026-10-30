const Course = require('../models/Course');
const FeeComponent = require('../models/FeeComponent');
const Batch = require('../models/Batch');

// ================= COURSES =================
exports.createCourse = async (courseData, adminId) => {
  const existing = await Course.findOne({ name: courseData.name });
  if (existing) throw { statusCode: 400, message: 'Course already exists' };

  const course = await Course.create({ ...courseData, created_by: adminId });
  return course;
};

exports.getCourses = async () => {
  return await Course.find().populate('created_by', 'name');
};

// NEW: Update Course
exports.updateCourse = async (courseId, updateData) => {
  const course = await Course.findByIdAndUpdate(courseId, updateData, { new: true, runValidators: true });
  if (!course) throw { statusCode: 404, message: 'Course not found' };
  return course;
};

// NEW: Toggle Course Status (Soft Delete)
exports.toggleCourseStatus = async (courseId) => {
  const course = await Course.findById(courseId);
  if (!course) throw { statusCode: 404, message: 'Course not found' };

  course.status = course.status === 'active' ? 'inactive' : 'active';
  await course.save();
  return { message: `Course status changed to ${course.status}`, status: course.status };
};

// ================= FEE COMPONENTS =================
exports.addFeeComponent = async (courseId, feeData) => {
  const course = await Course.findById(courseId);
  if (!course) throw { statusCode: 404, message: 'Course not found' };

  const fee = await FeeComponent.create({ ...feeData, course_id: courseId });
  return fee;
};

exports.getCourseFees = async (courseId) => {
  return await FeeComponent.find({ course_id: courseId, status: 'active' });
};

// ================= BATCHES =================
exports.createBatch = async (courseId, batchData) => {
  const course = await Course.findById(courseId);
  if (!course) throw { statusCode: 404, message: 'Course not found' };

  const batch = await Batch.create({ ...batchData, course_id: courseId });
  return batch;
};

exports.getBatchesByCourse = async (courseId) => {
  return await Batch.find({ course_id: courseId, status: 'active' });
};

// NEW: Update Batch
exports.updateBatch = async (batchId, updateData) => {
  const batch = await Batch.findByIdAndUpdate(batchId, updateData, { new: true, runValidators: true });
  if (!batch) throw { statusCode: 404, message: 'Batch not found' };
  return batch;
};

// NEW: Toggle Batch Status (Soft Delete)
exports.toggleBatchStatus = async (batchId) => {
  const batch = await Batch.findById(batchId);
  if (!batch) throw { statusCode: 404, message: 'Batch not found' };

  batch.status = batch.status === 'active' ? 'closed' : 'active';
  await batch.save();
  return { message: `Batch status changed to ${batch.status}`, status: batch.status };
};