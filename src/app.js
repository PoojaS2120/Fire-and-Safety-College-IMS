
// const express = require('express');
// const cors = require('cors');
// const helmet = require('helmet');
// const connectDB = require('./config/db');
// const errorMiddleware = require('./middlewares/errorMiddleware');

// // Connect to Database
// connectDB();

// // Initialize Express
// const app = express();

// // ============================================================
// // MIDDLEWARE
// // ============================================================
// app.use(helmet());

// app.use(cors({
//   origin: '*',
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// }));

// app.use(express.json());

// // ============================================================
// // HEALTH CHECK
// // ============================================================
// app.get('/health', (req, res) => {
//   res.status(200).json({
//     status: 'OK',
//     message: 'IMS Backend is running with MongoDB',
//   });
// });

// // ============================================================
// // API ROUTES
// // ============================================================

// // ----- AUTH -----
// app.use('/api/v1/auth', require('./modules/auth/routes/authRoutes'));

// // ----- USERS -----
// app.use('/api/v1/users', require('./modules/users/routes/userRoutes'));

// // ----- CORE -----
// app.use('/api/v1/courses', require('./modules/courses/routes/courseRoutes'));
// app.use('/api/v1/uploads', require('./modules/uploads/routes/uploadRoutes'));
// app.use(
//   '/api/v1/faculty-assignments',
//   require('./modules/faculty/routes/facultyRoutes')
// );

// // ----- ENQUIRY & STUDENTS -----
// app.use('/api/v1/enquiries', require('./modules/enquiries/routes/enquiryRoutes'));
// app.use('/api/v1/students', require('./modules/students/routes/studentRoutes'));


// // ----- DOCUMENTS -----
// app.use('/api/v1', require('./modules/documents/routes/documentRoutes'));

// // ----- FEES -----
// // Main branch routes
// app.use('/api/v1/audit-logs', require('./modules/audit/routes/auditRoutes'));
// app.use('/api/v1/fees', require('./modules/fees/routes/feeRoutes'));

// // ----- LIBRARY -----
// app.use('/api/v1/library', require('./modules/library/routes/libraryRoutes'));

// // ----- NOTICES -----
// app.use('/api/v1/notices', require('./modules/notices/routes/noticeRoutes'));

// // ----- ACADEMICS -----
// // NOTE: changed /classschedules -> /class-schedules (hyphen standard)
// app.use(
//   '/api/v1/class-schedules',
//   require('./modules/classschedules/routes/classScheduleRoutes')
// );

// app.use(
//   '/api/v1/materials',
//   require('./modules/materials/routes/materialRoutes')
// );


// // ClassTest and Mark Management - B34

// app.use(
//   '/api/v1/class-tests',
//   require('./modules/classtests/routes/classTestRoutes')
// );


// // Student App Routes - B26
// app.use(
//   '/api/v1/student',
//   require('./modules/studentapp/routes/studentAppRoutes')
// );

// // Exams and Marks Management - B35

// app.use(
//   '/api/v1/exams',
//   require('./modules/exams/routes/examRoutes')
// );

// app.use('/api/v1/exam-forms', require('./modules/exams/routes/examFormRoutes'));
// app.use('/api/v1/student/exam-forms', require('./modules/exams/routes/studentExamRoutes'));

// app.use(
//   '/api/v1/exam-forms',
//   require('./modules/exams/routes/examFormRoutes')
// );

// // ----- TC / LC -----
// app.use('/api/v1/tc-lc', require('./modules/tclc/routes/tclcRoutes'));

// // ----- AUDIT LOGS -----
// app.use('/api/v1/audit-logs', require('./modules/audit/routes/auditRoutes'));

// // ----- IMPORT / EXPORT (Excel) -----
// app.use(
//   '/api/v1/import-export',
//   require('./common/importExport/routes/importExportRoutes')
// );

