
const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

const materialController = require('../controllers/materialController');

const {
  validateCreateMaterial,
  validateUpdateMaterial,
} = require('../validations/materialValidation');

// All material routes require authentication.
router.use(verifyToken);

// Get authenticated student's watermark identity.
router.get(
  '/watermark-identity',
  authorize('student'),
  materialController.getWatermarkIdentity
);

// Create study material.
router.post(
  '/',
  authorize('super_admin', 'faculty'),
  validateCreateMaterial,
  materialController.createMaterial
);

// Get all accessible study materials.
router.get(
  '/',
  authorize('super_admin', 'office_staff', 'faculty', 'student'),
  materialController.getMaterials
);

// View PDF study material.
router.get(
  '/:id/view',
  authorize('super_admin', 'office_staff', 'faculty', 'student'),
  materialController.viewDocument
);

// Download original document (PDF, PPT, PPTX, DOC, DOCX).
router.get(
  '/:id/download',
  authorize('super_admin', 'office_staff', 'faculty', 'student'),
  materialController.downloadDocument
);

// Stream video with HTTP Range support.
router.get(
  '/:id/stream',
  authorize('super_admin', 'office_staff', 'faculty', 'student'),
  materialController.streamVideo
);

// Get material details by ID.
router.get(
  '/:id',
  authorize('super_admin', 'office_staff', 'faculty', 'student'),
  materialController.getMaterialById
);

// Update material details.
router.put(
  '/:id',
  authorize('super_admin', 'faculty'),
  validateUpdateMaterial,
  materialController.updateMaterial
);


// Permanently delete study material.
router.delete(
  '/:id',
  authorize('super_admin', 'faculty'),
  materialController.deleteMaterial
);

module.exports = router;
