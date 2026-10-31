
const multer = require('multer');

const errorMiddleware = (err, req, res, next) => {
  console.error('[ERROR DETAILS]', {
    message: err.message,
    name: err.name,
    code: err.code,
    field: err.field,
    url: req.originalUrl,
  });

  // Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const isVideoUpload = req.originalUrl.includes('/uploads/videos');

      return res.status(413).json({
        success: false,
        message: isVideoUpload
          ? 'Video exceeds the 5 GB upload limit.'
          : 'File size exceeds the 5 MB limit.',
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Only one file can be uploaded at a time.',
      });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: `Unexpected file field: ${err.field || 'missing'}. Use the "file" field.`,
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message,
      code: err.code,
      field: err.field || null,
    });
  }

  // Unsupported file types
  const unsupportedMessages = [
    'Only PDF, JPEG, PNG and WEBP files are allowed.',
    'Only MP4, MOV and WEBM videos are allowed.',
    'Only XLSX and CSV files are allowed.',
    'Invalid file type. Upload a valid XLSX or CSV file.',
  ];

  if (unsupportedMessages.includes(err.message)) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Application errors
  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500
        ? 'Internal Server Error'
        : err.message || 'Request failed.',
  });
};

module.exports = errorMiddleware;
