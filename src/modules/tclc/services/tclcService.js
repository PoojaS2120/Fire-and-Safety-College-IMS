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
const runEligibilityChecks = async (studentId) => {
  const student = await Student.findById(studentId).populate('course_id', 'name');
  if (!student) throw { statusCode: 404, message: 'Student not found' };

  let isEligible = true;
  const notes = [];

  // Check 1: Pending fees (use amount_due - amount_paid, since StudentFee has no pending_amount)
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

  // Check 2: Course completion
  if (student.status !== 'completed') {
    isEligible = false;
    notes.push(`Course status is "${student.status}". Must be "completed" for TC/LC.`);
  }

  // Check 3: Already has issued TC/LC
  const existingIssued = await TcLc.findOne({
    student_id: studentId,
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
exports.requestTcLc = async (studentId, type, reason, staffId, req) => {
  if (!['TC', 'LC'].includes(type)) {
    throw { statusCode: 400, message: 'Type must be TC or LC' };
  }

  const { isEligible, notes } = await runEligibilityChecks(studentId);

  if (!isEligible) {
    throw { statusCode: 400, message: `Cannot request TC/LC. ${notes.join(' ')}` };
  }

  // Prevent duplicate active requests
  const existingRequest = await TcLc.findOne({
    student_id: studentId,
    type,
    status: 'requested',
  });

  if (existingRequest) {
    throw { statusCode: 409, message: `A ${type} request is already pending for this student.` };
  }

  const request = await TcLc.create({
    student_id: studentId,
    type,
    reason,
    requested_by: staffId,
    status: 'requested',
    eligibility_note: 'Eligible: No dues and course completed.',
  });

  // Audit
  if (req) {
    await auditService.logAction({
      userId: staffId,
      action: 'CREATE',
      entity: 'TcLc',
      entityId: request._id,
      oldValues: null,
      newValues: { student_id: studentId, type, reason, status: 'requested' },
      ip: getIp(req),
    });
  }

  return request;
};

// ==========================================================
// 2. LIST REQUESTS
// ==========================================================
exports.getAllTcLcRequests = async (status, type) => {
  const query = {};
  if (status) query.status = status;
  if (type) query.type = type;

  return await TcLc.find(query)
    .populate('student_id', 'student_id full_name phone')
    .populate('requested_by', 'name email')
    .populate('approved_by', 'name email')
    .sort({ createdAt: -1 });
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

  const { isEligible, notes } = await runEligibilityChecks(request.student_id);

  return {
    type: request.type,
    isEligible,
    reasons: notes.length > 0 ? notes : ['All clear. Eligible for certificate.'],
  };
};

// ==========================================================
// 4b. CHECK ELIGIBILITY FOR ANY STUDENT (before requesting)
// ==========================================================
exports.checkStudentEligibility = async (studentId) => {
  const { isEligible, notes } = await runEligibilityChecks(studentId);
  return {
    isEligible,
    reasons: notes.length > 0 ? notes : ['All clear. Eligible for certificate.'],
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

  // Re-check eligibility before approving (fees might have been added since request)
  const { isEligible, notes } = await runEligibilityChecks(request.student_id);
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

  // Update student status
  await Student.findByIdAndUpdate(request.student_id, { status: 'tc_issued' });

  // Audit
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

  // Audit
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
    populate: { path: 'course_id', select: 'name' },
  });

  if (!request) throw { statusCode: 404, message: 'Request not found' };
  if (!['approved', 'issued'].includes(request.status)) {
    throw { statusCode: 400, message: 'Certificate is not approved yet' };
  }

  const student = request.student_id;
  const doc = new PDFDocument({ margin: 50 });

  // Format full name in Title Case (e.g., Pooja S Gavit)
  const formattedName = student.full_name.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );

  // 1. Conditional Guardian Text
  // If guardian_name exists, add "son/daughter of [Name]." Otherwise, leave it out.
  let guardianText = '';
  if (student.guardian_name && student.guardian_name.trim() !== '') {
    guardianText = `, son/daughter of ${student.guardian_name},`;
  }

  // Header
  doc.fontSize(22).text('Fire & Safety College', { align: 'center' });
  doc.fontSize(16).text(
    request.type === 'TC' ? 'Transfer Certificate' : 'Leaving Certificate',
    { align: 'center', underline: true }
  );
  doc.moveDown();
  doc.fontSize(10).text(`Certificate No: ${request.certificate_no}`, { align: 'right' });
  doc.moveDown();

  // Body
  doc.fontSize(12).text(
    `This is to certify that Mr./Ms. ${formattedName}, bearing Student ID ${student.student_id}${guardianText} was a bonafide student of this institute.`,
    { align: 'justify' }
  );
  doc.moveDown();
  doc.text(
    `He/She was admitted on ${new Date(student.admitted_on).toLocaleDateString()} and has successfully completed the course "${student.course_id?.name || 'N/A'}".`
  );
  doc.moveDown();
  doc.text(
    'His/Her conduct and character during the period of study were found to be satisfactory.'
  );
  doc.moveDown();
  doc.text(`Reason for leaving: ${request.reason}`);
  doc.moveDown(3);

  // Footer (Static Wording for Date)
  doc.text('Date of Issue: ___________________', { align: 'left' });
  doc.text('Principal / Authorized Signatory', 400, 650, { align: 'right' });

  // End the document
  doc.end(); 

  return doc;
};