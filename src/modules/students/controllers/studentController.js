const studentService = require('../services/studentService');

const {
  createStudentSchema,
  updateStudentSchema,
  updateStudentStatusSchema,
  updateStudentStageSchema,
  listStudentsSchema,
  assignCourseSchema,
  directAdmissionSchema,
} = require('../validations/studentValidation');

function validate(schema, data, res) {
  const { error, value } = schema.validate(data, {
    abortEarly: true,
    stripUnknown: true,
    convert: true,
  });
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return null;
  }
  return value;
}

// ================= CREATE =================
exports.createStudent = async (req, res, next) => {
  try {
    const data = validate(createStudentSchema, req.body, res);
    if (!data) return;
   const student = await studentService.createStudent(data, req.user.id, req.ip);
    res.status(201).json({ 
      success: true, 
      message: 'Student created successfully.', 
      data: student 
    });
  } catch (error) { next(error); }
};

// ================= LIST =================
exports.getStudents = async (req, res, next) => {
  try {
    const query = validate(listStudentsSchema, req.query, res);
    if (!query) return;
    const result = await studentService.getStudents(query, req.user);
    res.status(200).json({ 
      success: true, 
      data: result.students, 
      meta: result.meta 
    });
  } catch (error) { next(error); }
};

// ================= GET BY ID =================
exports.getStudentById = async (req, res, next) => {
  try {
    const student = await studentService.getStudentById(req.params.id);
    res.status(200).json({ success: true, data: student });
  } catch (error) { next(error); }
};

// ================= SUMMARY =================
exports.getStudentSummary = async (req, res, next) => {
  try {
    const summary = await studentService.getStudentSummary(req.params.id);
    res.status(200).json({ success: true, data: summary });
  } catch (error) { next(error); }
};

// ================= UPDATE =================
exports.updateStudent = async (req, res, next) => {
  try {
    const data = validate(updateStudentSchema, req.body, res);
    if (!data) return;
    const student = await studentService.updateStudent(req.params.id, data, req.user.id, req.ip);
    res.status(200).json({ 
      success: true, 
      message: 'Student updated successfully.', 
      data: student 
    });
  } catch (error) { next(error); }
};

// ================= ASSIGN COURSE & BATCH =================
exports.assignCourseAndBatch = async (req, res, next) => {
  try {
    const data = validate(assignCourseSchema, req.body, res);
    if (!data) return;
    const student = await studentService.assignCourseAndBatch(
      req.params.id, data.course_id, data.batch_id, req.user.id, req.ip // ← adminId + ip
    );
    res.status(200).json({ 
      success: true, 
      message: 'Course and batch assigned successfully.', 
      data: student 
    });
  } catch (error) { next(error); }
};

// ================= UPDATE STATUS (Simplified) =================
exports.updateStudentStatus = async (req, res, next) => {
  try {
    const data = validate(updateStudentStatusSchema, req.body, res);
    if (!data) return;

    const student = await studentService.updateStudentStatus(
      req.params.id,
      data.status,
      req.user.id, // ← adminId
      req.ip 
    );

    return res.status(200).json({
      success: true,
      message: `Student status updated to ${data.status}.`,
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

// ================= UPDATE STAGE =================
exports.updateStudentStage = async (req, res, next) => {
  try {
    const data = validate(updateStudentStageSchema, req.body, res);
    if (!data) return;
const student = await studentService.updateStudentStage(req.params.id, data, req.user.id, req.ip);
    res.status(200).json({ 
      success: true, 
      message: 'Student lifecycle stage updated successfully.', 
      data: student 
    });
  } catch (error) { next(error); }
};

// ================= STAGE HISTORY =================
exports.getStudentStageHistory = async (req, res, next) => {
  try {
    const history = await studentService.getStudentStageHistory(req.params.id);
    res.status(200).json({ success: true, data: history });
  } catch (error) { next(error); }
};

exports.createDirectAdmission = async (req, res, next) => {
  try {
    const data = validate(directAdmissionSchema, req.body, res);
    if (!data) return;

    const result = await studentService.createDirectAdmission(
      data,
      req.user.id,
      req.ip 
    );

    return res.status(201).json({
      success: true,
      message: 'Direct admission created successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};