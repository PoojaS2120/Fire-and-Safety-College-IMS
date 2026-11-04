const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/libraryController');
const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

// All routes require login
router.use(verifyToken);

// ---------- CATEGORIES ----------
router.get(
  '/categories',
  authorize('super_admin', 'office_staff', 'librarian', 'student'),
  libraryController.listCategories
);
router.post('/categories', authorize('super_admin', 'librarian'), libraryController.createCategory);
router.put('/categories/:id', authorize('super_admin', 'librarian'), libraryController.updateCategory);
router.delete('/categories/:id', authorize('super_admin'), libraryController.deleteCategory);

// ---------- BOOKS ----------
router.get(
  '/books',
  authorize('super_admin', 'office_staff', 'librarian', 'student'),
  libraryController.listBooks
);
router.post('/books', authorize('super_admin', 'librarian'), libraryController.createBook);
router.get(
  '/books/:id',
  authorize('super_admin', 'office_staff', 'librarian', 'student'),
  libraryController.getBook
);
router.put('/books/:id', authorize('super_admin', 'librarian'), libraryController.updateBook);
router.put('/books/:id/status', authorize('super_admin', 'librarian'), libraryController.updateStatus);
router.delete('/books/:id', authorize('super_admin'), libraryController.deleteBook);

// ---------- ISSUES ----------
router.post('/issues', authorize('super_admin', 'librarian'), libraryController.issueBook);
router.put('/issues/:id/return', authorize('super_admin', 'librarian'), libraryController.returnBook);
router.get(
  '/issues',
  authorize('super_admin', 'office_staff', 'librarian'),
  libraryController.listIssues
);

// ---------- OVERDUE ----------
router.get(
  '/overdue',
  authorize('super_admin', 'office_staff', 'librarian'),
  libraryController.getOverdue
);

// ---------- STUDENT HISTORY ----------
// APK-friendly: returns the logged-in student's own history
router.get(
  '/my-history',
  authorize('student'),
  libraryController.getStudentHistory
);

// Admin endpoint: view any student's history
router.get(
  '/students/:id/history',
  authorize('super_admin', 'office_staff', 'librarian', 'student'),
  libraryController.getStudentHistory
);
// Student: own borrowing history (currently issued + past)
router.get(
  '/my-books',
  authorize('student'),
  libraryController.getMyBorrowedBooks
);

module.exports = router;