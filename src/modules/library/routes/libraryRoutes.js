// const express = require('express');
// const router = express.Router();
// const libraryController = require('../controllers/libraryController');
// const { verifyToken } = require('../../../middlewares/auth');
// const { authorize } = require('../../../middlewares/authorize');

// // All routes require login
// router.use(verifyToken);

// // ---------- CATEGORIES ----------
// router.get(
//   '/categories',
//   authorize('super_admin', 'office_staff', 'librarian', 'student'),
//   libraryController.listCategories
// );
// router.post('/categories', authorize('super_admin', 'librarian'), libraryController.createCategory);
// router.put('/categories/:id', authorize('super_admin', 'librarian'), libraryController.updateCategory);
// router.delete(
//   '/categories/:id',
//   authorize('super_admin', 'librarian'),
//   libraryController.deleteCategory
// );
// // ---------- BOOKS ----------
// router.get(
//   '/books',
//   authorize('super_admin', 'office_staff', 'librarian', 'student'),
//   libraryController.listBooks
// );
// router.post('/books', authorize('super_admin', 'librarian'), libraryController.createBook);
// router.get(
//   '/books/:id',
//   authorize('super_admin', 'office_staff', 'librarian', 'student'),
//   libraryController.getBook
// );
// router.put('/books/:id', authorize('super_admin', 'librarian'), libraryController.updateBook);
// router.put('/books/:id/status', authorize('super_admin', 'librarian'), libraryController.updateStatus);
// router.delete(
//   '/books/:id',
//   authorize('super_admin', 'librarian'),
//   libraryController.deleteBook
// );
// // ---------- ISSUES ----------
// router.post('/issues', authorize('super_admin', 'librarian'), libraryController.issueBook);
// router.put('/issues/:id/return', authorize('super_admin', 'librarian'), libraryController.returnBook);
// router.get(
//   '/issues',
//   authorize('super_admin', 'office_staff', 'librarian'),
//   libraryController.listIssues
// );

// // ---------- OVERDUE ----------
// router.get(
//   '/overdue',
//   authorize('super_admin', 'office_staff', 'librarian'),
//   libraryController.getOverdue
// );

// // ---------- STUDENT HISTORY ----------
// // APK-friendly: returns the logged-in student's own history
// router.get(
//   '/my-history',
//   authorize('student'),
//   libraryController.getStudentHistory
// );

// // Admin endpoint: view any student's history
// router.get(
//   '/students/:id/history',
//   authorize('super_admin', 'office_staff', 'librarian', 'student'),
//   libraryController.getStudentHistory
// );
// // Student: own borrowing history (currently issued + past)
// router.get(
//   '/my-books',
//   authorize('student'),
//   libraryController.getMyBorrowedBooks
// );

// module.exports = router;

//changes done by sakshi 
const express = require('express');
const router = express.Router();

const libraryController = require('../controllers/libraryController');
const { verifyToken } = require('../../../middlewares/auth');

// Allowed when the user has the role OR any of the permission codes (from Roles & Permissions / User Permissions).
// So a faculty member given "library.books.view" can open the books list, like a librarian can.
const allow = (permissions, ...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized: User not found' });
  }
  const have = req.user.permissions || [];
  if (roles.includes(req.user.role) || have.includes('*') || permissions.some((p) => have.includes(p))) {
    return next();
  }
  return res.status(403).json({
    success: false,
    code: 'FORBIDDEN',
    message: 'You do not have permission to perform this action',
  });
};

// permission codes: library.<page>.<action>
const BOOKS = (action) => [`library.books.${action}`];
const CATEGORIES = (action) => [`library.categories.${action}`];
// Issue / return can be granted on either page ("Issues" or "Issue And Return")
const ISSUES = (action) => [`library.issues.${action}`, `library.issue_and_return.${action}`];

router.use(verifyToken);

/* ───── Categories ───── */
router.get('/categories', allow(CATEGORIES('view'), 'super_admin', 'office_staff', 'librarian', 'student'), libraryController.listCategories);
router.post('/categories', allow(CATEGORIES('create'), 'super_admin', 'librarian'), libraryController.createCategory);
router.put('/categories/:id', allow(CATEGORIES('update'), 'super_admin', 'librarian'), libraryController.updateCategory);
router.delete('/categories/:id', allow(CATEGORIES('delete'), 'super_admin', 'librarian'), libraryController.deleteCategory);

/* ───── Books ───── */
router.get('/books', allow(BOOKS('view'), 'super_admin', 'office_staff', 'librarian', 'student'), libraryController.listBooks);
router.post('/books', allow(BOOKS('create'), 'super_admin', 'librarian'), libraryController.createBook);
router.get('/books/:id', allow(BOOKS('view'), 'super_admin', 'office_staff', 'librarian', 'student'), libraryController.getBook);
router.put('/books/:id', allow(BOOKS('update'), 'super_admin', 'librarian'), libraryController.updateBook);
router.put('/books/:id/status', allow(BOOKS('update'), 'super_admin', 'librarian'), libraryController.updateStatus);
router.delete('/books/:id', allow(BOOKS('delete'), 'super_admin', 'librarian'), libraryController.deleteBook);

/* ───── Issue / return ───── */
router.post('/issues', allow(ISSUES('create'), 'super_admin', 'librarian'), libraryController.issueBook);
router.put('/issues/:id/return', allow(ISSUES('update'), 'super_admin', 'librarian'), libraryController.returnBook);
router.get('/issues', allow(ISSUES('view'), 'super_admin', 'office_staff', 'librarian'), libraryController.listIssues);
router.get('/overdue', allow(ISSUES('view'), 'super_admin', 'office_staff', 'librarian'), libraryController.getOverdue);

/* ───── Student history ───── */
router.get('/my-history', allow([], 'student'), libraryController.getStudentHistory);
router.get('/students/:id/history', allow(ISSUES('view'), 'super_admin', 'office_staff', 'librarian', 'student'), libraryController.getStudentHistory);
router.get('/my-books', allow([], 'student'), libraryController.getMyBorrowedBooks);

module.exports = router;
