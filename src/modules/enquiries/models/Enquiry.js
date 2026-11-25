const mongoose = require('mongoose');

const academicQualificationSchema = new mongoose.Schema(
  

  {
     level: {
      type: String,
      enum: ['10th', '12th_iti', 'diploma_degree', 'other'],
      default: 'other',
    },
    examination_passed: {
      type: String,
      trim: true,
      default: '',
      maxlength: 150,
    },
    school_college: {
      type: String,
      trim: true,
      default: '',
      maxlength: 200,
    },
    year_of_passing: {
      type: Number,
      min: 1900,
      max: 2100,
      default: null,
    },
    board_university: {
      type: String,
      trim: true,
      default: '',
      maxlength: 200,
    },
    seat_no: {
      type: String,
      trim: true,
      default: '',
      maxlength: 50,
    },
    marks_out_of: {
      type: Number,
      min: 0,
      default: null,
    },
    marks_obtained: {
      type: Number,
      min: 0,
      default: null,
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
  },
  { _id: false }
);

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
      maxlength: 150,
    },

    mothers_name: {
      type: String,
      trim: true,
      default: null,
      maxlength: 150,
    },

    religion: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },

    caste: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },

    category: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },

    date_of_birth: {
      type: Date,
      default: null,
    },

    // Legacy qualification field retained for backward compatibility
    qualification: {
      type: String,
      trim: true,
      default: null,
      maxlength: 150,
    },

    // // Complete academic qualification details
    // academic_qualification: {
    //   type: [academicQualificationSchema],
    //   default: [],
    // },

    academic_qualification: {
  type: [academicQualificationSchema],
  default: [],
  validate: {
    validator: (rows) => {
      const fixed = rows.map((r) => r.level).filter((l) => l !== 'other');
      return rows.length <= 10 && new Set(fixed).size === fixed.length;
    },
    message: '10th, 12th / ITI and Diploma / Degree can be added only once each.',
  },
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

    home_mobile_no: {
      type: String,
      trim: true,
      maxlength: 15,
      default: '',
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

    postal_address: {
      address: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: '',
      },
      pin: {
        type: String,
        trim: true,
        match: [/^(?:[0-9]{6})?$/, 'PIN code must contain exactly 6 digits.'],
        default: '',
      },
    },

    permanent_address: {
      address: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: '',
      },
      pin: {
        type: String,
        trim: true,
        match: [/^(?:[0-9]{6})?$/, 'PIN code must contain exactly 6 digits.'],
        default: '',
      },
    },

    // Additional information
    work_experience: {
      type: String,
      trim: true,
      default: null,
    },

    how_did_you_know: {
      type: [
        {
          type: String,
          enum: [
            'friends',
            'sahyadri',
            'cable_tv',
            'our_representative',
            'newspaper',
            'internet',
          ],
        },
      ],
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

    
    // authorized_sign: {
    //   type: String,
    //   default: null,
    // },

    // applicant_signature: {
    //   type: String,
    //   default: null,
    // },

    // Existing enquiry management fields
    source: {
      type: String,
      enum: ['walk-in', 'phone', 'social media', 'website', 'referral', 'other'],
      default: 'other',
    },

    status: {
      type: String,
      enum: [
  'new',
  'interested',
  'not_interested',
  'follow_up',
],
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
  default: null,
},
  },
  { timestamps: true }
);

module.exports = mongoose.model('Enquiry', enquirySchema);