const StudentFee = require('../models/StudentFee');
const FeeComponent = require('../../courses/models/FeeComponent');
const Payment = require('../models/Payment');
const Sequence = require('../../courses/models/Sequence'); 
const PDFDocument = require('pdfkit');

// ================= 1. FEE LEDGER =================

exports.generateFeeLedger = async (studentId, courseId) => {
  const components = await FeeComponent.find({ course_id: courseId, status: 'active' });
  
  if (components.length === 0) {
    throw { statusCode: 400, message: 'No active fee components found for this course' };
  }

  const ledgerEntries = components.map(comp => ({
    student_id: studentId,
    course_id: courseId,
    fee_component_id: comp._id,
    fee_name: comp.name,
    amount_due: comp.amount,
    amount_paid: 0,
    required_for_exam: comp.required_for_exam,
    status: 'pending'
  }));

  return await StudentFee.insertMany(ledgerEntries);
};

exports.getFeeSummary = async (studentId) => {
  const fees = await StudentFee.find({ student_id: studentId });

  if (!fees || fees.length === 0) {
    throw { statusCode: 404, message: 'No fee records found for this student' };
  }

  const totalDue = fees.reduce((sum, item) => sum + item.amount_due, 0);
  const totalPaid = fees.reduce((sum, item) => sum + item.amount_paid, 0);
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

exports.recordPayment = async (studentId, amount, mode, reference_no, staffId) => {
  const year = new Date().getFullYear();
  const seq = await Sequence.getNextSequence(`receipt_no_${year}`);
  const receiptNo = `RCPT-${year}-${String(seq).padStart(5, '0')}`;

  // 1. Create payment record
  const payment = await Payment.create({
    student_id: studentId,
    amount,
    mode,
    reference_no,
    receipt_no: receiptNo,
    recorded_by: staffId
  });

  // 2. Update the StudentFee Ledger
  let remainingAmount = amount;
  const pendingFees = await StudentFee.find({ student_id: studentId, status: { $ne: 'paid' } }).sort({ createdAt: 1 });

  // Safety check: If they didn't generate the ledger, we just record the payment but don't allocate it
  if (pendingFees.length === 0) {
    console.warn("⚠️ Payment recorded but no pending StudentFee ledger was found to allocate to.");
    return payment;
  }

  for (let fee of pendingFees) {
    if (remainingAmount <= 0) break;

    const balanceForThisFee = fee.amount_due - fee.amount_paid;
    const amountToApply = Math.min(balanceForThisFee, remainingAmount);

    fee.amount_paid += amountToApply;
    remainingAmount -= amountToApply;

    if (fee.amount_paid >= fee.amount_due) {
      fee.status = 'paid';
    } else if (fee.amount_paid > 0) {
      fee.status = 'partial';
    }
    await fee.save();
  }

  return payment;
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