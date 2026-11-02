const TcLc = require('../models/TcLc');
const Student = require('../../students/models/Student');
const StudentFee = require('../../fees/models/StudentFee');
const Sequence = require('../../courses/models/Sequence');
const PDFDocument = require('pdfkit');

// HELPER: Reusable Eligibility Logic
const runEligibilityChecks = async (studentId) => {
  const student = await Student.findById(studentId).populate('course_id', 'name');
  if (!student) throw { statusCode: 404, message: 'Student not found' };

  let isEligible = true;
  let notes = [];

  // Check 1: Pending Fees (⚠️ THIS IS WHERE YOUR FEES BUG BREAKS THINGS)
  const pendingFees = await StudentFee.find({ student_id: studentId, status: { $ne: 'paid' } });
  if (pendingFees.length > 0) {
    isEligible = false;
    const totalDue = pendingFees.reduce((sum, fee) => sum + (fee.pending_amount || 0), 0);
    notes.push(`Pending fees: ₹${totalDue}`);
  }

  // Check 2: Course Completion
  if (student.status !== 'completed') {
    isEligible = false;
    notes.push('Course status is not marked as completed.');
  }

  return { isEligible, notes, student };
};

// 1. Request TC/LC (Now uses helper)
exports.requestTcLc = async (studentId, type, reason, staffId) => {
  const { isEligible, notes } = await runEligibilityChecks(studentId);

  if (!isEligible) {
    throw { statusCode: 400, message: `Cannot request TC/LC. ${notes.join(' ')}` };
  }

  const request = await TcLc.create({
    student_id: studentId,
    type,
    reason,
    requested_by: staffId,
    eligibility_note: 'Eligible: No dues and course completed.'
  });

  return request;
};

// NEW: 2. List Requests
exports.getAllTcLcRequests = async (status, type) => {
  const query = {};
  if (status) query.status = status;
  if (type) query.type = type;

  return await TcLc.find(query)
    .populate('student_id', 'full_name student_id')
    .sort({ createdAt: -1 });
};

// NEW: 3. Get Request Details
exports.getTcLcRequestById = async (id) => {
  const request = await TcLc.findById(id)
    .populate({
      path: 'student_id',
      populate: { path: 'course_id', select: 'name' }
    });
  if (!request) throw { statusCode: 404, message: 'Request not found' };
  return request;
};

// NEW: 4. Check Eligibility (For existing requests)
exports.checkTcLcEligibility = async (requestId) => {
  const request = await TcLc.findById(requestId);
  if (!request) throw { statusCode: 404, message: 'Request not found' };

  const { isEligible, notes } = await runEligibilityChecks(request.student_id);
  
  return {
    type: request.type,
    isEligible,
    reasons: notes.length > 0 ? notes : ['All clear. Eligible for certificate.']
  };
};

// 5. Approve Request (Unchanged)
exports.approveTcLc = async (requestId, adminId) => {
  const request = await TcLc.findById(requestId);
  if (!request) throw { statusCode: 404, message: 'Request not found' };
  if (request.status !== 'requested') throw { statusCode: 400, message: 'Request is already processed' };

  const year = new Date().getFullYear();
  const seq = await Sequence.getNextSequence(`${request.type.toLowerCase()}_no_${year}`);
  const certNo = `${request.type}-${year}-${String(seq).padStart(4, '0')}`;

  request.status = 'approved';
  request.certificate_no = certNo;
  request.approved_by = adminId;
  request.issue_date = new Date();
  await request.save();

  await Student.findByIdAndUpdate(request.student_id, { status: 'tc_issued' });

  return request;
};

// 6. Reject Request (Unchanged)
exports.rejectTcLc = async (requestId, reason, adminId) => {
  const request = await TcLc.findByIdAndUpdate(
    requestId,
    { 
      status: 'rejected', 
      eligibility_note: `Rejected: ${reason}`,
      approved_by: adminId 
    },
    { returnDocument: 'after' } // Fixed: Mongoose 6+ uses returnDocument
  );
  if (!request) throw { statusCode: 404, message: 'Request not found' };
  return request;
};

// 7. Generate PDF (Unchanged)
exports.generateTcLcPDF = async (requestId) => {
  const request = await TcLc.findById(requestId)
    .populate({
      path: 'student_id',
      populate: { path: 'course_id', select: 'name' }
    });

  if (!request) throw { statusCode: 404, message: 'Request not found' };
  if (request.status !== 'approved') throw { statusCode: 400, message: 'Certificate is not approved yet' };

  const student = request.student_id;
  const doc = new PDFDocument({ margin: 50 });

  doc.fontSize(22).text('Fire & Safety College', { align: 'center' });
  doc.fontSize(16).text(`${request.type === 'TC' ? 'Transfer Certificate' : 'Leaving Certificate'}`, { align: 'center', underline: true });
  doc.moveDown();
  doc.fontSize(10).text(`Certificate No: ${request.certificate_no}`, { align: 'right' });
  doc.moveDown();

  doc.fontSize(12).text(`This is to certify that Mr./Ms. ${student.full_name}, bearing Student ID ${student.student_id}, son/daughter of ${student.guardian_name || 'N/A'}, was a bonafide student of this institute.`, { align: 'justify' });
  doc.moveDown();
  doc.text(`He/She was admitted on ${new Date(student.admitted_on).toLocaleDateString()} and has successfully completed the course "${student.course_id.name}".`);
  doc.moveDown();
  doc.text(`His/Her conduct and character during the period of study were found to be satisfactory.`);
  doc.moveDown();
  doc.text(`Reason for leaving: ${request.reason}`);
  doc.moveDown(2);

  doc.text(`Date of Issue: ${new Date(request.issue_date).toLocaleDateString()}`, { align: 'left' });
  doc.text(`Principal / Authorized Signatory`, 400, 650, { align: 'right' });

  return doc;
};