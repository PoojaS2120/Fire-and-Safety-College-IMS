
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

// Reusable PIN validation
const pinSchema = Joi.string()
  .pattern(/^[0-9]{6}$/)
  .allow('', null);

// Reusable address validation
const addressSchema = Joi.object({
  address: Joi.string()
    .trim()
    .max(1000)
    .allow('', null),

  pin: pinSchema,
}).unknown(false);

// Reusable academic qualification validation
const academicQualificationSchema = Joi.object({
  examination_passed: Joi.string()
    .trim()
    .max(150)
    .allow(''),

  school_college: Joi.string()
    .trim()
    .max(200)
    .allow(''),

  year_of_passing: Joi.number()
    .integer()
    .min(1900)
    .max(2100)
    .allow(null),

  board_university: Joi.string()
    .trim()
    .max(200)
    .allow(''),

  seat_no: Joi.string()
    .trim()
    .max(50)
    .allow(''),

  marks_out_of: Joi.number()
    .min(0)
    .allow(null),

  marks_obtained: Joi.number()
    .min(0)
    .allow(null),

  percentage: Joi.number()
    .min(0)
    .max(100)
    .allow(null),
}).unknown(false);

// Common enquiry fields
const enquiryFields = {
  name: Joi.string().trim().min(2).max(150),

  fathers_name: Joi.string()
    .trim()
    .max(150)
    .allow('', null),

  mothers_name: Joi.string()
    .trim()
    .max(150)
    .allow('', null),

  religion: Joi.string()
    .trim()
    .max(100)
    .allow('', null),

  caste: Joi.string()
    .trim()
    .max(100)
    .allow('', null),

  category: Joi.string()
    .trim()
    .max(100)
    .allow('', null),

  date_of_birth: Joi.date()
    .iso()
    .less('now')
    .allow('', null),

  // Legacy qualification field retained
  qualification: Joi.string()
    .trim()
    .max(150)
    .allow('', null),

  // Complete academic qualification details
  academic_qualification: Joi.array()
    .items(academicQualificationSchema)
    .max(10)
    .optional(),

  // Physical measurements
  height_cm: Joi.number().min(0).allow(null),
  weight_kg: Joi.number().min(0).allow(null),
  chest_cm: Joi.number().min(0).allow(null),

  // Course information
  course_interest_id: Joi.string()
    .hex()
    .length(24)
    .allow('', null),

  // Contact information
  phone_tel: Joi.string()
    .trim()
    .pattern(phonePattern)
    .allow('', null),

  mobile: Joi.string()
    .trim()
    .pattern(phonePattern)
    .allow('', null),

  // Legacy field retained for existing API integrations
  phone: Joi.string()
    .trim()
    .pattern(phonePattern)
    .allow('', null),

  email: Joi.string()
    .trim()
    .email()
    .max(200)
    .allow('', null),

  address: Joi.string()
    .trim()
    .max(1000)
    .allow('', null),

  postal_address: addressSchema,

  permanent_address: addressSchema,

  // Additional information
  work_experience: Joi.string()
    .trim()
    .max(2000)
    .allow('', null),

  // Supports both single and multiple referral selections
  how_did_you_know: Joi.alternatives()
    .try(
      Joi.array()
        .items(Joi.string().valid(...referralOptions))
        .unique()
        .max(6),

      Joi.string().valid(...referralOptions)
    )
    .custom((value) => {
      return Array.isArray(value) ? value : [value];
    }),

  other: Joi.string()
    .trim()
    .max(1000)
    .allow('', null),

  suggestion: Joi.string()
    .trim()
    .max(2000)
    .allow('', null),

  remark: Joi.string()
    .trim()
    .max(2000)
    .allow('', null),

  authorized_sign: Joi.string()
    .max(500000)
    .allow('', null),

  applicant_signature: Joi.string()
    .max(500000)
    .allow('', null),

  // Existing fields retained for backward compatibility
  source: Joi.string().valid(
    'walk-in',
    'phone',
    'social media',
    'website',
    'referral',
    'other'
  ),

  notes: Joi.string()
    .trim()
    .max(2000)
    .allow('', null),
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
// Supports existing conversion payloads and complete admission form data.
exports.convertEnquirySchema = Joi.object({
  // Existing conversion fields
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

  phone: Joi.string()
    .trim()
    .pattern(phonePattern)
    .allow('', null)
    .optional(),

  full_name: Joi.string()
    .trim()
    .min(2)
    .max(150)
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
    .pattern(phonePattern)
    .allow('', null)
    .optional(),

  // Additional admission details
  fathers_name: Joi.string()
    .trim()
    .max(150)
    .allow('', null)
    .optional(),

  mothers_name: Joi.string()
    .trim()
    .max(150)
    .allow('', null)
    .optional(),

  religion: Joi.string()
    .trim()
    .max(100)
    .allow('', null)
    .optional(),

  caste: Joi.string()
    .trim()
    .max(100)
    .allow('', null)
    .optional(),

  category: Joi.string()
    .trim()
    .max(100)
    .allow('', null)
    .optional(),

  academic_qualification: Joi.array()
    .items(academicQualificationSchema)
    .max(10)
    .optional(),

  // Selected course for admission
  course_id: Joi.string()
    .hex()
    .length(24)
    .optional(),

  contact_no: Joi.string()
    .trim()
    .pattern(phonePattern)
    .allow('', null)
    .optional(),

  mobile_no: Joi.string()
    .trim()
    .pattern(phonePattern)
    .allow('', null)
    .optional(),

  home_mobile_no: Joi.string()
    .trim()
    .pattern(phonePattern)
    .allow('', null)
    .optional(),

  admission_form: Joi.object({
    // Selected course can also be sent inside admission_form
    course_id: Joi.string()
      .hex()
      .length(24)
      .optional(),

    fathers_name: Joi.string()
      .trim()
      .max(150)
      .allow('', null),

    mothers_name: Joi.string()
      .trim()
      .max(150)
      .allow('', null),

    religion: Joi.string()
      .trim()
      .max(100)
      .allow('', null),

    caste: Joi.string()
      .trim()
      .max(100)
      .allow('', null),

    category: Joi.string()
      .trim()
      .max(100)
      .allow('', null),

    aadhaar_number: Joi.string()
      .pattern(/^[0-9]{12}$/)
      .allow('', null)
      .messages({
        'string.pattern.base':
          'Aadhaar number must contain exactly 12 digits.',
      }),

    postal_address: addressSchema.optional(),

    permanent_address: addressSchema.optional(),

    contact_details: Joi.object({
      contact_no: Joi.string()
        .trim()
        .pattern(phonePattern)
        .allow('', null),

      mobile_no: Joi.string()
        .trim()
        .pattern(phonePattern)
        .allow('', null),

      home_mobile_no: Joi.string()
        .trim()
        .pattern(phonePattern)
        .allow('', null),
    }).unknown(false).optional(),

    academic_qualification: Joi.array()
      .items(academicQualificationSchema)
      .max(10)
      .optional(),

    physical_details: Joi.object({
      blood_group: Joi.string()
        .trim()
        .max(10)
        .allow('', null),

      chest: Joi.string()
        .trim()
        .max(20)
        .allow('', null),

      height: Joi.string()
        .trim()
        .max(20)
        .allow('', null),

      weight: Joi.string()
        .trim()
        .max(20)
        .allow('', null),

      participation: Joi.object({
        ncc: Joi.boolean(),
        nss: Joi.boolean(),
        scout_guide: Joi.boolean(),
      }).unknown(false).optional(),
    }).unknown(false).optional(),

    // File metadata only. Actual files are handled by upload middleware.
    images: Joi.object({
      student_photo: Joi.object({
        file_name: Joi.string().allow('', null),
        file_path: Joi.string().allow('', null),
        mime_type: Joi.string()
          .valid('image/jpeg', 'image/png')
          .allow(null),
        size_bytes: Joi.number().integer().min(1),
        uploaded_at: Joi.date().allow(null),
      }).allow(null).optional(),

      student_signature: Joi.object({
        file_name: Joi.string().allow('', null),
        file_path: Joi.string().allow('', null),
        mime_type: Joi.string()
          .valid('image/jpeg', 'image/png')
          .allow(null),
        size_bytes: Joi.number().integer().min(1),
        uploaded_at: Joi.date().allow(null),
      }).allow(null).optional(),

      parent_signature: Joi.object({
        file_name: Joi.string().allow('', null),
        file_path: Joi.string().allow('', null),
        mime_type: Joi.string()
          .valid('image/jpeg', 'image/png')
          .allow(null),
        size_bytes: Joi.number().integer().min(1),
        uploaded_at: Joi.date().allow(null),
      }).allow(null).optional(),
    }).unknown(false).optional(),

    declaration: Joi.object({
      place: Joi.string()
        .trim()
        .max(150)
        .allow('', null),

      date: Joi.date().allow(null),
    }).unknown(false).optional(),

    office_use: Joi.object({
      required_documents: Joi.object({
        passport_photographs: Joi.boolean(),
        final_year_marksheet: Joi.boolean(),
        degree_certificate: Joi.boolean(),
        leaving_certificate: Joi.boolean(),
        experience_or_deputation_letter: Joi.boolean(),
        domicile_certificate: Joi.boolean(),
        gap_certificate: Joi.boolean(),
        caste_certificate: Joi.boolean(),
        caste_validity_certificate: Joi.boolean(),
        non_creamy_layer_certificate: Joi.boolean(),
        ssc_marksheet_certificate: Joi.boolean(),
        hsc_marksheet_certificate: Joi.boolean(),
      }).unknown(false).optional(),

      admission_decision: Joi.string()
        .valid('pending', 'granted', 'rejected')
        .optional(),
    }).unknown(false).optional(),
  }).unknown(false).optional(),
}).unknown(false);