const mongoose = require('mongoose');
const Enquiry = require('../models/Enquiry');
const Course = require('../../courses/models/Course');

exports.createEnquiry = async (enquiryData, userId) => {
  if (enquiryData.course_interest_id) {
    const course = await Course.findById(enquiryData.course_interest_id);

    if (!course) {
      const error = new Error('Selected course was not found.');
      error.statusCode = 404;
      throw error;
    }

    if (course.status !== 'active') {
      const error = new Error('Selected course is inactive.');
      error.statusCode = 400;
      throw error;
    }
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

  if (query.status) {
    filter.status = query.status;
  }

  const courseId = query.course || query.course_interest_id;

  if (courseId) {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      const error = new Error('Invalid course ID.');
      error.statusCode = 400;
      throw error;
    }

    filter.course_interest_id = courseId;
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
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
exports.getEnquirySummary = async () => {
  const statuses = ['new', 'contacted', 'interested', 'converted', 'closed'];

  const counts = await Enquiry.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const summary = {
    total: 0,
    new: 0,
    contacted: 0,
    interested: 0,
    converted: 0,
    closed: 0,
  };

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

  if (!enquiry) {
    const error = new Error('Enquiry not found.');
    error.statusCode = 404;
    throw error;
  }

  return enquiry;
};
exports.updateEnquiry = async (id, updateData) => {
  const enquiry = await Enquiry.findById(id);

  if (!enquiry) {
    const error = new Error('Enquiry not found.');
    error.statusCode = 404;
    throw error;
  }

  if (updateData.course_interest_id) {
    const course = await Course.findById(updateData.course_interest_id);

    if (!course) {
      const error = new Error('Selected course was not found.');
      error.statusCode = 404;
      throw error;
    }

    if (course.status !== 'active') {
      const error = new Error('Selected course is inactive.');
      error.statusCode = 400;
      throw error;
    }
  }

  Object.assign(enquiry, updateData);
  await enquiry.save();

  return enquiry;
};
exports.updateEnquiryStatus = async (id, status) => {
  const enquiry = await Enquiry.findById(id);

  if (!enquiry) {
    const error = new Error('Enquiry not found.');
    error.statusCode = 404;
    throw error;
  }

  if (enquiry.status === 'converted') {
    const error = new Error(
      'Converted enquiries cannot be changed through this endpoint.'
    );
    error.statusCode = 400;
    throw error;
  }

  enquiry.status = status;
  await enquiry.save();

  return enquiry;
};
