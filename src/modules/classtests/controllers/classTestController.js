
const classTestService = require('../services/classTestService');
const validation = require('../validations/classTestValidation');

// ==========================================
// COMMON HELPERS
// ==========================================

const sendSuccess = (res, statusCode, message, data) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const validateRequest = (schema, data, res) => {
  const result = schema.validate(data, {
    abortEarly: true,
    convert: true
  });

  if (result.error) {
    res.status(400).json({
      success: false,
      message: result.error.details[0].message
    });

    return null;
  }

  return result.value;
};

const asyncHandler = fn => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ==========================================
// 1. CREATE CLASS TEST
// POST /api/v1/class-tests
// ==========================================

exports.createClassTest = asyncHandler(async (req, res) => {
  const data = validateRequest(
    validation.createClassTestSchema,
    req.body,
    res
  );

  if (!data) return;

  const result = await classTestService.createClassTest(
    data,
    req.user,
    req.ip
  );

  return sendSuccess(
    res,
    201,
    'Class test created successfully',
    result
  );
});

// ==========================================
// 2. GET ALL CLASS TESTS
// GET /api/v1/class-tests
// ==========================================

exports.getAllClassTests = asyncHandler(async (req, res) => {
  const query = validateRequest(
    validation.listQuerySchema,
    req.query,
    res
  );

  if (!query) return;

  const result = await classTestService.listClassTests(
    query,
    req.user
  );

  return res.status(200).json({
    success: true,
    count: result.length,
    data: result
  });
});

// ==========================================
// 3. GET SINGLE CLASS TEST
// GET /api/v1/class-tests/:id
// ==========================================

exports.getClassTestById = asyncHandler(async (req, res) => {
  const result = await classTestService.getClassTest(
    req.params.id,
    req.user
  );

  return sendSuccess(
    res,
    200,
    'Class test fetched successfully',
    result
  );
});

// ==========================================
// GET CLASS TEST MARKS
// GET /api/v1/class-tests/:id/marks
// ==========================================

exports.getMarks = asyncHandler(async (req, res) => {
  const result = await classTestService.getMarks(
    req.params.id,
    req.user
  );

  return sendSuccess(
    res,
    200,
    'Class test marks fetched successfully',
    result
  );
});

// ==========================================
// 4. UPDATE CLASS TEST
// PUT /api/v1/class-tests/:id
// ==========================================

exports.updateClassTest = asyncHandler(async (req, res) => {
  const data = validateRequest(
    validation.updateClassTestSchema,
    req.body,
    res
  );

  if (!data) return;

  const result = await classTestService.updateClassTest(
    req.params.id,
    data,
    req.user,
    req.ip
  );

  return sendSuccess(
    res,
    200,
    'Class test updated successfully',
    result
  );
});

// ==========================================
// 5. DELETE / ARCHIVE CLASS TEST
// DELETE /api/v1/class-tests/:id
// ==========================================

exports.deleteClassTest = asyncHandler(async (req, res) => {
  const result = await classTestService.deleteClassTest(
    req.params.id,
    req.user,
    req.ip
  );

  return sendSuccess(
    res,
    200,
    'Class test archived successfully',
    result
  );
});

// ==========================================
// 6. BULK MARKS ENTRY
// POST /api/v1/class-tests/:id/marks/bulk
// ==========================================

exports.enterBulkMarks = asyncHandler(async (req, res) => {
  const data = validateRequest(
    validation.bulkMarksSchema,
    req.body,
    res
  );

  if (!data) return;

  const result = await classTestService.enterBulkMarks(
    req.params.id,
    data.marks,
    req.user,
    req.ip
  );

  return sendSuccess(
    res,
    200,
    'Bulk marks saved successfully',
    result
  );
});

// ==========================================
// 7. UPDATE INDIVIDUAL MARKS
// PUT /api/v1/class-tests/:id/marks/:studentId
// ==========================================

exports.updateStudentMark = asyncHandler(async (req, res) => {
  const data = validateRequest(
    validation.markSchema,
    req.body,
    res
  );

  if (!data) return;

  const result = await classTestService.updateStudentMark(
    req.params.id,
    req.params.studentId,
    data,
    req.user,
    req.ip
  );

  return sendSuccess(
    res,
    200,
    'Student marks updated successfully',
    result
  );
});

// ==========================================
// 8. DELETE INDIVIDUAL MARKS
// DELETE /api/v1/class-tests/:id/marks/:studentId
// ==========================================

exports.deleteStudentMark = asyncHandler(async (req, res) => {
  const result = await classTestService.deleteStudentMark(
    req.params.id,
    req.params.studentId,
    req.user,
    req.ip
  );

  return sendSuccess(
    res,
    200,
    'Student marks deleted successfully',
    result
  );
});

// ==========================================
// 9. GET MARK AUDIT HISTORY
// GET /api/v1/class-tests/:id/marks/:studentId/history
// ==========================================

exports.getMarkHistory = asyncHandler(async (req, res) => {
  const result = await classTestService.getMarkHistory(
    req.params.id,
    req.params.studentId,
    req.user
  );

  return sendSuccess(
    res,
    200,
    'Marks history fetched successfully',
    result
  );
});

// ==========================================
// 10. IMPORT MARKS FROM EXCEL / CSV
// POST /api/v1/class-tests/:id/marks/import
// ==========================================

exports.importMarks = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please upload an Excel or CSV file'
    });
  }

  const options = validateRequest(
    validation.bulkImportSchema,
    req.body,
    res
  );

  if (!options) return;

  const result = await classTestService.importMarks(
    req.params.id,
    req.file.buffer,
    options,
    req.user,
    req.ip
  );

  const hasErrors = result.skipped > 0;

  return res.status(hasErrors ? 207 : 200).json({
    success: !hasErrors,
    message: hasErrors
      ? 'Import completed with some skipped rows'
      : 'Marks imported successfully',
    data: result
  });
});

// ==========================================
// 11. EXPORT MARKS TO EXCEL / CSV
// GET /api/v1/class-tests/:id/marks/export
// ==========================================

exports.exportMarks = asyncHandler(async (req, res) => {
  const query = validateRequest(
    validation.exportQuerySchema,
    req.query,
    res
  );

  if (!query) return;

  const buffer = await classTestService.exportMarks(
    req.params.id,
    query.format,
    req.user,
    query
  );

  const isCsv = query.format === 'csv';

  const extension = isCsv ? 'csv' : 'xlsx';

  const contentType = isCsv
    ? 'text/csv; charset=utf-8'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  res.setHeader('Content-Type', contentType);

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="class_test_${req.params.id}_marks.${extension}"`
  );

  res.setHeader('Content-Length', buffer.length);

  return res.status(200).send(buffer);
});

// ==========================================
// 12. DOWNLOAD IMPORT TEMPLATE
// GET /api/v1/class-tests/:id/marks/template
// ==========================================

exports.downloadImportTemplate = asyncHandler(async (req, res) => {
  const buffer = await classTestService.downloadImportTemplate(
    req.params.id,
    req.user
  );

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="class_test_${req.params.id}_import_template.xlsx"`
  );

  res.setHeader('Content-Length', buffer.length);

  return res.status(200).send(buffer);
});

// ==========================================
// 13. CLASS PERFORMANCE INSIGHTS
// GET /api/v1/class-tests/:id/insights
// ==========================================

exports.getClassInsights = asyncHandler(async (req, res) => {
  const result = await classTestService.getClassInsights(
    req.params.id,
    req.user
  );

  return sendSuccess(
    res,
    200,
    'Class performance insights generated successfully',
    result
  );
});
