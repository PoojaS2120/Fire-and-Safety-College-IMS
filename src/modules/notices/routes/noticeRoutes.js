
const express = require('express');
const router = express.Router();

const noticeController = require('../controllers/noticeController');

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

// All Notice APIs require authentication
router.use(verifyToken);

// Create notice
router.post(
  '/',
  authorize('super_admin', 'office_staff'),
  noticeController.createNotice
);

// List notices
router.get(
  '/',
  authorize('super_admin', 'office_staff'),
  noticeController.listNotices
);

// Get notice details
router.get(
  '/:id',
  authorize('super_admin', 'office_staff'),
  noticeController.getNotice
);

// Update notice
router.put(
  '/:id',
  authorize('super_admin', 'office_staff'),
  noticeController.updateNotice
);

// Publish / Withdraw notice
router.put(
  '/:id/status',
  authorize('super_admin', 'office_staff'),
  noticeController.updateNoticeStatus
);

// Delete notice (additional endpoint)
router.delete(
  '/:id',
  authorize('super_admin'),
  noticeController.deleteNotice
);

module.exports = router;
