// const mongoose = require('mongoose');
// const crypto = require('crypto');

// const Student = require('../models/Student');
// const StudentStageHistory = require('../models/StudentStageHistory');
// const StudentIdCounter = require('../models/StudentIdCounter');
// const User = require('../../auth/models/User');
// const Course = require('../../courses/models/Course');
// const Batch = require('../../courses/models/Batch');
// const FacultyAssignment = require('../../faculty/models/FacultyAssignment');
// const BookIssue = require('../../library/models/BookIssue');
// const TcLc = require('../../tclc/models/TcLc');
// const Role = require('../../rbac/models/Role');
// const StudentFee = require('../../fees/models/StudentFee');
// const FeeComponent = require('../../courses/models/FeeComponent');
// const auditService = require('../../audit/services/auditService'); // 🚨 ADDED

// function createError(statusCode, message) {
//   const err = new Error(message);
//   err.statusCode = statusCode;
//   return err;
// }

// function validateObjectId(id, fieldName = 'student ID') {
//   if (!mongoose.isValidObjectId(id)) {
//     throw createError(400, `Invalid ${fieldName}.`);
//   }
// }

// async function validateAssignments(courseId, batchId) {
//   if (!courseId) throw createError(400, 'Course is required.');
//   validateObjectId(courseId, 'course ID');

//   const course = await Course.findById(courseId);
//   if (!course) throw createError(404, 'Course not found.');
//   if (course.status !== 'active') {
//     throw createError(400, 'Selected course is inactive.');
//   }

//   if (batchId) {
//     validateObjectId(batchId, 'batch ID');

//     const batch = await Batch.findById(batchId);
//     if (!batch) throw createError(404, 'Batch not found.');
//     if (batch.status !== 'active') {
//       throw createError(400, 'Selected batch is closed.');
//     }

//     if (batch.course_id.toString() !== courseId.toString()) {
//       throw createError(
//         400,
//         'Selected batch does not belong to the selected course.'
//       );
//     }
//   }
// }

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

//   const lastStudent = await Student.findOne({
//     student_id: new RegExp(`^FSC-${year}-\\d+$`),
//   })
//     .sort({ student_id: -1 })
//     .select('student_id')
//     .lean();

//   const lastSequence = lastStudent
//     ? parseInt(lastStudent.student_id.split('-').pop(), 10)
//     : 0;

//   await StudentIdCounter.updateOne(
//     { _id: key },
//     { $max: { sequence: lastSequence } },
//     { upsert: true }
//   );

//   const counter = await StudentIdCounter.findByIdAndUpdate(
//     key,
//     { $inc: { sequence: 1 } },
//     {
//       returnDocument: 'after',
//       upsert: true,
//       setDefaultsOnInsert: true,
//     }
//   );

//   const studentId = `FSC-${year}-${String(counter.sequence).padStart(4, '0')}`;

//   const existingStudent = await Student.findOne({
//     student_id: studentId,
//   }).select('_id');

//   if (existingStudent) {
//     await StudentIdCounter.updateOne(
//       { _id: key },
//       { $max: { sequence: counter.sequence } },
//       { upsert: true }
//     );

//     return generateStudentId();
//   }

//   return studentId;
// }

// // ================= CREATE =================
// exports.createStudent = async (data, adminId, ip = null) => { // 🚨 ADDED ip
//   validateObjectId(adminId, 'creator user ID');

//   const syntheticEmail = `${data.phone}@ims.com`;

//   const existingUser = await User.findOne({
//     email: syntheticEmail,
//   });

//   if (existingUser) {
//     throw createError(
//       400,
//       'A student with this phone number already exists.'
//     );
//   }

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

//     // 🚨 AUDIT LOG
//     await auditService.logAction({
//       userId: adminId,
//       action: 'CREATE_STUDENT',
//       entity: 'Student',
//       entityId: student._id,
//       oldValues: null,
//       newValues: {
//         student_id: student.student_id,
//         full_name: student.full_name,
//         phone: student.phone,
//         course_id: student.course_id,
//       },
//       ip,
//     });

//     return student;
//   } catch (err) {
//     await User.findByIdAndDelete(newUser._id);
//     throw err;
//   }
// };

