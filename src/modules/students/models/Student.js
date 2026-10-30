
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    // Admission number
    student_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 20,
    },

    // Student login account
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

    dob: {
      type: Date,
      required: true,
    },

    gender: {
      type: String,
      trim: true,
      maxlength: 10,
      default: null,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 15,
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
      required: true,
      trim: true,
    },

    guardian_name: {
      type: String,
      trim: true,
      maxlength: 150,
      default: null,
    },

    guardian_phone: {
      type: String,
      trim: true,
      maxlength: 15,
      default: null,
    },

    qualification: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

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

    status: {
      type: String,
      enum: ['active', 'completed', 'left', 'tc_issued', 'deactive'],
      required: true,
      default: 'active',
    },

    admitted_on: {
      type: Date,
      required: true,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

studentSchema.index({ full_name: 1 });
studentSchema.index({ phone: 1 });
studentSchema.index({ course_id: 1, batch_id: 1 });

module.exports = mongoose.model('Student', studentSchema);
