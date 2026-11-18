// One-off helper: reset the permissions of the system roles (office_staff, faculty, librarian, student)
// back to the defaults in config/permissionCatalog.js.  Role _ids are kept, so users stay linked.
//   node scripts/resetSystemRoles.js
// Custom roles and super_admin are not touched (super_admin is synced on every boot).
require('dotenv').config();
const mongoose = require('mongoose');
const { seedRBAC } = require('../modules/rbac/utils/seedRBAC');
const { resetSystemRoles } = require('../modules/rbac/utils/seedRBAC');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await seedRBAC();                       // make sure catalog permissions are in the DB first
  const names = await resetSystemRoles();
  console.log('✅ Reset to catalog defaults:', names.join(', '));
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });