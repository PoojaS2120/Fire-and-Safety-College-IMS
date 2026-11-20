
// const mongoose = require('mongoose');

// const studentSchema = new mongoose.Schema(
//   {
//     // Admission number
//     student_id: {
//       type: String,
//       required: true,
//       unique: true,
//       trim: true,
//       maxlength: 20,
//     },

//     // Student login account
//     user_id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//       unique: true,
//     },

//     full_name: {
//       type: String,
//       required: true,
//       trim: true,
//       maxlength: 150,
//     },

//     dob: {
//       type: Date,
//       required: true,
//     },

//     gender: {
//       type: String,
//       trim: true,
//       maxlength: 10,
//       default: null,
//     },

//     phone: {
//       type: String,
//       required: true,
//       trim: true,
//       maxlength: 15,
//     },

//     email: {
//       type: String,
//       trim: true,
//       lowercase: true,
//       maxlength: 200,
//       default: null,
//     },

//     address: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     guardian_name: {
//       type: String,
//       trim: true,
//       maxlength: 150,
//       default: null,
//     },

//     guardian_phone: {
//       type: String,
//       trim: true,
//       maxlength: 15,
//       default: null,
//     },

//     qualification: {
//       type: String,
//       required: true,
//       trim: true,
//       maxlength: 150,
//     },

//     course_id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Course',
//       required: true,
//     },

//     batch_id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Batch',
//       default: null,
//     },

//     lifecycle_stage: {
//       type: String,
//       enum: [
//         'enquiry',
//         'admission',
//         'documents',
//         'fees',
//         'material',
//         'schedule',
//         'class_test',
//         'exam',
//         'exam_form',
//         'test',
//         'result',
//         'tc_lc',
//       ],
//       required: true,
//       default: 'admission',
//     },

//     stage_status: {
//       type: String,
//       enum: ['pending', 'in_progress', 'completed', 'blocked'],
//       required: true,
//       default: 'pending',
//     },

//     // ===== REPLACED 'deactive' WITH 'blocked' =====
//     status: {
//       type: String,
//       enum: ['active', 'completed', 'left', 'tc_issued', 'blocked'],
//       required: true,
//       default: 'active',
//     },

//     admitted_on: {
//       type: Date,
//       required: true,
//     },

//     created_by: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },
//   },
//   { timestamps: true }
// );

// studentSchema.index({ full_name: 1 });
// studentSchema.index({ phone: 1 });
// studentSchema.index({ course_id: 1, batch_id: 1 });

// module.exports = mongoose.model('Student', studentSchema);

const mongoose = require('mongoose');

// Reusable image metadata.
// Actual image files will be stored outside MongoDB.
const imageSchema = new mongoose.Schema(
  {
    file_name: { type: String, trim: true, default: null },
    file_path: { type: String, trim: true, default: null },
    mime_type: {
      type: String,
      enum: ['image/jpeg', 'image/png', null],
      default: null,
    },
    size_bytes: { type: Number, min: 1, default: null },
    uploaded_at: { type: Date, default: null },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    address: { type: String, trim: true, maxlength: 1000, default: '' },
    pin: {
      type: String,
      trim: true,
      match: [/^(?:[0-9]{6})?$/, 'PIN code must contain exactly 6 digits.'],
      default: '',
    },
  },
  { _id: false }
);

const academicQualificationSchema = new mongoose.Schema(
  {
    examination_passed: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
    school_college: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
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
      maxlength: 200,
      default: '',
    },
    seat_no: {
      type: String,
      trim: true,
      maxlength: 50,
      default: '',
    },
    marks_out_of: { type: Number, min: 0, default: null },
    marks_obtained: { type: Number, min: 0, default: null },
    percentage: { type: Number, min: 0, max: 100, default: null },
  },
  { _id: false }
);

