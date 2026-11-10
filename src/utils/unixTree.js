/**
 * Pure deterministic Unix `tree(1)` flattening & ASCII formatting utilities.
 *
 * Uses connected box-drawing topology with downward branch tees (`┬` — "trójnik"):
 * - `├── ` (branch with following siblings)
 * - `└── ` (last branch in group)
 * - `├───┬── ` / `└───┬── ` (expanded parent branch with downward tee `┬` directly above child trunk)
 * - `│   ` (vertical continuation guide for ancestors with following siblings)
 * - `    ` (blank indent for completed ancestor branches)
 */

export const UNIX_TREE_GLYPHS = Object.freeze({
  BRANCH: '├── ',
  LAST_BRANCH: '└── ',
  BRANCH_TEE: '├───┬── ',
  LAST_BRANCH_TEE: '└───┬── ',
  VERTICAL: '│   ',
  SPACE: '    ',
});

/**
 * Checks whether a node or any of its descendants match a search query.
 *
 * @param {Object} node
 * @param {string} normalizedQuery
 * @returns {boolean}
 */
export function matchesTreeNodeQuery(node, normalizedQuery) {
  if (!normalizedQuery) return true;
  const label = String(node?.label || node?.name || node?.id || '').toLowerCase();
  const meta = String(node?.meta || node?.sublabel || '').toLowerCase();
  const badge = String(node?.badge || '').toLowerCase();
  if (
    label.includes(normalizedQuery) ||
    meta.includes(normalizedQuery) ||
    badge.includes(normalizedQuery)
  ) {
    return true;
  }
  const children = Array.isArray(node?.children) ? node.children : [];
  return children.some((child) => matchesTreeNodeQuery(child, normalizedQuery));
}

/**
 * Filters a hierarchical tree while preserving ancestor paths of matching nodes.
 *
 * @param {Array<Object>} nodes
 * @param {string} query
 * @returns {Array<Object>}
 */
export function filterUnixTreeNodes(nodes = [], query = '') {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return Array.isArray(nodes) ? nodes : [];

  const walk = (list) => {
    const out = [];
    for (const item of list || []) {
      if (!item) continue;
      const rawChildren = Array.isArray(item.children) ? item.children : [];
      const filteredChildren = walk(rawChildren);
      const selfMatches =
        String(item.label || item.name || item.id || '')
          .toLowerCase()
          .includes(q) ||
        String(item.meta || item.sublabel || '')
          .toLowerCase()
          .includes(q) ||
        String(item.badge || '')
          .toLowerCase()
          .includes(q);

      if (selfMatches || filteredChildren.length > 0) {
        out.push({
          ...item,
          children: filteredChildren.length > 0 ? filteredChildren : rawChildren,
        });
      }
    }
    return out;
  };

  return walk(nodes);
}

/**
 * Collects all expandable node IDs up to a given depth.
 *
 * @param {Array<Object>} nodes
 * @param {number} [maxDepth=Infinity]
 * @returns {Set<string>}
 */
export function collectExpandableTreeIds(nodes = [], maxDepth = Infinity) {
  const ids = new Set();
  const walk = (list, depth) => {
    if (depth >= maxDepth) return;
    for (const node of list || []) {
      if (!node || !node.id) continue;
      if (Array.isArray(node.children) && node.children.length > 0) {
        ids.add(String(node.id));
        walk(node.children, depth + 1);
      }
    }
  };
  walk(nodes, 0);
  return ids;
}

/**
 * Flattens a hierarchical node list into visible Unix `tree(1)` rows with
 * exact box-drawing prefix strings and geometric column segments (`pipe`, `space`, `branch`, `last`, `branch-HorizontalTee`, `last-HorizontalTee`, `tee-down`).
 *
 * When a parent node is expanded (`hasChildren && isExpanded`), its connector
 * includes a horizontal bridge into a downward `┬` tee (`├───┬── `) at column `depth + 1`
 * so the vertical trunk of its children hangs directly from the `┬` crossbar.
 *
 * @param {Array<Object>} nodes
 * @param {Object} [options]
 * @param {Set<string>|Array<string>| null} [options.expandedIds=null] - If null, all nodes with children are expanded
 * @returns {Array<Object>}
 */
