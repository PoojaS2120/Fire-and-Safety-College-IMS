
const multer = require('multer');
const path = require('path');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const allowedExtensions = new Set(['.xlsx', '.csv']);

const allowedMimeTypes = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain'
]);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.has(extension)) {
    return cb(new Error('Only XLSX and CSV files are allowed.'));
  }

  if (!allowedMimeTypes.has(file.mimetype)) {
    return cb(new Error('Invalid file type. Upload a valid XLSX or CSV file.'));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
});

module.exports = {
  upload,
  MAX_FILE_SIZE
};
