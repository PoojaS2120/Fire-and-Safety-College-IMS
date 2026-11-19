// const Course = require('../models/Course');
// const FeeComponent = require('../models/FeeComponent');
// const Batch = require('../models/Batch');

// // ================= COURSES =================
// exports.createCourse = async (courseData, adminId) => {
//   const existing = await Course.findOne({ name: courseData.name });
//   if (existing) throw { statusCode: 400, message: 'Course already exists' };

//   const course = await Course.create({ ...courseData, created_by: adminId });
//   return course;
// };

// exports.getCourses = async () => {
//   const courses = await Course.find().populate('created_by', 'name').lean();
  
//   // Calculate total_fee on the fly for the UI
//   for (const course of courses) {
//     const fees = await FeeComponent.find({ course_id: course._id, status: 'active' });
//     course.total_fee = fees.reduce((sum, f) => sum + f.amount, 0);
//     course.fee_count = fees.length;
//   }
  
//   return courses;
// };

// exports.updateCourse = async (courseId, updateData) => {
//   // Check for duplicate name if name is being changed
//   if (updateData.name) {
//     const existing = await Course.findOne({ 
//       name: updateData.name, 
//       _id: { $ne: courseId } 
//     });
//     if (existing) throw { statusCode: 400, message: 'Another course with this name already exists' };
//   }

//   const course = await Course.findByIdAndUpdate(
//     courseId, 
//     updateData, 
//     { returnDocument: 'after', runValidators: true }
//   );
//   if (!course) throw { statusCode: 404, message: 'Course not found' };
//   return course;
// };

// exports.toggleCourseStatus = async (courseId) => {
//   const course = await Course.findById(courseId);
//   if (!course) throw { statusCode: 404, message: 'Course not found' };

//   course.status = course.status === 'active' ? 'inactive' : 'active';
//   await course.save();
//   return { message: `Course status changed to ${course.status}`, status: course.status };
// };

// // ================= FEE COMPONENTS =================
// exports.addFeeComponent = async (courseId, feeData) => {
//   const course = await Course.findById(courseId);
//   if (!course) throw { statusCode: 404, message: 'Course not found' };

//   const fee = await FeeComponent.create({ ...feeData, course_id: courseId });
//   return fee;
// };

// exports.getCourseFees = async (courseId) => {
//   const course = await Course.findById(courseId);
//   if (!course) throw { statusCode: 404, message: 'Course not found' };
  
//   // Return ALL fees (active + inactive) so admin can see them
//   return await FeeComponent.find({ course_id: courseId }).sort({ createdAt: 1 });
// };

// exports.updateFeeComponent = async (feeId, updateData) => {
//   const fee = await FeeComponent.findByIdAndUpdate(
//     feeId, 
//     updateData, 
//     { returnDocument: 'after', runValidators: true }
//   );
//   if (!fee) throw { statusCode: 404, message: 'Fee component not found' };
//   return fee;
// };

// exports.toggleFeeStatus = async (feeId) => {
//   const fee = await FeeComponent.findById(feeId);
//   if (!fee) throw { statusCode: 404, message: 'Fee component not found' };
  
//   fee.status = fee.status === 'active' ? 'inactive' : 'active';
//   await fee.save();
  
//   return { message: `Fee component status changed to ${fee.status}`, status: fee.status };
// };

// // ================= BATCHES =================
// exports.createBatch = async (courseId, batchData) => {
//   const course = await Course.findById(courseId);
//   if (!course) throw { statusCode: 404, message: 'Course not found' };

//   const batch = await Batch.create({ ...batchData, course_id: courseId });
//   return batch;
// };

// exports.getBatchesByCourse = async (courseId, includeClosed = false) => {
//   const course = await Course.findById(courseId);
//   if (!course) throw { statusCode: 404, message: 'Course not found' };
  
//   const filter = { course_id: courseId };
//   if (!includeClosed) filter.status = 'active';
//   return await Batch.find(filter).sort({ start_date: -1 });
// };

