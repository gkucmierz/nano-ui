<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import {
  filterUnixTreeNodes,
  collectExpandableTreeIds,
  flattenUnixTree,
  formatUnixAsciiTree,
} from '../utils/unixTree.js';
import { tooltipDirective as vTooltip } from '../directives/tooltip.js';

const props = defineProps({
  nodes: {
    type: Array,
    default: () => [],
  },
  rootTitle: {
    type: String,
    default: '.',
  },
  rootIcon: {
    type: String,
    default: '🌳',
  },
  rootSublabel: {
    type: String,
    default: '',
  },
  selectedId: {
    type: String,
    default: '',
  },
  searchQuery: {
    type: String,
    default: '',
  },
  searchable: {
    type: Boolean,
    default: true,
  },
  searchPlaceholder: {
    type: String,
    default: 'Filter tree nodes (grep)...',
  },
  defaultExpandDepth: {
    type: Number,
    default: 3,
  },
  showToolbar: {
    type: Boolean,
    default: true,
  },
  showCopyAscii: {
    type: Boolean,
    default: true,
  },
  showSummaryFooter: {
    type: Boolean,
    default: true,
  },
  theme: {
    type: String,
    default: 'auto',
    validator: (v) => v === 'auto' || v === 'light' || v === 'dark',
  },
});

const emit = defineEmits(['update:selectedId', 'update:searchQuery', 'select', 'toggle']);

const internalSearch = ref(props.searchQuery || '');
const expandedIds = ref(new Set());
const copiedAscii = ref(false);
let copyTimer = null;

watch(
  () => props.searchQuery,
  (val) => {
    if (val !== internalSearch.value) {
      internalSearch.value = val || '';
    }
  }
);

watch(internalSearch, (val) => {
  emit('update:searchQuery', val);
});

watch(
  () => [props.nodes, props.defaultExpandDepth],
  ([nextNodes, depth]) => {
    expandedIds.value = collectExpandableTreeIds(nextNodes, depth);
  },
  { immediate: true, deep: false }
);

const effectiveSearch = computed(() => String(internalSearch.value || '').trim());

const themeClass = computed(() =>
  props.theme === 'light'
    ? 'theme-light'
    : props.theme === 'dark'
      ? 'theme-dark'
      : ''
);

const filteredNodes = computed(() =>
  filterUnixTreeNodes(props.nodes, effectiveSearch.value)
);

const activeExpandedIds = computed(() => {
  if (effectiveSearch.value) {
    return collectExpandableTreeIds(filteredNodes.value, Infinity);
  }
  return expandedIds.value;
});

const visibleRows = computed(() =>
  flattenUnixTree(filteredNodes.value, { expandedIds: activeExpandedIds.value })
);

const treeStats = computed(() => {
  let branches = 0;
  let leaves = 0;
  const walk = (list) => {
    for (const n of list || []) {
      if (!n) continue;
      if (Array.isArray(n.children) && n.children.length > 0) {
        branches += 1;
        walk(n.children);
      } else {
        leaves += 1;
      }
    }
  };
  walk(filteredNodes.value);
  return { branches, leaves, total: branches + leaves };
});

function toggleNode(row, event) {
  if (event) event.stopPropagation();
  if (!row.hasChildren) return;
  const next = new Set(activeExpandedIds.value);
  if (next.has(row.id)) {
    next.delete(row.id);
  } else {
    next.add(row.id);
  }
  expandedIds.value = next;
  emit('toggle', { id: row.id, expanded: next.has(row.id), node: row.node });
}

function selectRow(row) {
  emit('update:selectedId', row.id);
  emit('select', row.node);
}

function expandAll() {
  expandedIds.value = collectExpandableTreeIds(props.nodes, Infinity);
}

function collapseAll() {
  expandedIds.value = new Set();
}

async function copyAsciiToClipboard() {
  const ascii = formatUnixAsciiTree(filteredNodes.value, {
    rootLabel: props.rootTitle || '.',
    expandedIds: activeExpandedIds.value,
  });
  try {
    const clipboard = globalThis.navigator?.clipboard;
    if (clipboard) {
      await clipboard.writeText(ascii);
      copiedAscii.value = true;
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(() => {
        copiedAscii.value = false;
      }, 1800);
    }
  } catch {
    // Fallback ignored in headless environments
  }
}

