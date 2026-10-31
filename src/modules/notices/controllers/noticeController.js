const noticeService = require('../services/noticeService');

const {
  createNoticeSchema,
  updateNoticeSchema,
  updateNoticeStatusSchema
} = require('../validations/noticeValidation');

// GET /notices
exports.listNotices = async (req, res, next) => {
  try {
    const data = await noticeService.listNotices(req.query);

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

// GET /notices/:id
exports.getNotice = async (req, res, next) => {
  try {
    const data = await noticeService.getNotice(req.params.id);

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

// POST /notices
exports.createNotice = async (req, res, next) => {
  try {
    const { error } = createNoticeSchema.validate(req.body);

    if (error) {
      throw {
        statusCode: 400,
        message: error.details[0].message
      };
    }

    const data = await noticeService.createNotice(
      req.body,
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: 'Notice created successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

// PUT /notices/:id
exports.updateNotice = async (req, res, next) => {
  try {
    const { error } = updateNoticeSchema.validate(req.body);

    if (error) {
      throw {
        statusCode: 400,
        message: error.details[0].message
      };
    }

    const data = await noticeService.updateNotice(
      req.params.id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: 'Notice updated successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

// PUT /notices/:id/status
exports.updateNoticeStatus = async (req, res, next) => {
  try {
    const { error } = updateNoticeStatusSchema.validate(req.body);

    if (error) {
      throw {
        statusCode: 400,
        message: error.details[0].message
      };
    }

    const data = await noticeService.updateNoticeStatus(
      req.params.id,
      req.body.status
    );

    res.status(200).json({
      success: true,
      message: 'Notice status updated successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};
// DELETE /notices/:id
exports.deleteNotice = async (req, res, next) => {
  try {
    await noticeService.deleteNotice(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Notice deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};