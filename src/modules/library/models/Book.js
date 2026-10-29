const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'BookCategory', required: true },
  title: { type: String, required: true, trim: true, maxlength: 250 },
  author: { type: String, required: true, trim: true, maxlength: 150 },
  bookCode: { type: String, required: true, unique: true, trim: true, maxlength: 30 },
  isbn: { type: String, default: null, maxlength: 20 },
  totalQty: { type: Number, required: true, min: 0 },
  availableQty: { type: Number, required: true, min: 0, default: 0 },
  status: { type: String, enum: ['active', 'retired'], default: 'active' }
}, { timestamps: true });

// ✅ FIXED: Modern Mongoose async pre-validate hook (no next() needed)
bookSchema.pre('validate', function () {
  if (this.availableQty > this.totalQty) {
    throw new Error('availableQty cannot exceed totalQty');
  }
});

module.exports = mongoose.model('Book', bookSchema);