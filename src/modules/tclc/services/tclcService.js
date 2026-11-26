// const TcLc = require('../models/TcLc');
// const Student = require('../../students/models/Student');
// const StudentFee = require('../../fees/models/StudentFee');
// const Sequence = require('../../courses/models/Sequence');
// const auditService = require('../../audit/services/auditService');
// const { getIp } = require('../../audit/utils/getIp');
// const PDFDocument = require('pdfkit');

// // ==========================================================
// // HELPER: Eligibility check (fixed fee logic)
// // ==========================================================
// const runEligibilityChecks = async (studentId, type) => {
//   const student = await Student.findById(studentId).populate('course_id', 'name');

//   if (!student) {
//     throw { statusCode: 404, message: 'Student not found' };
//   }

//   // ✅ Convert to uppercase and trim to prevent spacing/case issues
//   const safeType = String(type).trim().toUpperCase();

//   if (!['TC', 'LC'].includes(safeType)) {
//     throw { statusCode: 400, message: 'Type must be TC or LC' };
//   }

//   let isEligible = true;
//   const notes = [];

//   // Check 1: Pending fees
//   const pendingFees = await StudentFee.find({
//     student_id: studentId,
//     status: { $ne: 'paid' },
//   });

//   if (pendingFees.length > 0) {
//     const totalDue = pendingFees.reduce((sum, fee) => {
//       const balance = Number(fee.amount_due || 0) - Number(fee.amount_paid || 0);
//       return sum + (balance > 0 ? balance : 0);
//     }, 0);

//     if (totalDue > 0) {
//       isEligible = false;
//       notes.push(`Pending fees: ₹${totalDue.toFixed(2)} (${pendingFees.length} component(s))`);
//     }
//   }

//   // Check 2: Already has an approved or issued certificate OF THE SAME TYPE
//   const existingIssued = await TcLc.findOne({
//     student_id: studentId,
//     type: safeType, // ✅ Only check if they already have this specific type
//     status: { $in: ['approved', 'issued'] },
//   });

//   if (existingIssued) {
//     isEligible = false;
//     notes.push(`A certificate (${existingIssued.type}) is already issued for this student.`);
//   }

//   return { isEligible, notes, student };
// };

// // ==========================================================
// // 1. REQUEST TC/LC
// // ==========================================================
// exports.requestTcLc = async (studentId, type, reason, staffId, req) => {
//   // ✅ Convert to uppercase and trim here too
//   const safeType = String(type).trim().toUpperCase();

//   if (!['TC', 'LC'].includes(safeType)) {
//     throw { statusCode: 400, message: 'Type must be TC or LC' };
//   }

//   // ✅ Pass safeType to the eligibility check
//   const { isEligible, notes } = await runEligibilityChecks(studentId, safeType);

//   if (!isEligible) {
//     throw { statusCode: 400, message: `Cannot request TC/LC. ${notes.join(' ')}` };
//   }

//   // Prevent duplicate active requests
//   const existingRequest = await TcLc.findOne({
//     student_id: studentId,
//     type: safeType, // ✅ Use safeType
//     status: 'requested',
//   });

//   if (existingRequest) {
//     throw { statusCode: 409, message: `A ${safeType} request is already pending for this student.` };
//   }

//   const request = await TcLc.create({
//     student_id: studentId,
//     type: safeType, // ✅ Use safeType
//     reason,
//     requested_by: staffId,
//     status: 'requested',
//     eligibility_note: safeType === 'TC'
//       ? 'Eligible: No dues and student status is left.'
//       : 'Eligible: No dues and course completed.',
//   });

//   // Audit
//   if (req) {
//     await auditService.logAction({
//       userId: staffId,
//       action: 'CREATE',
//       entity: 'TcLc',
//       entityId: request._id,
//       oldValues: null,
//       newValues: { student_id: studentId, type: safeType, reason, status: 'requested' },
//       ip: getIp(req),
//     });
//   }

//   return request;
// };

// // ==========================================================
// // 2. LIST REQUESTS
// // ==========================================================
// exports.getAllTcLcRequests = async (status, type) => {
//   const query = {};
//   if (status) query.status = status;
//   if (type) query.type = type;

