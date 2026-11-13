// const mongoose = require('mongoose');
// const bcrypt = require('bcrypt');

// const userSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   phone: { type: String },
//   password: { type: String, required: true },
//   role: { 
//     type: String, 
//     enum: ['super_admin', 'office_staff', 'faculty', 'librarian', 'student'], 
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

// // Hash password before saving
// userSchema.pre('save', async function () {
//   if (!this.isModified('password')) return;
//   const salt = await bcrypt.genSalt(12);
//   this.password = await bcrypt.hash(this.password, salt);
// });

// // Compare password method
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
  
  // 🚨 CHANGED: Must be an ObjectId, not a String
  role: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Role', 
    required: true 
  },
  
  is_active: { type: Boolean, default: true },
  must_change_password: { type: Boolean, default: false },
  
  // Brute force protection
  failed_login_count: { type: Number, default: 0 },
  lock_until: { type: Date, default: null },

  // Password reset fields
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);