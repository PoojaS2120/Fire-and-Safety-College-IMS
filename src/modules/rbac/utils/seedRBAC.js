
// // Syncs the permission catalog into MongoDB on every boot (idempotent, additive).
// const Permission = require('../models/Permission');
// const Role = require('../models/Role');
// const { modules, legacyMap, systemRoles, code } = require('../../../config/permissionCatalog');

// // Old flat codes: kept in DB so existing routes / roles keep working until fully migrated.
// const LEGACY = [
//   ['users.manage', 'Users'], ['courses.manage', 'Courses'], ['subjects.manage', 'Courses'],
//   ['enquiries.manage', 'Enquiries'], ['students.manage', 'Students'], ['students.view', 'Students'],
//   ['documents.manage', 'Students'], ['fees.manage', 'Fees'], ['fees.view', 'Fees'],
//   ['exams.manage', 'Exams'], ['exam_forms.manage', 'Exams'], ['exam_forms.override', 'Exams'],
//   ['class_tests.manage', 'Academics'], ['schedules.manage', 'Academics'], ['materials.manage', 'Academics'],
//   ['faculty.manage', 'Academics'], ['notices.manage', 'Notices'], ['library.manage', 'Library'],
//   ['reports.view', 'Reports'], ['tc_lc.manage', 'TC/LC'], ['audit.view', 'Audit'],
//   ['import_export.manage', 'Import/Export'],
// ];

// /** Flatten catalog -> [{code,module,page,tab,action,category}] */
// function flattenCatalog() {
//   const out = [];
//   for (const m of modules) {
//     const module = m.key.toUpperCase();
//     for (const a of m.actions) {
//       out.push({ code: code(module, m.page, a), module, page: m.page, tab: null, action: a.toUpperCase(), category: m.category });
//     }
//     for (const t of m.tabs || []) {
//       const tabName = typeof t === 'string' ? t : t.name;
//       const tabActions = typeof t === 'string' ? m.actions : (t.actions || m.actions);
//       for (const a of tabActions) {
//         out.push({ code: code(module, m.page, tabName, a), module, page: m.page, tab: tabName, action: a.toUpperCase(), category: m.category });
//       }
//     }
//   }
//   return out;
// }

// /** Resolve [{module,pages?,actions?}] grants to permission _ids (tab-level perms follow their page). */
// function resolveGrants(grants, all) {
//   const ids = new Set();
//   for (const g of grants) {
//     for (const p of all) {
//       if (p.is_legacy || p.module !== g.module.toUpperCase()) continue;
//       if (g.pages && !g.pages.includes(p.page)) continue;
//       if (g.actions && !g.actions.includes(p.action)) continue;
//       ids.add(String(p._id));
//     }
//   }
//   return [...ids];
// }

// exports.seedRBAC = async () => {
//   try {
//     // 1) upsert catalog permissions (new pages/tabs/actions appear automatically on restart)
//     const flat = flattenCatalog();
//     await Permission.bulkWrite(flat.map((p) => ({
//       updateOne: { filter: { code: p.code }, update: { $set: { ...p, is_legacy: false, is_active: true } }, upsert: true },
//     })));

//     // 2) deactivate catalog rows removed from the catalog (never delete: roles may reference them)
//     await Permission.updateMany(
//       { is_legacy: false, code: { $nin: flat.map((p) => p.code) } },
//       { $set: { is_active: false } }
//     );

//     // 3) legacy codes
//     await Permission.bulkWrite(LEGACY.map(([c, module]) => ({
//       updateOne: { filter: { code: c }, update: { $set: { code: c, module, is_legacy: true, description: 'Legacy permission' } }, upsert: true },
//     })));

//     const all = await Permission.find({ is_active: true });

//     // 4) super_admin always gets everything
//     await Role.updateOne(
//       { name: 'super_admin' },
//       { $set: { description: 'Full access', isSystem: true, permissions: all.map((p) => p._id), catalogMigrated: true } },
//       { upsert: true }
//     );

//     // 5) other system roles: create with defaults only if missing (admin edits survive restarts)
//     for (const [name, grants] of Object.entries(systemRoles)) {
//       if (!(await Role.findOne({ name }))) {
//         await Role.create({ name, isSystem: true, catalogMigrated: true, permissions: resolveGrants(grants, all) });
//       }
//     }

