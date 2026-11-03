const studentAppService = require('../services/studentAppService');

exports.getProfile = async (req, res, next) => {
  try {
    const data = await studentAppService.getProfile(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Student profile fetched successfully.',
      data
    });
  } catch (error) {
    next(error);
  }
};

exports.getCourse = async (req, res, next) => {
  try {
    const data = await studentAppService.getCourse(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Student course fetched successfully.',
      data
    });
  } catch (error) {
    next(error);
  }
};

exports.getSchedule = async (req, res, next) => {
  try {
    const data = await studentAppService.getSchedule(
      req.user.id,
      req.query
    );

    return res.status(200).json({
      success: true,
      message: 'Student timetable fetched successfully.',
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

exports.getMaterials = async (req, res, next) => {
  try {
    const data = await studentAppService.getMaterials(
      req.user.id,
      req.query
    );

    return res.status(200).json({
      success: true,
      message: 'Study materials fetched successfully.',
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

exports.getDashboard = async (req, res, next) => {
  try {
    const data = await studentAppService.getDashboard(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Student dashboard fetched successfully.',
      data
    });
  } catch (error) {
    next(error);
  }
};