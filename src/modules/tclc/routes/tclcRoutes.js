const express = require('express');
const router = express.Router();
const tclcController = require('../controllers/tclcController');
const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

// 1. Create Request
router.post('/', verifyToken, authorize('super_admin', 'office_staff'), tclcController.requestCertificate);

// 2. List Requests (Added)
router.get('/', verifyToken, authorize('super_admin', 'office_staff'), tclcController.getAllRequests);

// 3. Request Details (Added - Needs custom logic for student access)
router.get('/:id', verifyToken, tclcController.getRequestDetails);

// 4. Check Eligibility (Added)
router.get('/:id/eligibility', verifyToken, authorize('super_admin', 'office_staff'), tclcController.checkEligibility);

// 5. Approve
router.put('/:id/approve', verifyToken, authorize('super_admin', 'office_staff'), tclcController.approveRequest);

// 6. Reject
router.put('/:id/reject', verifyToken, authorize('super_admin', 'office_staff'), tclcController.rejectRequest);

// 7. Download PDF
router.get('/:id/pdf', verifyToken, tclcController.downloadPDF);

module.exports = router;