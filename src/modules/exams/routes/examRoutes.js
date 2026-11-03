
// const express = require('express');

// const { verifyToken } = require('../../../middlewares/auth');
// const { authorize } = require('../../../middlewares/authorize');

// const examController = require('../controllers/examController');
// const resultController = require('../../results/controllers/resultController');

// const router = express.Router();

// // =====================================================
// // AUTHENTICATION
// // All exam routes require a valid access token
// // =====================================================

// router.use(verifyToken);

// // =====================================================
// // EXAM CRUD
// // =====================================================

// // Create exam
// router.post(
//   '/',
//   authorize('super_admin', 'faculty'),
//   examController.createExam
// );

// // Get all exams
// router.get(
//   '/',
//   authorize('super_admin', 'office_staff', 'faculty'),
//   examController.listExams
// );

// // Get exam by ID
// router.get(
//   '/:id',
//   authorize('super_admin', 'office_staff', 'faculty'),
//   examController.getExamById
// );

// // Update exam
// router.put(
//   '/:id',
//   authorize('super_admin', 'faculty'),
//   examController.updateExam
// );

// // Delete/archive exam
// router.delete(
//   '/:id',
//   authorize('super_admin', 'faculty'),
//   examController.deleteExam
// );

// // =====================================================
// // EXAM MARKS MANAGEMENT
// // =====================================================

// // Bulk enter marks
// router.post(
//   '/:id/marks/bulk',
//   authorize('super_admin', 'faculty'),
//   examController.enterBulkMarks
// );

// // Update individual student's marks
// router.put(
//   '/:id/marks/:studentId',
//   authorize('super_admin', 'faculty'),
//   examController.updateStudentMark
// );

// // Delete individual student's marks
// router.delete(
//   '/:id/marks/:studentId',
//   authorize('super_admin', 'faculty'),
//   examController.deleteStudentMark
// );

// // Get individual student's marks history
// router.get(
//   '/:id/marks/:studentId/history',
//   authorize('super_admin', 'faculty'),
//   examController.getMarkHistory
// );


// /* ==========================================
//    B-36: RESULT MANAGEMENT
// ========================================== */

// // Review exam results
// router.get(
//   '/:id/results',
//   authorize('super_admin', 'faculty'),
//   resultController.reviewResults
// );

// // Publish exam results (Super Admin only)
// router.put(
//   '/:id/publish',
//   authorize('super_admin'),
//   resultController.publishResults
// );

// // Unpublish exam results (Super Admin only)
// router.put(
//   '/:id/unpublish',
//   authorize('super_admin'),
//   resultController.unpublishResults
// );

// module.exports = router;



const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');
const validate = require('../../../middlewares/validate');

const examController = require('../controllers/examController');
const resultController = require('../../results/controllers/resultController');

const {
  createExamSchema,
  updateExamSchema,
  listExamSchema,
  bulkMarksSchema,
  updateMarkSchema,
} = require('../validations/examValidation');

router.use(verifyToken);

// ========== EXAM CRUD ==========
router.post(
  '/',
  authorize('super_admin', 'faculty'),
  validate(createExamSchema),
  examController.createExam
);

router.get(
  '/',
  authorize('super_admin', 'office_staff', 'faculty'),
  validate(listExamSchema, 'query'),
  examController.listExams
);

router.get(
  '/:id',
  authorize('super_admin', 'office_staff', 'faculty'),
  examController.getExamById
);

router.put(
  '/:id',
  authorize('super_admin', 'faculty'),
  validate(updateExamSchema),
  examController.updateExam
);

router.delete(
  '/:id',
  authorize('super_admin', 'faculty'),
  examController.deleteExam
);

// ========== MARKS MANAGEMENT ==========
router.post(
  '/:id/marks/bulk',
  authorize('super_admin', 'faculty'),
  validate(bulkMarksSchema),
  examController.enterBulkMarks
);

router.put(
  '/:id/marks/:studentId',
  authorize('super_admin', 'faculty'),
  validate(updateMarkSchema),
  examController.updateStudentMark
);

router.delete(
  '/:id/marks/:studentId',
  authorize('super_admin', 'faculty'),
  examController.deleteStudentMark
);

router.get(
  '/:id/marks/:studentId/history',
  authorize('super_admin', 'faculty'),
  examController.getMarkHistory
);

// ========== RESULT MANAGEMENT ==========
router.get(
  '/:id/results',
  authorize('super_admin', 'faculty'),
  resultController.reviewResults
);

router.put(
  '/:id/publish',
  authorize('super_admin'),
  resultController.publishResults
);

router.put(
  '/:id/unpublish',
  authorize('super_admin'),
  resultController.unpublishResults
);

module.exports = router;