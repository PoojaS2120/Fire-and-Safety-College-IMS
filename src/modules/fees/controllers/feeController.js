const feeService = require('../services/feeService');

exports.generateLedger = async (req, res, next) => {
  try {
    const { studentId, courseId } = req.body;
    const result = await feeService.generateFeeLedger(studentId, courseId);
    res.status(201).json({ success: true, message: 'Fee ledger generated', data: result });
  } catch (err) { next(err); }
};

exports.getSummary = async (req, res, next) => {
  try {
    const result = await feeService.getFeeSummary(req.params.studentId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.checkEligibility = async (req, res, next) => {
  try {
    const result = await feeService.checkExamEligibility(req.params.studentId);
    // If not eligible, we can return 403, but for checking we just return 200 with data
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};