
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
    await uploadService.deleteUpload(upload._id, userId);
    throw error;
  }

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
    .populate('received_by', 'name email role')
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
    .populate('received_by', 'name email role')
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
  received_by_name,
  verified_by_name,
  userId,
  ip,
}) => {
  validateObjectId(documentId, 'document ID');
  validateObjectId(userId, 'user ID');

  const allowedStatuses = ['received', 'verified', 'rejected'];

  if (!allowedStatuses.includes(status)) {
    const error = new Error(
      'Invalid status. Allowed values: received, verified, rejected.'
    );
    error.statusCode = 400;
    throw error;
  }

  // Validate receiving faculty name.
  if (status === 'received') {
    if (
      typeof received_by_name !== 'string' ||
      !received_by_name.trim()
    ) {
      const error = new Error(
        'Receiving faculty name is required when receiving a document.'
      );
      error.statusCode = 400;
      throw error;
    }

    if (received_by_name.trim().length > 100) {
      const error = new Error(
        'Receiving faculty name cannot exceed 100 characters.'
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // Validate verifying faculty name.
  if (status === 'verified') {
    if (
      typeof verified_by_name !== 'string' ||
      !verified_by_name.trim()
    ) {
      const error = new Error(
        'Verifying faculty name is required when verifying a document.'
      );
      error.statusCode = 400;
      throw error;
    }

    if (verified_by_name.trim().length > 100) {
      const error = new Error(
        'Verifying faculty name cannot exceed 100 characters.'
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // Rejection remarks are mandatory.
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

  // Capture existing values before making changes.
  const oldValues = {
    status: document.status,
    remarks: document.remarks,
    received_by: document.received_by,
    received_by_name: document.received_by_name,
    received_at: document.received_at,
    verified_by: document.verified_by,
    verified_by_name: document.verified_by_name,
    verified_at: document.verified_at,
  };

  document.status = status;

  // Update remarks only when supplied.
  if (typeof remarks === 'string') {
    document.remarks = remarks.trim() || null;
  }

  // Record receiving user, faculty name and timestamp.
  if (status === 'received') {
    document.received_by = userId;
    document.received_by_name = received_by_name.trim();
    document.received_at = new Date();
  }

  // Record verifying user, faculty name and timestamp.
  if (status === 'verified') {
    document.verified_by = userId;
    document.verified_by_name = verified_by_name.trim();
    document.verified_at = new Date();
  }

  // Do not clear previously recorded receiving or verification details.
  // This preserves the complete record when status changes to rejected.

  await document.save();

  // Audit the complete status and faculty information changes.
  await auditService.logAction({
    userId,
    action: 'STUDENT_DOCUMENT_STATUS_UPDATED',
    entity: 'StudentDocument',
    entityId: document._id,
    oldValues,
    newValues: {
      status: document.status,
      remarks: document.remarks,
      received_by: document.received_by,
      received_by_name: document.received_by_name,
      received_at: document.received_at,
      verified_by: document.verified_by,
      verified_by_name: document.verified_by_name,
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