onUnmounted(() => {
  if (copyTimer) {
    clearTimeout(copyTimer);
    copyTimer = null;
  }
});

function onRowKeydown(event, row, index) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    selectRow(row);
  } else if (event.key === 'ArrowRight' && row.hasChildren && !row.isExpanded) {
    event.preventDefault();
    toggleNode(row);
  } else if (event.key === 'ArrowLeft' && row.hasChildren && row.isExpanded) {
    event.preventDefault();
    toggleNode(row);
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    const nextEl = event.currentTarget?.parentElement?.children?.[index + 1];
    nextEl?.focus?.();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    const prevEl = event.currentTarget?.parentElement?.children?.[index - 1];
    prevEl?.focus?.();
  }
}
</script>

<template>
  <div class="nano-tree" :class="themeClass">
    <div v-if="showToolbar" class="nano-tree-toolbar">
      <div class="nano-tree-root-head">
        <span v-if="rootIcon" class="nano-tree-root-icon" aria-hidden="true">{{ rootIcon }}</span>
        <code class="nano-tree-root-title">{{ rootTitle }}</code>
        <span v-if="rootSublabel" class="nano-tree-root-sub">{{ rootSublabel }}</span>
      </div>

      <div class="nano-tree-actions">
        <input
          v-if="searchable"
          id="nano-tree-search-input"
          v-model="internalSearch"
          name="nano-tree-search"
          type="search"
          class="nano-tree-search"
          :placeholder="searchPlaceholder"
          :aria-label="searchPlaceholder"
        />
        <button
          type="button"
          class="nano-tree-btn"
          v-tooltip="'Expand all branches'"
          @click="expandAll"
        >
          [+] Expand
        </button>
        <button
          type="button"
          class="nano-tree-btn"
          v-tooltip="'Collapse all branches'"
          @click="collapseAll"
        >
          [−] Collapse
        </button>
        <button
          v-if="showCopyAscii"
          type="button"
          class="nano-tree-btn nano-tree-btn-copy"
          :class="{ 'is-copied': copiedAscii }"
          v-tooltip="'Copy Unix ASCII tree to clipboard'"
          @click="copyAsciiToClipboard"
        >
          {{ copiedAscii ? '✓ Copied tree' : '📋 Copy tree' }}
        </button>
      </div>
    </div>

    <div class="nano-tree-viewport" role="tree" :aria-label="rootTitle">
      <!-- Top root trunk cap ("płaska deska z wiszącym ptaszkiem" ┬) connecting header to first branch -->
      <div v-if="visibleRows.length > 0" class="nano-tree-root-trunk-cap" aria-hidden="true">
        <span class="nano-tree-root-tee" />
      </div>

      <div v-if="visibleRows.length === 0" class="nano-tree-empty">
        0 matching nodes in tree
      </div>

      <div
        v-for="(row, idx) in visibleRows"
        :key="row.id"
        class="nano-tree-row"
        :class="{
          'is-selected': selectedId && selectedId === row.id,
          'is-branch': row.hasChildren,
          'is-leaf': !row.hasChildren,
          'is-cycle': Boolean(row.node?.inCycle || row.node?.danger),
        }"
        role="treeitem"
        tabindex="0"
        :aria-expanded="row.hasChildren ? row.isExpanded : undefined"
        :aria-selected="selectedId === row.id"
        @click="selectRow(row)"
        @keydown="onRowKeydown($event, row, idx)"
      >
        <!-- Connected geometric box-drawing columns (0px vertical/horizontal gap + copyable ASCII glyphs) -->
        <span class="nano-tree-prefix" aria-hidden="true">
          <span
            v-for="(col, cIdx) in row.guideColumns"
            :key="cIdx"
            class="nano-tree-guide-col"
            :class="`is-${col.type}`"
          >{{ col.glyph }}</span>
        </span>

        <!-- Expand / Collapse toggle [−] / [+] -->
        <button
          v-if="row.hasChildren"
          type="button"
          class="nano-tree-toggle"
          :aria-label="row.isExpanded ? `Collapse ${row.label}` : `Expand ${row.label}`"
          @click="toggleNode(row, $event)"
        >
          {{ row.isExpanded ? '[−]' : '[+]' }}
        </button>
        <span v-else class="nano-tree-leaf-dot" aria-hidden="true">·</span>

        <!-- Optional Icon -->
        <span v-if="row.node?.icon" class="nano-tree-node-icon" aria-hidden="true">
          {{ row.node.icon }}
        </span>

        <!-- Primary Node Name -->
        <span class="nano-tree-label">{{ row.label }}</span>

        <!-- Optional SemVer tag -->
        <span v-if="row.node?.version" class="nano-tree-version">
          v{{ String(row.node.version).replace(/^v/, '') }}
        </span>

        <!-- Optional Semantic Badge (e.g. PUBLIC / PRIVATE / CYCLE) -->
        <span
          v-if="row.node?.badge"
          class="nano-tree-badge"
          :class="row.node.badgeVariant || 'default'"
        >
          {{ row.node.badge }}
        </span>

        <!-- Optional Secondary Meta / Consumer Counters -->
        <span v-if="row.node?.meta" class="nano-tree-meta">
          {{ row.node.meta }}
        </span>

        <!-- Slot for custom right-side pills or actions -->
        <slot name="node-extra" :node="row.node" :row="row" />
      </div>
    </div>

    <div v-if="showSummaryFooter" class="nano-tree-footer">
      <span>
        <code>{{ treeStats.branches }}</code> branches,
        <code>{{ treeStats.leaves }}</code> leaves
        (<code>{{ visibleRows.length }}</code> visible rows)
      </span>
      <span class="nano-tree-hint">
        Unix <code>tree(1)</code> · Click <code>[−]</code>/<code>[+]</code> to fold · Click row to inspect
      </span>
    </div>
  </div>
