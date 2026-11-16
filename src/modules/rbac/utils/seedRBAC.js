// const Permission = require('../models/Permission');
// const Role = require('../models/Role');

// exports.seedRBAC = async () => {
//   try {
//     const permissionsList = [
//       { code: 'users.manage', module: 'Users', description: 'Manage staff users' },
//       { code: 'courses.manage', module: 'Courses', description: 'Manage courses and fees' },
//       { code: 'students.manage', module: 'Students', description: 'Manage students' },
//       { code: 'students.view', module: 'Students', description: 'View students' },
//       { code: 'fees.manage', module: 'Fees', description: 'Record payments' },
//       { code: 'fees.view', module: 'Fees', description: 'View fees' },
//       { code: 'exams.manage', module: 'Exams', description: 'Create exams and marks' },
//       { code: 'exam_forms.override', module: 'Exams', description: 'Override exam blocks' },
//       { code: 'library.manage', module: 'Library', description: 'Issue/Return books' },
//       { code: 'reports.view', module: 'Reports', description: 'Download Excel reports' },
//       { code: 'tc_lc.manage', module: 'TC/LC', description: 'Approve TC/LC' }
//     ];

//     await Permission.insertMany(permissionsList, { ordered: false }).catch(() => {});
//     const allPerms = await Permission.find();
//     const getIds = (codes) => allPerms.filter(p => codes.includes(p.code)).map(p => p._id);

//     const defaultRoles = [
//       { name: 'super_admin', description: 'Full access', isSystem: true, permissions: allPerms.map(p => p._id) },
//       { name: 'office_staff', description: 'Day-to-day ops', isSystem: true, permissions: getIds(['students.manage', 'students.view', 'fees.manage', 'fees.view', 'tc_lc.manage', 'reports.view']) },
//       { name: 'faculty', description: 'Teaching', isSystem: true, permissions: getIds(['exams.manage', 'students.view']) },
//       { name: 'librarian', description: 'Library only', isSystem: true, permissions: getIds(['library.manage']) },
//       { name: 'student', description: 'App only', isSystem: true, permissions: [] }
//     ];

//     for (const role of defaultRoles) {
//       await Role.findOneAndUpdate(
//         { name: role.name },
//         { $set: role },
//         { upsert: true, returnDocument: 'after' }
//       );
//     }
//     console.log('✅ RBAC Seeded successfully');
//   } catch (error) {
//     console.error('❌ RBAC Seeding failed:', error.message);
//   }
// };




const Permission = require('../models/Permission');
const Role = require('../models/Role');

const permissionsList = [
  { code: 'users.manage', module: 'Users', description: 'Manage staff users & roles' },
  { code: 'courses.manage', module: 'Courses', description: 'Manage courses, batches and fees' },
  { code: 'subjects.manage', module: 'Courses', description: 'Manage subjects' },
  { code: 'enquiries.manage', module: 'Enquiries', description: 'Manage enquiries & admissions' },
  { code: 'students.manage', module: 'Students', description: 'Manage students' },
  { code: 'students.view', module: 'Students', description: 'View students' },
  { code: 'documents.manage', module: 'Students', description: 'Manage student documents' },
  { code: 'fees.manage', module: 'Fees', description: 'Record payments' },
  { code: 'fees.view', module: 'Fees', description: 'View fees' },
  { code: 'exams.manage', module: 'Exams', description: 'Create exams and marks' },
  { code: 'exam_forms.manage', module: 'Exams', description: 'Process exam forms' },
  { code: 'exam_forms.override', module: 'Exams', description: 'Override exam blocks' },
  { code: 'class_tests.manage', module: 'Academics', description: 'Manage class tests and marks' },
  { code: 'schedules.manage', module: 'Academics', description: 'Manage class schedules' },
  { code: 'materials.manage', module: 'Academics', description: 'Upload/manage study materials' },
  { code: 'faculty.manage', module: 'Academics', description: 'Assign faculty' },
  { code: 'notices.manage', module: 'Notices', description: 'Create/edit notices' },
  { code: 'library.manage', module: 'Library', description: 'Issue/Return books' },
  { code: 'reports.view', module: 'Reports', description: 'Download Excel reports' },
  { code: 'tc_lc.manage', module: 'TC/LC', description: 'Approve TC/LC' },
  { code: 'audit.view', module: 'Audit', description: 'View audit logs' },
  { code: 'import_export.manage', module: 'Import/Export', description: 'Bulk import/export' },
];

exports.seedRBAC = async () => {
  try {
    // Upsert so NEW permissions get added on every boot (insertMany+catch skipped them silently)
    for (const p of permissionsList) {
      await Permission.updateOne({ code: p.code }, { $set: p }, { upsert: true });
    }
    const all = await Permission.find();
    const ids = (codes) => all.filter((p) => codes.includes(p.code)).map((p) => p._id);

    const system = [
      { name: 'super_admin', description: 'Full access', permissions: all.map((p) => p._id) },
      { name: 'office_staff', description: 'Day-to-day ops', permissions: ids(['students.manage','students.view','documents.manage','enquiries.manage','subjects.manage','fees.manage','fees.view','tc_lc.manage','reports.view','exam_forms.manage','notices.manage','schedules.manage','import_export.manage']) },
      { name: 'faculty', description: 'Teaching', permissions: ids(['exams.manage','class_tests.manage','schedules.manage','materials.manage','students.view']) },
      { name: 'librarian', description: 'Library only', permissions: ids(['library.manage','reports.view']) },
      { name: 'student', description: 'App only', permissions: [] },
    ];

    for (const r of system) {
      const existing = await Role.findOne({ name: r.name });
      if (!existing) {
        await Role.create({ ...r, isSystem: true });
      } else if (r.name === 'super_admin') {
        existing.permissions = r.permissions; // super_admin always gets everything
        await existing.save();
      }
      // For other system roles: do NOT overwrite — admin edits in the RBAC screen must survive restarts
    }
    console.log('✅ RBAC Seeded successfully');
  } catch (error) {
    console.error('❌ RBAC Seeding failed:', error.message);
  }
};