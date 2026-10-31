const StudentStageHistory = require('../models/StudentStageHistory');
const mongoose = require('mongoose');

const Student = require('../models/Student');
const User = require('../../auth/models/User');
const Course = require('../../courses/models/Course');
const Batch = require('../../courses/models/Batch');

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// Validate MongoDB ObjectId
function validateObjectId(id, fieldName = 'student ID') {
  if (!mongoose.isValidObjectId(id)) {
    throw createError(400, `Invalid ${fieldName}.`);
  }
}

// Validate course and batch assignment
async function validateAssignments(courseId, batchId) {
  if (!courseId) {
    throw createError(400, 'Course is required.');
  }

  validateObjectId(courseId, 'course ID');

  const course = await Course.findById(courseId);
  if (!course) {
    throw createError(404, 'Course not found.');
  }

  if (course.status !== 'active') {
    throw createError(400, 'Selected course is inactive.');
  }

  if (batchId) {
    validateObjectId(batchId, 'batch ID');
    const batch = await Batch.findById(batchId);

    if (!batch) {
      throw createError(404, 'Batch not found.');
    }

    if (batch.status !== 'active') {
      throw createError(400, 'Selected batch is closed.');
    }

    if (batch.course_id.toString() !== courseId.toString()) {
      throw createError(400, 'Selected batch does not belong to the selected course.');
    }
  }
}

// ================= CREATE STUDENT (Auto-User Creation) =================
exports.createStudent = async (data, adminId) => {
  validateObjectId(adminId, 'creator user ID');

  // 1. Check if student with this ID already exists
  const existingStudent = await Student.findOne({ student_id: data.student_id });
  if (existingStudent) {
    throw createError(409, 'Student ID is already registered.');
  }

  // 2. Check if a user with this phone number already exists
  const syntheticEmail = `${data.phone}@ims.com`;
  const existingUser = await User.findOne({ email: syntheticEmail });
  
  if (existingUser) {
    throw createError(400, 'A student with this phone number already exists.');
  }

  // 3. Validate Course and Batch
  await validateAssignments(data.course_id, data.batch_id);

  // 4. Auto-Create the User Login Account
  const newUser = await User.create({
    name: data.full_name,
    email: syntheticEmail,
    password: '123456', 
    phone: data.phone,
    role: 'student',
    must_change_password: true 
  });

  // 5. Create the Student Profile
  const student = await Student.create({
    ...data,
    email: data.email || null,
    batch_id: data.batch_id || null,
    user_id: newUser._id, // Link the auto-created user
    created_by: adminId,
  });

  return student;
};

// ================= LIST STUDENTS =================
exports.getStudents = async (query) => {
  const { page = 1, limit = 10, q, status, lifecycle_stage, stage_status, courseId, batchId } = query;

  const filter = {};
  if (status) filter.status = status;
  if (lifecycle_stage) filter.lifecycle_stage = lifecycle_stage;
  if (stage_status) filter.stage_status = stage_status;
  if (courseId) filter.course_id = courseId;
  if (batchId) filter.batch_id = batchId;

  if (q) {
    const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { student_id: { $regex: escapedQuery, $options: 'i' } },
      { full_name: { $regex: escapedQuery, $options: 'i' } },
      { email: { $regex: escapedQuery, $options: 'i' } },
      { phone: { $regex: escapedQuery, $options: 'i' } },
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
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// ================= GET STUDENT BY ID =================
exports.getStudentById = async (id) => {
  validateObjectId(id);
  const student = await Student.findById(id)
    .populate('user_id', 'name email phone is_active')
    .populate('course_id', 'name duration status')
    .populate('batch_id', 'name start_date end_date status')
    .populate('created_by', 'name email');

  if (!student) {
    throw createError(404, 'Student not found.');
  }
  return student;
};

// ================= UPDATE STUDENT PROFILE =================
exports.updateStudent = async (id, data) => {
  validateObjectId(id);
  const existing = await Student.findById(id);

  if (!existing) {
    throw createError(404, 'Student not found.');
  }

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

  // FIXED: Removed the duplicate, broken syntax here
  return Student.findByIdAndUpdate(
    id,
    { $set: updateData },
    { returnDocument: 'after', runValidators: true }
  )
    .populate('user_id', 'name email phone is_active')
    .populate('course_id', 'name duration status')
    .populate('batch_id', 'name start_date end_date status');
};

// ================= UPDATE STUDENT STATUS =================
exports.updateStudentStatus = async (id, status) => {
  validateObjectId(id);
  const session = await mongoose.startSession();

  try {
    let updatedStudent;

    await session.withTransaction(async () => {
      const student = await Student.findById(id).session(session);
      if (!student) {
        throw createError(404, 'Student not found.');
      }

      const isUserActive = status === 'active';

      // FIXED: Removed the duplicate, broken syntax here
      const updatedUser = await User.findByIdAndUpdate(
        student.user_id,
        { $set: { is_active: isUserActive } },
        { returnDocument: 'after', runValidators: true, session }
      );

      if (!updatedUser) {
        throw createError(404, 'Linked student user not found.');
      }

      student.status = status;
      await student.save({ session });
      updatedStudent = student;
    });

    return updatedStudent;
  } finally {
    await session.endSession();
  }

};
// UPDATE STUDENT LIFECYCLE STAGE AND RECORD HISTORY
exports.updateStudentStage = async (id, data, userId) => {
  validateObjectId(id);
  validateObjectId(userId, 'user ID');

  const session = await mongoose.startSession();

  try {
    let updatedStudent;

    await session.withTransaction(async () => {
      const student = await Student.findById(id).session(session);

      if (!student) {
        throw createError(404, 'Student not found.');
      }

      // Capture previous lifecycle stage before updating
      const previousStage = student.lifecycle_stage;

      // Update lifecycle information
      student.lifecycle_stage = data.lifecycle_stage;
      student.stage_status = data.stage_status;

      await student.save({ session });

      // Create stage history record
      await StudentStageHistory.create(
        [
          {
            student_id: student._id,
            from_stage: previousStage,
            to_stage: data.lifecycle_stage,
            stage_status: data.stage_status,
            changed_by: userId,
            changed_at: new Date(),
            remarks: data.remarks || null,
          },
        ],
        { session }
      );

      updatedStudent = student;
    });

    return updatedStudent;
  } finally {
    await session.endSession();
  }
};

// GET STUDENT LIFECYCLE STAGE HISTORY
exports.getStudentStageHistory = async (id) => {
  validateObjectId(id);

  const student = await Student.findById(id).select('_id');

  if (!student) {
    throw createError(404, 'Student not found.');
  }

  return StudentStageHistory.find({ student_id: id })
    .populate('changed_by', 'name email')
    .sort({ changed_at: -1 });

};