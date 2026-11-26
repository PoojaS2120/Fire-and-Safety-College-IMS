const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Student = require('../models/Student');

const COLLEGE = {
  ref_prefix: 'SFSI',
  recognition: 'Recognized by Govt. of Maharashtra',
  affiliation:
    'Affiliated to Maharashtra State Board of Technical Education (MSBTE), Mumbai',
  note: 'This bonafied certificate is issued on written request of the student.',
};

// Logo is read once at startup and sent inside the JSON as a base64 data URI.
let LOGO_DATA_URI = null;
try {
  const logo = fs.readFileSync(path.join(__dirname, '../../../../assets/college-logo.png'));
  LOGO_DATA_URI = `data:image/png;base64,${logo.toString('base64')}`;
} catch (err) {
  console.warn('Bonafide watermark logo not found, falling back to text:', err.message);
}

const WATERMARK = {
  type: LOGO_DATA_URI ? 'image' : 'text',
  image: LOGO_DATA_URI, // base64 data URI, render as CSS background / <img src>
  text: 'SFSI', // fallback if the image fails to load
  opacity: 0.08,
  size: '60%',
  position: 'center',
  rotate: 0,
};

const BLOCKED_STATUSES = ['left', 'tc_issued', 'blocked'];
const SALUTATION = 'Mr.';

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const pad = (n) => String(n).padStart(2, '0');

// Indian academic year starts in June: Nov 2026 -> "2026-27", Mar 2027 -> "2026-27"
function getAcademicYear(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const start = d.getMonth() >= 5 ? y : y - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

// DD/MM/YYYY in IST
function formatDateIST(date) {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  return `${pad(ist.getUTCDate())}/${pad(ist.getUTCMonth() + 1)}/${ist.getUTCFullYear()}`;
}

exports.getBonafideData = async (studentId) => {
  if (!mongoose.isValidObjectId(studentId)) {
    throw createError(400, 'Invalid student ID.');
  }

  const student = await Student.findById(studentId)
    .select('student_id full_name admitted_on status course_id')
    .populate('course_id', 'name')
    .lean();

  if (!student) throw createError(404, 'Student not found.');
  if (!student.admitted_on) {
    throw createError(400, 'Student is not admitted yet.');
  }
  if (BLOCKED_STATUSES.includes(student.status)) {
    throw createError(
      400,
      `Bonafide cannot be issued for a student with status "${student.status}".`
    );
  }

  const now = new Date();
  const salutation = SALUTATION;
  const courseName = student.course_id?.name || '';
  const academicYear = getAcademicYear(student.admitted_on);

  return {
    title: 'BONAFIDE AND CONDUCT CERTIFICATE',
    ref_no: `${COLLEGE.ref_prefix}/${now.getFullYear()}/`, // serial left blank, as on the paper format
    date: formatDateIST(now),
    student: {
      student_id: student.student_id,
      salutation,
      full_name: student.full_name,
    },
    course_name: courseName,
    academic_year: academicYear,
    recognition: COLLEGE.recognition,
    affiliation: COLLEGE.affiliation,
    body:
      `This is to certify that ${salutation} ${student.full_name} is bonafide student of our college ` +
      `and admitted for ${courseName} ${COLLEGE.recognition} & ${COLLEGE.affiliation}, ` +
      `in the Academic Year ${academicYear}.`,
    note: `(Note: ${COLLEGE.note})`,
    watermark: WATERMARK,
  };
};