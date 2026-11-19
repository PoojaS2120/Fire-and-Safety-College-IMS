
const mongoose = require('mongoose');
const Enquiry = require('../models/Enquiry');
const Course = require('../../courses/models/Course');

function createError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// CREATE ENQUIRY
exports.createEnquiry = async (enquiryData, userId) => {
  if (enquiryData.course_interest_id) {
    const course = await Course.findById(enquiryData.course_interest_id);

    if (!course) {
      throw createError(404, 'Selected course was not found.');
    }

    if (course.status !== 'active') {
      throw createError(400, 'Selected course is inactive.');
    }
  }

  // Maintain the legacy phone field for existing functionality.
  const primaryPhone =
    enquiryData.phone ||
    enquiryData.mobile ||
    enquiryData.phone_tel ||
    null;

  return Enquiry.create({
    ...enquiryData,

    phone: primaryPhone,

    course_interest_id: enquiryData.course_interest_id || null,

    created_by: userId,

    status: 'new',
  });
};

// GET ENQUIRIES
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
      { phone_tel: { $regex: escaped, $options: 'i' } },
      { mobile: { $regex: escaped, $options: 'i' } },
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
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ENQUIRY SUMMARY
exports.getEnquirySummary = async () => {
  const statuses = [
    'new',
    'contacted',
    'interested',
    'converted',
    'closed',
  ];

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

// GET ENQUIRY BY ID
exports.getEnquiryById = async (id) => {
  const enquiry = await Enquiry.findById(id)
    .populate('course_interest_id', 'name duration description')
    .populate('created_by', 'name email role')
    .lean();

  if (!enquiry) {
    throw createError(404, 'Enquiry not found.');
  }

  return enquiry;
};

// UPDATE ENQUIRY
exports.updateEnquiry = async (id, updateData) => {
  const enquiry = await Enquiry.findById(id);

  if (!enquiry) {
    throw createError(404, 'Enquiry not found.');
  }

  if (enquiry.status === 'converted') {
    throw createError(
      400,
      'Converted enquiries cannot be edited. Update the student profile instead.'
    );
  }

  if (updateData.course_interest_id) {
    const course = await Course.findById(updateData.course_interest_id);

    if (!course) {
      throw createError(404, 'Selected course was not found.');
    }

    if (course.status !== 'active') {
      throw createError(400, 'Selected course is inactive.');
    }
  }

  // Update all supplied fields.
  Object.assign(enquiry, updateData);

  // Keep legacy phone synchronized when contact numbers change.
  const phoneFieldsUpdated =
    Object.prototype.hasOwnProperty.call(updateData, 'phone') ||
    Object.prototype.hasOwnProperty.call(updateData, 'mobile') ||
    Object.prototype.hasOwnProperty.call(updateData, 'phone_tel');

  if (phoneFieldsUpdated) {
    enquiry.phone =
      updateData.phone ||
      enquiry.mobile ||
      enquiry.phone_tel ||
      null;
  }

  await enquiry.save();

  return enquiry;
};

// UPDATE ENQUIRY STATUS
exports.updateEnquiryStatus = async (id, status) => {
  const enquiry = await Enquiry.findById(id);

  if (!enquiry) {
    throw createError(404, 'Enquiry not found.');
  }

  if (enquiry.status === 'converted') {
    throw createError(
      400,
      'Converted enquiries cannot be changed through this endpoint.'
    );
  }

  enquiry.status = status;

  await enquiry.save();

  return enquiry;
};

// DELETE ENQUIRY
exports.deleteEnquiry = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError(400, 'Invalid enquiry ID format.');
  }

  const enquiry = await Enquiry.findById(id);

  if (!enquiry) {
    throw createError(404, 'Enquiry not found.');
  }

  if (enquiry.status === 'converted') {
    throw createError(
      400,
      'Cannot delete an enquiry that has already been converted to a student.'
    );
  }

  await Enquiry.findByIdAndDelete(id);

  return {
    message: 'Enquiry deleted successfully.',
  };
};


// GET ADMISSION PREFILL DATA
// Returns existing enquiry details in the admission form's expected structure.
// This endpoint does not create or modify a Student record.

