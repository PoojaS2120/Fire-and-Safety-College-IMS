
const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

const iCardController = require('../controllers/iCardController');

// Base authentication
router.use(verifyToken);

// List admitted students
router.get(
  '/students',
  authorize('super_admin', 'office_staff'),
  iCardController.getICardStudents
);

// Fetch individual I-Card details
router.get(
  '/students/:studentId',
  authorize('super_admin', 'office_staff'),
  iCardController.getICardByStudentId
);

module.exports = router;