// exports.updateBatch = async (batchId, updateData) => {
//   const batch = await Batch.findByIdAndUpdate(
//     batchId, 
//     updateData, 
//     { returnDocument: 'after', runValidators: true }
//   );
//   if (!batch) throw { statusCode: 404, message: 'Batch not found' };
//   return batch;
// };

// exports.toggleBatchStatus = async (batchId) => {
//   const batch = await Batch.findById(batchId);
//   if (!batch) throw { statusCode: 404, message: 'Batch not found' };

//   batch.status = batch.status === 'active' ? 'closed' : 'active';
//   await batch.save();
//   return { message: `Batch status changed to ${batch.status}`, status: batch.status };
// };


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

// ================= LIST (Paginated) =================
exports.getCourses = async (query = {}) => {
  const filter = {};

  // Optional status filter
  if (query.status) filter.status = query.status;

  // Optional search by name
  const searchTerm = query.q || query.search;
  if (searchTerm) {
    const escaped = String(searchTerm).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.name = { $regex: escaped, $options: 'i' };
  }

  // Pagination — default 10 per page, cap 100
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [courses, total] = await Promise.all([
    Course.find(filter)
      .populate('created_by', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Course.countDocuments(filter),
  ]);

  // Calculate total_fee on the fly for the UI (only for the current page)
  for (const course of courses) {
    const fees = await FeeComponent.find({
      course_id: course._id,
      status: 'active',
    });
    course.total_fee = fees.reduce((sum, f) => sum + f.amount, 0);
    course.fee_count = fees.length;
  }

  return {
    courses,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

exports.updateCourse = async (courseId, updateData) => {
  if (updateData.name) {
    const existing = await Course.findOne({
      name: updateData.name,
      _id: { $ne: courseId },
    });
    if (existing) throw { statusCode: 400, message: 'Another course with this name already exists' };
  }

  const course = await Course.findByIdAndUpdate(
    courseId,
    updateData,
    { returnDocument: 'after', runValidators: true }
  );
  if (!course) throw { statusCode: 404, message: 'Course not found' };
  return course;
};

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
  const course = await Course.findById(courseId);
  if (!course) throw { statusCode: 404, message: 'Course not found' };

  return await FeeComponent.find({ course_id: courseId }).sort({ createdAt: 1 });
};

exports.updateFeeComponent = async (feeId, updateData) => {
  const fee = await FeeComponent.findByIdAndUpdate(
    feeId,
    updateData,
    { returnDocument: 'after', runValidators: true }
  );
  if (!fee) throw { statusCode: 404, message: 'Fee component not found' };
  return fee;
};

exports.toggleFeeStatus = async (feeId) => {
  const fee = await FeeComponent.findById(feeId);
  if (!fee) throw { statusCode: 404, message: 'Fee component not found' };

  fee.status = fee.status === 'active' ? 'inactive' : 'active';
  await fee.save();

  return { message: `Fee component status changed to ${fee.status}`, status: fee.status };
};

// ================= BATCHES =================
exports.createBatch = async (courseId, batchData) => {
  const course = await Course.findById(courseId);
  if (!course) throw { statusCode: 404, message: 'Course not found' };

  const batch = await Batch.create({ ...batchData, course_id: courseId });
  return batch;
};

exports.getBatchesByCourse = async (courseId, includeClosed = false) => {
  const course = await Course.findById(courseId);
  if (!course) throw { statusCode: 404, message: 'Course not found' };

  const filter = { course_id: courseId };
  if (!includeClosed) filter.status = 'active';
  return await Batch.find(filter).sort({ start_date: -1 });
};

exports.updateBatch = async (batchId, updateData) => {
  const batch = await Batch.findByIdAndUpdate(
    batchId,
    updateData,
    { returnDocument: 'after', runValidators: true }
  );
  if (!batch) throw { statusCode: 404, message: 'Batch not found' };
  return batch;
};

exports.toggleBatchStatus = async (batchId) => {
  const batch = await Batch.findById(batchId);
  if (!batch) throw { statusCode: 404, message: 'Batch not found' };

  batch.status = batch.status === 'active' ? 'closed' : 'active';
  await batch.save();
  return { message: `Batch status changed to ${batch.status}`, status: batch.status };
};