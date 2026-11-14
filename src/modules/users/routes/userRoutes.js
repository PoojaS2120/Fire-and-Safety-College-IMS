// const express = require('express');
// const router = express.Router();
// const userController = require('../controllers/userController');
// const { verifyToken } = require('../../../middlewares/auth');
// const { authorize } = require('../../../middlewares/authorize');

// // All routes here require a valid token and Super Admin role
// router.use(verifyToken, authorize('super_admin'));

// router.route('/')
//   .post(userController.createUser)  // POST /api/v1/users
//   .get(userController.getUsers);    // GET /api/v1/users

// router.route('/:id')
//   .get(userController.getUserById)  // GET /api/v1/users/:id
//   .put(userController.updateUser);  // PUT /api/v1/users/:id

// router.patch('/:id/status', userController.toggleStatus);          // PATCH /api/v1/users/:id/status
// router.post('/:id/reset-password', userController.adminResetPassword); // POST /api/v1/users/:id/reset-password

// module.exports = router;



const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');
const validate = require('../../../middlewares/validate');
const {
  listUsersSchema,
  adminResetPasswordSchema,
} = require('../validations/userValidation');

// All routes here require a valid token and Super Admin role
router.use(verifyToken, authorize('super_admin'));

router.route('/')
  .post(userController.createUser)
  .get(validate(listUsersSchema, 'query'), userController.getUsers);

router.route('/:id')
  .get(userController.getUserById)
  .put(userController.updateUser);

router.patch('/:id/status', userController.toggleStatus);
router.post(
  '/:id/reset-password',
  validate(adminResetPasswordSchema),
  userController.adminResetPassword
);

module.exports = router;
