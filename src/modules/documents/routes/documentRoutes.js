
const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

const { upload } = require('../../uploads/middleware/uploadMiddleware');
const documentController = require('../controllers/documentController');

// All document routes require authentication.
router.use(verifyToken);

// Upload student document - Super Admin / Office Staff
router.post(
  '/students/:id/documents',
  authorize('super_admin', 'office_staff'),
  upload.single('file'),
  documentController.uploadStudentDocument
);

// List student documents - Super Admin / Office Staff
router.get(
  '/students/:id/documents',
  authorize('super_admin', 'office_staff'),
  documentController.getStudentDocuments
);

// Download document - Super Admin / Office Staff / Student (own only)
router.get(
  '/documents/:id/file',
  authorize('super_admin', 'office_staff', 'student'),
  documentController.downloadStudentDocument
);

// Verify / receive / reject document - Super Admin / Office Staff
router.put(
  '/documents/:id/verify',
  authorize('super_admin', 'office_staff'),
  documentController.updateDocumentStatus
);

// Soft-delete document - Super Admin / Office Staff
router.delete(
  '/documents/:id',
  authorize('super_admin', 'office_staff'),
  documentController.softDeleteDocument
);

module.exports = router;
