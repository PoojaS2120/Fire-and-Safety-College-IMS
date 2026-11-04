const ExamMark = require('../../exams/models/ExamMark');
const Exam = require('../../exams/models/Exam');
const Student = require('../models/Student');

// -----------------------------------------------------------
// SAFE IMPORT: Test / TestMark with multiple candidate paths
// If your folder is named differently, add more entries here.
// -----------------------------------------------------------
function tryRequire(candidates, label) {
  for (const path of candidates) {
    try {
      return require(path);
    } catch (e) {
      // try next
    }
  }
  console.warn(`[studentResultService] ${label} not found — tests results disabled`);
  return null;
}

const TestMark = tryRequire(
  [
    '../../classtests/models/TestMark',
    '../../class-tests/models/TestMark',
    '../../classTests/models/TestMark',
    '../../class_test/models/TestMark',
    '../../classtests/models/ClassTestMark',
  ],
  'TestMark'
);

const Test = tryRequire(
  [
    '../../classtests/models/Test',
    '../../class-tests/models/Test',
    '../../classTests/models/Test',
    '../../class_test/models/Test',
    '../../classtests/models/ClassTest',
  ],
  'Test'
);

function fail(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
}

async function getSelfStudent(userId) {
  const student = await Student.findOne({ user_id: userId, status: 'active' })
    .select('_id course_id batch_id');
  if (!student) fail(404, 'Active student profile not found');
  return student;
}

// ---------- EXAM RESULTS (published only) ----------
exports.getMyExamResults = async (userId) => {
  const student = await getSelfStudent(userId);

  const publishedExams = await Exam.find({
    course_id: student.course_id,
    result_status: 'published',
    deleted_at: null,
  }).select('_id title subject exam_type exam_date max_marks passing_marks');

  const examIds = publishedExams.map((e) => e._id);

  const marks = await ExamMark.find({
    student_id: student._id,
    exam_id: { $in: examIds },
  }).select('exam_id marks_obtained remarks');

  return publishedExams
    .map((exam) => {
      const mark = marks.find((m) => String(m.exam_id) === String(exam._id));
      if (!mark) return null;

      const obtained = Number(mark.marks_obtained || 0);
      const max = Number(exam.max_marks);
      const percentage = max > 0 ? Number(((obtained / max) * 100).toFixed(2)) : 0;

      return {
        exam_id: exam._id,
        title: exam.title,
        subject: exam.subject,
        exam_type: exam.exam_type,
        exam_date: exam.exam_date,
        marks_obtained: obtained,
        max_marks: max,
        passing_marks: exam.passing_marks,
        percentage,
        result: obtained >= Number(exam.passing_marks) ? 'PASS' : 'FAIL',
        remarks: mark.remarks || null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.exam_date) - new Date(a.exam_date));
};

// ---------- TEST RESULTS (class tests) ----------
exports.getMyTestResults = async (userId) => {
  // If Test/TestMark modules were not found, return empty list gracefully
  if (!Test || !TestMark) {
    return [];
  }

  const student = await getSelfStudent(userId);

  const tests = await Test.find({
    course_id: student.course_id,
    batch_id: student.batch_id,
  }).select('_id title subject test_date max_marks');

  const testIds = tests.map((t) => t._id);

  const marks = await TestMark.find({
    student_id: student._id,
    test_id: { $in: testIds },
  }).select('test_id marks_obtained remarks');

  return tests
    .map((test) => {
      const mark = marks.find((m) => String(m.test_id) === String(test._id));
      if (!mark) return null;

      const obtained = Number(mark.marks_obtained || 0);
      const max = Number(test.max_marks);
      const percentage = max > 0 ? Number(((obtained / max) * 100).toFixed(2)) : 0;

      return {
        test_id: test._id,
        title: test.title,
        subject: test.subject,
        test_date: test.test_date,
        marks_obtained: obtained,
        max_marks: max,
        percentage,
        remarks: mark.remarks || null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.test_date) - new Date(a.test_date));
};