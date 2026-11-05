
const Student = require('../../students/models/Student');
const ClassSchedule = require('../../classschedules/models/ClassSchedule');
const ClassTest = require('../../classtests/models/ClassTest');
const ClassTestMark = require('../../classtests/models/ClassTestMark');
const Exam = require('../../exams/models/Exam');
const ExamMark = require('../../exams/models/ExamMark');
const materialService = require('../../materials/services/materialService');
const libraryService = require('../../library/services/libraryService');
const Notice = require('../../notices/models/Notice');

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Always resolve the student from the authenticated user.
// Never accept a student ID from the Android app.
const getAuthenticatedStudent = async (userId) => {
  const student = await Student.findOne({ user_id: userId })
    .populate('course_id', 'name duration description status')
    .populate('batch_id', 'name start_date end_date status');

  if (!student) {
    throw createError('Student profile not found.', 404);
  }

  return student;
};

// GET /student/class-tests/marks
// Fetch only the authenticated student's class test marks.

exports.getClassTestMarks = async (userId) => {
  const student = await getAuthenticatedStudent(userId);

  if (!student.course_id || !student.batch_id) {
    throw createError('Student course or batch not found.', 404);
  }

  const courseId = student.course_id._id || student.course_id;
  const batchId = student.batch_id._id || student.batch_id;

  const classTests = await ClassTest.find({
    course_id: courseId,
    batch_id: batchId,
    deleted_at: null,
    status: { $nin: ['draft', 'cancelled', 'archived'] }
  })
    .select(
      'title subject test_date max_marks passing_marks status'
    )
    .sort({ test_date: -1 })
    .lean();

  const marks = await ClassTestMark.find({
    student_id: student._id,
    class_test_id: { $in: classTests.map(test => test._id) }
  })
    .select('class_test_id marks_obtained remarks')
    .lean();

  const marksMap = new Map(
    marks.map(mark => [
      String(mark.class_test_id),
      mark
    ])
  );

  const results = classTests.map(test => {
    const mark = marksMap.get(String(test._id));
    const marksObtained = mark?.marks_obtained ?? null;

    return {
      class_test_id: test._id,
      title: test.title,
      subject: test.subject,
      test_date: test.test_date,
      max_marks: test.max_marks,
      passing_marks: test.passing_marks,
      status: test.status,
      marks_obtained: marksObtained,
      remarks: mark?.remarks || '',
      result: marksObtained === null
        ? 'pending'
        : marksObtained >= test.passing_marks
          ? 'pass'
          : 'fail'
    };
  });

  return {
    student: {
      student_id: student.student_id,
      full_name: student.full_name
    },
    total_tests: results.length,
    marks_available: results.filter(
      item => item.marks_obtained !== null
    ).length,
    data: results
  };
};
// ==========================================
// PROFILE
// ==========================================

// GET /student/profile
exports.getProfile = async (userId) => {
  const student = await getAuthenticatedStudent(userId);

  return {
    student_id: student.student_id,
    full_name: student.full_name,
    dob: student.dob,
    gender: student.gender,
    phone: student.phone,
    email: student.email,
    address: student.address,
    guardian_name: student.guardian_name,
    guardian_phone: student.guardian_phone,
    qualification: student.qualification,
    admitted_on: student.admitted_on,
    lifecycle_stage: student.lifecycle_stage,
    stage_status: student.stage_status,
    status: student.status
  };
};

// ==========================================
// COURSE
// ==========================================

// GET /student/course
exports.getCourse = async (userId) => {
  const student = await getAuthenticatedStudent(userId);

  return {
    course: student.course_id,
    batch: student.batch_id
  };
};

// ==========================================
// ACADEMIC SCHEDULE
// ==========================================

// GET /student/schedule
exports.getSchedule = async (userId, filters = {}) => {
  const student = await getAuthenticatedStudent(userId);

  if (!student.batch_id) {
    return [];
  }

  const query = {
    course_id: student.course_id._id,
    batch_id: student.batch_id._id,
    status: 'scheduled'
  };

  if (filters.date) {
    const selectedDate = new Date(filters.date);

    if (Number.isNaN(selectedDate.getTime())) {
      throw createError('Invalid schedule date.', 400);
    }

    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);

    query.date = { $gte: start, $lte: end };
  }

  return ClassSchedule.find(query)
    .populate('course_id', 'name')
    .populate('batch_id', 'name')
    .populate('faculty_id', 'name email')
    .sort({ date: 1, start_time: 1 });
};

