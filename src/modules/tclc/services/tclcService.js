const TcLc = require('../models/TcLc');
const Student = require('../../students/models/Student');
const StudentFee = require('../../fees/models/StudentFee');
const Sequence = require('../../courses/models/Sequence');
const PDFDocument = require('pdfkit');

// 1. Request TC/LC & Check Eligibility
exports.requestTcLc = async (studentId, type, reason, staffId) => {
  const student = await Student.findById(studentId).populate('course_id', 'name');
  if (!student) throw { statusCode: 404, message: 'Student not found' };

  // Check 1: Pending Fees
  const pendingFees = await StudentFee.find({ student_id: studentId, status: { $ne: 'paid' } });
  if (pendingFees.length > 0) {
    throw { statusCode: 400, message: 'Cannot request TC/LC. Student has pending fees.' };
  }

  // Check 2: Course Completion
  if (student.status !== 'completed') {
    throw { statusCode: 400, message: 'Cannot request TC/LC. Student status is not marked as completed.' };
  }

  // Create Request
  const request = await TcLc.create({
    student_id: studentId,
    type,
    reason,
    requested_by: staffId,
    eligibility_note: 'Eligible: No dues and course completed.'
  });

  return request;
};

// 2. Approve Request
exports.approveTcLc = async (requestId, adminId) => {
  const request = await TcLc.findById(requestId);
  if (!request) throw { statusCode: 404, message: 'Request not found' };
  if (request.status !== 'requested') throw { statusCode: 400, message: 'Request is already processed' };

  // Generate Certificate Number using Sequence
  const year = new Date().getFullYear();
  const seq = await Sequence.getNextSequence(`${request.type.toLowerCase()}_no_${year}`);
  const certNo = `${request.type}-${year}-${String(seq).padStart(4, '0')}`;

  request.status = 'approved';
  request.certificate_no = certNo;
  request.approved_by = adminId;
  request.issue_date = new Date();
  await request.save();

  // Update Student Status to 'tc_issued'
  await Student.findByIdAndUpdate(request.student_id, { status: 'tc_issued' });

  return request;
};

// 3. Reject Request
exports.rejectTcLc = async (requestId, reason, adminId) => {
  const request = await TcLc.findByIdAndUpdate(
    requestId,
    { 
      status: 'rejected', 
      eligibility_note: `Rejected: ${reason}`,
      approved_by: adminId 
    },
    { returnDocument: 'after' }
  );
  if (!request) throw { statusCode: 404, message: 'Request not found' };
  return request;
};

// 4. Generate PDF
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

  // Header
  doc.fontSize(22).text('Fire & Safety College', { align: 'center' });
  doc.fontSize(16).text(`${request.type === 'TC' ? 'Transfer Certificate' : 'Leaving Certificate'}`, { align: 'center', underline: true });
  doc.moveDown();
  doc.fontSize(10).text(`Certificate No: ${request.certificate_no}`, { align: 'right' });
  doc.moveDown();

  // Body
  doc.fontSize(12).text(`This is to certify that Mr./Ms. ${student.full_name}, bearing Student ID ${student.student_id}, son/daughter of ${student.guardian_name || 'N/A'}, was a bonafide student of this institute.`, { align: 'justify' });
  doc.moveDown();

  doc.text(`He/She was admitted on ${new Date(student.admitted_on).toLocaleDateString()} and has successfully completed the course "${student.course_id.name}".`);
  doc.moveDown();

  doc.text(`His/Her conduct and character during the period of study were found to be satisfactory.`);
  doc.moveDown();

  doc.text(`Reason for leaving: ${request.reason}`);
  doc.moveDown(2);

  // Footer
  doc.text(`Date of Issue: ${new Date(request.issue_date).toLocaleDateString()}`, { align: 'left' });
  doc.text(`Principal / Authorized Signatory`, 400, 650, { align: 'right' });

  return doc;
};