
const Book = require('../../../modules/library/models/Book');
const bookImportExportHandler = require('../../../modules/library/services/bookImportExportHandler');

const Student = require('../../../modules/students/models/Student');
const studentImportExportHandler = require('../../../modules/students/services/studentImportExportHandler');

const examImportExportHandler = require('../../../modules/exams/services/examImportExportHandler');

const STUDENT_COLUMNS = [
  'student_id',
  'full_name',
  'dob',
  'gender',
  'phone',
  'email',
  'address',
  'guardian_name',
  'guardian_phone',
  'qualification',
  'course_name',
  'batch_name',
  'admitted_on',
];

const EXAM_MARK_COLUMNS = [
  'Student ID',
  'Student Name',
  'Exam Title',
  'Subject',
  'Exam Date',
  'Maximum Marks',
  'Passing Marks',
  'Marks Obtained',
  'Result',
  'Remarks',
];

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
        'Status',
      ],

      columns: [
        'Code',
        'Title',
        'Author',
        'Category',
        'Copies',
        'Status',
      ],

      importHandler: bookImportExportHandler.importBooks,
      exportHandler: bookImportExportHandler.exportBooks,
    },
  },

  students: {
    students: {
      model: Student,
      importFields: STUDENT_COLUMNS,
      columns: STUDENT_COLUMNS,
      importHandler: studentImportExportHandler.importStudents,
      exportHandler: studentImportExportHandler.exportStudents,
    },
  },

  exams: {
    marks: {
      columns: EXAM_MARK_COLUMNS,
      exportHandler: examImportExportHandler.exportExamMarks,
    },
  },
};

module.exports = importExportRegistry;
