const enquiryService = require('../services/enquiryService');
const admissionConversionService = require('../services/admissionConversionService');
const {
  createEnquirySchema,
  updateEnquirySchema,
  updateEnquiryStatusSchema,
  convertEnquirySchema,
} = require('../validations/enquiryValidation');
exports.createEnquiry = async (req, res, next) => {
  try {
    const { error, value } = createEnquirySchema.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const enquiry = await enquiryService.createEnquiry(value, req.user.id);

    return res.status(201).json({
      success: true,
      message: 'Enquiry created successfully.',
      data: enquiry,
    });
  } catch (error) {
    next(error);
  }
};

exports.getEnquiries = async (req, res, next) => {
  try {
    const result = await enquiryService.getEnquiries(req.query);

    return res.status(200).json({
      success: true,
      message: 'Enquiries retrieved successfully.',
      data: result.enquiries,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};
exports.getEnquirySummary = async (req, res, next) => {
  try {
    const summary = await enquiryService.getEnquirySummary();

    return res.status(200).json({
      success: true,
      message: 'Enquiry summary retrieved successfully.',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};
exports.getEnquiryById = async (req, res, next) => {
  try {
    const enquiry = await enquiryService.getEnquiryById(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Enquiry retrieved successfully.',
      data: enquiry,
    });
  } catch (error) {
    next(error);
  }
};
exports.updateEnquiry = async (req, res, next) => {
  try {
    const { error, value } = updateEnquirySchema.validate(req.body, {
      abortEarly: true,
      stripUnknown: false,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const enquiry = await enquiryService.updateEnquiry(
      req.params.id,
      value
    );

    return res.status(200).json({
      success: true,
      message: 'Enquiry updated successfully.',
      data: enquiry,
    });
  } catch (error) {
    next(error);
  }
};
exports.updateEnquiryStatus = async (req, res, next) => {
  try {
    const { error, value } = updateEnquiryStatusSchema.validate(req.body, {
      abortEarly: true,
      stripUnknown: false,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const enquiry = await enquiryService.updateEnquiryStatus(
      req.params.id,
      value.status
    );

    return res.status(200).json({
      success: true,
      message: 'Enquiry status updated successfully.',
      data: enquiry,
    });
  } catch (error) {
    next(error);
  }
};
// CONVERT ENQUIRY TO ADMISSION
exports.convertEnquiry = async (req, res, next) => {
  try {
    const { error, value } = convertEnquirySchema.validate(req.body, {
      abortEarly: true,
      stripUnknown: false,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const result =
      await admissionConversionService.convertEnquiryToAdmission(
        req.params.id,
        value,
        req.user.id
      );

    return res.status(201).json({
      success: true,
      message: 'Enquiry converted to admission successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};