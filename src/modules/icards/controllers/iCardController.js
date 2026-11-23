
// const iCardService = require('../services/iCardService');

// const {
//   listICardStudentsSchema,
//   createICardSchema,
//   updateICardSchema,
//   listSavedICardsSchema,
// } = require('../validations/iCardValidation');

// function validate(schema, data, res) {
//   const { error, value } = schema.validate(data, {
//     abortEarly: true,
//     stripUnknown: true,
//     convert: true,
//   });

//   if (error) {
//     res.status(400).json({
//       success: false,
//       message: error.details[0].message,
//     });

//     return null;
//   }

//   return value;
// }

// // GET ELIGIBLE STUDENTS
// exports.getICardStudents = async (req, res, next) => {
//   try {
//     const query = validate(listICardStudentsSchema, req.query, res);
//     if (!query) return;

//     const result = await iCardService.getICardStudents(query);

//     return res.status(200).json({
//       success: true,
//       message: 'I-Card students fetched successfully.',
//       data: result.students,
//       meta: result.meta,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // PREVIEW STUDENT I-CARD
// exports.getICardByStudentId = async (req, res, next) => {
//   try {
//     const result = await iCardService.getICardByStudentId(
//       req.params.studentId
//     );

//     return res.status(200).json({
//       success: true,
//       message: 'I-Card details fetched successfully.',
//       data: result,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // CREATE I-CARD
// exports.createICard = async (req, res, next) => {
//   try {
//     const body = validate(createICardSchema, req.body, res);
//     if (!body) return;

//     const result = await iCardService.createICard(
//       body,
//       req.user?.id || req.user?._id
//     );

//     return res.status(201).json({
//       success: true,
//       message: 'I-Card created successfully.',
//       data: result,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // GET ALL SAVED I-CARDS
// exports.getAllICards = async (req, res, next) => {
//   try {
//     const query = validate(listSavedICardsSchema, req.query, res);
//     if (!query) return;

//     const result = await iCardService.getAllICards(query);

//     return res.status(200).json({
//       success: true,
//       message: 'I-Cards fetched successfully.',
//       data: result.cards,
//       meta: result.meta,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // GET SINGLE SAVED I-CARD
// exports.getICardById = async (req, res, next) => {
//   try {
//     const result = await iCardService.getICardById(req.params.id);

//     return res.status(200).json({
//       success: true,
//       message: 'I-Card details fetched successfully.',
//       data: result,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // UPDATE I-CARD
// exports.updateICard = async (req, res, next) => {
//   try {
//     const body = validate(updateICardSchema, req.body, res);
//     if (!body) return;

//     const result = await iCardService.updateICard(
//       req.params.id,
//       body,
//       req.user?.id || req.user?._id
//     );

//     return res.status(200).json({
//       success: true,
//       message: 'I-Card updated successfully.',
//       data: result,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // DELETE I-CARD
// exports.deleteICard = async (req, res, next) => {
//   try {
//     const result = await iCardService.deleteICard(req.params.id);

//     return res.status(200).json({
//       success: true,
//       message: 'I-Card deleted successfully.',
//       data: {
//         _id: result._id,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };



const iCardService = require('../services/iCardService');
const { listICardStudentsSchema } = require('../validations/iCardValidation');

// ================= LIST STUDENTS (FOR DROPDOWN) =================
exports.getICardStudents = async (req, res, next) => {
  try {
    const { error, value } = listICardStudentsSchema.validate(req.query, {
      abortEarly: true,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const result = await iCardService.getICardStudents(value);

    return res.status(200).json({
      success: true,
      message: 'I-Card students fetched successfully.',
      data: result.students,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

// ================= GET STUDENT DETAILS FOR PREVIEW =================
exports.getICardByStudentId = async (req, res, next) => {
  try {
    const result = await iCardService.getICardByStudentId(req.params.studentId);

    return res.status(200).json({
      success: true,
      message: 'I-Card details fetched successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ================= GET STUDENT PHOTO =================
exports.getICardPhoto = async (req, res, next) => {
  try {
    const { absolute, mimeType } = await iCardService.getICardPhotoFile(req.params.studentId);

    res.set('Content-Type', mimeType);
    res.set('Cache-Control', 'private, max-age=300');
    
    return res.sendFile(absolute, (err) => {
      if (err && !res.headersSent) {
        res.status(404).json({ success: false, message: 'Student photo not found.' });
      }
    });
  } catch (error) {
    next(error);
  }
};

// ================= GET ALL SAVED I-CARDS =================
exports.getAllICards = async (req, res, next) => {
  try {
    // ✅ FIX: Call getAllICards, NOT getICardStudents
    const result = await iCardService.getAllICards(req.query);
    
    res.status(200).json({
      success: true,
      data: result.cards, // Maps to the saved cards array
      meta: result.meta,  // Maps to { page, limit, total, totalPages }
    });
  } catch (err) {
    next(err);
  }
};

// ================= GET SINGLE SAVED I-CARD =================
exports.getICardById = async (req, res, next) => {
  try {
    const result = await iCardService.getICardById(req.params.id);
    res.status(200).json({ success: true, data: result.card });
  } catch (err) {
    next(err);
  }
};

// ================= CREATE I-CARD =================
exports.createICard = async (req, res, next) => {
  try {
    const card = await iCardService.createICard(req.body, req.user.id);
    res.status(201).json({ success: true, message: 'I-Card created successfully', data: card });
  } catch (err) {
    next(err);
  }
};

// ================= UPDATE I-CARD =================
exports.updateICard = async (req, res, next) => {
  try {
    const card = await iCardService.updateICard(req.params.id, req.body, req.user.id);
    res.status(200).json({ success: true, message: 'I-Card updated successfully', data: card });
  } catch (err) {
    next(err);
  }
};

// ================= DELETE I-CARD =================
exports.deleteICard = async (req, res, next) => {
  try {
    const result = await iCardService.deleteICard(req.params.id);
    res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
};