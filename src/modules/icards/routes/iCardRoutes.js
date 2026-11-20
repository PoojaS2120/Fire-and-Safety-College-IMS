
const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

const iCardController = require('../controllers/iCardController');

router.use(verifyToken);

// CREATE I-CARD
router.post(
  '/',
  authorize('super_admin', 'office_staff'),
  iCardController.createICard
);

// GET ALL SAVED I-CARDS
router.get(
  '/',
  authorize('super_admin', 'office_staff'),
  iCardController.getAllICards
);

// LIST ELIGIBLE STUDENTS
router.get(
  '/students',
  authorize('super_admin', 'office_staff'),
  iCardController.getICardStudents
);

// PREVIEW STUDENT I-CARD
router.get(
  '/students/:studentId',
  authorize('super_admin', 'office_staff'),
  iCardController.getICardByStudentId
);

// GET SINGLE SAVED I-CARD
router.get(
  '/:id',
  authorize('super_admin', 'office_staff'),
  iCardController.getICardById
);

// UPDATE I-CARD
router.put(
  '/:id',
  authorize('super_admin', 'office_staff'),
  iCardController.updateICard
);

// DELETE I-CARD (SUPER ADMIN ONLY)
router.delete(
  '/:id',
  authorize('super_admin'),
  iCardController.deleteICard
);

module.exports = router;
