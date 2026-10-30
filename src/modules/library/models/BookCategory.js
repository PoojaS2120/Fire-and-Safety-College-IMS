const mongoose = require('mongoose');

const bookCategorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Category name is required'], 
    trim: true, 
    maxlength: [100, 'Name cannot exceed 100 characters'] 
    // Removed unique: true from here to fix the warning
  },
  description: { 
    type: String, 
    maxlength: [300, 'Description cannot exceed 300 characters'],
    default: null 
  }
}, { timestamps: true });

// Keep this custom index. It enforces uniqueness AND makes it case-insensitive.
bookCategorySchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

module.exports = mongoose.model('BookCategory', bookCategorySchema);