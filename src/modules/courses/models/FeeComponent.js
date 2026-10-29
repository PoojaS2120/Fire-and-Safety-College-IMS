const mongoose = require('mongoose');

const feeComponentSchema = new mongoose.Schema({
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  name: { type: String, required: true }, // e.g., Admission Fee, Tuition Fee
  amount: { type: Number, required: true },
  required_for_exam: { type: Boolean, default: false }, // If true, student can't take exam if this is unpaid
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('FeeComponent', feeComponentSchema);