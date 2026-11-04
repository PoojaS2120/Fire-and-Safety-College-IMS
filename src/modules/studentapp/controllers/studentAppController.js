
const studentAppService = require('../services/studentAppService');

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