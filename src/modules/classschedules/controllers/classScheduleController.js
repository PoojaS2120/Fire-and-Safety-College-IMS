
const classScheduleService = require('../services/classScheduleService');

const {
  createScheduleSchema,
  updateScheduleSchema,
  scheduleQuerySchema
} = require('../validations/classScheduleValidation');

exports.createSchedule = async (req, res, next) => {
  try {
    const { error, value } = createScheduleSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const schedule = await classScheduleService.createSchedule(
      value,
      req.user.id
    );

    return res.status(201).json({
      success: true,
      message: 'Class schedule created successfully',
      data: schedule
    });
  } catch (err) {
    next(err);
  }
};

exports.getSchedules = async (req, res, next) => {
  try {
    const { error, value } = scheduleQuerySchema.validate(req.query);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const schedules = await classScheduleService.getSchedules(value);

    return res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (err) {
    next(err);
  }
};

exports.getScheduleById = async (req, res, next) => {
  try {
    const schedule = await classScheduleService.getScheduleById(req.params.id);

    return res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (err) {
    next(err);
  }
};

exports.updateSchedule = async (req, res, next) => {
  try {
    const { error, value } = updateScheduleSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const schedule = await classScheduleService.updateSchedule(
      req.params.id,
      value
    );

    return res.status(200).json({
      success: true,
      message: 'Class schedule updated successfully',
      data: schedule
    });
  } catch (err) {
    next(err);
  }
};

exports.cancelSchedule = async (req, res, next) => {
  try {
    const schedule = await classScheduleService.cancelSchedule(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Class schedule cancelled successfully',
      data: schedule
    });
  } catch (err) {
    next(err);
  }
};
