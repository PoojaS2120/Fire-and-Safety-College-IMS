const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // FIXED: Changed ref from 'User' to 'Student'
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  amount: { type: Number, required: true },
  mode: { type: String, enum: ['cash', 'upi', 'bank', 'cheque'], required: true },
  reference_no: { type: String }, 
  receipt_no: { type: String, unique: true, required: true }, 
  recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active', 'cancelled'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);