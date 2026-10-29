
const fs = require('fs/promises');
const path = require('path');
const Upload = require('../models/Upload');
const { uploadDir } = require('../middleware/uploadMiddleware');

const saveUpload = async (file, userId) => {
  if (!file) {
    const error = new Error('Please select a file to upload.');
    error.statusCode = 400;
    throw error;
  }

  try {
    const upload = await Upload.create({
      originalName: path.basename(file.originalname),
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      uploadedBy: userId,
    });

    return upload;
  } catch (error) {
    // Avoid leaving an orphaned file if metadata creation fails.
    await fs.unlink(file.path).catch(() => {});
    throw error;
  }
};

const getUserUploads = async (userId) => {
  return Upload.find({ uploadedBy: userId })
    .select('-__v')
    .sort({ createdAt: -1 })
    .lean();
};

const getUploadForUser = async (uploadId, userId) => {
  const upload = await Upload.findOne({
    _id: uploadId,
    uploadedBy: userId,
  }).select('-__v');

  if (!upload) {
    const error = new Error('File not found.');
    error.statusCode = 404;
    throw error;
  }

  const filePath = path.resolve(uploadDir, upload.storedName);

  // Prevent stored metadata from resolving outside the upload directory.
  if (path.dirname(filePath) !== path.resolve(uploadDir)) {
    const error = new Error('Invalid file path.');
    error.statusCode = 400;
    throw error;
  }

  return { upload, filePath };
};

module.exports = {
  saveUpload,
  getUserUploads,
  getUploadForUser,
};
