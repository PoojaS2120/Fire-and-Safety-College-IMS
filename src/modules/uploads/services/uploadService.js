
const fs = require('fs/promises');
const path = require('path');

const Upload = require('../models/Upload');
const { uploadDir } = require('../middleware/uploadMiddleware');

// SAFE FILE PATH
const getSafeFilePath = (storedName) => {
  if (
    typeof storedName !== 'string' ||
    !storedName ||
    path.basename(storedName) !== storedName
  ) {
    const error = new Error('Invalid file path.');
    error.statusCode = 400;
    throw error;
  }

  const resolvedUploadDir = path.resolve(uploadDir);
  const filePath = path.resolve(resolvedUploadDir, storedName);

  // Prevent files from resolving outside the upload directory.
  if (path.dirname(filePath) !== resolvedUploadDir) {
    const error = new Error('Invalid file path.');
    error.statusCode = 400;
    throw error;
  }

  return filePath;
};

// SAVE UPLOAD
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
    // Remove physical file if metadata creation fails.
    if (file.path) {
      await fs.unlink(file.path).catch(() => {});
    }

    throw error;
  }
};

// GET USER UPLOADS
const getUserUploads = async (userId) => {
  return Upload.find({ uploadedBy: userId })
    .select('-__v')
    .sort({ createdAt: -1 })
    .lean();
};

// GET UPLOAD FOR USER
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

  const filePath = getSafeFilePath(upload.storedName);

  return { upload, filePath };
};

// GET UPLOAD FOR AUTHORIZED DOWNLOAD
const getUploadForAuthorizedDownload = async (uploadId) => {
  const upload = await Upload.findById(uploadId).select('-__v');

  if (!upload) {
    const error = new Error('File not found.');
    error.statusCode = 404;
    throw error;
  }

  const filePath = getSafeFilePath(upload.storedName);

  return { upload, filePath };
};

// REPLACE UPLOAD
const replaceUpload = async (uploadId, newFile, userId) => {
  if (!newFile) {
    const error = new Error('Please select a replacement file.');
    error.statusCode = 400;
    throw error;
  }

  const { upload, filePath: oldFilePath } =
    await getUploadForUser(uploadId, userId);

  const newFilePath = getSafeFilePath(newFile.filename);

  // Update metadata after the replacement file is uploaded.
  upload.originalName = path.basename(newFile.originalname);
  upload.storedName = newFile.filename;
  upload.mimeType = newFile.mimetype;
  upload.size = newFile.size;

  try {
    await upload.save();
  } catch (error) {
    // Keep old file and metadata if the database update fails.
    if (newFile.path) {
      await fs.unlink(newFile.path).catch(() => {});
    }

    throw error;
  }

  // Remove the old physical file after successful metadata update.
  if (oldFilePath !== newFilePath) {
    await fs.unlink(oldFilePath).catch(() => {});
  }

  return upload;
};

// DELETE UPLOAD BY OWNER
const deleteUpload = async (uploadId, userId) => {
  const { upload, filePath } =
    await getUploadForUser(uploadId, userId);

  await upload.deleteOne();

  await fs.unlink(filePath).catch(() => {});

  return true;
};

// DELETE UPLOAD BY ID
// Used internally when deleting an associated notice attachment.
const deleteUploadById = async (uploadId) => {
  const upload = await Upload.findById(uploadId);

  if (!upload) {
    return false;
  }

  const filePath = getSafeFilePath(upload.storedName);

  await upload.deleteOne();

  await fs.unlink(filePath).catch(() => {});

  return true;
};

module.exports = {
  saveUpload,
  getUserUploads,
  getUploadForUser,
  getUploadForAuthorizedDownload,
  replaceUpload,
  deleteUpload,
  deleteUploadById,
};