// // ================= LIST =================
// exports.getStudents = async (query, user) => {
//   const {
//     page = 1,
//     limit = 10,
//     status,
//     lifecycle_stage,
//     stage_status,
//     courseId,
//     batchId,
//     batch_id,
//   } = query;

//   const searchTerm = query.q || query.search;

//   const filter = {};

//   const tcApprovedStudentIds = await TcLc.distinct('student_id', {
//     type: 'TC',
//     status: 'approved',
//   });

//   filter._id = { $nin: tcApprovedStudentIds };

//   if (status) filter.status = status;
//   if (lifecycle_stage) filter.lifecycle_stage = lifecycle_stage;
//   if (stage_status) filter.stage_status = stage_status;
//   if (courseId) filter.course_id = courseId;

//   const actualBatchId = batchId || batch_id;

//   if (actualBatchId) {
//     filter.batch_id = actualBatchId;
//   }

//   if (user && user.role === 'faculty') {
//     const assignments = await FacultyAssignment.find({
//       faculty_id: user.id,
//     }).select('batch_id');

//     const allowedBatches = assignments.map((a) => a.batch_id);

//     if (
//       actualBatchId &&
//       !allowedBatches.some((id) => String(id) === String(actualBatchId))
//     ) {
//       throw createError(403, 'You are not assigned to this batch.');
//     }

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

//   return {
//     students,
//     meta: {
//       page,
//       limit,
//       total,
//       totalPages: Math.ceil(total / limit),
//     },
//   };
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
// exports.updateStudent = async (id, data, adminId = null, ip = null) => { // 🚨 ADDED params
//   validateObjectId(id);

//   const existing = await Student.findById(id);

//   if (!existing) throw createError(404, 'Student not found.');

//   // 🚨 Capture old values
//   const oldValues = existing.toObject();

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

//   const updated = await Student.findByIdAndUpdate(
//     id,
//     { $set: updateData },
//     { returnDocument: 'after', runValidators: true }
//   )
//     .populate('user_id', 'name email phone is_active')
//     .populate('course_id', 'name duration status')
//     .populate('batch_id', 'name start_date end_date status');

//   // 🚨 AUDIT LOG
//   await auditService.logAction({
//     userId: adminId,
//     action: 'UPDATE_STUDENT',
//     entity: 'Student',
//     entityId: id,
//     oldValues,
//     newValues: updated.toObject(),
//     ip,
//   });

//   return updated;
// };

// // ================= ASSIGN COURSE & BATCH =================
// exports.assignCourseAndBatch = async (id, courseId, batchId, adminId = null, ip = null) => { // 🚨 ADDED params
//   validateObjectId(id);

//   await validateAssignments(courseId, batchId);

//   const existing = await Student.findById(id);
//   if (!existing) throw createError(404, 'Student not found.');

//   // 🚨 Capture old values
//   const oldValues = {
//     course_id: existing.course_id,
//     batch_id: existing.batch_id,
//   };

//   const student = await Student.findByIdAndUpdate(
//     id,
//     {
//       course_id: courseId,
//       batch_id: batchId || null,
//     },
//     { returnDocument: 'after', runValidators: true }
//   )
//     .populate('course_id', 'name duration')
//     .populate('batch_id', 'name start_date end_date');

//   // 🚨 AUDIT LOG
//   await auditService.logAction({
//     userId: adminId,
//     action: 'ASSIGN_COURSE_BATCH',
//     entity: 'Student',
//     entityId: id,
//     oldValues,
//     newValues: { course_id: courseId, batch_id: batchId || null },
//     ip,
//   });

//   return student;
// };

// // ================= UPDATE STATUS =================
// exports.updateStudentStatus = async (id, status, adminId = null, ip = null) => { // 🚨 ADDED params
//   validateObjectId(id);

//   const student = await Student.findById(id);

//   if (!student) throw createError(404, 'Student not found.');

//   if (
//     ['left', 'completed'].includes(status) &&
//     status !== student.status
//   ) {
//     await validateBooksReturned(id);
//   }

//   const isUserActive = status === 'active';

