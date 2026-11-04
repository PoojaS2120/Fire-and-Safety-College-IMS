
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

router.get(
  '/materials/:id/download',
  materialController.downloadPdf
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

module.exports = router;
