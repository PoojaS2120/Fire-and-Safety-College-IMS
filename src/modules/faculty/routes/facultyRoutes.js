const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/facultyController');
const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

// Super Admin can assign and remove assignments
router.post('/', verifyToken, authorize('super_admin'), facultyController.assignFaculty);
router.delete('/:id', verifyToken, authorize('super_admin'), facultyController.removeAssignment);

// Super Admin can see all. Faculty can see their own (handled in controller/service based on query)
router.get('/', verifyToken, authorize('super_admin', 'faculty'), facultyController.getAssignments);

module.exports = router;