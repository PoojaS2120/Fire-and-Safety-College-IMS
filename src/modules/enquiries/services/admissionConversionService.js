// const mongoose = require('mongoose');
// const crypto = require('crypto');

// const Enquiry = require('../models/Enquiry');
// const User = require('../../auth/models/User');
// const Role = require('../../rbac/models/Role');
// const Student = require('../../students/models/Student');
// const StudentFee = require('../../fees/models/StudentFee');
// const StudentStageHistory = require('../../students/models/StudentStageHistory');
// const StudentIdCounter = require('../../students/models/StudentIdCounter');
// const Course = require('../../courses/models/Course');
// const FeeComponent = require('../../courses/models/FeeComponent');

// function createError(statusCode, message) {
//   const error = new Error(message);
//   error.statusCode = statusCode;
//   return error;
// }

// function clean(value, fallback = '') {
//   if (value === undefined || value === null) return fallback;
//   return typeof value === 'string' ? value.trim() : value;
// }

// function pick(...values) {
//   return values.find(
//     (value) => value !== undefined && value !== null && value !== ''
//   );
// }

// function buildAdmissionForm(data, enquiry) {
//   const form = data.admission_form || {};

//   const postal = form.postal_address || {};
//   const permanent = form.permanent_address || {};
//   const contact = form.contact_details || {};
//   const physical = form.physical_details || {};
//   const participation = physical.participation || {};
//   const declaration = form.declaration || {};
//   const office = form.office_use || {};
//   const documents = office.required_documents || {};

//   return {
//     fathers_name: clean(
//       pick(form.fathers_name, data.fathers_name, enquiry.fathers_name)
//     ),

//     mothers_name: clean(
//       pick(form.mothers_name, data.mothers_name, enquiry.mothers_name)
//     ),

//     religion: clean(pick(form.religion, data.religion, enquiry.religion)),
//     caste: clean(pick(form.caste, data.caste, enquiry.caste)),
//     category: clean(pick(form.category, data.category, enquiry.category)),

//     postal_address: {
//       address: clean(
//         pick(
//           postal.address,
//           data.postal_address?.address,
//           enquiry.postal_address?.address
//         )
//       ),
//       pin: clean(
//         pick(
//           postal.pin,
//           data.postal_address?.pin,
//           enquiry.postal_address?.pin
//         )
//       ),
//     },

//     permanent_address: {
//       address: clean(
//         pick(
//           permanent.address,
//           data.permanent_address?.address,
//           enquiry.permanent_address?.address
//         )
//       ),
//       pin: clean(
//         pick(
//           permanent.pin,
//           data.permanent_address?.pin,
//           enquiry.permanent_address?.pin
//         )
//       ),
//     },

//     contact_details: {
//       contact_no: clean(
//         pick(
//           contact.contact_no,
//           data.contact_no,
//           enquiry.contact_no,
//           enquiry.phone_tel
//         )
//       ),

//       mobile_no: clean(
//         pick(
//           contact.mobile_no,
//           data.mobile_no,
//           enquiry.mobile,
//           enquiry.phone
//         )
//       ),

//       home_mobile_no: clean(
//         pick(
//           contact.home_mobile_no,
//           data.home_mobile_no,
//           enquiry.home_mobile_no
//         )
//       ),
//     },

//     aadhaar_number: clean(form.aadhaar_number, null),

//     academic_qualification:
//       form.academic_qualification ||
//       data.academic_qualification ||
//       enquiry.academic_qualification ||
//       [],

//     physical_details: {
//       blood_group: clean(pick(physical.blood_group)),
//       chest: clean(pick(physical.chest, enquiry.chest_cm)),
//       height: clean(pick(physical.height, enquiry.height_cm)),
//       weight: clean(pick(physical.weight, enquiry.weight_kg)),

//       participation: {
//         ncc: Boolean(participation.ncc),
//         nss: Boolean(participation.nss),
//         scout_guide: Boolean(participation.scout_guide),
//       },
//     },

//     images: {
//       student_photo: form.images?.student_photo || {},
//       student_signature: form.images?.student_signature || {},

//       parent_signature: form.images?.parent_signature || {}, // <-- ADDED THIS

