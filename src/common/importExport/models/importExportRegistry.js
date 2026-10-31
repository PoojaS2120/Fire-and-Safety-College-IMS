
const Book = require('../../../modules/library/models/Book');
const bookImportExportHandler = require('../../../modules/library/services/bookImportExportHandler');

const importExportRegistry = {
  library: {
    books: {
      model: Book,

      importFields: [
        'Code',
        'Title',
        'Author',
        'Category',
        'Copies',
        'Status'
      ],

      columns: [
        'Code',
        'Title',
        'Author',
        'Category',
        'Copies',
        'Status'
      ],

      importHandler: bookImportExportHandler.importBooks,
      exportHandler: bookImportExportHandler.exportBooks
    }
  }
};

module.exports = importExportRegistry;
