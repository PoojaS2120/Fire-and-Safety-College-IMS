
const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

const studentController = require('../controllers/studentController');

// Base authentication
router.use(verifyToken);

// Student list — faculty can also view
router.get(
  '/',
  authorize('super_admin', 'office_staff', 'faculty'),
  studentController.getStudents
);

// Direct admission — no enquiry required
router.post(
  '/direct-admission',
  authorize('super_admin', 'office_staff'),
  studentController.createDirectAdmission
);

// Existing student routes
router.post(
  '/',
  authorize('super_admin', 'office_staff'),
  studentController.createStudent
);

router.get(
  '/:id/summary',
  authorize('super_admin', 'office_staff'),
  studentController.getStudentSummary
);

router.get(
  '/:id/stage-history',
  authorize('super_admin', 'office_staff'),
  studentController.getStudentStageHistory
);

router.get(
  '/:id',
  authorize('super_admin', 'office_staff'),
  studentController.getStudentById
);

router.put(
  '/:id/assign',
  authorize('super_admin', 'office_staff'),
  studentController.assignCourseAndBatch
);

router.put(
  '/:id/stage',
  authorize('super_admin', 'office_staff'),
  studentController.updateStudentStage
);

router.put(
  '/:id',
  authorize('super_admin', 'office_staff'),
  studentController.updateStudent
);

router.patch(
  '/:id/status',
  authorize('super_admin', 'office_staff'),
  studentController.updateStudentStatus
);


module.exports = router;
