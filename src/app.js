
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const errorMiddleware = require('./middlewares/errorMiddleware');

// Connect to Database
connectDB();

// Initialize Express
const app = express();

// Middleware
app.use(helmet());

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health Check API
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'IMS Backend is running with MongoDB',
  });
});

// API Routes
app.use('/api/v1/auth', require('./modules/auth/routes/authRoutes'));
app.use('/api/v1/users', require('./modules/users/routes/userRoutes'));
app.use('/api/v1/library', require('./modules/library/routes/libraryRoutes'));
app.use('/api/v1/uploads', require('./modules/uploads/routes/uploadRoutes'));
app.use('/api/v1/courses', require('./modules/courses/routes/courseRoutes'));

// Main branch routes
app.use('/api/v1/audit-logs', require('./modules/audit/routes/auditRoutes'));
app.use('/api/v1/fees', require('./modules/fees/routes/feeRoutes'));
app.use('/api/v1/faculty-assignments', require('./modules/faculty/routes/facultyRoutes'));

// Ritz branch routes
app.use('/api/v1/enquiries', require('./modules/enquiries/routes/enquiryRoutes'));
app.use('/api/v1/students', require('./modules/students/routes/studentRoutes'));
app.use('/api/v1/notices', require('./modules/notices/routes/noticeRoutes'));

// Global Import/Export Routes
app.use(
  '/api/v1/import-export',
  require('./common/importExport/routes/importExportRoutes')
);

// Global Error Handler
app.use(errorMiddleware);

module.exports = app;
