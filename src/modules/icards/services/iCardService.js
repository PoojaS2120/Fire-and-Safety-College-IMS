
// const mongoose = require('mongoose');

// const Student = require('../../students/models/Student');
// const ICard = require('../models/ICard');

// function createError(statusCode, message) {
//   const error = new Error(message);
//   error.statusCode = statusCode;
//   return error;
// }

// function formatICardStudent(student) {
//   const photo = student.admission_form?.images?.student_photo;

//   return {
//     student_id: student.student_id,
//     full_name: student.full_name,
//     date_of_birth: student.dob || null,
//     blood_group:
//       student.admission_form?.physical_details?.blood_group || null,
//     address: student.address || '',
//     mobile_number: student.phone || '',
//     photo: photo
//       ? {
//           file_name: photo.file_name || null,
//           file_path: photo.file_path || null,
//           mime_type: photo.mime_type || null,
//         }
//       : null,
//   };
// }

// function getSnapshot(student, overrides = {}) {
//   const details = formatICardStudent(student);

//   return {
//     ...details,
//     ...overrides,
//     photo:
//       overrides.photo !== undefined
//         ? overrides.photo
//         : details.photo || {
//             file_name: null,
//             file_path: null,
//             mime_type: null,
//           },
//   };
// }

// async function getAdmittedStudent(studentId) {
//   if (!mongoose.isValidObjectId(studentId)) {
//     throw createError(400, 'Invalid student ID.');
//   }

//   const student = await Student.findOne({
//     _id: studentId,
//     admitted_on: { $ne: null },
//   }).lean();

//   if (!student) {
//     throw createError(404, 'Admitted student not found.');
//   }

//   return student;
// }

// // ================= LIST ELIGIBLE STUDENTS =================
// exports.getICardStudents = async (query) => {
//   const page = Number(query.page) || 1;
//   const limit = Number(query.limit) || 10;
//   const search = String(query.search || '').trim();

//   const filter = {
//     admitted_on: { $ne: null },
//   };

//   if (query.status) {
//     filter.status = query.status;
//   }

//   if (search) {
//     const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

//     filter.$or = [
//       { student_id: { $regex: escaped, $options: 'i' } },
//       { full_name: { $regex: escaped, $options: 'i' } },
//       { phone: { $regex: escaped, $options: 'i' } },
//     ];
//   }

//   const skip = (page - 1) * limit;

//   const [students, total] = await Promise.all([
//     Student.find(filter)
//       .select(
//         'student_id full_name phone status course_id batch_id admitted_on admission_form.images.student_photo'
//       )
//       .populate('course_id', 'name')
//       .populate('batch_id', 'name')
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean(),

//     Student.countDocuments(filter),
//   ]);

//   return {
//     students: students.map((student) => ({
//       _id: student._id,
//       student_id: student.student_id,
//       full_name: student.full_name,
//       mobile_number: student.phone || '',
//       course: student.course_id?.name || null,
//       batch: student.batch_id?.name || null,
//       status: student.status,
//       admitted_on: student.admitted_on || null,
//       photo: student.admission_form?.images?.student_photo?.file_path || null,
//     })),
//     meta: {
//       page,
//       limit,
//       total,
//       totalPages: Math.ceil(total / limit),
//     },
//   };
// };

// // ================= PREVIEW STUDENT I-CARD =================
// exports.getICardByStudentId = async (studentId) => {
//   const student = await getAdmittedStudent(studentId);

//   return {
//     student: formatICardStudent(student),
//   };
// };

// // ================= CREATE I-CARD =================
// exports.createICard = async (data, userId) => {
//   const student = await getAdmittedStudent(data.studentId);

//   const {
//     studentId,
//     ...overrides
//   } = data;

//   const snapshot = getSnapshot(student, overrides);

//   const iCard = await ICard.create({
//     student: student._id,
//     ...snapshot,
//     createdBy: userId || null,
//   });

//   return iCard;
// };

// // ================= GET ALL SAVED I-CARDS =================
// exports.getAllICards = async (query) => {
//   const page = Number(query.page) || 1;
//   const limit = Number(query.limit) || 10;
//   const search = String(query.search || '').trim();

