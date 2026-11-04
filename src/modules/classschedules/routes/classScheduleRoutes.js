const express = require('express');
const router = express.Router();

const classScheduleController = require('../controllers/classScheduleController');
const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

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