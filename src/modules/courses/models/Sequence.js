
const mongoose = require('mongoose');

const sequenceSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },

  seq: {
    type: Number,
    default: 0,
    min: 0,
  },
});

sequenceSchema.statics.getNextSequence = async function (key, session = null) {
  const options = {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  };

  if (session) {
    options.session = session;
  }

  const sequence = await this.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    options
  );

  return sequence.seq;
};

module.exports = mongoose.model('Sequence', sequenceSchema);
