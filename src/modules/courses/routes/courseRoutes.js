const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

// Only Super Admin can create courses/fees (Per Document Section 15.2)
// Everyone (Admin, Faculty, Student) can view them
router.post('/', verifyToken, authorize('super_admin'), courseController.createCourse);
router.get('/', verifyToken, courseController.getCourses);

// Fee Components (Nested Routes)
router.post('/:courseId/fee-components', verifyToken, authorize('super_admin'), courseController.addFeeComponent);
router.get('/:courseId/fee-components', verifyToken, courseController.getCourseFees);
router.post('/:courseId/batches', verifyToken, authorize('super_admin'), courseController.createBatch);
router.get('/:courseId/batches', verifyToken, courseController.getBatches);

module.exports = router;