const mongoose = require('mongoose');
const Student = require('../../students/models/Student');
const StudentFee = require('../models/StudentFee');
const FeeComponent = require('../../courses/models/FeeComponent');
const ConcessionMaster = require('../models/ConcessionMaster');
const auditService = require('../../audit/services/auditService');

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
const createError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Split netTotal across `count` installments so that the sum is EXACTLY netTotal.
 * The last installment absorbs any rounding remainder.
 */
const splitInstallments = (netTotal, count) => {
  if (count <= 1) return [round2(netTotal)];
  const base = round2(netTotal / count);
  const parts = Array(count).fill(base);
  parts[count - 1] = round2(netTotal - round2(base * (count - 1)));
  return parts;
};

const computeConcessionAmount = (baseAmount, concession) => {
  if (!concession) return 0;
  return concession.type === 'percentage'
    ? round2((baseAmount * concession.value) / 100)
    : round2(Math.min(concession.value, baseAmount));
};

const isApplicable = (concession, feeComponentId) => {
  if (!concession) return false;
  if (concession.applicable_to === 'all_fees') return true;
  return (
    Array.isArray(concession.specific_fee_ids) &&
    concession.specific_fee_ids.some(
      (id) => String(id) === String(feeComponentId)
    )
  );
};

// ================================================================
// A. GENERATE INSTALLMENT ROWS
//     - Only handles components whose effective installment count > 1
//     - One-time components are skipped (your existing feeService handles them)
// ================================================================
exports.generateWithInstallments = async (studentId, courseId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw createError(400, 'Invalid student ID.');
  }
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw createError(400, 'Invalid course ID.');
  }

  const components = await FeeComponent.find({
    course_id: courseId,
    status: 'active',
  });
  if (components.length === 0) {
    throw createError(400, 'No active fee components found for this course.');
  }

  // Optional concession passed at generation time
  let concession = null;
  if (options.concession_id) {
    if (!mongoose.Types.ObjectId.isValid(options.concession_id)) {
      throw createError(400, 'Invalid concession ID.');
    }
    concession = await ConcessionMaster.findById(options.concession_id);
    if (!concession || concession.status !== 'active') {
      throw createError(400, 'Concession not found or inactive.');
    }
  }

  const startDate = options.start_date
    ? new Date(options.start_date)
    : new Date();
  if (Number.isNaN(startDate.getTime())) {
    throw createError(400, 'Invalid start_date.');
  }

  const overrideInstallments =
    Number.isInteger(options.number_of_installments) &&
    options.number_of_installments > 0
      ? options.number_of_installments
      : null;

  // Existing rows → skip duplicates
  const existing = await StudentFee.find({
    student_id: studentId,
    course_id: courseId,
  }).select('fee_component_id installment_number');
  const existingKeys = new Set(
    existing.map((f) => `${f.fee_component_id}_${f.installment_number}`)
  );

  const toInsert = [];

  for (const comp of components) {
    const totalInstallments =
      overrideInstallments ||
      comp.installment_config?.number_of_installments ||
      1;

    // One-time components are owned by your existing feeService.generateFeeLedger
    if (totalInstallments <= 1) continue;

    const applicable = isApplicable(concession, comp._id);
    const fullConcession = applicable
      ? computeConcessionAmount(comp.amount, concession)
      : 0;
    const netTotal = round2(comp.amount - fullConcession);
    const split = splitInstallments(netTotal, totalInstallments);

    for (let i = 1; i <= totalInstallments; i++) {
      const key = `${comp._id}_${i}`;
      if (existingKeys.has(key)) continue;

      const dueDate = new Date(
        new Date(startDate).setDate(startDate.getDate() + (i - 1) * 30)
      );

      toInsert.push({
        student_id: studentId,
        course_id: courseId,
        fee_component_id: comp._id,
        fee_name: comp.name,
        original_amount: i === 1 ? comp.amount : 0,
        concession_id: applicable ? concession._id : null,
        concession_amount: i === 1 ? fullConcession : 0,
        concession_reason: applicable && i === 1 ? concession.name : null,
        amount_due: split[i - 1],
        installment_number: i,
        total_installments: totalInstallments,
        amount_paid: 0,
        due_date: dueDate,
        required_for_exam: comp.required_for_exam,
        status: 'pending',
      });
    }
  }

  if (toInsert.length > 0) {
    await StudentFee.insertMany(toInsert);
  }

  return StudentFee.find({ student_id: studentId, course_id: courseId })
    .populate('fee_component_id', 'name')
    .populate('concession_id', 'name code')
    .sort({ fee_component_id: 1, installment_number: 1 });
};