//   return await TcLc.find(query)
//     .populate('student_id', 'student_id full_name phone')
//     .populate('requested_by', 'name email')
//     .populate('approved_by', 'name email')
//     .sort({ createdAt: -1 });
// };

// // ==========================================================
// // 3. GET REQUEST DETAILS
// // ==========================================================
// exports.getTcLcRequestById = async (id) => {
//   const request = await TcLc.findById(id)
//     .populate({
//       path: 'student_id',
//       populate: { path: 'course_id', select: 'name' },
//     })
//     .populate('requested_by', 'name email')
//     .populate('approved_by', 'name email');

//   if (!request) throw { statusCode: 404, message: 'Request not found' };
//   return request;
// };

// // ==========================================================
// // 3b. STUDENT: OWN REQUESTS (for APK)
// // ==========================================================
// exports.getMyTcLcRequests = async (userId) => {
//   const student = await Student.findOne({ user_id: userId }).select('_id');
//   if (!student) throw { statusCode: 404, message: 'Student profile not found' };

//   return await TcLc.find({ student_id: student._id })
//     .populate('student_id', 'student_id full_name')
//     .sort({ createdAt: -1 });
// };

// // ==========================================================
// // 4. CHECK ELIGIBILITY (for existing request)
// // ==========================================================
// exports.checkTcLcEligibility = async (requestId) => {
//   const request = await TcLc.findById(requestId);
//   if (!request) throw { statusCode: 404, message: 'Request not found' };

//   const { isEligible, notes } = await runEligibilityChecks(
//     request.student_id,
//     request.type
//   );

//   return {
//     type: request.type,
//     isEligible,
//     reasons: notes.length > 0 ? notes : ['All clear. Eligible for certificate.'],
//   };
// };

// // ==========================================================
// // 4b. CHECK ELIGIBILITY FOR ANY STUDENT (before requesting)
// // ==========================================================
// exports.checkStudentEligibility = async (studentId, type) => {
//   const { isEligible, notes } = await runEligibilityChecks(studentId, type);

//   return {
//     type,
//     isEligible,
//     reasons: notes.length > 0
//       ? notes
//       : ['All clear. Eligible for certificate.'],
//   };
// };

// // ==========================================================
// // 5. APPROVE REQUEST
// // ==========================================================
// exports.approveTcLc = async (requestId, adminId, req) => {
//   const request = await TcLc.findById(requestId);
//   if (!request) throw { statusCode: 404, message: 'Request not found' };
//   if (request.status !== 'requested') {
//     throw { statusCode: 400, message: `Request is already "${request.status}"` };
//   }

//   // Re-check eligibility before approving (fees might have been added since request)
//   const { isEligible, notes } = await runEligibilityChecks(
//     request.student_id,
//     request.type
//   ); 
  
//   if (!isEligible) {
//     throw { statusCode: 400, message: `Cannot approve. ${notes.join(' ')}` };
//   }

//   const year = new Date().getFullYear();
//   const seq = await Sequence.getNextSequence(`${request.type.toLowerCase()}_no_${year}`);
//   const certNo = `${request.type}-${year}-${String(seq).padStart(4, '0')}`;

//   const oldValues = request.toObject();

//   request.status = 'approved';
//   request.certificate_no = certNo;
//   request.approved_by = adminId;
//   request.issue_date = new Date();
//   await request.save();

//   // Audit
//   if (req) {
//     await auditService.logAction({
//       userId: adminId,
//       action: 'UPDATE',
//       entity: 'TcLc',
//       entityId: request._id,
//       oldValues: { status: oldValues.status },
//       newValues: { status: 'approved', certificate_no: certNo },
//       ip: getIp(req),
//     });
//   }

//   return request;
// };

// // ==========================================================
// // 6. REJECT REQUEST
// // ==========================================================
// exports.rejectTcLc = async (requestId, reason, adminId, req) => {
//   const request = await TcLc.findById(requestId);
//   if (!request) throw { statusCode: 404, message: 'Request not found' };
//   if (request.status !== 'requested') {
//     throw { statusCode: 400, message: `Request is already "${request.status}"` };
//   }
//   if (!reason || reason.trim().length < 3) {
//     throw { statusCode: 400, message: 'Rejection reason is required (min 3 chars)' };
//   }

//   const oldValues = request.toObject();

