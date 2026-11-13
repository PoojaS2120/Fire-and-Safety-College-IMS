const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, lowercase: true }, // e.g., 'faculty'
  description: { type: String },
  isSystem: { type: Boolean, default: false }, // Prevents deleting default roles
  permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }]
}, { timestamps: true });

module.exports = mongoose.model('Role', roleSchema);