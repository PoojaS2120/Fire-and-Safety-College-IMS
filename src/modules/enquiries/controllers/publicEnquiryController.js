
const enquiryService = require('../services/enquiryService');
const {
  createEnquirySchema,
} = require('../validations/enquiryValidation');

exports.createPublicEnquiry = async (req, res, next) => {
  try {
    const { error, value } = createEnquirySchema.validate(req.body, {
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
    // QR/public submissions are recorded as website enquiries.
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
