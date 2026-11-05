const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');
const dashboardController = require('../controllers/dashboardController');

// All routes require login. Role-based logic is handled inside the service.
router.use(verifyToken);

router.get('/summary', dashboardController.getSummary);
router.get('/course-wise', dashboardController.getCourseWiseStudents);
router.get('/fees-trend', dashboardController.getFeesTrend);
router.get('/recent-activity', dashboardController.getRecentActivity);

module.exports = router;