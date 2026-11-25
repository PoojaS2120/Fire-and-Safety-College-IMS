const mongoose = require('mongoose');
const Student = require('../../students/models/Student');
const StudentFee = require('../models/StudentFee');
const FeeComponent = require('../../courses/models/FeeComponent');
const ConcessionMaster = require('../models/ConcessionMaster');
const auditService = require('../../audit/services/auditService');

const MAX_INSTALLMENTS = 4;

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
const createError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const round2 = (n) => Math.round(n * 100) / 100;

const distribute = (total, weights) => {
  const n = weights.length;
  const totalP = Math.round(total * 100);
  if (n <= 1) return [totalP / 100];

  const sumW = weights.reduce((s, w) => s + Number(w || 0), 0);
  const equal = !(sumW > 0);
  const parts = [];
  let used = 0;
  for (let i = 0; i < n - 1; i++) {
    const share = equal ? 1 / n : Number(weights[i] || 0) / sumW;
    const p = Math.round(totalP * share);
    parts.push(p);
    used += p;
  }
  parts.push(totalP - used);
  return parts.map((p) => p / 100);
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
    concession.specific_fee_ids.some((id) => String(id) === String(feeComponentId))
  );
};

const statusFor = (due, paid) => {
  if (paid >= due) return 'paid';
  if (paid > 0) return 'partial';
  return 'pending';
};

const addMonthsUTC = (date, n) => {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d;
};

const todayUTC = () => {
  const t = new Date();
  return new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()));
};

// ----------------------------------------------------------------
// Build + validate the payment schedule
// ----------------------------------------------------------------
const buildSchedule = (options, grossTotal) => {
  if (Array.isArray(options.installments) && options.installments.length > 0) {
    const list = options.installments;
    if (list.length > MAX_INSTALLMENTS) {
      throw createError(400, `Maximum ${MAX_INSTALLMENTS} installments allowed.`);
    }
    const schedule = list.map((r, i) => {
      const due = new Date(r.due_date || r.date);
      const amount = round2(Number(r.amount));
      if (Number.isNaN(due.getTime())) {
        throw createError(400, `Installment ${i + 1}: due date is invalid.`);
      }
      if (!(amount > 0)) {
        throw createError(400, `Installment ${i + 1}: amount must be greater than 0.`);
      }
      return { due_date: due, amount };
    });

    for (let i = 1; i < schedule.length; i++) {
      if (schedule[i].due_date <= schedule[i - 1].due_date) {
        throw createError(400, `Installment ${i + 1}: due date must be after installment ${i}.`);
      }
    }

    const sum = round2(schedule.reduce((s, r) => s + r.amount, 0));
    if (Math.abs(sum - grossTotal) > 0.01) {
      throw createError(
        400,
        `Installment amounts (${sum}) must equal the total (${grossTotal}).`
      );
    }
    return schedule;
  }

  const n = Math.max(1, Math.min(MAX_INSTALLMENTS, parseInt(options.number_of_installments, 10) || 1));
  const start = options.start_date ? new Date(options.start_date) : todayUTC();
  if (Number.isNaN(start.getTime())) {
    throw createError(400, 'start_date is invalid.');
  }

  const amounts = distribute(grossTotal, new Array(n).fill(1));
  const schedule = [];
  for (let i = 0; i < n; i++) {
    schedule.push({ due_date: addMonthsUTC(start, i), amount: amounts[i] });
  }
  return schedule;
};

