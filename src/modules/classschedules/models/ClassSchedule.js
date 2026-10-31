
const mongoose = require('mongoose');

const classScheduleSchema = new mongoose.Schema(
  {
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    batch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true
    },
    faculty_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    date: {
      type: Date,
      required: true
    },
    start_time: {
      type: String,
      required: true
    },
    end_time: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['scheduled', 'cancelled'],
      default: 'scheduled'
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

classScheduleSchema.index({
  course_id: 1,
  batch_id: 1,
  date: 1
});

classScheduleSchema.index({
  faculty_id: 1,
  date: 1,
  status: 1
});

module.exports = mongoose.model('ClassSchedule', classScheduleSchema);
