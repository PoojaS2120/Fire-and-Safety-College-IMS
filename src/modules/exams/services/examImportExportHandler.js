
const Exam = require('../models/Exam');
const ExamMark = require('../models/ExamMark');
const Student = require('../../students/models/Student');

const fail = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

exports.exportExamMarks = async (query, user) => {
  const { exam_id } = query;

  if (!exam_id) {
    fail(400, 'exam_id is required');
  }

  if (!/^[0-9a-fA-F]{24}$/.test(String(exam_id))) {
    fail(400, 'Invalid exam_id');
  }

  const exam = await Exam.findOne({
    _id: exam_id,
    deleted_at: null,
  }).lean();

  if (!exam) {
    fail(404, 'Exam not found');
  }

  // Faculty can export only their assigned exams.
  if (
    user.role === 'faculty' &&
    String(exam.faculty_id) !== String(user.id)
  ) {
    fail(403, 'You can export only your assigned exams');
  }

  // Fetch active students belonging to this exam.
  const students = await Student.find({
    course_id: exam.course_id,
    batch_id: exam.batch_id,
    status: 'active',
  })
    .select('_id student_id full_name')
    .sort({ full_name: 1 })
    .lean();

  // Fetch marks entered for this exam.
  const marks = await ExamMark.find({
    exam_id: exam._id,
  })
    .select('student_id marks_obtained remarks')
    .lean();

  // Match marks with students using student ObjectId.
  const marksMap = new Map(
    marks.map(mark => [
      String(mark.student_id),
      mark,
    ])
  );

  return students.map(student => {
    const mark = marksMap.get(String(student._id));

    const obtained = mark
      ? Number(mark.marks_obtained)
      : '';

    let result = '';

    if (mark) {
      result =
        obtained >= Number(exam.passing_marks)
          ? 'PASS'
          : 'FAIL';
    }

    return {
      'Student ID': student.student_id || String(student._id),
      'Student Name': student.full_name || '',
      'Exam Title': exam.title || '',
      'Subject': exam.subject || '',
      'Exam Date': exam.exam_date || '',
      'Maximum Marks': exam.max_marks,
      'Passing Marks': exam.passing_marks,
      'Marks Obtained': obtained,
      'Result': result,
      'Remarks': mark?.remarks || '',
    };
  });
};