//   if (student.user_id) {
//     await User.findByIdAndUpdate(
//       student.user_id,
//       { $set: { is_active: isUserActive } },
//       { returnDocument: 'after', runValidators: true }
//     );
//   }

//   // 🚨 Capture old status
//   const oldStatus = student.status;

//   student.status = status;
//   await student.save();

//   // 🚨 AUDIT LOG
//   await auditService.logAction({
//     userId: adminId,
//     action: 'UPDATE_STUDENT_STATUS',
//     entity: 'Student',
//     entityId: id,
//     oldValues: { status: oldStatus },
//     newValues: { status },
//     ip,
//   });

//   return student;
// };

// // ================= UPDATE STAGE =================
// exports.updateStudentStage = async (id, data, userId, ip = null) => { // 🚨 ADDED ip
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

//   // 🚨 AUDIT LOG
//   await auditService.logAction({
//     userId,
//     action: 'UPDATE_STUDENT_STAGE',
//     entity: 'Student',
//     entityId: id,
//     oldValues: { lifecycle_stage: previousStage },
//     newValues: {
//       lifecycle_stage: data.lifecycle_stage,
//       stage_status: data.stage_status,
//     },
//     ip,
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

// // ================= DIRECT ADMISSION =================
// exports.createDirectAdmission = async (data, staffUserId, ip = null) => { // 🚨 ADDED ip
//   validateObjectId(staffUserId, 'staff user ID');

//   if (!data || typeof data !== 'object' || Array.isArray(data)) {
//     throw createError(400, 'Invalid admission data.');
//   }

//   if (!data.course_id || !mongoose.isValidObjectId(data.course_id)) {
//     throw createError(400, 'Please select a valid course.');
//   }

//   const course = await Course.findById(data.course_id);

//   if (!course || course.status !== 'active') {
//     throw createError(400, 'Selected course is not available.');
//   }

//   const feeComponents = await FeeComponent.find({
//     course_id: course._id,
//     status: 'active',
//   });

//   if (!feeComponents.length) {
//     throw createError(
//       400,
//       'No active fee components are configured for this course.'
//     );
//   }

//   const studentRole = await Role.findOne({ name: 'student' });

//   if (!studentRole) {
//     throw createError(
//       500,
//       'System error: Student role not found in database.'
//     );
//   }

//   const form = data.admission_form || {};

//   const fullName = String(data.full_name || '').trim();

//   const phone = String(
//     data.phone || form.contact_details?.mobile_no || ''
//   ).trim();

//   const dob = data.dob;

//   const address = String(
//     data.address ||
//     form.postal_address?.address ||
//     form.permanent_address?.address ||
//     ''
//   ).trim();

//   const qualification = String(
//     data.qualification ||
//     form.academic_qualification?.[0]?.examination_passed ||
//     ''
//   ).trim();

//   const aadhaar = String(form.aadhaar_number || '').trim();

//   if (!fullName) throw createError(400, 'Student name is required.');
//   if (!phone) throw createError(400, 'Student mobile number is required.');
//   if (!dob) throw createError(400, 'Date of birth is required.');
//   if (!address) throw createError(400, 'Student address is required.');
//   if (!qualification) {
//     throw createError(400, 'Student qualification is required.');
//   }

//   if (new Date(dob) >= new Date()) {
//     throw createError(400, 'Date of birth must be in the past.');
//   }

//   if (aadhaar && !/^[0-9]{12}$/.test(aadhaar)) {
//     throw createError(
//       400,
//       'Aadhaar number must contain exactly 12 digits.'
//     );
//   }

//   const syntheticEmail = `${phone}@ims.com`;

//   const existingUser = await User.findOne({
//     email: syntheticEmail,
//   });

//   if (existingUser) {
//     throw createError(
//       409,
//       'A student with this phone number already exists.'
//     );
//   }

//   const temporaryPassword = crypto.randomBytes(12).toString('base64url');

//   let user;
//   let student;

//   try {
//     user = await User.create({
//       name: fullName,
//       email: syntheticEmail,
//       phone,
//       password: temporaryPassword,
//       role: studentRole._id,
//       is_active: true,
//       must_change_password: true,
//     });

