const mongoose = require('mongoose');

const tcLcSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  type: { type: String, enum: ['TC', 'LC'], required: true },
  reason: { type: String, required: true }, // e.g., "Course Completed", "Relocating"
  status: { type: String, enum: ['requested', 'approved', 'rejected'], default: 'requested' },
  certificate_no: { type: String, unique: true, sparse: true }, // Generated upon approval
  eligibility_note: { type: String }, // Why they were rejected/approved
  requested_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  issue_date: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('TcLc', tcLcSchema);