const admissionFormSchema = new mongoose.Schema(
  {
    fathers_name: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
    },
    mothers_name: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
    },
    religion: { type: String, trim: true, maxlength: 100, default: '' },
    caste: { type: String, trim: true, maxlength: 100, default: '' },
    category: { type: String, trim: true, maxlength: 100, default: '' },

    postal_address: {
      type: addressSchema,
      default: () => ({}),
    },
    permanent_address: {
      type: addressSchema,
      default: () => ({}),
    },

    contact_details: {
      contact_no: { type: String, trim: true, maxlength: 15, default: '' },
      mobile_no: { type: String, trim: true, maxlength: 15, default: '' },
      home_mobile_no: { type: String, trim: true, maxlength: 15, default: '' },
    },

    // Aadhaar is a string so leading zeroes are preserved.
    aadhaar_number: {
      type: String,
      trim: true,
      match: [/^[0-9]{12}$/, 'Aadhaar number must contain exactly 12 digits.'],
      default: null,
      select: false,
    },

    academic_qualification: {
      type: [academicQualificationSchema],
      default: [],
    },

    physical_details: {
      blood_group: {
        type: String,
        trim: true,
        maxlength: 5,
        default: '',
      },
      chest: { type: String, trim: true, maxlength: 20, default: '' },
      height: { type: String, trim: true, maxlength: 20, default: '' },
      weight: { type: String, trim: true, maxlength: 20, default: '' },
      participation: {
        ncc: { type: Boolean, default: false },
        nss: { type: Boolean, default: false },
        scout_guide: { type: Boolean, default: false },
      },
    },

    // Store file metadata and paths, not base64 image content.
     images: {
      student_photo: {
        type: imageSchema,
        default: () => ({}),
      },
      student_signature: {
        type: imageSchema,
        default: () => ({}),
      },
    },

    declaration: {
      place: { type: String, trim: true, maxlength: 150, default: '' },
      date: { type: Date, default: null },
    },

    office_use: {
      required_documents: {
        passport_photographs: { type: Boolean, default: false },
        final_year_marksheet: { type: Boolean, default: false },
        degree_certificate: { type: Boolean, default: false },
        leaving_certificate: { type: Boolean, default: false },
        experience_or_deputation_letter: { type: Boolean, default: false },
        domicile_certificate: { type: Boolean, default: false },
        gap_certificate: { type: Boolean, default: false },
        caste_certificate: { type: Boolean, default: false },
        caste_validity_certificate: { type: Boolean, default: false },
        non_creamy_layer_certificate: { type: Boolean, default: false },
        ssc_marksheet_certificate: { type: Boolean, default: false },
        hsc_marksheet_certificate: { type: Boolean, default: false },
      },
      admission_decision: {
        type: String,
        enum: ['pending', 'granted', 'rejected'],
        default: 'pending',
      },
      
    },
  },
  { _id: false }
);

const studentSchema = new mongoose.Schema(
  {
    student_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 20,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    full_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    dob: { type: Date, required: true },
    
    phone: { type: String, required: true, trim: true, maxlength: 15 },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 200,
      default: null,
    },
    address: { type: String, required: true, trim: true },
    guardian_name: { type: String, trim: true, maxlength: 150, default: null },
    guardian_phone: { type: String, trim: true, maxlength: 15, default: null },
    qualification: { type: String, required: true, trim: true, maxlength: 150 },
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    batch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      default: null,
    },

    // Link back to the enquiry when admission came from an enquiry.
    source_enquiry_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enquiry',
      default: null,
    },

    // Complete admission form data.
    admission_form: {
      type: admissionFormSchema,
      default: () => ({}),
    },

    lifecycle_stage: {
      type: String,
      enum: [
        'enquiry',
        'admission',
        'documents',
        'fees',
        'material',
        'schedule',
        'class_test',
        'exam',
        'exam_form',
        'test',
        'result',
        'tc_lc',
      ],
      required: true,
      default: 'admission',
    },
    stage_status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'blocked'],
      required: true,
      default: 'pending',
    },

    // Unchanged from your version — 'deactive' replaced with 'blocked'
    status: {
      type: String,
      enum: ['active', 'completed', 'left', 'tc_issued', 'blocked'],
      required: true,
      default: 'active',
    },

    admitted_on: { type: Date, required: true },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ============================================================
    // NEW (fee + concession integration) — purely additive
    // ============================================================
    admission_type: {
      type: String,
      enum: ['new', 'old'],
      default: 'new',
      // 'new' = first-time student; 'old' = re-enrolling student
      // Used to gate the 'old_student' concession rule.
    },
    concession_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ConcessionMaster',
      default: null,
      // null = no concession applied
    },
    concession_applied_at: { type: Date, default: null },
    concession_applied_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

studentSchema.index({ full_name: 1 });
studentSchema.index({ phone: 1 });
studentSchema.index({ course_id: 1, batch_id: 1 });

// Helpful for group-concession rule
studentSchema.index({ course_id: 1, batch_id: 1, concession_id: 1, status: 1 });

// Index for enquiry-to-admission lookup
studentSchema.index({ source_enquiry_id: 1 });

module.exports = mongoose.model('Student', studentSchema);
