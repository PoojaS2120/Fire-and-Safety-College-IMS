const libraryService = require('../services/libraryService');
const { 
  createCategorySchema, updateCategorySchema, 
  createBookSchema, updateBookSchema, updateStatusSchema,
  issueBookSchema
} = require('../validations/libraryValidation');

// ---------- CATEGORIES ----------
exports.listCategories = async (req, res, next) => {
  try {
    const data = await libraryService.listCategories();
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { error } = createCategorySchema.validate(req.body);
    if (error) throw { statusCode: 400, message: error.details[0].message };

    const data = await libraryService.createCategory(req.body);
    res.status(201).json({ success: true, message: 'Category created', data });
  } catch (error) { next(error); }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const { error } = updateCategorySchema.validate(req.body);
    if (error) throw { statusCode: 400, message: error.details[0].message };

    const data = await libraryService.updateCategory(req.params.id, req.body);
    res.status(200).json({ success: true, message: 'Category updated', data });
  } catch (error) { next(error); }
};

// ---------- BOOKS ----------
exports.listBooks = async (req, res, next) => {
  try {
    const result = await libraryService.listBooks(req.query);
    res.status(200).json({ success: true, data: result.rows, meta: { page: result.page, limit: result.limit, total: result.total } });
  } catch (error) { next(error); }
};

exports.getBook = async (req, res, next) => {
  try {
    const data = await libraryService.getBook(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.createBook = async (req, res, next) => {
  try {
    const { error } = createBookSchema.validate(req.body);
    if (error) throw { statusCode: 400, message: error.details[0].message };

    const data = await libraryService.createBook(req.body);
    res.status(201).json({ success: true, message: 'Book created', data });
  } catch (error) { next(error); }
};

exports.updateBook = async (req, res, next) => {
  try {
    const { error } = updateBookSchema.validate(req.body);
    if (error) throw { statusCode: 400, message: error.details[0].message };

    const data = await libraryService.updateBook(req.params.id, req.body);
    res.status(200).json({ success: true, message: 'Book updated', data });
  } catch (error) { next(error); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { error } = updateStatusSchema.validate(req.body);
    if (error) throw { statusCode: 400, message: error.details[0].message };

    const data = await libraryService.updateStatus(req.params.id, req.body.status);
    res.status(200).json({ success: true, message: 'Status updated', data });
  } catch (error) { next(error); }
};

// ---------- ISSUES ----------
exports.issueBook = async (req, res, next) => {
  try {
    const { error } = issueBookSchema.validate(req.body);
    if (error) throw { statusCode: 400, message: error.details[0].message };
    
    const data = await libraryService.issueBook(req.body, req.user.id);
    res.status(201).json({ success: true, message: 'Book issued successfully', data });
  } catch (error) { next(error); }
};

exports.returnBook = async (req, res, next) => {
  try {
    const data = await libraryService.returnBook(req.params.id);
    res.status(200).json({ success: true, message: 'Book returned successfully', data });
  } catch (error) { next(error); }
};

exports.listIssues = async (req, res, next) => {
  try {
    const data = await libraryService.listIssues(req.query);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.getOverdue = async (req, res, next) => {
  try {
    const data = await libraryService.getOverdue();
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.getStudentHistory = async (req, res, next) => {
  try {
    if (req.user.role === 'student' && req.user.id !== req.params.id) {
      throw { statusCode: 403, message: 'Access denied: You can only view your own history' };
    }
    const data = await libraryService.getStudentHistory(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

// ---------- SOFT DELETES ----------
exports.deleteCategory = async (req, res, next) => {
  try {
    const data = await libraryService.deleteCategory(req.params.id);
    res.status(200).json({ success: true, message: 'Category deleted', data });
  } catch (error) { next(error); }
};

exports.deleteBook = async (req, res, next) => {
  try {
    const data = await libraryService.deleteBook(req.params.id);
    res.status(200).json({ success: true, message: 'Book deleted (retired)', data });
  } catch (error) { next(error); }
};