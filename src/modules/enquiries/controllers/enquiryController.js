const mongoose = require('mongoose');
const Enquiry = require('../models/Enquiry');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const Student = require('../../students/models/Student');
const { uploadDir } = require('../../uploads/middleware/uploadMiddleware');
const { validateFileContent } = require('../../uploads/middleware/validateFileContent');
const enquiryService = require('../services/enquiryService');
const admissionConversionService = require('../services/admissionConversionService');
const {
  createEnquirySchema,
  updateEnquirySchema,
  updateEnquiryStatusSchema,
  convertEnquirySchema,
} = require('../validations/enquiryValidation');

exports.createEnquiry = async (req, res, next) => {
  try {
    const { error, value } = createEnquirySchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      console.error('[ENQUIRY VALIDATION ERROR]:', error.details);

      return res.status(400).json({
        success: false,
        message: error.details.map((detail) => detail.message).join(', '),
      });
    }

    const enquiry = await enquiryService.createEnquiry(
      value,
      req.user.id
    );

    console.log('[ENQUIRY CREATE] Successfully saved:', enquiry._id);

    return res.status(201).json({
      success: true,
      message: 'Enquiry created successfully.',
      data: enquiry,
    });
  } catch (error) {
    console.error('[ENQUIRY CREATE ERROR]:', error);
    next(error);
  }
};


