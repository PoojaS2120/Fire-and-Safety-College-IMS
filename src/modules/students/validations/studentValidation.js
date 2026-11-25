// const Joi = require('joi');

// const objectId = Joi.string().hex().length(24);

// const GENDERS = ['male', 'female', 'other'];
// const LIFECYCLE_STAGES = [
//   'enquiry', 'admission', 'documents', 'fees', 'material', 'schedule',
//   'class_test', 'exam', 'exam_form', 'test', 'result', 'tc_lc',
// ];
// const STAGE_STATUSES = ['pending', 'in_progress', 'completed', 'blocked'];

// // ===== REPLACED 'deactive' WITH 'blocked' =====
// const STUDENT_STATUSES = ['active', 'completed', 'left', 'tc_issued', 'blocked'];

// // CREATE — student_id is auto-generated
// exports.createStudentSchema = Joi.object({
//   full_name: Joi.string().trim().min(2).max(150).required(),
//   dob: Joi.date().iso().less('now').required(),
//   gender: Joi.string().valid(...GENDERS).allow(null).optional(),
//   phone: Joi.string().trim().pattern(/^[0-9+\-\s()]{7,15}$/).required(),
//   email: Joi.string().trim().email().max(200).allow('', null).optional(),
//   address: Joi.string().trim().min(1).required(),
//   guardian_name: Joi.string().trim().max(150).allow('', null).optional(),
//   guardian_phone: Joi.string().trim().pattern(/^[0-9+\-\s()]{7,15}$/).allow('', null).optional(),
//   qualification: Joi.string().trim().max(150).required(),
//   course_id: objectId.required(),
//   batch_id: objectId.allow('', null).optional(),
//   admitted_on: Joi.date().iso().required(),
// }).unknown(false);

// exports.updateStudentSchema = Joi.object({
//   full_name: Joi.string().trim().min(2).max(150).optional(),
//   dob: Joi.date().iso().less('now').optional(),
//   gender: Joi.string().valid(...GENDERS).allow(null).optional(),
//   phone: Joi.string().trim().pattern(/^[0-9+\-\s()]{7,15}$/).optional(),
//   email: Joi.string().trim().email().max(200).allow('', null).optional(),
//   address: Joi.string().trim().min(1).optional(),
//   guardian_name: Joi.string().trim().max(150).allow('', null).optional(),
//   guardian_phone: Joi.string().trim().pattern(/^[0-9+\-\s()]{7,15}$/).allow('', null).optional(),
//   qualification: Joi.string().trim().max(150).optional(),
//   course_id: objectId.optional(),
//   batch_id: objectId.allow('', null).optional(),
// }).min(1).unknown(false);

// // ===== USES UPDATED STUDENT_STATUSES (with 'blocked') =====
// exports.updateStudentStatusSchema = Joi.object({
//   status: Joi.string().valid(...STUDENT_STATUSES).required(),
// }).unknown(false);

// exports.listStudentsSchema = Joi.object({
//   page: Joi.number().integer().min(1).default(1),
//   limit: Joi.number().integer().min(1).max(100).default(10),
//   q: Joi.string().trim().max(150).allow('').optional(),
//   search: Joi.string().trim().max(150).allow('').optional(),
//   status: Joi.string().valid(...STUDENT_STATUSES).optional(),
//   lifecycle_stage: Joi.string().valid(...LIFECYCLE_STAGES).optional(),
//   stage_status: Joi.string().valid(...STAGE_STATUSES).optional(),
//   courseId: objectId.optional(),
//   batchId: objectId.optional(),
//   batch_id: objectId.optional(),
// }).unknown(false);

// exports.updateStudentStageSchema = Joi.object({
//   lifecycle_stage: Joi.string().valid(...LIFECYCLE_STAGES).required(),
//   stage_status: Joi.string().valid(...STAGE_STATUSES).required(),
//   remarks: Joi.string().trim().max(500).allow('', null).optional(),
// }).unknown(false);

// exports.assignCourseSchema = Joi.object({
//   course_id: objectId.required(),
//   batch_id: objectId.allow('', null).optional(),
// }).unknown(false);

// exports.directAdmissionSchema = Joi.object({
//   course_id: objectId.required(),

//   full_name: Joi.string().trim().min(2).max(150).required(),

//   dob: Joi.date().iso().less('now').required(),

//   phone: Joi.string()
//     .trim()
//     .pattern(/^[0-9+\-\s()]{7,15}$/)
//     .required(),

//   email: Joi.string().trim().email().max(200).allow('', null).optional(),

//   address: Joi.string().trim().min(1).required(),

//   qualification: Joi.string().trim().max(150).required(),

//   guardian_name: Joi.string().trim().max(150).allow('', null).optional(),

//   guardian_phone: Joi.string()
//     .trim()
//     .pattern(/^[0-9+\-\s()]{7,15}$/)
//     .allow('', null)
//     .optional(),

