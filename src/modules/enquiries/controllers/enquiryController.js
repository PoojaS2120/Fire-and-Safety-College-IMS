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

    if (value.admission_form?.images) delete value.admission_form.images.parent_signature;
    if (value.admission_form?.office_use) delete value.admission_form.office_use.principal_signature;

    const files = req.files || {};
    const imgs = {};
    if (files.student_photo?.[0]) imgs.student_photo = await processImage(files.student_photo[0], 'student_photo');
    if (files.student_signature?.[0]) imgs.student_signature = await processImage(files.student_signature[0], 'student_signature');

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


// const enquiryService = require('../services/enquiryService');
// const admissionConversionService = require('../services/admissionConversionService');
// const {
//   createEnquirySchema,
//   updateEnquirySchema,
//   updateEnquiryStatusSchema,
//   convertEnquirySchema,
//   listEnquiriesSchema,           // ✅ NEW import
// } = require('../validations/enquiryValidation');


// exports.createEnquiry = async (req, res, next) => {
//   try {
//     const { error, value } = createEnquirySchema.validate(req.body, {
//       abortEarly: false,
//       stripUnknown: true,
//       convert: true,
//     });

//     if (error) {
//       console.error('[ENQUIRY VALIDATION ERROR]:', error.details);
//       return res.status(400).json({
//         success: false,
//         message: error.details.map((detail) => detail.message).join(', '),
//       });
//     }

//     const enquiry = await enquiryService.createEnquiry(value, req.user.id);
//     console.log('[ENQUIRY CREATE] Successfully saved:', enquiry._id);

//     return res.status(201).json({
//       success: true,
//       message: 'Enquiry created successfully.',
//       data: enquiry,
//     });
//   } catch (error) {
//     console.error('[ENQUIRY CREATE ERROR]:', error);
//     next(error);
//   }
// };

// // ✅ UPDATED: validates query + returns `meta` (same shape as users/students/courses)
// exports.getEnquiries = async (req, res, next) => {
//   try {
//     const { error, value } = listEnquiriesSchema.validate(req.query, {
//       abortEarly: true,
//       stripUnknown: true,
//       convert: true,
//     });

//     if (error) {
//       return res.status(400).json({
//         success: false,
//         message: error.details[0].message,
//       });
//     }

//     const result = await enquiryService.getEnquiries(value);

//     return res.status(200).json({
//       success: true,
//       message: 'Enquiries retrieved successfully.',
//       data: result.enquiries,
//       meta: result.pagination,      // ✅ renamed for consistency
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// exports.getEnquirySummary = async (req, res, next) => {
//   try {
//     const summary = await enquiryService.getEnquirySummary();
//     return res.status(200).json({
//       success: true,
//       message: 'Enquiry summary retrieved successfully.',
//       data: summary,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// exports.getEnquiryById = async (req, res, next) => {
//   try {
//     const enquiry = await enquiryService.getEnquiryById(req.params.id);
//     return res.status(200).json({
//       success: true,
//       message: 'Enquiry retrieved successfully.',
//       data: enquiry,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// exports.updateEnquiry = async (req, res, next) => {
//   try {
//     const { error, value } = updateEnquirySchema.validate(req.body, {
//       abortEarly: true,
//       stripUnknown: false,
//     });

//     if (error) {
//       return res.status(400).json({
//         success: false,
//         message: error.details[0].message,
//       });
//     }

//     const enquiry = await enquiryService.updateEnquiry(req.params.id, value);
//     return res.status(200).json({
//       success: true,
//       message: 'Enquiry updated successfully.',
//       data: enquiry,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// exports.updateEnquiryStatus = async (req, res, next) => {
//   try {
//     const { error, value } = updateEnquiryStatusSchema.validate(req.body, {
//       abortEarly: true,
//       stripUnknown: false,
//     });

//     if (error) {
//       return res.status(400).json({
//         success: false,
//         message: error.details[0].message,
//       });
//     }

//     const enquiry = await enquiryService.updateEnquiryStatus(
//       req.params.id,
//       value.status
//     );

//     return res.status(200).json({
//       success: true,
//       message: 'Enquiry status updated successfully.',
//       data: enquiry,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// exports.convertEnquiry = async (req, res, next) => {
//   try {
//     const { error, value } = convertEnquirySchema.validate(req.body, {
//       abortEarly: true,
//       stripUnknown: false,
//     });

//     if (error) {
//       return res.status(400).json({
//         success: false,
//         message: error.details[0].message,
//       });
//     }

//     const result = await admissionConversionService.convertEnquiryToAdmission(
//       req.params.id,
//       value,
//       req.user.id
//     );

//     return res.status(201).json({
//       success: true,
//       message: 'Enquiry converted to admission successfully.',
//       data: result,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// exports.deleteEnquiry = async (req, res, next) => {
//   try {
//     const result = await enquiryService.deleteEnquiry(req.params.id);
//     return res.status(200).json({
//       success: true,
//       message: result.message,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// exports.getAdmissionPrefill = async (req, res, next) => {
//   try {
//     const data = await enquiryService.getAdmissionPrefill(req.params.id);
//     return res.status(200).json({
//       success: true,
//       message: 'Admission prefill data retrieved successfully.',
//       data,
//     });
//   } catch (error) {
//     next(error);
//   }
// };