
// // module.exports = router;
// const express = require('express');
// const router = express.Router();
// const {
//   upload
// } = require('../../uploads/middleware/uploadMiddleware');
// const noticeController = require('../controllers/noticeController');

// const { verifyToken } = require('../../../middlewares/auth');
// // IMPORT BOTH: We need authorize for Delete, and authorizeOrPermission for the rest
// const { authorize, authorizeOrPermission } = require('../../../middlewares/authorize'); 

// // All Notice APIs require authentication
// router.use(verifyToken);

// // Upload PDF notice
// router.post(
//   '/upload',
//   authorizeOrPermission('notices.create', 'super_admin', 'office_staff'),
//   upload.single('file'),
//   noticeController.uploadPdfNotice
// );
// // Download notice PDF
// router.get(
//   '/:id/file',
//   authorizeOrPermission('notices.view', 'super_admin', 'office_staff'),
//   noticeController.downloadNoticeFile
// );
// // Create notice
// router.post(
//   '/',
//   authorizeOrPermission('notices.create', 'super_admin', 'office_staff'),
//   noticeController.createNotice
// );

// // List notices
// router.get(
//   '/',
//   authorizeOrPermission('notices.view', 'super_admin', 'office_staff'),
//   noticeController.listNotices
// );

// // Get notice details
// router.get(
//   '/:id',
//   authorizeOrPermission('notices.view', 'super_admin', 'office_staff'),
//   noticeController.getNotice
// );

// // Update notice
// router.put(
//   '/:id',
//   authorizeOrPermission('notices.edit', 'super_admin', 'office_staff'),
//   noticeController.updateNotice
// );

// // Publish / Withdraw notice
// router.put(
//   '/:id/status',
//   authorizeOrPermission('notices.edit', 'super_admin', 'office_staff'),
//   noticeController.updateNoticeStatus
// );

// // Delete notice (Strictly Super Admin only)
// router.delete(
//   '/:id',
//   authorize('super_admin'), // <-- This was causing the crash because it was missing from the import
//   noticeController.deleteNotice
// );

// module.exports = router;



// const express = require('express');
// const router = express.Router();

// const noticeController = require('../controllers/noticeController');

// const { verifyToken } = require('../../../middlewares/auth');
// const { authorize } = require('../../../middlewares/authorize');

// // All Notice APIs require authentication
// router.use(verifyToken);

// // Create notice
// router.post(
//   '/',
//   authorize('super_admin', 'office_staff'),
//   noticeController.createNotice
// );

// // List notices
// router.get(
//   '/',
//   authorize('super_admin', 'office_staff'),
//   noticeController.listNotices
// );

// // Get notice details
// router.get(
//   '/:id',
//   authorize('super_admin', 'office_staff'),
//   noticeController.getNotice
// );

// // Update notice
// router.put(
//   '/:id',
//   authorize('super_admin', 'office_staff'),
//   noticeController.updateNotice
// );

// // Publish / Withdraw notice
// router.put(
//   '/:id/status',
//   authorize('super_admin', 'office_staff'),
//   noticeController.updateNoticeStatus
// );

// // Delete notice (additional endpoint)
// router.delete(
//   '/:id',
//   authorize('super_admin'),
//   noticeController.deleteNotice
// );

// module.exports = router;
const express = require('express');
const router = express.Router();
const {
  upload
} = require('../../uploads/middleware/uploadMiddleware');
const noticeController = require('../controllers/noticeController');

const { verifyToken } = require('../../../middlewares/auth');
// IMPORT BOTH: We need authorize for Delete, and authorizeOrPermission for the rest
const { authorize, authorizeOrPermission } = require('../../../middlewares/authorize'); 

// All Notice APIs require authentication
router.use(verifyToken);

// Upload PDF notice
router.post(
  '/upload',
  authorizeOrPermission('notices.notices.create', 'super_admin', 'office_staff'),
  upload.single('file'),
  noticeController.uploadPdfNotice
);
// Download notice PDF
router.get(
  '/:id/file',
  authorizeOrPermission('notices.notices.view', 'super_admin', 'office_staff'),
  noticeController.downloadNoticeFile
);
// Create notice
router.post(
  '/',
  authorizeOrPermission('notices.notices.create', 'super_admin', 'office_staff'),
  noticeController.createNotice
);

// List notices
router.get(
  '/',
  authorizeOrPermission('notices.notices.view', 'super_admin', 'office_staff'),
  noticeController.listNotices
);

// Get notice details
router.get(
  '/:id',
  authorizeOrPermission('notices.notices.view', 'super_admin', 'office_staff'),
  noticeController.getNotice
);

// Update notice
router.put(
  '/:id',
  authorizeOrPermission('notices.notices.update', 'super_admin', 'office_staff'),
  noticeController.updateNotice
);

// Publish / Withdraw notice
router.put(
  '/:id/status',
  authorizeOrPermission('notices.notices.update', 'super_admin', 'office_staff'),
  noticeController.updateNoticeStatus
);

// Delete notice (Strictly Super Admin only)
router.delete(
  '/:id',
  authorizeOrPermission('notices.notices.delete', 'super_admin'),
  noticeController.deleteNotice
);

module.exports = router;