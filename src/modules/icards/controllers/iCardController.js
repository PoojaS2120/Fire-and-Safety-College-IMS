
const iCardService = require('../services/iCardService');

const {
  listICardStudentsSchema,
} = require('../validations/iCardValidation');

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
