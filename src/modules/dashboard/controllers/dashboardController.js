const dashboardService = require('../services/dashboardService');

exports.getSummary = async (req, res, next) => {
  try {
    const data = await dashboardService.getSummary(req.user);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getCourseWiseStudents = async (req, res, next) => {
  try {
    const data = await dashboardService.getCourseWiseStudents();
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getFeesTrend = async (req, res, next) => {
  try {
    const data = await dashboardService.getFeesTrend();
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getRecentActivity = async (req, res, next) => {
  try {
    const data = await dashboardService.getRecentActivity();
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};