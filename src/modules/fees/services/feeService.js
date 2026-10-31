const mongoose = require('mongoose');
const Student = require('../../students/models/Student');
const PaymentAllocation = require('../models/PaymentAllocation');
const auditService = require('../../audit/services/auditService');
const StudentFee = require('../models/StudentFee');
const FeeComponent = require('../../courses/models/FeeComponent');
const Payment = require('../models/Payment');
const Sequence = require('../../courses/models/Sequence'); 
const PDFDocument = require('pdfkit');

// ================= 1. FEE LEDGER =================

exports.generateFeeLedger = async (studentId, courseId) => {
  const components = await FeeComponent.find({
    course_id: courseId,
    status: 'active'
  });

  if (components.length === 0) {
    throw {
      statusCode: 400,
      message: 'No active fee components found for this course'
    };
  }

  // Find existing ledger entries for this student and course
  const existingFees = await StudentFee.find({
    student_id: studentId,
    course_id: courseId
  }).select('fee_component_id');

  const existingComponentIds = new Set(
    existingFees.map(fee => fee.fee_component_id.toString())
  );

  // Generate entries only for components not already in the ledger
  const newEntries = components
    .filter(comp => !existingComponentIds.has(comp._id.toString()))
    .map(comp => ({
      student_id: studentId,
      course_id: courseId,
      fee_component_id: comp._id,
      fee_name: comp.name,
      amount_due: comp.amount,
      amount_paid: 0,
      due_date: null,
      required_for_exam: comp.required_for_exam,
      status: 'pending'
    }));

  if (newEntries.length > 0) {
    await StudentFee.insertMany(newEntries);
  }

  // Return the complete ledger
  return await StudentFee.find({
    student_id: studentId,
    course_id: courseId
  }).sort({ createdAt: 1 });
};

exports.getFeeSummary = async (studentId) => {
  const fees = await StudentFee.find({
    student_id: studentId
  }).populate('course_id', 'name');

  if (!fees || fees.length === 0) {
    throw {
      statusCode: 404,
      message: 'No fee records found for this student'
    };
  }

  const totalDue = fees.reduce(
    (sum, item) => sum + Number(item.amount_due || 0),
    0
  );

  const totalPaid = fees.reduce(
    (sum, item) => sum + Number(item.amount_paid || 0),
    0
  );

  const balance = totalDue - totalPaid;

  return {
    totalDue,
    totalPaid,
    balance,
    ledger: fees
  };
};

// ================= 2. EXAM ELIGIBILITY =================

exports.checkExamEligibility = async (studentId) => {
  const pendingRequiredFees = await StudentFee.find({
    student_id: studentId,
    required_for_exam: true,
    status: { $ne: 'paid' }
  });

  if (pendingRequiredFees.length > 0) {
    return {
      eligible: false,
      message: 'Blocked: Pending exam fees.',
      pendingFees: pendingRequiredFees.map(f => f.fee_name)
    };
  }

  return { eligible: true, message: 'Eligible to fill exam form' };
};

// ================= 3. PAYMENTS & RECEIPTS =================



exports.recordPayment = async (
  studentId,
  amount,
  mode,
  reference_no,
  staffId,
  paymentDate = new Date(),
  ip = null
) => {
  const paymentAmount = Math.round(Number(amount) * 100) / 100;

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw { statusCode: 400, message: 'Invalid student ID' };
  }

  if (!mongoose.Types.ObjectId.isValid(staffId)) {
    throw { statusCode: 400, message: 'Invalid staff ID' };
  }

  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    throw { statusCode: 400, message: 'Payment amount must be greater than zero' };
  }

  if (!['cash', 'upi', 'bank', 'cheque'].includes(mode)) {
    throw { statusCode: 400, message: 'Invalid payment mode' };
  }

  const parsedPaymentDate = new Date(paymentDate);

  if (Number.isNaN(parsedPaymentDate.getTime())) {
    throw { statusCode: 400, message: 'Invalid payment date' };
  }

  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {

      // 1. Verify student exists.
      const student = await Student.findById(studentId).session(session);

      if (!student) {
        throw {
          statusCode: 404,
          message: 'Student not found'
        };
      }

      // 2. Fetch outstanding fee ledger entries.
      const pendingFees = await StudentFee.find({
        student_id: studentId,
        status: { $in: ['pending', 'partial'] }
      })
        .sort({ createdAt: 1, _id: 1 })
        .session(session);

      if (pendingFees.length === 0) {
        throw {
          statusCode: 400,
          message: 'No outstanding fee ledger found for this student'
        };
      }

      // 3. Calculate total outstanding balance.
      const totalOutstanding = pendingFees.reduce((total, fee) => {
        return total + Math.round(
          (Number(fee.amount_due) - Number(fee.amount_paid)) * 100
        );
      }, 0) / 100;

      if (paymentAmount > totalOutstanding) {
        throw {
          statusCode: 400,
          message: `Payment exceeds outstanding balance of Rs. ${totalOutstanding}`
        };
      }

      // 4. Generate unique receipt number inside transaction.
      const year = parsedPaymentDate.getFullYear();

      const seq = await Sequence.getNextSequence(
        `receipt_no_${year}`,
        session
      );

      const receiptNo = `RCPT-${year}-${String(seq).padStart(5, '0')}`;

      // 5. Create payment record.
      const [payment] = await Payment.create(
        [{
          student_id: studentId,
          amount: paymentAmount,
          payment_date: parsedPaymentDate,
          mode,
          reference_no: reference_no || null,
          receipt_no: receiptNo,
          created_by: staffId
        }],
        { session }
      );

      // 6. Allocate payment to outstanding fee components.
      let remainingAmount = Math.round(paymentAmount * 100);
      const allocations = [];

      for (const fee of pendingFees) {
        if (remainingAmount <= 0) break;

        const outstanding = Math.round(
          (Number(fee.amount_due) - Number(fee.amount_paid)) * 100
        );

        if (outstanding <= 0) continue;

        const amountToApply = Math.min(outstanding, remainingAmount);

        fee.amount_paid = Math.round(
          (Number(fee.amount_paid) * 100 + amountToApply)
        ) / 100;

        if (fee.amount_paid >= fee.amount_due) {
          fee.status = 'paid';
        } else {
          fee.status = 'partial';
        }

        await fee.save({ session });

        allocations.push({
          payment_id: payment._id,
          student_fee_id: fee._id,
          amount: amountToApply / 100
        });

        remainingAmount -= amountToApply;
      }

      // 7. Ensure the complete payment was allocated.
      if (remainingAmount !== 0) {
        throw {
          statusCode: 400,
          message: 'Payment could not be fully allocated'
        };
      }

      // 8. Save allocation records.
      await PaymentAllocation.insertMany(allocations, { session });

      // 9. Record audit log inside the transaction.
      await auditService.logAction({
        userId: staffId,
        action: 'RECORD_PAYMENT',
        entity: 'Payment',
        entityId: payment._id,
        oldValues: null,
        newValues: {
          student_id: studentId,
          amount: paymentAmount,
          mode,
          receipt_no: receiptNo,
          allocations
        },
        ip,
        session
      });

      result = {
        payment,
        allocations
      };
    });

    return result;

  } finally {
    await session.endSession();
  }
};


