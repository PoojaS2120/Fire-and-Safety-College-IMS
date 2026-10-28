const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../../../middlewares/auth');
// Make sure you use curly braces here: { authorize }
const { authorize } = require('../../../middlewares/authorize'); 

router.post('/', verifyToken, authorize('super_admin'), userController.createUser);
router.get('/', verifyToken, authorize('super_admin'), userController.getUsers);

module.exports = router;