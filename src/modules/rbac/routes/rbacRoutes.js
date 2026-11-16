// const express = require('express');
// const router = express.Router();
// const rbacController = require('../controllers/rbacController');
// const { verifyToken } = require('../../../middlewares/auth');
// const requirePermission = require('../../../middlewares/requirePermission');

// // Only Super Admin (or someone with users.manage) can manage roles
// router.use(verifyToken, requirePermission('users.manage'));

// router.get('/permissions', rbacController.getAllPermissions);
// router.get('/roles', rbacController.getAllRoles);
// router.post('/roles', rbacController.createRole); // <-- MUST BE HERE
// router.put('/roles/:roleId/permissions', rbacController.updateRolePermissions);
// // Add this at the bottom with the other routes
// router.delete('/roles/:roleId', rbacController.deleteRole);
// module.exports = router;



const express = require('express');
const router = express.Router();
const rbacController = require('../controllers/rbacController');
const userPermissionController = require('../controllers/userPermissionController');
const { verifyToken } = require('../../../middlewares/auth');
const requirePermission = require('../../../middlewares/requirePermission');

router.use(verifyToken, requirePermission('users.manage'));

// Roles
router.get('/permissions', rbacController.getAllPermissions);
router.get('/roles', rbacController.getAllRoles);
router.post('/roles', rbacController.createRole);
router.put('/roles/:roleId/permissions', rbacController.updateRolePermissions);
router.delete('/roles/:roleId', rbacController.deleteRole);

// User-wise permissions
router.get('/users/:userId/permissions', userPermissionController.getUserPermissions);
router.put('/users/:userId/permissions', userPermissionController.updateUserPermissions);
router.delete('/users/:userId/permissions', userPermissionController.resetUserPermissions);

module.exports = router;