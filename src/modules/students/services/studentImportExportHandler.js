const Student = require('../models/Student');
const studentService = require('./studentService');
const { createStudentSchema } = require('../validations/studentValidation');

const STUDENT_COLUMNS = [
  'student_id',
  'full_name',
  'dob',
  'gender',
  'phone',
  'email',
  'address',
  'guardian_name',
  'guardian_phone',
  'qualification',
  'course_id',
  'batch_id',
  'admitted_on',
];

exports.importStudents = async (rows, adminId) => {
  const result = {
    totalRows: rows.length,
    importedCount: 0,
    skippedCount: 0,
    errors: [],
  };

  // Detect duplicate IDs within the uploaded file.
  const seenStudentIds = new Set();

  for (let index = 0; index < rows.length; index++) {
    const rowNumber = index + 2;
    const row = rows[index];

    try {
      const normalizedRow = {};

      for (const column of STUDENT_COLUMNS) {
        const value = row[column];

        if (value !== undefined && value !== '') {
          normalizedRow[column] = value;
        }
      }

      const { error, value } = createStudentSchema.validate(
        normalizedRow,
        {
          abortEarly: false,
          stripUnknown: true,
          convert: true,
        }
      );

      if (error) {
        throw new Error(
          error.details.map((detail) => detail.message).join('; ')
        );
      }

      if (seenStudentIds.has(value.student_id)) {
        throw new Error('Duplicate student_id in uploaded file.');
      }

await studentService.createStudent(value, adminId);

seenStudentIds.add(value.student_id);

result.importedCount++;
    } catch (error) {
      result.skippedCount++;

      result.errors.push({
        row: rowNumber,
        student_id: row.student_id || null,
        message: error.message || 'Unable to import student.',
      });
    }
  }

  return result;
};

// Export students
exports.exportStudents = async (query = {}) => {
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.lifecycle_stage) {
    filter.lifecycle_stage = query.lifecycle_stage;
  }
  if (query.courseId) filter.course_id = query.courseId;
  if (query.batchId) filter.batch_id = query.batchId;

  const students = await Student.find(filter)
    .populate('course_id', 'name')
    .populate('batch_id', 'name')
    .sort({ createdAt: -1 })
    .lean();

  return students.map((student) => ({
    student_id: student.student_id,
    full_name: student.full_name,
    dob: formatDate(student.dob),
    gender: student.gender || '',
    phone: student.phone,
    email: student.email || '',
    address: student.address,
    guardian_name: student.guardian_name || '',
    guardian_phone: student.guardian_phone || '',
    qualification: student.qualification,
    course_id: student.course_id?._id?.toString() || '',
    batch_id: student.batch_id?._id?.toString() || '',
    admitted_on: formatDate(student.admitted_on),
  }));
};

function formatDate(date) {
  if (!date) return '';

  return new Date(date).toISOString().slice(0, 10);
}