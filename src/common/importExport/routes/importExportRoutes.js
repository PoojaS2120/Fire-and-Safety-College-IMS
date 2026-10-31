const express = require('express');
const router = express.Router();

const controller = require('../controllers/importExportController');
const { upload } = require('../middleware/uploadMiddleware');

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

router.use(verifyToken);

// Students: only super_admin and office_staff.
// Library: retain existing librarian access.
const authorizeImportExport = (req, res, next) => {
  const allowedRoles =
    req.params.moduleName === 'students'
      ? ['super_admin', 'office_staff']
      : ['super_admin', 'office_staff', 'librarian'];

  return authorize(...allowedRoles)(req, res, next);
};

router.post(
  '/:moduleName/:entityName/import',
  authorizeImportExport,
  upload.single('file'),
  controller.importData
);

router.get(
  '/:moduleName/:entityName/export',
  authorizeImportExport,
  controller.exportData
);

router.get(
  '/:moduleName/:entityName/template',
  authorizeImportExport,
  controller.downloadTemplate
);

module.exports = router;