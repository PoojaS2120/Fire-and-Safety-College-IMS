const mongoose = require('mongoose');
const Student = require('../../students/models/Student');
const StudentFee = require('../models/StudentFee');
const FeeComponent = require('../../courses/models/FeeComponent');
const ConcessionMaster = require('../models/ConcessionMaster');
const auditService = require('../../audit/services/auditService');

const MAX_INSTALLMENTS = 12;

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
 * Split `total` by `weights` so the parts add up to EXACTLY `total`.
 * The last part takes the rounding remainder.
 * If every weight is 0 the split is equal.
 */
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
// Build + validate the payment schedule the super admin chose
//   Option 1:  options.installments = [{ due_date, amount }, ...]   (custom)
//   Option 2:  options.number_of_installments + options.start_date  (equal split, monthly)
//   1 installment = one-time payment
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
        throw createError(400, `Installment ${i + 1} must be due after installment ${i}.`);
      }
    }
    const sum = round2(schedule.reduce((s, r) => s + r.amount, 0));
    if (Math.abs(sum - grossTotal) > 0.01) {
      throw createError(
        400,
        `Installment amounts add up to ${sum} but the course fee is ${grossTotal}. They must match.`
      );
    }
    return schedule;
  }

  const n = options.number_of_installments ? Number(options.number_of_installments) : 1;
  if (!Number.isInteger(n) || n < 1 || n > MAX_INSTALLMENTS) {
    throw createError(400, `Number of installments must be between 1 and ${MAX_INSTALLMENTS}.`);
  }
  const start = options.start_date ? new Date(options.start_date) : todayUTC();
  if (Number.isNaN(start.getTime())) throw createError(400, 'Invalid start_date.');

  const amounts = distribute(grossTotal, Array(n).fill(1));
  return amounts.map((amount, i) => ({ due_date: addMonthsUTC(start, i), amount }));
};

// ================================================================
// A. SET PAYMENT PLAN  (one-time OR installments)
//    - Replaces the student's UNPAID fee rows for this course
//    - Every fee component gets one row per installment
//    - Each installment's amount is shared across the components in the
//      same proportion as the installment amount the super admin typed
//    - Keeps the student's concession (if any)
// ================================================================
exports.generateWithInstallments = async (
  studentId,
  courseId,
  options = {},
  adminId = null,
  ip = null
) => {
  if (!mongoose.Types.ObjectId.isValid(studentId)) throw createError(400, 'Invalid student ID.');
  if (!mongoose.Types.ObjectId.isValid(courseId)) throw createError(400, 'Invalid course ID.');

  const student = await Student.findById(studentId);
  if (!student) throw createError(404, 'Student not found.');

  const components = await FeeComponent.find({ course_id: courseId, status: 'active' });
  if (components.length === 0) {
    throw createError(400, 'No active fee components found for this course.');
  }

  const grossTotal = round2(components.reduce((s, c) => s + Number(c.amount || 0), 0));
  const schedule = buildSchedule(options, grossTotal);
  const total = schedule.length;

  const alreadyPaid = await StudentFee.exists({
    student_id: studentId,
    course_id: courseId,
    amount_paid: { $gt: 0 },
  });
  if (alreadyPaid) {
    throw createError(
      400,
      'A payment has already been recorded for this student. The payment plan cannot be changed. Cancel the payments first.'
    );
  }

  // Keep the concession the student already has
  let concession = null;
  if (student.concession_id) {
    concession = await ConcessionMaster.findById(student.concession_id);
  }

  const weights = schedule.map((s) => s.amount);
  const rows = [];

  for (const comp of components) {
    const applicable = isApplicable(concession, comp._id);
    const fullConcession = applicable ? computeConcessionAmount(comp.amount, concession) : 0;
    const net = round2(comp.amount - fullConcession);
    const parts = distribute(net, weights);

    for (let i = 0; i < total; i++) {
      rows.push({
        student_id: studentId,
        course_id: courseId,
        fee_component_id: comp._id,
        fee_name: comp.name,
        original_amount: i === 0 ? comp.amount : 0,
        concession_id: applicable ? concession._id : null,
        concession_amount: i === 0 ? fullConcession : 0,
        concession_reason: applicable && i === 0 ? concession.name : null,
        amount_due: parts[i],
        amount_paid: 0,
        installment_number: i + 1,
        total_installments: total,
        due_date: schedule[i].due_date,
        required_for_exam: comp.required_for_exam,
        status: parts[i] <= 0 ? 'paid' : 'pending',
        updated_by: adminId,
      });
    }
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await StudentFee.deleteMany({ student_id: studentId, course_id: courseId }, { session });
      await StudentFee.insertMany(rows, { session });
    });
  } finally {
    await session.endSession();
  }

  if (adminId) {
    await auditService.logAction({
      userId: adminId,
      action: 'SET_PAYMENT_PLAN',
      entity: 'StudentFee',
      entityId: student._id,
      newValues: {
        course_id: courseId,
        mode: total === 1 ? 'one_time' : 'installments',
        installments: schedule.map((s, i) => ({
          no: i + 1,
          due_date: s.due_date,
          amount: s.amount,
        })),
      },
      ip,
    });
  }

  return StudentFee.find({ student_id: studentId, course_id: courseId })
    .populate('fee_component_id', 'name')
    .populate('concession_id', 'name code')
    .sort({ installment_number: 1, fee_component_id: 1 });
};

