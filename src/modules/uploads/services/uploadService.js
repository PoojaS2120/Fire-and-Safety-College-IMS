
const fs = require('fs/promises');
const path = require('path');
const Upload = require('../models/Upload');
const { uploadDir } = require('../middleware/uploadMiddleware');

const getSafeFilePath = (storedName) => {
  const filePath = path.resolve(uploadDir, storedName);

  // Prevent stored metadata from resolving outside the upload directory.
  if (path.dirname(filePath) !== path.resolve(uploadDir)) {
    const error = new Error('Invalid file path.');
    error.statusCode = 400;
    throw error;
  }

  return filePath;
};

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

  const filePath = getSafeFilePath(upload.storedName);

  return { upload, filePath };
};

// Replace an existing uploaded file.
const replaceUpload = async (uploadId, newFile, userId) => {
  if (!newFile) {
    const error = new Error('Please select a replacement file.');
    error.statusCode = 400;
    throw error;
  }

  const { upload, filePath: oldFilePath } =
    await getUploadForUser(uploadId, userId);

  const newFilePath = getSafeFilePath(newFile.filename);

  // Update metadata only after the new file has been uploaded.
  upload.originalName = path.basename(newFile.originalname);
  upload.storedName = newFile.filename;
  upload.mimeType = newFile.mimetype;
  upload.size = newFile.size;

  await upload.save();

  // Remove the previous physical file after successful metadata update.
  await fs.unlink(oldFilePath).catch(() => {});

  return upload;
};

// Delete an uploaded file.
const deleteUpload = async (uploadId, userId) => {
  const { upload, filePath } =
    await getUploadForUser(uploadId, userId);

  // Delete the database record first.
  await upload.deleteOne();

  // Remove the corresponding physical file.
  await fs.unlink(filePath).catch(() => {});

  return true;
};

module.exports = {
  saveUpload,
  getUserUploads,
  getUploadForUser,
  replaceUpload,
  deleteUpload,
};
