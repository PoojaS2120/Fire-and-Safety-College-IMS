// // middlewares/errorMiddleware.js
// const multer = require('multer');

// // ============================================
// // 1. GLOBAL ERROR HANDLER
// // ============================================
// const errorMiddleware = (err, req, res, next) => {
//   // Log for debugging
//   console.error('[ERROR]', {
//     message: err.message,
//     name: err.name,
//     code: err.code,
//     url: req.originalUrl,
//     stack: err.stack,
//   });

//   // Multer errors (file upload)
//   if (err instanceof multer.MulterError) {
//     if (err.code === 'LIMIT_FILE_SIZE') {
//       const isVideoUpload = req.originalUrl.includes('/uploads/videos');
//       return res.status(413).json({
//         success: false,
//         message: isVideoUpload
//           ? 'Video exceeds the 5 GB upload limit.'
//           : 'File size exceeds the 5 MB limit.',
//       });
//     }

//     if (err.code === 'LIMIT_FILE_COUNT') {
//       return res.status(400).json({
//         success: false,
//         message: 'Only one file can be uploaded at a time.',
//       });
//     }

//     if (err.code === 'LIMIT_UNEXPECTED_FILE') {
//       return res.status(400).json({
//         success: false,
//         message: `Unexpected file field: ${err.field || 'missing'}. Use the "file" field.`,
//       });
//     }

//     return res.status(400).json({
//       success: false,
//       message: err.message,
//       code: err.code,
//       field: err.field || null,
//     });
//   }

//   // Unsupported file types
//   const unsupportedMessages = [
//     'Only PDF, JPEG, PNG and WEBP files are allowed.',
//     'Only MP4, MOV and WEBM videos are allowed.',
//     'Only XLSX and CSV files are allowed.',
//     'Invalid file type. Upload a valid XLSX or CSV file.',
//   ];

//   if (unsupportedMessages.includes(err.message)) {
//     return res.status(400).json({
//       success: false,
//       message: err.message,
//     });
//   }

//   // Application errors
//   const statusCode = err.statusCode || 500;

//   return res.status(statusCode).json({
//     success: false,
//     message: statusCode >= 500
//       ? 'Internal Server Error'
//       : err.message || 'Request failed.',
//   });
// };

// // ============================================
// // 2. PERMISSION CHECK
// // ============================================
// const requirePermission = (...required) => (req, res, next) => {
//   if (!req.user) {
//     return res.status(401).json({ success: false, message: 'Unauthorized' });
//   }

//   const perms = req.user.permissions || [];
//   if (perms.includes('*') || required.some((code) => perms.includes(code))) {
//     return next();
//   }

//   return res.status(403).json({
//     success: false,
//     code: 'FORBIDDEN',
//     message: `Forbidden: Missing permission "${required.join('" or "')}"`,
//   });
// };

// // ============================================
// // EXPORTS
// // ============================================
// module.exports = errorMiddleware;
// module.exports.requirePermission = requirePermission;

// middlewares/errorMiddleware.js
const multer = require('multer');

// ============================================
// 1. GLOBAL ERROR HANDLER
// ============================================
const errorMiddleware = (err, req, res, next) => {
  // Log for debugging
  console.error('[ERROR]', {
    message: err.message,
    name: err.name,
    code: err.code,
    url: req.originalUrl,
    method: req.method,
    stack: err.stack,
  });

  // Multer errors (file upload)
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

  // ============================================
  // MONGOOSE / DATABASE ERRORS
  // ============================================

  // CastError → bad/missing ObjectId (e.g. req.user.id was undefined)
  // This is the most common cause of "500" from the APK side.
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path || 'identifier'} value.`,
    });
  }

  // Mongoose schema validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: Object.values(err.errors || {}).map((e) => e.message),
    });
  }

  // Duplicate key on a unique index
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate value for a unique field.',
    });
  }

  // Mongoose DocumentNotFoundError
  if (err.name === 'DocumentNotFoundError') {
    return res.status(404).json({
      success: false,
      message: 'Document not found.',
    });
  }

  // ============================================
  // JWT / AUTH ERRORS
  // ============================================
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication token has expired.',
    });
  }

  // ============================================
  // APPLICATION ERRORS
  // ============================================
  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500
        ? 'Internal Server Error'
        : err.message || 'Request failed.',
  });
};

// ============================================
// 2. PERMISSION CHECK
// ============================================
const requirePermission = (...required) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const perms = req.user.permissions || [];
  if (perms.includes('*') || required.some((code) => perms.includes(code))) {
    return next();
  }

  return res.status(403).json({
    success: false,
    code: 'FORBIDDEN',
    message: `Forbidden: Missing permission "${required.join('" or "')}"`,
  });
};

// ============================================
// EXPORTS
// ============================================
module.exports = errorMiddleware;
module.exports.requirePermission = requirePermission;