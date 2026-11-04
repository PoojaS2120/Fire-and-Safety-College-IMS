const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

const studentSelfController = require('../controllers/studentSelfController');
const studentResultController = require('../controllers/studentResultController');
const libraryController = require('../../library/controllers/libraryController');

// All routes below require a valid student token
router.use(verifyToken, authorize('student'));

// ---------- PROFILE ----------
router.get('/profile', studentSelfController.getMyProfile);
router.get('/course', studentSelfController.getMyCourse);

// ---------- RESULTS ----------
router.get('/results', studentResultController.getMyExamResults);
router.get('/results/tests', studentResultController.getMyTestResults);

// ---------- LIBRARY ----------
router.get('/library-history', libraryController.getMyBorrowedBooks);

module.exports = router;