const mongoose = require('mongoose');

// Single document (key = 'default') holding the college sender address
// used on postal / courier labels. Falls back to COLLEGE_* env variables.
const distributionSettingSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true, immutable: true },
    sender: {
      name: { type: String, trim: true, maxlength: 200, default: '' },
      address: { type: String, trim: true, maxlength: 1000, default: '' },
      pin: {
        type: String,
        trim: true,
        match: [/^(?:[0-9]{6})?$/, 'PIN code must contain exactly 6 digits.'],
        default: '',
      },
      phone: { type: String, trim: true, maxlength: 30, default: '' },
      email: { type: String, trim: true, lowercase: true, maxlength: 200, default: '' },
    },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DistributionSetting', distributionSettingSchema);