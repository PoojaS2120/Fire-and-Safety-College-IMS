const Book = require('../models/Book');
const BookCategory = require('../models/BookCategory');
const BookIssue = require('../models/BookIssue');
const Student = require('../../students/models/Student');

// ---------- CATEGORIES ----------
exports.createCategory = async (data) => {
  const existing = await BookCategory.findOne({ name: data.name })
    .collation({ locale: 'en', strength: 2 });

  if (existing) {
    throw { statusCode: 409, message: 'Category name already exists' };
  }

  return BookCategory.create(data);
};

exports.listCategories = async () => {
  return BookCategory.find().sort({ name: 1 });
};

exports.updateCategory = async (id, data) => {
  if (data.name) {
    const existing = await BookCategory.findOne({
      name: data.name,
      _id: { $ne: id },
    }).collation({ locale: 'en', strength: 2 });

    if (existing) {
      throw { statusCode: 409, message: 'Category name already exists' };
    }
  }

  const cat = await BookCategory.findByIdAndUpdate(
    id,
    { $set: data },
    { returnDocument: 'after', runValidators: true }
  );

  if (!cat) {
    throw { statusCode: 404, message: 'Category not found' };
  }

  return cat;
};

// ---------- BOOKS ----------
exports.createBook = async (data) => {
  const dup = await Book.findOne({ bookCode: data.bookCode });
  if (dup) {
    throw { statusCode: 409, message: 'Book code already exists' };
  }

  const cat = await BookCategory.findById(data.category);
  if (!cat) {
    throw { statusCode: 400, message: 'Category not found' };
  }

  return Book.create({
    ...data,
    availableQty: data.totalQty,
  });
};

exports.listBooks = async (query) => {
  const filter = {};

  if (query.q) {
    filter.$or = [
      { title: { $regex: query.q, $options: 'i' } },
      { author: { $regex: query.q, $options: 'i' } },
      { bookCode: { $regex: query.q, $options: 'i' } },
    ];
  }

  if (query.category) filter.category = query.category;
  if (query.status) filter.status = query.status;

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    Book.find(filter)
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Book.countDocuments(filter),
  ]);

  return { rows, total, page, limit };
};

exports.getBook = async (id) => {
  const book = await Book.findById(id).populate('category', 'name');
  if (!book) {
    throw { statusCode: 404, message: 'Book not found' };
  }
  return book;
};

exports.updateBook = async (id, data) => {
  const existing = await Book.findById(id);
  if (!existing) {
    throw { statusCode: 404, message: 'Book not found' };
  }

  if (data.bookCode && data.bookCode !== existing.bookCode) {
    const dup = await Book.findOne({
      bookCode: data.bookCode,
      _id: { $ne: id },
    });
    if (dup) {
      throw { statusCode: 409, message: 'Book code already exists' };
    }
  }

  if (data.category) {
    const cat = await BookCategory.findById(data.category);
    if (!cat) {
      throw { statusCode: 400, message: 'Category not found' };
    }
  }

  if (typeof data.totalQty === 'number') {
    const issued = existing.totalQty - existing.availableQty;

    if (data.totalQty < issued) {
      throw {
        statusCode: 400,
        message: `Total qty cannot be less than issued count (${issued})`,
      };
    }

    const delta = data.totalQty - existing.totalQty;
    data.availableQty = existing.availableQty + delta;
  }

  return Book.findByIdAndUpdate(
    id,
    { $set: data },
    { returnDocument: 'after', runValidators: true }
  );
};

exports.updateStatus = async (id, status) => {
  const book = await Book.findByIdAndUpdate(
    id,
    { status },
    { returnDocument: 'after', runValidators: true }
  );

  if (!book) {
    throw { statusCode: 404, message: 'Book not found' };
  }

  return book;
};

// ---------- ISSUES ----------
// ---------- ISSUE BOOK ----------
exports.issueBook = async (data, issuedByUserId) => {

  // Step 1: Find student using full name (case-insensitive)
  const students = await Student.find({
    full_name: data.studentName.trim()
  })
    .collation({ locale: 'en', strength: 2 })
    .select('_id full_name student_id email status');

  if (!students.length) {
    throw {
      statusCode: 404,
      message: `Student not found: ${data.studentName}`
    };
  }

  // Prevent issuing to the wrong student if names are duplicated
  if (students.length > 1) {
    throw {
      statusCode: 409,
      message: 'Multiple students found with this name. Please use a unique student name.'
    };
  }

  const student = students[0];

  // Step 2: Check student status
  if (student.status !== 'active') {
    throw {
      statusCode: 400,
      message: `Cannot issue book. Student status is ${student.status}.`
    };
  }

  // Step 3: Atomically reserve a copy
  const book = await Book.findOneAndUpdate(
    {
      _id: data.bookId,
      availableQty: { $gt: 0 },
      status: 'active'
    },
    {
      $inc: { availableQty: -1 }
    },
    {
      returnDocument: 'after'
    }
  );

  if (!book) {
    throw {
      statusCode: 400,
      message: 'Book not available or out of stock'
    };
  }

  // Step 4: Create issue record
  try {
    const issue = await BookIssue.create({
      book: data.bookId,
      student: student._id,
      issueDate: new Date(),
      dueDate: new Date(data.dueDate),
      issuedBy: issuedByUserId
    });

    // Step 5: Return populated details
    return await BookIssue.findById(issue._id)
      .populate('book', 'title author bookCode')
      .populate('student', 'full_name student_id email')
      .populate('issuedBy', 'name');

  } catch (err) {

    // Rollback stock if issue creation fails
    await Book.findByIdAndUpdate(
      data.bookId,
      { $inc: { availableQty: 1 } }
    );

    throw err;
  }
};

