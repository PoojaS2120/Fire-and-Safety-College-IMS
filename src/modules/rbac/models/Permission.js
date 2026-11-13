const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // e.g., 'fees.manage'
  module: { type: String, required: true }, // e.g., 'Fees'
  description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Permission', permissionSchema);