//     const studentId = await generateStudentId();

//     student = await Student.create({
//       student_id: studentId,
//       user_id: user._id,
//       full_name: fullName,
//       dob,
//       phone,
//       email: data.email || null,
//       address,
//       guardian_name: form.fathers_name || data.guardian_name || null,
//       guardian_phone:
//         data.guardian_phone ||
//         form.contact_details?.home_mobile_no ||
//         null,
//       qualification,
//       course_id: course._id,
//       batch_id: null,
//       source_enquiry_id: null,
//       admission_form: {
//         ...form,
//         aadhaar_number: aadhaar || null,
//       },
//       lifecycle_stage: 'admission',
//       stage_status: 'pending',
//       status: 'active',
//       admitted_on: new Date(),
//       created_by: staffUserId,
//     });

//     const feeRecords = feeComponents.map((component) => ({
//       student_id: student._id,
//       course_id: course._id,
//       fee_component_id: component._id,
//       fee_name: component.name,
//       amount_due: component.amount,
//       amount_paid: 0,
//       due_date: null,
//       required_for_exam: component.required_for_exam,
//       status: 'pending',
//     }));

//     await StudentFee.insertMany(feeRecords);

//     await StudentStageHistory.create({
//       student_id: student._id,
//       from_stage: null,
//       to_stage: 'admission',
//       stage_status: 'pending',
//       changed_by: staffUserId,
//       changed_at: new Date(),
//       remarks: 'Direct admission without enquiry.',
//     });

//     // 🚨 AUDIT LOG
//     await auditService.logAction({
//       userId: staffUserId,
//       action: 'DIRECT_ADMISSION',
//       entity: 'Student',
//       entityId: student._id,
//       oldValues: null,
//       newValues: {
//         student_id: student.student_id,
//         full_name: fullName,
//         course_id: course._id,
//         fees_generated: feeComponents.length,
//       },
//       ip,
//     });
//   } catch (error) {
//     if (student?._id) {
//       await StudentFee.deleteMany({
//         student_id: student._id,
//       }).catch(() => {});

//       await StudentStageHistory.deleteMany({
//         student_id: student._id,
//       }).catch(() => {});

//       await Student.findByIdAndDelete(student._id).catch(() => {});
//     }

//     if (user?._id) {
//       await User.findByIdAndDelete(user._id).catch(() => {});
//     }

//     throw error;
//   }

//   return {
//     student: {
//       id: student._id,
//       student_id: student.student_id,
//       full_name: student.full_name,
//       email: student.email,
//       course_id: student.course_id,
//       lifecycle_stage: student.lifecycle_stage,
//       source_enquiry_id: null,
//     },
//     account: {
//       email: syntheticEmail,
//       phone,
//       temporary_password: temporaryPassword,
//       must_change_password: true,
//     },
//     fees_generated: feeComponents.length,
//   };
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
const ConcessionMaster = require('../../fees/models/ConcessionMaster'); // 🚨 NEW
const auditService = require('../../audit/services/auditService');

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

