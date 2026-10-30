const mongoose = require('mongoose');

const studentIdCounterSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },

    sequence: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model(
  'StudentIdCounter',
  studentIdCounterSchema
);