exports.generateReceiptPDF = async (paymentId) => {
  // 3. Fixed Population: 'full_name' instead of 'name' because it references the Student model
  const payment = await Payment.findById(paymentId).populate('student_id', 'full_name email');
  
  if (!payment) throw { statusCode: 404, message: 'Payment not found' };

  // If the student_id wasn't populated correctly, or the student was deleted, we fall back
  const studentName = payment.student_id?.full_name || 'Unknown Student';

  const doc = new PDFDocument({ margin: 50 });

  // Header
  doc.fontSize(20).text('Fire & Safety College', { align: 'center' });
  doc.fontSize(14).text('Official Fee Receipt', { align: 'center' });
  doc.moveDown();

  // Details
  doc.fontSize(12).text(`Receipt No: ${payment.receipt_no}`);
  doc.text(`Date: ${new Date(payment.createdAt).toLocaleDateString()}`);
  doc.text(`Student Name: ${studentName}`); // Used the safe variable here
  doc.text(`Payment Mode: ${payment.mode.toUpperCase()}`);
  if (payment.reference_no) doc.text(`Reference: ${payment.reference_no}`);
  doc.moveDown();

  // Amount
  doc.fontSize(16).text(`Amount Received: Rs. ${payment.amount}`, { underline: true });
  doc.moveDown(2);

  doc.fontSize(10).text('This is a computer-generated receipt. No signature required.', { align: 'center', color: 'grey' });

  return doc; 
};
// ================= 4. PENDING FEES LIST =================
exports.getPendingFeesList = async () => {
  return await StudentFee.find({ status: { $ne: 'paid' } })
    .populate('student_id', 'full_name phone student_id')
    .populate('course_id', 'name');
};

// ================= 5. CANCEL PAYMENT =================
exports.cancelPayment = async (paymentId, reason, adminId, ip) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw { statusCode: 404, message: 'Payment not found' };
  if (payment.status === 'cancelled') throw { statusCode: 400, message: 'Payment is already cancelled' };

  // 1. Mark payment as cancelled
  payment.status = 'cancelled';
  payment.cancel_reason = reason;
  payment.cancelled_by = adminId;
  await payment.save();

  // 2. Reverse the allocation from StudentFee
  let amountToReverse = payment.amount;
  const paidFees = await StudentFee.find({ student_id: payment.student_id, amount_paid: { $gt: 0 } }).sort({ updatedAt: -1 });

  for (let fee of paidFees) {
    if (amountToReverse <= 0) break;
    
    const reversibleAmount = Math.min(fee.amount_paid, amountToReverse);
    fee.amount_paid -= reversibleAmount;
    amountToReverse -= reversibleAmount;

    if (fee.amount_paid === 0) fee.status = 'pending';
    else if (fee.amount_paid < fee.amount_due) fee.status = 'partial';
    await fee.save();
  }

  // 3. Log to Audit
  await auditService.logAction({
    userId: adminId,
    action: 'CANCEL_PAYMENT',
    entity: 'Payment',
    entityId: payment._id,
    oldValues: { status: 'active', amount: payment.amount },
    newValues: { status: 'cancelled', reason },
    ip
  });

  return { message: 'Payment cancelled and ledger reversed successfully' };
};