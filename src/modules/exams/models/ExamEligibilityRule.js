const mongoose = require('mongoose');

const examEligibilityRuleSchema = new mongoose.Schema(
  {
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },

    exam_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      default: null,
      // null = applies to all exams of the course
    },

    fee_component_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeeComponent',
      required: true,
    },
  },
  { timestamps: true }
);

examEligibilityRuleSchema.index({
  course_id: 1,
  exam_id: 1,
  fee_component_id: 1,
});

module.exports = mongoose.model('ExamEligibilityRule', examEligibilityRuleSchema);