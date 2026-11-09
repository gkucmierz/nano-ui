<script setup>
import { ref, computed } from 'vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoSortableList from '../../components/NanoSortableList.vue';
import NanoCollapsible from '../../components/NanoCollapsible.vue';
import { t } from '../../locales.js';

const sortableCards = ref([
  { id: 'card-1', title: '1. Oscillator Stage', badge: 'OSC' },
  { id: 'card-2', title: '2. Envelope Generator', badge: 'ENV' },
  { id: 'card-3', title: '3. SVF Resonant Filter', badge: 'DSP' },
]);

// Interactive Sandbox State
const selectedCardVariant = ref('default');
const hasHeader = ref(true);
const hasFooter = ref(true);
const hasHeaderAction = ref(true);
const cardTitle = ref('System Diagnostics');
const clickFeedback = ref(0);

const handleCardClick = () => {
  if (selectedCardVariant.value === 'interactive') {
    clickFeedback.value++;
  }
};

const generatedCode = computed(() => {
  const cardClasses = ['nano-card'];
  if (selectedCardVariant.value === 'interactive') {
    cardClasses.push('nano-card-interactive');
  } else if (selectedCardVariant.value === 'subdued') {
    cardClasses.push('nano-card-subdued');
  }

  let markup = `<div class="${cardClasses.join(' ')}">\n`;

  if (hasHeader.value) {
    markup += `  <div class="nano-card-header">\n`;
    markup += `    <h4 class="nano-card-title">${cardTitle.value}</h4>\n`;
    if (hasHeaderAction.value) {
      markup += `    <button class="nano-btn nano-btn-secondary nano-btn-sm">Configure</button>\n`;
    }
    markup += `  </div>\n`;
  }

  markup += `  <div class="nano-card-body">\n`;
  markup += `    <p>Card body content goes here. High-density information and layouts.</p>\n`;
  markup += `  </div>\n`;

  if (hasFooter.value) {
    markup += `  <div class="nano-card-footer">\n`;
    markup += `    <span>Status: Optimal</span>\n`;
    markup += `    <span class="nano-badge nano-badge-ok">Active</span>\n`;
    markup += `  </div>\n`;
  }

  markup += `</div>`;
  return markup;
});

const cssApiDoc = `/* Nano UI Card & Panel Primitives */
.nano-card               /* Elevated background, subtle card border, 8px radius, overflow hidden */
.nano-card-subdued       /* Low-contrast tinted surface for nested groupings */
.nano-card-interactive   /* Hover border glow, subtle background lift (flicker-free, no physical transform) */

/* Structural Sub-Elements */
.nano-card-header        /* Docked top bar with bottom separator and space-between alignment */
.nano-card-title         /* Semantically weighted header title (font-weight: 700) */
.nano-card-body          /* Padded content viewport (padding: 16px, flex-grow: 1) */
.nano-card-footer        /* Docked bottom bar with top separator and secondary metadata */

/* KPI & Analytics Metric Cards */
.nano-metric-grid        /* Responsive auto-fit grid (minmax: 180px, gap: 16px) */
.nano-metric-card        /* Centered stat tile with high-contrast value and uppercase label */
.nano-metric-val         /* Monospaced tabular numeric display (font-size: 2.2rem, font-weight: 800) */
.nano-metric-val-cyan    /* Neon cyan accent color */
.nano-metric-val-purple  /* Soft purple accent color */
.nano-metric-val-amber   /* Warm amber accent color */
.nano-metric-val-emerald /* Crisp emerald green accent color */
.nano-metric-val-rose    /* Vibrant rose red accent color */
.nano-metric-label       /* Uppercase muted tracking description (font-size: 0.75rem) */
.nano-metric-delta       /* Small indicator badge with tabular +/- percentage */
.nano-metric-delta-up    /* Positive green trend pill */
.nano-metric-delta-down  /* Negative red trend pill */`;
</script>

