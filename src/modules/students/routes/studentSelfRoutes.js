// const express = require('express');
// const router = express.Router();

// const { verifyToken } = require('../../../middlewares/auth');
// const { authorize } = require('../../../middlewares/authorize');

// const studentSelfController = require('../controllers/studentSelfController');
// const studentResultController = require('../controllers/studentResultController');
// const libraryController = require('../../library/controllers/libraryController');
// const classScheduleController = require('../../classschedules/controllers/classScheduleController');

// // All routes below require a valid student token
// router.use(verifyToken, authorize('student'));

// // ---------- PROFILE ----------
// router.get('/profile', studentSelfController.getMyProfile);
// router.get('/course', studentSelfController.getMyCourse);

// // ---------- RESULTS ----------
// router.get('/results', studentResultController.getMyExamResults);
// router.get('/results/tests', studentResultController.getMyTestResults);

// // ---------- LIBRARY ----------
// router.get('/library-history', libraryController.getMyBorrowedBooks);

// // ---------- SCHEDULE ----------
// router.get('/schedule', classScheduleController.getSchedules);

// module.exports = router;


const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

const studentSelfController = require('../controllers/studentSelfController');
const studentResultController = require('../controllers/studentResultController');
const libraryController = require('../../library/controllers/libraryController');
const classScheduleController = require('../../classschedules/controllers/classScheduleController');
const materialController = require('../../materials/controllers/materialController');
const feeController = require('../../fees/controllers/feeController');

// All routes below require a valid student token
router.use(verifyToken, authorize('student'));

// ==========================================================
// PROFILE
// ==========================================================
router.get('/profile', studentSelfController.getMyProfile);
router.get('/course', studentSelfController.getMyCourse);

// ==========================================================
// RESULTS
// ==========================================================
router.get('/results', studentResultController.getMyExamResults);
router.get('/results/tests', studentResultController.getMyTestResults);

// ==========================================================
// LIBRARY
// ==========================================================
router.get('/library-history', libraryController.getMyBorrowedBooks);

// ==========================================================
// SCHEDULE
// ==========================================================
router.get('/schedule', classScheduleController.getSchedules);

// ==========================================================
// MATERIALS
// ==========================================================
router.get('/materials', materialController.getMaterials);
router.get(
  '/materials/watermark-identity',
  materialController.getWatermarkIdentity
);
router.get('/materials/:id', materialController.getMaterialById);
router.get('/materials/:id/download', materialController.downloadPdf);
router.get('/materials/:id/stream', materialController.streamVideo);

// ==========================================================
// FEES
// ==========================================================
router.get('/fees', feeController.getMyFees);
router.get('/fees/summary', feeController.getMyFees);

// ==========================================================
// PAYMENTS
// ==========================================================
router.get('/payments', feeController.getMyPayments);
router.get('/payments/:paymentId/receipt', feeController.getReceipt);
router.get(
  '/payments/:paymentId/receipt/pdf',
  feeController.downloadReceipt
);

module.exports = router;