//     // 6) one-time migration of existing roles: legacy code -> catalog permissions (additive)
//     const toMigrate = await Role.find({ catalogMigrated: { $ne: true } }).populate('permissions', 'code');
//     for (const role of toMigrate) {
//       const ids = new Set(role.permissions.map((p) => String(p._id)));
//       for (const p of role.permissions) {
//         if (legacyMap[p.code]) resolveGrants(legacyMap[p.code], all).forEach((id) => ids.add(id));
//       }
//       role.permissions = [...ids];
//       role.catalogMigrated = true;
//       await role.save();
//     }

//     console.log(`✅ RBAC synced: ${flat.length} catalog permissions, ${toMigrate.length} role(s) migrated`);
//   } catch (error) {
//     console.error('❌ RBAC Seeding failed:', error.message);
//   }
// };


// Syncs config/permissionCatalog.js into MongoDB on every boot. Idempotent.
//  - adds new pages / tabs / actions
//  - deactivates entries removed from the catalog (never deletes: roles may reference them)
//  - removes old flat permissions (fees.manage ...) from roles/users and deletes them
//  - super_admin always receives every active permission
//  - other system roles are created once; later edits made in the RBAC screen are never overwritten
const Permission = require('../models/Permission');
const Role = require('../models/Role');
const User = require('../../auth/models/User');
const { modules, systemRoles, code } = require('../../../config/permissionCatalog');

/** Flatten catalog -> [{ code, module, page, tab, action, category }] */
function flattenCatalog() {
  const out = [];
  for (const m of modules) {
    const module = m.key.toUpperCase();
    for (const a of m.actions) {
      out.push({ code: code(module, m.page, a), module, page: m.page, tab: null, action: a.toUpperCase(), category: m.category });
    }
    for (const t of m.tabs || []) {
      for (const a of t.actions || m.actions) {
        out.push({ code: code(module, m.page, t.name, a), module, page: m.page, tab: t.name, action: a.toUpperCase(), category: m.category });
      }
    }
  }
  return out;
}

/** [{ module, pages?, actions? }] -> permission _ids. Omitted pages/actions = all. */
function resolveGrants(grants, all) {
  const ids = new Set();
  for (const g of grants) {
    for (const p of all) {
      if (p.module !== g.module.toUpperCase()) continue;
      if (g.pages && !g.pages.includes(p.page)) continue;
      if (g.actions && !g.actions.includes(p.action)) continue;
      ids.add(String(p._id));
    }
  }
  return [...ids];
}

/** Old-style permissions (no page) from the previous flat system. */
async function removeOldFlatPermissions() {
  const old = await Permission.find({ $or: [{ page: null }, { page: { $exists: false } }] }).select('_id');
  if (!old.length) return 0;
  const ids = old.map((p) => p._id);
  await Role.updateMany({}, { $pull: { permissions: { $in: ids } } });
  await User.updateMany({}, { $pull: { extra_permissions: { $in: ids }, denied_permissions: { $in: ids } } });
  await Permission.deleteMany({ _id: { $in: ids } });
  return ids.length;
}

exports.seedRBAC = async () => {
  try {
    const removedOld = await removeOldFlatPermissions();

    const flat = flattenCatalog();
    await Permission.bulkWrite(flat.map((p) => ({
      updateOne: { filter: { code: p.code }, update: { $set: { ...p, is_active: true } }, upsert: true },
    })));
    await Permission.updateMany({ code: { $nin: flat.map((p) => p.code) } }, { $set: { is_active: false } });

    const all = await Permission.find({ is_active: true });

    // super_admin: always everything
    await Role.updateOne(
      { name: 'super_admin' },
      { $set: { description: 'Full access', isSystem: true, permissions: all.map((p) => p._id) } },
      { upsert: true }
    );

    // other system roles: only create if missing
    for (const [name, grants] of Object.entries(systemRoles)) {
      if (!(await Role.exists({ name }))) {
        await Role.create({ name, isSystem: true, description: name.replace('_', ' '), permissions: resolveGrants(grants, all) });
      }
    }

    console.log(`✅ RBAC synced: ${flat.length} permissions${removedOld ? `, ${removedOld} old flat permission(s) removed` : ''}`);
  } catch (error) {
    console.error('❌ RBAC Seeding failed:', error.message);
  }
};

/** Reset system roles (not super_admin) to catalog defaults, keeping their _id. Used by scripts/resetSystemRoles.js */
exports.resetSystemRoles = async () => {
  const all = await Permission.find({ is_active: true });
  const names = Object.keys(systemRoles);
  for (const name of names) {
    await Role.updateOne(
      { name },
      { $set: { isSystem: true, permissions: resolveGrants(systemRoles[name], all) } },
      { upsert: true }
    );
  }
  return names;
};