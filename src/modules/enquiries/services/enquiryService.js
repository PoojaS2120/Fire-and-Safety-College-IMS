const mongoose = require('mongoose');
const Enquiry = require('../models/Enquiry');
const Course = require('../../courses/models/Course');

function createError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

exports.createEnquiry = async (enquiryData, userId) => {
  if (enquiryData.course_interest_id) {
    const course = await Course.findById(enquiryData.course_interest_id);
    if (!course) throw createError(404, 'Selected course was not found.');
    if (course.status !== 'active') throw createError(400, 'Selected course is inactive.');
  }

  return Enquiry.create({
    ...enquiryData,
    course_interest_id: enquiryData.course_interest_id || null,
    created_by: userId,
    status: 'new',
  });
};

exports.getEnquiries = async (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const filter = {};

  if (query.status) filter.status = query.status;

  const courseId = query.course || query.course_interest_id;
  if (courseId) {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw createError(400, 'Invalid course ID.');
    }
    filter.course_interest_id = courseId;
  }

  if (query.search || query.q) {
    const term = (query.search || query.q).trim();
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { phone: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
    ];
  }

  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) {
      const fromDate = new Date(query.from);
      fromDate.setHours(0, 0, 0, 0);
      filter.createdAt.$gte = fromDate;
    }
    if (query.to) {
      const toDate = new Date(query.to);
      toDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = toDate;
    }
  }

  const [enquiries, total] = await Promise.all([
    Enquiry.find(filter)
      .populate('course_interest_id', 'name duration')
      .populate('created_by', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Enquiry.countDocuments(filter),
  ]);

  return {
    enquiries,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

exports.getEnquirySummary = async () => {
  const statuses = ['new', 'contacted', 'interested', 'converted', 'closed'];
  const counts = await Enquiry.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const summary = { total: 0, new: 0, contacted: 0, interested: 0, converted: 0, closed: 0 };
  counts.forEach(({ _id, count }) => {
    if (statuses.includes(_id)) {
      summary[_id] = count;
      summary.total += count;
    }
  });
  return summary;
};

exports.getEnquiryById = async (id) => {
  const enquiry = await Enquiry.findById(id)
    .populate('course_interest_id', 'name duration description')
    .populate('created_by', 'name email role')
    .lean();
  if (!enquiry) throw createError(404, 'Enquiry not found.');
  return enquiry;
};

exports.updateEnquiry = async (id, updateData) => {
  const enquiry = await Enquiry.findById(id);
  if (!enquiry) throw createError(404, 'Enquiry not found.');

  if (enquiry.status === 'converted') {
    throw createError(400, 'Converted enquiries cannot be edited. Update the student profile instead.');
  }

  if (updateData.course_interest_id) {
    const course = await Course.findById(updateData.course_interest_id);
    if (!course) throw createError(404, 'Selected course was not found.');
    if (course.status !== 'active') throw createError(400, 'Selected course is inactive.');
  }

  Object.assign(enquiry, updateData);
  await enquiry.save();
  return enquiry;
};

exports.updateEnquiryStatus = async (id, status) => {
  const enquiry = await Enquiry.findById(id);
  if (!enquiry) throw createError(404, 'Enquiry not found.');
  if (enquiry.status === 'converted') {
    throw createError(400, 'Converted enquiries cannot be changed through this endpoint.');
  }
  enquiry.status = status;
  await enquiry.save();
  return enquiry;
};

// ==========================================================
// NEW: DELETE ENQUIRY
// ==========================================================
exports.deleteEnquiry = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError(400, 'Invalid enquiry ID format.');
  }

  const enquiry = await Enquiry.findById(id);
  if (!enquiry) {
    throw createError(404, 'Enquiry not found.');
  }

  // Safety Check: Protect converted enquiries from being deleted
  if (enquiry.status === 'converted') {
    throw createError(400, 'Cannot delete an enquiry that has already been converted to a student.');
  }

  await Enquiry.findByIdAndDelete(id);

  return { message: 'Enquiry deleted successfully.' };
};