
const studentService = require('../services/studentService');

const {
  createStudentSchema,
  updateStudentSchema,
  updateStudentStatusSchema,
  listStudentsSchema,
} = require('../validations/studentValidation');

// Common validation helper
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

// CREATE STUDENT
exports.createStudent = async (req, res, next) => {
  try {
    const data = validate(createStudentSchema, req.body, res);
    if (!data) return;

    const student = await studentService.createStudent(
      data,
      req.user.id
    );

    return res.status(201).json({
      success: true,
      message: 'Student created successfully.',
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

// GET STUDENTS WITH SEARCH, FILTERS AND PAGINATION
exports.getStudents = async (req, res, next) => {
  try {
    const query = validate(listStudentsSchema, req.query, res);
    if (!query) return;

    const result = await studentService.getStudents(query);

    return res.status(200).json({
      success: true,
      data: result.students,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

// GET STUDENT DETAILS
exports.getStudentById = async (req, res, next) => {
  try {
    const student = await studentService.getStudentById(req.params.id);

    return res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE STUDENT PROFILE
exports.updateStudent = async (req, res, next) => {
  try {
    const data = validate(updateStudentSchema, req.body, res);
    if (!data) return;

    const student = await studentService.updateStudent(
      req.params.id,
      data
    );

    return res.status(200).json({
      success: true,
      message: 'Student updated successfully.',
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE STUDENT STATUS
exports.updateStudentStatus = async (req, res, next) => {
  try {
    const data = validate(updateStudentStatusSchema, req.body, res);
    if (!data) return;

    const student = await studentService.updateStudentStatus(
      req.params.id,
      data.status
    );

    return res.status(200).json({
      success: true,
      message: 'Student status updated successfully.',
      data: student,
    });
  } catch (error) {
    next(error);
  }
};
