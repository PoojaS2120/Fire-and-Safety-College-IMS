
const Book = require('../models/Book');
const BookCategory = require('../models/BookCategory');

// ---------- IMPORT BOOKS ----------
exports.importBooks = async (rows) => {
  const categories = await BookCategory.find();

  const categoryMap = new Map(
    categories.map((category) => [
      category.name.trim().toLowerCase(),
      category._id
    ])
  );

  const uploadedCodes = rows
    .map((row) => String(row.Code || '').trim())
    .filter(Boolean);

  const existingBooks = await Book.find({
    bookCode: { $in: uploadedCodes }
  }).select('bookCode');

  const existingCodes = new Set(
    existingBooks.map((book) => book.bookCode)
  );

  const processedCodes = new Set();

  const errors = [];
  let importedCount = 0;
  let skippedCount = 0;

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const rowNumber = index + 2;

    const bookCode = String(row.Code || '').trim();
    const title = String(row.Title || '').trim();
    const author = String(row.Author || '').trim();
    const categoryName = String(row.Category || '').trim();
    const copiesValue = String(row.Copies ?? '').trim();
    const status = String(row.Status || 'active').trim().toLowerCase();

    const rowErrors = [];

    if (!bookCode) rowErrors.push('Book code is required');
    if (!title) rowErrors.push('Title is required');
    if (!author) rowErrors.push('Author is required');
    if (!categoryName) rowErrors.push('Category is required');

    const categoryId = categoryMap.get(categoryName.toLowerCase());

    if (categoryName && !categoryId) {
      rowErrors.push(`Category "${categoryName}" does not exist`);
    }

    const totalQty = Number(copiesValue);

    if (
      copiesValue === '' ||
      !Number.isInteger(totalQty) ||
      totalQty < 0
    ) {
      rowErrors.push('Copies must be a non-negative integer');
    }

    if (!['active', 'retired'].includes(status)) {
      rowErrors.push('Status must be active or retired');
    }

    if (bookCode && existingCodes.has(bookCode)) {
      rowErrors.push(`Book code "${bookCode}" already exists`);
    }

    if (bookCode && processedCodes.has(bookCode)) {
      rowErrors.push(`Duplicate book code "${bookCode}" in uploaded file`);
    }

    if (bookCode) processedCodes.add(bookCode);

    if (rowErrors.length) {
      skippedCount++;
      errors.push({
        row: rowNumber,
        bookCode: bookCode || null,
        errors: rowErrors
      });
      continue;
    }

    try {
      await Book.create({
        bookCode,
        title,
        author,
        category: categoryId,
        totalQty,
        availableQty: totalQty,
        status
      });

      existingCodes.add(bookCode);
      importedCount++;
    } catch (error) {
      skippedCount++;
      errors.push({
        row: rowNumber,
        bookCode,
        errors: [
          error.code === 11000
            ? 'Book code already exists'
            : error.message || 'Failed to import book'
        ]
      });
    }
  }

  return {
    totalRows: rows.length,
    importedCount,
    skippedCount,
    errors
  };
};

// ---------- EXPORT BOOKS ----------
exports.exportBooks = async () => {
  const books = await Book.find()
    .populate('category', 'name')
    .sort({ createdAt: -1 })
    .lean();

  return books.map((book) => ({
    Code: book.bookCode,
    Title: book.title,
    Author: book.author,
    Category: book.category?.name || '',
    Copies: book.totalQty,
    Status: book.status
  }));
};
