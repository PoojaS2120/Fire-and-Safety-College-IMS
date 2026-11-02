
// const courseService = require('../services/courseService');
// const { createCourseSchema, createFeeComponentSchema, createBatchSchema } = require('../validations/courseValidation');

// // ================= COURSES =================

// exports.createCourse = async (req, res, next) => {
//   try {
//     const { error } = createCourseSchema.validate(req.body);
//     if (error) return res.status(400).json({ success: false, message: error.details[0].message });

//     const course = await courseService.createCourse(req.body, req.user.id);
//     res.status(201).json({ success: true, message: 'Course created', data: course });
//   } catch (err) { next(err); }
// };

// exports.getCourses = async (req, res, next) => {
//   try {
//     const courses = await courseService.getCourses();
//     res.status(200).json({ success: true, data: courses });
//   } catch (err) { next(err); }
// };

// exports.updateCourse = async (req, res, next) => {
//   try {
//     const course = await courseService.updateCourse(req.params.courseId, req.body);
//     res.status(200).json({ success: true, message: 'Course updated successfully', data: course });
//   } catch (err) { next(err); }
// };

// exports.toggleCourseStatus = async (req, res, next) => {
//   try {
//     const result = await courseService.toggleCourseStatus(req.params.courseId);
//     res.status(200).json({ success: true, message: result.message, data: { status: result.status } });
//   } catch (err) { next(err); }
// };

// // ================= FEE COMPONENTS =================

// exports.addFeeComponent = async (req, res, next) => {
//   try {
//     const { error } = createFeeComponentSchema.validate(req.body);
//     if (error) return res.status(400).json({ success: false, message: error.details[0].message });

//     const fee = await courseService.addFeeComponent(req.params.courseId, req.body);
//     res.status(201).json({ success: true, message: 'Fee component added', data: fee });
//   } catch (err) { next(err); }
// };

// exports.getCourseFees = async (req, res, next) => {
//   try {
//     const fees = await courseService.getCourseFees(req.params.courseId);
//     const totalFee = fees.reduce((sum, item) => sum + item.amount, 0);
    
//     res.status(200).json({ success: true, totalFee, data: fees });
//   } catch (err) { next(err); }
// };

// // NEW: Update Fee Component
// exports.updateFeeComponent = async (req, res, next) => {
//   try {
//     const fee = await courseService.updateFeeComponent(req.params.feeId, req.body);
//     res.status(200).json({ success: true, message: 'Fee component updated successfully', data: fee });
//   } catch (err) { next(err); }
// };

// // ================= BATCHES =================

// exports.createBatch = async (req, res, next) => {
//   try {
//     const { error } = createBatchSchema.validate(req.body);
//     if (error) return res.status(400).json({ success: false, message: error.details[0].message });

//     const batch = await courseService.createBatch(req.params.courseId, req.body);
//     res.status(201).json({ success: true, message: 'Batch created', data: batch });
//   } catch (err) { next(err); }
// };

// exports.getBatches = async (req, res, next) => {
//   try {
//     const batches = await courseService.getBatchesByCourse(req.params.courseId);
//     res.status(200).json({ success: true, data: batches });
//   } catch (err) { next(err); }
// };

// exports.updateBatch = async (req, res, next) => {
//   try {
//     const batch = await courseService.updateBatch(req.params.batchId, req.body);
//     res.status(200).json({ success: true, message: 'Batch updated successfully', data: batch });
//   } catch (err) { next(err); }
// };

// exports.toggleBatchStatus = async (req, res, next) => {
//   try {
//     const result = await courseService.toggleBatchStatus(req.params.batchId);
//     res.status(200).json({ success: true, message: result.message, data: { status: result.status } });
//   } catch (err) { next(err); }
// };

const courseService = require('../services/courseService');
const { 
  createCourseSchema, 
  updateCourseSchema,
  createFeeComponentSchema, 
  updateFeeComponentSchema,
  createBatchSchema,
  updateBatchSchema
} = require('../validations/courseValidation');

// ================= COURSES =================
exports.createCourse = async (req, res, next) => {
  try {
    const { error } = createCourseSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const course = await courseService.createCourse(req.body, req.user.id);
    res.status(201).json({ success: true, message: 'Course created', data: course });
  } catch (err) { next(err); }
};

exports.getCourses = async (req, res, next) => {
  try {
    const courses = await courseService.getCourses();
    res.status(200).json({ success: true, data: courses });
  } catch (err) { next(err); }
};

exports.updateCourse = async (req, res, next) => {
  try {
    const { error } = updateCourseSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const course = await courseService.updateCourse(req.params.courseId, req.body);
    res.status(200).json({ success: true, message: 'Course updated successfully', data: course });
  } catch (err) { next(err); }
};

exports.toggleCourseStatus = async (req, res, next) => {
  try {
    const result = await courseService.toggleCourseStatus(req.params.courseId);
    res.status(200).json({ success: true, message: result.message, data: { status: result.status } });
  } catch (err) { next(err); }
};

// ================= FEE COMPONENTS =================
exports.addFeeComponent = async (req, res, next) => {
  try {
    const { error } = createFeeComponentSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const fee = await courseService.addFeeComponent(req.params.courseId, req.body);
    res.status(201).json({ success: true, message: 'Fee component added', data: fee });
  } catch (err) { next(err); }
};

exports.getCourseFees = async (req, res, next) => {
  try {
    const fees = await courseService.getCourseFees(req.params.courseId);
    const totalFee = fees
      .filter(f => f.status === 'active')
      .reduce((sum, item) => sum + item.amount, 0);
    
    res.status(200).json({ success: true, totalFee, data: fees });
  } catch (err) { next(err); }
};

exports.updateFeeComponent = async (req, res, next) => {
  try {
    const { error } = updateFeeComponentSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const fee = await courseService.updateFeeComponent(req.params.feeId, req.body);
    res.status(200).json({ success: true, message: 'Fee component updated successfully', data: fee });
  } catch (err) { next(err); }
};

exports.toggleFeeStatus = async (req, res, next) => {
  try {
    const result = await courseService.toggleFeeStatus(req.params.feeId);
    res.status(200).json({ success: true, message: result.message, data: { status: result.status } });
  } catch (err) { next(err); }
};

// ================= BATCHES =================
exports.createBatch = async (req, res, next) => {
  try {
    const { error } = createBatchSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const batch = await courseService.createBatch(req.params.courseId, req.body);
    res.status(201).json({ success: true, message: 'Batch created', data: batch });
  } catch (err) { next(err); }
};

exports.getBatches = async (req, res, next) => {
  try {
    const includeClosed = req.query.includeClosed === 'true';
    const batches = await courseService.getBatchesByCourse(req.params.courseId, includeClosed);
    res.status(200).json({ success: true, data: batches });
  } catch (err) { next(err); }
};

exports.updateBatch = async (req, res, next) => {
  try {
    const { error } = updateBatchSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const batch = await courseService.updateBatch(req.params.batchId, req.body);
    res.status(200).json({ success: true, message: 'Batch updated successfully', data: batch });
  } catch (err) { next(err); }
};

exports.toggleBatchStatus = async (req, res, next) => {
  try {
    const result = await courseService.toggleBatchStatus(req.params.batchId);
    res.status(200).json({ success: true, message: result.message, data: { status: result.status } });
  } catch (err) { next(err); }
};