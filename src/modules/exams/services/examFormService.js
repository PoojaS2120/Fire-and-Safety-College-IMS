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

const validId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

// =============== ELIGIBILITY CHECK ===============

exports.checkEligibility = async (examId, studentId) => {
  if (!validId(examId)) {
    fail(400, 'Invalid exam ID');
  }

  if (!validId(studentId)) {
    fail(400, 'Invalid student ID');
  }

  const [exam, student] = await Promise.all([
    Exam.findOne({
      _id: examId,
      deleted_at: null,
    }),
    Student.findOne({
      _id: studentId,
      status: 'active',
    }),
  ]);

  if (!exam) fail(404, 'Exam not found');
  if (!student) fail(404, 'Active student not found');

  const examCourseId = String(exam.course_id);
  const studentCourseId = String(student.course_id);

  const examBatchId = exam.batch_id
    ? String(exam.batch_id)
    : null;

  const studentBatchId = student.batch_id
    ? String(student.batch_id)
    : null;

  console.log('[EXAM BATCH DEBUG]', {
    examId: String(exam._id),
    examCourseId,
    studentId: String(student._id),
    studentCourseId,
    examBatchId,
    studentBatchId,
    courseMatch: examCourseId === studentCourseId,
    batchMatch: examBatchId === studentBatchId,
  });

  // 1. Course validation
  if (examCourseId !== studentCourseId) {
    fail(400, 'Exam does not belong to your course');
  }

  // 2. Batch validation
  if (examBatchId && examBatchId !== studentBatchId) {
    fail(400, 'Exam does not belong to your batch');
  }

  // 3. Exam form window validation
  const now = new Date();

  if (now < new Date(exam.form_start_date)) {
    fail(400, 'Exam form has not opened yet');
  }

  if (now > new Date(exam.form_end_date)) {
    fail(400, 'Exam form window has closed');
  }

  // 4. Existing submission check
  const existingForm = await ExamForm.findOne({
    student_id: studentId,
    exam_id: examId,
  });

  if (
    existingForm &&
    ['submitted', 'overridden'].includes(existingForm.status)
  ) {
    fail(409, 'You have already submitted the exam form for this exam');
  }

  // 5. Fetch exam-specific and course-level eligibility rules
  const rules = await ExamEligibilityRule.find({
    course_id: exam.course_id,
    $or: [
      { exam_id: exam._id },
      { exam_id: null },
    ],
  }).populate('fee_component_id', 'name');

  // Fetch active fee components marked required for exams
  const directRequiredFees = await FeeComponent.find({
    course_id: exam.course_id,
    required_for_exam: true,
    status: 'active',
  });

  // Combine both sources
  const requiredFeeIds = new Set([
    ...rules
      .map((rule) => {
        const component = rule.fee_component_id;
        return component?._id
          ? String(component._id)
          : String(component);
      })
      .filter(Boolean),

    ...directRequiredFees.map((fee) => String(fee._id)),
  ]);

  // 6. Fetch unpaid and partially paid student fees
  const studentFees = await StudentFee.find({
    student_id: studentId,
    course_id: exam.course_id,
    status: { $in: ['pending', 'partial'] },
  });

  const pending = [];

  for (const fee of studentFees) {
    const componentId = String(fee.fee_component_id);

    const isRequired =
      requiredFeeIds.size > 0
        ? requiredFeeIds.has(componentId)
        : fee.required_for_exam === true;

    if (!isRequired) continue;

    const amountDue = Number(fee.amount_due || 0);
    const amountPaid = Number(fee.amount_paid || 0);
    const balance = amountDue - amountPaid;

    if (balance > 0) {
      pending.push({
        fee_component_id: fee.fee_component_id,
        fee_name: fee.fee_name,
        amount_due: amountDue,
        amount_paid: amountPaid,
        balance,
      });
    }
  }

  console.log('[EXAM FEE DEBUG]', {
    studentId: String(studentId),
    requiredFeeIds: [...requiredFeeIds],
    pendingFees: pending.map((fee) => ({
      name: fee.fee_name,
      balance: fee.balance,
    })),
  });

  return {
    eligible: pending.length === 0,
    pending,
    exam,
    student,
    existing_form: existingForm,
  };
};


// =============== SUBMIT EXAM FORM ===============

exports.submitExamForm = async (examId, studentId, user, ip) => {
  // Recheck eligibility before submission
  const result = await exports.checkEligibility(examId, studentId);

  // Block submission if required fees are pending
  if (!result.eligible) {
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

    const error = new Error(
      'Pending fees must be paid before exam form submission'
    );

    error.statusCode = 403;
    error.code = 'FEES_PENDING';
    error.pending = result.pending;

    throw error;
  }

  // Submit if eligibility checks pass
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

  // Create audit log
  await AuditLog.create({
    user_id: user.id || user._id,
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

exports.overrideExamForm = async (formId, reason, user, ip) => {
  if (user.role !== 'super_admin') {
    fail(403, 'Only Super Admin can override exam form blocks');
  }

  if (!validId(formId)) {
    fail(400, 'Invalid form ID');
  }

  if (!reason || reason.trim().length < 5) {
    fail(400, 'Override reason is required (min 5 chars)');
  }

  const form = await ExamForm.findById(formId);

  if (!form) {
    fail(404, 'Exam form not found');
  }

  if (!['blocked', 'pending'].includes(form.status)) {
    fail(400, `Cannot override a form with status "${form.status}"`);
  }

  const oldValues = form.toObject();

  form.status = 'overridden';
  form.override_by = user.id || user._id;
  form.override_reason = reason.trim();
  form.overridden_at = new Date();
  form.submitted_at = form.submitted_at || new Date();

  await form.save();

  await AuditLog.create({
    user_id: user.id || user._id,
    action: 'override',
    entity: 'ExamForm',
    entity_id: form._id,
    old_values: oldValues,
    new_values: form.toObject(),
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

  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
  const skip = (page - 1) * limit;

  const [forms, total] = await Promise.all([
    ExamForm.find(query)
      .populate('student_id', 'student_id full_name phone')
      .populate('exam_id', 'title exam_type exam_date subject')
      .populate('override_by', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    ExamForm.countDocuments(query),
  ]);

  return {
    forms,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// =============== GET SINGLE EXAM FORM ===============

exports.getExamFormById = async (formId, user) => {
  if (!validId(formId)) {
    fail(400, 'Invalid form ID');
  }

  const form = await ExamForm.findById(formId)
    .populate('student_id', 'student_id full_name phone course_id batch_id')
    .populate('exam_id', 'title exam_type exam_date subject max_marks')
    .populate('override_by', 'name email');

  if (!form) {
    fail(404, 'Exam form not found');
  }

  if (user.role === 'student') {
    const student = await Student.findOne({
      user_id: user.id,
    }).select('_id');

    if (!student || String(form.student_id._id) !== String(student._id)) {
      fail(403, 'You can only view your own exam form');
    }
  }

  return form;
};

// =============== STUDENT: OWN EXAM FORMS ===============

exports.getMyExamForms = async (userId) => {
  const student = await Student.findOne({
    user_id: userId,
    status: 'active',
  }).select('_id');

  if (!student) {
    fail(404, 'Active student profile not found');
  }

  return ExamForm.find({
    student_id: student._id,
  })
    .populate('exam_id', 'title exam_type exam_date subject max_marks passing_marks')
    .sort({ createdAt: -1 })
    .lean();
};