// ----------------------------------------------------------------
// Generate installments for one student
// ----------------------------------------------------------------
exports.generateWithInstallments = async (
  studentId,
  courseId,
  options = {},
  adminId = null,
  ip = null
) => {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw createError(400, 'Invalid student ID.');
  }
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw createError(400, 'Invalid course ID.');
  }

  const student = await Student.findById(studentId);
  if (!student) throw createError(404, 'Student not found.');

  // 🚨 GATEKEEPER RULE: Ensure they are in the 'fees' stage
  if (student.lifecycle_stage === 'admission' || student.lifecycle_stage === 'documents') {
    throw createError(400, 'Please complete the admission process and move the student to the "Fees" stage first.');
  }

  const components = await FeeComponent.find({
    course_id: courseId,
    status: 'active',
  });

  if (components.length === 0) {
    throw createError(400, 'No active fee components for this course.');
  }

  // 🚨 THE FIX: Delete the existing 1-time fee rows before creating installments
  await StudentFee.deleteMany({
    student_id: studentId,
    course_id: courseId,
    total_installments: 1 // Only delete the base 1-time fees
  });

  let concession = null;
  if (options.concession_id) {
    if (!mongoose.Types.ObjectId.isValid(options.concession_id)) {
      throw createError(400, 'Invalid concession ID.');
    }
    concession = await ConcessionMaster.findById(options.concession_id);
    if (!concession || concession.status !== 'active') {
      throw createError(404, 'Concession not found or inactive.');
    }
  }

  // Build rows grouped per component
  const allRows = [];

  for (const comp of components) {
    // Base amount (full fee for this component)
    const baseAmount = round2(Number(comp.amount));

    // Concession for this component (if applicable)
    const concessionAmount = isApplicable(concession, comp._id)
      ? computeConcessionAmount(baseAmount, concession)
      : 0;

    // Net total after concession
    const netTotal = round2(baseAmount - concessionAmount);

    // Build schedule
    const schedule = buildSchedule(options, netTotal);

    // Create one row per installment
    schedule.forEach((s, idx) => {
      allRows.push({
        student_id: studentId,
        course_id: courseId,
        fee_component_id: comp._id,
        fee_name: comp.name,

        // Only store original/concession ON INSTALLMENT 1 (keep later rows 0)
        original_amount: idx === 0 ? baseAmount : 0,
        concession_id: idx === 0 ? (concession ? concession._id : null) : null,
        concession_amount: idx === 0 ? concessionAmount : 0,
        concession_reason: idx === 0 ? (concession ? concession.name : null) : null,

        amount_due: s.amount,
        amount_paid: 0,

        installment_number: idx + 1,
        total_installments: schedule.length,

        due_date: s.due_date,
        required_for_exam: comp.required_for_exam,
        status: 'pending',
      });
    });
  }

  await StudentFee.insertMany(allRows);

  // Audit log
  if (adminId) {
    await auditService.logAction({
      userId: adminId,
      action: 'GENERATE_FEE_LEDGER',
      entity: 'StudentFee',
      entityId: studentId,
      oldValues: null,
      newValues: {
        student_id: studentId,
        course_id: courseId,
        total_rows: allRows.length,
        concession_id: concession ? concession._id : null,
      },
      ip,
    });
  }

  return StudentFee.find({ student_id: studentId, course_id: courseId })
    .sort({ fee_component_id: 1, installment_number: 1 });
};

