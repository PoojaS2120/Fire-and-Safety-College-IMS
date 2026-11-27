const mongoose = require('mongoose');

const studentAddressSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student', // ⚠️ ADAPT: must match your existing Student model name
      required: true,
      unique: true,
      index: true,
    },
    address_line_1: { type: String, required: true, trim: true },
    address_line_2: { type: String, trim: true, default: '' },
    village_city:   { type: String, required: true, trim: true },
    taluka:         { type: String, trim: true, default: '' },
    district:       { type: String, required: true, trim: true },
    state:          { type: String, required: true, trim: true },
    pincode:        { type: String, required: true, trim: true },
    country:        { type: String, required: true, trim: true, default: 'India' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'student_addresses',
  }
);

module.exports = mongoose.model('StudentAddress', studentAddressSchema);