async function generateStudentId() {
  const year = new Date().getFullYear();
  const key = `FSC-${year}`;

  const lastStudent = await Student.findOne({
    student_id: new RegExp(`^FSC-${year}-\\d+$`),
  })
    .sort({ student_id: -1 })
    .select('student_id')
    .lean();

  const lastSequence = lastStudent
    ? parseInt(lastStudent.student_id.split('-').pop(), 10)
    : 0;

  await StudentIdCounter.updateOne(
    { _id: key },
    { $max: { sequence: lastSequence } },
    { upsert: true }
  );

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

// ============================================================
// 🚨 NEW HELPERS — fee generation for admission
// ============================================================

const round2 = (n) => Math.round(n * 100) / 100;

const computeConcessionAmount = (baseAmount, concession, feeComponentId) => {
  if (!concession) return 0;
  const applicable =
    concession.applicable_to === 'all_fees' ||
    (Array.isArray(concession.specific_fee_ids) &&
      concession.specific_fee_ids.some(
        (id) => String(id) === String(feeComponentId)
      ));
  if (!applicable) return 0;
  return concession.type === 'percentage'
    ? round2((baseAmount * concession.value) / 100)
    : round2(Math.min(concession.value, baseAmount));
};

/**
 * Build StudentFee rows for a new admission.
 * - one_time    → 1 row per fee component using one_time_amount
 * - installments → N rows per fee component using the chosen plan
 * - concession is distributed proportionally across all rows
 */
const buildAdmissionFeeRows = ({
  studentId,
  courseId,
  feeComponents,
  paymentPlan,
  chosenPlanId,
  concession,
}) => {
  const rows = [];
  const today = new Date();

  for (const comp of feeComponents) {
    if (paymentPlan === 'one_time') {
      const baseAmount = Number(comp.one_time_amount);
      const concessionAmount = computeConcessionAmount(
        baseAmount,
        concession,
        comp._id
      );
      const net = round2(baseAmount - concessionAmount);

      rows.push({
        student_id: studentId,
        course_id: courseId,
        fee_component_id: comp._id,
        fee_name: comp.name,
        original_amount: baseAmount,
        concession_id: concession ? concession._id : null,
        concession_amount: concessionAmount,
        concession_reason: concession ? concession.name : null,
        amount_due: net,
        amount_paid: 0,
        installment_number: 1,
        total_installments: 1,
        due_date: today,
        required_for_exam: comp.required_for_exam,
        status: 'pending',
      });
      continue;
    }

    // ===== installments =====
    const plan = (comp.installment_plans || []).find(
      (p) => String(p._id) === String(chosenPlanId)
    );
    if (!plan) continue;

    const baseTotal = Number(plan.total_amount);
    const concessionAmount = computeConcessionAmount(
      baseTotal,
      concession,
      comp._id
    );
    const netTotal = round2(baseTotal - concessionAmount);

    const baseAmounts = plan.installment_amounts.map((a) => Number(a));
    const baseSum = baseAmounts.reduce((s, a) => s + a, 0);
    if (baseSum <= 0) continue;

    const netAmounts = baseAmounts.map((a) =>
      round2((a / baseSum) * netTotal)
    );
    // Fix rounding remainder on the last row
    const netSum = netAmounts.reduce((s, a) => s + a, 0);
    netAmounts[netAmounts.length - 1] = round2(
      netAmounts[netAmounts.length - 1] + (netTotal - netSum)
    );

    plan.installment_amounts.forEach((_, idx) => {
      const daysOffset = Number(
        plan.due_days_from_start?.[idx] ?? idx * 30
      );
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + daysOffset);

      rows.push({
        student_id: studentId,
        course_id: courseId,
        fee_component_id: comp._id,
        fee_name: comp.name,
        original_amount: idx === 0 ? baseTotal : 0,
        concession_id: idx === 0 && concession ? concession._id : null,
        concession_amount: idx === 0 ? concessionAmount : 0,
        concession_reason:
          idx === 0 && concession ? concession.name : null,
        amount_due: netAmounts[idx],
        amount_paid: 0,
        installment_number: idx + 1,
        total_installments: plan.number_of_installments,
        due_date: dueDate,
        required_for_exam: comp.required_for_exam,
        status: 'pending',
      });
    });
  }

  return rows;
};

