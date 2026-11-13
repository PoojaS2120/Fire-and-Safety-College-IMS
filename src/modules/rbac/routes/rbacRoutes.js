const express = require('express');
const router = express.Router();
const rbacController = require('../controllers/rbacController');
const { verifyToken } = require('../../../middlewares/auth');
const requirePermission = require('../../../middlewares/requirePermission');

// Only Super Admin (or someone with users.manage) can manage roles
router.use(verifyToken, requirePermission('users.manage'));

router.get('/permissions', rbacController.getAllPermissions);
router.get('/roles', rbacController.getAllRoles);
router.post('/roles', rbacController.createRole); // <-- MUST BE HERE
router.put('/roles/:roleId/permissions', rbacController.updateRolePermissions);
// Add this at the bottom with the other routes
router.delete('/roles/:roleId', rbacController.deleteRole);
module.exports = router;