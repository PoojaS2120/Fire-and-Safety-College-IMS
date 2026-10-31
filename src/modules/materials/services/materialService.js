const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const Material = require('../models/Material');
const Upload = require('../../uploads/models/Upload');
const { uploadDir } = require('../../uploads/middleware/uploadMiddleware');
const Course = require('../../courses/models/Course');
const Batch = require('../../courses/models/Batch');
const Student = require('../../students/models/Student');
const FacultyAssignment = require('../../faculty/models/FacultyAssignment');

const MATERIAL_MIME_TYPES = [
  'application/pdf',
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const validateId = (id, fieldName = 'ID') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError(`Invalid ${fieldName}.`, 400);
  }
};

const getStudent = async (userId) => {
  const student = await Student.findOne({
    user_id: userId,
    status: 'active',
  }).select('student_id full_name course_id batch_id');

  if (!student) {
    throw createError('Active student profile not found.', 404);
  }

  if (!student.batch_id) {
    throw createError('Student is not assigned to a batch.', 403);
  }

  return student;
};

const checkFacultyAssignment = async (
  facultyId,
  courseId,
  batchId,
  subject
) => {
  return FacultyAssignment.exists({
    faculty_id: facultyId,
    course_id: courseId,
    batch_id: batchId,
    subject,
  });
};

const canAccessMaterial = async (material, user) => {
  if (['super_admin', 'office_staff'].includes(user.role)) {
    return true;
  }

  if (user.role === 'student') {
    const student = await getStudent(user.id);

    return (
      String(student.course_id) === String(material.course_id) &&
      String(student.batch_id) === String(material.batch_id)
    );
  }

  if (user.role === 'faculty') {
    return !!(await checkFacultyAssignment(
      user.id,
      material.course_id,
      material.batch_id,
      material.subject
    ));
  }

  return false;
};

// --------------------------------------------------
// CREATE MATERIAL
// --------------------------------------------------

exports.createMaterial = async (data, user) => {
  if (!['super_admin', 'faculty'].includes(user.role)) {
    throw createError('You are not allowed to upload study material.', 403);
  }

  validateId(data.course_id, 'course ID');
  validateId(data.batch_id, 'batch ID');
  validateId(data.upload_id, 'upload ID');

  const course = await Course.findOne({
    _id: data.course_id,
    status: 'active',
  });

  if (!course) {
    throw createError('Active course not found.', 404);
  }

  const batch = await Batch.findOne({
    _id: data.batch_id,
    course_id: data.course_id,
    status: 'active',
  });

  if (!batch) {
    throw createError('Active batch not found for this course.', 404);
  }

  if (user.role === 'faculty') {
    const assigned = await checkFacultyAssignment(
      user.id,
      data.course_id,
      data.batch_id,
      data.subject
    );

    if (!assigned) {
      throw createError(
        'You are not assigned to this course, batch and subject.',
        403
      );
    }
  }

  const upload = await Upload.findOne({
    _id: data.upload_id,
    uploadedBy: user.id,
  });

  if (!upload) {
    throw createError(
      'Uploaded file not found or does not belong to you.',
      404
    );
  }

  if (!MATERIAL_MIME_TYPES.includes(upload.mimeType)) {
    throw createError('Only PDF and supported video files are allowed.', 400);
  }

  const existingMaterial = await Material.findOne({
    upload_id: data.upload_id,
  });

  if (existingMaterial) {
    throw createError('This uploaded file is already linked to material.', 409);
  }

  return Material.create({
    title: data.title,
    description: data.description || '',
    course_id: data.course_id,
    batch_id: data.batch_id,
    subject: data.subject,
    topic: data.topic,
    upload_id: data.upload_id,
    uploaded_by: user.id,
  });
};

// --------------------------------------------------
// GET ALL MATERIALS
// --------------------------------------------------

exports.getMaterials = async (filters, user) => {
  const query = { status: 'active' };

  if (filters.subject) query.subject = filters.subject;
  if (filters.topic) query.topic = filters.topic;
  if (filters.course_id) query.course_id = filters.course_id;
  if (filters.batch_id) query.batch_id = filters.batch_id;

  if (user.role === 'student') {
    const student = await getStudent(user.id);

    query.course_id = student.course_id;
    query.batch_id = student.batch_id;
  }

  if (user.role === 'faculty') {
    const assignments = await FacultyAssignment.find({
      faculty_id: user.id,
    }).select('course_id batch_id subject');

    query.$or = assignments.map((assignment) => ({
      course_id: assignment.course_id,
      batch_id: assignment.batch_id,
      subject: assignment.subject,
    }));
  }

  return Material.find(query)
    .populate('course_id', 'name')
    .populate('batch_id', 'name')
    .populate('uploaded_by', 'name email')
    .populate('upload_id', 'originalName mimeType size')
    .sort({ createdAt: -1 });
};

