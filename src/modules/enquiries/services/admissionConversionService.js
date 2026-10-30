
const mongoose = require('mongoose');
const crypto = require('crypto');

const Enquiry = require('../models/Enquiry');
const User = require('../../auth/models/User');
const Student = require('../../students/models/Student');
const StudentFee = require('../../students/models/StudentFee');
const StudentStageHistory = require('../../students/models/StudentStageHistory');
const StudentIdCounter = require('../../students/models/StudentIdCounter');
const Course = require('../../courses/models/Course');
const FeeComponent = require('../../courses/models/FeeComponent');

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function generateStudentId(year, session) {
  const counterKey = `FSC-${year}`;

  // Find the highest existing student ID for this year.
  const existingStudents = await Student.find({
    student_id: new RegExp(`^FSC-${year}-(\\d+)$`),
  })
    .select('student_id')
    .session(session)
    .lean();

  const highestExisting = existingStudents.reduce((max, student) => {
    const match = student.student_id.match(/-(\d+)$/);
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0);

  // Initialize or synchronize the counter with existing student records.
  await StudentIdCounter.updateOne(
    { _id: counterKey },
    { $max: { sequence: highestExisting } },
    { upsert: true, session }
  );

  // Atomically reserve the next number.
  const counter = await StudentIdCounter.findOneAndUpdate(
    { _id: counterKey },
    { $inc: { sequence: 1 } },
    { new: true, session }
  );

  return `${counterKey}-${String(counter.sequence).padStart(4, '0')}`;
}

exports.convertEnquiryToAdmission = async (
  enquiryId,
  admissionData,
  staffUserId
) => {
  if (!mongoose.isValidObjectId(enquiryId)) {
    throw createError(400, 'Invalid enquiry ID.');
  }

  if (!mongoose.isValidObjectId(staffUserId)) {
    throw createError(400, 'Invalid staff user ID.');
  }

  const session = await mongoose.startSession();

  let result;

  try {
    await session.withTransaction(async () => {
      // 1. Find and validate the enquiry.
      const enquiry = await Enquiry.findById(enquiryId).session(session);

      if (!enquiry) {
        throw createError(404, 'Enquiry not found.');
      }

      if (enquiry.status === 'converted' || enquiry.converted_student_id) {
        throw createError(409, 'This enquiry has already been converted.');
      }

      if (enquiry.status === 'closed') {
        throw createError(400, 'Closed enquiries cannot be converted.');
      }

      if (!enquiry.course_interest_id) {
        throw createError(
          400,
          'A course must be assigned to the enquiry before conversion.'
        );
      }

      // 2. Validate the course.
      const course = await Course.findById(
        enquiry.course_interest_id
      ).session(session);

      if (!course || course.status !== 'active') {
        throw createError(400, 'Selected course is not available.');
      }

      // 3. Validate fee components.
      const feeComponents = await FeeComponent.find({
        course_id: course._id,
        status: 'active',
      }).session(session);

      if (feeComponents.length === 0) {
        throw createError(
          400,
          'No active fee components are configured for this course.'
        );
      }

      // 4. Resolve the student's email.
      const email = (
        admissionData.email || enquiry.email || ''
      ).trim().toLowerCase();

      if (!email) {
        throw createError(
          400,
          'Email is required to create the student login account.'
        );
      }

      // 5. Check for an existing account.
      const existingUser = await User.findOne({ email }).session(session);

      if (existingUser) {
        throw createError(
          409,
          'A user account with this email already exists.'
        );
      }

      // 6. Generate a secure temporary password.
      const temporaryPassword = crypto.randomBytes(24).toString('base64url');

      // 7. Create the student login account.
      const [user] = await User.create(
        [
          {
            name: enquiry.name,
            email,
            phone: enquiry.phone,
            password: temporaryPassword,
            role: 'student',
            is_active: true,
            must_change_password: true,
          },
        ],
        { session }
      );

      // 8. Generate a unique Student ID.
      const year = new Date().getFullYear();
      const studentId = await generateStudentId(year, session);

      // 9. Create the student profile.
      const [student] = await Student.create(
        [
          {
            student_id: studentId,
            user_id: user._id,
            full_name: enquiry.name,
            dob: admissionData.dob,
            gender: admissionData.gender || null,
            phone: enquiry.phone,
            email,
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
          },
        ],
        { session }
      );

      // 10. Generate student fee records.
      const studentFeeRecords = feeComponents.map((component) => ({
        student_id: student._id,
        fee_component_id: component._id,
        fee_name: component.name,
        total_amount: component.amount,
        paid_amount: 0,
        balance_amount: component.amount,
        required_for_exam: component.required_for_exam,
        status: 'pending',
      }));

      await StudentFee.insertMany(studentFeeRecords, { session });

      // 11. Record the initial admission stage.
      await StudentStageHistory.create(
        [
          {
            student_id: student._id,
            from_stage: null,
            to_stage: 'admission',
            stage_status: 'pending',
            changed_by: staffUserId,
            changed_at: new Date(),
            remarks: 'Initial admission through enquiry conversion.',
          },
        ],
        { session }
      );

      // 12. Mark the enquiry as converted.
      enquiry.status = 'converted';
      enquiry.converted_student_id = student._id;

      await enquiry.save({ session });

      // Prepare response data. Password is returned only after commit.
      result = {
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
          email,
          temporary_password: temporaryPassword,
          must_change_password: true,
        },
        fees_generated: studentFeeRecords.length,
      };
    });

    return result;
  } catch (error) {
    if (error.code === 11000) {
      throw createError(
        409,
        'Duplicate student ID or email detected. Please retry the conversion.'
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }
};
