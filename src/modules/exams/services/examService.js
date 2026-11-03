
const mongoose = require('mongoose');

const Exam = require('../models/Exam');
const ExamMark = require('../models/ExamMark');

const Course = require('../../courses/models/Course');
const Batch = require('../../courses/models/Batch');
const User = require('../../auth/models/User');
const Student = require('../../students/models/Student');
const FacultyAssignment = require('../../faculty/models/FacultyAssignment');
const AuditLog = require('../../audit/models/AuditLog');

// =====================================================
// COMMON HELPERS
// =====================================================

const fail = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const validId = id => mongoose.Types.ObjectId.isValid(id);

const getExam = async id => {
  if (!validId(id)) {
    fail(400, 'Invalid exam ID');
  }

  const exam = await Exam.findOne({
    _id: id,
    deleted_at: null,
  });

  if (!exam) {
    fail(404, 'Exam not found');
  }

  return exam;
};

const checkPermission = (exam, user) => {
  if (user.role === 'super_admin') return;

  if (
    user.role !== 'faculty' ||
    String(exam.faculty_id) !== String(user.id)
  ) {
    fail(403, 'You can manage only your assigned exams');
  }
};

const checkReadPermission = (exam, user) => {
  if (
    user.role === 'super_admin' ||
    user.role === 'office_staff'
  ) {
    return;
  }

  if (
    user.role !== 'faculty' ||
    String(exam.faculty_id) !== String(user.id)
  ) {
    fail(403, 'You can view only your assigned exams');
  }
};

const checkFacultyAssignment = async (
  facultyId,
  courseId,
  batchId,
  subject
) => {
  const assignment = await FacultyAssignment.findOne({
    faculty_id: facultyId,
    course_id: courseId,
    batch_id: batchId,
    subject,
  });

  if (!assignment) {
    fail(
      403,
      'Faculty is not assigned to this course, batch and subject'
    );
  }
};

const writeAudit = async (
  user,
  action,
  entity,
  entityId,
  oldValues,
  newValues,
  ip
) => {
  return AuditLog.create({
    user_id: user.id,
    action,
    entity,
    entity_id: entityId,
    old_values: oldValues,
    new_values: newValues,
    ip_address: ip,
  });
};

// =====================================================
// REFERENCE VALIDATION
// =====================================================

const validateReferences = async (data, facultyId) => {
  const [course, batch, faculty] = await Promise.all([
    Course.findById(data.course_id),
    Batch.findById(data.batch_id),
    User.findById(facultyId),
  ]);

  if (!course || course.status !== 'active') {
    fail(400, 'Invalid or inactive course');
  }

  if (
    !batch ||
    batch.status !== 'active' ||
    String(batch.course_id) !== String(data.course_id)
  ) {
    fail(
      400,
      'Invalid batch or batch does not belong to course'
    );
  }

  if (
    !faculty ||
    faculty.role !== 'faculty' ||
    !faculty.is_active
  ) {
    fail(400, 'Invalid or inactive faculty');
  }

  await checkFacultyAssignment(
    facultyId,
    data.course_id,
    data.batch_id,
    data.subject
  );

  if (Number(data.passing_marks) > Number(data.max_marks)) {
    fail(400, 'Passing marks cannot exceed maximum marks');
  }

  if (
    data.form_start_date &&
    data.form_end_date &&
    new Date(data.form_end_date) < new Date(data.form_start_date)
  ) {
    fail(
      400,
      'Form end date cannot be before form start date'
    );
  }
};

// =====================================================
// STUDENT AND MARK VALIDATION
// =====================================================

const validateStudents = async (exam, studentIds) => {
  const uniqueIds = [...new Set(studentIds.map(String))];

  if (uniqueIds.length !== studentIds.length) {
    fail(400, 'Duplicate students found');
  }

  for (const id of uniqueIds) {
    if (!validId(id)) {
      fail(400, `Invalid student ID: ${id}`);
    }
  }

  const students = await Student.find({
    _id: { $in: uniqueIds },
    course_id: exam.course_id,
    batch_id: exam.batch_id,
    status: 'active',
  }).select('_id student_id full_name');

  if (students.length !== uniqueIds.length) {
    fail(
      400,
      'One or more students are inactive or do not belong to this exam batch'
    );
  }

  return students;
};

const validateMarks = (marks, maxMarks) => {
  const value = Number(marks);

  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > Number(maxMarks)
  ) {
    fail(400, `Marks must be between 0 and ${maxMarks}`);
  }
};

const getMarkRecord = async (examId, studentId) => {
  if (!validId(studentId)) {
    fail(400, 'Invalid student ID');
  }

  const mark = await ExamMark.findOne({
    exam_id: examId,
    student_id: studentId,
  });

  if (!mark) {
    fail(404, 'Student exam marks not found');
  }

  return mark;
};