exports.getAdmissionPrefill = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError(400, 'Invalid enquiry ID format.');
  }

  const enquiry = await Enquiry.findById(id)
    .populate('course_interest_id', 'name duration status')
    .lean();

  if (!enquiry) {
    throw createError(404, 'Enquiry not found.');
  }

  if (enquiry.status === 'converted' || enquiry.converted_student_id) {
    throw createError(409, 'This enquiry has already been converted.');
  }

  if (enquiry.status === 'closed') {
    throw createError(400, 'Closed enquiries cannot be converted to admission.');
  }

  const primaryPhone =
    enquiry.phone || enquiry.mobile || enquiry.phone_tel || '';

  const academicQualifications =
    Array.isArray(enquiry.academic_qualification) &&
    enquiry.academic_qualification.length
      ? enquiry.academic_qualification.map((item) => ({
          examination_passed: item.examination_passed || '',
          school_college: item.school_college || '',
          year_of_passing: item.year_of_passing ?? null,
          board_university: item.board_university || '',
          seat_no: item.seat_no || '',
          marks_out_of: item.marks_out_of ?? null,
          marks_obtained: item.marks_obtained ?? null,
          percentage: item.percentage ?? null,
        }))
      : enquiry.qualification
        ? [{
            examination_passed: enquiry.qualification,
            school_college: '',
            year_of_passing: null,
            board_university: '',
            seat_no: '',
            marks_out_of: null,
            marks_obtained: null,
            percentage: null,
          }]
        : [];

  return {
    enquiry_id: enquiry._id,
    source: 'enquiry',

    full_name: enquiry.name || '',
    dob: enquiry.date_of_birth || enquiry.dob || null,
    gender: enquiry.gender || null,
    qualification: enquiry.qualification || '',

    course_id: enquiry.course_interest_id?._id || null,
    course: enquiry.course_interest_id || null,

    phone: primaryPhone,
    email: enquiry.email || '',
    address: enquiry.postal_address?.address || enquiry.address || '',

    guardian_name: enquiry.fathers_name || '',
    guardian_phone: enquiry.home_mobile_no || '',

    admission_form: {
      fathers_name: enquiry.fathers_name || '',
      mothers_name: enquiry.mothers_name || '',

      religion: enquiry.religion || '',
      caste: enquiry.caste || '',
      category: enquiry.category || '',

      postal_address: {
        address: enquiry.postal_address?.address || enquiry.address || '',
        pin: enquiry.postal_address?.pin || '',
      },

      permanent_address: {
        address: enquiry.permanent_address?.address || '',
        pin: enquiry.permanent_address?.pin || '',
      },

      contact_details: {
        contact_no: enquiry.contact_no || enquiry.phone_tel || '',
        mobile_no: enquiry.mobile || primaryPhone,
        home_mobile_no: enquiry.home_mobile_no || '',
      },

      academic_qualification: academicQualifications,

      physical_details: {
        blood_group: enquiry.blood_group || '',
        chest: enquiry.chest_cm != null ? String(enquiry.chest_cm) : '',
        height: enquiry.height_cm != null ? String(enquiry.height_cm) : '',
        weight: enquiry.weight_kg != null ? String(enquiry.weight_kg) : '',
        participation: {
          ncc: Boolean(enquiry.ncc),
          nss: Boolean(enquiry.nss),
          scout_guide: Boolean(enquiry.scout_guide),
        },
      },

      // These details are collected during admission.
      aadhaar_number: '',

      

      declaration: {
        place: '',
        date: null,
      },

      office_use: {
       required_documents: {
  passport_photographs: false,
  final_year_marksheet: false,
  degree_certificate: false,
  leaving_certificate: false,
  experience_or_deputation_letter: false,
  domicile_certificate: false,
  gap_certificate: false,
  caste_certificate: false,
  caste_validity_certificate: false,
  non_creamy_layer_certificate: false,
  ssc_marksheet_certificate: false,
  hsc_marksheet_certificate: false,
},
        admission_decision: 'pending',
        
      },
    },
  };
};