//     },

//     declaration: {
//       place: clean(declaration.place),
//       date: declaration.date || null,
//     },

//     office_use: {
//       required_documents: {
//         passport_photographs: Boolean(documents.passport_photographs),
//         final_year_marksheet: Boolean(documents.final_year_marksheet),
//         degree_certificate: Boolean(documents.degree_certificate),
//         leaving_certificate: Boolean(documents.leaving_certificate),
//         experience_or_deputation_letter: Boolean(
//           documents.experience_or_deputation_letter
//         ),
//         domicile_certificate: Boolean(documents.domicile_certificate),
//         gap_certificate: Boolean(documents.gap_certificate),
//         caste_certificate: Boolean(documents.caste_certificate),
//         caste_validity_certificate: Boolean(
//           documents.caste_validity_certificate
//         ),
//         non_creamy_layer_certificate: Boolean(
//           documents.non_creamy_layer_certificate
//         ),
//         ssc_marksheet_certificate: Boolean(
//           documents.ssc_marksheet_certificate
//         ),
//         hsc_marksheet_certificate: Boolean(
//           documents.hsc_marksheet_certificate
//         ),
//       },

//       admission_decision: office.admission_decision || 'pending',
//     },
//   };
// }


// async function generateStudentId(year) {
//   const key = `student_id_${year}`;

//   // Atomically increment the sequence counter
//   const counter = await StudentIdCounter.findByIdAndUpdate(
//     key,
//     { $inc: { sequence: 1 } },
//     {
//       returnDocument: 'after',
//       upsert: true,
//       setDefaultsOnInsert: true,
//     }
//   );

//   const studentId = `FSC-${year}-${String(counter.sequence).padStart(4, '0')}`;

//   // Safety check: avoid duplicate IDs if the counter is behind existing records
//   const existingStudent = await Student.findOne({
//     student_id: studentId,
//   }).select('_id');

//   if (existingStudent) {
//     const latestStudent = await Student.findOne({
//       student_id: new RegExp(`^FSC-${year}-`),
//     })
//       .sort({ student_id: -1 })
//       .select('student_id');

//     const match = latestStudent?.student_id?.match(/^FSC-\d+-(\d+)$/);
//     const latestSequence = match ? Number(match[1]) : 0;

//     await StudentIdCounter.findByIdAndUpdate(
//       key,
//       { $max: { sequence: latestSequence } },
//       { returnDocument: 'after' }
//     );

//     return generateStudentId(year);
//   }

//   return studentId;
// }


// exports.convertEnquiryToAdmission = async (
//   enquiryId,
//   admissionData = {},
//   staffUserId
// ) => {
//   if (!mongoose.isValidObjectId(enquiryId)) {
//     throw createError(400, 'Invalid enquiry ID.');
//   }

//   if (!mongoose.isValidObjectId(staffUserId)) {
//     throw createError(400, 'Invalid staff user ID.');
//   }

//   if (
//     !admissionData ||
//     typeof admissionData !== 'object' ||
//     Array.isArray(admissionData)
//   ) {
//     throw createError(400, 'Invalid admission data.');
//   }

//   const enquiry = await Enquiry.findById(enquiryId);

//   if (!enquiry) {
//     throw createError(404, 'Enquiry not found.');
//   }

//   if (enquiry.status === 'converted' || enquiry.converted_student_id) {
//     throw createError(409, 'This enquiry has already been converted.');
//   }

//   if (enquiry.status === 'closed') {
//     throw createError(400, 'Closed enquiries cannot be converted.');
//   }

//   // Use the course selected in the admission request.
//   // Fallback to the enquiry's original course if not provided.
//   const selectedCourseId =
//     admissionData.course_id || enquiry.course_interest_id;

//   if (!selectedCourseId) {
//     throw createError(400, 'Please select a course for admission.');
//   }

//   if (!mongoose.isValidObjectId(selectedCourseId)) {
//     throw createError(400, 'Invalid course ID.');
//   }

//   const course = await Course.findById(selectedCourseId);

//   if (!course || course.status !== 'active') {
//     throw createError(400, 'Selected course is not available.');
//   }