exports.getEnquiries = async (req, res, next) => {
  try {
    const result = await enquiryService.getEnquiries(req.query);

    return res.status(200).json({
      success: true,
      message: 'Enquiries retrieved successfully.',
      data: result.enquiries,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

exports.getEnquirySummary = async (req, res, next) => {
  try {
    const summary = await enquiryService.getEnquirySummary();

    return res.status(200).json({
      success: true,
      message: 'Enquiry summary retrieved successfully.',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

exports.getEnquiryById = async (req, res, next) => {
  try {
    const enquiry = await enquiryService.getEnquiryById(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Enquiry retrieved successfully.',
      data: enquiry,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateEnquiry = async (req, res, next) => {
  try {
    const { error, value } = updateEnquirySchema.validate(req.body, {
      abortEarly: true,
      stripUnknown: false,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const enquiry = await enquiryService.updateEnquiry(
      req.params.id,
      value
    );

    return res.status(200).json({
      success: true,
      message: 'Enquiry updated successfully.',
      data: enquiry,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateEnquiryStatus = async (req, res, next) => {
  try {
    const { error, value } = updateEnquiryStatusSchema.validate(req.body, {
      abortEarly: true,
      stripUnknown: false,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const enquiry = await enquiryService.updateEnquiryStatus(
      req.params.id,
      value.status
    );

    return res.status(200).json({
      success: true,
      message: 'Enquiry status updated successfully.',
      data: enquiry,
    });
  } catch (error) {
    next(error);
  }
};

const IMG_CFG = {
  student_photo:     { maxBytes: 250 * 1024, folder: 'student-photos' },
  student_signature: { maxBytes: 150 * 1024, folder: 'student-signatures' },
  parent_signature:  { maxBytes: 150 * 1024, folder: 'parent-signatures' }, // <-- ADDED
};

async function compressImage(inputPath, outputPath, maxBytes) {
  let quality = 85, width = 1600;
  for (let i = 0; i < 12; i++) {
    await sharp(inputPath, { failOn: 'error' })
      .rotate()
      .resize({ width, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toFile(outputPath);
    const stats = await fs.stat(outputPath);
    if (stats.size <= maxBytes) return stats;
    await fs.unlink(outputPath).catch(() => {});
    if (quality > 35) quality -= 10;
    else { width = Math.floor(width * 0.8); quality = 60; }
  }
  throw Object.assign(new Error('Image too large to compress.'), { statusCode: 400 });
}

async function processImage(file, type) {
  const cfg = IMG_CFG[type];
  if (!cfg) throw Object.assign(new Error('Invalid image type.'), { statusCode: 400 });

  if (!(await validateFileContent(file))) {
    throw Object.assign(new Error('Invalid image content.'), { statusCode: 400 });
  }

  const dir = path.join(uploadDir, cfg.folder);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${crypto.randomUUID()}.jpg`;
  const out = path.join(dir, filename);

  try {
    const meta = await sharp(file.path, { failOn: 'error' }).metadata();
    if (!['jpeg', 'png', 'webp'].includes(meta.format)) {
      throw Object.assign(new Error('Only JPG/PNG/WEBP allowed.'), { statusCode: 400 });
    }
    const stats = await compressImage(file.path, out, cfg.maxBytes);
    return {
      file_name: filename,
      file_path: path.relative(uploadDir, out).replace(/\\/g, '/'),
      mime_type: 'image/jpeg',
      size_bytes: stats.size,
      uploaded_at: new Date(),
    };
  } finally {
    await fs.unlink(file.path).catch(() => {});
  }
}
// CONVERT ENQUIRY TO ADMISSION
exports.convertEnquiry = async (req, res, next) => {
  try {
    let body = req.body;
    if (req.is('multipart/form-data')) {
      if (typeof req.body?.data !== 'string') {
        return res.status(400).json({ success: false, message: 'Send JSON in "data" field.' });
      }
      try { body = JSON.parse(req.body.data); }
      catch { return res.status(400).json({ success: false, message: 'Invalid JSON in "data".' }); }
    }

    const { error, value } = convertEnquirySchema.validate(body, {
      abortEarly: true, stripUnknown: false,
    });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    // Keep principal_signature deletion just in case
    if (value.admission_form?.office_use) delete value.admission_form.office_use.principal_signature;

    const files = req.files || {};
    const imgs = {};
    if (files.student_photo?.[0]) imgs.student_photo = await processImage(files.student_photo[0], 'student_photo');
    if (files.student_signature?.[0]) imgs.student_signature = await processImage(files.student_signature[0], 'student_signature');
    // ADDED: Process parent signature
    if (files.parent_signature?.[0]) imgs.parent_signature = await processImage(files.parent_signature[0], 'parent_signature');

    if (Object.keys(imgs).length) {
      value.admission_form = value.admission_form || {};
      value.admission_form.images = { ...(value.admission_form.images || {}), ...imgs };
    }

    const result = await admissionConversionService.convertEnquiryToAdmission(
      req.params.id, value, req.user.id
    );

    if (Object.keys(imgs).length && result?.student?.id) {
      const set = {};
      if (imgs.student_photo) set['admission_form.images.student_photo'] = imgs.student_photo;
      if (imgs.student_signature) set['admission_form.images.student_signature'] = imgs.student_signature;
      // ADDED: Save parent signature
      if (imgs.parent_signature) set['admission_form.images.parent_signature'] = imgs.parent_signature;
      await Student.updateOne({ _id: result.student.id }, { $set: set });
    }

    return res.status(201).json({
      success: true,
      message: 'Enquiry converted to admission successfully.',
      data: result,
    });
  } catch (err) {
    if (req.files) {
      for (const arr of Object.values(req.files)) {
        for (const f of arr) await fs.unlink(f.path).catch(() => {});
      }
    }
    next(err);
  }
};

// ==========================================================
// NEW: DELETE ENQUIRY
// ==========================================================
exports.deleteEnquiry = async (req, res, next) => {
  try {
    const result = await enquiryService.deleteEnquiry(req.params.id);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};


// GET ADMISSION PREFILL FROM ENQUIRY
exports.getAdmissionPrefill = async (req, res, next) => {
  try {
    const data = await enquiryService.getAdmissionPrefill(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Admission prefill data retrieved successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
// GET CONVERTED STUDENT ADMISSION FORM
exports.getAdmissionForm = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid enquiry ID.',
      });
    }

    // Find enquiry
    const enquiry = await Enquiry.findById(id).select(
      'name status converted_student_id'
    );

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found.',
      });
    }

    if (!enquiry.converted_student_id) {
      return res.status(404).json({
        success: false,
        message: 'This enquiry has not been converted into an admission.',
      });
    }

    // Fetch admission data from Student collection
    const student = await Student.findById(enquiry.converted_student_id)
      .select('+admission_form.aadhaar_number')
      .populate('course_id', 'name')
      .populate('batch_id', 'name')
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Converted student record not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Admission form retrieved successfully.',
      data: {
        enquiry_id: enquiry._id,
        student: {
          _id: student._id,
          student_id: student.student_id,
          full_name: student.full_name,
          dob: student.dob,
          phone: student.phone,
          email: student.email,
          address: student.address,
          guardian_name: student.guardian_name,
          guardian_phone: student.guardian_phone,
          qualification: student.qualification,
          course: student.course_id,
          batch: student.batch_id,
          admitted_on: student.admitted_on,
        },
        admission_form: student.admission_form || {},
      },
    });
  } catch (error) {
    next(error);
  }
};


// SHARED HELPER: FETCH ADMISSION FORM DATA
const fetchAdmissionFormData = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error('Invalid admission record ID.');
    error.statusCode = 400;
    throw error;
  }

  // First check whether this ID belongs to an enquiry
  const enquiry = await Enquiry.findById(id).select(
    'name status converted_student_id'
  );

  let studentId;

  if (enquiry) {
    // Existing enquiry-based admission workflow
    if (!enquiry.converted_student_id) {
      const error = new Error(
        'This enquiry has not been converted into an admission.'
      );
      error.statusCode = 404;
      throw error;
    }

    studentId = enquiry.converted_student_id;
  } else {
    // Direct admission: ID belongs to a Student
    studentId = id;
  }

  // Fetch student admission data
  const student = await Student.findById(studentId)
    .select('+admission_form.aadhaar_number')
    .populate('course_id', 'name')
    .populate('batch_id', 'name')
    .lean();

  if (!student) {
    const error = new Error(
      'Admission form not found. No matching enquiry or student record exists.'
    );
    error.statusCode = 404;
    throw error;
  }

  return {
    enquiry_id: enquiry ? enquiry._id : null,
    admission_source: enquiry ? 'enquiry' : 'direct',

    student: {
      _id: student._id,
      student_id: student.student_id,
      full_name: student.full_name,
      dob: student.dob,
      phone: student.phone,
      email: student.email,
      address: student.address,
      guardian_name: student.guardian_name,
      guardian_phone: student.guardian_phone,
      qualification: student.qualification,
      course: student.course_id,
      batch: student.batch_id,
      admitted_on: student.admitted_on,
    },

    admission_form: student.admission_form || {},
  };
};

// GET ADMISSION FORM IMAGE
exports.getAdmissionFormImage = async (req, res, next) => {
  try {
    const { id, imageType } = req.params;

    const imageFolders = {
      student_photo: 'student-photos',
      student_signature: 'student-signatures',
      parent_signature: 'parent-signatures',
    };

    const expectedFolder = imageFolders[imageType];

    if (!expectedFolder) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image type.',
      });
    }

    // Fetch the converted student's admission form.
    const data = await fetchAdmissionFormData(id);
    const image = data.admission_form?.images?.[imageType];

    if (!image?.file_path) {
      return res.status(404).json({
        success: false,
        message: 'Admission form image not found.',
      });
    }

    // Validate the stored relative path.
    const normalizedPath = image.file_path.replace(/\\/g, '/');
    const pathParts = normalizedPath.split('/');

    if (
      pathParts.length !== 2 ||
      pathParts[0] !== expectedFolder ||
      !pathParts[1] ||
      path.posix.basename(pathParts[1]) !== pathParts[1]
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid stored image path.',
      });
    }

    // Resolve and verify that the image stays inside its expected folder.
    const baseDir = path.resolve(uploadDir, expectedFolder);
    const filePath = path.resolve(baseDir, pathParts[1]);

    if (path.dirname(filePath) !== baseDir) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image path.',
      });
    }

    await fs.access(filePath);

    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });

    return res.sendFile(filePath, (error) => {
      if (error && !res.headersSent) {
        next(error);
      }
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        message: 'Stored admission image is missing.',
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

// GET CONVERTED STUDENT ADMISSION FORM
exports.getAdmissionForm = async (req, res, next) => {
  try {
    const data = await fetchAdmissionFormData(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Admission form retrieved successfully.',
      data,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};


// DOWNLOAD ADMISSION FORM JSON
exports.downloadAdmissionForm = async (req, res, next) => {
  try {
    const data = await fetchAdmissionFormData(req.params.id);

    const fileName = `admission-form-${data.student.student_id || data.enquiry_id}.json`;

    return res
      .status(200)
      .set({
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      })
      .send(
        JSON.stringify(
          {
            success: true,
            message: 'Admission form downloaded successfully.',
            data,
          },
          null,
          2
        )
      );
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

// UPDATE CONVERTED STUDENT ADMISSION FORM

const mergeObjects = (existing, updates) => {
  const result = { ...(existing || {}) };

  for (const [key, value] of Object.entries(updates || {})) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      result[key] = mergeObjects(result[key], value);
    } else {
      result[key] = value;
    }
  }

  return result;
};

// exports.updateAdmissionForm = async (req, res, next) => {
//   const processedImages = [];

//   try {
//     let body = req.body;

//     // Support multipart/form-data with JSON in the "data" field
//     if (req.is('multipart/form-data')) {
//       if (typeof req.body?.data !== 'string') {
//         return res.status(400).json({
//           success: false,
//           message: 'Send JSON in the "data" field.',
//         });
//       }

//       try {
//         body = JSON.parse(req.body.data);
//       } catch {
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid JSON in the "data" field.',
//         });
//       }
//     }

//     if (!body || typeof body !== 'object' || Array.isArray(body)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid admission form data.',
//       });
//     }

//     const { id } = req.params;

//     if (!mongoose.isValidObjectId(id)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid enquiry ID.',
//       });
//     }

//     // Find enquiry and its converted student
//     const enquiry = await Enquiry.findById(id).select(
//       'converted_student_id'
//     );

//     if (!enquiry) {
//       return res.status(404).json({
//         success: false,
//         message: 'Enquiry not found.',
//       });
//     }

//     if (!enquiry.converted_student_id) {
//       return res.status(404).json({
//         success: false,
//         message: 'This enquiry has not been converted into an admission.',
//       });
//     }

//     const student = await Student.findById(
//       enquiry.converted_student_id
//     ).select('+admission_form.aadhaar_number');

//     if (!student) {
//       return res.status(404).json({
//         success: false,
//         message: 'Converted student record not found.',
//       });
//     }

//     // Only allow these top-level student fields to be updated
//     const allowedStudentFields = [
//       'full_name',
//       'dob',
//       'phone',
//       'email',
//       'address',
//       'guardian_name',
//       'guardian_phone',
//       'qualification',
//     ];

//     for (const field of allowedStudentFields) {
//       if (
//         body.student &&
//         Object.prototype.hasOwnProperty.call(body.student, field)
//       ) {
//         student.set(field, body.student[field]);
//       }
//     }

//     // Merge admission form fields without replacing omitted fields
//     const allowedAdmissionFields = [
//       'fathers_name',
//       'mothers_name',
//       'religion',
//       'caste',
//       'category',
//       'postal_address',
//       'permanent_address',
//       'contact_details',
//       'aadhaar_number',
//       'academic_qualification',
//       'physical_details',
//       'declaration',
//       'office_use',
//     ];

//     const currentAdmissionForm =
//       student.admission_form?.toObject
//         ? student.admission_form.toObject()
//         : student.admission_form || {};

//     const incomingAdmissionForm = {};

//     for (const field of allowedAdmissionFields) {
//       if (
//         body.admission_form &&
//         Object.prototype.hasOwnProperty.call(body.admission_form, field)
//       ) {
//         incomingAdmissionForm[field] = body.admission_form[field];
//       }
//     }

//     const mergedAdmissionForm = mergeObjects(
//       currentAdmissionForm,
//       incomingAdmissionForm
//     );

//     student.set('admission_form', mergedAdmissionForm);

//     // Process uploaded images only when replacement files are supplied
//     const files = req.files || {};

//     const imageFields = [
//       'student_photo',
//       'student_signature',
//       'parent_signature',
//     ];

//     for (const field of imageFields) {
//       if (files[field]?.[0]) {
//         const imageData = await processImage(files[field][0], field);

//         processedImages.push(
//           path.join(uploadDir, imageData.file_path)
//         );

//         student.set(
//           `admission_form.images.${field}`,
//           imageData
//         );
//       }
//     }

//     await student.save();

//     return res.status(200).json({
//       success: true,
//       message: 'Admission form updated successfully.',
//       data: {
//         enquiry_id: enquiry._id,
//         student: {
//           _id: student._id,
//           student_id: student.student_id,
//           full_name: student.full_name,
//           dob: student.dob,
//           phone: student.phone,
//           email: student.email,
//           address: student.address,
//           guardian_name: student.guardian_name,
//           guardian_phone: student.guardian_phone,
//           qualification: student.qualification,
//         },
//         admission_form: student.admission_form,
//       },
//     });
//   } catch (error) {
//     // Clean up newly processed image files if the update fails
//     for (const filePath of processedImages) {
//       await fs.unlink(filePath).catch(() => {});
//     }

//     // Clean up any remaining temporary uploads
//     if (req.files) {
//       for (const files of Object.values(req.files)) {
//         for (const file of files) {
//           await fs.unlink(file.path).catch(() => {});
//         }
//       }
//     }

//     next(error);
//   }
// };

exports.updateAdmissionForm = async (req, res, next) => {
  const processedImages = [];

  try {
    let body = req.body;

    // Support multipart/form-data
    if (req.is('multipart/form-data')) {
      if (typeof req.body?.data !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Send JSON in the "data" field.',
        });
      }

      try {
        body = JSON.parse(req.body.data);
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON in the "data" field.',
        });
      }
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid admission form data.',
      });
    }

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid admission record ID.',
      });
    }

    // STEP 1: Check whether ID belongs to an enquiry
    const enquiry = await Enquiry.findById(id).select(
      'converted_student_id'
    );

    let studentId = null;

    if (enquiry) {
      // Enquiry-based admission
      if (!enquiry.converted_student_id) {
        return res.status(404).json({
          success: false,
          message: 'This enquiry has not been converted into an admission.',
        });
      }

      studentId = enquiry.converted_student_id;
    } else {
      // Direct admission: ID belongs to Student collection
      studentId = id;
    }

    // STEP 2: Find student
    const student = await Student.findById(studentId)
      .select('+admission_form.aadhaar_number');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Admission form not found. No matching enquiry or student record exists.',
      });
    }

    // STEP 3: Update allowed student fields
    const allowedStudentFields = [
      'full_name',
      'dob',
      'phone',
      'email',
      'address',
      'guardian_name',
      'guardian_phone',
      'qualification',
    ];

    for (const field of allowedStudentFields) {
      if (
        body.student &&
        Object.prototype.hasOwnProperty.call(body.student, field)
      ) {
        student.set(field, body.student[field]);
      }
    }

    // STEP 4: Allowed admission form fields
    const allowedAdmissionFields = [
      'fathers_name',
      'mothers_name',
      'religion',
      'caste',
      'category',
      'postal_address',
      'permanent_address',
      'contact_details',
      'aadhaar_number',
      'academic_qualification',
      'physical_details',
      'declaration',
      'office_use',
    ];

    // Preserve existing admission form data
    const currentAdmissionForm =
      student.admission_form?.toObject
        ? student.admission_form.toObject()
        : student.admission_form || {};

    const incomingAdmissionForm = {};

    for (const field of allowedAdmissionFields) {
      if (
        body.admission_form &&
        Object.prototype.hasOwnProperty.call(body.admission_form, field)
      ) {
        incomingAdmissionForm[field] = body.admission_form[field];
      }
    }

    // Merge instead of replacing existing fields
    const mergedAdmissionForm = mergeObjects(
      currentAdmissionForm,
      incomingAdmissionForm
    );

    student.set('admission_form', mergedAdmissionForm);

    // STEP 5: Process image uploads
    const files = req.files || {};

    const imageFields = [
      'student_photo',
      'student_signature',
      'parent_signature',
    ];

    for (const field of imageFields) {
      if (files[field]?.[0]) {
        const imageData = await processImage(files[field][0], field);

        processedImages.push(
          path.join(uploadDir, imageData.file_path)
        );

        student.set(
          `admission_form.images.${field}`,
          imageData
        );
      }
    }

    // STEP 6: Save student
    await student.save();

    // STEP 7: Response
    return res.status(200).json({
      success: true,
      message: 'Admission form updated successfully.',
      data: {
        enquiry_id: enquiry ? enquiry._id : null,
        admission_source: enquiry ? 'enquiry' : 'direct',

        student: {
          _id: student._id,
          student_id: student.student_id,
          full_name: student.full_name,
          dob: student.dob,
          phone: student.phone,
          email: student.email,
          address: student.address,
          guardian_name: student.guardian_name,
          guardian_phone: student.guardian_phone,
          qualification: student.qualification,
        },

        admission_form: student.admission_form,
      },
    });

  } catch (error) {

    // Delete processed images if saving fails
    for (const filePath of processedImages) {
      await fs.unlink(filePath).catch(() => {});
    }

    // Delete temporary uploaded files
    if (req.files) {
      for (const files of Object.values(req.files)) {
        for (const file of files) {
          await fs.unlink(file.path).catch(() => {});
        }
      }
    }

    next(error);
  }
};

// Shared with direct admission (students module): resize / compress / store one admission image
exports.processAdmissionImage = (file, type) => processImage(file, type);

