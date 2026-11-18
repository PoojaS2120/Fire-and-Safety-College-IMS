// src/config/permissionCatalog.js
// SINGLE SOURCE OF TRUTH for every permission in IMS.
// Shape:  module -> page -> (optional) tabs -> actions
// Generated permission code:  <module>.<page>[.<tab>].<action>   (all slugified, lowercase)
//   e.g.  fees.fee_collection.create      exams.exam_forms.pending.view

const CRUD = ['CREATE', 'VIEW', 'UPDATE', 'DELETE'];

const slug = (s) =>
  String(s).trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

/** Build a permission code. code(module, page, action) or code(module, page, tab, action) */
const code = (module, page, tab, action) => {
  if (action === undefined) { action = tab; tab = null; }
  return [slug(module), slug(page), tab ? slug(tab) : null, String(action).toLowerCase()]
    .filter(Boolean).join('.');
};

const M = (key, page, category, actions, tabs) => ({ key, page, category, actions, ...(tabs ? { tabs } : {}) });
const tab = (name) => ({ name, actions: ['VIEW'] });   // tabs only control which tabs the UI shows

// Module / page / tab names MATCH the frontend sidebar (src/config/permissions.js).
const modules = [
  // ---------- Dashboard ----------
  M('DASHBOARD', 'Dashboard', 'Dashboard', ['VIEW']),

  // ---------- User Management ----------
  M('USER MANAGEMENT', 'User List', 'Administration', ['VIEW', 'UPDATE'], [tab('STAFF'), tab('STUDENTS')]),   // update = edit, activate/deactivate, reset password
  M('USER MANAGEMENT', 'Add User', 'Administration', ['VIEW', 'CREATE']),
  M('USER MANAGEMENT', 'Roles & Permissions', 'Administration', CRUD),
  M('AUDIT LOGS', 'Audit Logs', 'Administration', ['VIEW']),

  // ---------- Course Master ----------
  M('COURSE MASTER', 'Courses', 'Academics', ['CREATE', 'VIEW', 'UPDATE']),            // also covers batches + fee components
  M('COURSE MASTER', 'Subjects', 'Academics', CRUD),
  M('COURSE MASTER', 'Faculty Assignments', 'Academics', ['CREATE', 'VIEW', 'DELETE']),
  M('COURSE MASTER', 'Class Schedules', 'Academics', ['CREATE', 'VIEW', 'UPDATE', 'IMPORT']),  // update also covers cancel

  // ---------- Study Material ----------
  M('STUDY MATERIAL', 'Study Material', 'Academics', CRUD),

  // ---------- Exams ----------
  M('EXAMS', 'Results', 'Exams', ['VIEW', 'PUBLISH']),
  M('EXAMS', 'Class Tests', 'Exams', [...CRUD, 'ENTER_MARKS', 'HISTORY', 'IMPORT', 'EXPORT', 'INSIGHTS']),
  M('EXAMS', 'Exams', 'Exams', [...CRUD, 'ENTER_MARKS', 'HISTORY']),
  M('EXAMS', 'Exam Forms', 'Exams', ['CREATE', 'VIEW', 'OVERRIDE']),

  // ---------- Admissions / Students ----------
  M('ENQUIRIES', 'Enquiries', 'Admissions', [...CRUD, 'CONVERT'], [tab('NEW'), tab('CONVERTED')]),
  M('STUDENTS', 'Students', 'Students', ['CREATE', 'VIEW', 'UPDATE', 'LIST', 'VERIFY']),   // LIST = list only (faculty need it); VERIFY = verify documents; documents upload/delete use UPDATE
  M('TC/LC', 'TC/LC', 'Students', ['CREATE', 'VIEW', 'APPROVE', 'REJECT']),

  // ---------- Finance ----------
  M('FEES', 'Fees', 'Finance', ['CREATE', 'VIEW', 'UPDATE', 'CANCEL'], [tab('PENDING FEES'), tab('RECENT PAYMENTS')]),

  // ---------- Library ----------
  M('LIBRARY', 'Books', 'Library', CRUD),
  M('LIBRARY', 'Categories', 'Library', CRUD),
  M('LIBRARY', 'Issues', 'Library', ['CREATE', 'VIEW', 'UPDATE']),

  // ---------- Notices ----------
  M('NOTICES', 'Notices', 'Notices', CRUD),

  // ---------- Reports / Import-Export (API only, no sidebar page in the frontend config yet) ----------
  M('REPORTS', 'Reports', 'Reports', ['VIEW']),
  M('REPORTS', 'Library Reports', 'Reports', ['VIEW']),
  M('IMPORT_EXPORT', 'Students', 'Administration', ['CREATE', 'VIEW']),   // CREATE = import, VIEW = export / template
  M('IMPORT_EXPORT', 'Exams', 'Administration', ['CREATE', 'VIEW']),
  M('IMPORT_EXPORT', 'Library', 'Administration', ['CREATE', 'VIEW']),
];

/** Default grants for system roles (follows ACCESS in the frontend permissions.js). Applied only when a role is created / reset. */
const systemRoles = {
  office_staff: [
    { module: 'DASHBOARD' },
    { module: 'NOTICES', actions: ['CREATE', 'VIEW', 'UPDATE'] },
    { module: 'COURSE MASTER', pages: ['Courses', 'Faculty Assignments'], actions: ['VIEW'] },
    { module: 'COURSE MASTER', pages: ['Subjects'] },
    { module: 'COURSE MASTER', pages: ['Class Schedules'], actions: ['VIEW', 'IMPORT'] },
    { module: 'STUDY MATERIAL', actions: ['VIEW'] },
    { module: 'EXAMS', pages: ['Results', 'Exams'], actions: ['VIEW'] },
    { module: 'EXAMS', pages: ['Class Tests'], actions: ['VIEW', 'EXPORT'] },
    { module: 'EXAMS', pages: ['Exam Forms'], actions: ['CREATE', 'VIEW'] },
    { module: 'ENQUIRIES' },
    { module: 'STUDENTS' },
    { module: 'TC/LC' },
    { module: 'FEES', actions: ['CREATE', 'VIEW', 'UPDATE'] },
    { module: 'LIBRARY', actions: ['VIEW'] },
    { module: 'REPORTS' },
    { module: 'IMPORT_EXPORT' },
  ],
  faculty: [
    { module: 'DASHBOARD' },
    { module: 'NOTICES', actions: ['VIEW'] },
    { module: 'COURSE MASTER', pages: ['Courses', 'Subjects', 'Faculty Assignments'], actions: ['VIEW'] },
    { module: 'COURSE MASTER', pages: ['Class Schedules'], actions: ['CREATE', 'VIEW', 'UPDATE'] },
    { module: 'STUDY MATERIAL' },
    { module: 'EXAMS', pages: ['Class Tests', 'Exams'] },
    { module: 'EXAMS', pages: ['Results', 'Exam Forms'], actions: ['VIEW'] },
    { module: 'STUDENTS', pages: ['Students'], actions: ['LIST'] },
    { module: 'IMPORT_EXPORT', pages: ['Exams'] },
  ],
  librarian: [
    { module: 'DASHBOARD' },
    { module: 'NOTICES', actions: ['VIEW'] },
    { module: 'LIBRARY' },
    { module: 'REPORTS', pages: ['Library Reports'] },
    { module: 'IMPORT_EXPORT', pages: ['Library'] },
  ],
  student: [],   // students use the student app routes (role check), no staff permissions
};

module.exports = { modules, systemRoles, code, slug, CRUD };