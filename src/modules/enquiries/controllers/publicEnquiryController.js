const enquiryService = require('../services/enquiryService');
const Course = require('../../courses/models/Course');
const { sections } = require('../config/publicEnquiryFormConfig');

const {
  publicCreateEnquirySchema,
} = require('../validations/enquiryValidation');

// GET: Public enquiry form configuration
exports.getPublicEnquiryFormConfig = async (req, res, next) => {
  try {
    const courses = await Course.find({ status: 'active' })
      .select('name duration description')
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        version: 1,
        sections,
        options: {
          courses: courses.map((course) => ({
            value: course._id.toString(),
            label: course.name,
            duration: course.duration,
            description: course.description || '',
          })),
        },
      },
    });
  } catch (error) {
    console.error('[PUBLIC ENQUIRY FORM CONFIG ERROR]:', error);
    next(error);
  }
};

// POST: Submit public enquiry
exports.createPublicEnquiry = async (req, res, next) => {
  try {
    const { error, value } = publicCreateEnquirySchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: false,
      convert: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map((detail) => detail.message).join(', '),
      });
    }

    // Map dob to the model's date_of_birth field
    if (!value.date_of_birth && value.dob) {
      value.date_of_birth = value.dob;
    }

    delete value.dob;

    // Public submissions are always recorded as website enquiries.
    // Ignore any source supplied by the public client.
    value.source = 'website';

    const enquiry = await enquiryService.createEnquiry(value, null);

    console.log('[PUBLIC ENQUIRY] Successfully saved:', enquiry._id);

    return res.status(201).json({
      success: true,
      message: 'Your enquiry has been submitted successfully.',
      data: {
        enquiry_id: enquiry._id,
        name: enquiry.name,
        status: enquiry.status,
      },
    });
  } catch (error) {
    console.error('[PUBLIC ENQUIRY ERROR]:', error);
    next(error);
  }
};