const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');
const studentResultController = require('../controllers/studentResultController');

router.use(verifyToken, authorize('student'));

router.get('/results', studentResultController.getMyExamResults);
router.get('/results/exams', studentResultController.getMyExamResults);
router.get('/results/tests', studentResultController.getMyTestResults);

module.exports = router;