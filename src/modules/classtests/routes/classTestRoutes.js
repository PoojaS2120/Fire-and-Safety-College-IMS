
const express = require('express');
const multer = require('multer');

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

const classTestController = require('../controllers/classTestController');

const router = express.Router();

// --------------------------------------------------
// MULTER CONFIGURATION
// --------------------------------------------------

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.xlsx', '.csv'];
  const extension = require('path')
    .extname(file.originalname)
    .toLowerCase();

  if (!allowedExtensions.includes(extension)) {
    return cb(new Error('Only XLSX and CSV files are allowed.'));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

// --------------------------------------------------
// AUTHENTICATION
// All routes require a valid access token
// --------------------------------------------------

router.use(verifyToken);

// --------------------------------------------------
// CLASS TEST CRUD
// --------------------------------------------------

// Create a class test
router.post(
  '/',
  authorize('super_admin', 'faculty'),
  classTestController.createClassTest
);

// Get all class tests
router.get(
  '/',
  authorize('super_admin', 'office_staff', 'faculty'),
  classTestController.getAllClassTests
);

// Get class test by ID
router.get(
  '/:id',
  authorize('super_admin', 'office_staff', 'faculty'),
  classTestController.getClassTestById
);

// Update class test
router.put(
  '/:id',
  authorize('super_admin', 'faculty'),
  classTestController.updateClassTest
);

// Delete class test
router.delete(
  '/:id',
  authorize('super_admin', 'faculty'),
  classTestController.deleteClassTest
);

// --------------------------------------------------
// STUDENT MARKS
// --------------------------------------------------

// Bulk enter marks
router.post(
  '/:id/marks/bulk',
  authorize('super_admin', 'faculty'),
  classTestController.enterBulkMarks
);

// Update an individual student's marks
router.put(
  '/:id/marks/:studentId',
  authorize('super_admin', 'faculty'),
  classTestController.updateStudentMark
);

// Delete an individual student's marks
router.delete(
  '/:id/marks/:studentId',
  authorize('super_admin', 'faculty'),
  classTestController.deleteStudentMark
);

// Get mark history for a student
router.get(
  '/:id/marks/:studentId/history',
  authorize('super_admin', 'faculty'),
  classTestController.getMarkHistory
);

// --------------------------------------------------
// IMPORT / EXPORT
// --------------------------------------------------

// Import marks from Excel or CSV
router.post(
  '/:id/marks/import',
  authorize('super_admin', 'faculty'),
  upload.single('file'),
  classTestController.importMarks
);

// Export marks as Excel or CSV
router.get(
  '/:id/marks/export',
  authorize('super_admin', 'office_staff', 'faculty'),
  classTestController.exportMarks
);

// Download import template
router.get(
  '/:id/marks/template',
  authorize('super_admin', 'faculty'),
  classTestController.downloadImportTemplate
);

// --------------------------------------------------
// CLASS TEST INSIGHTS
// --------------------------------------------------

router.get(
  '/:id/insights',
  authorize('super_admin', 'faculty'),
  classTestController.getClassInsights
);

module.exports = router;
