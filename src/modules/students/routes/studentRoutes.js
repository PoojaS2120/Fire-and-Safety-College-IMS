// const express = require('express');
// const router = express.Router();

// const { verifyToken } = require('../../../middlewares/auth');
// const { authorize } = require('../../../middlewares/authorize');

// const studentController = require('../controllers/studentController');

// router.use(verifyToken, authorize('super_admin', 'office_staff'));

// router.post('/', studentController.createStudent);
// router.get('/', studentController.getStudents);
// router.get('/:id/summary', studentController.getStudentSummary);
// router.get('/:id/stage-history', studentController.getStudentStageHistory);
// router.get('/:id', studentController.getStudentById);

// router.put('/:id/assign', studentController.assignCourseAndBatch);
// router.put('/:id/stage', studentController.updateStudentStage);
// router.put('/:id', studentController.updateStudent);

// router.patch('/:id/status', studentController.updateStudentStatus);

// module.exports = router;

const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

const studentController = require('../controllers/studentController');

// Base auth for all routes in this file
router.use(verifyToken);

// 🚨 FIX: Allow faculty to view the student list (needed for marks entry)
router.get(
  '/', 
  authorize('super_admin', 'office_staff', 'faculty'), 
  studentController.getStudents
);

// Restrict all other modification routes to Admin/Staff
router.post('/', authorize('super_admin', 'office_staff'), studentController.createStudent);
router.get('/:id/summary', authorize('super_admin', 'office_staff'), studentController.getStudentSummary);
router.get('/:id/stage-history', authorize('super_admin', 'office_staff'), studentController.getStudentStageHistory);
router.get('/:id', authorize('super_admin', 'office_staff'), studentController.getStudentById);

router.put('/:id/assign', authorize('super_admin', 'office_staff'), studentController.assignCourseAndBatch);
router.put('/:id/stage', authorize('super_admin', 'office_staff'), studentController.updateStudentStage);
router.put('/:id', authorize('super_admin', 'office_staff'), studentController.updateStudent);

router.patch('/:id/status', authorize('super_admin', 'office_staff'), studentController.updateStudentStatus);

module.exports = router;