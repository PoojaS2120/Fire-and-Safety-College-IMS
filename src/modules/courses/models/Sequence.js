const mongoose = require('mongoose');

const sequenceSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // The key (e.g., "receipt_no_2026")
  seq: { type: Number, default: 0 }
});

// THIS IS THE MISSING FUNCTION
sequenceSchema.statics.getNextSequence = async function (key) {
  const sequence = await this.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } }, // Atomic increment
    { new: true, upsert: true } // Create if it doesn't exist
  );
  return sequence.seq;
};

module.exports = mongoose.model('Sequence', sequenceSchema);