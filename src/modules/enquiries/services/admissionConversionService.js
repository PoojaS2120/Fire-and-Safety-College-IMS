const mongoose = require('mongoose');
const crypto = require('crypto');

const Enquiry = require('../models/Enquiry');
const User = require('../../auth/models/User');
const Student = require('../../students/models/Student');
const StudentFee = require('../../fees/models/StudentFee');
const StudentStageHistory = require('../../students/models/StudentStageHistory');
const StudentIdCounter = require('../../students/models/StudentIdCounter');
const Course = require('../../courses/models/Course');
const FeeComponent = require('../../courses/models/FeeComponent');

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function generateStudentId(year) {
  const key = `student_id_${year}`;
  const counter = await StudentIdCounter.findByIdAndUpdate(
    key,
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `FSC-${year}-${String(counter.sequence).padStart(4, '0')}`;
}

exports.convertEnquiryToAdmission = async (enquiryId, admissionData, staffUserId) => {
  if (!mongoose.isValidObjectId(enquiryId)) throw createError(400, 'Invalid enquiry ID.');
  if (!mongoose.isValidObjectId(staffUserId)) throw createError(400, 'Invalid staff user ID.');

  const enquiry = await Enquiry.findById(enquiryId);
  if (!enquiry) throw createError(404, 'Enquiry not found.');
  if (enquiry.status === 'converted' || enquiry.converted_student_id) {
    throw createError(409, 'This enquiry has already been converted.');
  }
  if (enquiry.status === 'closed') throw createError(400, 'Closed enquiries cannot be converted.');
  if (!enquiry.course_interest_id) {
    throw createError(400, 'A course must be assigned to the enquiry before conversion.');
  }

  const course = await Course.findById(enquiry.course_interest_id);
  if (!course || course.status !== 'active') {
    throw createError(400, 'Selected course is not available.');
  }

  const feeComponents = await FeeComponent.find({ course_id: course._id, status: 'active' });
  if (feeComponents.length === 0) {
    throw createError(400, 'No active fee components are configured for this course.');
  }

  // Use phone override if provided, else use enquiry's phone
  const phone = (admissionData.phone || enquiry.phone).trim();
  const fullName = (admissionData.full_name || enquiry.name).trim();

  // Synthetic login email (matches studentService pattern)
  const syntheticEmail = `${phone}@ims.com`;
  // Display email (real email stored on student record)
  const displayEmail = (admissionData.email || enquiry.email || '').trim().toLowerCase() || null;

  const existingUser = await User.findOne({ email: syntheticEmail });
  if (existingUser) {
    throw createError(409, 'A student with this phone number already exists.');
  }

  const temporaryPassword = crypto.randomBytes(12).toString('base64url');

  // Step 1: Create user
  const user = await User.create({
    name: fullName,
    email: syntheticEmail,
    phone,
    password: temporaryPassword,
    role: 'student',
    is_active: true,
    must_change_password: true,
  });

  let student;
  let studentFeeRecords = [];

  try {
    // Step 2: Student ID
    const year = new Date().getFullYear();
    const studentId = await generateStudentId(year);

    // Step 3: Student record
    student = await Student.create({
      student_id: studentId,
      user_id: user._id,
      full_name: fullName,
      dob: admissionData.dob,
      gender: admissionData.gender || null,
      phone,
      email: displayEmail,
      address: admissionData.address,
      guardian_name: admissionData.guardian_name || null,
      guardian_phone: admissionData.guardian_phone || null,
      qualification: admissionData.qualification,
      course_id: course._id,
      batch_id: null,
      lifecycle_stage: 'admission',
      stage_status: 'pending',
      status: 'active',
      admitted_on: new Date(),
      created_by: staffUserId,
    });

    // Step 4: Fee records
    studentFeeRecords = feeComponents.map((component) => ({
      student_id: student._id,
      course_id: course._id,
      fee_component_id: component._id,
      fee_name: component.name,
      amount_due: component.amount,
      amount_paid: 0,
      due_date: null,
      required_for_exam: component.required_for_exam,
      status: 'pending',
    }));
    await StudentFee.insertMany(studentFeeRecords);

    // Step 5: Stage history
    await StudentStageHistory.create({
      student_id: student._id,
      from_stage: null,
      to_stage: 'admission',
      stage_status: 'pending',
      changed_by: staffUserId,
      changed_at: new Date(),
      remarks: 'Initial admission through enquiry conversion.',
    });

    // Step 6: Mark enquiry converted
    enquiry.status = 'converted';
    enquiry.converted_student_id = student._id;
    await enquiry.save();
  } catch (err) {
    // Manual rollback: delete everything if any step fails
    if (student?._id) {
      await Student.findByIdAndDelete(student._id).catch(() => {});
      await StudentFee.deleteMany({ student_id: student._id }).catch(() => {});
      await StudentStageHistory.deleteMany({ student_id: student._id }).catch(() => {});
    }
    await User.findByIdAndDelete(user._id).catch(() => {});
    throw err;
  }

  return {
    enquiry: {
      id: enquiry._id,
      status: enquiry.status,
      converted_student_id: student._id,
    },
    student: {
      id: student._id,
      student_id: student.student_id,
      full_name: student.full_name,
      email: student.email,
      course_id: student.course_id,
      lifecycle_stage: student.lifecycle_stage,
    },
    account: {
      email: syntheticEmail,
      phone,
      temporary_password: temporaryPassword,
      must_change_password: true,
    },
    fees_generated: studentFeeRecords.length,
  };
};