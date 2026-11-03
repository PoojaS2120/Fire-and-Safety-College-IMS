// models/AuditLog.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
  action: { type: String, required: true }, // CREATE, UPDATE, DELETE, LOGIN, CANCEL, PUBLISH
  entity: { type: String, required: true }, // 'User', 'Course', 'Payment', 'Mark'
  entity_id: { type: mongoose.Schema.Types.ObjectId }, 
  old_values: { type: mongoose.Schema.Types.Mixed }, // Mixed allows any JSON structure
  new_values: { type: mongoose.Schema.Types.Mixed }, 
  ip_address: { type: String }, 
  createdAt: { type: Date, default: Date.now, immutable: true } 
});

// Index for faster querying in the UI
auditLogSchema.index({ entity: 1, entity_id: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);