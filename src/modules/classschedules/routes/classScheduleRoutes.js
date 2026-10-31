
const express = require('express');
const router = express.Router();

const classScheduleController = require('../controllers/classScheduleController');

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

// Create schedule
router.post(
  '/',
  verifyToken,
  authorize('super_admin'),
  classScheduleController.createSchedule
);

// List schedules
router.get(
  '/',
  verifyToken,
  authorize('super_admin', 'faculty'),
  classScheduleController.getSchedules
);

// Get schedule by ID
router.get(
  '/:id',
  verifyToken,
  authorize('super_admin', 'faculty'),
  classScheduleController.getScheduleById
);

// Update schedule
router.put(
  '/:id',
  verifyToken,
  authorize('super_admin'),
  classScheduleController.updateSchedule
);

// Cancel schedule
router.patch(
  '/:id/cancel',
  verifyToken,
  authorize('super_admin'),
  classScheduleController.cancelSchedule
);

module.exports = router;
