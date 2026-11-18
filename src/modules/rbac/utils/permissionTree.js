// Flat Permission docs -> Module -> Page -> { actions, tabs } for the role / user permission screens.
module.exports = function buildTree(perms) {
  const tree = {};
  for (const p of perms) {
    if (p.is_legacy || !p.page) continue;
    const mod = (tree[p.module] ||= { category: p.category, pages: {} });
    const page = (mod.pages[p.page] ||= { actions: [], tabs: {} });
    const node = p.tab ? (page.tabs[p.tab] ||= []) : page.actions;
    node.push({ id: p._id, code: p.code, action: p.action });
  }
  return tree;
};