// --------------------------------------------------
// GET MATERIAL BY ID
// --------------------------------------------------

exports.getMaterialById = async (materialId, user) => {
  validateId(materialId, 'material ID');

  const material = await Material.findById(materialId);

  if (!material) {
    throw createError('Study material not found.', 404);
  }

  const allowed = await canAccessMaterial(material, user);

  if (!allowed) {
    throw createError('You do not have access to this material.', 403);
  }

  return Material.findById(materialId)
    .populate('course_id', 'name')
    .populate('batch_id', 'name')
    .populate('uploaded_by', 'name email')
    .populate('upload_id', 'originalName mimeType size');
};

// --------------------------------------------------
// UPDATE MATERIAL
// --------------------------------------------------

exports.updateMaterial = async (materialId, data, user) => {
  validateId(materialId, 'material ID');

  const material = await Material.findById(materialId);

  if (!material) {
    throw createError('Study material not found.', 404);
  }

  if (user.role === 'faculty') {
    if (String(material.uploaded_by) !== String(user.id)) {
      throw createError('You can update only your own material.', 403);
    }

    const assigned = await checkFacultyAssignment(
      user.id,
      material.course_id,
      material.batch_id,
      data.subject || material.subject
    );

    if (!assigned) {
      throw createError('You are not assigned to this material.', 403);
    }
  }

  const allowedFields = ['title', 'description', 'subject', 'topic'];

  allowedFields.forEach((field) => {
    if (data[field] !== undefined) {
      material[field] = data[field];
    }
  });

  await material.save();

  return material;
};

// --------------------------------------------------
// UPDATE MATERIAL STATUS
// --------------------------------------------------

exports.updateMaterialStatus = async (materialId, status, user) => {
  validateId(materialId, 'material ID');

  const material = await Material.findById(materialId);

  if (!material) {
    throw createError('Study material not found.', 404);
  }

  if (user.role === 'faculty') {
    if (String(material.uploaded_by) !== String(user.id)) {
      throw createError('You can update only your own material.', 403);
    }

    const allowed = await canAccessMaterial(material, user);

    if (!allowed) {
      throw createError('You are not assigned to this material.', 403);
    }
  }

  material.status = status;
  await material.save();

  return material;
};

// --------------------------------------------------
// GET VIDEO FOR STREAMING
// --------------------------------------------------

exports.getVideoForStreaming = async (materialId, user) => {
  validateId(materialId, 'material ID');

  const material = await Material.findById(materialId);

  if (!material || material.status !== 'active') {
    throw createError('Active study material not found.', 404);
  }

  const allowed = await canAccessMaterial(material, user);

  if (!allowed) {
    throw createError('You do not have access to this video.', 403);
  }

  const upload = await Upload.findById(material.upload_id);

  if (!upload || !VIDEO_MIME_TYPES.includes(upload.mimeType)) {
    throw createError('Video not found.', 404);
  }

  const filePath = path.resolve(uploadDir, upload.storedName);

  if (path.dirname(filePath) !== path.resolve(uploadDir)) {
    throw createError('Invalid video file path.', 400);
  }

  if (!fs.existsSync(filePath)) {
    throw createError('Video file is missing from storage.', 404);
  }

  return { upload, filePath };
};

// --------------------------------------------------
// GET PDF FOR VIEWING / DOWNLOAD
// --------------------------------------------------

exports.getPdfForDownload = async (materialId, user) => {
  validateId(materialId, 'material ID');

  const material = await Material.findById(materialId);

  if (!material || material.status !== 'active') {
    throw createError('Active study material not found.', 404);
  }

  const allowed = await canAccessMaterial(material, user);

  if (!allowed) {
    throw createError('You do not have access to this PDF.', 403);
  }

  const upload = await Upload.findById(material.upload_id);

  if (!upload || upload.mimeType !== 'application/pdf') {
    throw createError('PDF document not found.', 404);
  }

  const filePath = path.resolve(uploadDir, upload.storedName);

  if (path.dirname(filePath) !== path.resolve(uploadDir)) {
    throw createError('Invalid PDF file path.', 400);
  }

  if (!fs.existsSync(filePath)) {
    throw createError('PDF file is missing from storage.', 404);
  }

  return { upload, filePath };
};

// --------------------------------------------------
// GET STUDENT WATERMARK IDENTITY
// --------------------------------------------------

exports.getWatermarkIdentity = async (user) => {
  if (user.role !== 'student') {
    throw createError('Only students can access watermark identity.', 403);
  }

  const student = await getStudent(user.id);

  return {
    student_name: student.full_name,
    student_id: student.student_id,
  };
};