// const express = require('express');
// const router = express.Router();
// const subjectController = require('../controllers/subjectController');
// const { verifyToken } = require('../../../middlewares/auth');
// const { authorize } = require('../../../middlewares/authorize');

// // All routes require login and specific roles
// router.use(verifyToken, authorize('super_admin', 'office_staff'));

// // CRUD Routes
// router.post('/', subjectController.createSubject);
// router.get('/', subjectController.getSubjects);
// router.get('/:id', subjectController.getSubjectById);
// router.put('/:id', subjectController.updateSubject);
// router.delete('/:id', subjectController.deleteSubject);

// module.exports = router;


const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const { verifyToken } = require('../../../middlewares/auth');
const { authorizeOrPermission } = require('../../../middlewares/authorize');

// Role names keep working; any role / user with the matching permission code (permissionCatalog) is allowed too
const can = (action) => authorizeOrPermission(`course_master.subjects.${action}`, 'super_admin', 'office_staff');

router.use(verifyToken);

router.post('/', can('create'), subjectController.createSubject);
router.get('/', can('view'), subjectController.getSubjects);
router.get('/:id', can('view'), subjectController.getSubjectById);
router.put('/:id', can('update'), subjectController.updateSubject);
router.delete('/:id', can('delete'), subjectController.deleteSubject);

module.exports = router;