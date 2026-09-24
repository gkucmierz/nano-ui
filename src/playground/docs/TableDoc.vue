<script setup>
import { ref, computed } from 'vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import { t } from '../../locales.js';

// Interactive Sandbox State
const isCompact = ref(false);
const isStriped = ref(false);
const isInteractive = ref(true);
const isEmpty = ref(false);
const selectedRowId = ref('combat_simulations');
const filterQuery = ref('');

const allRows = [
  { id: 'matches', name: 'matches', category: 'telemetry', count: 107787, status: 'ok', statusText: 'Ready' },
  { id: 'combat_simulations', name: 'combat_simulations', category: 'gameplay', count: 43854, status: 'ok', statusText: 'Ready' },
  { id: 'combat_snapshots', name: 'combat_snapshots', category: 'gameplay', count: 27931, status: 'ok', statusText: 'Ready' },
  { id: 'match_players', name: 'match_players', category: 'telemetry', count: 18451, status: 'ok', statusText: 'Ready' },
  { id: 'summoners', name: 'summoners', category: 'accounts', count: 8919, status: 'info', statusText: 'Active' },
  { id: 'death_telemetry', name: 'death_telemetry', category: 'telemetry', count: 6736, status: 'warn', statusText: 'Pending' },
  { id: 'match_gold_timeline', name: 'match_gold_timeline', category: 'analytics', count: 2128, status: 'info', statusText: 'Active' },
  { id: 'champions', name: 'champions', category: 'static_data', count: 174, status: 'ok', statusText: 'Ready' },
  { id: 'rune_pages', name: 'rune_pages', category: 'static_data', count: 1, status: 'neutral', statusText: 'Cached' },
  { id: 'schema_migrations', name: 'schema_migrations', category: 'internal', count: 2, status: 'neutral', statusText: 'Locked' },
];

