const StudentFee = require('../models/StudentFee');
const FeeComponent = require('../../courses/models/FeeComponent');

// 1. Generate Fee Ledger for a new student
exports.generateFeeLedger = async (studentId, courseId) => {
  // Get all active fee components for this course
  const components = await FeeComponent.find({ course_id: courseId, status: 'active' });
  
  if (components.length === 0) {
    throw { statusCode: 400, message: 'No active fee components found for this course' };
  }

  // Create a ledger entry for each component
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

  // Save to database
  return await StudentFee.insertMany(ledgerEntries);
};

// 2. Get Fee Summary (Total Due, Paid, Balance)
exports.getFeeSummary = async (studentId) => {
  const fees = await StudentFee.find({ student_id: studentId });

  if (!fees || fees.length === 0) {
    throw { statusCode: 404, message: 'No fee records found for this student' };
  }

  // Calculate totals
  const totalDue = fees.reduce((sum, item) => sum + item.amount_due, 0);
  const totalPaid = fees.reduce((sum, item) => sum + item.amount_paid, 0);
  const balance = totalDue - totalPaid;

  return {
    totalDue,
    totalPaid,
    balance,
    ledger: fees // Return the full list so the frontend can show a table
  };
};

// 3. Check Exam Eligibility (Phase 6 Rule)
exports.checkExamEligibility = async (studentId) => {
  // Find all fees that are required for the exam, but not fully paid
  const pendingRequiredFees = await StudentFee.find({
    student_id: studentId,
    required_for_exam: true,
    status: { $ne: 'paid' } // Status is NOT equal to 'paid'
  });

  if (pendingRequiredFees.length > 0) {
    return {
      eligible: false,
      message: 'Blocked: Pending exam fees.',
      pendingFees: pendingRequiredFees.map(f => f.fee_name) // e.g. ["Tuition Fee", "Exam Fee"]
    };
  }

  return { eligible: true, message: 'Eligible to fill exam form' };
};