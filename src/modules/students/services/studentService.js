// const mongoose = require('mongoose');

// const Student = require('../models/Student');
// const StudentStageHistory = require('../models/StudentStageHistory');
// const StudentIdCounter = require('../models/StudentIdCounter');
// const User = require('../../auth/models/User');
// const Course = require('../../courses/models/Course');
// const Batch = require('../../courses/models/Batch');
// const FacultyAssignment = require('../../faculty/models/FacultyAssignment');
// const BookIssue = require('../../library/models/BookIssue');
// const TcLc = require('../../tclc/models/TcLc');

// function createError(statusCode, message) {
//   const err = new Error(message);
//   err.statusCode = statusCode;
//   return err;
// }

// function validateObjectId(id, fieldName = 'student ID') {
//   if (!mongoose.isValidObjectId(id)) throw createError(400, `Invalid ${fieldName}.`);
// }

// async function validateAssignments(courseId, batchId) {
//   if (!courseId) throw createError(400, 'Course is required.');
//   validateObjectId(courseId, 'course ID');

//   const course = await Course.findById(courseId);
//   if (!course) throw createError(404, 'Course not found.');
//   if (course.status !== 'active') throw createError(400, 'Selected course is inactive.');

//   if (batchId) {
//     validateObjectId(batchId, 'batch ID');
//     const batch = await Batch.findById(batchId);
//     if (!batch) throw createError(404, 'Batch not found.');
//     if (batch.status !== 'active') throw createError(400, 'Selected batch is closed.');
//     if (batch.course_id.toString() !== courseId.toString()) {
//       throw createError(400, 'Selected batch does not belong to the selected course.');
//     }
//   }
// }

// // Check whether all library books issued to a student have been returned.
// async function validateBooksReturned(studentId) {
//   const pendingIssues = await BookIssue.find({
//     student: studentId,
//     status: { $in: ['issued', 'overdue'] },
//   })
//     .populate('book', 'title bookTitle name')
//     .lean();

//   if (pendingIssues.length > 0) {
//     const bookDetails = pendingIssues.map((issue) => {
//       const bookName =
//         issue.book?.title ||
//         issue.book?.bookTitle ||
//         issue.book?.name ||
//         'Unknown book';

//       return bookName;
//     });

//     throw createError(
//       400,
//       `Cannot change student status. ${pendingIssues.length} book(s) are still not returned: ${bookDetails.join(', ')}. Please return all issued books first.`
//     );
//   }
// }

// async function generateStudentId() {
//   const year = new Date().getFullYear();
//   const key = `FSC-${year}`;

//   // Get the latest student ID for the current year
//   const lastStudent = await Student.findOne({
//     student_id: new RegExp(`^FSC-${year}-\\d+$`)
//   })
//     .sort({ student_id: -1 })
//     .select('student_id')
//     .lean();

//   const lastSequence = lastStudent
//     ? parseInt(lastStudent.student_id.split('-').pop(), 10)
//     : 0;

//   // Atomically synchronize the counter
//   await StudentIdCounter.updateOne(
//     { _id: key },
//     { $max: { sequence: lastSequence } },
//     { upsert: true }
//   );

//   // Generate the next unique sequence
//   const counter = await StudentIdCounter.findByIdAndUpdate(
//     key,
//     { $inc: { sequence: 1 } },
//     {
//       returnDocument: 'after',
//       upsert: true,
//       setDefaultsOnInsert: true
//     }
//   );

//   return `FSC-${year}-${String(counter.sequence).padStart(4, '0')}`;
// }

// // ================= CREATE =================
// exports.createStudent = async (data, adminId) => {
//   validateObjectId(adminId, 'creator user ID');

//   const syntheticEmail = `${data.phone}@ims.com`;
//   const existingUser = await User.findOne({ email: syntheticEmail });
//   if (existingUser) throw createError(400, 'A student with this phone number already exists.');

//   await validateAssignments(data.course_id, data.batch_id);

//   const newUser = new User({
//     name: data.full_name,
//     email: syntheticEmail,
//     password: '123456',
//     phone: data.phone,
//     role: 'student',
//     must_change_password: true,
//   });
//   await newUser.save();

