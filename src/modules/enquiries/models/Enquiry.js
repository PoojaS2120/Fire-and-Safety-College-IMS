
const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema(
  {
    // Basic information
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    fathers_name: {
      type: String,
      trim: true,
      default: null,
    },
    date_of_birth: {
      type: Date,
      default: null,
    },
    qualification: {
      type: String,
      trim: true,
      default: null,
    },

    // Physical measurements
    height_cm: {
      type: Number,
      default: null,
      min: 0,
    },
    weight_kg: {
      type: Number,
      default: null,
      min: 0,
    },
    chest_cm: {
      type: Number,
      default: null,
      min: 0,
    },

    // Course information
    course_interest_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },

    // Contact information
    phone_tel: {
      type: String,
      trim: true,
      maxlength: 15,
      default: null,
    },
    mobile: {
      type: String,
      trim: true,
      maxlength: 15,
      default: null,
    },

    // Backward compatibility with existing enquiry APIs
    phone: {
      type: String,
      trim: true,
      maxlength: 15,
      default: null,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 200,
      default: null,
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },

    // Additional information
    work_experience: {
      type: String,
      trim: true,
      default: null,
    },
    how_did_you_know: {
      type: [{
        type: String,
        enum: [
          'friends',
          'sahyadri',
          'cable_tv',
          'our_representative',
          'newspaper',
          'internet',
        ],
      }],
      default: [],
    },
    other: {
      type: String,
      trim: true,
      default: null,
    },
    suggestion: {
      type: String,
      trim: true,
      default: null,
    },
    remark: {
      type: String,
      trim: true,
      default: null,
    },

    // Signatures
    authorized_sign: {
      type: String,
      default: null,
    },
    applicant_signature: {
      type: String,
      default: null,
    },

    // Existing enquiry management fields
    source: {
      type: String,
      enum: ['walk-in', 'phone', 'social media', 'website', 'referral', 'other'],
      default: 'other',
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'interested', 'converted', 'closed'],
      default: 'new',
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    converted_student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Enquiry', enquirySchema);
