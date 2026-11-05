
const examFormService = require('../services/examFormService');
const Student = require('../../students/models/Student');

const getUserId = (user) => user?.id || user?._id;

const getStudentForUser = async (user) => {
  const userId = getUserId(user);

  if (!userId) {
    console.error('[EXAM FORM] User ID missing from authenticated request');
    return null;
  }

  return Student.findOne({ user_id: userId }).select(
    '_id user_id course_id batch_id full_name status'
  );
};

// ==========================================================
// CHECK EXAM ELIGIBILITY
// ==========================================================
exports.checkEligibility = async (req, res, next) => {
  try {
    const examId = req.query.exam_id;
    let studentId = req.query.student_id;

    if (!examId) {
      return res.status(400).json({
        success: false,
        message: 'exam_id is required',
      });
    }

    if (req.user.role === 'student') {
      const student = await getStudentForUser(req.user);

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found',
        });
      }

      if (student.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Your student account is not active',
        });
      }

      // Students can only check their own eligibility.
      studentId = student._id;

      console.log('[EXAM ELIGIBILITY DEBUG]', {
        userId: String(getUserId(req.user)),
        role: req.user.role,
        studentId: String(student._id),
        studentUserId: String(student.user_id),
        studentCourseId: student.course_id
          ? String(student.course_id)
          : null,
        studentBatchId: student.batch_id
          ? String(student.batch_id)
          : null,
      });
    }

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'student_id is required',
      });
    }

    const result = await examFormService.checkEligibility(
      examId,
      studentId
    );

    return res.status(200).json({
      success: true,
      data: {
        eligible: result.eligible,
        pending: result.pending,
        exam: {
          _id: result.exam._id,
          title: result.exam.title,
          exam_date: result.exam.exam_date,
          form_start_date: result.exam.form_start_date,
          form_end_date: result.exam.form_end_date,
        },
        existing_form: result.existing_form,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================================
// SUBMIT EXAM FORM
// ==========================================================
exports.submitExamForm = async (req, res, next) => {
  try {
    const examId = req.body.exam_id;
    let studentId = req.body.student_id;

    if (!examId) {
      return res.status(400).json({
        success: false,
        message: 'exam_id is required',
      });
    }

    if (req.user.role === 'student') {
      const student = await getStudentForUser(req.user);

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found',
        });
      }

      if (student.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Your student account is not active',
        });
      }

      // Ignore any student_id supplied by the student.
      // Always use the authenticated student's profile.
      studentId = student._id;

      console.log('[EXAM SUBMISSION DEBUG]', {
        userId: String(getUserId(req.user)),
        studentId: String(student._id),
        studentBatchId: student.batch_id
          ? String(student.batch_id)
          : null,
      });
    }

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'student_id is required',
      });
    }

    const form = await examFormService.submitExamForm(
      examId,
      studentId,
      req.user,
      req.ip
    );

    return res.status(201).json({
      success: true,
      message: 'Exam form submitted successfully',
      data: form,
    });
  } catch (error) {
    if (error.code === 'FEES_PENDING') {
      return res.status(403).json({
        success: false,
        code: 'FEES_PENDING',
        message: error.message,
        pending: error.pending || [],
      });
    }

    next(error);
  }
};

// ==========================================================
// LIST EXAM FORMS
// ==========================================================
exports.listExamForms = async (req, res, next) => {
  try {
    const result = await examFormService.listExamForms(
      req.query,
      req.user
    );

    return res.status(200).json({
      success: true,
      data: result.forms,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================================
// GET SINGLE EXAM FORM
// ==========================================================
exports.getExamFormById = async (req, res, next) => {
  try {
    const form = await examFormService.getExamFormById(
      req.params.id,
      req.user
    );

    return res.status(200).json({
      success: true,
      data: form,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================================
// SUPER ADMIN OVERRIDE
// ==========================================================
exports.overrideExamForm = async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only Super Admin can override exam forms',
      });
    }

    const form = await examFormService.overrideExamForm(
      req.params.id,
      req.body.reason,
      req.user,
      req.ip
    );

    return res.status(200).json({
      success: true,
      message: 'Exam form overridden successfully',
      data: form,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================================
// STUDENT: GET OWN EXAM FORMS
// ==========================================================
exports.getMyExamForms = async (req, res, next) => {
  try {
    const userId = getUserId(req.user);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user ID not found',
      });
    }

    const forms = await examFormService.getMyExamForms(userId);

    return res.status(200).json({
      success: true,
      data: forms,
    });
  } catch (error) {
    next(error);
  }
};
