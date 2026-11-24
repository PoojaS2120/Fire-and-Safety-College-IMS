// const installmentService = require('../services/installmentService');

// // POST /api/v1/fees/installments/generate
// exports.generate = async (req, res, next) => {
//   try {
//     const { studentId, courseId, ...options } = req.body;
//     if (!studentId || !courseId) {
//       return res
//         .status(400)
//         .json({ success: false, message: 'studentId and courseId are required.' });
//     }
//     const result = await installmentService.generateWithInstallments(
//       studentId,
//       courseId,
//       options
//     );
//     res
//       .status(201)
//       .json({ success: true, message: 'Installment ledger generated.', data: result });
//   } catch (e) {
//     next(e);
//   }
// };

// // GET /api/v1/fees/installments/:studentId/summary
// exports.getSummary = async (req, res, next) => {
//   try {
//     const data = await installmentService.getInstallmentSummary(req.params.studentId);
//     res.status(200).json({ success: true, data });
//   } catch (e) {
//     next(e);
//   }
// };

// // POST /api/v1/fees/installments/:studentId/apply-concession
// exports.applyConcession = async (req, res, next) => {
//   try {
//     const { studentId } = req.params;
//     const { concession_id } = req.body;
//     if (!concession_id) {
//       return res
//         .status(400)
//         .json({ success: false, message: 'concession_id is required.' });
//     }
//     const result = await installmentService.applyConcession(
//       studentId,
//       concession_id,
//       req.user.id,
//       req.ip
//     );
//     res.status(200).json({ success: true, message: result.message, data: result });
//   } catch (e) {
//     next(e);
//   }
// };

// // DELETE /api/v1/fees/installments/:studentId/concession
// exports.removeConcession = async (req, res, next) => {
//   try {
//     const result = await installmentService.removeConcession(
//       req.params.studentId,
//       req.user.id,
//       req.ip
//     );
//     res.status(200).json({ success: true, message: result.message });
//   } catch (e) {
//     next(e);
//   }
// };





const installmentService = require('../services/installmentService');

// POST /api/v1/fees/installments/generate
// One-time:     { studentId, courseId, start_date }                       (or number_of_installments: 1)
// Installments: { studentId, courseId, installments: [{ due_date, amount }, ...] }
//          or   { studentId, courseId, start_date, number_of_installments }  (equal split)
exports.generate = async (req, res, next) => {
  try {
    const { studentId, courseId, ...options } = req.body;
    if (!studentId || !courseId) {
      return res
        .status(400)
        .json({ success: false, message: 'studentId and courseId are required.' });
    }
    const result = await installmentService.generateWithInstallments(
      studentId,
      courseId,
      options,
      req.user.id,
      req.ip
    );
    res
      .status(201)
      .json({ success: true, message: 'Payment plan saved.', data: result });
  } catch (e) {
    next(e);
  }
};

// GET /api/v1/fees/installments/:studentId/summary
exports.getSummary = async (req, res, next) => {
  try {
    const data = await installmentService.getInstallmentSummary(req.params.studentId);
    res.status(200).json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

// POST /api/v1/fees/installments/:studentId/apply-concession
exports.applyConcession = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { concession_id } = req.body;
    if (!concession_id) {
      return res
        .status(400)
        .json({ success: false, message: 'concession_id is required.' });
    }
    const result = await installmentService.applyConcession(
      studentId,
      concession_id,
      req.user.id,
      req.ip
    );
    res.status(200).json({ success: true, message: result.message, data: result });
  } catch (e) {
    next(e);
  }
};

// POST /api/v1/fees/installments/apply-group-concession
// { concession_id, student_ids: [ ... ] }
exports.applyGroupConcession = async (req, res, next) => {
  try {
    const { concession_id, student_ids } = req.body;
    if (!concession_id || !Array.isArray(student_ids)) {
      return res.status(400).json({
        success: false,
        message: 'concession_id and student_ids (a list) are required.',
      });
    }
    const result = await installmentService.applyGroupConcession(
      concession_id,
      student_ids,
      req.user.id,
      req.ip
    );
    res.status(200).json({ success: true, message: result.message, data: result });
  } catch (e) {
    next(e);
  }
};

// DELETE /api/v1/fees/installments/:studentId/concession
// (also reachable as DELETE /:studentId/apply-concession - see the routes file)
exports.removeConcession = async (req, res, next) => {
  try {
    const result = await installmentService.removeConcession(
      req.params.studentId,
      req.user.id,
      req.ip
    );
    res.status(200).json({ success: true, message: result.message });
  } catch (e) {
    next(e);
  }
};