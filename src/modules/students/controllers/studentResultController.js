const studentResultService = require('../services/studentResultService');

exports.getMyExamResults = async (req, res, next) => {
  try {
    const results = await studentResultService.getMyExamResults(req.user.id);
    res.status(200).json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
};

exports.getMyTestResults = async (req, res, next) => {
  try {
    const results = await studentResultService.getMyTestResults(req.user.id);
    res.status(200).json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
};