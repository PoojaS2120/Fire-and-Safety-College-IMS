const express = require('express');
const router = express.Router();

const controller = require('../controllers/importExportController');
const { upload } = require('../middleware/uploadMiddleware');

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

// All import/export APIs require authentication.
router.use(verifyToken);

// Role-based authorization
const authorizeImportExport = (req, res, next) => {
  const allowedRoles =
    req.params.moduleName === 'students'
      ? ['super_admin', 'office_staff']
      : ['super_admin', 'office_staff', 'librarian'];

  return authorize(...allowedRoles)(req, res, next);
};

// Import Excel/CSV
router.post(
  '/:moduleName/:entityName/import',
  authorizeImportExport,
  upload.single('file'),
  controller.importData
);

// Export Excel/CSV
router.get(
  '/:moduleName/:entityName/export',
  authorizeImportExport,
  controller.exportData
);

// Download import template
router.get(
  '/:moduleName/:entityName/template',
  authorizeImportExport,
  controller.downloadTemplate
);

module.exports = router;