export function flattenUnixTree(nodes = [], { expandedIds = null } = {}) {
  const expandedSet =
    expandedIds instanceof Set
      ? expandedIds
      : Array.isArray(expandedIds)
        ? new Set(expandedIds.map(String))
        : null;

  const rows = [];

  const walk = (list, depth, ancestorContinuation) => {
    const valid = (list || []).filter(Boolean);
    const len = valid.length;

    for (let i = 0; i < len; i += 1) {
      const node = valid[i];
      const isLast = i === len - 1;
      const children = Array.isArray(node.children) ? node.children : [];
      const hasChildren = children.length > 0;
      const nodeId = String(node.id ?? `${depth}-${i}-${node.label || node.name || ''}`);
      const isExpanded = hasChildren && (expandedSet === null ? true : expandedSet.has(nodeId));

      const guideColumns = [];
      let prefix = '';

      for (let d = 0; d < depth; d += 1) {
        const hasMoreAtDepth = Boolean(ancestorContinuation[d]);
        const seg = hasMoreAtDepth ? UNIX_TREE_GLYPHS.VERTICAL : UNIX_TREE_GLYPHS.SPACE;
        guideColumns.push({
          type: hasMoreAtDepth ? 'pipe' : 'space',
          glyph: seg,
        });
        prefix += seg;
      }

      if (isExpanded) {
        const connector = isLast
          ? UNIX_TREE_GLYPHS.LAST_BRANCH_TEE
          : UNIX_TREE_GLYPHS.BRANCH_TEE;
        guideColumns.push({
          type: isLast ? 'last-bridge' : 'branch-bridge',
          glyph: isLast ? '└───' : '├───',
        });
        guideColumns.push({
          type: 'tee-down',
          glyph: '┬── ',
        });
        prefix += connector;
      } else {
        const connector = isLast ? UNIX_TREE_GLYPHS.LAST_BRANCH : UNIX_TREE_GLYPHS.BRANCH;
        guideColumns.push({
          type: isLast ? 'last' : 'branch',
          glyph: connector,
        });
        prefix += connector;
      }

      rows.push({
        id: nodeId,
        node,
        label: String(node.label || node.name || nodeId),
        depth,
        isLast,
        hasChildren,
        childrenCount: children.length,
        isExpanded,
        prefix,
        guideColumns,
        // Keep legacy `segments` alias for backwards compatibility
        segments: guideColumns.map((c) => c.glyph),
      });

      if (hasChildren && isExpanded) {
        walk(children, depth + 1, [...ancestorContinuation, !isLast]);
      }
    }
  };

  walk(nodes, 0, []);
  return rows;
}

/**
 * Generates a complete plain-text Unix `tree(1)` representation for copy/paste or CLI output.
 *
 * @param {Array<Object>} nodes
 * @param {Object} [options]
 * @param {string} [options.rootLabel='.']
 * @param {Set<string>|null} [options.expandedIds=null]
 * @returns {string}
 */
export function formatUnixAsciiTree(nodes = [], { rootLabel = '.', expandedIds = null } = {}) {
  const rows = flattenUnixTree(nodes, { expandedIds });
  const lines = [];
  if (rootLabel) {
    lines.push(String(rootLabel));
  }
  for (const row of rows) {
    const n = row.node || {};
    const ver = n.version ? ` v${String(n.version).replace(/^v/, '')}` : '';
    const badge = n.badge ? ` [${n.badge}]` : '';
    const meta = n.meta ? ` (${n.meta})` : '';
    lines.push(`${row.prefix}${row.label}${ver}${badge}${meta}`);
  }
  return lines.join('\n');
}
