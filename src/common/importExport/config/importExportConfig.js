
const importExportConfig = {
  library: {
    books: {
      model: 'Book',
      columns: [
        'Code',
        'Title',
        'Author',
        'Category',
        'Copies',
        'Status'
      ],
      uniqueField: 'Code'
    }
  }

  // Future modules:
  // students: { ... },
  // courses: { ... },
  // faculty: { ... }
};

exports.getModuleConfig = (moduleName, entityName) => {
  const moduleConfig = importExportConfig[moduleName];

  if (!moduleConfig) {
    throw {
      statusCode: 404,
      message: `Import/export is not configured for module: ${moduleName}`
    };
  }

  const entityConfig = moduleConfig[entityName];

  if (!entityConfig) {
    throw {
      statusCode: 404,
      message: `Import/export is not configured for entity: ${entityName}`
    };
  }

  return entityConfig;
};

exports.registerModuleConfig = (moduleName, entityName, config) => {
  if (!moduleName || !entityName || !config) {
    throw new Error('Module name, entity name and configuration are required.');
  }

  if (!Array.isArray(config.columns) || config.columns.length === 0) {
    throw new Error('At least one column must be configured.');
  }

  if (!importExportConfig[moduleName]) {
    importExportConfig[moduleName] = {};
  }

  importExportConfig[moduleName][entityName] = config;
};

exports.getAllModuleConfigs = () => importExportConfig;
