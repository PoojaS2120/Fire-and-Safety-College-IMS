const express = require('express');
const router = express.Router();
const tclcController = require('../controllers/tclcController');
const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

// ===== SPECIFIC ROUTES FIRST =====
// Student: view own requests (APK)
router.get(
  '/my-requests',
  verifyToken,
  authorize('student'),
  tclcController.getMyRequests
);

// Check eligibility for any student (before creating request)
router.get(
  '/students/:studentId/eligibility',
  verifyToken,
  authorize('super_admin', 'office_staff'),
  tclcController.checkStudentEligibility
);

// ===== STAFF ROUTES =====
router.post(
  '/',
  verifyToken,
  authorize('super_admin', 'office_staff'),
  tclcController.requestCertificate
);

router.get(
  '/',
  verifyToken,
  authorize('super_admin', 'office_staff'),
  tclcController.getAllRequests
);

// ===== PARAMETERIZED ROUTES =====
router.get(
  '/:id/eligibility',
  verifyToken,
  authorize('super_admin', 'office_staff'),
  tclcController.checkEligibility
);

router.put(
  '/:id/approve',
  verifyToken,
  authorize('super_admin', 'office_staff'),
  tclcController.approveRequest
);

router.put(
  '/:id/reject',
  verifyToken,
  authorize('super_admin', 'office_staff'),
  tclcController.rejectRequest
);

// Download PDF — staff OR the student who owns it
router.get(
  '/:id/pdf',
  verifyToken,
  authorize('super_admin', 'office_staff', 'student'),
  tclcController.downloadPDF
);

// Request details — staff OR the student who owns it
router.get(
  '/:id',
  verifyToken,
  authorize('super_admin', 'office_staff', 'student'),
  tclcController.getRequestDetails
);

module.exports = router;