// ----------------------------------------------------------------
// Summary — reads original/concession from installment 1 only
// ----------------------------------------------------------------
exports.getInstallmentSummary = async (studentId) => {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw createError(400, 'Invalid student ID.');
  }

  const fees = await StudentFee.find({ student_id: studentId })
    .populate('course_id', 'name')
    .populate('concession_id', 'name code')
    .sort({ fee_component_id: 1, installment_number: 1 });

  if (!fees || fees.length === 0) {
    throw createError(404, 'No fee records found for this student.');
  }

  // Group by component
  const grouped = {};
  fees.forEach((fee) => {
    const key = String(fee.fee_component_id);
    if (!grouped[key]) {
      grouped[key] = {
        fee_component_id: fee.fee_component_id,
        fee_name: fee.fee_name,
        course: fee.course_id ? fee.course_id.name : null,
        original_amount: 0,
        concession_amount: 0,
        concession_name: null,
        total_installments: fee.total_installments,
        installments: [],
      };
    }

    // original/concession stored on installment 1 only
    if (fee.installment_number === 1) {
      grouped[key].original_amount = fee.original_amount || 0;
      grouped[key].concession_amount = fee.concession_amount || 0;
      grouped[key].concession_name = fee.concession_id ? fee.concession_id.name : null;
    }

    grouped[key].installments.push({
      _id: fee._id,
      installment_number: fee.installment_number,
      amount_due: fee.amount_due,
      amount_paid: fee.amount_paid,
      balance: Math.max(0, round2(fee.amount_due - fee.amount_paid)),
      due_date: fee.due_date,
      status: fee.status,
      required_for_exam: fee.required_for_exam,
    });
  });

  // Totals across all components
  let totalOriginal = 0;
  let totalConcession = 0;
  let totalDue = 0;
  let totalPaid = 0;

  const componentSummaries = Object.values(grouped).map((c) => {
    const cDue = c.installments.reduce((s, i) => s + i.amount_due, 0);
    const cPaid = c.installments.reduce((s, i) => s + i.amount_paid, 0);
    const cBalance = Math.max(0, round2(cDue - cPaid));

    totalOriginal += c.original_amount;
    totalConcession += c.concession_amount;
    totalDue += cDue;
    totalPaid += cPaid;

    return {
      ...c,
      component_due: round2(cDue),
      component_paid: round2(cPaid),
      component_balance: cBalance,
    };
  });

  return {
    student_id: studentId,
    totals: {
      original: round2(totalOriginal),
      concession: round2(totalConcession),
      due: round2(totalDue),
      paid: round2(totalPaid),
      balance: Math.max(0, round2(totalDue - totalPaid)),
    },
    components: componentSummaries,
  };
};

// ----------------------------------------------------------------
// Apply concession to ONE student
// ----------------------------------------------------------------
exports.applyConcession = async (studentId, concessionId, adminId, ip = null) => {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw createError(400, 'Invalid student ID.');
  }
  if (!mongoose.Types.ObjectId.isValid(concessionId)) {
    throw createError(400, 'Invalid concession ID.');
  }

  const student = await Student.findById(studentId);
  if (!student) throw createError(404, 'Student not found.');

  // 🚨 GATEKEEPER RULE
  if (student.lifecycle_stage === 'admission' || student.lifecycle_stage === 'documents') {
    throw createError(400, 'Please complete the admission process and move the student to the "Fees" stage first.');
  }

  const concession = await ConcessionMaster.findById(concessionId);
  if (!concession || concession.status !== 'active') {
    throw createError(404, 'Concession not found or inactive.');
  }

  // Old-student check
  if (concession.concession_type === 'old_student' && student.admission_type !== 'old') {
    throw createError(400, 'Old Student concession can only be applied to re-enrolling students.');
  }

  // Block if any payment is made
  const paid = await StudentFee.findOne({ student_id: studentId, amount_paid: { $gt: 0 } });
  if (paid) {
    throw createError(400, 'Cannot apply concession after payment has been made.');
  }

  // Fetch pending fees grouped by component
  const fees = await StudentFee.find({
    student_id: studentId,
    status: { $in: ['pending', 'partial'] },
  }).sort({ fee_component_id: 1, installment_number: 1 });

  if (fees.length === 0) {
    throw createError(400, 'No pending fees to apply concession to.');
  }

  // Group by component
  const grouped = {};
  fees.forEach((f) => {
    const key = String(f.fee_component_id);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(f);
  });

  // Apply concession per component
  let updatedCount = 0;

  for (const [compId, rows] of Object.entries(grouped)) {
    if (!isApplicable(concession, compId)) continue;

    const first = rows[0];

    // Base (original) amount = amount_due on installment 1 * total_installments
    const baseAmount = round2(first.amount_due * first.total_installments);

    // Compute concession for this component
    const concessionAmount = computeConcessionAmount(baseAmount, concession);
    const netTotal = round2(baseAmount - concessionAmount);

    // Distribute net across installments
    const weights = rows.map((r) => r.amount_due);
    const newAmounts = distribute(netTotal, weights);

    // Apply new amounts
    rows.forEach((r, idx) => {
      r.amount_due = newAmounts[idx];
      r.status = statusFor(r.amount_due, r.amount_paid);
      r.updated_by = adminId;

      // Store original/concession on installment 1 only
      if (r.installment_number === 1) {
        r.original_amount = baseAmount;
        r.concession_id = concession._id;
        r.concession_amount = concessionAmount;
        r.concession_reason = concession.name;
      }

      updatedCount++;
    });

    await Promise.all(rows.map((r) => r.save()));
  }

  // Update student record
  student.concession_id = concession._id;
  student.concession_applied_at = new Date();
  student.concession_applied_by = adminId;
  await student.save();

  await auditService.logAction({
    userId: adminId,
    action: 'APPLY_CONCESSION',
    entity: 'Student',
    entityId: studentId,
    oldValues: null,
    newValues: {
      concession_id: concession._id,
      concession_name: concession.name,
      updated_rows: updatedCount,
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
    updated_installments: updatedCount,
  };
};

// ----------------------------------------------------------------
// Apply group concession to MANY students
// ----------------------------------------------------------------
exports.applyGroupConcession = async (
  concessionId,
  studentIds,
  adminId,
  ip = null
) => {
  if (!mongoose.Types.ObjectId.isValid(concessionId)) {
    throw createError(400, 'Invalid concession ID.');
  }
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw createError(400, 'student_ids must be a non-empty array.');
  }

  const concession = await ConcessionMaster.findById(concessionId);
  if (!concession || concession.status !== 'active') {
    throw createError(404, 'Concession not found or inactive.');
  }

  const results = {
    success: [],
    failed: [],
  };

  for (const sid of studentIds) {
    try {
      const r = await exports.applyConcession(sid, concessionId, adminId, ip);
      results.success.push({ student_id: sid, message: r.message });
    } catch (err) {
      results.failed.push({ student_id: sid, error: err.message });
    }
  }

  return {
    message: `Applied to ${results.success.length} student(s). Failed: ${results.failed.length}.`,
    concession: {
      id: concession._id,
      name: concession.name,
    },
    results,
  };
};

