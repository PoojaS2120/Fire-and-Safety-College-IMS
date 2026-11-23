
// const express = require('express');
// const router = express.Router();

// const { verifyToken } = require('../../../middlewares/auth');
// const { authorize } = require('../../../middlewares/authorize');

// const iCardController = require('../controllers/iCardController');

// router.use(verifyToken);

// // CREATE I-CARD
// router.post(
//   '/',
//   authorize('super_admin', 'office_staff'),
//   iCardController.createICard
// );

// // GET ALL SAVED I-CARDS
// router.get(
//   '/',
//   authorize('super_admin', 'office_staff'),
//   iCardController.getAllICards
// );

// // LIST ELIGIBLE STUDENTS
// router.get(
//   '/students',
//   authorize('super_admin', 'office_staff'),
//   iCardController.getICardStudents
// );

// // PREVIEW STUDENT I-CARD
// router.get(
//   '/students/:studentId',
//   authorize('super_admin', 'office_staff'),
//   iCardController.getICardByStudentId
// );

// // GET SINGLE SAVED I-CARD
// router.get(
//   '/:id',
//   authorize('super_admin', 'office_staff'),
//   iCardController.getICardById
// );

// // UPDATE I-CARD
// router.put(
//   '/:id',
//   authorize('super_admin', 'office_staff'),
//   iCardController.updateICard
// );

// // DELETE I-CARD (SUPER ADMIN ONLY)
// router.delete(
//   '/:id',
//   authorize('super_admin'),
//   iCardController.deleteICard
// );

// module.exports = router;



const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');
const validate = require('../../../middlewares/validate'); // Ensure path is correct

const iCardController = require('../controllers/iCardController');
const {
  createICardSchema,
  updateICardSchema,
  listSavedICardsSchema,
  listICardStudentsSchema
} = require('../validations/iCardValidation');

router.use(verifyToken);

// ================= SAVED I-CARDS =================
router.route('/')
  .get(
    authorize('super_admin', 'office_staff'),
    validate(listSavedICardsSchema, 'query'),
    iCardController.getAllICards
  )
  .post(
    authorize('super_admin', 'office_staff'),
    validate(createICardSchema),
    iCardController.createICard
  );

// ================= STUDENT SELECTION & PREVIEW =================
router.get(
  '/students',
  authorize('super_admin', 'office_staff'),
  validate(listICardStudentsSchema, 'query'),
  iCardController.getICardStudents
);

router.get(
  '/students/:studentId',
  authorize('super_admin', 'office_staff'),
  iCardController.getICardByStudentId
);

router.get(
  '/students/:studentId/photo',
  authorize('super_admin', 'office_staff'),
  iCardController.getICardPhoto
);

// ================= SINGLE SAVED I-CARD =================
router.route('/:id')
  .get(
    authorize('super_admin', 'office_staff'),
    iCardController.getICardById
  )
  .put(
    authorize('super_admin', 'office_staff'),
    validate(updateICardSchema),
    iCardController.updateICard
  )
  .delete(
    authorize('super_admin'),
    iCardController.deleteICard
  );

module.exports = router;