// ----------------------------------------------------------------
// Re-calculate a student's UNPAID fee rows for a concession (or none).
// Keeps the installment dates and the installment proportions.
// ----------------------------------------------------------------
const rescaleStudentFees = async (studentId, concession, adminId) => {
  const fees = await StudentFee.find({ student_id: studentId });

  const byComponent = {};
  for (const fee of fees) {
    const k = `${fee.course_id}_${fee.fee_component_id}`;
    (byComponent[k] = byComponent[k] || []).push(fee);
  }

  let updated = 0;
  for (const rows of Object.values(byComponent)) {
    rows.sort((a, b) => a.installment_number - b.installment_number);
    const componentId = rows[0].fee_component_id;

    // Full fee of this component (stored on installment 1; older rows: sum of rows)
    const fullOriginal =
      rows[0].original_amount > 0
        ? rows[0].original_amount
        : round2(rows.reduce((s, r) => s + r.amount_due, 0));

    const applicable = isApplicable(concession, componentId);
    const fullConcession = applicable ? computeConcessionAmount(fullOriginal, concession) : 0;
    const net = round2(fullOriginal - fullConcession);
    const parts = distribute(net, rows.map((r) => r.amount_due));

    for (let i = 0; i < rows.length; i++) {
      const fee = rows[i];
      const first = i === 0;
      fee.original_amount = first ? fullOriginal : 0;
      fee.concession_id = applicable ? concession._id : null;
      fee.concession_amount = first ? fullConcession : 0;
      fee.concession_reason = applicable && first ? concession.name : null;
      fee.amount_due = parts[i];
      fee.status = statusFor(fee.amount_due, fee.amount_paid);
      fee.updated_by = adminId;
      await fee.save();
      updated++;
    }
  }
  return updated;
};

const assertNoPayments = async (studentId, message) => {
  const paid = await StudentFee.exists({ student_id: studentId, amount_paid: { $gt: 0 } });
  if (paid) throw createError(400, message);
};

const loadActiveConcession = async (concessionId) => {
  if (!mongoose.Types.ObjectId.isValid(concessionId)) {
    throw createError(400, 'Invalid concession ID.');
  }
  const concession = await ConcessionMaster.findById(concessionId);
  if (!concession || concession.status !== 'active') {
    throw createError(404, 'Concession not found or inactive.');
  }
  return concession;
};

const concessionInfo = (c) => ({ id: c._id, name: c.name, type: c.type, value: c.value });

// Rules that depend on the student, not the group
const assertStudentEligible = (student, concession) => {
  if (concession.concession_type === 'old_student' && student.admission_type !== 'old') {
    throw createError(
      400,
      `${student.full_name || 'This student'} is not an old student. The Old Student concession is only for re-enrolling students.`
    );
  }
};

