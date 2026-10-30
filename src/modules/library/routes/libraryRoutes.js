const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/libraryController');
const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

// All routes require login
router.use(verifyToken);

// Categories
router.get('/categories', authorize('super_admin', 'office_staff', 'librarian'), libraryController.listCategories);
router.post('/categories', authorize('super_admin', 'librarian'), libraryController.createCategory);
router.put('/categories/:id', authorize('super_admin', 'librarian'), libraryController.updateCategory);
// 👇 NEW DELETE ROUTE FOR CATEGORY
router.delete('/categories/:id', authorize('super_admin'), libraryController.deleteCategory);

// Books
router.get('/books', authorize('super_admin', 'office_staff', 'librarian'), libraryController.listBooks);
router.post('/books', authorize('super_admin', 'librarian'), libraryController.createBook);
router.get('/books/:id', authorize('super_admin', 'office_staff', 'librarian'), libraryController.getBook);
router.put('/books/:id', authorize('super_admin', 'librarian'), libraryController.updateBook);
router.put('/books/:id/status', authorize('super_admin', 'librarian'), libraryController.updateStatus);
// 👇 NEW DELETE ROUTE FOR BOOK
router.delete('/books/:id', authorize('super_admin'), libraryController.deleteBook);

// Issues
router.post('/issues', authorize('super_admin', 'librarian'), libraryController.issueBook);
router.put('/issues/:id/return', authorize('super_admin', 'librarian'), libraryController.returnBook);
router.get('/issues', authorize('super_admin', 'office_staff', 'librarian'), libraryController.listIssues);

// Overdue & History
router.get('/overdue', authorize('super_admin', 'office_staff', 'librarian'), libraryController.getOverdue);
router.get('/students/:id/history', authorize('super_admin', 'office_staff', 'librarian', 'student'), libraryController.getStudentHistory);

// IMPORTANT: Export the router!
module.exports = router;