const express = require('express');
const router = express.Router();
const feeController = require('../controllers/feeController');
const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

// Generate fees (Admin only)
router.post('/generate', verifyToken, authorize('super_admin', 'office_staff'), feeController.generateLedger);

// Get summary (Admin or the student themselves)
router.get('/:studentId/summary', verifyToken, feeController.getSummary);

// Check exam eligibility
router.get('/:studentId/eligibility', verifyToken, feeController.checkEligibility);

module.exports = router;
