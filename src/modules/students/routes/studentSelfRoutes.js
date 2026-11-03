const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

const studentSelfController = require('../controllers/studentSelfController');

router.use(verifyToken, authorize('student'));

router.get('/profile', studentSelfController.getMyProfile);
router.get('/course', studentSelfController.getMyCourse);

module.exports = router;