//   request.status = 'rejected';
//   request.rejection_reason = reason.trim();
//   request.eligibility_note = `Rejected: ${reason}`;
//   request.approved_by = adminId;
//   await request.save();

//   // Audit
//   if (req) {
//     await auditService.logAction({
//       userId: adminId,
//       action: 'UPDATE',
//       entity: 'TcLc',
//       entityId: request._id,
//       oldValues: { status: oldValues.status },
//       newValues: { status: 'rejected', rejection_reason: reason },
//       ip: getIp(req),
//     });
//   }

//   return request;
// };

// // ==========================================================
// // 7. GENERATE PDF
// // ==========================================================
// exports.generateTcLcPDF = async (requestId) => {
//   const request = await TcLc.findById(requestId).populate({
//     path: 'student_id',
//     populate: { path: 'course_id', select: 'name' },
//   });

//   if (!request) throw { statusCode: 404, message: 'Request not found' };
//   if (!['approved', 'issued'].includes(request.status)) {
//     throw { statusCode: 400, message: 'Certificate is not approved yet' };
//   }

//   const student = request.student_id;
//   const doc = new PDFDocument({ margin: 50 });

//   // Format full name in Title Case (e.g., Pooja S Gavit)
//   const formattedName = student.full_name.replace(/\w\S*/g, (txt) => 
//     txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
//   );

//   // 1. Conditional Guardian Text
//   // If guardian_name exists, add "son/daughter of [Name]." Otherwise, leave it out.
//   let guardianText = '';
//   if (student.guardian_name && student.guardian_name.trim() !== '') {
//     guardianText = `, son/daughter of ${student.guardian_name},`;
//   }

//   // Header
//   doc.fontSize(22).text('Fire & Safety College', { align: 'center' });
//   doc.fontSize(16).text(
//     request.type === 'TC' ? 'Transfer Certificate' : 'Leaving Certificate',
//     { align: 'center', underline: true }
//   );
//   doc.moveDown();
//   doc.fontSize(10).text(`Certificate No: ${request.certificate_no}`, { align: 'right' });
//   doc.moveDown();

//   // Body
//   doc.fontSize(12).text(
//     `This is to certify that Mr./Ms. ${formattedName}, bearing Student ID ${student.student_id}${guardianText} was a bonafide student of this institute.`,
//     { align: 'justify' }
//   );
//   doc.moveDown();
//   doc.text(
//     `He/She was admitted on ${new Date(student.admitted_on).toLocaleDateString()} and has successfully completed the course "${student.course_id?.name || 'N/A'}".`
//   );
//   doc.moveDown();
//   doc.text(
//     'His/Her conduct and character during the period of study were found to be satisfactory.'
//   );
//   doc.moveDown();
//   doc.text(`Reason for leaving: ${request.reason}`);
//   doc.moveDown(3);

//   // Footer (Static Wording for Date)
//   doc.text('Date of Issue: ___________________', { align: 'left' });
//   doc.text('Principal / Authorized Signatory', 400, 650, { align: 'right' });

//   // End the document
//   doc.end(); 

//   return doc;
// };





const TcLc = require('../models/TcLc');
const Student = require('../../students/models/Student');
const StudentFee = require('../../fees/models/StudentFee');
const Sequence = require('../../courses/models/Sequence');
const auditService = require('../../audit/services/auditService');
const { getIp } = require('../../audit/utils/getIp');
const PDFDocument = require('pdfkit');

// ==========================================================
// HELPER: Eligibility check (fixed fee logic)
// ==========================================================
const runEligibilityChecks = async (studentId, type) => {
  const student = await Student.findById(studentId).populate('course_id', 'name');

  if (!student) {
    throw { statusCode: 404, message: 'Student not found' };
  }

  const safeType = String(type).trim().toUpperCase();

  if (!['TC', 'LC'].includes(safeType)) {
    throw { statusCode: 400, message: 'Type must be TC or LC' };
  }

  let isEligible = true;
  const notes = [];

  // Check 1: Pending fees
  const pendingFees = await StudentFee.find({
    student_id: studentId,
    status: { $ne: 'paid' },
  });

  if (pendingFees.length > 0) {
    const totalDue = pendingFees.reduce((sum, fee) => {
      const balance = Number(fee.amount_due || 0) - Number(fee.amount_paid || 0);
      return sum + (balance > 0 ? balance : 0);
    }, 0);

    if (totalDue > 0) {
      isEligible = false;
      notes.push(`Pending fees: ₹${totalDue.toFixed(2)} (${pendingFees.length} component(s))`);
    }
  }

  // Check 2: Already has an approved or issued certificate OF THE SAME TYPE
  const existingIssued = await TcLc.findOne({
    student_id: studentId,
    type: safeType,
    status: { $in: ['approved', 'issued'] },
  });

  if (existingIssued) {
    isEligible = false;
    notes.push(`A certificate (${existingIssued.type}) is already issued for this student.`);
  }

  return { isEligible, notes, student };
};

