
const XLSX = require('xlsx');

const SUPPORTED_FORMATS = ['xlsx', 'csv'];

// Read Excel or CSV buffer and return JSON rows.
exports.parseFile = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw {
      statusCode: 400,
      message: 'Uploaded file is empty or invalid.'
    };
  }

  let workbook;

  try {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch (error) {
    throw {
      statusCode: 400,
      message: 'Unable to read the uploaded file.'
    };
  }

  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw {
      statusCode: 400,
      message: 'No worksheet found in the uploaded file.'
    };
  }

  const rows = XLSX.utils.sheet_to_json(
    workbook.Sheets[sheetName],
    {
      defval: '',
      raw: false
    }
  );

  if (!rows.length) {
    throw {
      statusCode: 400,
      message: 'Uploaded file contains no data.'
    };
  }

  return rows;
};

// Generate Excel or CSV buffer from JSON rows.
exports.generateFile = (rows, columns, format = 'xlsx') => {
  const normalizedFormat = String(format).toLowerCase();

  if (!SUPPORTED_FORMATS.includes(normalizedFormat)) {
    throw {
      statusCode: 400,
      message: 'Unsupported format. Use xlsx or csv.'
    };
  }

  if (!Array.isArray(rows) || !Array.isArray(columns)) {
    throw {
      statusCode: 400,
      message: 'Invalid export data or column configuration.'
    };
  }

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: columns
  });

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    'Data'
  );

  return XLSX.write(workbook, {
    type: 'buffer',
    bookType: normalizedFormat
  });
};

// Generate a module-specific import template.
exports.generateTemplate = (columns, format = 'xlsx') => {
  const normalizedFormat = String(format).toLowerCase();

  if (!SUPPORTED_FORMATS.includes(normalizedFormat)) {
    throw {
      statusCode: 400,
      message: 'Unsupported format. Use xlsx or csv.'
    };
  }

  if (!Array.isArray(columns) || columns.length === 0) {
    throw {
      statusCode: 400,
      message: 'Template columns are required.'
    };
  }

  const worksheet = XLSX.utils.aoa_to_sheet([
    columns
  ]);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    'Import Template'
  );

  return XLSX.write(workbook, {
    type: 'buffer',
    bookType: normalizedFormat
  });
};