// ================= CREATE =================
exports.createStudent = async (data, adminId, ip = null) => {
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

    await auditService.logAction({
      userId: adminId,
      action: 'CREATE_STUDENT',
      entity: 'Student',
      entityId: student._id,
      oldValues: null,
      newValues: {
        student_id: student.student_id,
        full_name: student.full_name,
        phone: student.phone,
        course_id: student.course_id,
      },
      ip,
    });

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

  const tcApprovedStudentIds = await TcLc.distinct('student_id', {
    type: 'TC',
    status: 'approved',
  });

  filter._id = { $nin: tcApprovedStudentIds };

  if (status) filter.status = status;
  if (lifecycle_stage) filter.lifecycle_stage = lifecycle_stage;
  if (stage_status) filter.stage_status = stage_status;
  if (courseId) filter.course_id = courseId;

  const actualBatchId = batchId || batch_id;

  if (actualBatchId) {
    filter.batch_id = actualBatchId;
  }

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
exports.updateStudent = async (id, data, adminId = null, ip = null) => {
  validateObjectId(id);

  const existing = await Student.findById(id);

  if (!existing) throw createError(404, 'Student not found.');

  const oldValues = existing.toObject();

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

  const updated = await Student.findByIdAndUpdate(
    id,
    { $set: updateData },
    { returnDocument: 'after', runValidators: true }
  )
    .populate('user_id', 'name email phone is_active')
    .populate('course_id', 'name duration status')
    .populate('batch_id', 'name start_date end_date status');

  await auditService.logAction({
    userId: adminId,
    action: 'UPDATE_STUDENT',
    entity: 'Student',
    entityId: id,
    oldValues,
    newValues: updated.toObject(),
    ip,
  });

  return updated;
};

// ================= ASSIGN COURSE & BATCH =================
exports.assignCourseAndBatch = async (id, courseId, batchId, adminId = null, ip = null) => {
  validateObjectId(id);

  await validateAssignments(courseId, batchId);

  const existing = await Student.findById(id);
  if (!existing) throw createError(404, 'Student not found.');

  const oldValues = {
    course_id: existing.course_id,
    batch_id: existing.batch_id,
  };

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

  await auditService.logAction({
    userId: adminId,
    action: 'ASSIGN_COURSE_BATCH',
    entity: 'Student',
    entityId: id,
    oldValues,
    newValues: { course_id: courseId, batch_id: batchId || null },
    ip,
  });

  return student;
};

// ================= UPDATE STATUS =================
exports.updateStudentStatus = async (id, status, adminId = null, ip = null) => {
  validateObjectId(id);

  const student = await Student.findById(id);

  if (!student) throw createError(404, 'Student not found.');

  if (
    ['left', 'completed'].includes(status) &&
    status !== student.status
  ) {
    await validateBooksReturned(id);
  }

  const isUserActive = status === 'active';

  if (student.user_id) {
    await User.findByIdAndUpdate(
      student.user_id,
      { $set: { is_active: isUserActive } },
      { returnDocument: 'after', runValidators: true }
    );
  }

  const oldStatus = student.status;

  student.status = status;
  await student.save();

  await auditService.logAction({
    userId: adminId,
    action: 'UPDATE_STUDENT_STATUS',
    entity: 'Student',
    entityId: id,
    oldValues: { status: oldStatus },
    newValues: { status },
    ip,
  });

  return student;
};

// ================= UPDATE STAGE =================
exports.updateStudentStage = async (id, data, userId, ip = null) => {
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

  await auditService.logAction({
    userId,
    action: 'UPDATE_STUDENT_STAGE',
    entity: 'Student',
    entityId: id,
    oldValues: { lifecycle_stage: previousStage },
    newValues: {
      lifecycle_stage: data.lifecycle_stage,
      stage_status: data.stage_status,
    },
    ip,
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

// ================= DIRECT ADMISSION (UPDATED) =================
exports.createDirectAdmission = async (data, staffUserId, ip = null) => {
  validateObjectId(staffUserId, 'staff user ID');

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw createError(400, 'Invalid admission data.');
  }

  const {
    course_id,
    admission_type = 'new',
    payment_plan = 'one_time',
    chosen_installment_plan_id,
    concession_id,
    group_enquiry_ids = [],
  } = data;

  if (!course_id || !mongoose.isValidObjectId(course_id)) {
    throw createError(400, 'Please select a valid course.');
  }

  const course = await Course.findById(course_id);

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

  // ─── Validate concession ───
  let concession = null;
  if (concession_id) {
    if (!mongoose.isValidObjectId(concession_id)) {
      throw createError(400, 'Invalid concession ID.');
    }
    concession = await ConcessionMaster.findById(concession_id);
    if (!concession || concession.status !== 'active') {
      throw createError(404, 'Concession not found or inactive.');
    }

    if (
      concession.concession_type === 'old_student' &&
      admission_type !== 'old'
    ) {
      throw createError(
        400,
        'Old Student concession can only be applied to re-enrolling students.'
      );
    }

    if (concession.concession_type === 'group') {
      const minStudents = Number(concession.min_students || 0);
      const total = group_enquiry_ids.length + 1;
      if (total < minStudents) {
        throw createError(
          400,
          `Group concession requires at least ${minStudents} students. You selected ${total}.`
        );
      }

      const Enquiry = require('../../enquiries/models/Enquiry');
      const enquiries = await Enquiry.find({
        _id: { $in: group_enquiry_ids },
      });
      if (enquiries.length !== group_enquiry_ids.length) {
        throw createError(400, 'One or more group enquiries not found.');
      }
      if (enquiries.some((e) => e.status === 'converted')) {
        throw createError(
          400,
          'One or more group enquiries are already converted.'
        );
      }
    }
  }

  // ─── Validate payment plan ───
  if (payment_plan === 'installments') {
    if (
      !chosen_installment_plan_id ||
      !mongoose.isValidObjectId(chosen_installment_plan_id)
    ) {
      throw createError(400, 'Please select an installment plan.');
    }
    const planExists = feeComponents.some((fc) =>
      (fc.installment_plans || []).some(
        (p) => String(p._id) === String(chosen_installment_plan_id)
      )
    );
    if (!planExists) {
      throw createError(
        400,
        'Selected installment plan not found in this course.'
      );
    }
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
    user = await User.create({
      name: fullName,
      email: syntheticEmail,
      phone,
      password: temporaryPassword,
      role: studentRole._id,
      is_active: true,
      must_change_password: true,
    });

    const studentId = await generateStudentId();

    // Find plan name for display
    let planName = null;
    if (payment_plan === 'installments') {
      for (const fc of feeComponents) {
        const found = (fc.installment_plans || []).find(
          (p) => String(p._id) === String(chosen_installment_plan_id)
        );
        if (found) {
          planName = found.plan_name;
          break;
        }
      }
    }

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

      // 🚨 NEW admission-time fields
      admission_type,
      payment_plan,
      chosen_installment_plan_id:
        payment_plan === 'installments' ? chosen_installment_plan_id : null,
      chosen_installment_plan_name: planName,
      concession_id: concession ? concession._id : null,
      concession_applied_at: concession ? new Date() : null,
      concession_applied_by: concession ? staffUserId : null,
      group_enquiry_ids:
        concession?.concession_type === 'group' ? group_enquiry_ids : [],
    });

    // ─── Generate fee rows (NEW logic) ───
    const feeRows = buildAdmissionFeeRows({
      studentId: student._id,
      courseId: course._id,
      feeComponents,
      paymentPlan: payment_plan,
      chosenPlanId: chosen_installment_plan_id,
      concession,
    });

    if (!feeRows.length) {
      throw createError(400, 'No fee rows could be generated for this plan.');
    }

    await StudentFee.insertMany(feeRows);

    // ─── Mark group enquiries converted ───
    if (
      concession?.concession_type === 'group' &&
      group_enquiry_ids.length > 0
    ) {
      const Enquiry = require('../../enquiries/models/Enquiry');
      await Enquiry.updateMany(
        { _id: { $in: group_enquiry_ids } },
        {
          $set: {
            status: 'converted',
            converted_student_id: student._id,
          },
        }
      );
    }

    await StudentStageHistory.create({
      student_id: student._id,
      from_stage: null,
      to_stage: 'admission',
      stage_status: 'pending',
      changed_by: staffUserId,
      changed_at: new Date(),
      remarks: 'Direct admission without enquiry.',
    });

    await auditService.logAction({
      userId: staffUserId,
      action: 'DIRECT_ADMISSION',
      entity: 'Student',
      entityId: student._id,
      oldValues: null,
      newValues: {
        student_id: student.student_id,
        full_name: fullName,
        course_id: course._id,
        payment_plan,
        concession_id: concession?._id || null,
        group_count:
          concession?.concession_type === 'group'
            ? group_enquiry_ids.length + 1
            : 1,
        fees_generated: feeRows.length,
      },
      ip,
    });
  } catch (error) {
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
      payment_plan: student.payment_plan,
      concession_id: student.concession_id,
    },
    account: {
      email: syntheticEmail,
      phone,
      temporary_password: temporaryPassword,
      must_change_password: true,
    },
    fees_generated: feeRows.length,
  };
};