// ==========================================================
// 1. REQUEST TC/LC
// ==========================================================
exports.requestTcLc = async (
  studentId,
  type,
  reason,
  staffId,
  req,
  certificateDetails = {}
) => {

  const safeType = String(type).trim().toUpperCase();

  if (!['TC', 'LC'].includes(safeType)) {
    throw {
      statusCode: 400,
      message: 'Type must be TC or LC'
    };
  }

  const { isEligible, notes } =
    await runEligibilityChecks(studentId, safeType);

  if (!isEligible) {
    throw {
      statusCode: 400,
      message: `Cannot request ${safeType}. ${notes.join(' ')}`
    };
  }

  const existingRequest = await TcLc.findOne({
    student_id: studentId,
    type: safeType,
    status: 'requested'
  });

  if (existingRequest) {
    throw {
      statusCode: 409,
      message: `A ${safeType} request is already pending`
    };
  }

  const request = await TcLc.create({
    student_id: studentId,
    type: safeType,
    reason,
    certificate_details: certificateDetails,
    requested_by: staffId,
    status: 'requested',

    eligibility_note: safeType === 'TC'
      ? 'Eligible: No dues and student status is left.'
      : 'Eligible: No dues and course completed.'
  });

  if (req) {
    await auditService.logAction({
      userId: staffId,
      action: 'CREATE',
      entity: 'TcLc',
      entityId: request._id,
      oldValues: null,
      newValues: {
        student_id: studentId,
        type: safeType,
        reason,
        status: 'requested'
      },
      ip: getIp(req)
    });
  }

  return request;
};

