const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');
const {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
} = require('pdf-lib');

const execFileAsync = promisify(execFile);

const Material = require('../models/Material');
const Upload = require('../../uploads/models/Upload');
const { uploadDir } = require('../../uploads/middleware/uploadMiddleware');
const Course = require('../../courses/models/Course');
const Batch = require('../../courses/models/Batch');
const Student = require('../../students/models/Student');
const FacultyAssignment = require('../../faculty/models/FacultyAssignment');
const DOCUMENT_MIME_TYPES = [
  'application/pdf',

  // PowerPoint
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

const MATERIAL_MIME_TYPES = [
  ...DOCUMENT_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
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
  throw createError(
    'Unsupported study material format. Allowed formats: PDF, PPT, PPTX, DOC, DOCX, MP4, MOV and WEBM.',
    400
  );
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


// --------------------------------------------------
// DELETE MATERIAL
// --------------------------------------------------

exports.deleteMaterial = async (materialId, user) => {
  validateId(materialId, 'material ID');

  const material = await Material.findById(materialId);

  if (!material) {
    throw createError('Study material not found.', 404);
  }

  if (!['super_admin', 'faculty'].includes(user.role)) {
    throw createError('You are not allowed to delete study material.', 403);
  }

  // Faculty can delete only their own materials.
  if (user.role === 'faculty') {
    if (String(material.uploaded_by) !== String(user.id)) {
      throw createError('You can delete only your own material.', 403);
    }

    const allowed = await canAccessMaterial(material, user);

    if (!allowed) {
      throw createError('You are not assigned to this material.', 403);
    }
  }

  // Permanently delete only the material record.
  await Material.deleteOne({ _id: material._id });

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

// --------------------------------------------------
// GET DOCUMENT FOR VIEWING / DOWNLOAD
// --------------------------------------------------

exports.getDocumentForDownload = async (materialId, user) => {
  validateId(materialId, 'material ID');

  const material = await Material.findById(materialId);

  if (!material || material.status !== 'active') {
    throw createError('Active study material not found.', 404);
  }

  const allowed = await canAccessMaterial(material, user);

  if (!allowed) {
    throw createError('You do not have access to this document.', 403);
  }

  const upload = await Upload.findById(material.upload_id);

  if (!upload || !DOCUMENT_MIME_TYPES.includes(upload.mimeType)) {
    throw createError('Document not found or unsupported format.', 404);
  }

  const filePath = path.resolve(uploadDir, upload.storedName);

  if (path.dirname(filePath) !== path.resolve(uploadDir)) {
    throw createError('Invalid document file path.', 400);
  }

  if (!fs.existsSync(filePath)) {
    throw createError('Document file is missing from storage.', 404);
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
// --------------------------------------------------
// GENERATE TEMPORARY STUDENT WATERMARKED FILE
// --------------------------------------------------

exports.createStudentWatermarkedFile = async (
  upload,
  filePath,
  user
) => {
  // Faculty and admin continue receiving original files.
  if (user.role !== 'student') {
    return {
      filePath,
      cleanup: async () => {},
    };
  }

  // Get identity from authenticated student profile.
  const identity = await exports.getWatermarkIdentity(user);

  const watermarkText =
    `${identity.student_name} | ${identity.student_id}`;

  const extension = path.extname(upload.originalName).toLowerCase();

  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'ims-watermark-')
  );

  const outputPath = path.join(
    tempDir,
    `watermarked${extension}`
  );

  try {
    // PDF WATERMARK
   if (extension === '.pdf') {
  const pdfBytes = await fs.promises.readFile(filePath);

  const pdfDoc = await PDFDocument.load(pdfBytes);

  const font = await pdfDoc.embedFont(
    StandardFonts.HelveticaBold
  );

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();

    const fontSize = 30;
    const angle = 35;

    const textWidth = font.widthOfTextAtSize(
      watermarkText,
      fontSize
    );

    const radians = (angle * Math.PI) / 180;

    // Centre the single diagonal watermark.
    const x = (width - textWidth * Math.cos(radians)) / 2;
    const y = (height - textWidth * Math.sin(radians)) / 2;

    page.drawText(watermarkText, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.65, 0.65, 0.65),
      opacity: 0.22,
      rotate: degrees(angle),
    });
  }

  const watermarkedBytes = await pdfDoc.save();

  await fs.promises.writeFile(
    outputPath,
    watermarkedBytes
  );
}

    // VIDEO WATERMARK
    else if (['.mp4', '.mov', '.webm'].includes(extension)) {
      const escapedText = watermarkText
        .replace(/\\/g, '\\\\')
        .replace(/:/g, '\\:')
        .replace(/'/g, "\\'");

      const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';

   const filter =
  `drawtext=text='${escapedText}':` +
  `fontcolor=white@0.45:` +
  `fontsize=h*0.045:` +
  `box=1:boxcolor=black@0.25:boxborderw=8:` +
  `x=w-text_w-25:` +
  `y=h-text_h-25`;

      const args = [
        '-y',
        '-i', filePath,
        '-vf', filter,
        '-map', '0:v:0',
        '-map', '0:a?',
      ];

      if (extension === '.webm') {
        args.push(
          '-c:v', 'libvpx-vp9',
          '-crf', '32',
          '-b:v', '0',
          '-c:a', 'libopus'
        );
      } else {
        args.push(
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-crf', '23',
          '-c:a', 'aac',
          '-movflags', '+faststart'
        );
      }

      args.push(outputPath);

      await execFileAsync(ffmpegPath, args, {
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
      });
    }

    // OFFICE DOCUMENTS
    else {
      const error = createError(
        `Watermark processing is not implemented yet for ${extension}.`,
        501
      );

      throw error;
    }

    return {
      filePath: outputPath,

      cleanup: async () => {
        await fs.promises.rm(tempDir, {
          recursive: true,
          force: true,
        });
      },
    };
  } catch (error) {
    await fs.promises.rm(tempDir, {
      recursive: true,
      force: true,
    });

    throw error;
  }
};