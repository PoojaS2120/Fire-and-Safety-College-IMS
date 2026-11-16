const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

// All routes require login and specific roles
router.use(verifyToken, authorize('super_admin', 'office_staff'));

// CRUD Routes
router.post('/', subjectController.createSubject);
router.get('/', subjectController.getSubjects);
router.get('/:id', subjectController.getSubjectById);
router.put('/:id', subjectController.updateSubject);
router.delete('/:id', subjectController.deleteSubject);

module.exports = router;