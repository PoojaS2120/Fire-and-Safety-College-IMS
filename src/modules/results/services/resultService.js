
const mongoose = require('mongoose');

const Exam = require('../../exams/models/Exam');
const ExamMark = require('../../exams/models/ExamMark');
const Student = require('../../students/models/Student');
const AuditLog = require('../../audit/models/AuditLog');

// =====================================================
// COMMON HELPERS
// =====================================================

const fail = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const getExam = async examId => {
  if (!mongoose.isValidObjectId(examId)) {
    fail(400, 'Invalid exam ID');
  }

  const exam = await Exam.findOne({
    _id: examId,
    deleted_at: null,
  });

  if (!exam) {
    fail(404, 'Exam not found');
  }

  return exam;
};

const checkFacultyAccess = (exam, user) => {
  if (
    user.role !== 'faculty' ||
    String(exam.faculty_id) !== String(user.id)
  ) {
    fail(403, 'You can access only your assigned exam results');
  }
};

const writeAudit = async (
  user,
  action,
  exam,
  oldValues,
  newValues,
  ip
) => {
  await AuditLog.create({
    user_id: user.id,
    action,
    entity: 'Exam',
    entity_id: exam._id,
    old_values: oldValues,
    new_values: newValues,
    ip_address: ip,
  });
};

// =====================================================
// 1. REVIEW EXAM RESULTS
// GET /api/v1/exams/:id/results
// Super Admin / Faculty
// =====================================================

exports.reviewResults = async (examId, user) => {
  const exam = await getExam(examId);

  if (user.role === 'faculty') {
    checkFacultyAccess(exam, user);
  } else if (user.role !== 'super_admin') {
    fail(403, 'You are not authorized to review results');
  }

  const students = await Student.find({
    course_id: exam.course_id,
    batch_id: exam.batch_id,
    status: 'active',
  })
    .select('_id student_id full_name')
    .sort({ full_name: 1 })
    .lean();

  const studentIds = students.map(student => student._id);

  const marks = studentIds.length
    ? await ExamMark.find({
        exam_id: exam._id,
        student_id: { $in: studentIds },
      })
        .select('student_id marks_obtained remarks')
        .lean()
    : [];

  const marksMap = new Map(
    marks.map(mark => [
      String(mark.student_id),
      mark,
    ])
  );

  const results = students.map(student => {
    const mark = marksMap.get(String(student._id));

    if (!mark) {
      return {
        student_id: student._id,
        admission_number: student.student_id,
        student_name: student.full_name,
        marks_obtained: null,
        max_marks: exam.max_marks,
        passing_marks: exam.passing_marks,
        percentage: null,
        result: 'pending',
        remarks: '',
      };
    }

    const percentage = Number(
      ((mark.marks_obtained / exam.max_marks) * 100).toFixed(2)
    );

    return {
      student_id: student._id,
      admission_number: student.student_id,
      student_name: student.full_name,
      marks_obtained: mark.marks_obtained,
      max_marks: exam.max_marks,
      passing_marks: exam.passing_marks,
      percentage,
      result:
        mark.marks_obtained >= exam.passing_marks
          ? 'pass'
          : 'fail',
      remarks: mark.remarks || '',
    };
  });

  const pendingCount = results.filter(
    item => item.result === 'pending'
  ).length;

  const passCount = results.filter(
    item => item.result === 'pass'
  ).length;

  const failCount = results.filter(
    item => item.result === 'fail'
  ).length;

  return {
    exam: {
      _id: exam._id,
      title: exam.title,
      subject: exam.subject,
      exam_type: exam.exam_type,
      exam_date: exam.exam_date,
      max_marks: exam.max_marks,
      passing_marks: exam.passing_marks,
      result_status: exam.result_status || 'draft',
      published_at: exam.published_at,
    },

    summary: {
      total_students: students.length,
      marks_entered: marks.length,
      pending: pendingCount,
      passed: passCount,
      failed: failCount,
      ready_to_publish: pendingCount === 0,
    },

    results,
  };
};

// =====================================================
// 2. PUBLISH EXAM RESULTS
// PUT /api/v1/exams/:id/publish
// Super Admin only
// =====================================================

exports.publishResults = async (examId, user, ip) => {
  if (user.role !== 'super_admin') {
    fail(403, 'Only Super Admin can publish results');
  }

  const exam = await getExam(examId);

  if (exam.result_status === 'published') {
    fail(400, 'Results are already published');
  }

  if (['cancelled', 'archived'].includes(exam.status)) {
    fail(
      400,
      'Results cannot be published for cancelled or archived exams'
    );
  }

  const students = await Student.find({
    course_id: exam.course_id,
    batch_id: exam.batch_id,
    status: 'active',
  }).select('_id');

  const studentIds = students.map(student => student._id);

  const marksCount = studentIds.length
    ? await ExamMark.countDocuments({
        exam_id: exam._id,
        student_id: { $in: studentIds },
      })
    : 0;

  if (marksCount !== students.length) {
    fail(
      400,
      `Cannot publish results. Marks are missing for ${
        students.length - marksCount
      } active student(s)`
    );
  }

  const oldValues = {
    result_status: exam.result_status || 'draft',
    published_at: exam.published_at,
    published_by: exam.published_by,
  };

  exam.result_status = 'published';
  exam.published_at = new Date();
  exam.published_by = user.id;

  await exam.save();

  await writeAudit(
    user,
    'PUBLISH',
    exam,
    oldValues,
    {
      result_status: exam.result_status,
      published_at: exam.published_at,
      published_by: exam.published_by,
    },
    ip
  );

  return exam;
};

// =====================================================
// 3. UNPUBLISH EXAM RESULTS
// PUT /api/v1/exams/:id/unpublish
// Super Admin only
// =====================================================

exports.unpublishResults = async (examId, user, ip) => {
  if (user.role !== 'super_admin') {
    fail(403, 'Only Super Admin can unpublish results');
  }

  const exam = await getExam(examId);

  if (exam.result_status !== 'published') {
    fail(400, 'Results are not currently published');
  }

  const oldValues = {
    result_status: exam.result_status,
    published_at: exam.published_at,
    published_by: exam.published_by,
  };

  exam.result_status = 'draft';
  exam.published_at = null;
  exam.published_by = null;

  await exam.save();

  await writeAudit(
    user,
    'UNPUBLISH',
    exam,
    oldValues,
    {
      result_status: exam.result_status,
      published_at: exam.published_at,
      published_by: exam.published_by,
    },
    ip
  );

  return exam;
};
