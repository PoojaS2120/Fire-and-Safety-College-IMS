
const Student = require('../models/Student');
const studentService = require('./studentService');
const { createStudentSchema } = require('../validations/studentValidation');
const Course = require('../../courses/models/Course');
const Batch = require('../../courses/models/Batch');

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
  'course_name',
  'batch_name',
  'admitted_on',
];

// ================= IMPORT STUDENTS =================
exports.importStudents = async (rows, adminId) => {
  const result = {
    totalRows: rows.length,
    importedCount: 0,
    skippedCount: 0,
    errors: [],
  };

  const seenStudentIds = new Set();

  for (let index = 0; index < rows.length; index++) {
    const rowNumber = index + 2;
    const row = rows[index];

    try {
      const normalizedRow = {};

      // Read only supported Excel columns.
      for (const column of STUDENT_COLUMNS) {
        const value = row[column];

        if (value !== undefined && value !== '') {
          normalizedRow[column] = value;
        }
      }

      // Check duplicate IDs within the uploaded file.
      const studentId = String(normalizedRow.student_id || '').trim();

      if (seenStudentIds.has(studentId)) {
        throw new Error('Duplicate student_id in uploaded file.');
      }

      // Resolve Course Name to MongoDB Course ID.
      const courseName = String(
        normalizedRow.course_name || ''
      ).trim();

      if (!courseName) {
        throw new Error('Course name is required.');
      }

      const course = await Course.findOne({
        name: courseName,
        status: 'active',
      });

      if (!course) {
        throw new Error(`Active course "${courseName}" not found.`);
      }

      normalizedRow.course_id = course._id.toString();

      // Resolve Batch Name to MongoDB Batch ID.
      const batchName = String(
        normalizedRow.batch_name || ''
      ).trim();

      if (batchName) {
        const batch = await Batch.findOne({
          name: batchName,
          course_id: course._id,
          status: 'active',
        });

        if (!batch) {
          throw new Error(
            `Active batch "${batchName}" not found for course "${courseName}".`
          );
        }

        normalizedRow.batch_id = batch._id.toString();
      } else {
        normalizedRow.batch_id = null;
      }

      // Convert resolved data using existing Student validation.
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
          error.details
            .map((detail) => detail.message)
            .join('; ')
        );
      }

      // Create Student and linked User account.
      await studentService.createStudent(value, adminId);

      // Mark ID only after successful import.
      seenStudentIds.add(studentId);

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

// ================= EXPORT STUDENTS =================
exports.exportStudents = async (query = {}) => {
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.lifecycle_stage) {
    filter.lifecycle_stage = query.lifecycle_stage;
  }

  if (query.courseId) {
    filter.course_id = query.courseId;
  }

  if (query.batchId) {
    filter.batch_id = query.batchId;
  }

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

    course_name: student.course_id?.name || '',
    batch_name: student.batch_id?.name || '',

    admitted_on: formatDate(student.admitted_on),
  }));
};

// ================= DATE FORMAT =================
function formatDate(date) {
  if (!date) return '';

  return new Date(date).toISOString().slice(0, 10);
}
