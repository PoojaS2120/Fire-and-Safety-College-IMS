
const multer = require('multer');

const errorMiddleware = (err, req, res, next) => {
  console.error('[ERROR]', err.message);

  // Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'File size exceeds the 5 MB limit.',
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
        message: 'Unexpected file field. Use the "file" field.',
      });
    }

    return res.status(400).json({
      success: false,
      message: 'File upload failed.',
    });
  }

  // Unsupported file types
  const unsupportedMessages = [
    'Only PDF, JPEG, PNG and WEBP files are allowed.',
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