// =====================================================
// 1. CREATE EXAM
// =====================================================

exports.createExam = async (data, user, ip) => {
  let facultyId;

  if (user.role === 'faculty') {
    facultyId = user.id;
  } else if (user.role === 'super_admin') {
    if (!data.faculty_id) {
      fail(400, 'faculty_id is required for Super Admin');
    }

    facultyId = data.faculty_id;
  } else {
    fail(403, 'You are not authorized to create exams');
  }

  await validateReferences(data, facultyId);

  const { faculty_id, ...examData } = data;

  const exam = await Exam.create({
    ...examData,
    faculty_id: facultyId,
    created_by: user.id,
  });

  await writeAudit(
    user,
    'CREATE',
    'Exam',
    exam._id,
    null,
    exam.toObject(),
    ip
  );

  return exam;
};

// =====================================================
// 2. LIST EXAMS (with populate + pagination)
// =====================================================
exports.listExams = async (query, user) => {
  const {
    page = 1,
    limit = 10,
    course_id,
    batch_id,
    faculty_id,
    exam_type,
    status,
    subject,
    start_date,
    end_date,
    search,
    sort_by = 'exam_date',
    sort_order = 'desc',
  } = query;

  const filter = { deleted_at: null };

  if (user.role === 'faculty') {
    filter.faculty_id = user.id;
  } else if (user.role === 'super_admin' || user.role === 'office_staff') {
    if (faculty_id) filter.faculty_id = faculty_id;
  } else {
    fail(403, 'You are not authorized to view exams');
  }

  if (course_id) filter.course_id = course_id;
  if (batch_id) filter.batch_id = batch_id;
  if (exam_type) filter.exam_type = exam_type;
  if (status) filter.status = status;

  if (subject) filter.subject = { $regex: subject, $options: 'i' };

  if (start_date || end_date) {
    filter.exam_date = {};
    if (start_date) filter.exam_date.$gte = new Date(start_date);
    if (end_date) {
      const lastDate = new Date(end_date);
      lastDate.setHours(23, 59, 59, 999);
      filter.exam_date.$lte = lastDate;
    }
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { subject: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [exams, total] = await Promise.all([
    Exam.find(filter)
      .sort({ [sort_by]: sort_order === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('course_id', 'name duration')
      .populate('batch_id', 'name')
      .populate('faculty_id', 'name email')
      .lean(),
    Exam.countDocuments(filter),
  ]);

  return {
    exams,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

// =====================================================
// 3. GET EXAM BY ID (with populate)
// =====================================================
exports.getExamById = async (id, user) => {
  if (!validId(id)) fail(400, 'Invalid exam ID');

  const exam = await Exam.findOne({ _id: id, deleted_at: null })
    .populate('course_id', 'name duration')
    .populate('batch_id', 'name start_date end_date')
    .populate('faculty_id', 'name email')
    .populate('created_by', 'name email');

  if (!exam) fail(404, 'Exam not found');
  checkReadPermission(exam, user);
  return exam;
};
// =====================================================
// 4. UPDATE EXAM
// =====================================================

exports.updateExam = async (id, data, user, ip) => {
  const exam = await getExam(id);

  checkPermission(exam, user);

  if (user.role === 'faculty' && data.faculty_id) {
    fail(403, 'Faculty cannot change faculty assignment');
  }

  const oldValues = exam.toObject();

  const updatedData = {
    ...exam.toObject(),
    ...data,
  };

  const facultyId =
    user.role === 'faculty'
      ? user.id
      : (data.faculty_id || exam.faculty_id);

  await validateReferences(updatedData, facultyId);

  // Existing marks must not exceed the new maximum marks.
  if (data.max_marks !== undefined) {
    const existingMarks = await ExamMark.find({
      exam_id: exam._id,
    }).select('marks_obtained');

    const newMaxMarks = Number(data.max_marks);

    if (
      existingMarks.some(
        mark => mark.marks_obtained > newMaxMarks
      )
    ) {
      fail(
        400,
        'New maximum marks cannot be lower than already entered marks'
      );
    }
  }

  Object.assign(exam, data);

  if (user.role === 'super_admin') {
    exam.faculty_id = facultyId;
  }

  exam.updated_by = user.id;

  await exam.save();

  await writeAudit(
    user,
    'UPDATE',
    'Exam',
    exam._id,
    oldValues,
    exam.toObject(),
    ip
  );

  return exam;
};

// =====================================================
// 5. DELETE / ARCHIVE EXAM
// =====================================================

exports.deleteExam = async (id, user, ip) => {
  const exam = await getExam(id);

  checkPermission(exam, user);

  const oldValues = exam.toObject();

  exam.deleted_at = new Date();
  exam.status = 'archived';
  exam.updated_by = user.id;

  await exam.save();

  await writeAudit(
    user,
    'DELETE',
    'Exam',
    exam._id,
    oldValues,
    exam.toObject(),
    ip
  );

  return {
    id: exam._id,
    message: 'Exam archived successfully',
  };
};

// =====================================================
// 6. BULK MARKS ENTRY
// =====================================================

exports.enterBulkMarks = async (id, entries, user, ip) => {
  const exam = await getExam(id);

  checkPermission(exam, user);

  if (!Array.isArray(entries) || entries.length === 0) {
    fail(400, 'At least one marks entry is required');
  }

  const studentIds = entries.map(entry => entry.student_id);

  await validateStudents(exam, studentIds);

  for (const entry of entries) {
    validateMarks(entry.marks_obtained, exam.max_marks);
  }

  const results = {
    inserted: 0,
    updated: 0,
    total: entries.length,
  };

  for (const entry of entries) {
    const existing = await ExamMark.findOne({
      exam_id: exam._id,
      student_id: entry.student_id,
    });

    if (existing) {
      const oldValues = existing.toObject();

      existing.history.push({
        old_marks: existing.marks_obtained,
        new_marks: Number(entry.marks_obtained),
        old_remarks: existing.remarks || '',
        new_remarks: entry.remarks || '',
        changed_by: user.id,
        changed_at: new Date(),
        change_source: 'bulk_entry',
      });

      existing.marks_obtained = Number(entry.marks_obtained);
      existing.remarks = entry.remarks || '';
      existing.last_updated_by = user.id;

      await existing.save();

      await writeAudit(
        user,
        'UPDATE',
        'ExamMark',
        existing._id,
        oldValues,
        existing.toObject(),
        ip
      );

      results.updated++;
    } else {
      const mark = await ExamMark.create({
        exam_id: exam._id,
        student_id: entry.student_id,
        marks_obtained: Number(entry.marks_obtained),
        remarks: entry.remarks || '',
        entered_by: user.id,
        last_updated_by: user.id,
      });

      await writeAudit(
        user,
        'CREATE',
        'ExamMark',
        mark._id,
        null,
        mark.toObject(),
        ip
      );

      results.inserted++;
    }
  }

  return results;
};

// =====================================================
// 7. UPDATE INDIVIDUAL STUDENT MARKS
// =====================================================

exports.updateStudentMark = async (
  examId,
  studentId,
  data,
  user,
  ip
) => {
  const exam = await getExam(examId);

  checkPermission(exam, user);

  validateMarks(data.marks_obtained, exam.max_marks);

  const mark = await getMarkRecord(exam._id, studentId);

  const oldValues = mark.toObject();

  mark.history.push({
    old_marks: mark.marks_obtained,
    new_marks: Number(data.marks_obtained),
    old_remarks: mark.remarks || '',
    new_remarks: data.remarks ?? mark.remarks ?? '',
    changed_by: user.id,
    changed_at: new Date(),
    change_source: 'manual',
  });

  mark.marks_obtained = Number(data.marks_obtained);

  if (data.remarks !== undefined) {
    mark.remarks = data.remarks;
  }

  mark.last_updated_by = user.id;

  await mark.save();

  await writeAudit(
    user,
    'UPDATE',
    'ExamMark',
    mark._id,
    oldValues,
    mark.toObject(),
    ip
  );

  return mark;
};

// =====================================================
// 8. DELETE INDIVIDUAL STUDENT MARKS
// =====================================================

exports.deleteStudentMark = async (
  examId,
  studentId,
  user,
  ip
) => {
  const exam = await getExam(examId);

  checkPermission(exam, user);

  const mark = await getMarkRecord(exam._id, studentId);

  const oldValues = mark.toObject();

  await ExamMark.deleteOne({
    _id: mark._id,
  });

  await writeAudit(
    user,
    'DELETE',
    'ExamMark',
    mark._id,
    oldValues,
    null,
    ip
  );

  return {
    exam_id: exam._id,
    student_id: studentId,
    message: 'Student exam marks deleted successfully',
  };
};

// =====================================================
// 9. GET STUDENT MARK HISTORY
// =====================================================

exports.getMarkHistory = async (
  examId,
  studentId,
  user
) => {
  const exam = await getExam(examId);

  checkReadPermission(exam, user);

  const mark = await getMarkRecord(exam._id, studentId);

  return {
    exam_id: exam._id,
    student_id: mark.student_id,
    current_marks: mark.marks_obtained,
    current_remarks: mark.remarks,
    history: mark.history,
  };
};