//   try {
//     const studentId = await generateStudentId();
//     const student = new Student({
//       ...data,
//       student_id: studentId,
//       email: data.email || null,
//       batch_id: data.batch_id || null,
//       user_id: newUser._id,
//       created_by: adminId,
//     });
//     await student.save();
//     return student;
//   } catch (err) {
//     await User.findByIdAndDelete(newUser._id);
//     throw err;
//   }
// };

// // ================= LIST =================
// exports.getStudents = async (query, user) => {
//   const {
//     page = 1, limit = 10, status, lifecycle_stage, stage_status, courseId, batchId, batch_id
//   } = query;
//   const searchTerm = query.q || query.search;

//   const filter = {};

//   // Exclude students whose TC has been approved
//   const tcApprovedStudentIds = await TcLc.distinct('student_id', {
//     type: 'TC',
//     status: 'approved',
//   });
//   filter._id = { $nin: tcApprovedStudentIds };

//   if (status) filter.status = status;
//   if (lifecycle_stage) filter.lifecycle_stage = lifecycle_stage;
//   if (stage_status) filter.stage_status = stage_status;
//   if (courseId) filter.course_id = courseId;

//   // Handle both batchId and batch_id
//   const actualBatchId = batchId || batch_id;
//   if (actualBatchId) filter.batch_id = actualBatchId;

//   // Faculty can only see students in their assigned batches
//   if (user && user.role === 'faculty') {
//     const assignments = await FacultyAssignment.find({ faculty_id: user.id }).select('batch_id');
//     const allowedBatches = assignments.map(a => a.batch_id);

//     // If faculty passed a specific batch, ensure it's one they teach
//     if (actualBatchId && !allowedBatches.some(id => String(id) === String(actualBatchId))) {
//       throw createError(403, 'You are not assigned to this batch.');
//     }

//     // If no specific batch requested, show only students from batches they teach
//     if (!actualBatchId) {
//       filter.batch_id = { $in: allowedBatches };
//     }
//   }

//   if (searchTerm) {
//     const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
//     filter.$or = [
//       { student_id: { $regex: escaped, $options: 'i' } },
//       { full_name: { $regex: escaped, $options: 'i' } },
//       { email: { $regex: escaped, $options: 'i' } },
//       { phone: { $regex: escaped, $options: 'i' } },
//     ];
//   }

//   const skip = (page - 1) * limit;
//   const [students, total] = await Promise.all([
//     Student.find(filter)
//       .populate('user_id', 'name email phone is_active')
//       .populate('course_id', 'name duration status')
//       .populate('batch_id', 'name start_date end_date status')
//       .populate('created_by', 'name email')
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit),
//     Student.countDocuments(filter),
//   ]);

//   return { students, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
// };

// // ================= GET BY ID =================
// exports.getStudentById = async (id) => {
//   validateObjectId(id);
//   const student = await Student.findById(id)
//     .populate('user_id', 'name email phone is_active')
//     .populate('course_id', 'name duration status')
//     .populate('batch_id', 'name start_date end_date status')
//     .populate('created_by', 'name email');
//   if (!student) throw createError(404, 'Student not found.');
//   return student;
// };

// // ================= SUMMARY =================
// exports.getStudentSummary = async (id) => {
//   validateObjectId(id);
//   const student = await Student.findById(id)
//     .populate('user_id', 'name email phone is_active')
//     .populate('course_id', 'name duration')
//     .populate('batch_id', 'name');
//   if (!student) throw createError(404, 'Student not found.');

//   return {
//     student: {
//       _id: student._id,
//       student_id: student.student_id,
//       full_name: student.full_name,
//       phone: student.phone,
//       email: student.email,
//       course: student.course_id?.name,
//       batch: student.batch_id?.name,
//       lifecycle_stage: student.lifecycle_stage,
//       stage_status: student.stage_status,
//       status: student.status,
//     },
//     fees: { total: 0, paid: 0, pending: 0 },
//     exam_forms: { total: 0, submitted: 0, blocked: 0 },
//     results: { published: 0 },
//     library: { issued: 0, overdue: 0 },
//   };
// };

