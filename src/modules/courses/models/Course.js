const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  duration: { type: String, required: true }, // e.g., "6 months"
  description: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);