const classScheduleService = require('../services/classScheduleService');

const {
  createScheduleSchema,
  updateScheduleSchema,
  scheduleQuerySchema,
} = require('../validations/classScheduleValidation');

// ==========================================================
// CREATE
// ==========================================================
exports.createSchedule = async (req, res, next) => {
  try {
    const { error, value } = createScheduleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const schedule = await classScheduleService.createSchedule(value, req.user);

    return res.status(201).json({
      success: true,
      message: 'Class schedule created successfully',
      data: schedule,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================================
// LIST
// ==========================================================
exports.getSchedules = async (req, res, next) => {
  try {
    const { error, value } = scheduleQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const schedules = await classScheduleService.getSchedules(value, req.user);

    return res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================================
// GET BY ID
// ==========================================================
exports.getScheduleById = async (req, res, next) => {
  try {
    const schedule = await classScheduleService.getScheduleById(
      req.params.id,
      req.user
    );

    return res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================================
// UPDATE
// ==========================================================
exports.updateSchedule = async (req, res, next) => {
  try {
    const { error, value } = updateScheduleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const schedule = await classScheduleService.updateSchedule(
      req.params.id,
      value,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: 'Class schedule updated successfully',
      data: schedule,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================================
// CANCEL
// ==========================================================
exports.cancelSchedule = async (req, res, next) => {
  try {
    const schedule = await classScheduleService.cancelSchedule(
      req.params.id,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: 'Class schedule cancelled successfully',
      data: schedule,
    });
  } catch (err) {
    next(err);
  }
};