// modules/enquiries/services/validateGroupMembers.js
const Enquiry = require('../models/Enquiry');
const Student = require('../../students/models/Student');
const ConcessionMaster = require('../../fees/models/ConcessionMaster');

async function validateGroupMembers({ enquiryIds = [], studentIds = [], concessionId }) {
  const errors = [];

  // 1. Validate Concession
  const concession = await ConcessionMaster.findById(concessionId).lean();
  if (!concession) return { valid: false, errors: ['Concession not found'] };
  
  if (concession.concession_type !== 'group') {
    errors.push('Selected concession is not a group concession');
  }

  // 2. Validate Group Size
  const minGroupSize = concession.min_students || 1;
  const totalMembers = enquiryIds.length + studentIds.length;
  if (totalMembers < minGroupSize) {
    errors.push(`Minimum ${minGroupSize} members required (got ${totalMembers})`);
  }

  // 3. Fetch and Validate Enquiries
  let enquiryDocs = [];
  if (enquiryIds.length) {
    enquiryDocs = await Enquiry.find({ _id: { $in: enquiryIds } }).lean();
    if (enquiryDocs.length !== enquiryIds.length) errors.push('One or more enquiries not found');
    
    for (const enq of enquiryDocs) {
      // Check if already converted to student
      if (enq.converted_student_id) {
        errors.push(`Enquiry ${enq.name} is already admitted`);
      }
    }
  }

  // 4. Fetch and Validate Students
  let studentDocs = [];
  if (studentIds.length) {
    studentDocs = await Student.find({ _id: { $in: studentIds } }).lean();
    if (studentDocs.length !== studentIds.length) errors.push('One or more students not found');
  }

  return { valid: errors.length === 0, errors, concession, enquiryDocs, studentDocs, totalMembers };
}

module.exports = { validateGroupMembers };