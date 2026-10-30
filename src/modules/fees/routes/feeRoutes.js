const express = require('express');
const router = express.Router();
const feeController = require('../controllers/feeController');
const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

// Ledger Generation & Summary
router.post('/generate', verifyToken, authorize('super_admin', 'office_staff'), feeController.generateLedger);
router.get('/:studentId/summary', verifyToken, feeController.getSummary);
router.get('/:studentId/eligibility', verifyToken, feeController.checkEligibility);

// Payments
router.post('/payments', verifyToken, authorize('super_admin', 'office_staff'), feeController.recordPayment);
router.get('/payments/:paymentId/receipt', verifyToken, feeController.downloadReceipt);

module.exports = router;