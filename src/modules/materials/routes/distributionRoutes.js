const express = require('express');
const router = express.Router();

const controller = require('../controllers/distributionController');
const v = require('../validations/distributionValidation');
const { verifyToken } = require('../../../middlewares/auth');
const { authorize, authorizeOrPermission } = require('../../../middlewares/authorize');

// Permission codes come from config/permissionCatalog.js
// (module 'STUDY MATERIAL', page 'Material Distribution').
const P = 'study_material.material_distribution';
const STAFF = ['super_admin', 'office_staff'];

const can = (action) => authorizeOrPermission(`${P}.${action}`, ...STAFF);

router.use(verifyToken);

/* ---- Settings (college sender address) ---- */
router.get('/settings', can('view'), controller.getSettings);
router.put('/settings', authorize('super_admin'), v.validateSettings, controller.updateSettings);

/* ---- Dashboard / lists / reports (static paths BEFORE /:id) ---- */
router.get('/students', can('view'), controller.listStudents);
router.get('/summary', can('view'), controller.summary);
router.get('/export', can('export'), controller.export);
router.get('/student/:studentId/history', can('view'), controller.studentHistory);

/* ---- Create ---- */
router.post('/hand', can('create'), v.validateHand, controller.createHand);
router.post('/post', can('create'), v.validatePost, controller.createPost);
router.post('/courier', can('create'), v.validateCourier, controller.createCourier);

/* ---- List / detail / updates ---- */
router.get('/', can('view'), controller.list);
router.get('/:id', can('view'), controller.getOne);
router.get('/:id/label', can('view'), controller.label);
router.patch('/:id/status', can('update'), v.validateStatus, controller.updateStatus);
router.patch('/:id/tracking', can('update'), v.validateTracking, controller.updateTracking);
router.patch('/:id/address', can('update'), v.validateAddress, controller.updateAddress);

module.exports = router;