// // ================= UPDATE =================
// exports.updateStudent = async (id, data) => {
//   validateObjectId(id);

//   const existing = await Student.findById(id);
//   if (!existing) throw createError(404, 'Student not found.');

//   // Prevent bypassing the library return validation through profile update.
//   if (
//     ['left', 'completed'].includes(data.status) &&
//     data.status !== existing.status
//   ) {
//     await validateBooksReturned(id);
//   }

//   const courseId = Object.prototype.hasOwnProperty.call(data, 'course_id')
//     ? data.course_id
//     : existing.course_id.toString();

//   const batchId = Object.prototype.hasOwnProperty.call(data, 'batch_id')
//     ? data.batch_id
//     : existing.batch_id?.toString();

//   await validateAssignments(courseId, batchId);

//   const updateData = { ...data };

//   if (Object.prototype.hasOwnProperty.call(updateData, 'email')) {
//     updateData.email = updateData.email || null;
//   }

//   if (Object.prototype.hasOwnProperty.call(updateData, 'batch_id')) {
//     updateData.batch_id = updateData.batch_id || null;
//   }

//   return Student.findByIdAndUpdate(
//     id,
//     { $set: updateData },
//     { returnDocument: 'after', runValidators: true }
//   )
//     .populate('user_id', 'name email phone is_active')
//     .populate('course_id', 'name duration status')
//     .populate('batch_id', 'name start_date end_date status');
// };

// // ================= ASSIGN COURSE & BATCH =================
// exports.assignCourseAndBatch = async (id, courseId, batchId) => {
//   validateObjectId(id);
//   await validateAssignments(courseId, batchId);

//   const student = await Student.findByIdAndUpdate(
//     id,
//     { course_id: courseId, batch_id: batchId || null },
//     { returnDocument: 'after', runValidators: true }
//   )
//     .populate('course_id', 'name duration')
//     .populate('batch_id', 'name start_date end_date');

//   if (!student) throw createError(404, 'Student not found.');
//   return student;
// };

// // ================= UPDATE STATUS (blocked replaces deactive) =================
// exports.updateStudentStatus = async (id, status) => {
//   validateObjectId(id);

//   const student = await Student.findById(id);
//   if (!student) throw createError(404, 'Student not found.');

//   // 1. Check pending books before changing status
//   if (
//     ['left', 'completed'].includes(status) &&
//     status !== student.status
//   ) {
//     await validateBooksReturned(id);
//   }

//   // 2. Update linked user login status
//   const isUserActive = status === 'active';

//   if (student.user_id) {
//     await User.findByIdAndUpdate(
//       student.user_id,
//       { $set: { is_active: isUserActive } },
//       { returnDocument: 'after', runValidators: true }
//     );
//   }

//   // 3. Update student status
//   student.status = status;
//   await student.save();

//   return student;
// };

// // ================= UPDATE STAGE =================
// exports.updateStudentStage = async (id, data, userId) => {
//   validateObjectId(id);
//   validateObjectId(userId, 'user ID');

//   const student = await Student.findById(id);
//   if (!student) throw createError(404, 'Student not found.');

//   const previousStage = student.lifecycle_stage;
//   student.lifecycle_stage = data.lifecycle_stage;
//   student.stage_status = data.stage_status;
//   await student.save();

//   await StudentStageHistory.create({
//     student_id: student._id,
//     from_stage: previousStage,
//     to_stage: data.lifecycle_stage,
//     stage_status: data.stage_status,
//     changed_by: userId,
//     changed_at: new Date(),
//     remarks: data.remarks || null,
//   });

//   return student;
// };

// // ================= STAGE HISTORY =================
// exports.getStudentStageHistory = async (id) => {
//   validateObjectId(id);
//   const student = await Student.findById(id).select('_id');
//   if (!student) throw createError(404, 'Student not found.');

//   return StudentStageHistory.find({ student_id: id })
//     .populate('changed_by', 'name email')
//     .sort({ changed_at: -1 });
// };


const mongoose = require('mongoose');
const crypto = require('crypto');

