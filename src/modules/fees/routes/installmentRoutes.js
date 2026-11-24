// const express = require('express');
// const router = express.Router();
// const installmentController = require('../controllers/installmentController');
// const { verifyToken } = require('../../../middlewares/auth');
// const { authorize } = require('../../../middlewares/authorize');

// router.use(verifyToken);

// // Generate installment ledger (only for components with installment_config > 1)
// router.post(
//   '/generate',
//   authorize('super_admin', 'office_staff'),
//   installmentController.generate
// );

// // Get installment + concession-aware summary
// router.get(
//   '/:studentId/summary',
//   authorize('super_admin', 'office_staff', 'student'),
//   installmentController.getSummary
// );

// // Apply concession to a student
// router.post(
//   '/:studentId/apply-concession',
//   authorize('super_admin', 'office_staff'),
//   installmentController.applyConcession
// );

// // Remove concession from a student
// router.delete(
//   '/:studentId/concession',
//   authorize('super_admin', 'office_staff'),
//   installmentController.removeConcession
// );

// module.exports = router;


const express = require('express');
const router = express.Router();
const installmentController = require('../controllers/installmentController');
const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

router.use(verifyToken);

// Set the payment plan: one-time or installments (super admin sets dates + amounts)
router.post(
  '/generate',
  authorize('super_admin', 'office_staff'),
  installmentController.generate
);

// Apply a group concession to several students at once
// (must stay ABOVE the /:studentId routes)
router.post(
  '/apply-group-concession',
  authorize('super_admin', 'office_staff'),
  installmentController.applyGroupConcession
);

// Fee summary with installments + concession
router.get(
  '/:studentId/summary',
  authorize('super_admin', 'office_staff', 'student'),
  installmentController.getSummary
);

// Apply concession to one student
router.post(
  '/:studentId/apply-concession',
  authorize('super_admin', 'office_staff'),
  installmentController.applyConcession
);

// Remove concession (the Fees screen calls the apply-concession path with DELETE)
router.delete(
  '/:studentId/concession',
  authorize('super_admin', 'office_staff'),
  installmentController.removeConcession
);
router.delete(
  '/:studentId/apply-concession',
  authorize('super_admin', 'office_staff'),
  installmentController.removeConcession
);

module.exports = router;