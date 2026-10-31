
const fs = require('fs');
const path = require('path');
const uploadService = require('../services/uploadService');
const { validateFileContent } = require('../middleware/validateFileContent');
const { validateVideoContent } = require('../middleware/validateVideoContent');

// Upload a new file.
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

// List files uploaded by the current user.
exports.getMyUploads = async (req, res, next) => {
  try {
    const uploads = await uploadService.getUserUploads(req.user.id);

    res.status(200).json({
      success: true,
      data: uploads,
    });
  } catch (error) {
    next(error);
  }
};

// Download an uploaded file.
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

// Replace an existing uploaded file.
exports.reuploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error('Please select a replacement file.');
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

    const upload = await uploadService.replaceUpload(
      req.params.id,
      req.file,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: 'File replaced successfully.',
      data: {
        id: upload._id,
        originalName: upload.originalName,
        mimeType: upload.mimeType,
        size: upload.size,
        updatedAt: upload.updatedAt,
      },
    });
  } catch (error) {
    if (req.file?.path) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
};

// Delete an uploaded file.
exports.deleteFile = async (req, res, next) => {
  try {
    await uploadService.deleteUpload(req.params.id, req.user.id);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// Upload a video through the centralized Upload module.
exports.uploadVideoFile = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error('Please select a video to upload.');
      error.statusCode = 400;
      throw error;
    }

    const validContent = await validateVideoContent(req.file);

    if (!validContent) {
      const error = new Error(
        'Invalid video content. Please upload a valid MP4, MOV or WEBM video.'
      );
      error.statusCode = 400;
      throw error;
    }

    const upload = await uploadService.saveUpload(
      req.file,
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: 'Video uploaded successfully.',
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
