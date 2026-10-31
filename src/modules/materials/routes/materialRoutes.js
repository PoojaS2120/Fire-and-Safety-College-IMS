const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

const materialController = require('../controllers/materialController');

const {
  validateCreateMaterial,
  validateUpdateMaterial,
  validateMaterialStatus,
} = require('../validations/materialValidation');

// All material routes require authentication.
router.use(verifyToken);

// Get authenticated student's watermark identity.
router.get(
  '/watermark-identity',
  authorize('student'),
  materialController.getWatermarkIdentity
);

// Create study material (PDF or video).
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

// Stream video with HTTP Range support.
router.get(
  '/:id/stream',
  authorize('super_admin', 'office_staff', 'faculty', 'student'),
  materialController.streamVideo
);

// View PDF study material.
router.get(
  '/:id/download',
  authorize('super_admin', 'office_staff', 'faculty', 'student'),
  materialController.downloadPdf
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

// Archive or reactivate material.
router.patch(
  '/:id/status',
  authorize('super_admin', 'faculty'),
  validateMaterialStatus,
  materialController.updateMaterialStatus
);

module.exports = router;