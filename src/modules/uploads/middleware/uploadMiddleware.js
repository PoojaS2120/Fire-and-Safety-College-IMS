
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.resolve(process.cwd(), 'private_uploads');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_SIZE = 5 * 1024 * 1024 * 1024; // 5 GB

const allowedMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const allowedExtensions = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
]);

const allowedVideoMimeTypes = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

const allowedVideoExtensions = new Set([
  '.mp4',
  '.mov',
  '.webm',
]);

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${extension}`);
  },
});

// Existing PDF/image upload middleware — unchanged limits.
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (
      !allowedMimeTypes.has(file.mimetype) ||
      !allowedExtensions.has(extension)
    ) {
      return cb(
        new Error('Only PDF, JPEG, PNG and WEBP files are allowed.')
      );
    }

    cb(null, true);
  },
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

// Separate middleware for video uploads.
const uploadVideo = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (
      !allowedVideoMimeTypes.has(file.mimetype) ||
      !allowedVideoExtensions.has(extension)
    ) {
      return cb(
        new Error('Only MP4, MOV and WEBM videos are allowed.')
      );
    }

    cb(null, true);
  },
  limits: {
    fileSize: MAX_VIDEO_SIZE,
    files: 1,
  },
});

module.exports = {
  upload,
  uploadVideo,
  uploadDir,
  MAX_FILE_SIZE,
  MAX_VIDEO_SIZE,
};
