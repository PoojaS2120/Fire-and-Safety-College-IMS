
const mongoose = require('mongoose');

const studentDocumentSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },

    upload_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Upload',
      required: true,
      unique: true,
    },

    document_type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    status: {
      type: String,
      enum: ['pending', 'received', 'verified', 'rejected'],
      default: 'pending',
      required: true,
    },

    verified_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    verified_at: {
      type: Date,
      default: null,
    },

    remarks: {
      type: String,
      trim: true,
      default: null,
    },

    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deleted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    deleted_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

studentDocumentSchema.index({ student_id: 1, is_deleted: 1 });

module.exports = mongoose.model('StudentDocument', studentDocumentSchema);
