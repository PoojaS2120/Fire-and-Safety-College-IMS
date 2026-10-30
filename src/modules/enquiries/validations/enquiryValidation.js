const Joi = require('joi');

exports.createEnquirySchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  phone: Joi.string().trim().pattern(/^[0-9+\-\s()]{7,15}$/).required(),
  email: Joi.string().trim().email().max(200).allow('', null).optional(),
  address: Joi.string().trim().max(1000).allow('', null).optional(),
  course_interest_id: Joi.string().hex().length(24).allow('', null).optional(),
  source: Joi.string()
    .valid('walk-in', 'phone', 'social media', 'website', 'referral', 'other')
    .optional(),
  notes: Joi.string().trim().max(2000).allow('', null).optional(),
});

exports.updateEnquirySchema = Joi.object({
  name: Joi.string().trim().min(2).max(150),
  phone: Joi.string().trim().pattern(/^[0-9+\-\s()]{7,15}$/),
  email: Joi.string().trim().email().max(200).allow('', null),
  address: Joi.string().trim().max(1000).allow('', null),
  course_interest_id: Joi.string().hex().length(24).allow('', null),
  source: Joi.string().valid(
    'walk-in',
    'phone',
    'social media',
    'website',
    'referral',
    'other'
  ),
  notes: Joi.string().trim().max(2000).allow('', null),
}).min(1).unknown(false);
exports.updateEnquiryStatusSchema = Joi.object({
  status: Joi.string()
    .valid('contacted', 'interested', 'closed')
    .required(),
});
// CONVERT ENQUIRY TO ADMISSION
exports.convertEnquirySchema = Joi.object({
  dob: Joi.date()
    .iso()
    .less('now')
    .required(),

  qualification: Joi.string()
    .trim()
    .min(2)
    .max(150)
    .required(),

  address: Joi.string()
    .trim()
    .min(1)
    .max(1000)
    .required(),

  email: Joi.string()
    .trim()
    .email()
    .max(200)
    .allow('', null)
    .optional(),

  gender: Joi.string()
    .valid('male', 'female', 'other')
    .allow(null)
    .optional(),

  guardian_name: Joi.string()
    .trim()
    .max(150)
    .allow('', null)
    .optional(),

  guardian_phone: Joi.string()
    .trim()
    .pattern(/^[0-9+\-\s()]{7,15}$/)
    .allow('', null)
    .optional(),
}).unknown(false);