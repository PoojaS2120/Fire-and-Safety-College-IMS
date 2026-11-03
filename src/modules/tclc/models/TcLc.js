const mongoose = require('mongoose');

const tcLcSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['TC', 'LC'],
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['requested', 'approved', 'rejected', 'issued'],
      default: 'requested',
      index: true,
    },
    certificate_no: {
      type: String,
      unique: true,
      sparse: true,
    },
    eligibility_note: {
      type: String,
      default: null,
    },
    requested_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    issue_date: {
      type: Date,
      default: null,
    },
    rejection_reason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// One active request per student per type
tcLcSchema.index(
  { student_id: 1, type: 1, status: 1 },
  { partialFilterExpression: { status: { $in: ['requested', 'approved', 'issued'] } } }
);

module.exports = mongoose.model('TcLc', tcLcSchema);