// // ============================================================
// // STUDENT APP (APK) ROUTES
// // ============================================================
// // Order matters:
// //   1. /student/exam-forms — specific route, register FIRST
// //   2. /student             — generic fallback, register LAST
// // Both require student role, so auth is fine either way.
// // ============================================================

// app.use(
//   '/api/v1/student/exam-forms',
//   require('./modules/exams/routes/studentExamRoutes')
// );

// app.use(
//   '/api/v1/student',
//   require('./modules/students/routes/studentSelfRoutes')
// );

// // ============================================================
// // GLOBAL ERROR HANDLER
// // ============================================================
// app.use(errorMiddleware);

// module.exports = app;



const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const errorMiddleware = require('./middlewares/errorMiddleware');

// Connect to Database
connectDB();

// Initialize Express
const app = express();

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(helmet());

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'IMS Backend is running with MongoDB',
  });
});

// ============================================================
// API ROUTES
// ============================================================

// AUTH
app.use('/api/v1/auth', require('./modules/auth/routes/authRoutes'));

// USERS
app.use('/api/v1/users', require('./modules/users/routes/userRoutes'));

// CORE
app.use('/api/v1/courses', require('./modules/courses/routes/courseRoutes'));
app.use('/api/v1/uploads', require('./modules/uploads/routes/uploadRoutes'));

app.use(
  '/api/v1/faculty-assignments',
  require('./modules/faculty/routes/facultyRoutes')
);

// ENQUIRY & STUDENTS
app.use('/api/v1/enquiries', require('./modules/enquiries/routes/enquiryRoutes'));
app.use('/api/v1/students', require('./modules/students/routes/studentRoutes'));

// STUDENT RESULTS
app.use(
  '/api/v1/student-results',
  require('./modules/students/routes/studentResultRoutes')
);

// DOCUMENTS
app.use('/api/v1', require('./modules/documents/routes/documentRoutes'));

// AUDIT LOGS
app.use('/api/v1/audit-logs', require('./modules/audit/routes/auditRoutes'));

// FEES
app.use('/api/v1/fees', require('./modules/fees/routes/feeRoutes'));

// LIBRARY
app.use('/api/v1/library', require('./modules/library/routes/libraryRoutes'));

// NOTICES
app.use('/api/v1/notices', require('./modules/notices/routes/noticeRoutes'));

// ACADEMICS
app.use(
  '/api/v1/class-schedules',
  require('./modules/classschedules/routes/classScheduleRoutes')
);

app.use(
  '/api/v1/materials',
  require('./modules/materials/routes/materialRoutes')
);

// CLASS TESTS
app.use(
  '/api/v1/class-tests',
  require('./modules/classtests/routes/classTestRoutes')
);

// EXAMS AND MARKS
app.use('/api/v1/exams', require('./modules/exams/routes/examRoutes'));

app.use(
  '/api/v1/exam-forms',
  require('./modules/exams/routes/examFormRoutes')
);

// TC / LC
app.use('/api/v1/tc-lc', require('./modules/tclc/routes/tclcRoutes'));

// IMPORT / EXPORT
app.use(
  '/api/v1/import-export',
  require('./common/importExport/routes/importExportRoutes')
);
//DASHBOARD

app.use('/api/v1/dashboard', require('./modules/dashboard/routes/dashboardRoutes'));

//EXCEL REPORTS 

app.use('/api/v1/reports', require('./modules/reports/routes/reportRoutes'));

// ============================================================
// STUDENT APP ROUTES
// Register specific routes before generic student routes.
// ============================================================

// Student exam forms
app.use(
  '/api/v1/student/exam-forms',
  require('./modules/exams/routes/studentExamRoutes')
);

// Student App - B26
app.use(
  '/api/v1/student',
  require('./modules/studentapp/routes/studentAppRoutes')
);

// Student Self-Service
app.use(
  '/api/v1/student',
  require('./modules/students/routes/studentSelfRoutes')
);

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================
app.use(errorMiddleware);

module.exports = app;