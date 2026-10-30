// const courseService = require('../services/courseService');
// const { createCourseSchema, createFeeComponentSchema, createBatchSchema } = require('../validations/courseValidation');
// // Create Course
// exports.createCourse = async (req, res, next) => {
//   try {
//     const { error } = createCourseSchema.validate(req.body);
//     if (error) return res.status(400).json({ success: false, message: error.details[0].message });

//     const course = await courseService.createCourse(req.body, req.user.id);
//     res.status(201).json({ success: true, message: 'Course created', data: course });
//   } catch (err) { next(err); }
// };

// // Get All Courses
// exports.getCourses = async (req, res, next) => {
//   try {
//     const courses = await courseService.getCourses();
//     res.status(200).json({ success: true, data: courses });
//   } catch (err) { next(err); }
// };

// // Add Fee Component to Course
// exports.addFeeComponent = async (req, res, next) => {
//   try {
//     const { error } = createFeeComponentSchema.validate(req.body);
//     if (error) return res.status(400).json({ success: false, message: error.details[0].message });

//     const fee = await courseService.addFeeComponent(req.params.courseId, req.body);
//     res.status(201).json({ success: true, message: 'Fee component added', data: fee });
//   } catch (err) { next(err); }
// };

// // Get Fees for a Course
// exports.getCourseFees = async (req, res, next) => {
//   try {
//     const fees = await courseService.getCourseFees(req.params.courseId);
    
//     // Calculate total fee dynamically
//     const totalFee = fees.reduce((sum, item) => sum + item.amount, 0);
    
//     res.status(200).json({ success: true, totalFee, data: fees });
//   } catch (err) { next(err); }
// };

// // Create Batch
// exports.createBatch = async (req, res, next) => {
//   try {
//     const { error } = createBatchSchema.validate(req.body);
//     if (error) return res.status(400).json({ success: false, message: error.details[0].message });

//     const batch = await courseService.createBatch(req.params.courseId, req.body);
//     res.status(201).json({ success: true, message: 'Batch created', data: batch });
//   } catch (err) { next(err); }
// };

// // Get Batches for Course
// exports.getBatches = async (req, res, next) => {
//   try {
//     const batches = await courseService.getBatchesByCourse(req.params.courseId);
//     res.status(200).json({ success: true, data: batches });
//   } catch (err) { next(err); }
// };



const courseService = require('../services/courseService');
const { createCourseSchema, createFeeComponentSchema, createBatchSchema } = require('../validations/courseValidation');

// ================= COURSES =================

// Create Course
exports.createCourse = async (req, res, next) => {
  try {
    const { error } = createCourseSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const course = await courseService.createCourse(req.body, req.user.id);
    res.status(201).json({ success: true, message: 'Course created', data: course });
  } catch (err) { next(err); }
};

// Get All Courses
exports.getCourses = async (req, res, next) => {
  try {
    const courses = await courseService.getCourses();
    res.status(200).json({ success: true, data: courses });
  } catch (err) { next(err); }
};

// Update a Course
exports.updateCourse = async (req, res, next) => {
  try {
    const course = await courseService.updateCourse(req.params.courseId, req.body);
    res.status(200).json({ success: true, message: 'Course updated successfully', data: course });
  } catch (err) { next(err); }
};

// Deactivate/Activate a Course (Soft Delete)
exports.toggleCourseStatus = async (req, res, next) => {
  try {
    const result = await courseService.toggleCourseStatus(req.params.courseId);
    res.status(200).json({ success: true, message: result.message, data: { status: result.status } });
  } catch (err) { next(err); }
};

// ================= FEE COMPONENTS =================

// Add Fee Component to Course
exports.addFeeComponent = async (req, res, next) => {
  try {
    const { error } = createFeeComponentSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const fee = await courseService.addFeeComponent(req.params.courseId, req.body);
    res.status(201).json({ success: true, message: 'Fee component added', data: fee });
  } catch (err) { next(err); }
};

// Get Fees for a Course
exports.getCourseFees = async (req, res, next) => {
  try {
    const fees = await courseService.getCourseFees(req.params.courseId);
    
    // Calculate total fee dynamically
    const totalFee = fees.reduce((sum, item) => sum + item.amount, 0);
    
    res.status(200).json({ success: true, totalFee, data: fees });
  } catch (err) { next(err); }
};

// ================= BATCHES =================

// Create Batch
exports.createBatch = async (req, res, next) => {
  try {
    const { error } = createBatchSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const batch = await courseService.createBatch(req.params.courseId, req.body);
    res.status(201).json({ success: true, message: 'Batch created', data: batch });
  } catch (err) { next(err); }
};

// Get Batches for Course
exports.getBatches = async (req, res, next) => {
  try {
    const batches = await courseService.getBatchesByCourse(req.params.courseId);
    res.status(200).json({ success: true, data: batches });
  } catch (err) { next(err); }
};

// Update a Batch
exports.updateBatch = async (req, res, next) => {
  try {
    const batch = await courseService.updateBatch(req.params.batchId, req.body);
    res.status(200).json({ success: true, message: 'Batch updated successfully', data: batch });
  } catch (err) { next(err); }
};

// Close/Open a Batch (Soft Delete)
exports.toggleBatchStatus = async (req, res, next) => {
  try {
    const result = await courseService.toggleBatchStatus(req.params.batchId);
    res.status(200).json({ success: true, message: result.message, data: { status: result.status } });
  } catch (err) { next(err); }
};