// ================================================================
// B. APPLY CONCESSION TO ONE STUDENT
//    - old_student : student must be an old (re-enrolling) student
//    - group       : use the group apply (needs min_students together)
// ================================================================
exports.applyConcession = async (studentId, concessionId, adminId, ip = null) => {
  if (!mongoose.Types.ObjectId.isValid(studentId)) throw createError(400, 'Invalid student ID.');

  const student = await Student.findById(studentId);
  if (!student) throw createError(404, 'Student not found.');

  const concession = await loadActiveConcession(concessionId);

  if (student.concession_id && String(student.concession_id) === String(concessionId)) {
    return {
      message: 'Concession is already applied to this student.',
      concession: concessionInfo(concession),
      updatedFees: 0,
    };
  }

  if (concession.concession_type === 'group') {
    // Already part of a group that met the minimum? (kept for older data)
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
        `Group concession needs at least ${concession.min_students} students together. Select all the group students and apply it to them at once.`
      );
    }
  }

  assertStudentEligible(student, concession);
  await assertNoPayments(
    student._id,
    'Cannot change the concession after a payment has been made. Cancel the payments first.'
  );

  const hasFees = await StudentFee.exists({ student_id: studentId });
  if (!hasFees) throw createError(400, 'Set the payment plan for this student first.');

  const prevConcessionId = student.concession_id;
  const updated = await rescaleStudentFees(student._id, concession, adminId);

  student.concession_id = concession._id;
  student.concession_applied_at = new Date();
  student.concession_applied_by = adminId;
  await student.save();

  await auditService.logAction({
    userId: adminId,
    action: 'APPLY_CONCESSION',
    entity: 'Student',
    entityId: student._id,
    oldValues: { concession_id: prevConcessionId },
    newValues: {
      concession_id: concession._id,
      concession_name: concession.name,
      updated_fees: updated,
    },
    ip,
  });

  return {
    message: `Concession "${concession.name}" applied successfully.`,
    concession: concessionInfo(concession),
    updatedFees: updated,
  };
};

// ================================================================
// B2. APPLY A GROUP CONCESSION TO SEVERAL STUDENTS AT ONCE
//     body: { concession_id, student_ids: [...] }
//     - at least min_students students
//     - all in the same course and batch
//     - all-or-nothing: if one student fails the rules nobody gets it
// ================================================================
exports.applyGroupConcession = async (concessionId, studentIds, adminId, ip = null) => {
  const concession = await loadActiveConcession(concessionId);
  if (concession.concession_type !== 'group') {
    throw createError(400, 'This is not a group concession.');
  }

  const ids = [...new Set((studentIds || []).map(String))];
  if (ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    throw createError(400, 'One or more student IDs are invalid.');
  }
  if (ids.length < concession.min_students) {
    throw createError(
      400,
      `Select at least ${concession.min_students} students for this group concession. You selected ${ids.length}.`
    );
  }

  const students = await Student.find({ _id: { $in: ids } });
  if (students.length !== ids.length) throw createError(404, 'One or more students were not found.');

  const first = students[0];
  for (const s of students) {
    if (String(s.course_id) !== String(first.course_id) || String(s.batch_id) !== String(first.batch_id)) {
      throw createError(400, 'All students in a group must be in the same course and batch.');
    }
    if (s.status && s.status !== 'active') {
      throw createError(400, `${s.full_name || 'A student'} is not an active student.`);
    }
    await assertNoPayments(
      s._id,
      `${s.full_name || 'A student'} has already paid. Cancel the payments first.`
    );
    const hasFees = await StudentFee.exists({ student_id: s._id });
    if (!hasFees) {
      throw createError(400, `Set the payment plan for ${s.full_name || 'a student'} first.`);
    }
  }

  let updated = 0;
  for (const s of students) {
    updated += await rescaleStudentFees(s._id, concession, adminId);
    s.concession_id = concession._id;
    s.concession_applied_at = new Date();
    s.concession_applied_by = adminId;
    await s.save();
  }

  await auditService.logAction({
    userId: adminId,
    action: 'APPLY_GROUP_CONCESSION',
    entity: 'ConcessionMaster',
    entityId: concession._id,
    newValues: { student_ids: ids, concession_name: concession.name, updated_fees: updated },
    ip,
  });

  return {
    message: `Group concession "${concession.name}" applied to ${students.length} students.`,
    concession: concessionInfo(concession),
    updatedFees: updated,
    students: students.length,
  };
};