// ==========================================
// STUDY MATERIALS
// ==========================================

// GET /student/materials
exports.getMaterials = async (userId, filters = {}) => {
  return materialService.getMaterials(filters, {
    id: userId,
    role: 'student'
  });
};

// GET /student/materials/:id
exports.getMaterialById = async (userId, materialId) => {
  const material = await materialService.getMaterialById(materialId, {
    id: userId,
    role: 'student'
  });

  if (material.status !== 'active') {
    throw createError('Active study material not found.', 404);
  }

  return material;
};

// ==========================================
// STUDENT APK - CLASS TESTS
// ==========================================

// GET /student/class-tests
exports.getStudentClassTests = async (userId, filters = {}) => {
  const student = await getAuthenticatedStudent(userId);

  if (!student.course_id || !student.batch_id) {
    return {
      rows: [],
      total: 0,
      page: 1,
      limit: 20
    };
  }

  const page = Math.max(parseInt(filters.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(filters.limit, 10) || 20, 1),
    100
  );

  // Students only see tests assigned to their own course and batch.
  // Draft, cancelled and archived tests are excluded.
  const query = {
    course_id: student.course_id._id,
    batch_id: student.batch_id._id,
    deleted_at: null,
    status: { $in: ['scheduled', 'completed'] }
  };

  if (filters.subject) {
    query.subject = {
      $regex: String(filters.subject).trim(),
      $options: 'i'
    };
  }

  if (filters.status) {
    if (!['scheduled', 'completed'].includes(filters.status)) {
      throw createError('Invalid class test status filter.', 400);
    }

    query.status = filters.status;
  }

  const [rows, total] = await Promise.all([
    ClassTest.find(query)
      .select(
        'title description subject test_date max_marks passing_marks duration_minutes status'
      )
      .populate('faculty_id', 'name')
      .sort({ test_date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    ClassTest.countDocuments(query)
  ]);

  return {
    rows,
    total,
    page,
    limit
  };
};

// GET /student/class-tests/:id
exports.getStudentClassTestById = async (userId, testId) => {
  const student = await getAuthenticatedStudent(userId);

  if (!student.course_id || !student.batch_id) {
    throw createError('Student course or batch not found.', 404);
  }

  const test = await ClassTest.findOne({
    _id: testId,
    course_id: student.course_id._id,
    batch_id: student.batch_id._id,
    deleted_at: null,
    status: { $in: ['scheduled', 'completed'] }
  })
    .select(
      'title description subject test_date max_marks passing_marks duration_minutes status faculty_id createdAt'
    )
    .populate('faculty_id', 'name')
    .lean();

  if (!test) {
    throw createError('Class test not found.', 404);
  }

  return test;
};

// ==========================================
// DASHBOARD
// ==========================================

exports.getDashboard = async (userId) => {
  const student = await getAuthenticatedStudent(userId);

  const scheduleQuery = {
    course_id: student.course_id._id,
    status: 'scheduled'
  };

  if (student.batch_id) {
    scheduleQuery.batch_id = student.batch_id._id;
  }

  const [upcomingClasses, materials] = await Promise.all([
    ClassSchedule.find({
      ...scheduleQuery,
      date: { $gte: new Date() }
    })
      .populate('faculty_id', 'name')
      .sort({ date: 1, start_time: 1 })
      .limit(5),

    student.batch_id
      ? materialService.getMaterials({}, {
          id: userId,
          role: 'student'
        })
      : Promise.resolve([])
  ]);

  return {
    student: {
      student_id: student.student_id,
      full_name: student.full_name,
      course: student.course_id,
      batch: student.batch_id,
      status: student.status
    },
    upcoming_classes: upcomingClasses,
    recent_materials: materials.slice(0, 5)
  };
};

// ==========================================
// STUDENT APK - LIBRARY
// ==========================================

// GET /student/library/categories
exports.getLibraryCategories = async () => {
  return libraryService.listCategories();
};

// GET /student/library/books
exports.getLibraryBooks = async (filters = {}) => {
  const query = {
    status: 'active',
    page: filters.page,
    limit: filters.limit
  };

  if (filters.q) {
    query.q = String(filters.q).trim();
  }

  if (filters.category) {
    query.category = filters.category;
  }

  return libraryService.listBooks(query);
};

// GET /student/library/books/:id
exports.getLibraryBook = async (bookId) => {
  const book = await libraryService.getBook(bookId);

  // Students can only view active books.
  if (book.status !== 'active') {
    throw createError('Book is not available.', 404);
  }

  return book;
};

// ==========================================
// STUDENT APK - NOTICES
// ==========================================

// GET /student/notices
exports.getStudentNotices = async (userId, filters = {}) => {
  const student = await getAuthenticatedStudent(userId);

  const page = Math.max(parseInt(filters.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(filters.limit, 10) || 20, 1),
    100
  );

  const audienceConditions = [
    { targetType: 'all' },
    {
      targetType: 'course',
      targetCourse: student.course_id._id
    }
  ];

  if (student.batch_id) {
    audienceConditions.push({
      targetType: 'batch',
      targetBatch: student.batch_id._id
    });
  }

  const filter = {
    status: 'published',
    $or: audienceConditions
  };

  const [rows, total] = await Promise.all([
    Notice.find(filter)
      .populate('targetCourse', 'name')
      .populate('targetBatch', 'name')
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),

    Notice.countDocuments(filter)
  ]);

  return {
    rows,
    total,
    page,
    limit
  };
};

// GET /student/notices/batch
exports.getStudentBatchNotices = async (userId, filters = {}) => {
  const student = await getAuthenticatedStudent(userId);

  const batchId = student.batch_id?._id || student.batch_id;

  if (!batchId) {
    return {
      rows: [],
      total: 0,
      page: 1,
      limit: 20
    };
  }

  const page = Math.max(parseInt(filters.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(filters.limit, 10) || 20, 1),
    100
  );

  const filter = {
    status: 'published',
    targetType: 'batch',
    targetBatch: batchId
  };

  const [rows, total] = await Promise.all([
    Notice.find(filter)
      .populate('targetBatch', 'name')
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),

    Notice.countDocuments(filter)
  ]);

  return { rows, total, page, limit };
};
// ==========================================
// STUDENT APK - EXAM RESULTS
// ==========================================

