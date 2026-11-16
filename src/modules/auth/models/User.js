
// const mongoose = require('mongoose');
// const bcrypt = require('bcrypt');

// const userSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   phone: { type: String },
//   password: { type: String, required: true },
  
//   // 🚨 CHANGED: Must be an ObjectId, not a String
//   role: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'Role', 
//     required: true 
//   },
  
//   is_active: { type: Boolean, default: true },
//   must_change_password: { type: Boolean, default: false },
  
//   // Brute force protection
//   failed_login_count: { type: Number, default: 0 },
//   lock_until: { type: Date, default: null },

//   // Password reset fields
//   resetPasswordToken: String,
//   resetPasswordExpire: Date
// }, { timestamps: true });

// userSchema.pre('save', async function () {
//   if (!this.isModified('password')) return;
//   const salt = await bcrypt.genSalt(12);
//   this.password = await bcrypt.hash(this.password, salt);
// });

// userSchema.methods.matchPassword = async function (enteredPassword) {
//   return await bcrypt.compare(enteredPassword, this.password);
// };

// module.exports = mongoose.model('User', userSchema);

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },

  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },

  // ---- USER-WISE PERMISSIONS (overrides on top of role) ----
  extra_permissions:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }], // granted in addition to role
  denied_permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }], // removed even if role has them

  is_active: { type: Boolean, default: true },
  must_change_password: { type: Boolean, default: false },

  failed_login_count: { type: Number, default: 0 },
  lock_until: { type: Date, default: null },

  resetPasswordToken: String,
  resetPasswordExpire: Date,
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);