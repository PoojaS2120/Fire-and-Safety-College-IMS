const examFormService = require('../services/examFormService');

exports.checkEligibility = async (req, res, next) => {
  try {
    const examId = req.query.exam_id;
    let studentId = req.query.student_id;

    // If student, use their own ID
    if (req.user.role === 'student') {
      const Student = require('../../students/models/Student');
      const student = await Student.findOne({ user_id: req.user.id }).select('_id');
      if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
      studentId = student._id;
    }

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'student_id is required' });
    }

    const result = await examFormService.checkEligibility(examId, studentId);

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

exports.submitExamForm = async (req, res, next) => {
  try {
    let studentId = req.body.student_id;
    const examId = req.body.exam_id;

    if (req.user.role === 'student') {
      const Student = require('../../students/models/Student');
      const student = await Student.findOne({ user_id: req.user.id }).select('_id');
      if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
      studentId = student._id;
    }

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'student_id is required' });
    }

    const form = await examFormService.submitExamForm(examId, studentId, req.user, req.ip);

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
        pending: error.pending,
      });
    }
    next(error);
  }
};

exports.listExamForms = async (req, res, next) => {
  try {
    const result = await examFormService.listExamForms(req.query, req.user);
    return res.status(200).json({
      success: true,
      data: result.forms,
      meta: result.pagination,
    });
  } catch (error) { next(error); }
};

exports.getExamFormById = async (req, res, next) => {
  try {
    const form = await examFormService.getExamFormById(req.params.id, req.user);
    return res.status(200).json({ success: true, data: form });
  } catch (error) { next(error); }
};

exports.overrideExamForm = async (req, res, next) => {
  try {
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
  } catch (error) { next(error); }
};

exports.getMyExamForms = async (req, res, next) => {
  try {
    const forms = await examFormService.getMyExamForms(req.user.id);
    return res.status(200).json({ success: true, data: forms });
  } catch (error) { next(error); }
};