const Student = require('../models/Student');
const StudentStageHistory = require('../models/StudentStageHistory');
const StudentIdCounter = require('../models/StudentIdCounter');
const User = require('../../auth/models/User');
const Course = require('../../courses/models/Course');
const Batch = require('../../courses/models/Batch');
const FacultyAssignment = require('../../faculty/models/FacultyAssignment');
const BookIssue = require('../../library/models/BookIssue');
const TcLc = require('../../tclc/models/TcLc');

const Role = require('../../rbac/models/Role');
const StudentFee = require('../../fees/models/StudentFee');
const FeeComponent = require('../../courses/models/FeeComponent');

function createError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function validateObjectId(id, fieldName = 'student ID') {
  if (!mongoose.isValidObjectId(id)) {
    throw createError(400, `Invalid ${fieldName}.`);
  }
}

async function validateAssignments(courseId, batchId) {
  if (!courseId) throw createError(400, 'Course is required.');
  validateObjectId(courseId, 'course ID');

  const course = await Course.findById(courseId);
  if (!course) throw createError(404, 'Course not found.');
  if (course.status !== 'active') {
    throw createError(400, 'Selected course is inactive.');
  }

  if (batchId) {
    validateObjectId(batchId, 'batch ID');

    const batch = await Batch.findById(batchId);
    if (!batch) throw createError(404, 'Batch not found.');
    if (batch.status !== 'active') {
      throw createError(400, 'Selected batch is closed.');
    }

    if (batch.course_id.toString() !== courseId.toString()) {
      throw createError(
        400,
        'Selected batch does not belong to the selected course.'
      );
    }
  }
}

// Check whether all library books issued to a student have been returned.
async function validateBooksReturned(studentId) {
  const pendingIssues = await BookIssue.find({
    student: studentId,
    status: { $in: ['issued', 'overdue'] },
  })
    .populate('book', 'title bookTitle name')
    .lean();

  if (pendingIssues.length > 0) {
    const bookDetails = pendingIssues.map((issue) => {
      const bookName =
        issue.book?.title ||
        issue.book?.bookTitle ||
        issue.book?.name ||
        'Unknown book';

      return bookName;
    });

    throw createError(
      400,
      `Cannot change student status. ${pendingIssues.length} book(s) are still not returned: ${bookDetails.join(', ')}. Please return all issued books first.`
    );
  }
}

