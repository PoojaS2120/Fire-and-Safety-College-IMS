const feeService = require('../services/feeService');

// 1. Generate Ledger
exports.generateLedger = async (req, res, next) => {
  try {
    const { studentId, courseId } = req.body;
    const result = await feeService.generateFeeLedger(studentId, courseId);
    res.status(201).json({ success: true, message: 'Fee ledger generated', data: result });
  } catch (err) { next(err); }
};

// 2. Get Summary
exports.getSummary = async (req, res, next) => {
  try {
    const result = await feeService.getFeeSummary(req.params.studentId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

// 3. Check Eligibility
exports.checkEligibility = async (req, res, next) => {
  try {
    const result = await feeService.checkExamEligibility(req.params.studentId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

// 4. Record Payment
exports.recordPayment = async (req, res, next) => {
  try {
    const { studentId, amount, mode, reference_no } = req.body;
    if (!studentId || !amount || !mode) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const payment = await feeService.recordPayment(studentId, amount, mode, reference_no, req.user.id);
    res.status(201).json({ success: true, message: 'Payment recorded', data: payment });
  } catch (err) { next(err); }
};

// 5. Download Receipt PDF
exports.downloadReceipt = async (req, res, next) => {
  try {
    const pdfStream = await feeService.generateReceiptPDF(req.params.paymentId);
    
    // Set headers to download the PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt_${req.params.paymentId}.pdf`);

    // Pipe the PDF stream to the response
    pdfStream.pipe(res);
  } catch (err) { next(err); }
};
// 6. Pending Fees
exports.getPendingFees = async (req, res, next) => {
  try {
    const pending = await feeService.getPendingFeesList();
    res.status(200).json({ success: true, data: pending });
  } catch (err) { next(err); }
};

// 7. Cancel Payment
exports.cancelPayment = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Cancel reason is required' });

    const result = await feeService.cancelPayment(req.params.paymentId, reason, req.user.id, req.ip);
    res.status(200).json({ success: true, message: result.message });
  } catch (err) { next(err); }
};

// 8. STUDENT APP: Get Own Fees
exports.getMyFees = async (req, res, next) => {
  try {
    const Student = require('../../students/models/Student');
    // Get student profile using the user ID from the token
    const student = await Student.findOne({ user_id: req.user.id });
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

    const summary = await feeService.getFeeSummary(student._id);
    res.status(200).json({ success: true, data: summary });
  } catch (err) { next(err); }
};

// 9. STUDENT APP: Get Own Payments
exports.getMyPayments = async (req, res, next) => {
  try {
    const Student = require('../../students/models/Student');
    const student = await Student.findOne({ user_id: req.user.id });
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

    const payments = await require('../models/Payment').find({ student_id: student._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: payments });
  } catch (err) { next(err); }
};