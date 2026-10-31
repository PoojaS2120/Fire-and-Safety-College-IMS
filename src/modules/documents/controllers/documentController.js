
const fs = require('fs/promises');
const path = require('path');

const documentService = require('../services/documentService');
const uploadService = require('../../uploads/services/uploadService');
const { validateFileContent } = require('../../uploads/middleware/validateFileContent');

// 1. Upload student document
exports.uploadStudentDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select a document to upload.',
      });
    }

    // Validate before creating the Upload database record.
    try {
      validateFileContent(req.file);

      const { document_type } = req.body;

      if (!document_type || !document_type.trim()) {
        const error = new Error('Document type is required.');
        error.statusCode = 400;
        throw error;
      }
    } catch (error) {
      await fs.unlink(req.file.path).catch(() => {});
      throw error;
    }

    // From this point, documentService owns upload cleanup.
    const document = await documentService.uploadStudentDocument({
      studentId: req.params.id,
      documentType: req.body.document_type.trim(),
      file: req.file,
      userId: req.user.id,
      ip: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'Student document uploaded successfully.',
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

// 2. List student documents
exports.getStudentDocuments = async (req, res, next) => {
  try {
    const documents = await documentService.getStudentDocuments(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};


// 3. Download student document
exports.downloadStudentDocument = async (req, res, next) => {
  try {
    const document = await documentService.getDocumentById(req.params.id);

    // Validate populated student reference.
    if (!document.student_id) {
      const error = new Error('Associated student record not found.');
      error.statusCode = 404;
      throw error;
    }

    // Students can download only their own documents.
    if (req.user.role === 'student') {
      const studentUserId = document.student_id.user_id;

      if (!studentUserId) {
        const error = new Error('Student account not found.');
        error.statusCode = 404;
        throw error;
      }

      const ownerId = studentUserId._id
        ? studentUserId._id.toString()
        : studentUserId.toString();

      if (ownerId !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to download this document.',
        });
      }
    } else if (!['super_admin', 'office_staff'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to download this document.',
      });
    }

    // Validate populated Upload reference.
    if (!document.upload_id) {
      const error = new Error('Associated upload record not found.');
      error.statusCode = 404;
      throw error;
    }

    const { upload, filePath } =
      await uploadService.getUploadForAuthorizedDownload(
        document.upload_id._id
      );

    // Check whether the physical file exists.
    try {
      await fs.access(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        error.statusCode = 404;
        error.message = 'Document file not found on server.';
      }

      throw error;
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');

    return res.download(
      filePath,
      path.basename(upload.originalName),
      (error) => {
        if (error && !res.headersSent) {
          next(error);
        }
      }
    );
  } catch (error) {
    next(error);
  }
};


// 4. Verify / receive / reject document
exports.updateDocumentStatus = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;

    const document = await documentService.updateDocumentStatus({
      documentId: req.params.id,
      status,
      remarks,
      userId: req.user.id,
      ip: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Document status updated to ${status}.`,
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Soft-delete document
exports.softDeleteDocument = async (req, res, next) => {
  try {
    const document = await documentService.softDeleteDocument({
      documentId: req.params.id,
      userId: req.user.id,
      ip: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: 'Student document deleted successfully.',
      data: {
        id: document._id,
        is_deleted: document.is_deleted,
        deleted_at: document.deleted_at,
      },
    });
  } catch (error) {
    next(error);
  }
};
