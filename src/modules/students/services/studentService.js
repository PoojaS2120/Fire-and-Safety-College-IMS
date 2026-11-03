const mongoose = require('mongoose');

const Student = require('../models/Student');
const StudentStageHistory = require('../models/StudentStageHistory');
const StudentIdCounter = require('../models/StudentIdCounter');
const User = require('../../auth/models/User');
const Course = require('../../courses/models/Course');
const Batch = require('../../courses/models/Batch');

function createError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function validateObjectId(id, fieldName = 'student ID') {
  if (!mongoose.isValidObjectId(id)) throw createError(400, `Invalid ${fieldName}.`);
}

async function validateAssignments(courseId, batchId) {
  if (!courseId) throw createError(400, 'Course is required.');
  validateObjectId(courseId, 'course ID');

  const course = await Course.findById(courseId);
  if (!course) throw createError(404, 'Course not found.');
  if (course.status !== 'active') throw createError(400, 'Selected course is inactive.');

  if (batchId) {
    validateObjectId(batchId, 'batch ID');
    const batch = await Batch.findById(batchId);
    if (!batch) throw createError(404, 'Batch not found.');
    if (batch.status !== 'active') throw createError(400, 'Selected batch is closed.');
    if (batch.course_id.toString() !== courseId.toString()) {
      throw createError(400, 'Selected batch does not belong to the selected course.');
    }
  }
}

async function generateStudentId() {
  const year = new Date().getFullYear();
  const key = `student_id_${year}`;
  const counter = await StudentIdCounter.findByIdAndUpdate(
    key,
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `FSC-${year}-${String(counter.sequence).padStart(4, '0')}`;
}

// ================= CREATE =================
exports.createStudent = async (data, adminId) => {
  validateObjectId(adminId, 'creator user ID');

  const syntheticEmail = `${data.phone}@ims.com`;
  const existingUser = await User.findOne({ email: syntheticEmail });
  if (existingUser) throw createError(400, 'A student with this phone number already exists.');

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
exports.getStudents = async (query) => {
  const {
    page = 1, limit = 10, status, lifecycle_stage, stage_status, courseId, batchId,
  } = query;
  const searchTerm = query.q || query.search;

  const filter = {};
  if (status) filter.status = status;
  if (lifecycle_stage) filter.lifecycle_stage = lifecycle_stage;
  if (stage_status) filter.stage_status = stage_status;
  if (courseId) filter.course_id = courseId;
  if (batchId) filter.batch_id = batchId;

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

  return { students, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
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

  const courseId = Object.prototype.hasOwnProperty.call(data, 'course_id')
    ? data.course_id : existing.course_id.toString();
  const batchId = Object.prototype.hasOwnProperty.call(data, 'batch_id')
    ? data.batch_id : existing.batch_id?.toString();

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

// ================= ASSIGN COURSE + BATCH =================
exports.assignCourseAndBatch = async (id, courseId, batchId) => {
  validateObjectId(id);
  await validateAssignments(courseId, batchId);

  const student = await Student.findByIdAndUpdate(
    id,
    { course_id: courseId, batch_id: batchId || null },
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

  const isUserActive = status === 'active';

  const updatedUser = await User.findByIdAndUpdate(
    student.user_id,
    { $set: { is_active: isUserActive } },
    { returnDocument: 'after', runValidators: true }
  );
  if (!updatedUser) throw createError(404, 'Linked student user not found.');

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