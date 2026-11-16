
const XLSX = require('xlsx');

const SUPPORTED_FORMATS = ['xlsx', 'csv'];

const createError = (statusCode, message) => ({
  statusCode,
  message,
});

// Read Excel or CSV buffer and return JSON rows.
exports.parseFile = async (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw createError(400, 'Uploaded file is empty or invalid.');
  }

  let workbook;

  try {
    workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: false,
    });
  } catch (error) {
    throw createError(400, 'Unable to read the uploaded file.');
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw createError(400, 'No worksheet found in the uploaded file.');
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: false,
  });

  if (!rows.length) {
    throw createError(400, 'Uploaded file contains no data.');
  }

  return rows;
};

// Generate Excel or CSV buffer from JSON rows.
exports.generateFile = async (rows, columns, format = 'xlsx') => {
  const normalizedFormat = String(format).toLowerCase();

  if (!SUPPORTED_FORMATS.includes(normalizedFormat)) {
    throw createError(400, 'Unsupported format. Use xlsx or csv.');
  }

  if (!Array.isArray(rows) || !Array.isArray(columns)) {
    throw createError(400, 'Invalid export data or column configuration.');
  }

  const data = [
    columns,
    ...rows.map((record) =>
      columns.map((column) => record[column] ?? '')
    ),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

  return XLSX.write(workbook, {
    type: 'buffer',
    bookType: normalizedFormat,
  });
};

// Generate a module-specific import template.
exports.generateTemplate = async (columns, format = 'xlsx') => {
  const normalizedFormat = String(format).toLowerCase();

  if (!SUPPORTED_FORMATS.includes(normalizedFormat)) {
    throw createError(400, 'Unsupported format. Use xlsx or csv.');
  }

  if (!Array.isArray(columns) || columns.length === 0) {
    throw createError(400, 'Template columns are required.');
  }

  const worksheet = XLSX.utils.aoa_to_sheet([columns]);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    'Import Template'
  );

  return XLSX.write(workbook, {
    type: 'buffer',
    bookType: normalizedFormat,
  });
};
