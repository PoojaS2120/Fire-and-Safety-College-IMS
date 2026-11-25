
// const mongoose = require('mongoose');

// const bookIssueSchema = new mongoose.Schema({
//   book: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Book',
//     required: true
//   },

//   student: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Student',
//     required: true
//   },

//   issueDate: {
//     type: Date,
//     required: true,
//     default: Date.now
//   },

//   dueDate: {
//     type: Date,
//     required: true
//   },

//   returnDate: {
//     type: Date,
//     default: null
//   },

//   status: {
//     type: String,
//     enum: ['issued', 'returned', 'overdue'],
//     default: 'issued'
//   },

//   issuedBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   }
  

// }, { timestamps: true });

// bookIssueSchema.index({ book: 1, status: 1 });
// bookIssueSchema.index({ student: 1, status: 1 });
// bookIssueSchema.index({ dueDate: 1, status: 1 });

// module.exports = mongoose.model('BookIssue', bookIssueSchema);


const mongoose = require('mongoose');

const bookIssueSchema = new mongoose.Schema({
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },

  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },

  issueDate: {
    type: Date,
    required: true,
    default: Date.now
  },

  dueDate: {
    type: Date,
    required: true
  },

  returnDate: {
    type: Date,
    default: null
  },

  status: {
    type: String,
    enum: ['issued', 'returned', 'overdue'],
    default: 'issued'
  },

  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // NEW: student who physically returned the book
  returnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: null
  },

  // NEW: librarian who received the book
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }

}, { timestamps: true });

bookIssueSchema.index({ book: 1, status: 1 });
bookIssueSchema.index({ student: 1, status: 1 });
bookIssueSchema.index({ dueDate: 1, status: 1 });

module.exports = mongoose.model('BookIssue', bookIssueSchema);