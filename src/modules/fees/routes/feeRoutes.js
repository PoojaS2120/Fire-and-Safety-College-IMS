
const express = require('express');
const router = express.Router();

const feeController = require('../controllers/feeController');
const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

// ================= ADMIN & STAFF ROUTES =================

router.post(
  '/generate',
  verifyToken,
  authorize('super_admin', 'office_staff'),
  feeController.generateLedger
);

router.get(
  '/pending',
  verifyToken,
  authorize('super_admin', 'office_staff'),
  feeController.getPendingFees
);

router.get(
  '/:studentId/summary',
  verifyToken,
  authorize('super_admin', 'office_staff', 'student'),
  feeController.getSummary
);

router.get(
  '/:studentId/eligibility',
  verifyToken,
  authorize('super_admin', 'office_staff', 'student'),
  feeController.checkEligibility
);

// ================= PAYMENT ROUTES =================

router.post(
  '/payments',
  verifyToken,
  authorize('super_admin', 'office_staff'),
  feeController.recordPayment
);

// Receipt JSON
router.get(
  '/payments/:paymentId/receipt',
  verifyToken,
  authorize('super_admin', 'office_staff', 'student'),
  feeController.getReceipt
);

// Receipt PDF - View / Print / Download
router.get(
  '/payments/:paymentId/receipt/pdf',
  verifyToken,
  authorize('super_admin', 'office_staff', 'student'),
  feeController.downloadReceipt
);

// Cancel Payment
router.patch(
  '/payments/:paymentId/cancel',
  verifyToken,
  authorize('super_admin'),
  feeController.cancelPayment
);

// ================= STUDENT APP ROUTES =================

router.get(
  '/my/fees',
  verifyToken,
  authorize('student'),
  feeController.getMyFees
);

router.get(
  '/my/payments',
  verifyToken,
  authorize('student'),
  feeController.getMyPayments
);

module.exports = router;