<template>
  <div class="doc-page">
    <h2>{{ t('nav.cards') }}</h2>
    <p class="desc">
      Structural surface primitives, docked headers and footers, interactive clickable tiles, and responsive KPI metric grids for telemetry dashboards.
    </p>

    <!-- Interactive Sandbox -->
    <div class="sandbox-container">
      <div class="sandbox-preview">
        <div class="preview-area">
          <div
            :class="[
              'nano-card',
              selectedCardVariant === 'interactive' ? 'nano-card-interactive' : '',
              selectedCardVariant === 'subdued' ? 'nano-card-subdued' : '',
              'sandbox-card-preview'
            ]"
            @click="handleCardClick"
          >
            <div v-if="hasHeader" class="nano-card-header">
              <h4 class="nano-card-title">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
                <span>{{ cardTitle }}</span>
              </h4>
              <button v-if="hasHeaderAction" class="nano-btn nano-btn-secondary nano-btn-sm" v-ripple @click.stop>
                Configure
              </button>
            </div>

            <div class="nano-card-body">
              <p class="sample-body-text">
                Clean surface designed with zero layout shift. Perfect for modular widgets, forms, charts, and data inspect panels.
              </p>
              <div v-if="selectedCardVariant === 'interactive'" class="click-feedback-badge">
                Clicks: {{ clickFeedback }}
              </div>
            </div>

            <div v-if="hasFooter" class="nano-card-footer">
              <span>Status: Optimal</span>
              <span class="nano-badge nano-badge-ok">Active</span>
            </div>
          </div>
        </div>

        <NanoCodeBlock :code="generatedCode" lang="html" title="Generated Markup" :default-wrap="true" />
      </div>

      <!-- Controls Panel -->
      <div class="controls-panel">
        <div class="control-group">
          <span class="control-label">Card Style</span>
          <div class="nano-btn-group">
            <button
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': selectedCardVariant === 'default' }"
              @click="selectedCardVariant = 'default'"
            >
              Default
            </button>
            <button
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': selectedCardVariant === 'interactive' }"
              @click="selectedCardVariant = 'interactive'"
            >
              Interactive
            </button>
            <button
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': selectedCardVariant === 'subdued' }"
              @click="selectedCardVariant = 'subdued'"
            >
              Subdued
            </button>
          </div>
        </div>

        <label class="control-group toggle-row">
          <span class="control-label">Header Bar</span>
          <NanoSwitch v-model="hasHeader" />
        </label>

        <label v-if="hasHeader" class="control-group toggle-row">
          <span class="control-label">Header Action</span>
          <NanoSwitch v-model="hasHeaderAction" />
        </label>

        <label class="control-group toggle-row">
          <span class="control-label">Footer Bar</span>
          <NanoSwitch v-model="hasFooter" />
        </label>
      </div>
    </div>

    <!-- KPI Metric Cards Grid Showcase -->
    <h3 class="section-title">Dashboard Metric Cards (.nano-metric-card)</h3>
    <p class="desc">
      High-visibility statistical tiles engineered for telemetry dashboards, monitoring consoles, and KPI summaries.
    </p>

    <div class="nano-metric-grid">
      <div class="nano-metric-card">
        <span class="nano-metric-val nano-metric-val-cyan">8,919</span>
        <span class="nano-metric-label">Total Connections</span>
        <span class="nano-metric-delta nano-metric-delta-up">▲ +12.4%</span>
      </div>

      <div class="nano-metric-card">
        <span class="nano-metric-val nano-metric-val-purple">48</span>
        <span class="nano-metric-label">Active Rooms</span>
        <span class="nano-metric-delta nano-metric-delta-up">▲ +4</span>
      </div>

      <div class="nano-metric-card">
        <span class="nano-metric-val nano-metric-val-amber">1,284</span>
        <span class="nano-metric-label">Events / Sec</span>
        <span class="nano-metric-delta nano-metric-delta-down">▼ -1.8%</span>
      </div>

      <div class="nano-metric-card">
        <span class="nano-metric-val nano-metric-val-emerald">99.98%</span>
        <span class="nano-metric-label">Fleet Health</span>
        <span class="nano-metric-delta nano-metric-delta-up">▲ 0.02%</span>
      </div>
    </div>

    <!-- Interactive Tiles Gallery -->
    <h3 class="section-title">Interactive Action Tiles (.nano-card-interactive)</h3>
    <p class="desc">
      Cards that respond naturally to user interaction without layout shift or jitter, perfect for navigation grids and option pickers.
    </p>

    <div class="tiles-grid">
      <div class="nano-card nano-card-interactive tile-item" v-ripple>
        <div class="tile-icon tile-icon-cyan">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <h4 class="tile-title">Live Telemetry</h4>
        <p class="tile-desc">Stream sub-millisecond websocket packets from remote nodes directly into memory.</p>
        <span class="nano-badge nano-badge-info">Active Feed</span>
      </div>

      <div class="nano-card nano-card-interactive tile-item" v-ripple>
        <div class="tile-icon tile-icon-purple">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h4 class="tile-title">Schema Migrations</h4>
        <p class="tile-desc">Run transactional SQLite migrations with atomic rollbacks and verification.</p>
        <span class="nano-badge nano-badge-ok">v2 Ready</span>
      </div>

      <div class="nano-card nano-card-interactive tile-item" v-ripple>
        <div class="tile-icon tile-icon-amber">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </div>
        <h4 class="tile-title">Relay Settings</h4>
        <p class="tile-desc">Manage PIN pairing timeouts, audio alerts, and multi-region routing policies.</p>
        <span class="nano-badge nano-badge-neutral">Config</span>
      </div>
    </div>

    <!-- CSS Reference -->
    <h3 class="section-title">Sortable Draggable Cards (NanoSortableList)</h3>
    <p class="desc">
      Grab any card anywhere on its surface to reorder with a dashed target placeholder and floating translucent ghost preview.
    </p>
    <NanoSortableList v-model="sortableCards" item-key="id">
      <template #default="{ item }">
        <div class="nano-card">
          <div class="nano-card-header">
            <h4 class="nano-card-title">{{ item.title }}</h4>
            <span class="nano-badge nano-badge-info">{{ item.badge }}</span>
          </div>
        </div>
      </template>
    </NanoSortableList>

    <h3 class="section-title">Collapsible Telemetry Sections (NanoCollapsible)</h3>
    <p class="desc">
      Expandable and collapsible section container with persistent localStorage state, inline collapsed preview slot, and accessible keyboard trigger.
    </p>
    <NanoCollapsible
      title="Active Telemetry & Repository Audit Strip"
      badge="52 repos"
      :default-open="true"
    >
      <template #summary-collapsed>
        <span class="nano-badge nano-badge-ok">1 WORKING</span>
      </template>
      <p style="margin: 0; font-size: 0.88rem; color: var(--nano-text-muted);">
        Collapsible body content with automatic state persistence via <code>storage-key</code>.
      </p>
    </NanoCollapsible>

    <h3 class="section-title">CSS Class Reference</h3>
    <NanoCodeBlock :code="cssApiDoc" lang="css" title="primitives.css Reference" />
  </div>