//   admission_form: Joi.object({
//     fathers_name: Joi.string().allow('', null).optional(),
//     mothers_name: Joi.string().allow('', null).optional(),
//     religion: Joi.string().allow('', null).optional(),
//     caste: Joi.string().allow('', null).optional(),
//     category: Joi.string().allow('', null).optional(),

//     aadhaar_number: Joi.string()
//       .pattern(/^[0-9]{12}$/)
//       .allow('', null)
//       .optional(),

//     postal_address: Joi.object({
//       address: Joi.string().allow('', null).optional(),
//       pin: Joi.string().allow('', null).optional(),
//     }).optional(),

//     permanent_address: Joi.object({
//       address: Joi.string().allow('', null).optional(),
//       pin: Joi.string().allow('', null).optional(),
//     }).optional(),

//     contact_details: Joi.object({
//       contact_no: Joi.string().allow('', null).optional(),
//       mobile_no: Joi.string().allow('', null).optional(),
//       home_mobile_no: Joi.string().allow('', null).optional(),
//     }).optional(),

//     academic_qualification: Joi.array().items(
//       Joi.object({
//         examination_passed: Joi.string().allow('', null).optional(),
//         school_college: Joi.string().allow('', null).optional(),
//         year_of_passing: Joi.number().integer().allow(null).optional(),
//         board_university: Joi.string().allow('', null).optional(),
//         seat_no: Joi.string().allow('', null).optional(),
//         marks_out_of: Joi.number().min(0).allow(null).optional(),
//         marks_obtained: Joi.number().min(0).allow(null).optional(),
//         percentage: Joi.number().min(0).max(100).allow(null).optional(),
//       }).unknown(false)
//     ).optional(),

//     physical_details: Joi.object({
//       blood_group: Joi.string().allow('', null).optional(),
//       chest: Joi.string().allow('', null).optional(),
//       height: Joi.string().allow('', null).optional(),
//       weight: Joi.string().allow('', null).optional(),
//       participation: Joi.object({
//         ncc: Joi.boolean().optional(),
//         nss: Joi.boolean().optional(),
//         scout_guide: Joi.boolean().optional(),
//       }).optional(),
//     }).optional(),

//     images: Joi.object().unknown(true).optional(),

//     declaration: Joi.object({
//       place: Joi.string().allow('', null).optional(),
//       date: Joi.date().iso().allow(null).optional(),
//     }).optional(),

//     office_use: Joi.object().unknown(true).optional(),
//   }).unknown(false).optional(),
// }).unknown(false);


const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const GENDERS = ['male', 'female', 'other'];
const LIFECYCLE_STAGES = [
  'enquiry', 'admission', 'documents', 'fees', 'material', 'schedule',
  'class_test', 'exam', 'exam_form', 'test', 'result', 'tc_lc',
];
const STAGE_STATUSES = ['pending', 'in_progress', 'completed', 'blocked'];

// ===== REPLACED 'deactive' WITH 'blocked' =====
const STUDENT_STATUSES = ['active', 'completed', 'left', 'tc_issued', 'blocked'];

// CREATE — student_id is auto-generated
exports.createStudentSchema = Joi.object({
  full_name: Joi.string().trim().min(2).max(150).required(),
  dob: Joi.date().iso().less('now').required(),
  gender: Joi.string().valid(...GENDERS).allow(null).optional(),
  phone: Joi.string().trim().pattern(/^[0-9+\-\s()]{7,15}$/).required(),
  email: Joi.string().trim().email().max(200).allow('', null).optional(),
  address: Joi.string().trim().min(1).required(),
  guardian_name: Joi.string().trim().max(150).allow('', null).optional(),
  guardian_phone: Joi.string().trim().pattern(/^[0-9+\-\s()]{7,15}$/).allow('', null).optional(),
  qualification: Joi.string().trim().max(150).required(),
  course_id: objectId.required(),
  batch_id: objectId.allow('', null).optional(),
  admitted_on: Joi.date().iso().required(),
}).unknown(false);

exports.updateStudentSchema = Joi.object({
  full_name: Joi.string().trim().min(2).max(150).optional(),
  dob: Joi.date().iso().less('now').optional(),
  gender: Joi.string().valid(...GENDERS).allow(null).optional(),
  phone: Joi.string().trim().pattern(/^[0-9+\-\s()]{7,15}$/).optional(),
  email: Joi.string().trim().email().max(200).allow('', null).optional(),
  address: Joi.string().trim().min(1).optional(),
  guardian_name: Joi.string().trim().max(150).allow('', null).optional(),
  guardian_phone: Joi.string().trim().pattern(/^[0-9+\-\s()]{7,15}$/).allow('', null).optional(),
  qualification: Joi.string().trim().max(150).optional(),
  course_id: objectId.optional(),
  batch_id: objectId.allow('', null).optional(),
}).min(1).unknown(false);