// ================================================================
// B. APPLY CONCESSION
//     - Re-splits net amount across existing installments
//     - Enforces group / old-student / no-payment-after rules
// ================================================================
exports.applyConcession = async (studentId, concessionId, adminId, ip = null) => {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw createError(400, 'Invalid student ID.');
  }
  if (!mongoose.Types.ObjectId.isValid(concessionId)) {
    throw createError(400, 'Invalid concession ID.');
  }

  const student = await Student.findById(studentId);
  if (!student) throw createError(404, 'Student not found.');

  const concession = await ConcessionMaster.findById(concessionId);
  if (!concession || concession.status !== 'active') {
    throw createError(404, 'Concession not found or inactive.');
  }

  // Same concession → idempotent
  if (student.concession_id) {
    if (String(student.concession_id) === String(concessionId)) {
      return {
        message: 'Concession is already applied to this student.',
        concession: {
          id: concession._id,
          name: concession.name,
          type: concession.type,
          value: concession.value,
        },
        updatedFees: 0,
      };
    }
    throw createError(
      400,
      'A different concession is already applied. Remove it first.'
    );
  }

  // Group rule: min_students (excluding current student)
  if (concession.concession_type === 'group') {
    const others = await Student.countDocuments({
      course_id: student.course_id,
      batch_id: student.batch_id,
      concession_id: concessionId,
      status: 'active',
      _id: { $ne: student._id },
    });
    if (others < concession.min_students - 1) {
      throw createError(
        400,
        `Group concession requires at least ${concession.min_students} students in the same course and batch. Currently ${others} other student(s) hold it.`
      );
    }
  }

  // Old-student rule
  if (
    concession.concession_type === 'old_student' &&
    student.admission_type !== 'old'
  ) {
    throw createError(
      400,
      'Old Student concession can only be applied to re-enrolling students.'
    );
  }

  // No payments yet
  const paid = await StudentFee.findOne({
    student_id: studentId,
    amount_paid: { $gt: 0 },
  });
  if (paid) {
    throw createError(
      400,
      'Cannot apply concession after payment has been made. Reverse payments first.'
    );
  }

  const pendingFees = await StudentFee.find({
    student_id: studentId,
    status: { $in: ['pending', 'partial'] },
  });

  // Group by component so we can re-split across installments
  const byComponent = {};
  for (const fee of pendingFees) {
    const k = String(fee.fee_component_id);
    (byComponent[k] = byComponent[k] || []).push(fee);
  }

  let updated = 0;

  for (const componentId of Object.keys(byComponent)) {
    if (!isApplicable(concession, componentId)) continue;

    const rows = byComponent[componentId].sort(
      (a, b) => a.installment_number - b.installment_number
    );
    const totalInstallments = rows[0].total_installments;

    // Determine the "full original" for this component.
    // For installment rows, original_amount lives on installment 1.
    // For legacy one-time rows (no installment fields), it's absent → use sum.
    const fullOriginal =
      rows[0].original_amount > 0
        ? rows[0].original_amount
        : round2(rows.reduce((s, r) => s + r.amount_due, 0));

    const fullConcession = computeConcessionAmount(fullOriginal, concession);
    const netTotal = round2(fullOriginal - fullConcession);
    const split = splitInstallments(netTotal, totalInstallments);

    for (const fee of rows) {
      fee.original_amount = fee.installment_number === 1 ? fullOriginal : 0;
      fee.concession_id = concession._id;
      fee.concession_amount =
        fee.installment_number === 1 ? fullConcession : 0;
      fee.concession_reason =
        fee.installment_number === 1 ? concession.name : null;
      fee.amount_due = split[fee.installment_number - 1] ?? fee.amount_due;
      fee.updated_by = adminId;

      // Re-evaluate status
      if (fee.amount_paid >= fee.amount_due) fee.status = 'paid';
      else if (fee.amount_paid > 0) fee.status = 'partial';
      else fee.status = 'pending';

      await fee.save();
      updated++;
    }
  }

  student.concession_id = concession._id;
  student.concession_applied_at = new Date();
  student.concession_applied_by = adminId;
  await student.save();

  await auditService.logAction({
    userId: adminId,
    action: 'APPLY_CONCESSION',
    entity: 'Student',
    entityId: student._id,
    newValues: {
      concession_id: concession._id,
      concession_name: concession.name,
      updated_fees: updated,
    },
    ip,
  });

  return {
    message: `Concession "${concession.name}" applied successfully.`,
    concession: {
      id: concession._id,
      name: concession.name,
      type: concession.type,
      value: concession.value,
    },
    updatedFees: updated,
  };
};