// ================================================================
// C. REMOVE CONCESSION
// ================================================================
exports.removeConcession = async (studentId, adminId, ip = null) => {
  if (!mongoose.Types.ObjectId.isValid(studentId)) throw createError(400, 'Invalid student ID.');

  const student = await Student.findById(studentId);
  if (!student) throw createError(404, 'Student not found.');
  if (!student.concession_id) return { message: 'No concession applied to this student.' };

  await assertNoPayments(
    student._id,
    'Cannot remove the concession after a payment has been made. Cancel the payments first.'
  );

  const prevConcessionId = student.concession_id;
  await rescaleStudentFees(student._id, null, adminId);

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
// D. FEE SUMMARY  (what the Fees screens show)
//    - `installments`  : ONE line per installment (all components added up)
//    - `fees`          : the same data grouped by fee component
//    - totals          : original, concession, payable, paid, balance
// ================================================================
exports.getInstallmentSummary = async (studentId) => {
  if (!mongoose.Types.ObjectId.isValid(studentId)) throw createError(400, 'Invalid student ID.');

  const student = await Student.findById(studentId).populate(
    'concession_id',
    'name code type value concession_type'
  );
  if (!student) throw createError(404, 'Student not found.');

  const fees = await StudentFee.find({ student_id: studentId })
    .populate('course_id', 'name')
    .sort({ installment_number: 1, fee_component_id: 1 });

  if (!fees.length) throw createError(404, 'No fee records found for this student.');

  const grouped = {};
  const byNumber = {};
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
    const no = fee.installment_number || 1;

    if (no === 1) {
      g.original_amount = fee.original_amount > 0 ? fee.original_amount : fee.amount_due;
      g.concession_amount = fee.concession_amount || 0;
      g.concession_reason = fee.concession_reason || null;
      totalOriginal += g.original_amount;
      totalConcession += g.concession_amount;
    }

    g.installments.push({
      _id: fee._id,
      installment_number: no,
      amount_due: fee.amount_due,
      amount_paid: fee.amount_paid,
      balance: Math.max(0, round2(fee.amount_due - fee.amount_paid)),
      due_date: fee.due_date,
      status: fee.status,
    });

    // one line per installment number (components added together)
    if (!byNumber[no]) {
      byNumber[no] = {
        _id: `inst-${no}`,
        installment_number: no,
        amount_due: 0,
        amount_paid: 0,
        due_date: fee.due_date,
        concession_amount: 0,
      };
    }
    const b = byNumber[no];
    b.amount_due += fee.amount_due;
    b.amount_paid += fee.amount_paid;
    b.concession_amount += fee.concession_amount || 0;
    if (!b.due_date && fee.due_date) b.due_date = fee.due_date;

    totalDue += fee.amount_due;
    totalPaid += fee.amount_paid;
  }

  const installments = Object.values(byNumber)
    .sort((a, b) => a.installment_number - b.installment_number)
    .map((b) => {
      const due = round2(b.amount_due);
      const paid = round2(b.amount_paid);
      return {
        _id: b._id,
        installment_number: b.installment_number,
        amount_due: due,
        amount_paid: paid,
        balance: Math.max(0, round2(due - paid)),
        due_date: b.due_date,
        concession_amount: round2(b.concession_amount),
        status: statusFor(due, paid),
      };
    });

  const c = student.concession_id;
  const concession = c
    ? {
        _id: c._id,
        id: c._id,
        name: c.name,
        code: c.code,
        type: c.type,
        value: c.value,
        concession_type: c.concession_type,
        applied_at: student.concession_applied_at,
      }
    : null;

  const original = round2(totalOriginal);
  const discount = round2(totalConcession);
  const payable = round2(totalDue);
  const paid = round2(totalPaid);
  const balance = Math.max(0, round2(payable - paid));

  return {
    student: {
      _id: student._id,
      student_id: student.student_id,
      full_name: student.full_name,
      admission_type: student.admission_type,
      concession,
    },
    // names the Fees screens read
    totalDue: payable,
    totalPaid: paid,
    balance,
    discount,
    grossTotal: original,
    concession,
    installments,
    // grouped + totals (kept for other callers)
    totals: {
      originalAmount: original,
      concessionAmount: discount,
      finalAmount: payable,
      paidAmount: paid,
      balance,
    },
    fees: Object.values(grouped),
  };
};