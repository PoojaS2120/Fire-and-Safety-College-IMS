
const iCardService = require('../services/iCardService');

const {
  listICardStudentsSchema,
  createICardSchema,
  updateICardSchema,
  listSavedICardsSchema,
} = require('../validations/iCardValidation');

function validate(schema, data, res) {
  const { error, value } = schema.validate(data, {
    abortEarly: true,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    res.status(400).json({
      success: false,
      message: error.details[0].message,
    });

    return null;
  }

  return value;
}

// GET ELIGIBLE STUDENTS
exports.getICardStudents = async (req, res, next) => {
  try {
    const query = validate(listICardStudentsSchema, req.query, res);
    if (!query) return;

    const result = await iCardService.getICardStudents(query);

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

// PREVIEW STUDENT I-CARD
exports.getICardByStudentId = async (req, res, next) => {
  try {
    const result = await iCardService.getICardByStudentId(
      req.params.studentId
    );

    return res.status(200).json({
      success: true,
      message: 'I-Card details fetched successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// CREATE I-CARD
exports.createICard = async (req, res, next) => {
  try {
    const body = validate(createICardSchema, req.body, res);
    if (!body) return;

    const result = await iCardService.createICard(
      body,
      req.user?.id || req.user?._id
    );

    return res.status(201).json({
      success: true,
      message: 'I-Card created successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL SAVED I-CARDS
exports.getAllICards = async (req, res, next) => {
  try {
    const query = validate(listSavedICardsSchema, req.query, res);
    if (!query) return;

    const result = await iCardService.getAllICards(query);

    return res.status(200).json({
      success: true,
      message: 'I-Cards fetched successfully.',
      data: result.cards,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

// GET SINGLE SAVED I-CARD
exports.getICardById = async (req, res, next) => {
  try {
    const result = await iCardService.getICardById(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'I-Card details fetched successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE I-CARD
exports.updateICard = async (req, res, next) => {
  try {
    const body = validate(updateICardSchema, req.body, res);
    if (!body) return;

    const result = await iCardService.updateICard(
      req.params.id,
      body,
      req.user?.id || req.user?._id
    );

    return res.status(200).json({
      success: true,
      message: 'I-Card updated successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE I-CARD
exports.deleteICard = async (req, res, next) => {
  try {
    const result = await iCardService.deleteICard(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'I-Card deleted successfully.',
      data: {
        _id: result._id,
      },
    });
  } catch (error) {
    next(error);
  }
};