// ================= STUDENT ID GENERATION =================
// Shared by regular student creation and direct admission.
async function generateStudentId() {
  const year = new Date().getFullYear();
  const key = `FSC-${year}`;

  // Find the latest student ID already present in the database.
  const lastStudent = await Student.findOne({
    student_id: new RegExp(`^FSC-${year}-\\d+$`),
  })
    .sort({ student_id: -1 })
    .select('student_id')
    .lean();

  const lastSequence = lastStudent
    ? parseInt(lastStudent.student_id.split('-').pop(), 10)
    : 0;

  // Synchronize the counter with existing student records.
  await StudentIdCounter.updateOne(
    { _id: key },
    { $max: { sequence: lastSequence } },
    { upsert: true }
  );

  // Atomically generate the next student ID.
  const counter = await StudentIdCounter.findByIdAndUpdate(
    key,
    { $inc: { sequence: 1 } },
    {
      returnDocument: 'after',
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  const studentId = `FSC-${year}-${String(counter.sequence).padStart(4, '0')}`;

  // Protect against an ID that already exists.
  const existingStudent = await Student.findOne({
    student_id: studentId,
  }).select('_id');

  if (existingStudent) {
    await StudentIdCounter.updateOne(
      { _id: key },
      { $max: { sequence: counter.sequence } },
      { upsert: true }
    );

    return generateStudentId();
  }

  return studentId;
}

// ================= CREATE =================
exports.createStudent = async (data, adminId) => {
  validateObjectId(adminId, 'creator user ID');

  const syntheticEmail = `${data.phone}@ims.com`;

  const existingUser = await User.findOne({
    email: syntheticEmail,
  });

  if (existingUser) {
    throw createError(
      400,
      'A student with this phone number already exists.'
    );
  }

  await validateAssignments(data.course_id, data.batch_id);

  const newUser = new User({
    name: data.full_name,
    email: syntheticEmail,
    password: '123456',
    phone: data.phone,
    role: 'student',
    must_change_password: true,
  });

  await newUser.save();

  try {
    const studentId = await generateStudentId();

    const student = new Student({
      ...data,
      student_id: studentId,
      email: data.email || null,
      batch_id: data.batch_id || null,
      user_id: newUser._id,
      created_by: adminId,
    });

    await student.save();

    return student;
  } catch (err) {
    await User.findByIdAndDelete(newUser._id);
    throw err;
  }
};

// ================= LIST =================
exports.getStudents = async (query, user) => {
  const {
    page = 1,
    limit = 10,
    status,
    lifecycle_stage,
    stage_status,
    courseId,
    batchId,
    batch_id,
  } = query;

  const searchTerm = query.q || query.search;

  const filter = {};

  // Exclude students whose TC has been approved.
  const tcApprovedStudentIds = await TcLc.distinct('student_id', {
    type: 'TC',
    status: 'approved',
  });

  filter._id = { $nin: tcApprovedStudentIds };

  if (status) filter.status = status;
  if (lifecycle_stage) filter.lifecycle_stage = lifecycle_stage;
  if (stage_status) filter.stage_status = stage_status;
  if (courseId) filter.course_id = courseId;

  // Handle both batchId and batch_id.
  const actualBatchId = batchId || batch_id;

  if (actualBatchId) {
    filter.batch_id = actualBatchId;
  }

  // Faculty can only see students in their assigned batches.
  if (user && user.role === 'faculty') {
    const assignments = await FacultyAssignment.find({
      faculty_id: user.id,
    }).select('batch_id');

    const allowedBatches = assignments.map((a) => a.batch_id);

    if (
      actualBatchId &&
      !allowedBatches.some((id) => String(id) === String(actualBatchId))
    ) {
      throw createError(403, 'You are not assigned to this batch.');
    }

    if (!actualBatchId) {
      filter.batch_id = { $in: allowedBatches };
    }
  }

  if (searchTerm) {
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    filter.$or = [
      { student_id: { $regex: escaped, $options: 'i' } },
      { full_name: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
      { phone: { $regex: escaped, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [students, total] = await Promise.all([
    Student.find(filter)
      .populate('user_id', 'name email phone is_active')
      .populate('course_id', 'name duration status')
      .populate('batch_id', 'name start_date end_date status')
      .populate('created_by', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Student.countDocuments(filter),
  ]);

  return {
    students,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ================= GET BY ID =================
exports.getStudentById = async (id) => {
  validateObjectId(id);

  const student = await Student.findById(id)
    .populate('user_id', 'name email phone is_active')
    .populate('course_id', 'name duration status')
    .populate('batch_id', 'name start_date end_date status')
    .populate('created_by', 'name email');

  if (!student) throw createError(404, 'Student not found.');

  return student;
};

// ================= SUMMARY =================
exports.getStudentSummary = async (id) => {
  validateObjectId(id);

  const student = await Student.findById(id)
    .populate('user_id', 'name email phone is_active')
    .populate('course_id', 'name duration')
    .populate('batch_id', 'name');

  if (!student) throw createError(404, 'Student not found.');

  return {
    student: {
      _id: student._id,
      student_id: student.student_id,
      full_name: student.full_name,
      phone: student.phone,
      email: student.email,
      course: student.course_id?.name,
      batch: student.batch_id?.name,
      lifecycle_stage: student.lifecycle_stage,
      stage_status: student.stage_status,
      status: student.status,
    },
    fees: { total: 0, paid: 0, pending: 0 },
    exam_forms: { total: 0, submitted: 0, blocked: 0 },
    results: { published: 0 },
    library: { issued: 0, overdue: 0 },
  };
};

// ================= UPDATE =================
exports.updateStudent = async (id, data) => {
  validateObjectId(id);

  const existing = await Student.findById(id);

  if (!existing) throw createError(404, 'Student not found.');

  // Prevent bypassing library return validation through profile update.
  if (
    ['left', 'completed'].includes(data.status) &&
    data.status !== existing.status
  ) {
    await validateBooksReturned(id);
  }

  const courseId = Object.prototype.hasOwnProperty.call(data, 'course_id')
    ? data.course_id
    : existing.course_id.toString();

  const batchId = Object.prototype.hasOwnProperty.call(data, 'batch_id')
    ? data.batch_id
    : existing.batch_id?.toString();

  await validateAssignments(courseId, batchId);

  const updateData = { ...data };

  if (Object.prototype.hasOwnProperty.call(updateData, 'email')) {
    updateData.email = updateData.email || null;
  }

  if (Object.prototype.hasOwnProperty.call(updateData, 'batch_id')) {
    updateData.batch_id = updateData.batch_id || null;
  }

  return Student.findByIdAndUpdate(
    id,
    { $set: updateData },
    { returnDocument: 'after', runValidators: true }
  )
    .populate('user_id', 'name email phone is_active')
    .populate('course_id', 'name duration status')
    .populate('batch_id', 'name start_date end_date status');
};

// ================= ASSIGN COURSE & BATCH =================
exports.assignCourseAndBatch = async (id, courseId, batchId) => {
  validateObjectId(id);

  await validateAssignments(courseId, batchId);

  const student = await Student.findByIdAndUpdate(
    id,
    {
      course_id: courseId,
      batch_id: batchId || null,
    },
    { returnDocument: 'after', runValidators: true }
  )
    .populate('course_id', 'name duration')
    .populate('batch_id', 'name start_date end_date');

  if (!student) throw createError(404, 'Student not found.');

  return student;
};

// ================= UPDATE STATUS =================
exports.updateStudentStatus = async (id, status) => {
  validateObjectId(id);

  const student = await Student.findById(id);

  if (!student) throw createError(404, 'Student not found.');

  // Check pending books before changing status.
  if (
    ['left', 'completed'].includes(status) &&
    status !== student.status
  ) {
    await validateBooksReturned(id);
  }

  // Update linked user login status.
  const isUserActive = status === 'active';

  if (student.user_id) {
    await User.findByIdAndUpdate(
      student.user_id,
      { $set: { is_active: isUserActive } },
      { returnDocument: 'after', runValidators: true }
    );
  }

  // Update student status.
  student.status = status;
  await student.save();

  return student;
};

// ================= UPDATE STAGE =================
exports.updateStudentStage = async (id, data, userId) => {
  validateObjectId(id);
  validateObjectId(userId, 'user ID');

  const student = await Student.findById(id);

  if (!student) throw createError(404, 'Student not found.');

  const previousStage = student.lifecycle_stage;

  student.lifecycle_stage = data.lifecycle_stage;
  student.stage_status = data.stage_status;

  await student.save();

  await StudentStageHistory.create({
    student_id: student._id,
    from_stage: previousStage,
    to_stage: data.lifecycle_stage,
    stage_status: data.stage_status,
    changed_by: userId,
    changed_at: new Date(),
    remarks: data.remarks || null,
  });

  return student;
};

// ================= STAGE HISTORY =================
exports.getStudentStageHistory = async (id) => {
  validateObjectId(id);

  const student = await Student.findById(id).select('_id');

  if (!student) throw createError(404, 'Student not found.');

  return StudentStageHistory.find({ student_id: id })
    .populate('changed_by', 'name email')
    .sort({ changed_at: -1 });
};

// ================= DIRECT ADMISSION =================
exports.createDirectAdmission = async (data, staffUserId) => {
  validateObjectId(staffUserId, 'staff user ID');

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw createError(400, 'Invalid admission data.');
  }

  if (!data.course_id || !mongoose.isValidObjectId(data.course_id)) {
    throw createError(400, 'Please select a valid course.');
  }

  const course = await Course.findById(data.course_id);

  if (!course || course.status !== 'active') {
    throw createError(400, 'Selected course is not available.');
  }

  const feeComponents = await FeeComponent.find({
    course_id: course._id,
    status: 'active',
  });

  if (!feeComponents.length) {
    throw createError(
      400,
      'No active fee components are configured for this course.'
    );
  }

  const studentRole = await Role.findOne({ name: 'student' });

  if (!studentRole) {
    throw createError(
      500,
      'System error: Student role not found in database.'
    );
  }

  const form = data.admission_form || {};

  const fullName = String(data.full_name || '').trim();

  const phone = String(
    data.phone || form.contact_details?.mobile_no || ''
  ).trim();

  const dob = data.dob;

  const address = String(
    data.address ||
    form.postal_address?.address ||
    form.permanent_address?.address ||
    ''
  ).trim();

  const qualification = String(
    data.qualification ||
    form.academic_qualification?.[0]?.examination_passed ||
    ''
  ).trim();

  const aadhaar = String(form.aadhaar_number || '').trim();

  if (!fullName) throw createError(400, 'Student name is required.');
  if (!phone) throw createError(400, 'Student mobile number is required.');
  if (!dob) throw createError(400, 'Date of birth is required.');
  if (!address) throw createError(400, 'Student address is required.');
  if (!qualification) {
    throw createError(400, 'Student qualification is required.');
  }

  if (new Date(dob) >= new Date()) {
    throw createError(400, 'Date of birth must be in the past.');
  }

  if (aadhaar && !/^[0-9]{12}$/.test(aadhaar)) {
    throw createError(
      400,
      'Aadhaar number must contain exactly 12 digits.'
    );
  }

  const syntheticEmail = `${phone}@ims.com`;

  const existingUser = await User.findOne({
    email: syntheticEmail,
  });

  if (existingUser) {
    throw createError(
      409,
      'A student with this phone number already exists.'
    );
  }

  const temporaryPassword = crypto.randomBytes(12).toString('base64url');

  let user;
  let student;

  try {
    // 1. Create student login account.
    user = await User.create({
      name: fullName,
      email: syntheticEmail,
      phone,
      password: temporaryPassword,
      role: studentRole._id,
      is_active: true,
      must_change_password: true,
    });

    // 2. Generate student ID using the shared counter.
    const studentId = await generateStudentId();

    // 3. Create student profile.
    student = await Student.create({
      student_id: studentId,
      user_id: user._id,
      full_name: fullName,
      dob,
      phone,
      email: data.email || null,
      address,
      guardian_name: form.fathers_name || data.guardian_name || null,
      guardian_phone:
        data.guardian_phone ||
        form.contact_details?.home_mobile_no ||
        null,
      qualification,
      course_id: course._id,
      batch_id: null,
      source_enquiry_id: null,
      admission_form: {
        ...form,
        aadhaar_number: aadhaar || null,
      },
      lifecycle_stage: 'admission',
      stage_status: 'pending',
      status: 'active',
      admitted_on: new Date(),
      created_by: staffUserId,
    });

    // 4. Generate student fee records.
    const feeRecords = feeComponents.map((component) => ({
      student_id: student._id,
      course_id: course._id,
      fee_component_id: component._id,
      fee_name: component.name,
      amount_due: component.amount,
      amount_paid: 0,
      due_date: null,
      required_for_exam: component.required_for_exam,
      status: 'pending',
    }));

    await StudentFee.insertMany(feeRecords);

    // 5. Create initial stage history.
    await StudentStageHistory.create({
      student_id: student._id,
      from_stage: null,
      to_stage: 'admission',
      stage_status: 'pending',
      changed_by: staffUserId,
      changed_at: new Date(),
      remarks: 'Direct admission without enquiry.',
    });
  } catch (error) {
    // Roll back records created during direct admission.
    if (student?._id) {
      await StudentFee.deleteMany({
        student_id: student._id,
      }).catch(() => {});

      await StudentStageHistory.deleteMany({
        student_id: student._id,
      }).catch(() => {});

      await Student.findByIdAndDelete(student._id).catch(() => {});
    }

    if (user?._id) {
      await User.findByIdAndDelete(user._id).catch(() => {});
    }

    throw error;
  }

  return {
    student: {
      id: student._id,
      student_id: student.student_id,
      full_name: student.full_name,
      email: student.email,
      course_id: student.course_id,
      lifecycle_stage: student.lifecycle_stage,
      source_enquiry_id: null,
    },
    account: {
      email: syntheticEmail,
      phone,
      temporary_password: temporaryPassword,
      must_change_password: true,
    },
    fees_generated: feeComponents.length,
  };
};