</template>

<style scoped>
.nano-tree {
  --tree-col-w: 28px;
  --tree-line-color: var(--nano-tree-line, rgba(148, 163, 184, 0.52));
  --tree-line-active: var(--nano-tree-line-active, rgba(56, 189, 248, 0.85));
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  background: var(--nano-tree-bg, rgba(10, 15, 28, 0.86));
  border: 1px solid var(--nano-tree-border, rgba(148, 163, 184, 0.2));
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--nano-tree-fg, #e2e8f0);
  overflow: hidden;
}

.nano-tree.theme-light {
  color-scheme: light;
  --nano-tree-bg: #ffffff;
  --nano-tree-border: #cbd5e1;
  --nano-tree-fg: #0f172a;
  --nano-tree-label-fg: #0f172a;
  --nano-tree-muted: #475569;
  --nano-tree-subtle-fg: #475569;
  --nano-tree-line: #64748b;
  --nano-tree-line-active: #0284c7;
  --nano-tree-accent: #0369a1;
  --nano-tree-accent-hover: #0284c7;
  --nano-tree-leaf-dot: #64748b;
  --nano-tree-toolbar-bg: #f8fafc;
  --nano-tree-toolbar-border: #cbd5e1;
  --nano-tree-footer-bg: #f8fafc;
  --nano-tree-footer-border: #e2e8f0;
  --nano-tree-root-title-fg: #0369a1;
  --nano-tree-root-title-bg: #f0f9ff;
  --nano-tree-root-title-border: #7dd3fc;
  --nano-tree-input-bg: #ffffff;
  --nano-tree-input-border: #94a3b8;
  --nano-tree-input-fg: #0f172a;
  --nano-tree-input-focus-border: #0284c7;
  --nano-tree-btn-bg: #ffffff;
  --nano-tree-btn-border: #94a3b8;
  --nano-tree-btn-fg: #1e293b;
  --nano-tree-btn-hover-bg: #f1f5f9;
  --nano-tree-btn-hover-border: #0284c7;
  --nano-tree-btn-hover-fg: #0f172a;
  --nano-tree-copied-bg: #ecfdf5;
  --nano-tree-copied-border: #10b981;
  --nano-tree-copied-fg: #047857;
  --nano-tree-row-hover-bg: rgba(2, 132, 199, 0.08);
  --nano-tree-row-selected-bg: rgba(2, 132, 199, 0.14);
  --nano-tree-row-selected-bar: #0284c7;
  --nano-tree-row-cycle-bg: rgba(225, 29, 72, 0.1);
  --nano-tree-badge-bg: #f1f5f9;
  --nano-tree-badge-border: #94a3b8;
  --nano-tree-badge-fg: #334155;
  --nano-tree-badge-emerald-bg: #ecfdf5;
  --nano-tree-badge-emerald-border: #10b981;
  --nano-tree-badge-emerald-fg: #047857;
  --nano-tree-badge-amber-bg: #fffbeb;
  --nano-tree-badge-amber-border: #d97706;
  --nano-tree-badge-amber-fg: #b45309;
  --nano-tree-badge-cyan-bg: #ecfeff;
  --nano-tree-badge-cyan-border: #0891b2;
  --nano-tree-badge-cyan-fg: #0e7490;
  --nano-tree-badge-indigo-bg: #eef2ff;
  --nano-tree-badge-indigo-border: #6366f1;
  --nano-tree-badge-indigo-fg: #4338ca;
  --nano-tree-badge-rose-bg: #fff1f2;
  --nano-tree-badge-rose-border: #e11d48;
  --nano-tree-badge-rose-fg: #be123c;
  --tree-line-color: var(--nano-tree-line);
  --tree-line-active: var(--nano-tree-line-active);
}