//   const filter = {};

//   if (query.studentId) {
//     if (!mongoose.isValidObjectId(query.studentId)) {
//       throw createError(400, 'Invalid student ID.');
//     }

//     filter.student = query.studentId;
//   }

//   if (search) {
//     const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

//     filter.$or = [
//       { student_id: { $regex: escaped, $options: 'i' } },
//       { full_name: { $regex: escaped, $options: 'i' } },
//       { mobile_number: { $regex: escaped, $options: 'i' } },
//     ];
//   }

//   const skip = (page - 1) * limit;

//   const [cards, total] = await Promise.all([
//     ICard.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean(),

//     ICard.countDocuments(filter),
//   ]);

//   return {
//     cards,
//     meta: {
//       page,
//       limit,
//       total,
//       totalPages: Math.ceil(total / limit),
//     },
//   };
// };

// // ================= GET SINGLE I-CARD =================
// exports.getICardById = async (id) => {
//   if (!mongoose.isValidObjectId(id)) {
//     throw createError(400, 'Invalid I-Card ID.');
//   }

//   const iCard = await ICard.findById(id).lean();

//   if (!iCard) {
//     throw createError(404, 'I-Card not found.');
//   }

//   return iCard;
// };

// // ================= UPDATE I-CARD =================
// exports.updateICard = async (id, data, userId) => {
//   if (!mongoose.isValidObjectId(id)) {
//     throw createError(400, 'Invalid I-Card ID.');
//   }

//   const iCard = await ICard.findById(id);

//   if (!iCard) {
//     throw createError(404, 'I-Card not found.');
//   }

//   const allowedFields = [
//     'full_name',
//     'date_of_birth',
//     'blood_group',
//     'address',
//     'mobile_number',
//     'photo',
//   ];

//   for (const field of allowedFields) {
//     if (Object.prototype.hasOwnProperty.call(data, field)) {
//       iCard[field] = data[field];
//     }
//   }

//   iCard.updatedBy = userId || null;

//   await iCard.save();

//   return iCard;
// };

// // ================= DELETE I-CARD =================
// exports.deleteICard = async (id) => {
//   if (!mongoose.isValidObjectId(id)) {
//     throw createError(400, 'Invalid I-Card ID.');
//   }

//   const iCard = await ICard.findByIdAndDelete(id);

//   if (!iCard) {
//     throw createError(404, 'I-Card not found.');
//   }

//   return iCard;
// };

const mongoose = require('mongoose');
const path = require('path');
const Student = require('../../students/models/Student');
const ICard = require('../models/ICard');
const { uploadDir } = require('../../uploads/middleware/uploadMiddleware');

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// Helper to format student data for the dropdown list
function formatStudentForDropdown(student) {
  return {
    _id: student._id,
    student_id: student.student_id,
    full_name: student.full_name,
    mobile_number: student.phone || '',
    photo: student.admission_form?.images?.student_photo?.file_path || null,
  };
}

