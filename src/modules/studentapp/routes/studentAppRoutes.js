
const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

const studentAppController = require('../controllers/studentAppController');
const materialController = require('../../materials/controllers/materialController');
const feeController = require('../../fees/controllers/feeController');

// All Student APK routes require student authentication.
router.use(verifyToken, authorize('student'));

// Dashboard
router.get('/dashboard', studentAppController.getDashboard);

// Profile and Course
router.get('/profile', studentAppController.getProfile);
router.get('/course', studentAppController.getCourse);

// Academic Schedule
router.get('/schedule', studentAppController.getSchedule);

// Study Materials
router.get('/materials', studentAppController.getMaterials);
router.get(
  '/materials/:id/download',
  materialController.downloadPdf
);

// Fees
router.get('/fees', feeController.getMyFees);

// Payments
router.get('/payments', feeController.getMyPayments);

// Payment Receipt
router.get(
  '/payments/:paymentId/receipt',
  feeController.getReceipt
);

module.exports = router;