// GET /student/results
// Students can view only their own published exam results.

exports.getStudentExamResults = async (userId) => {
  const student = await getAuthenticatedStudent(userId);

  if (!student.course_id || !student.batch_id) {
    return {
      student: {
        student_id: student.student_id,
        full_name: student.full_name
      },
      total_exams: 0,
      data: []
    };
  }

  const courseId = student.course_id._id;
  const batchId = student.batch_id._id;

  // Fetch only published exams belonging to this student's course and batch.
  const exams = await Exam.find({
    course_id: courseId,
    batch_id: batchId,
    result_status: 'published',
    deleted_at: null
  })
    .select(
      'title subject exam_type exam_date max_marks passing_marks result_status published_at'
    )
    .sort({ exam_date: -1 })
    .lean();

  if (!exams.length) {
    return {
      student: {
        student_id: student.student_id,
        full_name: student.full_name
      },
      total_exams: 0,
      data: []
    };
  }

  // Fetch only the authenticated student's marks.
  const marks = await ExamMark.find({
    student_id: student._id,
    exam_id: { $in: exams.map(exam => exam._id) }
  })
    .select('exam_id marks_obtained remarks')
    .lean();

  const marksMap = new Map(
    marks.map(mark => [
      String(mark.exam_id),
      mark
    ])
  );

  // Build result response.
  const results = exams
    .map(exam => {
      const mark = marksMap.get(String(exam._id));

      // Do not expose exams for which this student has no marks entry.
      if (!mark) return null;

      const marksObtained = Number(mark.marks_obtained);
      const maxMarks = Number(exam.max_marks);
      const passingMarks = Number(exam.passing_marks);

      const percentage = maxMarks > 0
        ? Number(((marksObtained / maxMarks) * 100).toFixed(2))
        : 0;

      return {
        exam_id: exam._id,
        title: exam.title,
        subject: exam.subject,
        exam_type: exam.exam_type,
        exam_date: exam.exam_date,
        marks_obtained: marksObtained,
        max_marks: maxMarks,
        passing_marks: passingMarks,
        percentage,
        result: marksObtained >= passingMarks ? 'PASS' : 'FAIL',
        remarks: mark.remarks || null,
        result_status: exam.result_status,
        published_at: exam.published_at
      };
    })
    .filter(Boolean);

  return {
    student: {
      student_id: student.student_id,
      full_name: student.full_name
    },
    total_exams: results.length,
    data: results
  };
};