</template>

<style scoped>
.doc-page {
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.doc-page h2 {
  font-weight: 700;
  margin-bottom: 0.5rem;
  font-size: 1.8rem;
  color: var(--nano-text-main);
}

.section-title {
  font-weight: 700;
  font-size: 1.3rem;
  margin-top: 2rem;
  margin-bottom: 0.5rem;
  color: var(--nano-text-main);
}

.desc {
  color: var(--nano-text-muted);
  margin-bottom: 1rem;
  font-size: 0.95rem;
  line-height: 1.5;
}

/* Sandbox */
.sandbox-container {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 1.5rem;
  max-width: 100%;
  box-sizing: border-box;
  background: var(--nano-bg-card-elevated);
  border: 1px solid var(--nano-border-card);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--nano-shadow-card);
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
  max-width: 100%;
}

.preview-area {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1.5rem;
  background: var(--nano-bg-app);
  border: 1px dashed var(--nano-border-card);
  border-radius: 8px;
  min-height: 140px;
}

.sandbox-card-preview {
  width: 100%;
  max-width: 420px;
}

.sample-body-text {
  margin: 0;
  font-size: 0.88rem;
  color: var(--nano-text-secondary);
  line-height: 1.5;
}

.click-feedback-badge {
  display: inline-block;
  margin-top: 12px;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(0, 242, 254, 0.12);
  color: var(--nano-state-active);
  font-size: 0.75rem;
  font-weight: 600;
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
  cursor: pointer;
  user-select: none;
}

.control-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--nano-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Tiles Grid */
.tiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.tile-item {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.tile-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2px;
}

.tile-icon-cyan {
  background: var(--nano-status-info-bg);
  color: var(--nano-status-info-text);
  border: 1px solid var(--nano-status-info-border);
}

.tile-icon-purple {
  background: var(--nano-status-purple-bg);
  color: var(--nano-status-purple-text);
  border: 1px solid var(--nano-status-purple-border);
}

.tile-icon-amber {
  background: var(--nano-status-warn-bg);
  color: var(--nano-status-warn-text);
  border: 1px solid var(--nano-status-warn-border);
}

.tile-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--nano-text-main);
}

.tile-desc {
  margin: 0;
  font-size: 0.82rem;
  color: var(--nano-text-muted);
  line-height: 1.45;
  flex: 1;
}
</style>
