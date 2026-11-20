
const mongoose = require('mongoose');

const iCardSchema = new mongoose.Schema(
  {
    // Reference to the original student
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },

    // Student details saved as an iCard snapshot
    student_id: {
      type: String,
      required: true,
      trim: true,
    },

    full_name: {
      type: String,
      required: true,
      trim: true,
    },

    date_of_birth: {
      type: Date,
      default: null,
    },

    blood_group: {
      type: String,
      default: null,
      trim: true,
    },

    address: {
      type: String,
      default: '',
      trim: true,
    },

    mobile_number: {
      type: String,
      default: '',
      trim: true,
    },

    photo: {
      file_name: {
        type: String,
        default: null,
      },
      file_path: {
        type: String,
        default: null,
      },
      mime_type: {
        type: String,
        default: null,
      },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Multiple iCards per student are allowed.
iCardSchema.index({ student: 1, createdAt: -1 });

module.exports = mongoose.model('ICard', iCardSchema);