// ================= LIST STUDENTS (For Dropdown/Selection) =================
exports.getICardStudents = async (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const search = String(query.search || '').trim();

  const filter = { admitted_on: { $ne: null } };
  
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { student_id: { $regex: escaped, $options: 'i' } },
      { full_name: { $regex: escaped, $options: 'i' } },
      { phone: { $regex: escaped, $options: 'i' } },
    ];
  }

  const [students, total] = await Promise.all([
    Student.find(filter)
      .select('student_id full_name phone status admission_form.images.student_photo')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Student.countDocuments(filter),
  ]);

  return {
    students: students.map(formatStudentForDropdown),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

// ================= GET ALL SAVED I-CARDS =================
exports.getAllICards = async (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const search = String(query.search || '').trim();

  const filter = {};
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { student_id: { $regex: escaped, $options: 'i' } },
      { full_name: { $regex: escaped, $options: 'i' } },
    ];
  }

  const [cards, total] = await Promise.all([
    ICard.find(filter)
      .populate('student', 'student_id full_name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ICard.countDocuments(filter),
  ]);

  return {
    cards,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

// ================= GET SINGLE SAVED I-CARD =================
exports.getICardById = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw createError(400, 'Invalid I-Card ID.');
  
  const card = await ICard.findById(id).populate('student').lean();
  if (!card) throw createError(404, 'I-Card not found');
  
  // Format to match what frontend expects
  return { card };
};

// ================= GET STUDENT DETAILS FOR PREVIEW (Unsaved) =================
exports.getICardByStudentId = async (studentId) => {
  if (!mongoose.isValidObjectId(studentId)) throw createError(400, 'Invalid student ID.');

  const student = await Student.findOne({ _id: studentId, admitted_on: { $ne: null } }).lean();
  if (!student) throw createError(404, 'Admitted student not found.');

  const photo = student.admission_form?.images?.student_photo;

  return {
    student: {
      _id: student._id,
      student_id: student.student_id,
      full_name: student.full_name,
      date_of_birth: student.dob || null,
      blood_group: student.admission_form?.physical_details?.blood_group || null,
      address: student.address || '',
      mobile_number: student.phone || '',
      photo: photo ? {
        file_name: photo.file_name || null,
        file_path: photo.file_path || null,
        mime_type: photo.mime_type || null,
      } : null,
    },
  };
};

// ================= CREATE I-CARD =================
exports.createICard = async (data, userId) => {
  const { studentId, ...rest } = data; // Frontend sends studentId
  
  if (!mongoose.isValidObjectId(studentId)) throw createError(400, 'Invalid student ID.');

  const student = await Student.findById(studentId).lean();
  if (!student) throw createError(404, 'Student not found');

  const photo = student.admission_form?.images?.student_photo;

  const card = await ICard.create({
    student: studentId, // Map frontend studentId to schema 'student' field
    student_id: rest.student_id || student.student_id,
    full_name: rest.full_name || student.full_name,
    date_of_birth: rest.date_of_birth || student.dob || null,
    blood_group: rest.blood_group || student.admission_form?.physical_details?.blood_group || null,
    address: rest.address || student.address || '',
    mobile_number: rest.mobile_number || student.phone || '',
    photo: photo ? {
      file_name: photo.file_name || null,
      file_path: photo.file_path || null,
      mime_type: photo.mime_type || null,
    } : {},
    createdBy: userId,
  });

  return card;
};

// ================= UPDATE I-CARD =================
exports.updateICard = async (id, data, userId) => {
  if (!mongoose.isValidObjectId(id)) throw createError(400, 'Invalid I-Card ID.');

  // We explicitly pick fields to prevent updating the 'student' reference
  const allowedUpdates = {
    full_name: data.full_name,
    date_of_birth: data.date_of_birth,
    blood_group: data.blood_group,
    address: data.address,
    mobile_number: data.mobile_number,
    updatedBy: userId,
  };

  // Strip undefined values
  Object.keys(allowedUpdates).forEach(key => allowedUpdates[key] === undefined && delete allowedUpdates[key]);

  const card = await ICard.findByIdAndUpdate(id, { $set: allowedUpdates }, { new: true, runValidators: true });
  if (!card) throw createError(404, 'I-Card not found');
  return card;
};

// ================= DELETE I-CARD =================
exports.deleteICard = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw createError(400, 'Invalid I-Card ID.');
  const card = await ICard.findByIdAndDelete(id);
  if (!card) throw createError(404, 'I-Card not found');
  return { message: 'I-Card deleted successfully' };
};

// ================= GET STUDENT PHOTO FILE (For streaming) =================
exports.getICardPhotoFile = async (studentId) => {
  if (!mongoose.isValidObjectId(studentId)) throw createError(400, 'Invalid student ID.');

  const student = await Student.findOne({ _id: studentId, admitted_on: { $ne: null } })
    .select('admission_form.images.student_photo')
    .lean();

  const photo = student?.admission_form?.images?.student_photo;
  if (!photo?.file_path) throw createError(404, 'Student photo not found.');

  const absolute = path.resolve(uploadDir, photo.file_path);
  if (!absolute.startsWith(uploadDir + path.sep)) {
    throw createError(400, 'Invalid photo path.');
  }

  return { absolute, mimeType: photo.mime_type || 'image/jpeg' };
};