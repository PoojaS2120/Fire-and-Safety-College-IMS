const mongoose = require('mongoose');

const ExamForm = require('../models/ExamForm');
const ExamEligibilityRule = require('../models/ExamEligibilityRule');
const Exam = require('../models/Exam');
const Student = require('../../students/models/Student');
const StudentFee = require('../../fees/models/StudentFee');
const FeeComponent = require('../../courses/models/FeeComponent');
const AuditLog = require('../../audit/models/AuditLog');

function fail(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

const validId = (id) => mongoose.Types.ObjectId.isValid(id);

// =============== ELIGIBILITY CHECK ===============
// Returns { eligible: bool, pending: [], exam, student }
exports.checkEligibility = async (examId, studentId) => {
  if (!validId(examId)) fail(400, 'Invalid exam ID');
  if (!validId(studentId)) fail(400, 'Invalid student ID');

  const [exam, student] = await Promise.all([
    Exam.findOne({ _id: examId, deleted_at: null }),
    Student.findOne({ _id: studentId, status: 'active' }),
  ]);

  if (!exam) fail(404, 'Exam not found');
  if (!student) fail(404, 'Active student not found');

  // 1. Exam must belong to student's course and batch
  if (String(exam.course_id) !== String(student.course_id)) {
    fail(400, 'Exam does not belong to your course');
  }
  if (exam.batch_id && String(exam.batch_id) !== String(student.batch_id)) {
    fail(400, 'Exam does not belong to your batch');
  }

  // 2. Form window must be open
  const now = new Date();
  if (now < new Date(exam.form_start_date)) {
    fail(400, 'Exam form has not opened yet');
  }
  if (now > new Date(exam.form_end_date)) {
    fail(400, 'Exam form window has closed');
  }

  // 3. Check if form already submitted
  const existingForm = await ExamForm.findOne({
    student_id: studentId,
    exam_id: examId,
  });

  if (existingForm && ['submitted', 'overridden'].includes(existingForm.status)) {
    fail(409, 'You have already submitted the exam form for this exam');
  }

  // 4. FEE GATE — which fee components are required for this exam?
  const rules = await ExamEligibilityRule.find({
    course_id: exam.course_id,
    $or: [{ exam_id: exam._id }, { exam_id: null }],
  }).populate('fee_component_id', 'name');

  // Also check any fee components explicitly marked required_for_exam
  const directRequiredFees = await FeeComponent.find({
    course_id: exam.course_id,
    required_for_exam: true,
    status: 'active',
  });

  // Combine both sources (rules + direct flags)
  const requiredFeeIds = new Set([
    ...rules.map((r) => String(r.fee_component_id?._id || r.fee_component_id)),
    ...directRequiredFees.map((f) => String(f._id)),
  ]);

  // If no rules configured, fall back to ANY pending fee blocking the exam
  const studentFees = await StudentFee.find({
    student_id: studentId,
    course_id: exam.course_id,
    status: { $in: ['pending', 'partial'] },
  });

  const pending = [];

  for (const fee of studentFees) {
    const feeComponentIdStr = String(fee.fee_component_id);
    const isRequired =
      requiredFeeIds.size > 0
        ? requiredFeeIds.has(feeComponentIdStr)
        : fee.required_for_exam === true;

    if (!isRequired) continue;

    const balance = Number(fee.amount_due) - Number(fee.amount_paid || 0);
    if (balance > 0) {
      pending.push({
        fee_component_id: fee.fee_component_id,
        fee_name: fee.fee_name,
        amount_due: Number(fee.amount_due),
        amount_paid: Number(fee.amount_paid || 0),
        balance,
      });
    }
  }

  return {
    eligible: pending.length === 0,
    pending,
    exam,
    student,
    existing_form: existingForm,
  };
};

// =============== SUBMIT EXAM FORM (FEE GATE ENFORCED) ===============
exports.submitExamForm = async (examId, studentId, user, ip) => {
  const result = await exports.checkEligibility(examId, studentId);

  if (!result.eligible) {
    // Save a blocked record so staff can see the attempt
    let blockedForm = result.existing_form;
    if (!blockedForm) {
      blockedForm = new ExamForm({
        student_id: studentId,
        exam_id: examId,
        status: 'blocked',
        block_reason: 'Required fees pending',
        pending_fee_components: result.pending,
      });
    } else {
      blockedForm.status = 'blocked';
      blockedForm.block_reason = 'Required fees pending';
      blockedForm.pending_fee_components = result.pending;
    }
    await blockedForm.save();

    // Return 403 with structured error
    const error = new Error('Pending fees must be paid before exam form submission');
    error.statusCode = 403;
    error.code = 'FEES_PENDING';
    error.pending = result.pending;
    throw error;
  }

  // Eligible → submit or update
  let form = result.existing_form;

  if (form && form.status === 'blocked') {
    form.status = 'submitted';
    form.block_reason = null;
    form.pending_fee_components = [];
    form.submitted_at = new Date();
    await form.save();
  } else if (!form) {
    form = await ExamForm.create({
      student_id: studentId,
      exam_id: examId,
      status: 'submitted',
      submitted_at: new Date(),
    });
  } else {
    fail(409, 'Exam form already submitted');
  }

  // Audit log
  await AuditLog.create({
    user_id: user.id,
    action: 'CREATE',
    entity: 'ExamForm',
    entity_id: form._id,
    old_values: null,
    new_values: {
      student_id: studentId,
      exam_id: examId,
      status: 'submitted',
    },
    ip_address: ip,
  });

  return form;
};

// =============== LIST EXAM FORMS ===============
exports.listExamForms = async (filters, user) => {
  const query = {};

  if (filters.exam_id) query.exam_id = filters.exam_id;
  if (filters.student_id) query.student_id = filters.student_id;
  if (filters.status) query.status = filters.status;

  const skip = (Number(filters.page || 1) - 1) * Number(filters.limit || 20);

  const [forms, total] = await Promise.all([
    ExamForm.find(query)
      .populate('student_id', 'student_id full_name phone')
      .populate('exam_id', 'title exam_type exam_date subject')
      .populate('override_by', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(filters.limit || 20))
      .lean(),
    ExamForm.countDocuments(query),
  ]);

  return {
    forms,
    pagination: {
      page: Number(filters.page || 1),
      limit: Number(filters.limit || 20),
      total,
      totalPages: Math.ceil(total / Number(filters.limit || 20)),
    },
  };
};

// =============== GET SINGLE FORM ===============
exports.getExamFormById = async (formId, user) => {
  if (!validId(formId)) fail(400, 'Invalid form ID');

  const form = await ExamForm.findById(formId)
    .populate('student_id', 'student_id full_name phone course_id batch_id')
    .populate('exam_id', 'title exam_type exam_date subject max_marks')
    .populate('override_by', 'name email');

  if (!form) fail(404, 'Exam form not found');

  // Student can only view own form
  if (user.role === 'student') {
    const student = await Student.findOne({ user_id: user.id }).select('_id');
    if (!student || String(form.student_id._id) !== String(student._id)) {
      fail(403, 'You can only view your own exam form');
    }
  }

  return form;
};

// =============== SUPER ADMIN OVERRIDE ===============
exports.overrideExamForm = async (formId, reason, user, ip) => {
  if (user.role !== 'super_admin') {
    fail(403, 'Only Super Admin can override exam form blocks');
  }

  if (!validId(formId)) fail(400, 'Invalid form ID');
  if (!reason || reason.trim().length < 5) {
    fail(400, 'Override reason is required (min 5 chars)');
  }

  const form = await ExamForm.findById(formId);
  if (!form) fail(404, 'Exam form not found');

  if (!['blocked', 'pending'].includes(form.status)) {
    fail(400, `Cannot override a form with status "${form.status}"`);
  }

  const oldValues = form.toObject();

  form.status = 'overridden';
  form.override_by = user.id;
  form.override_reason = reason.trim();
  form.overridden_at = new Date();
  form.submitted_at = form.submitted_at || new Date();
  await form.save();

  await AuditLog.create({
    user_id: user.id,
    action: 'override',
    entity: 'ExamForm',
    entity_id: form._id,
    old_values: oldValues,
    new_values: form.toObject(),
    ip_address: ip,
  });

  return form;
};

// =============== STUDENT: OWN EXAM FORMS ===============
exports.getMyExamForms = async (userId) => {
  const student = await Student.findOne({ user_id: userId, status: 'active' }).select('_id');
  if (!student) fail(404, 'Active student profile not found');

  return ExamForm.find({ student_id: student._id })
    .populate('exam_id', 'title exam_type exam_date subject max_marks passing_marks')
    .sort({ createdAt: -1 })
    .lean();
};