// ==========================================================
// 2. LIST REQUESTS (UPDATED FOR PAGINATION)
// ==========================================================
exports.getAllTcLcRequests = async (query = {}) => {
  const filter = {};

  // Filters
  if (query.status) filter.status = query.status;
  if (query.type) filter.type = String(query.type).toUpperCase();
  
  if (query.search || query.q) {
    const term = (query.search || query.q).trim();
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Search by certificate number or student name/ID (requires aggregation or specific query structure)
    // For simplicity, we search by certificate_no here.
    filter.certificate_no = { $regex: escaped, $options: 'i' };
  }

  // Pagination (Default 10 per page)
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    TcLc.find(filter)
      .populate('student_id', 'student_id full_name phone')
      .populate('requested_by', 'name email')
      .populate('approved_by', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    TcLc.countDocuments(filter),
  ]);

  return {
    requests,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

// ==========================================================
// 3. GET REQUEST DETAILS
// ==========================================================
exports.getTcLcRequestById = async (id) => {
  const request = await TcLc.findById(id)
    .populate({
      path: 'student_id',
      populate: { path: 'course_id', select: 'name' },
    })
    .populate('requested_by', 'name email')
    .populate('approved_by', 'name email');

  if (!request) throw { statusCode: 404, message: 'Request not found' };
  return request;
};

// ==========================================================
// 3b. STUDENT: OWN REQUESTS (for APK)
// ==========================================================
exports.getMyTcLcRequests = async (userId) => {
  const student = await Student.findOne({ user_id: userId }).select('_id');
  if (!student) throw { statusCode: 404, message: 'Student profile not found' };

  return await TcLc.find({ student_id: student._id })
    .populate('student_id', 'student_id full_name')
    .sort({ createdAt: -1 });
};

// ==========================================================
// 4. CHECK ELIGIBILITY (for existing request)
// ==========================================================
exports.checkTcLcEligibility = async (requestId) => {
  const request = await TcLc.findById(requestId);
  if (!request) throw { statusCode: 404, message: 'Request not found' };

  const { isEligible, notes } = await runEligibilityChecks(
    request.student_id,
    request.type
  );

  return {
    type: request.type,
    isEligible,
    reasons: notes.length > 0 ? notes : ['All clear. Eligible for certificate.'],
  };
};

// ==========================================================
// 4b. CHECK ELIGIBILITY FOR ANY STUDENT (before requesting)
// ==========================================================
exports.checkStudentEligibility = async (studentId, type) => {
  const { isEligible, notes } = await runEligibilityChecks(studentId, type);

  return {
    type,
    isEligible,
    reasons: notes.length > 0
      ? notes
      : ['All clear. Eligible for certificate.'],
  };
};

// ==========================================================
// 5. APPROVE REQUEST
// ==========================================================
exports.approveTcLc = async (requestId, adminId, req) => {
  const request = await TcLc.findById(requestId);
  if (!request) throw { statusCode: 404, message: 'Request not found' };
  if (request.status !== 'requested') {
    throw { statusCode: 400, message: `Request is already "${request.status}"` };
  }

  const { isEligible, notes } = await runEligibilityChecks(
    request.student_id,
    request.type
  ); 
  
  if (!isEligible) {
    throw { statusCode: 400, message: `Cannot approve. ${notes.join(' ')}` };
  }

  const year = new Date().getFullYear();
  const seq = await Sequence.getNextSequence(`${request.type.toLowerCase()}_no_${year}`);
  const certNo = `${request.type}-${year}-${String(seq).padStart(4, '0')}`;

  const oldValues = request.toObject();

  request.status = 'approved';
  request.certificate_no = certNo;
  request.approved_by = adminId;
  request.issue_date = new Date();
  await request.save();

  if (req) {
    await auditService.logAction({
      userId: adminId,
      action: 'UPDATE',
      entity: 'TcLc',
      entityId: request._id,
      oldValues: { status: oldValues.status },
      newValues: { status: 'approved', certificate_no: certNo },
      ip: getIp(req),
    });
  }

  return request;
};

// ==========================================================
// 6. REJECT REQUEST
// ==========================================================
exports.rejectTcLc = async (requestId, reason, adminId, req) => {
  const request = await TcLc.findById(requestId);
  if (!request) throw { statusCode: 404, message: 'Request not found' };
  if (request.status !== 'requested') {
    throw { statusCode: 400, message: `Request is already "${request.status}"` };
  }
  if (!reason || reason.trim().length < 3) {
    throw { statusCode: 400, message: 'Rejection reason is required (min 3 chars)' };
  }

  const oldValues = request.toObject();

  request.status = 'rejected';
  request.rejection_reason = reason.trim();
  request.eligibility_note = `Rejected: ${reason}`;
  request.approved_by = adminId;
  await request.save();

  if (req) {
    await auditService.logAction({
      userId: adminId,
      action: 'UPDATE',
      entity: 'TcLc',
      entityId: request._id,
      oldValues: { status: oldValues.status },
      newValues: { status: 'rejected', rejection_reason: reason },
      ip: getIp(req),
    });
  }

  return request;
};

// ==========================================================
// 7. GENERATE PDF
// ==========================================================
exports.generateTcLcPDF = async (requestId) => {

  const request = await TcLc.findById(requestId).populate({
    path: 'student_id',
    populate: {
      path: 'course_id',
      select: 'name'
    }
  });

  if (!request) {
    throw {
      statusCode: 404,
      message: 'Request not found'
    };
  }

  if (!['approved', 'issued'].includes(request.status)) {
    throw {
      statusCode: 400,
      message: 'Certificate is not approved yet'
    };
  }

  const student = request.student_id;
  const details = request.certificate_details || {};

  const doc = new PDFDocument({
    size: 'A4',
    margins: {
      top: 35,
      bottom: 35,
      left: 45,
      right: 45
    }
  });

  const left = 45;
  const right = 550;
  const labelX = 55;
  const valueX = 360;

  // Date formatting
  const formatDate = (value) => {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString('en-IN');
  };

  // Draw certificate header
  doc.font('Helvetica-Bold')
    .fontSize(14)
    .text("G.G. Foundation's", left, 35, {
      align: 'center'
    });

  doc.fontSize(17)
    .text('Sahyadri College of Fire Engineering', {
      align: 'center'
    });

  doc.fontSize(15)
    .text('and Safety Management', {
      align: 'center'
    });

  doc.font('Helvetica')
    .fontSize(8)
    .text(
      'Recognised by Govt. of Maharashtra and Affiliated to Maharashtra State Board of Technical Education, Mumbai',
      {
        align: 'center'
      }
    );

  doc.text(
    'Address: Plot No. 704, Near Namdhari Seeds, Bafna Warehouse Road, Nashik - 422003',
    {
      align: 'center'
    }
  );

  doc.text(
    'Tel: 0253 2590401 | Email: info@sahyadrieducation.org | Web: sahyadrieducation.org',
    {
      align: 'center'
    }
  );

  doc.moveTo(left, 125)
    .lineTo(right, 125)
    .stroke();

  // Certificate title
  const certificateTitle =
    request.type === 'LC'
      ? 'LEAVING CERTIFICATE'
      : 'TRANSFER CERTIFICATE';

  doc.font('Helvetica-Bold')
    .fontSize(19)
    .text(certificateTitle, left, 140, {
      align: 'center'
    });

  doc.fontSize(10)
    .text(
      `Sr. No.: ${request.certificate_no || ''}`,
      420,
      143
    );

  doc.font('Helvetica')
    .fontSize(8)
    .text(
      'No change in any entry in this certificate shall be made except by the authority issuing it.',
      left,
      175,
      {
        align: 'center'
      }
    );

  // Register and enrollment number
  doc.fontSize(10)
    .text(`Register No.: ${details.registerNo || ''}`, left, 210);

  doc.text(
    `Enrollment No.: ${details.enrollmentNo || ''}`,
    330,
    210
  );

  // Certificate fields
  const fields = [
    [
      '1) Name of the Candidate (in Full)',
      student.full_name || ''
    ],
    [
      '2) Caste and Sub-Caste',
      details.caste || ''
    ],
    [
      '3) Nationality',
      details.nationality || 'Indian'
    ],
    [
      '4) Place of Birth',
      details.placeOfBirth || ''
    ],
    [
      '5) Date of Birth',
      `${formatDate(details.dateOfBirth)} ${details.dateOfBirthWords ? '(' + details.dateOfBirthWords + ')' : ''}`
    ],
    [
      '6) Last School / College Attended',
      details.lastCollegeAttended || ''
    ],
    [
      '7) Date of Admission',
      formatDate(details.dateOfAdmission || student.admitted_on)
    ],
    [
      '8) Progress',
      details.progress || ''
    ],
    [
      '9) Conduct',
      details.conduct || ''
    ],
    [
      '10) Date of Leaving College',
      formatDate(details.dateOfLeaving)
    ],
    [
      '11) Course & Year in Which Studying and Since When',
      details.courseAndYear || student.course_id?.name || ''
    ],
    [
      '12) Reason for Leaving the College',
      details.reasonForLeaving || request.reason || ''
    ],
    [
      '13) Remarks',
      details.remarks || ''
    ]
  ];

  let y = 245;

  fields.forEach(([label, value], index) => {

    const labelHeight = doc.heightOfString(label, {
      width: 270,
      fontSize: 10
    });

    const valueHeight = doc.heightOfString(String(value), {
      width: 180,
      fontSize: 10
    });

    const rowHeight = Math.max(
      28,
      labelHeight,
      valueHeight
    );

    doc.font('Helvetica')
      .fontSize(10)
      .text(label, labelX, y, {
        width: 270
      });

    doc.text(':', 335, y);

    doc.text(String(value), valueX, y, {
      width: 180
    });

    doc.moveTo(350, y + rowHeight - 5)
      .lineTo(right, y + rowHeight - 5)
      .strokeColor('#555555')
      .lineWidth(0.5)
      .stroke();

    y += rowHeight + 5;
  });

  // Certification
  y += 15;

  doc.fontSize(10)
    .text(
      'Certified that above information is in accordance with the college Register.',
      left,
      y
    );

  // Footer
  y += 60;

  doc.text(
    `Date: ${formatDate(request.issue_date || new Date())}`,
    left,
    y
  );

  doc.text('Clerk', 285, y + 35, {
    align: 'center'
  });

  doc.text('Principal', 475, y + 35, {
    align: 'center'
  });

  doc.end();

  return doc;
};