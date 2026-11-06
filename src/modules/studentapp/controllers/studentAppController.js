
const studentAppService = require('../services/studentAppService');
const libraryService = require('../../library/services/libraryService');

exports.getProfile = async (req, res, next) => {
  try {
    const data = await studentAppService.getProfile(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Student profile fetched successfully.',
      data
    });
  } catch (error) {
    next(error);
  }
};

exports.getCourse = async (req, res, next) => {
  try {
    const data = await studentAppService.getCourse(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Student course fetched successfully.',
      data
    });
  } catch (error) {
    next(error);
  }
};

exports.getSchedule = async (req, res, next) => {
  try {
    const data = await studentAppService.getSchedule(
      req.user.id,
      req.query
    );

    return res.status(200).json({
      success: true,
      message: 'Student timetable fetched successfully.',
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// STUDY MATERIALS
// ==========================================

// GET /student/materials
exports.getMaterials = async (req, res, next) => {
  try {
    const data = await studentAppService.getMaterials(
      req.user.id,
      req.query
    );

    return res.status(200).json({
      success: true,
      message: 'Study materials fetched successfully.',
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

// GET /student/materials/:id
exports.getMaterialById = async (req, res, next) => {
  try {
    const data = await studentAppService.getMaterialById(
      req.user.id,
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: 'Study material details fetched successfully.',
      data
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// STUDENT APK - CLASS TESTS
// ==========================================

// GET /student/class-tests
exports.getStudentClassTests = async (req, res, next) => {
  try {
    const result = await studentAppService.getStudentClassTests(
      req.user.id,
      req.query
    );

    return res.status(200).json({
      success: true,
      message: 'Class tests fetched successfully.',
      data: result.rows,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /student/class-tests/:id
exports.getStudentClassTestById = async (req, res, next) => {
  try {
    const data = await studentAppService.getStudentClassTestById(
      req.user.id,
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: 'Class test details fetched successfully.',
      data
    });
  } catch (error) {
    next(error);
  }
};
// GET /student/class-tests/marks

exports.getClassTestMarks = async (req, res, next) => {
  try {
    const data = await studentAppService.getClassTestMarks(
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: 'Student class test marks fetched successfully.',
      data
    });
  } catch (error) {
    next(error);
  }
};
// ==========================================
// DASHBOARD
// ==========================================

exports.getDashboard = async (req, res, next) => {
  try {
    const data = await studentAppService.getDashboard(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Student dashboard fetched successfully.',
      data
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// STUDENT APK - LIBRARY
// ==========================================

// GET /student/library/categories
exports.getLibraryCategories = async (req, res, next) => {
  try {
    const data = await studentAppService.getLibraryCategories();

    return res.status(200).json({
      success: true,
      message: 'Library categories fetched successfully.',
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

// GET /student/library/books
exports.getLibraryBooks = async (req, res, next) => {
  try {
    const result = await studentAppService.getLibraryBooks(req.query);

    return res.status(200).json({
      success: true,
      message: 'Available books fetched successfully.',
      data: result.rows,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /student/library/books/:id
exports.getLibraryBook = async (req, res, next) => {
  try {
    const data = await studentAppService.getLibraryBook(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Book details fetched successfully.',
      data
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// STUDENT APK - LIBRARY ISSUE HISTORY
// ==========================================

// GET /student/library/issues
exports.getStudentLibraryIssues = async (req, res, next) => {
  try {
    const data = await libraryService.getStudentHistoryForUser(
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: 'Student library issue history fetched successfully.',
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// STUDENT APK - NOTICES
// ==========================================

// GET /student/notices
exports.getStudentNotices = async (req, res, next) => {
  try {
    const result = await studentAppService.getStudentNotices(
      req.user.id,
      req.query
    );

    return res.status(200).json({
      success: true,
      message: 'Student notices fetched successfully.',
      data: result.rows,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /student/notices/batch
exports.getStudentBatchNotices = async (req, res, next) => {
  try {
    const result = await studentAppService.getStudentBatchNotices(
      req.user.id,
      req.query
    );

    return res.status(200).json({
      success: true,
      message: 'Batch notices fetched successfully.',
      data: result.rows,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit)
      }
    });
  } catch (error) {
    next(error);
  }
};
// ==========================================
// STUDENT APK - EXAM RESULTS
// ==========================================

// GET /student/results
exports.getStudentExamResults = async (req, res, next) => {
  try {
    const data = await studentAppService.getStudentExamResults(
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: 'Exam results fetched successfully.',
      data
    });
  } catch (error) {
    next(error);
  }
};