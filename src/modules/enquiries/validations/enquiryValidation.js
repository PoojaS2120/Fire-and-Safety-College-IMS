const Joi = require('joi');

const phonePattern = /^[0-9+\-\s()]{7,15}$/;

const referralOptions = [
  'friends',
  'sahyadri',
  'cable_tv',
  'our_representative',
  'newspaper',
  'internet',
];

const enquiryFields = {
  name: Joi.string().trim().min(2).max(150),

  fathers_name: Joi.string().trim().max(150).allow('', null),

  date_of_birth: Joi.date()
    .iso()
    .less('now')
    .allow('', null),

  qualification: Joi.string().trim().max(150).allow('', null),

  height_cm: Joi.number().min(0).allow(null),
  weight_kg: Joi.number().min(0).allow(null),
  chest_cm: Joi.number().min(0).allow(null),

  course_interest_id: Joi.string().hex().length(24).allow('', null),

  phone_tel: Joi.string().trim().pattern(phonePattern).allow('', null),
  mobile: Joi.string().trim().pattern(phonePattern).allow('', null),

  // Legacy field retained for existing API integrations
  phone: Joi.string().trim().pattern(phonePattern).allow('', null),

  email: Joi.string().trim().email().max(200).allow('', null),

  address: Joi.string().trim().max(1000).allow('', null),

  work_experience: Joi.string().trim().max(2000).allow('', null),

  how_did_you_know: Joi.array()
    .items(Joi.string().valid(...referralOptions))
    .unique()
    .max(6),

  other: Joi.string().trim().max(1000).allow('', null),

  suggestion: Joi.string().trim().max(2000).allow('', null),

  remark: Joi.string().trim().max(2000).allow('', null),

  authorized_sign: Joi.string().max(500000).allow('', null),

  applicant_signature: Joi.string().max(500000).allow('', null),

  // Existing fields retained for backward compatibility
  source: Joi.string().valid(
    'walk-in',
    'phone',
    'social media',
    'website',
    'referral',
    'other'
  ),

  notes: Joi.string().trim().max(2000).allow('', null),
};

// CREATE ENQUIRY
exports.createEnquirySchema = Joi.object({
  ...enquiryFields,
  name: enquiryFields.name.required(),
}).unknown(false);

// UPDATE ENQUIRY
exports.updateEnquirySchema = Joi.object(enquiryFields)
  .min(1)
  .unknown(false);

// UPDATE ENQUIRY STATUS
exports.updateEnquiryStatusSchema = Joi.object({
  status: Joi.string()
    .valid('new', 'contacted', 'interested', 'closed')
    .required(),
}).unknown(false);

// CONVERT ENQUIRY TO ADMISSION
// Existing admission conversion validation is preserved.
exports.convertEnquirySchema = Joi.object({
  dob: Joi.date().iso().less('now').required(),

  qualification: Joi.string().trim().min(2).max(150).required(),

  address: Joi.string().trim().min(1).max(1000).required(),

  email: Joi.string().trim().email().max(200).allow('', null).optional(),

  phone: Joi.string().trim().pattern(phonePattern).optional(),

  full_name: Joi.string().trim().min(2).max(150).optional(),

  gender: Joi.string().valid('male', 'female', 'other').allow(null).optional(),

  guardian_name: Joi.string().trim().max(150).allow('', null).optional(),

  guardian_phone: Joi.string()
    .trim()
    .pattern(phonePattern)
    .allow('', null)
    .optional(),
}).unknown(false);