const filteredRows = computed(() => {
  if (isEmpty.value) return [];
  const q = filterQuery.value.trim().toLowerCase();
  if (!q) return allRows;
  return allRows.filter(r => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
});

const handleRowClick = (rowId) => {
  if (!isInteractive.value) return;
  selectedRowId.value = selectedRowId.value === rowId ? null : rowId;
};

const selectedRow = computed(() => {
  return allRows.find(r => r.id === selectedRowId.value) || null;
});

const generatedCode = computed(() => {
  const containerClasses = ['nano-table-container'];
  const tableClasses = ['nano-table'];

  if (isInteractive.value) tableClasses.push('nano-table-interactive');
  if (isCompact.value) tableClasses.push('nano-table-compact');
  if (isStriped.value) tableClasses.push('nano-table-striped');

  let markup = `<div class="${containerClasses.join(' ')}" style="max-height: 280px;">\n`;
  markup += `  <table class="${tableClasses.join(' ')}">\n`;
  markup += `    <thead>\n`;
  markup += `      <tr>\n`;
  markup += `        <th class="nano-cell-shrink nano-cell-center">#</th>\n`;
  markup += `        <th>Table Name</th>\n`;
  markup += `        <th>Category</th>\n`;
  markup += `        <th class="nano-cell-numeric">Records</th>\n`;
  markup += `        <th class="nano-cell-shrink">Status</th>\n`;
  markup += `      </tr>\n`;
  markup += `    </thead>\n`;
  markup += `    <tbody>\n`;

  if (isEmpty.value) {
    markup += `      <tr>\n`;
    markup += `        <td colspan="5" class="nano-table-empty">No matching records found.</td>\n`;
    markup += `      </tr>\n`;
  } else {
    markup += `      <!-- Iterated Rows: click toggles .is-selected -->\n`;
    markup += `      <tr class="is-selected">\n`;
    markup += `        <td class="nano-cell-shrink nano-cell-center">1</td>\n`;
    markup += `        <td class="nano-cell-truncate">matches</td>\n`;
    markup += `        <td>telemetry</td>\n`;
    markup += `        <td class="nano-cell-numeric">107,787</td>\n`;
    markup += `        <td class="nano-cell-shrink"><span class="nano-badge nano-badge-ok">Ready</span></td>\n`;
    markup += `      </tr>\n`;
  }

  markup += `    </tbody>\n`;
  markup += `  </table>\n`;
  markup += `</div>`;
  return markup;
});

const cssApiDoc = `/* Nano UI Data Table Primitives */
.nano-table-container    /* Surface card with rounded corners, horizontal auto-scroll, and thin scrollbars */
.nano-table              /* Clean collapse data grid, zero layout shift, border-bottom separators */
.nano-table-compact      /* High-density layout (5px padding, 0.72rem font) for telemetry / dev tools */
.nano-table-striped      /* Alternating zebra row shading (:nth-child(even)) */
.nano-table-interactive  /* Sets cursor: pointer on rows indicating clickability */

/* Row Selection States */
.nano-table tr.is-selected td     /* Tinted accent fill (color-mix in srgb with --nano-state-active) */
.nano-table tr.is-selected td:1st /* Inset 3px accent indicator bar on the left boundary */

/* Column & Cell Formatting Utilities */
.nano-cell-numeric,
.nano-cell-right         /* Right-aligned content with font-variant-numeric: tabular-nums */
.nano-cell-center        /* Center-aligned icon or index cell */
.nano-cell-truncate      /* Truncates overflowing long strings with ellipsis */
.nano-cell-shrink        /* width: 1% - hugs content tightly for indices, badges, or buttons */

/* Sticky Headers & Empty States */
.nano-table th           /* position: sticky; top: 0; z-index: 1 - stays pinned during vertical scroll */
.nano-table-empty        /* Centered message container spanning table width (colspan) */`;
</script>

<template>
  <div class="doc-page">
    <h2>{{ t('nav.tables') }}</h2>
    <p class="desc">
      High-density tabular data presentation, sticky header navigation, selectable rows with left accent indicators, and compact telemetry variants.
    </p>

    <!-- Interactive Sandbox -->
    <div class="sandbox-container">
      <div class="sandbox-preview">
        <div class="preview-area">
          <div class="table-sandbox-wrapper">
            <div class="table-toolbar">
              <input
                v-model="filterQuery"
                type="text"
                class="nano-input filter-search-input"
                placeholder="Filter tables..."
                :disabled="isEmpty"
              />
              <span class="table-meta-count">
                {{ filteredRows.length }} {{ filteredRows.length === 1 ? 'table' : 'tables' }}
              </span>
            </div>

            <div class="nano-table-container scroll-container">
              <table
                :class="[
                  'nano-table',
                  isInteractive ? 'nano-table-interactive' : '',
                  isCompact ? 'nano-table-compact' : '',
                  isStriped ? 'nano-table-striped' : ''
                ]"
              >
                <thead>
                  <tr>
                    <th class="nano-cell-shrink nano-cell-center">#</th>
                    <th>Table Name</th>
                    <th>Category</th>
                    <th class="nano-cell-numeric">Records</th>
                    <th class="nano-cell-shrink">Status</th>
                    <th class="nano-cell-shrink nano-cell-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="filteredRows.length === 0">
                    <td colspan="6" class="nano-table-empty">
                      No database tables matching query "{{ filterQuery }}".
                    </td>
                  </tr>
                  <tr
                    v-for="(row, idx) in filteredRows"
                    :key="row.id"
                    :class="{ 'is-selected': selectedRowId === row.id }"
                    @click="handleRowClick(row.id)"
                  >
                    <td class="nano-cell-shrink nano-cell-center">{{ idx + 1 }}</td>
                    <td class="table-name-cell">
                      <code>{{ row.name }}</code>
                    </td>
                    <td>
                      <span class="category-tag">{{ row.category }}</span>
                    </td>
                    <td class="nano-cell-numeric font-tabular">
                      {{ row.count.toLocaleString() }}
                    </td>
                    <td class="nano-cell-shrink">
                      <span :class="['nano-badge', `nano-badge-${row.status}`]">
                        {{ row.statusText }}
                      </span>
                    </td>
                    <td class="nano-cell-shrink nano-cell-center">
                      <button
                        class="nano-btn nano-btn-secondary nano-btn-sm"
                        @click.stop="handleRowClick(row.id)"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Selected Row Details Footer -->
            <div v-if="selectedRow && !isEmpty" class="selected-row-banner">
              <div class="selected-row-info">
                <span class="selected-label">Selected:</span>
                <code>{{ selectedRow.name }}</code>
                <span class="selected-records">({{ selectedRow.count.toLocaleString() }} records)</span>
              </div>
              <button
                class="nano-btn nano-btn-ghost nano-btn-sm"
                @click="selectedRowId = null"
              >
                Deselect
              </button>
            </div>
          </div>
        </div>

        <NanoCodeBlock :code="generatedCode" lang="html" title="Generated Markup" :default-wrap="true" />
      </div>

      <!-- Controls Panel -->
      <div class="controls-panel">
        <div class="control-group">
          <label class="control-label">Density</label>
          <div class="nano-btn-group">
            <button
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': !isCompact }"
              @click="isCompact = false"
            >
              Default
            </button>
            <button
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': isCompact }"
              @click="isCompact = true"
            >
              Compact
            </button>
          </div>
        </div>

        <div class="control-group toggle-row">
          <label class="control-label">Striped Rows</label>
          <NanoSwitch v-model="isStriped" />
        </div>

        <div class="control-group toggle-row">
          <label class="control-label">Clickable Rows</label>
          <NanoSwitch v-model="isInteractive" />
        </div>

        <div class="control-group toggle-row">
          <label class="control-label">Empty State Demo</label>
          <NanoSwitch v-model="isEmpty" />
        </div>
      </div>
    </div>

    <!-- CSS Reference -->
    <h3 class="section-title">CSS Class Reference</h3>
    <NanoCodeBlock :code="cssApiDoc" lang="css" title="primitives.css Reference" />
  </div>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  color: var(--nano-text-main);
}