//   // Fetch active fee components for the selected course.
//   const feeComponents = await FeeComponent.find({
//     course_id: course._id,
//     status: 'active',
//   });

//   if (!feeComponents.length) {
//     throw createError(
//       400,
//       'No active fee components are configured for this course.'
//     );
//   }

//   const studentRole = await Role.findOne({ name: 'student' });

//   if (!studentRole) {
//     throw createError(500, 'System error: Student role not found in database.');
//   }

//   const phone = clean(
//     pick(
//       admissionData.phone,
//       admissionData.mobile_no,
//       admissionData.admission_form?.contact_details?.mobile_no,
//       enquiry.mobile,
//       enquiry.phone,
//       enquiry.phone_tel
//     )
//   );

//   const fullName = clean(
//     pick(admissionData.full_name, enquiry.name)
//   );

//   const dob = pick(
//     admissionData.dob,
//     enquiry.date_of_birth,
//     enquiry.dob
//   );

//   const admissionForm = buildAdmissionForm(admissionData, enquiry);

//   const postalAddress = admissionForm.postal_address.address;
//   const permanentAddress = admissionForm.permanent_address.address;

//   const address = clean(
//     pick(
//       admissionData.address,
//       postalAddress,
//       permanentAddress,
//       enquiry.address
//     )
//   );

//   const qualification = clean(
//     pick(
//       admissionData.qualification,
//       admissionForm.academic_qualification[0]?.examination_passed,
//       enquiry.qualification
//     )
//   );

//   if (!fullName) {
//     throw createError(400, 'Student name is required.');
//   }

//   if (!phone) {
//     throw createError(400, 'Student mobile number is required.');
//   }

//   if (!dob) {
//     throw createError(400, 'Date of birth is required.');
//   }

//   if (!address) {
//     throw createError(400, 'Student address is required.');
//   }

//   if (!qualification) {
//     throw createError(400, 'Student qualification is required.');
//   }

//   if (
//     admissionForm.aadhaar_number &&
//     !/^[0-9]{12}$/.test(admissionForm.aadhaar_number)
//   ) {
//     throw createError(400, 'Aadhaar number must contain exactly 12 digits.');
//   }

//   const syntheticEmail = `${phone}@ims.com`;

//   const displayEmail = clean(
//     pick(admissionData.email, enquiry.email),
//     ''
//   ).toLowerCase() || null;

//   const existingUser = await User.findOne({
//     email: syntheticEmail,
//   });

//   if (existingUser) {
//     throw createError(409, 'A student with this phone number already exists.');
//   }

//   const temporaryPassword = crypto.randomBytes(12).toString('base64url');

//   let user;
//   let student;
//   let studentFeeRecords = [];

//   try {
//     // 1. Create student login account
//     user = await User.create({
//       name: fullName,
//       email: syntheticEmail,
//       phone,
//       password: temporaryPassword,
//       role: studentRole._id,
//       is_active: true,
//       must_change_password: true,
//     });

//     // 2. Generate student ID
//     const year = new Date().getFullYear();
//     const studentId = await generateStudentId(year);

//     // 3. Create complete student profile
//     student = await Student.create({
//       student_id: studentId,
//       user_id: user._id,
//       full_name: fullName,
//       dob,
//     //  gender: admissionData.gender || null,
//       phone,
//       email: displayEmail,
//       address,

//       guardian_name:
//         admissionForm.fathers_name ||
//         admissionData.guardian_name ||
//         null,

//       guardian_phone:
//         admissionData.guardian_phone ||
//         admissionForm.contact_details.home_mobile_no ||
//         null,

//       qualification,
//       course_id: course._id,
//       batch_id: null,
//       source_enquiry_id: enquiry._id,
//       admission_form: admissionForm,
//       lifecycle_stage: 'admission',
//       stage_status: 'pending',
//       status: 'active',
//       admitted_on: new Date(),
//       created_by: staffUserId,
//     });

//     // 4. Generate fee records
//     studentFeeRecords = feeComponents.map((component) => ({
//       student_id: student._id,
//       course_id: course._id,
//       fee_component_id: component._id,
//       fee_name: component.name,
//       amount_due: component.amount,
//       amount_paid: 0,
//       due_date: null,
//       required_for_exam: component.required_for_exam,
//       status: 'pending',
//     }));

