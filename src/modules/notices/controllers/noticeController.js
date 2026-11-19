const noticeService = require('../services/noticeService');
const fs = require('fs');
const path = require('path');

const uploadService = require('../../uploads/services/uploadService');

const {
  validateFileContent
} = require('../../uploads/middleware/validateFileContent');

const {
  uploadDir
} = require('../../uploads/middleware/uploadMiddleware');
const {
  createNoticeSchema,
  updateNoticeSchema,
  updateNoticeStatusSchema,
  uploadPdfNoticeSchema
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
// POST /notices/upload
exports.uploadPdfNotice = async (req, res, next) => {
  try {
    if (!req.file) {
      throw {
        statusCode: 400,
        message: 'Please select a PDF file'
      };
    }

    // Validate extension and MIME type
    const extension = path.extname(req.file.originalname).toLowerCase();

    if (
      extension !== '.pdf' ||
      req.file.mimetype !== 'application/pdf'
    ) {
      throw {
        statusCode: 400,
        message: 'Only PDF files are allowed'
      };
    }

    // Validate actual file content
    const validContent = await validateFileContent(req.file);

    if (!validContent) {
      throw {
        statusCode: 400,
        message: 'Invalid PDF file content'
      };
    }

    // Validate course and batch
    const { error } = uploadPdfNoticeSchema.validate(req.body);

    if (error) {
      throw {
        statusCode: 400,
        message: error.details[0].message
      };
    }

    const data = await noticeService.createPdfNotice(
      req.body,
      req.file,
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: 'PDF notice uploaded successfully',
      data
    });

  } catch (error) {
    if (req.file?.path) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }

    next(error);
  }
};


// GET /notices/:id/file
exports.downloadNoticeFile = async (req, res, next) => {
  try {
    const notice = await noticeService.getNotice(req.params.id);

    if (!notice.attachment) {
      throw {
        statusCode: 404,
        message: 'No PDF attachment found for this notice'
      };
    }

    const { upload, filePath } =
      await uploadService.getUploadForAuthorizedDownload(
        notice.attachment._id
      );

    if (upload.mimeType !== 'application/pdf') {
      throw {
        statusCode: 400,
        message: 'Notice attachment is not a PDF'
      };
    }

    if (!fs.existsSync(filePath)) {
      throw {
        statusCode: 404,
        message: 'PDF file is missing from storage'
      };
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.download(
      filePath,
      path.basename(upload.originalName),
      (error) => {
        if (error && !res.headersSent) {
          next(error);
        }
      }
    );

  } catch (error) {
    next(error);
  }
};