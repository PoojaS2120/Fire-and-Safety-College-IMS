
const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');

const {
  upload,
  uploadVideo
} = require('../middleware/uploadMiddleware');

const uploadController = require('../controllers/uploadController');

// All upload endpoints require authentication.
router.use(verifyToken);

// Existing PDF/image upload (maximum 5 MB).
router.post(
  '/',
  upload.single('file'),
  uploadController.uploadFile
);

// New video upload (MP4, MOV, WEBM — maximum 100 MB).
router.post(
  '/videos',
  uploadVideo.single('file'),
  uploadController.uploadVideoFile
);

// List files uploaded by the current user.
router.get(
  '/',
  uploadController.getMyUploads
);

// Download a file owned by the current user.
router.get(
  '/:id/download',
  uploadController.downloadFile
);

// Replace an existing PDF/image file.
router.put(
  '/:id',
  upload.single('file'),
  uploadController.reuploadFile
);

// Delete an uploaded file.
router.delete(
  '/:id',
  uploadController.deleteFile
);

module.exports = router;