.nano-tree.theme-dark {
  color-scheme: dark;
  --nano-tree-bg: rgba(10, 15, 28, 0.86);
  --nano-tree-border: rgba(148, 163, 184, 0.2);
  --nano-tree-fg: #e2e8f0;
  --nano-tree-label-fg: #f8fafc;
  --nano-tree-muted: #94a3b8;
  --nano-tree-subtle-fg: #64748b;
  --nano-tree-line: rgba(148, 163, 184, 0.52);
  --nano-tree-line-active: rgba(56, 189, 248, 0.85);
  --nano-tree-accent: #38bdf8;
  --nano-tree-accent-hover: #7dd3fc;
  --nano-tree-leaf-dot: #475569;
  --nano-tree-toolbar-bg: rgba(15, 23, 42, 0.9);
  --nano-tree-toolbar-border: rgba(148, 163, 184, 0.16);
  --nano-tree-footer-bg: rgba(15, 23, 42, 0.75);
  --nano-tree-footer-border: rgba(148, 163, 184, 0.14);
  --nano-tree-root-title-fg: #38bdf8;
  --nano-tree-root-title-bg: rgba(56, 189, 248, 0.1);
  --nano-tree-root-title-border: rgba(56, 189, 248, 0.25);
  --nano-tree-input-bg: rgba(2, 6, 23, 0.65);
  --nano-tree-input-border: rgba(148, 163, 184, 0.26);
  --nano-tree-input-fg: #f8fafc;
  --nano-tree-input-focus-border: rgba(56, 189, 248, 0.65);
  --nano-tree-btn-bg: rgba(30, 41, 59, 0.7);
  --nano-tree-btn-border: rgba(148, 163, 184, 0.24);
  --nano-tree-btn-fg: #cbd5e1;
  --nano-tree-btn-hover-bg: rgba(51, 65, 85, 0.85);
  --nano-tree-btn-hover-border: rgba(56, 189, 248, 0.45);
  --nano-tree-btn-hover-fg: #f8fafc;
  --nano-tree-copied-bg: rgba(16, 185, 129, 0.18);
  --nano-tree-copied-border: rgba(16, 185, 129, 0.5);
  --nano-tree-copied-fg: #34d399;
  --nano-tree-row-hover-bg: rgba(56, 189, 248, 0.09);
  --nano-tree-row-selected-bg: rgba(56, 189, 248, 0.16);
  --nano-tree-row-selected-bar: #38bdf8;
  --nano-tree-row-cycle-bg: rgba(244, 63, 94, 0.12);
  --nano-tree-badge-bg: rgba(30, 41, 59, 0.75);
  --nano-tree-badge-border: rgba(148, 163, 184, 0.28);
  --nano-tree-badge-fg: #cbd5e1;
  --nano-tree-badge-emerald-bg: rgba(16, 185, 129, 0.14);
  --nano-tree-badge-emerald-border: rgba(16, 185, 129, 0.42);
  --nano-tree-badge-emerald-fg: #34d399;
  --nano-tree-badge-amber-bg: rgba(245, 158, 11, 0.14);
  --nano-tree-badge-amber-border: rgba(245, 158, 11, 0.42);
  --nano-tree-badge-amber-fg: #fbbf24;
  --nano-tree-badge-cyan-bg: rgba(6, 182, 212, 0.14);
  --nano-tree-badge-cyan-border: rgba(6, 182, 212, 0.42);
  --nano-tree-badge-cyan-fg: #22d3ee;
  --nano-tree-badge-indigo-bg: rgba(99, 102, 241, 0.16);
  --nano-tree-badge-indigo-border: rgba(99, 102, 241, 0.45);
  --nano-tree-badge-indigo-fg: #a5b4fc;
  --nano-tree-badge-rose-bg: rgba(244, 63, 94, 0.18);
  --nano-tree-badge-rose-border: rgba(244, 63, 94, 0.5);
  --nano-tree-badge-rose-fg: #fb7185;
  --tree-line-color: var(--nano-tree-line);
  --tree-line-active: var(--nano-tree-line-active);
}

