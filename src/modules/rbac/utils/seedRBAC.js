const Permission = require('../models/Permission');
const Role = require('../models/Role');

exports.seedRBAC = async () => {
  try {
    const permissionsList = [
      { code: 'users.manage', module: 'Users', description: 'Manage staff users' },
      { code: 'courses.manage', module: 'Courses', description: 'Manage courses and fees' },
      { code: 'students.manage', module: 'Students', description: 'Manage students' },
      { code: 'students.view', module: 'Students', description: 'View students' },
      { code: 'fees.manage', module: 'Fees', description: 'Record payments' },
      { code: 'fees.view', module: 'Fees', description: 'View fees' },
      { code: 'exams.manage', module: 'Exams', description: 'Create exams and marks' },
      { code: 'exam_forms.override', module: 'Exams', description: 'Override exam blocks' },
      { code: 'library.manage', module: 'Library', description: 'Issue/Return books' },
      { code: 'reports.view', module: 'Reports', description: 'Download Excel reports' },
      { code: 'tc_lc.manage', module: 'TC/LC', description: 'Approve TC/LC' }
    ];

    await Permission.insertMany(permissionsList, { ordered: false }).catch(() => {});
    const allPerms = await Permission.find();
    const getIds = (codes) => allPerms.filter(p => codes.includes(p.code)).map(p => p._id);

    const defaultRoles = [
      { name: 'super_admin', description: 'Full access', isSystem: true, permissions: allPerms.map(p => p._id) },
      { name: 'office_staff', description: 'Day-to-day ops', isSystem: true, permissions: getIds(['students.manage', 'students.view', 'fees.manage', 'fees.view', 'tc_lc.manage', 'reports.view']) },
      { name: 'faculty', description: 'Teaching', isSystem: true, permissions: getIds(['exams.manage', 'students.view']) },
      { name: 'librarian', description: 'Library only', isSystem: true, permissions: getIds(['library.manage']) },
      { name: 'student', description: 'App only', isSystem: true, permissions: [] }
    ];

    for (const role of defaultRoles) {
      await Role.findOneAndUpdate(
        { name: role.name },
        { $set: role },
        { upsert: true, returnDocument: 'after' }
      );
    }
    console.log('✅ RBAC Seeded successfully');
  } catch (error) {
    console.error('❌ RBAC Seeding failed:', error.message);
  }
};