const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');
const validate = require('../../../middlewares/validate');

const examFormController = require('../controllers/examFormController');
const {
  submitExamFormSchema,
  overrideExamFormSchema,
  listExamFormsSchema,
  eligibilityQuerySchema,
} = require('../validations/examFormValidation');

router.use(verifyToken);

// Eligibility check (staff checks any student)
router.get(
  '/eligibility',
  authorize('super_admin', 'office_staff'),
  validate(eligibilityQuerySchema, 'query'),
  examFormController.checkEligibility
);

// Submit form on behalf of student (rare, but useful)
router.post(
  '/',
  authorize('super_admin', 'office_staff'),
  validate(submitExamFormSchema),
  examFormController.submitExamForm
);

// List forms
router.get(
  '/',
  authorize('super_admin', 'office_staff', 'faculty'),
  validate(listExamFormsSchema, 'query'),
  examFormController.listExamForms
);

// Get form by ID
router.get(
  '/:id',
  authorize('super_admin', 'office_staff', 'faculty'),
  examFormController.getExamFormById
);

// Override (Super Admin only)
router.put(
  '/:id/override',
  authorize('super_admin'),
  validate(overrideExamFormSchema),
  examFormController.overrideExamForm
);

module.exports = router;