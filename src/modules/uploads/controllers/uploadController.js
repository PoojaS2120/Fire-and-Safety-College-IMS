
const fs = require('fs');
const path = require('path');
const uploadService = require('../services/uploadService');
const { validateFileContent } = require('../middleware/validateFileContent');

exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error('Please select a file to upload.');
      error.statusCode = 400;
      throw error;
    }

    const validContent = await validateFileContent(req.file);

    if (!validContent) {
      const error = new Error(
        'File contents do not match the selected file type.'
      );
      error.statusCode = 400;
      throw error;
    }

    const upload = await uploadService.saveUpload(req.file, req.user.id);

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully.',
      data: {
        id: upload._id,
        originalName: upload.originalName,
        mimeType: upload.mimeType,
        size: upload.size,
        createdAt: upload.createdAt,
      },
    });
  } catch (error) {
    if (req.file?.path) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
};

exports.getMyUploads = async (req, res, next) => {
  try {
    const uploads = await uploadService.getUserUploads(req.user.id);
    res.status(200).json({ success: true, data: uploads });
  } catch (error) {
    next(error);
  }
};

exports.downloadFile = async (req, res, next) => {
  try {
    const { upload, filePath } =
      await uploadService.getUploadForUser(req.params.id, req.user.id);

    if (!fs.existsSync(filePath)) {
      const error = new Error('Stored file is missing.');
      error.statusCode = 404;
      throw error;
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.download(filePath, path.basename(upload.originalName), (error) => {
      if (error && !res.headersSent) next(error);
    });
  } catch (error) {
    next(error);
  }
};
