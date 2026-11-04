const mongoose = require('mongoose');
const Student = require('../../students/models/Student');
const feeService = require('../services/feeService');
const Payment = require('../models/Payment');

// ==========================================================
// 1. GENERATE LEDGER (Staff only)
// ==========================================================
exports.generateLedger = async (req, res, next) => {
  try {
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'studentId and courseId are required',
      });
    }

    const result = await feeService.generateFeeLedger(studentId, courseId);
    return res.status(201).json({
      success: true,
      message: 'Fee ledger generated',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================================
// 2. FEE SUMMARY
//    - Staff: /fees/:studentId/summary
//    - Student: /fees/my/fees  OR  /student/fees/summary
// ==========================================================
exports.getSummary = async (req, res, next) => {
  try {
    let studentId = req.params.studentId;

    // Student branch: resolve own studentId from token
    if (req.user.role === 'student') {
      const student = await Student.findOne({ user_id: req.user.id });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found',
        });
      }

      // If studentId provided in URL, ensure it matches own
      if (studentId && student._id.toString() !== studentId) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to access this fee summary',
        });
      }

      studentId = student._id;
    }

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'studentId is required',
      });
    }

    const result = await feeService.getFeeSummary(studentId);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ==========================================================
// 3. CHECK ELIGIBILITY
//    - Staff: /fees/:studentId/eligibility
//    - Student: same URL (own enforced)
// ==========================================================
exports.checkEligibility = async (req, res, next) => {
  try {
    let studentId = req.params.studentId;

    if (req.user.role === 'student') {
      const student = await Student.findOne({ user_id: req.user.id });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found',
        });
      }

      if (studentId && student._id.toString() !== studentId) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to check another student's eligibility",
        });
      }

      studentId = student._id;
    }

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'studentId is required',
      });
    }

    const result = await feeService.checkExamEligibility(studentId);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ==========================================================
// 4. RECORD PAYMENT (Staff only)
// ==========================================================
exports.recordPayment = async (req, res, next) => {
  try {
    const { studentId, amount, mode, reference_no, payment_date } = req.body;

    if (!studentId || amount === undefined || !mode) {
      return res.status(400).json({
        success: false,
        message: 'studentId, amount and mode are required',
      });
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a valid number greater than zero',
      });
    }

    const payment = await feeService.recordPayment(
      studentId,
      amount,
      mode,
      reference_no,
      req.user.id,
      payment_date || new Date(),
      req.ip
    );

    return res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: payment,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================================
// 5. GET RECEIPT (JSON)
//    - Staff: any receipt
//    - Student: own only
// ==========================================================
exports.getReceipt = async (req, res, next) => {
  try {
    const receipt = await feeService.getReceiptData(req.params.paymentId);

    // Students can only access their own receipts
    if (req.user.role === 'student') {
      const student = await Student.findOne({ user_id: req.user.id });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found',
        });
      }

      if (receipt.student.student_id !== student.student_id) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to access this receipt',
        });
      }
    }

    return res.status(200).json({ success: true, data: receipt });
  } catch (err) {
    next(err);
  }
};

// ==========================================================
// 6. DOWNLOAD RECEIPT PDF
//    - Staff: any receipt
//    - Student: own only
// ==========================================================
exports.downloadReceipt = async (req, res, next) => {
  try {
    // Students can only download their own receipts
    if (req.user.role === 'student') {
      const student = await Student.findOne({ user_id: req.user.id });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found',
        });
      }

      const payment = await Payment.findById(req.params.paymentId);

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found',
        });
      }

      if (payment.student_id.toString() !== student._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to access this receipt',
        });
      }
    }

    const pdfStream = await feeService.generateReceiptPDF(
      req.params.paymentId
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=receipt_${req.params.paymentId}.pdf`
    );

    pdfStream.on('error', next);
    pdfStream.pipe(res);
  } catch (err) {
    next(err);
  }
};

// ==========================================================
// 7. LIST PENDING FEES (Staff only)
// ==========================================================
exports.getPendingFees = async (req, res, next) => {
  try {
    const pending = await feeService.getPendingFeesList();
    return res.status(200).json({ success: true, data: pending });
  } catch (err) {
    next(err);
  }
};

// ==========================================================
// 8. CANCEL PAYMENT (Super Admin only)
// ==========================================================
exports.cancelPayment = async (req, res, next) => {
  try {
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Cancel reason is required',
      });
    }

    const result = await feeService.cancelPayment(
      req.params.paymentId,
      reason,
      req.user.id,
      req.ip
    );

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================================
// 9. STUDENT APP: GET OWN FEES
//    Endpoint: GET /student/fees  OR  GET /student/fees/summary
// ==========================================================
exports.getMyFees = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user_id: req.user.id });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    const summary = await feeService.getFeeSummary(student._id);
    return res.status(200).json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};

// ==========================================================
// 10. STUDENT APP: GET OWN PAYMENTS
//     Endpoint: GET /student/payments
// ==========================================================
exports.getMyPayments = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user_id: req.user.id });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    const payments = await Payment.find({ student_id: student._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({ success: true, data: payments });
  } catch (err) {
    next(err);
  }
};