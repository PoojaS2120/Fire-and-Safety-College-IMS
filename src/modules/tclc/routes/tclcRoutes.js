const express = require('express');
const router = express.Router();
const tclcController = require('../controllers/tclcController');
const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

// Request TC/LC (Office Staff or Admin)
router.post('/', verifyToken, authorize('super_admin', 'office_staff'), tclcController.requestCertificate);

// Approve / Reject (Super Admin or Office Staff)
router.patch('/:id/approve', verifyToken, authorize('super_admin', 'office_staff'), tclcController.approveRequest);
router.patch('/:id/reject', verifyToken, authorize('super_admin', 'office_staff'), tclcController.rejectRequest);

// Download PDF (Admin, Staff, or the Student themselves)
router.get('/:id/pdf', verifyToken, tclcController.downloadPDF);

module.exports = router;