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