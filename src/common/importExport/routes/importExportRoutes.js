
const express = require('express');
const router = express.Router();

const controller = require('../controllers/importExportController');
const { upload } = require('../middleware/uploadMiddleware');

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

// All import/export APIs require authentication.
router.use(verifyToken);

// Import Excel/CSV
router.post(
  '/:moduleName/:entityName/import',
  authorize('super_admin', 'office_staff', 'librarian'),
  upload.single('file'),
  controller.importData
);

// Export Excel/CSV
router.get(
  '/:moduleName/:entityName/export',
  authorize('super_admin', 'office_staff', 'librarian'),
  controller.exportData
);

// Download import template
router.get(
  '/:moduleName/:entityName/template',
  authorize('super_admin', 'office_staff', 'librarian'),
  controller.downloadTemplate
);

module.exports = router;