// ===== USES UPDATED STUDENT_STATUSES (with 'blocked') =====
exports.updateStudentStatusSchema = Joi.object({
  status: Joi.string().valid(...STUDENT_STATUSES).required(),
}).unknown(false);

exports.listStudentsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  q: Joi.string().trim().max(150).allow('').optional(),
  search: Joi.string().trim().max(150).allow('').optional(),
  status: Joi.string().valid(...STUDENT_STATUSES).optional(),
  lifecycle_stage: Joi.string().valid(...LIFECYCLE_STAGES).optional(),
  stage_status: Joi.string().valid(...STAGE_STATUSES).optional(),
  courseId: objectId.optional(),
  batchId: objectId.optional(),
  batch_id: objectId.optional(),
}).unknown(false);

exports.updateStudentStageSchema = Joi.object({
  lifecycle_stage: Joi.string().valid(...LIFECYCLE_STAGES).required(),
  stage_status: Joi.string().valid(...STAGE_STATUSES).required(),
  remarks: Joi.string().trim().max(500).allow('', null).optional(),
}).unknown(false);

exports.assignCourseSchema = Joi.object({
  course_id: objectId.required(),
  batch_id: objectId.allow('', null).optional(),
}).unknown(false);

// ============================================================
// 🚨 DIRECT ADMISSION — extended with fee plan + concession
// ============================================================
exports.directAdmissionSchema = Joi.object({
  course_id: objectId.required(),

  full_name: Joi.string().trim().min(2).max(150).required(),

  dob: Joi.date().iso().less('now').required(),

  phone: Joi.string()
    .trim()
    .pattern(/^[0-9+\-\s()]{7,15}$/)
    .required(),

  email: Joi.string().trim().email().max(200).allow('', null).optional(),

  address: Joi.string().trim().min(1).required(),

  qualification: Joi.string().trim().max(150).required(),

  guardian_name: Joi.string().trim().max(150).allow('', null).optional(),

  guardian_phone: Joi.string()
    .trim()
    .pattern(/^[0-9+\-\s()]{7,15}$/)
    .allow('', null)
    .optional(),

  // 🚨 NEW — admission-time fee/concession choices
  admission_type: Joi.string().valid('new', 'old').default('new'),

  payment_plan: Joi.string()
    .valid('one_time', 'installments')
    .default('one_time'),

  chosen_installment_plan_id: objectId.allow(null).optional(),

  concession_id: objectId.allow(null).optional(),

  group_enquiry_ids: Joi.array().items(objectId).optional(),

  admission_form: Joi.object({
    fathers_name: Joi.string().allow('', null).optional(),
    mothers_name: Joi.string().allow('', null).optional(),
    religion: Joi.string().allow('', null).optional(),
    caste: Joi.string().allow('', null).optional(),
    category: Joi.string().allow('', null).optional(),

    aadhaar_number: Joi.string()
      .pattern(/^[0-9]{12}$/)
      .allow('', null)
      .optional(),

    postal_address: Joi.object({
      address: Joi.string().allow('', null).optional(),
      pin: Joi.string().allow('', null).optional(),
    }).optional(),

    permanent_address: Joi.object({
      address: Joi.string().allow('', null).optional(),
      pin: Joi.string().allow('', null).optional(),
    }).optional(),

    contact_details: Joi.object({
      contact_no: Joi.string().allow('', null).optional(),
      mobile_no: Joi.string().allow('', null).optional(),
      home_mobile_no: Joi.string().allow('', null).optional(),
    }).optional(),

    academic_qualification: Joi.array().items(
      Joi.object({
        examination_passed: Joi.string().allow('', null).optional(),
        school_college: Joi.string().allow('', null).optional(),
        year_of_passing: Joi.number().integer().allow(null).optional(),
        board_university: Joi.string().allow('', null).optional(),
        seat_no: Joi.string().allow('', null).optional(),
        marks_out_of: Joi.number().min(0).allow(null).optional(),
        marks_obtained: Joi.number().min(0).allow(null).optional(),
        percentage: Joi.number().min(0).max(100).allow(null).optional(),
      }).unknown(false)
    ).optional(),

    physical_details: Joi.object({
      blood_group: Joi.string().allow('', null).optional(),
      chest: Joi.string().allow('', null).optional(),
      height: Joi.string().allow('', null).optional(),
      weight: Joi.string().allow('', null).optional(),
      participation: Joi.object({
        ncc: Joi.boolean().optional(),
        nss: Joi.boolean().optional(),
        scout_guide: Joi.boolean().optional(),
      }).optional(),
    }).optional(),

    images: Joi.object().unknown(true).optional(),

    declaration: Joi.object({
      place: Joi.string().allow('', null).optional(),
      date: Joi.date().iso().allow(null).optional(),
    }).optional(),

    office_use: Joi.object().unknown(true).optional(),
  }).unknown(false).optional(),
}).unknown(false);