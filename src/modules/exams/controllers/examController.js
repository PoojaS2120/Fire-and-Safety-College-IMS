
const examService = require('../services/examService');

// Helper: extract authenticated user and request IP
const getRequestContext = req => ({
  user: {
    id: req.user.id,
    role: req.user.role,
  },
  ip: req.ip,
});

// =====================================================
// 1. CREATE EXAM
// POST /api/v1/exams
// =====================================================

exports.createExam = async (req, res, next) => {
  try {
    const { user, ip } = getRequestContext(req);

    const exam = await examService.createExam(
      req.body,
      user,
      ip
    );

    return res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data: exam,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// 2. LIST EXAMS
// GET /api/v1/exams
// =====================================================

exports.listExams = async (req, res, next) => {
  try {
    const { user } = getRequestContext(req);

    const exams = await examService.listExams(
      req.query,
      user
    );

    return res.status(200).json({
      success: true,
      message: 'Exams fetched successfully',
      data: exams,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// 3. GET EXAM BY ID
// GET /api/v1/exams/:id
// =====================================================

exports.getExamById = async (req, res, next) => {
  try {
    const { user } = getRequestContext(req);

    const exam = await examService.getExamById(
      req.params.id,
      user
    );

    return res.status(200).json({
      success: true,
      message: 'Exam fetched successfully',
      data: exam,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// 4. UPDATE EXAM
// PUT /api/v1/exams/:id
// =====================================================

exports.updateExam = async (req, res, next) => {
  try {
    const { user, ip } = getRequestContext(req);

    const exam = await examService.updateExam(
      req.params.id,
      req.body,
      user,
      ip
    );

    return res.status(200).json({
      success: true,
      message: 'Exam updated successfully',
      data: exam,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// 5. DELETE EXAM
// DELETE /api/v1/exams/:id
// =====================================================

exports.deleteExam = async (req, res, next) => {
  try {
    const { user, ip } = getRequestContext(req);

    const result = await examService.deleteExam(
      req.params.id,
      user,
      ip
    );

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// 6. BULK MARKS ENTRY
// POST /api/v1/exams/:id/marks/bulk
// =====================================================

exports.enterBulkMarks = async (req, res, next) => {
  try {
    const { user, ip } = getRequestContext(req);

    const result = await examService.enterBulkMarks(
      req.params.id,
      req.body.marks,
      user,
      ip
    );

    return res.status(200).json({
      success: true,
      message: 'Exam marks processed successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// 7. UPDATE INDIVIDUAL STUDENT MARKS
// PUT /api/v1/exams/:id/marks/:studentId
// =====================================================

exports.updateStudentMark = async (req, res, next) => {
  try {
    const { user, ip } = getRequestContext(req);

    const mark = await examService.updateStudentMark(
      req.params.id,
      req.params.studentId,
      req.body,
      user,
      ip
    );

    return res.status(200).json({
      success: true,
      message: 'Student exam marks updated successfully',
      data: mark,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// 8. DELETE INDIVIDUAL STUDENT MARKS
// DELETE /api/v1/exams/:id/marks/:studentId
// =====================================================

exports.deleteStudentMark = async (req, res, next) => {
  try {
    const { user, ip } = getRequestContext(req);

    const result = await examService.deleteStudentMark(
      req.params.id,
      req.params.studentId,
      user,
      ip
    );

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// 9. GET STUDENT MARK HISTORY
// GET /api/v1/exams/:id/marks/:studentId/history
// =====================================================

exports.getMarkHistory = async (req, res, next) => {
  try {
    const { user } = getRequestContext(req);

    const history = await examService.getMarkHistory(
      req.params.id,
      req.params.studentId,
      user
    );

    return res.status(200).json({
      success: true,
      message: 'Student exam marks history fetched successfully',
      data: history,
    });
  } catch (error) {
    next(error);
  }
};
