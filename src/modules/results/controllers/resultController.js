
const resultService = require('../services/resultService');

const getUser = req => ({
  id: req.user.id,
  role: req.user.role,
});

// =====================================================
// 1. REVIEW EXAM RESULTS
// GET /api/v1/exams/:id/results
// =====================================================

exports.reviewResults = async (req, res, next) => {
  try {
    const data = await resultService.reviewResults(
      req.params.id,
      getUser(req)
    );

    return res.status(200).json({
      success: true,
      message: 'Exam results fetched successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// 2. PUBLISH EXAM RESULTS
// PUT /api/v1/exams/:id/publish
// =====================================================

exports.publishResults = async (req, res, next) => {
  try {
    const data = await resultService.publishResults(
      req.params.id,
      getUser(req),
      req.ip
    );

    return res.status(200).json({
      success: true,
      message: 'Exam results published successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// 3. UNPUBLISH EXAM RESULTS
// PUT /api/v1/exams/:id/unpublish
// =====================================================

exports.unpublishResults = async (req, res, next) => {
  try {
    const data = await resultService.unpublishResults(
      req.params.id,
      getUser(req),
      req.ip
    );

    return res.status(200).json({
      success: true,
      message: 'Exam results unpublished successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};