exports.returnBook = async (issueId) => {
  const issue = await BookIssue.findById(issueId);

  if (!issue) {
    throw { statusCode: 404, message: 'Issue record not found' };
  }

  if (issue.status === 'returned') {
    throw { statusCode: 400, message: 'Book already returned' };
  }

  issue.status = 'returned';
  issue.returnDate = new Date();
  await issue.save();

  await Book.findByIdAndUpdate(issue.book, { $inc: { availableQty: 1 } });

  return issue;
};

exports.listIssues = async (query) => {
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.student) filter.student = query.student;
  if (query.book) filter.book = query.book;

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    BookIssue.find(filter)
      .populate('book', 'title author bookCode')
      .populate('student', 'full_name student_id email')
      .populate('issuedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    BookIssue.countDocuments(filter),
  ]);

  return {
    rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

exports.getOverdue = async () => {
  const today = new Date();

  return BookIssue.find({
    status: 'issued',
    dueDate: { $lt: today },
  })
    .populate('book', 'title author bookCode')
    .populate('student', 'full_name student_id email')
    .sort({ dueDate: 1 });
};

exports.getStudentHistory = async (studentId) => {
  return BookIssue.find({ student: studentId })
    .populate('book', 'title author bookCode')
    .populate('student', 'full_name student_id email')
    .sort({ createdAt: -1 });
};

// NEW: student self-history (used when a student calls the endpoint)
exports.getStudentHistoryForUser = async (userId) => {
  const student = await Student.findOne({ user_id: userId }).select('_id');
  if (!student) {
    throw { statusCode: 404, message: 'Student profile not found' };
  }

  return BookIssue.find({ student: student._id })
    .populate('book', 'title author bookCode')
    .sort({ createdAt: -1 });
};

// ---------- SOFT DELETES ----------
exports.deleteCategory = async (id) => {
  const booksCount = await Book.countDocuments({ category: id });

  if (booksCount > 0) {
    throw {
      statusCode: 400,
      message: 'Cannot delete category because it has books assigned to it.',
    };
  }

  const cat = await BookCategory.findByIdAndDelete(id);

  if (!cat) {
    throw { statusCode: 404, message: 'Category not found' };
  }

  return cat;
};




// ============ STUDENT SELF-HISTORY ============
exports.getMyBorrowedBooks = async (userId) => {
  const Student = require('../../students/models/Student');

  const student = await Student.findOne({ user_id: userId }).select('_id');
  if (!student) {
    throw { statusCode: 404, message: 'Student profile not found' };
  }

  // Currently issued (not returned)
  const current = await BookIssue.find({
    student: student._id,
    status: 'issued',
  })
    .populate('book', 'title author bookCode')
    .sort({ dueDate: 1 });

  // Past (returned)
  const history = await BookIssue.find({
    student: student._id,
    status: 'returned',
  })
    .populate('book', 'title author bookCode')
    .sort({ returnDate: -1 });

  const today = new Date();

  const currentWithOverdue = current.map((issue) => ({
    _id: issue._id,
    book: issue.book,
    issueDate: issue.issueDate,
    dueDate: issue.dueDate,
    status: issue.status,
    is_overdue: new Date(issue.dueDate) < today,
    days_overdue:
      new Date(issue.dueDate) < today
        ? Math.floor((today - new Date(issue.dueDate)) / (1000 * 60 * 60 * 24))
        : 0,
  }));

  return {
    currently_issued: currentWithOverdue,
    past_returns: history,
    total_issued: current.length,
    total_overdue: currentWithOverdue.filter((i) => i.is_overdue).length,
  };
};
// ---------- SOFT DELETE BOOK ----------
exports.deleteBook = async (id) => {
  // Check whether the book has active issues
  const activeIssues = await BookIssue.countDocuments({
    book: id,
    status: 'issued'
  });

  if (activeIssues > 0) {
    throw {
      statusCode: 400,
      message: 'Cannot delete book because it is currently issued. Please return it first.'
    };
  }

  // Retire the book instead of permanently deleting it
  const book = await Book.findByIdAndUpdate(
    id,
    { status: 'retired' },
    { returnDocument: 'after' }
  );

  if (!book) {
    throw {
      statusCode: 404,
      message: 'Book not found'
    };
  }

  return book;
};