.desc {
  font-size: 0.95rem;
  color: var(--nano-text-muted);
  line-height: 1.5;
  margin: 0;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 1.5rem 0 0.5rem;
  color: var(--nano-text-main);
}

/* Sandbox Layout */
.sandbox-container {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 1.5rem;
  align-items: start;
}

@media (max-width: 900px) {
  .sandbox-container {
    grid-template-columns: 1fr;
  }
}

.sandbox-preview {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0;
}

.preview-area {
  display: flex;
  flex-direction: column;
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-subtle);
  border-radius: 8px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.table-sandbox-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.filter-search-input {
  max-width: 220px;
}

.table-meta-count {
  font-size: 0.78rem;
  color: var(--nano-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.scroll-container {
  max-height: 290px;
}

.table-name-cell code {
  color: var(--nano-text-main);
  font-weight: 600;
  font-size: 0.8rem;
}

.category-tag {
  font-size: 0.72rem;
  color: var(--nano-text-muted);
  font-family: inherit;
}

.font-tabular {
  font-weight: 600;
}

/* Selected Row Banner */
.selected-row-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: color-mix(in srgb, var(--nano-state-active, #00f2fe) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--nano-state-active, #00f2fe) 30%, transparent);
  border-radius: 6px;
  padding: 8px 12px;
}

.selected-row-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
}

.selected-label {
  color: var(--nano-state-active, #00f2fe);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.4px;
}

.selected-row-info code {
  color: var(--nano-text-main);
  font-weight: 700;
}

.selected-records {
  color: var(--nano-text-muted);
  font-size: 0.75rem;
}

/* Controls */
.controls-panel {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-subtle);
  border-radius: 8px;
  padding: 1.25rem;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-group.toggle-row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.25rem;
}

.control-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--nano-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>
