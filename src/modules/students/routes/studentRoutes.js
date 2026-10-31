
const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

const studentController = require('../controllers/studentController');

// All student routes require authentication and an allowed role.
router.use(
  verifyToken,
  authorize('super_admin', 'office_staff')
);

// POST /api/v1/students
router.post('/', studentController.createStudent);

// GET /api/v1/students
router.get('/', studentController.getStudents);

// GET /api/v1/students/:id
router.get('/:id', studentController.getStudentById);

// PUT /api/v1/students/:id
router.put('/:id', studentController.updateStudent);
// PUT /api/v1/students/:id/stage
router.put('/:id/stage', studentController.updateStudentStage);
// PATCH /api/v1/students/:id/status
router.patch('/:id/status', studentController.updateStudentStatus);
// GET /api/v1/students/:id/stage-history
router.get('/:id/stage-history', studentController.getStudentStageHistory);

module.exports = router;
