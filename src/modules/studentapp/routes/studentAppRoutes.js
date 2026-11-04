
const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

const studentAppController = require('../controllers/studentAppController');
const materialController = require('../../materials/controllers/materialController');
const feeController = require('../../fees/controllers/feeController');

// All Student APK routes require student authentication.
router.use(verifyToken, authorize('student'));

// ==========================================
// DASHBOARD
// ==========================================
router.get('/dashboard', studentAppController.getDashboard);

// ==========================================
// PROFILE AND COURSE
// ==========================================
router.get('/profile', studentAppController.getProfile);
router.get('/course', studentAppController.getCourse);

// ==========================================
// ACADEMIC SCHEDULE
// ==========================================
router.get('/schedule', studentAppController.getSchedule);

// ==========================================
// STUDY MATERIALS
// ==========================================
router.get('/materials', studentAppController.getMaterials);

// Get material details by ID
router.get(
  '/materials/:id',
  studentAppController.getMaterialById
);

// Download PDF material
router.get(
  '/materials/:id/download',
  materialController.downloadPdf
);

// Stream video material
router.get(
  '/materials/:id/stream',
  materialController.streamVideo
);

// ==========================================
// STUDENT APK - CLASS TESTS
// ==========================================

// List class tests assigned to the logged-in student's batch
router.get(
  '/class-tests',
  studentAppController.getStudentClassTests
);

// Get individual class test details
router.get(
  '/class-tests/:id',
  studentAppController.getStudentClassTestById
);

// ==========================================
// FEES
// ==========================================
router.get('/fees', feeController.getMyFees);

// ==========================================
// PAYMENTS
// ==========================================
router.get('/payments', feeController.getMyPayments);

router.get(
  '/payments/:paymentId/receipt',
  feeController.getReceipt
);

// ==========================================
// STUDENT APK - LIBRARY
// ==========================================

// Library categories
router.get(
  '/library/categories',
  studentAppController.getLibraryCategories
);

// Browse/search available books
router.get(
  '/library/books',
  studentAppController.getLibraryBooks
);

// Individual book details
router.get(
  '/library/books/:id',
  studentAppController.getLibraryBook
);

// ==========================================
// STUDENT APK - NOTICES
// ==========================================

// All student notices
router.get(
  '/notices',
  studentAppController.getStudentNotices
);

// Batch-specific notices
router.get(
  '/notices/batch',
  studentAppController.getStudentBatchNotices
);

module.exports = router;
