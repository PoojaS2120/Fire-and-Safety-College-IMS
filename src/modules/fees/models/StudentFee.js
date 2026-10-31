const mongoose = require('mongoose');

const studentFeeSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Links to the student
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  fee_component_id: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeComponent', required: true },
  fee_name: { type: String, required: true }, // e.g., "Tuition Fee"
  amount_due: { type: Number, required: true },
  amount_paid: { type: Number, default: 0 },
  required_for_exam: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('StudentFee', studentFeeSchema);