const importExportService = require('../services/importExportService');
const importExportRegistry = require('../models/importExportRegistry');

// ---------- IMPORT ----------
exports.importData = async (req, res, next) => {
  try {
    const { moduleName, entityName } = req.params;

    const config = importExportRegistry[moduleName]?.[entityName];

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Import is not configured for this module.',
      });
    }

    if (typeof config.importHandler !== 'function') {
      return res.status(501).json({
        success: false,
        message: 'Import handler is not implemented for this module.',
      });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an Excel or CSV file using the file field.',
      });
    }

    const rows = importExportService.parseFile(req.file.buffer);

    // Pass authenticated user ID to the import handler.
    const result = await config.importHandler(rows, req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Import process completed.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ---------- EXPORT ----------
exports.exportData = async (req, res, next) => {
  try {
    const { moduleName, entityName } = req.params;
    const format = String(req.query.format || 'xlsx').toLowerCase();

    const config = importExportRegistry[moduleName]?.[entityName];

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Export is not configured for this module.',
      });
    }

    if (typeof config.exportHandler !== 'function') {
      return res.status(501).json({
        success: false,
        message: 'Export handler is not implemented for this module.',
      });
    }

    const result = await config.exportHandler(req.query);

    if (!Array.isArray(result)) {
      throw {
        statusCode: 500,
        message: 'Export handler must return an array of records.',
      };
    }

    const columns = config.columns || config.importFields;

    if (!Array.isArray(columns) || !columns.length) {
      throw {
        statusCode: 500,
        message: 'Export columns are not configured.',
      };
    }

    const fileBuffer = importExportService.generateFile(
      result,
      columns,
      format
    );

    const extension = format === 'csv' ? 'csv' : 'xlsx';
    const filename = `${moduleName}_${entityName}_export.${extension}`;

    res.setHeader(
      'Content-Type',
      format === 'csv'
        ? 'text/csv; charset=utf-8'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    return res.status(200).send(fileBuffer);
  } catch (error) {
    next(error);
  }
};

// ---------- TEMPLATE ----------
exports.downloadTemplate = async (req, res, next) => {
  try {
    const { moduleName, entityName } = req.params;
    const format = String(req.query.format || 'xlsx').toLowerCase();

    const config = importExportRegistry[moduleName]?.[entityName];

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Template is not configured for this module.',
      });
    }

    const columns = config.columns || config.importFields;

    if (!Array.isArray(columns) || !columns.length) {
      throw {
        statusCode: 500,
        message: 'Template columns are not configured.',
      };
    }

    const fileBuffer = importExportService.generateTemplate(
      columns,
      format
    );

    const filename = `${moduleName}_${entityName}_template.${format}`;

    res.setHeader(
      'Content-Type',
      format === 'csv'
        ? 'text/csv; charset=utf-8'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    return res.status(200).send(fileBuffer);
  } catch (error) {
    next(error);
  }
};