// ================================================================
// C. REMOVE CONCESSION
// ================================================================
exports.removeConcession = async (studentId, adminId, ip = null) => {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw createError(400, 'Invalid student ID.');
  }

  const student = await Student.findById(studentId);
  if (!student) throw createError(404, 'Student not found.');
  if (!student.concession_id) {
    return { message: 'No concession applied to this student.' };
  }

  const paid = await StudentFee.findOne({
    student_id: studentId,
    amount_paid: { $gt: 0 },
  });
  if (paid) {
    throw createError(
      400,
      'Cannot remove concession after payment has been made.'
    );
  }

  const pendingFees = await StudentFee.find({
    student_id: studentId,
    status: { $in: ['pending', 'partial'] },
  });

  const byComponent = {};
  for (const fee of pendingFees) {
    const k = String(fee.fee_component_id);
    (byComponent[k] = byComponent[k] || []).push(fee);
  }

  const prevConcessionId = student.concession_id;

  for (const componentId of Object.keys(byComponent)) {
    const rows = byComponent[componentId].sort(
      (a, b) => a.installment_number - b.installment_number
    );
    const fullOriginal =
      rows[0].original_amount > 0
        ? rows[0].original_amount
        : round2(rows.reduce((s, r) => s + r.amount_due, 0));
    const split = splitInstallments(fullOriginal, rows[0].total_installments);

    for (const fee of rows) {
      fee.original_amount = fee.installment_number === 1 ? fullOriginal : 0;
      fee.concession_id = null;
      fee.concession_amount = 0;
      fee.concession_reason = null;
      fee.amount_due = split[fee.installment_number - 1] ?? fee.amount_due;

      if (fee.amount_paid >= fee.amount_due) fee.status = 'paid';
      else if (fee.amount_paid > 0) fee.status = 'partial';
      else fee.status = 'pending';

      await fee.save();
    }
  }

  student.concession_id = null;
  student.concession_applied_at = null;
  student.concession_applied_by = null;
  await student.save();

  await auditService.logAction({
    userId: adminId,
    action: 'REMOVE_CONCESSION',
    entity: 'Student',
    entityId: student._id,
    oldValues: { concession_id: prevConcessionId },
    newValues: { concession_id: null },
    ip,
  });

  return { message: 'Concession removed successfully.' };
};

// ================================================================
// D. INSTALLMENT-AWARE FEE SUMMARY
//     - Groups rows by component
//     - Totals are computed from installment 1 only (no double-count)
// ================================================================
exports.getInstallmentSummary = async (studentId) => {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw createError(400, 'Invalid student ID.');
  }

  const student = await Student.findById(studentId).populate(
    'concession_id',
    'name code type value'
  );
  if (!student) throw createError(404, 'Student not found.');

  const fees = await StudentFee.find({ student_id: studentId })
    .populate('course_id', 'name')
    .sort({ fee_component_id: 1, installment_number: 1 });

  if (!fees.length) {
    throw createError(404, 'No fee records found for this student.');
  }

  const grouped = {};
  let totalOriginal = 0;
  let totalConcession = 0;
  let totalDue = 0;
  let totalPaid = 0;

  for (const fee of fees) {
    const key = String(fee.fee_component_id);

    if (!grouped[key]) {
      grouped[key] = {
        fee_component_id: fee.fee_component_id,
        fee_name: fee.fee_name,
        original_amount: 0,
        concession_amount: 0,
        concession_reason: null,
        total_installments: fee.total_installments || 1,
        required_for_exam: fee.required_for_exam,
        installments: [],
      };
    }
    const g = grouped[key];

    // Component-level amounts live on installment 1 only
    if (fee.installment_number === 1) {
      // Fallback for legacy one-time rows: if original_amount is 0, use amount_due
      g.original_amount =
        fee.original_amount > 0 ? fee.original_amount : fee.amount_due;
      g.concession_amount = fee.concession_amount || 0;
      g.concession_reason = fee.concession_reason || null;
      totalOriginal += g.original_amount;
      totalConcession += g.concession_amount;
    }

    g.installments.push({
      _id: fee._id,
      installment_number: fee.installment_number || 1,
      amount_due: fee.amount_due,
      amount_paid: fee.amount_paid,
      balance: Math.max(0, round2(fee.amount_due - fee.amount_paid)),
      due_date: fee.due_date,
      status: fee.status,
      required_for_exam: fee.required_for_exam,
    });

    totalDue += fee.amount_due;
    totalPaid += fee.amount_paid;
  }

  return {
    student: {
      _id: student._id,
      student_id: student.student_id,
      full_name: student.full_name,
      admission_type: student.admission_type,
      concession: student.concession_id
        ? {
            id: student.concession_id._id,
            name: student.concession_id.name,
            code: student.concession_id.code,
            type: student.concession_id.type,
            value: student.concession_id.value,
            applied_at: student.concession_applied_at,
          }
        : null,
    },
    totals: {
      originalAmount: round2(totalOriginal),
      concessionAmount: round2(totalConcession),
      finalAmount: round2(totalDue),
      paidAmount: round2(totalPaid),
      balance: round2(Math.max(0, totalDue - totalPaid)),
    },
    fees: Object.values(grouped),
  };
};