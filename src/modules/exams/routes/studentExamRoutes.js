const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');
const validate = require('../../../middlewares/validate');

const examFormController = require('../controllers/examFormController');
const { submitExamFormSchema, eligibilityQuerySchema } = require('../validations/examFormValidation');

router.use(verifyToken, authorize('student'));

// Check eligibility for an exam (fee gate preview)
router.get(
  '/eligibility',
  validate(eligibilityQuerySchema, 'query'),
  examFormController.checkEligibility
);

// Submit exam form
router.post(
  '/',
  validate(submitExamFormSchema),
  examFormController.submitExamForm
);

// Own forms
router.get(
  '/',
  examFormController.getMyExamForms
);

// Own form by ID
router.get(
  '/:id',
  examFormController.getExamFormById
);

module.exports = router;