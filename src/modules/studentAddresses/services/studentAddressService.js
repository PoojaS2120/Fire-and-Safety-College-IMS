const mongoose = require('mongoose');
const StudentAddress = require('../models/StudentAddress');
const Student = require('../../students/models/Student'); // ⚠️ ADAPT path

// Local error helper — compatible with your existing errorMiddleware
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
// ─────────────────────────────────────────────
// Resolve authenticated user → Student document
// ⚠️ ADAPT this function to your auth scheme.
// ─────────────────────────────────────────────
async function resolveStudentForUser(user) {
  if (!user || !user.id) {
    throw new ApiError(401, 'Invalid authenticated user');
  }

  // student records are linked to users via Student.user_id
  const student = await Student.findOne({ user_id: user.id }).lean();
  if (!student) {
    throw new ApiError(
      404,
      'Student profile not found for this account. Contact administration.'
    );
  }

  return student;
}

// ─────────────── Student operations ───────────────

async function createAddress(user, payload) {
  const student = await resolveStudentForUser(user);

  const existing = await StudentAddress.findOne({ student_id: student._id }).lean();
  if (existing) throw new ApiError(409, 'Address already submitted for this student');

  const address = await StudentAddress.create({
    student_id: student._id,
    address_line_1: payload.address_line_1,
    address_line_2: payload.address_line_2 || '',
    village_city: payload.village_city,
    taluka: payload.taluka || '',
    district: payload.district,
    state: payload.state,
    pincode: payload.pincode,
    country: payload.country || 'India',
  });

  return address.toObject();
}

async function getMyAddress(user) {
  const student = await resolveStudentForUser(user);
  const address = await StudentAddress.findOne({ student_id: student._id }).lean();
  if (!address) throw new ApiError(404, 'No address submitted yet');
  return address;
}

async function updateMyAddress(user, payload) {
  const student = await resolveStudentForUser(user);

  const address = await StudentAddress.findOne({ student_id: student._id });
  if (!address) throw new ApiError(404, 'No address found. Submit an address first.');

  const allowed = [
    'address_line_1',
    'address_line_2',
    'village_city',
    'taluka',
    'district',
    'state',
    'pincode',
    'country',
  ];
  allowed.forEach((k) => {
    if (payload[k] !== undefined) address[k] = payload[k];
  });

  await address.save(); // auto-updates updated_at
  return address.toObject();
}

// ─────────────── Shared / admin operations ───────────────

async function getAddressByStudentId(studentId) {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw new ApiError(400, 'Invalid student id');
  }
  const address = await StudentAddress.findOne({ student_id: studentId }).lean();
  if (!address) {
    throw new ApiError(
      404,
      'Student has not submitted a residential address. Cannot proceed with distribution.'
    );
  }
  return address;
}

async function getAddressForAdmin(studentId) {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw new ApiError(400, 'Invalid student id');
  }
  const student = await Student.findById(studentId).lean();
  if (!student) throw new ApiError(404, 'Student not found');

  const address = await StudentAddress.findOne({ student_id: studentId }).lean();
  return { student, address: address || null };
}

async function listAddressesForAdmin({ page = 1, limit = 20, search, has_address }) {
  const skip = (page - 1) * limit;

  const studentFilter = {};
  if (search) {
    const rx = new RegExp(search, 'i');
    studentFilter.$or = [
      { full_name: rx },   // ⚠️ ADAPT: your Student schema fields
      { roll_number: rx }, // ⚠️ ADAPT
      { email: rx },       // ⚠️ ADAPT
    ];
  }

  // Case A: only students who HAVE an address
  if (has_address === 'true') {
    const total = await StudentAddress.countDocuments();
    const addresses = await StudentAddress.find()
      .skip(skip)
      .limit(limit)
      .sort({ updated_at: -1 })
      .lean();

    // Attach student info
    const studentIds = addresses.map((a) => a.student_id);
    const students = await Student.find({ _id: { $in: studentIds } }).lean();
    const byId = new Map(students.map((s) => [String(s._id), s]));

    const items = addresses.map((a) => ({
      student: byId.get(String(a.student_id)) || null,
      address: a,
    }));

    return { items, total, page, limit };
  }

  // Case B: only students WITHOUT an address
  if (has_address === 'false') {
    const withAddr = await StudentAddress.find().select('student_id').lean();
    const withIds = withAddr.map((a) => a.student_id);

    const filter = { ...studentFilter, _id: { $nin: withIds } };
    const total = await Student.countDocuments(filter);
    const students = await Student.find(filter).skip(skip).limit(limit).lean();

    const items = students.map((s) => ({ student: s, address: null }));
    return { items, total, page, limit };
  }

  // Case C (default): all students, with or without address
  const total = await Student.countDocuments(studentFilter);
  const students = await Student.find(studentFilter).skip(skip).limit(limit).lean();

  const addresses = await StudentAddress.find({
    student_id: { $in: students.map((s) => s._id) },
  }).lean();
  const byStudent = new Map(addresses.map((a) => [String(a.student_id), a]));

  const items = students.map((s) => ({
    student: s,
    address: byStudent.get(String(s._id)) || null,
  }));

  return { items, total, page, limit };
}

module.exports = {
  resolveStudentForUser,
  createAddress,
  getMyAddress,
  updateMyAddress,
  getAddressByStudentId,
  getAddressForAdmin,
  listAddressesForAdmin,
};