const mongoose = require('mongoose');
const fs = require('fs/promises');

const Student = require('../../students/models/Student');
const StudentDocument = require('../models/StudentDocument');
const uploadService = require('../../uploads/services/uploadService');
const auditService = require('../../audit/services/auditService');

const validateObjectId = (id, fieldName = 'ID') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error(`Invalid ${fieldName}.`);
    error.statusCode = 400;
    throw error;
  }
};

// 1. Upload a document for a student
exports.uploadStudentDocument = async ({
  studentId,
  documentType,
  file,
  userId,
  ip,
}) => {
  validateObjectId(studentId, 'student ID');

  const student = await Student.findById(studentId);

  if (!student) {
    // Remove the temporary file if the student does not exist.
    if (file?.path) {
      await fs.unlink(file.path).catch(() => {});
    }

    const error = new Error('Student not found.');
    error.statusCode = 404;
    throw error;
  }

  const upload = await uploadService.saveUpload(file, userId);

  let document;

  try {
    document = await StudentDocument.create({
      student_id: studentId,
      upload_id: upload._id,
      document_type: documentType,
      status: 'pending',
    });
  } catch (error) {
    // Clean up the Upload record and physical file if document creation fails.
    await uploadService.deleteUpload(upload._id, userId);
    throw error;
  }

  // Audit failure must not delete an already-created document or file.
  await auditService.logAction({
    userId,
    action: 'STUDENT_DOCUMENT_UPLOADED',
    entity: 'StudentDocument',
    entityId: document._id,
    newValues: {
      student_id: studentId,
      document_type: documentType,
      upload_id: upload._id,
      status: 'pending',
    },
    ip,
  });

  return document;
};

// 2. Get all active documents of a student
exports.getStudentDocuments = async (studentId) => {
  validateObjectId(studentId, 'student ID');

  const student = await Student.findById(studentId);

  if (!student) {
    const error = new Error('Student not found.');
    error.statusCode = 404;
    throw error;
  }

  return StudentDocument.find({
    student_id: studentId,
    is_deleted: false,
  })
    .populate('upload_id', 'originalName mimeType size createdAt')
    .populate('verified_by', 'name email role')
    .sort({ createdAt: -1 });
};

// 3. Get one active document
exports.getDocumentById = async (documentId) => {
  validateObjectId(documentId, 'document ID');

  const document = await StudentDocument.findOne({
    _id: documentId,
    is_deleted: false,
  })
    .populate('student_id', 'student_id full_name user_id')
    .populate('upload_id', 'originalName storedName mimeType size')
    .populate('verified_by', 'name email role');

  if (!document) {
    const error = new Error('Document not found.');
    error.statusCode = 404;
    throw error;
  }

  return document;
};

// 4. Update document status
exports.updateDocumentStatus = async ({
  documentId,
  status,
  remarks,
  userId,
  ip,
}) => {
  validateObjectId(documentId, 'document ID');

  const allowedStatuses = ['received', 'verified', 'rejected'];

  if (!allowedStatuses.includes(status)) {
    const error = new Error(
      'Invalid status. Allowed values: received, verified, rejected.'
    );
    error.statusCode = 400;
    throw error;
  }

  if (
    status === 'rejected' &&
    (typeof remarks !== 'string' || !remarks.trim())
  ) {
    const error = new Error(
      'Remarks are required when rejecting a document.'
    );
    error.statusCode = 400;
    throw error;
  }

  const document = await StudentDocument.findOne({
    _id: documentId,
    is_deleted: false,
  });

  if (!document) {
    const error = new Error('Document not found.');
    error.statusCode = 404;
    throw error;
  }

  const oldValues = {
    status: document.status,
    remarks: document.remarks,
    verified_by: document.verified_by,
    verified_at: document.verified_at,
  };

  document.status = status;
  document.remarks = remarks?.trim() || null;

  if (status === 'verified') {
    document.verified_by = userId;
    document.verified_at = new Date();
  } else {
    document.verified_by = null;
    document.verified_at = null;
  }

  await document.save();

  await auditService.logAction({
    userId,
    action: 'STUDENT_DOCUMENT_STATUS_UPDATED',
    entity: 'StudentDocument',
    entityId: document._id,
    oldValues,
    newValues: {
      status: document.status,
      remarks: document.remarks,
      verified_by: document.verified_by,
      verified_at: document.verified_at,
    },
    ip,
  });

  return document;
};

// 5. Soft-delete a document
exports.softDeleteDocument = async ({
  documentId,
  userId,
  ip,
}) => {
  validateObjectId(documentId, 'document ID');

  const document = await StudentDocument.findOne({
    _id: documentId,
    is_deleted: false,
  });

  if (!document) {
    const error = new Error('Document not found.');
    error.statusCode = 404;
    throw error;
  }

  const oldValues = {
    is_deleted: document.is_deleted,
    status: document.status,
  };

  document.is_deleted = true;
  document.deleted_by = userId;
  document.deleted_at = new Date();

  await document.save();

  await auditService.logAction({
    userId,
    action: 'STUDENT_DOCUMENT_SOFT_DELETED',
    entity: 'StudentDocument',
    entityId: document._id,
    oldValues,
    newValues: {
      is_deleted: true,
      deleted_by: userId,
      deleted_at: document.deleted_at,
    },
    ip,
  });

  // Preserve the Upload record and physical file.
  return document;
};