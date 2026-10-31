const mongoose = require('mongoose');

const facultyAssignmentSchema = new mongoose.Schema({
  faculty_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  batch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  subject: { type: String, required: true } // e.g., "Fire Safety Basics"
}, { timestamps: true });

// Prevent duplicate assignments for the same faculty, batch, and subject
facultyAssignmentSchema.index({ faculty_id: 1, batch_id: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model('FacultyAssignment', facultyAssignmentSchema);