//     await StudentFee.insertMany(studentFeeRecords);

//     // 5. Create stage history
//     await StudentStageHistory.create({
//       student_id: student._id,
//       from_stage: null,
//       to_stage: 'admission',
//       stage_status: 'pending',
//       changed_by: staffUserId,
//       changed_at: new Date(),
//       remarks: 'Initial admission through enquiry conversion.',
//     });

//     // 6. Mark enquiry converted only after successful creation
//     enquiry.status = 'converted';
//     enquiry.converted_student_id = student._id;
//     await enquiry.save();

//   } catch (err) {
//     // Rollback records created during conversion
//     if (student?._id) {
//       await StudentFee.deleteMany({
//         student_id: student._id,
//       }).catch(() => {});

//       await StudentStageHistory.deleteMany({
//         student_id: student._id,
//       }).catch(() => {});

//       await Student.findByIdAndDelete(student._id).catch(() => {});
//     }

//     if (user?._id) {
//       await User.findByIdAndDelete(user._id).catch(() => {});
//     }

//     throw err;
//   }

//   return {
//     enquiry: {
//       id: enquiry._id,
//       status: enquiry.status,
//       converted_student_id: student._id,
//     },

//     student: {
//       id: student._id,
//       student_id: student.student_id,
//       full_name: student.full_name,
//       email: student.email,
//       course_id: student.course_id,
//       lifecycle_stage: student.lifecycle_stage,
//     },

//     account: {
//       email: syntheticEmail,
//       phone,
//       temporary_password: temporaryPassword,
//       must_change_password: true,
//     },

//     fees_generated: studentFeeRecords.length,
//   };
// };


const mongoose = require('mongoose');
const crypto = require('crypto');

const Enquiry = require('../models/Enquiry');
const User = require('../../auth/models/User');
const Role = require('../../rbac/models/Role');
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

function clean(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return typeof value === 'string' ? value.trim() : value;
}

function pick(...values) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ''
  );
}

function buildAdmissionForm(data, enquiry) {
  const form = data.admission_form || {};
  const postal = form.postal_address || {};
  const permanent = form.permanent_address || {};
  const contact = form.contact_details || {};
  const physical = form.physical_details || {};
  const participation = physical.participation || {};
  const declaration = form.declaration || {};
  const office = form.office_use || {};
  const documents = office.required_documents || {};

  return {
    fathers_name: clean(pick(form.fathers_name, data.fathers_name, enquiry.fathers_name)),
    mothers_name: clean(pick(form.mothers_name, data.mothers_name, enquiry.mothers_name)),
    religion: clean(pick(form.religion, data.religion, enquiry.religion)),
    caste: clean(pick(form.caste, data.caste, enquiry.caste)),
    category: clean(pick(form.category, data.category, enquiry.category)),
    postal_address: {
      address: clean(pick(postal.address, data.postal_address?.address, enquiry.postal_address?.address)),
      pin: clean(pick(postal.pin, data.postal_address?.pin, enquiry.postal_address?.pin)),
    },
    permanent_address: {
      address: clean(pick(permanent.address, data.permanent_address?.address, enquiry.permanent_address?.address)),
      pin: clean(pick(permanent.pin, data.permanent_address?.pin, enquiry.permanent_address?.pin)),
    },
    contact_details: {
      contact_no: clean(pick(contact.contact_no, data.contact_no, enquiry.contact_no, enquiry.phone_tel)),
      mobile_no: clean(pick(contact.mobile_no, data.mobile_no, enquiry.mobile, enquiry.phone)),
      home_mobile_no: clean(pick(contact.home_mobile_no, data.home_mobile_no, enquiry.home_mobile_no)),
    },
    aadhaar_number: clean(form.aadhaar_number, null),
    academic_qualification: form.academic_qualification || data.academic_qualification || enquiry.academic_qualification || [],
    physical_details: {
      blood_group: clean(pick(physical.blood_group)),
      chest: clean(pick(physical.chest, enquiry.chest_cm)),
      height: clean(pick(physical.height, enquiry.height_cm)),
      weight: clean(pick(physical.weight, enquiry.weight_kg)),
      participation: {
        ncc: Boolean(participation.ncc),
        nss: Boolean(participation.nss),
        scout_guide: Boolean(participation.scout_guide),
      },
    },
    images: {
      student_photo: form.images?.student_photo || {},
      student_signature: form.images?.student_signature || {},
      parent_signature: form.images?.parent_signature || {}, 
    },
    declaration: {
      place: clean(declaration.place),
      date: declaration.date || null,
    },
    office_use: {
      required_documents: {
        passport_photographs: Boolean(documents.passport_photographs),
        final_year_marksheet: Boolean(documents.final_year_marksheet),
        degree_certificate: Boolean(documents.degree_certificate),
        leaving_certificate: Boolean(documents.leaving_certificate),
        experience_or_deputation_letter: Boolean(documents.experience_or_deputation_letter),
        domicile_certificate: Boolean(documents.domicile_certificate),
        gap_certificate: Boolean(documents.gap_certificate),
        caste_certificate: Boolean(documents.caste_certificate),
        caste_validity_certificate: Boolean(documents.caste_validity_certificate),
        non_creamy_layer_certificate: Boolean(documents.non_creamy_layer_certificate),
        ssc_marksheet_certificate: Boolean(documents.ssc_marksheet_certificate),
        hsc_marksheet_certificate: Boolean(documents.hsc_marksheet_certificate),
      },
      admission_decision: office.admission_decision || 'pending',
    },
  };
}

