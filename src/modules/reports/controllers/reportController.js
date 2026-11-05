const reportService = require('../services/reportService');

// Helper: Stream Excel to Response
const streamExcel = async (res, workbook, filename) => {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}.xlsx"`
  );
  await workbook.xlsx.write(res);
  res.end();
};

exports.downloadFeeCollection = async (req, res, next) => {
  try {
    const workbook = await reportService.getFeeCollectionReport();
    await streamExcel(res, workbook, `Fee_Collection_${Date.now()}`);
  } catch (err) { next(err); }
};

exports.downloadPendingFees = async (req, res, next) => {
  try {
    const workbook = await reportService.getPendingFeesReport();
    await streamExcel(res, workbook, `Pending_Fees_${Date.now()}`);
  } catch (err) { next(err); }
};

exports.downloadAdmissions = async (req, res, next) => {
  try {
    const workbook = await reportService.getAdmissionsReport();
    await streamExcel(res, workbook, `Admissions_${Date.now()}`);
  } catch (err) { next(err); }
};

exports.downloadEnquiries = async (req, res, next) => {
  try {
    const workbook = await reportService.getEnquiriesReport();
    await streamExcel(res, workbook, `Enquiries_${Date.now()}`);
  } catch (err) { next(err); }
};

exports.downloadOverdueBooks = async (req, res, next) => {
  try {
    const workbook = await reportService.getOverdueBooksReport();
    await streamExcel(res, workbook, `Overdue_Books_${Date.now()}`);
  } catch (err) { next(err); }
};

exports.downloadLibraryInventory = async (req, res, next) => {
  try {
    const workbook = await reportService.getLibraryInventoryReport();
    await streamExcel(res, workbook, `Library_Inventory_${Date.now()}`);
  } catch (err) { next(err); }
};