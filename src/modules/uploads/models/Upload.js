
const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },

    storedName: {
      type: String,
      required: true,
      unique: true,
    },

    mimeType: {
      type: String,
      required: true,
      enum: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
      ],
    },

    size: {
      type: Number,
      required: true,
      min: 1,
      max: 5 * 1024 * 1024,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Upload', uploadSchema);
