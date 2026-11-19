
const mongoose = require('mongoose');
const Student = require('../../students/models/Student');

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// Map Student document to I-Card response.
function formatICardStudent(student) {
  const photo = student.admission_form?.images?.student_photo;

  return {
    student_id: student.student_id,
    full_name: student.full_name,
    date_of_birth: student.dob || null,
    blood_group:
      student.admission_form?.physical_details?.blood_group || null,
    address: student.address || '',
    mobile_number: student.phone || '',
    photo: photo
      ? {
          file_name: photo.file_name || null,
          file_path: photo.file_path || null,
          mime_type: photo.mime_type || null,
        }
      : null,
  };
}

// ================= LIST STUDENTS =================
exports.getICardStudents = async (query) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const search = String(query.search || '').trim();

  const filter = {
    admitted_on: { $ne: null },
  };

  if (query.status) {
    filter.status = query.status;
  }

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    filter.$or = [
      { student_id: { $regex: escaped, $options: 'i' } },
      { full_name: { $regex: escaped, $options: 'i' } },
      { phone: { $regex: escaped, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [students, total] = await Promise.all([
    Student.find(filter)
      .select(
        'student_id full_name phone status course_id batch_id admitted_on admission_form.images.student_photo'
      )
      .populate('course_id', 'name')
      .populate('batch_id', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Student.countDocuments(filter),
  ]);

  return {
    students: students.map((student) => ({
      _id: student._id,
      student_id: student.student_id,
      full_name: student.full_name,
      mobile_number: student.phone || '',
      course: student.course_id?.name || null,
      batch: student.batch_id?.name || null,
      status: student.status,
      admitted_on: student.admitted_on || null,
      photo: student.admission_form?.images?.student_photo?.file_path || null,
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ================= GET SINGLE I-CARD =================
exports.getICardByStudentId = async (studentId) => {
  if (!mongoose.isValidObjectId(studentId)) {
    throw createError(400, 'Invalid student ID.');
  }

  const student = await Student.findOne({
    _id: studentId,
    admitted_on: { $ne: null },
  }).lean();

  if (!student) {
    throw createError(404, 'Admitted student not found.');
  }

  return {
    student: formatICardStudent(student),
  };
};
