// 
const Book = require('../models/Book');
const BookCategory = require('../models/BookCategory');
const BookIssue = require('../models/BookIssue');
const Student = require('../../students/models/Student');
const mongoose = require('mongoose');

// Resolve a staff member from the name typed in the form (same approach as studentName).
// Users who have a Student profile are excluded, so only staff can be picked.
const findStaffByName = async (name, label) => {
  let staff;
  try {
    const User = mongoose.model('User');

    const users = await User.find({ name: name.trim() })
      .collation({ locale: 'en', strength: 2 })
      .select('_id name');

    const studentProfiles = await Student.find({
      user_id: { $in: users.map((u) => u._id) }
    }).select('user_id');
    const studentUserIds = new Set(studentProfiles.map((s) => String(s.user_id)));

    staff = users.filter((u) => !studentUserIds.has(String(u._id)));
  } catch (err) {
    console.error('[library] findStaffByName failed:', err);
    throw err;
  }

  if (!staff.length) {
    throw { statusCode: 404, message: `${label} not found: ${name}` };
  }
  if (staff.length > 1) {
    throw {
      statusCode: 409,
      message: `Multiple staff found with name "${name}". Please use a unique name.`
    };
  }
  return staff[0];
};

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
exports.issueBook = async (data) => {

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

  // Step 2b: Find staff who is issuing the book
  const issuer = await findStaffByName(data.issuedByName, 'Issuing staff');

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
      issuedBy: issuer._id
    });

    // Step 5: Return populated details
    return await BookIssue.findById(issue._id)
      .populate('book', 'title author bookCode')
      .populate('student', 'full_name student_id email')
      .populate('issuedBy', 'name');

  } catch (err) {
    console.error('[library] issueBook create/populate failed:', err);

    // Rollback stock if issue creation fails
    await Book.findByIdAndUpdate(
      data.bookId,
      { $inc: { availableQty: 1 } }
    );

    throw err;
  }
};

// ---------- RETURN BOOK ----------
exports.returnBook = async (issueId, data = {}) => {
  const issue = await BookIssue.findById(issueId);
  if (!issue) throw { statusCode: 404, message: 'Issue record not found' };
  if (issue.status === 'returned') throw { statusCode: 400, message: 'Book already returned' };

  const returnedById = data.returnedBy || issue.student;
  const returner = await Student.exists({ _id: returnedById });
  if (!returner) throw { statusCode: 400, message: 'Returning student not found' };

  // Staff who is receiving the book
  const receiver = await findStaffByName(data.receivedByName, 'Receiving staff');

  const returnDate = data.returnDate ? new Date(data.returnDate) : new Date();
  if (returnDate < issue.issueDate) {
    throw { statusCode: 400, message: 'Return date cannot be before issue date' };
  }

  // Atomic guard: blocks duplicate/concurrent returns
  const updated = await BookIssue.findOneAndUpdate(
    { _id: issueId, status: { $ne: 'returned' } },
    {
      $set: {
        status: 'returned',
        returnDate,
        returnedBy: returnedById,
        receivedBy: receiver._id
      }
    },
    { returnDocument: 'after' }
  );
  if (!updated) throw { statusCode: 400, message: 'Book already returned' };

  await Book.findByIdAndUpdate(issue.book, { $inc: { availableQty: 1 } });

  return BookIssue.findById(updated._id)
    .populate('book', 'title author bookCode')
    .populate('student', 'full_name student_id email')
    .populate('issuedBy', 'name')
    .populate('returnedBy', 'full_name student_id')
    .populate('receivedBy', 'name');
};

// ---------- LIST ISSUES ----------
const DAY = 24 * 60 * 60 * 1000;
const decorateIssue = (i) => {
  const due = new Date(i.dueDate);
  if (i.status === 'returned') {
    const late = Math.max(0, Math.ceil((new Date(i.returnDate) - due) / DAY));
    return { ...i, isOverdue: false, daysRemaining: null, lateDays: late, returnedLate: late > 0 };
  }
  const diff = Math.ceil((due - new Date()) / DAY);
  return { ...i, isOverdue: diff < 0, daysRemaining: diff, lateDays: diff < 0 ? -diff : 0, returnedLate: false };
};

exports.listIssues = async (query) => {
  const filter = {};

  if (query.status === 'pending') filter.status = { $in: ['issued', 'overdue'] };
  else if (query.status) filter.status = query.status;

  if (query.student) filter.student = query.student;
  if (query.book) filter.book = query.book;
  if (query.issuedBy) filter.issuedBy = query.issuedBy;
  if (query.receivedBy) filter.receivedBy = query.receivedBy;

  if (query.from || query.to) {
    filter.returnDate = {};
    if (query.from) filter.returnDate.$gte = new Date(query.from);
    if (query.to) {
      const to = new Date(query.to);
      to.setHours(23, 59, 59, 999);
      filter.returnDate.$lte = to;
    }
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  const sort = query.status === 'returned' ? { returnDate: -1 } : { createdAt: -1 };

  const [rows, total] = await Promise.all([
    BookIssue.find(filter)
      .populate('book', 'title author bookCode')
      .populate('student', 'full_name student_id email')
      .populate('issuedBy', 'name')
      .populate('returnedBy', 'full_name student_id')
      .populate('receivedBy', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    BookIssue.countDocuments(filter),
  ]);

  return {
    rows: rows.map(decorateIssue),
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
    .populate('issuedBy', 'name')
    .populate('receivedBy', 'name')
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

// ============ STUDENT SELF-HISTORY / APK ============
exports.getMyBorrowedBooks = async (userId) => {
  const student = await Student.findOne({ user_id: userId }).select('_id');

  if (!student) {
    throw {
      statusCode: 404,
      message: 'Student profile not found',
    };
  }

  // Fetch ALL books issued to this student.
  // Returned books must remain visible in the APK.
  const allIssues = await BookIssue.find({
    student: student._id,
  })
    .populate({
      path: 'book',
      select: 'title author bookCode category',
      populate: {
        path: 'category',
        select: 'name',
      },
    })
    .sort({ createdAt: -1 });

  const today = new Date();

  const currentlyIssued = [];
  const pastReturns = [];

  allIssues.forEach((issue) => {
    const isReturned = issue.status === 'returned';
    const isOverdue =
      !isReturned && new Date(issue.dueDate) < today;

    const daysOverdue = isOverdue
      ? Math.floor(
          (today - new Date(issue.dueDate)) /
          (1000 * 60 * 60 * 24)
        )
      : 0;

    const bookDetails = {
      _id: issue._id,
      book: issue.book,
      issueDate: issue.issueDate,
      dueDate: issue.dueDate,
      returnDate: issue.returnDate || null,

      status: isReturned
        ? 'returned'
        : isOverdue
          ? 'overdue'
          : 'issued',

      is_overdue: isOverdue,
      days_overdue: daysOverdue,

      display_status: isReturned
        ? 'Returned / Submitted'
        : isOverdue
          ? 'Overdue'
          : 'Currently Issued',
    };

    if (isReturned) {
      pastReturns.push(bookDetails);
    } else {
      currentlyIssued.push(bookDetails);
    }
  });

  return {
    currently_issued: currentlyIssued,
    past_returns: pastReturns,

    total_issued: currentlyIssued.length,
    total_returned: pastReturns.length,

    total_overdue: currentlyIssued.filter(
      (book) => book.is_overdue
    ).length,

    total_books: allIssues.length,
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