// ----------------------------------------------------------------
// Remove concession
// ----------------------------------------------------------------
exports.removeConcession = async (studentId, adminId, ip = null) => {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw createError(400, 'Invalid student ID.');
  }

  const student = await Student.findById(studentId);
  if (!student) throw createError(404, 'Student not found.');

  // Block if any payment is made
  const paid = await StudentFee.findOne({ student_id: studentId, amount_paid: { $gt: 0 } });
  if (paid) {
    throw createError(400, 'Cannot remove concession after payment has been made.');
  }

  const fees = await StudentFee.find({
    student_id: studentId,
    status: { $in: ['pending', 'partial'] },
  }).sort({ fee_component_id: 1, installment_number: 1 });

  if (fees.length === 0) {
    throw createError(400, 'No pending fees to remove concession from.');
  }

  // Group by component
  const grouped = {};
  fees.forEach((f) => {
    const key = String(f.fee_component_id);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(f);
  });

  for (const [compId, rows] of Object.entries(grouped)) {
    const first = rows[0];

    // Base = original_amount stored on installment 1 (or reconstruct if missing)
    const baseAmount =
      first.original_amount > 0
        ? first.original_amount
        : round2(first.amount_due * first.total_installments);

    // Distribute base back across installments
    const weights = rows.map((r) => r.amount_due);
    const newAmounts = distribute(baseAmount, weights);

    rows.forEach((r, idx) => {
      r.amount_due = newAmounts[idx];
      r.status = statusFor(r.amount_due, r.amount_paid);
      r.updated_by = adminId;

      if (r.installment_number === 1) {
        r.original_amount = 0;
        r.concession_id = null;
        r.concession_amount = 0;
        r.concession_reason = null;
      }
    });

    await Promise.all(rows.map((r) => r.save()));
  }

  // Reset student
  student.concession_id = null;
  student.concession_applied_at = null;
  student.concession_applied_by = null;
  await student.save();

  await auditService.logAction({
    userId: adminId,
    action: 'REMOVE_CONCESSION',
    entity: 'Student',
    entityId: studentId,
    oldValues: null,
    newValues: null,
    ip,
  });

  return { message: 'Concession removed successfully.' };
};