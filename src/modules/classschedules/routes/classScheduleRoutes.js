// const express = require('express');
// const router = express.Router();
// const multer = require('multer');
// const path = require('path');

// const classScheduleController = require('../controllers/classScheduleController');
// const { verifyToken } = require('../../../middlewares/auth');
// const { authorize } = require('../../../middlewares/authorize');

// // Setup Multer for in-memory Excel parsing
// const upload = multer({
//   storage: multer.memoryStorage(),
//   fileFilter: (req, file, cb) => {
//     const allowed = ['.xlsx', '.xls', '.csv'];
//     const ext = path.extname(file.originalname).toLowerCase();
//     if (!allowed.includes(ext)) {
//       return cb(new Error('Only Excel (.xlsx) or CSV files are allowed'));
//     }
//     cb(null, true);
//   },
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
// });

// // ==========================================================
// // BULK IMPORT (Must be before /:id routes)
// // ==========================================================
// router.post(
//   '/import',
//   verifyToken,
//   authorize('super_admin', 'office_staff'),
//   upload.single('file'),
//   classScheduleController.importSchedules
// );

// // ==========================================================
// // STANDARD CRUD
// // ==========================================================

// // Create — super_admin or faculty (faculty must be assigned)
// router.post(
//   '/',
//   verifyToken,
//   authorize('super_admin', 'faculty'),
//   classScheduleController.createSchedule
// );

// // List — all roles (role filtering happens in service)
// router.get(
//   '/',
//   verifyToken,
//   authorize('super_admin', 'office_staff', 'faculty', 'student'),
//   classScheduleController.getSchedules
// );

// // Get by ID — all roles (access check in service)
// router.get(
//   '/:id',
//   verifyToken,
//   authorize('super_admin', 'office_staff', 'faculty', 'student'),
//   classScheduleController.getScheduleById
// );

// // Update — super_admin or faculty (own only)
// router.put(
//   '/:id',
//   verifyToken,
//   authorize('super_admin', 'faculty'),
//   classScheduleController.updateSchedule
// );

// // Cancel — super_admin or faculty (own only)
// router.patch(
//   '/:id/cancel',
//   verifyToken,
//   authorize('super_admin', 'faculty'),
//   classScheduleController.cancelSchedule
// );

// module.exports = router;





const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const classScheduleController = require('../controllers/classScheduleController');
const classScheduleImportService = require('../services/classScheduleImportService');
const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

// Setup Multer for in-memory Excel parsing
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Only Excel (.xlsx) or CSV files are allowed'));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// ==========================================================
// BULK IMPORT (Must be before /:id routes)
// ==========================================================
router.post(
  '/import',
  verifyToken,
  authorize('super_admin', 'office_staff'),
  upload.single('file'),
  classScheduleController.importSchedules
);

// Blank Excel template for the import above. Must stay above '/:id' so it is not read as an id.
router.get(
  '/import/template',
  verifyToken,
  authorize('super_admin', 'office_staff'),
  (req, res, next) => {
    try {
      const buffer = classScheduleImportService.buildTemplateBuffer();
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', 'attachment; filename="class_schedules_template.xlsx"');
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================================
// STANDARD CRUD
// ==========================================================

// Create — super_admin or faculty (faculty must be assigned)
router.post(
  '/',
  verifyToken,
  authorize('super_admin', 'faculty'),
  classScheduleController.createSchedule
);

// List — all roles (role filtering happens in service)
router.get(
  '/',
  verifyToken,
  authorize('super_admin', 'office_staff', 'faculty', 'student'),
  classScheduleController.getSchedules
);

// Get by ID — all roles (access check in service)
router.get(
  '/:id',
  verifyToken,
  authorize('super_admin', 'office_staff', 'faculty', 'student'),
  classScheduleController.getScheduleById
);

// Update — super_admin or faculty (own only)
router.put(
  '/:id',
  verifyToken,
  authorize('super_admin', 'faculty'),
  classScheduleController.updateSchedule
);

// Cancel — super_admin or faculty (own only)
router.patch(
  '/:id/cancel',
  verifyToken,
  authorize('super_admin', 'faculty'),
  classScheduleController.cancelSchedule
);

module.exports = router;