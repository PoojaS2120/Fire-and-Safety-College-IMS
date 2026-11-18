// const mongoose = require('mongoose');

// const permissionSchema = new mongoose.Schema({
//   code: { type: String, required: true, unique: true }, // e.g., 'fees.manage'
//   module: { type: String, required: true }, // e.g., 'Fees'
//   description: { type: String }
// }, { timestamps: true });

// module.exports = mongoose.model('Permission', permissionSchema);



const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  code:     { type: String, required: true, unique: true },   // e.g. 'fees.fee_collection.create'
  module:   { type: String, required: true },                 // e.g. 'FEES'
  page:     { type: String, default: null },                  // e.g. 'Fee Collection'
  tab:      { type: String, default: null },                  // e.g. 'PENDING'
  action:   { type: String, default: null },                  // CREATE | VIEW | UPDATE | DELETE | custom
  category: { type: String, default: null },                  // sidebar group, for UI
  description: { type: String },
  is_legacy: { type: Boolean, default: false },               // old flat codes kept for backward compatibility
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

permissionSchema.index({ module: 1, page: 1, tab: 1, action: 1 });

module.exports = mongoose.model('Permission', permissionSchema);