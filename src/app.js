
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const connectDB = require('./config/db');

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

// Health Check API
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'IMS Backend is running with MongoDB',
  });
});

// --- ROUTES ---
app.use('/api/v1/auth', require('./modules/auth/routes/authRoutes'));
app.use('/api/v1/users', require('./modules/users/routes/userRoutes'));
app.use('/api/v1/uploads', require('./modules/uploads/routes/uploadRoutes'));
app.use('/api/v1/courses', require('./modules/courses/routes/courseRoutes'));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);

  // Multer file upload errors
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

  // Unsupported file type
  if (
    err.message ===
    'Only PDF, JPEG, PNG and WEBP files are allowed.'
  ) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Other application errors
  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500
        ? 'Internal Server Error'
        : err.message || 'Request failed.',
  });
});

// Export application
module.exports = app;