async function generateStudentId(year) {
  const key = `student_id_${year}`;
  const counter = await StudentIdCounter.findByIdAndUpdate(
    key,
    { $inc: { sequence: 1 } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
  );

  const studentId = `FSC-${year}-${String(counter.sequence).padStart(4, '0')}`;

  // Safety check to prevent duplicates
  const existingStudent = await Student.findOne({ student_id: studentId }).select('_id');
  if (existingStudent) {
    const latestStudent = await Student.findOne({ student_id: new RegExp(`^FSC-${year}-`) })
      .sort({ student_id: -1 })
      .select('student_id');

    const match = latestStudent?.student_id?.match(/^FSC-\d+-(\d+)$/);
    const latestSequence = match ? Number(match[1]) : 0;

    await StudentIdCounter.findByIdAndUpdate(
      key,
      { $max: { sequence: latestSequence } },
      { returnDocument: 'after' }
    );
    return generateStudentId(year);
  }

  return studentId;
}

exports.convertEnquiryToAdmission = async (enquiryId, admissionData = {}, staffUserId) => {
  if (!mongoose.isValidObjectId(enquiryId)) throw createError(400, 'Invalid enquiry ID.');
  if (!mongoose.isValidObjectId(staffUserId)) throw createError(400, 'Invalid staff user ID.');
  if (!admissionData || typeof admissionData !== 'object' || Array.isArray(admissionData)) throw createError(400, 'Invalid admission data.');

  const enquiry = await Enquiry.findById(enquiryId);
  if (!enquiry) throw createError(404, 'Enquiry not found.');
  if (enquiry.status === 'converted' || enquiry.converted_student_id) throw createError(409, 'This enquiry has already been converted.');
  if (enquiry.status === 'closed') throw createError(400, 'Closed enquiries cannot be converted.');

  // Course Selection
  const selectedCourseId = admissionData.course_id || enquiry.course_interest_id;
  if (!selectedCourseId) throw createError(400, 'Please select a course for admission.');
  if (!mongoose.isValidObjectId(selectedCourseId)) throw createError(400, 'Invalid course ID.');

  const course = await Course.findById(selectedCourseId);
  if (!course || course.status !== 'active') throw createError(400, 'Selected course is not available.');

  // Fee Components
  const feeComponents = await FeeComponent.find({ course_id: course._id, status: 'active' });
  if (!feeComponents.length) throw createError(400, 'No active fee components are configured for this course.');

  // 🚨 FIX: Get Student Role ObjectId
  const studentRole = await Role.findOne({ name: 'student' });
  if (!studentRole) throw createError(500, 'System error: Student role not found in database.');

  // Data Extraction
  const phone = clean(pick(admissionData.phone, admissionData.mobile_no, admissionData.admission_form?.contact_details?.mobile_no, enquiry.mobile, enquiry.phone, enquiry.phone_tel));
  const fullName = clean(pick(admissionData.full_name, enquiry.name));
  
  // 🚨 FIX: Accept both dob and date_of_birth
  const dob = pick(admissionData.dob, admissionData.date_of_birth, enquiry.date_of_birth, enquiry.dob);
  
  const admissionForm = buildAdmissionForm(admissionData, enquiry);
  const postalAddress = admissionForm.postal_address.address;
  const permanentAddress = admissionForm.permanent_address.address;
  const address = clean(pick(admissionData.address, postalAddress, permanentAddress, enquiry.address));
  const qualification = clean(pick(admissionData.qualification, admissionForm.academic_qualification[0]?.examination_passed, enquiry.qualification));

  // Validations
  if (!fullName) throw createError(400, 'Student name is required.');
  if (!phone) throw createError(400, 'Student mobile number is required.');
  if (!dob) throw createError(400, 'Date of birth is required.');
  if (!address) throw createError(400, 'Student address is required.');
  if (!qualification) throw createError(400, 'Student qualification is required.');
  if (admissionForm.aadhaar_number && !/^[0-9]{12}$/.test(admissionForm.aadhaar_number)) throw createError(400, 'Aadhaar number must contain exactly 12 digits.');

  const syntheticEmail = `${phone}@ims.com`;
  const displayEmail = clean(pick(admissionData.email, enquiry.email), '').toLowerCase() || null;

  const existingUser = await User.findOne({ email: syntheticEmail });
  if (existingUser) throw createError(409, 'A student with this phone number already exists.');

  const temporaryPassword = crypto.randomBytes(12).toString('base64url');

  let user;
  let student;
  let studentFeeRecords = [];

  try {
    // 1. Create User
    user = await User.create({
      name: fullName,
      email: syntheticEmail,
      phone,
      password: temporaryPassword,
      role: studentRole._id, // 🚨 Use ObjectId
      is_active: true,
      must_change_password: true,
    });

    // 2. Create Student
    const year = new Date().getFullYear();
    const studentId = await generateStudentId(year);

    student = await Student.create({
      student_id: studentId,
      user_id: user._id,
      full_name: fullName,
      dob,
      phone,
      email: displayEmail,
      address,
      guardian_name: admissionForm.fathers_name || admissionData.guardian_name || null,
      guardian_phone: admissionData.guardian_phone || admissionForm.contact_details.home_mobile_no || null,
      qualification,
      course_id: course._id,
      batch_id: null,
      source_enquiry_id: enquiry._id,
      admission_form: admissionForm,
      lifecycle_stage: 'admission',
      stage_status: 'pending',
      status: 'active',
      admitted_on: new Date(),
      created_by: staffUserId,
    });

    // 3. Create Fees
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

    // 4. Stage History
    await StudentStageHistory.create({
      student_id: student._id,
      from_stage: null,
      to_stage: 'admission',
      stage_status: 'pending',
      changed_by: staffUserId,
      changed_at: new Date(),
      remarks: 'Initial admission through enquiry conversion.',
    });

    // 5. Mark Enquiry Converted
    enquiry.status = 'converted';
    enquiry.converted_student_id = student._id;
    await enquiry.save();

  } catch (err) {
    // Manual Rollback (Replaces transaction crash)
    if (student?._id) {
      await StudentFee.deleteMany({ student_id: student._id }).catch(() => {});
      await StudentStageHistory.deleteMany({ student_id: student._id }).catch(() => {});
      await Student.findByIdAndDelete(student._id).catch(() => {});
    }
    if (user?._id) {
      await User.findByIdAndDelete(user._id).catch(() => {});
    }
    throw err;
  }

  return {
    enquiry: { id: enquiry._id, status: enquiry.status, converted_student_id: student._id },
    student: { id: student._id, student_id: student.student_id, full_name: student.full_name, email: student.email, course_id: student.course_id, lifecycle_stage: student.lifecycle_stage },
    account: { email: syntheticEmail, phone, temporary_password: temporaryPassword, must_change_password: true },
    fees_generated: studentFeeRecords.length,
  };
};