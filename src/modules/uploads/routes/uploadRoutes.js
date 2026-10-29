
const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');
const { upload } = require('../middleware/uploadMiddleware');
const uploadController = require('../controllers/uploadController');

// All upload endpoints require authentication.
router.use(verifyToken);

// Upload a single PDF/image.
router.post('/', upload.single('file'), uploadController.uploadFile);

// List files uploaded by the current user.
router.get('/', uploadController.getMyUploads);

// Download a file owned by the current user.
router.get('/:id/download', uploadController.downloadFile);

module.exports = router;