.nano-tree-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background: var(--nano-tree-toolbar-bg, rgba(15, 23, 42, 0.9));
  border-bottom: 1px solid var(--nano-tree-toolbar-border, rgba(148, 163, 184, 0.16));
  flex-wrap: wrap;
}

.nano-tree-root-head {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.nano-tree-root-icon {
  font-size: 1rem;
  line-height: 1;
}

.nano-tree-root-title {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--nano-tree-root-title-fg, #38bdf8);
  background: var(--nano-tree-root-title-bg, rgba(56, 189, 248, 0.1));
  border: 1px solid var(--nano-tree-root-title-border, rgba(56, 189, 248, 0.25));
  padding: 3px 8px;
  border-radius: 6px;
}

.nano-tree-root-sub {
  font-size: 0.76rem;
  color: var(--nano-tree-muted, #94a3b8);
}

.nano-tree-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.nano-tree-search {
  height: 36px;
  min-width: 210px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid var(--nano-tree-input-border, rgba(148, 163, 184, 0.26));
  background: var(--nano-tree-input-bg, rgba(2, 6, 23, 0.65));
  color: var(--nano-tree-input-fg, #f8fafc);
  font-family: inherit;
  font-size: 0.78rem;
  box-sizing: border-box;
  outline: none;
}

.nano-tree-search:focus {
  border-color: var(--nano-tree-input-focus-border, rgba(56, 189, 248, 0.65));
}

.nano-tree-btn {
  height: 36px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid var(--nano-tree-btn-border, rgba(148, 163, 184, 0.24));
  background: var(--nano-tree-btn-bg, rgba(30, 41, 59, 0.7));
  color: var(--nano-tree-btn-fg, #cbd5e1);
  font-family: inherit;
  font-size: 0.76rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  box-sizing: border-box;
  line-height: 1;
  transition:
    background var(--nano-duration-fast, 150ms) ease,
    border-color var(--nano-duration-fast, 150ms) ease,
    color var(--nano-duration-fast, 150ms) ease;
}

.nano-tree-btn:hover {
  background: var(--nano-tree-btn-hover-bg, rgba(51, 65, 85, 0.85));
  color: var(--nano-tree-btn-hover-fg, #f8fafc);
  border-color: var(--nano-tree-btn-hover-border, rgba(56, 189, 248, 0.45));
}

.nano-tree-btn-copy.is-copied {
  background: var(--nano-tree-copied-bg, rgba(16, 185, 129, 0.18));
  border-color: var(--nano-tree-copied-border, rgba(16, 185, 129, 0.5));
  color: var(--nano-tree-copied-fg, #34d399);
}

.nano-tree-viewport {
  padding: 0 8px 8px;
  overflow-x: auto;
  display: flex;
  flex-direction: column;
}

/* Root trunk "trójnik: płaska deska z wiszącym ptaszkiem" (┬) right under the root header */
.nano-tree-root-trunk-cap {
  display: flex;
  align-items: stretch;
  height: 10px;
  padding-left: 10px;
  pointer-events: none;
}

.nano-tree-root-tee {
  position: relative;
  display: inline-block;
  width: var(--tree-col-w);
  height: 100%;
}

/* Horizontal flat crossbar ("płaska deska") at the top of the root trunk */
.nano-tree-root-tee::before {
  content: '';
  position: absolute;
  top: 0;
  left: 2px;
  right: 2px;
  height: 2px;
  background: var(--tree-line-active);
  border-radius: 1px;
}

/* Vertical hanging stem ("wiszący ptaszek") connecting straight down into column 0 */
.nano-tree-root-tee::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(var(--tree-col-w) / 2 - 1px);
  width: 1.5px;
  background: var(--tree-line-color);
}

.nano-tree-empty {
  padding: 20px;
  text-align: center;
  color: var(--nano-tree-subtle-fg, #64748b);
  font-size: 0.82rem;
}

.nano-tree-row {
  display: flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 7px;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: background var(--nano-duration-fast, 150ms) ease;
  outline: none;
}

.nano-tree-row:hover,
.nano-tree-row:focus-visible {
  background: var(--nano-tree-row-hover-bg, rgba(56, 189, 248, 0.09));
}

.nano-tree-row.is-selected {
  background: var(--nano-tree-row-selected-bg, rgba(56, 189, 248, 0.16));
  box-shadow: inset 2px 0 0 var(--nano-tree-row-selected-bar, #38bdf8);
}

.nano-tree-row.is-cycle {
  background: var(--nano-tree-row-cycle-bg, rgba(244, 63, 94, 0.12));
}

/* Seamless full-height CSS geometric box-drawing columns (0px gaps between rows!) */
.nano-tree-prefix {
  display: inline-flex;
  align-self: stretch;
  align-items: stretch;
  flex-shrink: 0;
  user-select: text;
}

.nano-tree-guide-col {
  position: relative;
  display: inline-block;
  width: var(--tree-col-w);
  align-self: stretch;
  color: transparent;
  font-size: 0.75rem;
  line-height: 30px;
  overflow: hidden;
  flex-shrink: 0;
}

/* 1. Vertical continuation pipe: │ (top: 0 -> bottom: 0) */
.nano-tree-guide-col.is-pipe::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(var(--tree-col-w) / 2 - 1px);
  width: 1.5px;
  background: var(--tree-line-color);
}

/* 2. Standard branch: ├── (vertical top: 0 -> bottom: 0, horizontal center -> right) */
.nano-tree-guide-col.is-branch::before,
.nano-tree-guide-col.is-branch-bridge::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(var(--tree-col-w) / 2 - 1px);
  width: 1.5px;
  background: var(--tree-line-color);
}

.nano-tree-guide-col.is-branch::after {
  content: '';
  position: absolute;
  top: calc(50% - 0.75px);
  left: calc(var(--tree-col-w) / 2 - 1px);
  right: 2px;
  height: 1.5px;
  background: var(--tree-line-color);
}

/* When parent is expanded, horizontal line bridges 100% into the next column's ┬ tee */
.nano-tree-guide-col.is-branch-bridge::after,
.nano-tree-guide-col.is-last-bridge::after {
  content: '';
  position: absolute;
  top: calc(50% - 0.75px);
  left: calc(var(--tree-col-w) / 2 - 1px);
  right: 0;
  height: 1.5px;
  background: var(--tree-line-color);
}

/* 3. Last branch in group: └── (vertical top: 0 -> 50%, horizontal center -> right) */
.nano-tree-guide-col.is-last::before,
.nano-tree-guide-col.is-last-bridge::before {
  content: '';
  position: absolute;
  top: 0;
  height: 50%;
  left: calc(var(--tree-col-w) / 2 - 1px);
  width: 1.5px;
  background: var(--tree-line-color);
}

.nano-tree-guide-col.is-last::after {
  content: '';
  position: absolute;
  top: calc(50% - 0.75px);
  left: calc(var(--tree-col-w) / 2 - 1px);
  right: 2px;
  height: 1.5px;
  background: var(--tree-line-color);
}

/* 4. Expanded Parent Downward Tee ("trójnik: płaska deska z wiszącym ptaszkiem" ┬):
      Horizontal bar (left: 0 -> right: 2px) + Vertical stem (top: 50% -> bottom: 0 at center) */
.nano-tree-guide-col.is-tee-down::before {
  content: '';
  position: absolute;
  top: 50%;
  bottom: 0;
  left: calc(var(--tree-col-w) / 2 - 1px);
  width: 1.5px;
  background: var(--tree-line-color);
}

.nano-tree-guide-col.is-tee-down::after {
  content: '';
  position: absolute;
  top: calc(50% - 0.75px);
  left: 0;
  right: 2px;
  height: 1.5px;
  background: var(--tree-line-color);
}

.nano-tree-toggle {
  border: none;
  background: transparent;
  color: var(--nano-tree-accent, #38bdf8);
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0 5px 0 2px;
  cursor: pointer;
  line-height: 1;
}

.nano-tree-toggle:hover {
  color: var(--nano-tree-accent-hover, #7dd3fc);
}

.nano-tree-leaf-dot {
  color: var(--nano-tree-leaf-dot, #475569);
  padding: 0 8px 0 4px;
  font-weight: 700;
}

.nano-tree-node-icon {
  margin-right: 6px;
  font-size: 0.86rem;
}

.nano-tree-label {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--nano-tree-label-fg, #f8fafc);
}

.nano-tree-version {
  margin-left: 7px;
  font-size: 0.74rem;
  color: var(--nano-tree-muted, #94a3b8);
}

.nano-tree-badge {
  margin-left: 9px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  border: 1px solid var(--nano-tree-badge-border, rgba(148, 163, 184, 0.28));
  background: var(--nano-tree-badge-bg, rgba(30, 41, 59, 0.75));
  color: var(--nano-tree-badge-fg, #cbd5e1);
}

.nano-tree-badge.emerald,
.nano-tree-badge.public {
  background: var(--nano-tree-badge-emerald-bg, rgba(16, 185, 129, 0.14));
  border-color: var(--nano-tree-badge-emerald-border, rgba(16, 185, 129, 0.42));
  color: var(--nano-tree-badge-emerald-fg, #34d399);
}

.nano-tree-badge.amber,
.nano-tree-badge.private {
  background: var(--nano-tree-badge-amber-bg, rgba(245, 158, 11, 0.14));
  border-color: var(--nano-tree-badge-amber-border, rgba(245, 158, 11, 0.42));
  color: var(--nano-tree-badge-amber-fg, #fbbf24);
}

.nano-tree-badge.cyan {
  background: var(--nano-tree-badge-cyan-bg, rgba(6, 182, 212, 0.14));
  border-color: var(--nano-tree-badge-cyan-border, rgba(6, 182, 212, 0.42));
  color: var(--nano-tree-badge-cyan-fg, #22d3ee);
}

.nano-tree-badge.indigo {
  background: var(--nano-tree-badge-indigo-bg, rgba(99, 102, 241, 0.16));
  border-color: var(--nano-tree-badge-indigo-border, rgba(99, 102, 241, 0.45));
  color: var(--nano-tree-badge-indigo-fg, #a5b4fc);
}

.nano-tree-badge.rose,
.nano-tree-badge.danger {
  background: var(--nano-tree-badge-rose-bg, rgba(244, 63, 94, 0.18));
  border-color: var(--nano-tree-badge-rose-border, rgba(244, 63, 94, 0.5));
  color: var(--nano-tree-badge-rose-fg, #fb7185);
}

.nano-tree-meta {
  margin-left: 9px;
  font-size: 0.74rem;
  color: var(--nano-tree-muted, #94a3b8);
}

.nano-tree-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 14px;
  background: var(--nano-tree-footer-bg, rgba(15, 23, 42, 0.75));
  border-top: 1px solid var(--nano-tree-footer-border, rgba(148, 163, 184, 0.14));
  font-size: 0.74rem;
  color: var(--nano-tree-muted, #94a3b8);
  flex-wrap: wrap;
}

.nano-tree-footer code {
  color: var(--nano-tree-accent, #38bdf8);
  font-weight: 700;
}

.nano-tree-hint {
  color: var(--nano-tree-subtle-fg, #64748b);
}
</style>
