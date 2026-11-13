
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.resolve(process.cwd(), 'private_uploads');

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_VIDEO_SIZE = 5 * 1024 * 1024 * 1024; // 5 GB

const allowedMimeTypes = new Map([
  ['.pdf', 'application/pdf'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.ppt', 'application/vnd.ms-powerpoint'],
  ['.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  ['.doc', 'application/msword'],
  ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
]);

const allowedVideoMimeTypes = new Map([
  ['.mp4', 'video/mp4'],
  ['.mov', 'video/quicktime'],
  ['.webm', 'video/webm'],
]);

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const expectedMimeType = allowedMimeTypes.get(extension);

    if (!expectedMimeType || file.mimetype !== expectedMimeType) {
      return cb(
        new Error(
          'Allowed files: PDF, JPG, JPEG, PNG, WEBP, PPT, PPTX, DOC and DOCX.'
        )
      );
    }

    cb(null, true);
  },
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

const uploadVideo = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const expectedMimeType = allowedVideoMimeTypes.get(extension);

    if (!expectedMimeType || file.mimetype !== expectedMimeType) {
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
