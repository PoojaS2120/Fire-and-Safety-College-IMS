const mongoose = require('mongoose');
const {
  METHODS,
  RECORD_STATUSES,
  ITEM_TYPES,
} = require('../utils/distributionUtils');

const itemSchema = new mongoose.Schema({
  item_type: { type: String, enum: ITEM_TYPES, required: true },
  name: { type: String, required: true, trim: true, maxlength: 150 },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1.'],
    validate: { validator: Number.isInteger, message: 'Quantity must be a whole number.' },
  },
  unit: { type: String, trim: true, maxlength: 20, default: 'pcs' },
  remarks: { type: String, trim: true, maxlength: 300, default: '' },
});

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: RECORD_STATUSES, required: true },
    changed_at: { type: Date, default: Date.now },
    changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    changed_by_name: { type: String, default: '' },
    remarks: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { _id: false }
);

// Address snapshots: copied at dispatch time, never re-read from admission.
const senderSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    address: { type: String, default: '' },
    pin: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
  },
  { _id: false }
);

const recipientSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    student_code: { type: String, default: '' },
    address: { type: String, default: '' },
    pin: { type: String, default: '' },
    phone: { type: String, default: '' },
    source: { type: String, default: 'NONE' },
  },
  { _id: false }
);

const distributionSchema = new mongoose.Schema(
  {
    distribution_no: { type: String, unique: true },

    // Client generated id (uuid) to stop double-click / retry duplicates.
    request_id: { type: String, trim: true, maxlength: 64, unique: true, sparse: true },

    method: { type: String, enum: METHODS, required: true },

    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    batch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', default: null },

    student_snapshot: {
      student_code: { type: String, default: '' },
      name: { type: String, default: '' },
      course_name: { type: String, default: '' },
      batch_name: { type: String, default: '' },
      academic_year: { type: String, default: '' },
      mobile: { type: String, default: '' },
    },

    items: {
      type: [itemSchema],
      validate: [(v) => Array.isArray(v) && v.length > 0, 'At least one item is required.'],
    },

    status: { type: String, enum: RECORD_STATUSES, required: true },
    status_history: { type: [statusHistorySchema], default: [] },

    // Common sortable date: handover time (HAND) or record time (POST/COURIER).
    distribution_date: { type: Date, default: Date.now },

    // HAND only
    handed_at: { type: Date, default: null },

    // POST / COURIER only
    shipment: {
      carrier_name: { type: String, trim: true, maxlength: 100, default: '' },
      tracking_no: { type: String, trim: true, maxlength: 60, default: '' },
      post_office: { type: String, trim: true, maxlength: 150, default: '' },
      service_type: { type: String, trim: true, maxlength: 50, default: '' },
      dispatch_date: { type: Date, default: null },
      delivered_at: { type: Date, default: null },
    },
    sender_address: { type: senderSchema, default: null },
    recipient_address: { type: recipientSchema, default: null },

    given_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    given_by_name: { type: String, default: '' },
    recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recorded_by_name: { type: String, default: '' },

    remarks: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

distributionSchema.pre('validate', function () {
  if (!this.distribution_no) {
    const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '');
    this.distribution_no = `MD-${d}-${this._id.toString().slice(-6).toUpperCase()}`;
  }
});

distributionSchema.index({ student_id: 1, createdAt: -1 });
distributionSchema.index({ student_id: 1, status: 1 });
distributionSchema.index({ course_id: 1, batch_id: 1 });
distributionSchema.index({ method: 1, status: 1 });
distributionSchema.index({ 'shipment.tracking_no': 1 });
distributionSchema.index({ handed_at: 1 });
distributionSchema.index({ 'shipment.dispatch_date': 1 });

module.exports = mongoose.model('MaterialDistribution', distributionSchema);