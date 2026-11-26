// modules/enquiries/services/groupConcession.service.js
const Enquiry = require('../models/Enquiry');
const Student = require('../../students/models/Student');
const { validateGroupMembers } = require('./validateGroupMembers');

// Search Enquiries (Global - all courses)
async function getEnquiriesForCourse({ search = '', page = 1, limit = 20 } = {}) {
  try {
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Note: This assumes your Enquiry model has "converted_student_id". 
    // If it uses something else, this might return 0 results.
    query.converted_student_id = null;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Enquiry.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Enquiry.countDocuments(query),
    ]);
    
    console.log(`🔍 Found ${items.length} Enquiries for search: "${search}"`);
    return { items, total, page, limit };
  } catch (error) {
    console.error("❌ Error in getEnquiriesForCourse:", error);
    throw error;
  }
}

// Search Students (Global - all courses)
async function searchStudents({ search = '', page = 1, limit = 20 } = {}) {
  try {
    const query = {};
    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { student_id: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Student.find(query)
        .select('full_name student_id course_id phone batch_id')
        .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Student.countDocuments(query),
    ]);
    
    console.log(`🔍 Found ${items.length} Students for search: "${search}"`);
    return { items, total, page, limit };
  } catch (error) {
    console.error("❌ Error in searchStudents:", error);
    throw error;
  }
}

async function previewGroupConcession({ enquiryIds, studentIds, concessionId }) {
  const r = await validateGroupMembers({ enquiryIds, studentIds, concessionId });
  if (!r.valid) return { valid: false, errors: r.errors };
  
  return {
    valid: true,
    concession: {
      _id: r.concession._id,
      name: r.concession.name,
      type: r.concession.type,
      value: r.concession.value,
      min_students: r.concession.min_students,
    },
    totalMembers: r.totalMembers,
    members: [
      ...r.enquiryDocs.map((e) => ({ kind: 'ENQUIRY', id: e._id, name: e.name })),
      ...r.studentDocs.map((s) => ({ kind: 'STUDENT', id: s._id, name: s.full_name })),
    ],
  };
}

module.exports = { getEnquiriesForCourse, searchStudents, previewGroupConcession };