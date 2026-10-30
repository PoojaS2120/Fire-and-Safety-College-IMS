const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who did it
  action: { type: String, required: true }, // CREATE, UPDATE, DELETE, LOGIN, CANCEL, PUBLISH
  entity: { type: String, required: true }, // 'User', 'Course', 'Payment', 'Mark'
  entity_id: { type: mongoose.Schema.Types.ObjectId }, // The ID of the record changed
  old_values: { type: Object }, // Snapshot before change (JSON)
  new_values: { type: Object }, // Snapshot after change (JSON)
  ip_address: { type: String }, // IPv4 or IPv6
  createdAt: { type: Date, default: Date.now, immutable: true } // Cannot be changed
});

module.exports = mongoose.model('AuditLog', auditLogSchema);