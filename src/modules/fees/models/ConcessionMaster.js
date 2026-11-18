const mongoose = require('mongoose');

const concessionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    value: { type: Number, required: true, min: 0 },
    concession_type: {
      type: String,
      enum: ['group', 'old_student', 'merit', 'custom'],
      required: true,
    },
    min_students: { type: Number, default: 1, min: 1 },
    applicable_to: {
      type: String,
      enum: ['all_fees', 'specific_fees'],
      default: 'all_fees',
    },
    specific_fee_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FeeComponent',
      },
    ],
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

concessionSchema.index({ status: 1, concession_type: 1 });

module.exports = mongoose.model('ConcessionMaster', concessionSchema);