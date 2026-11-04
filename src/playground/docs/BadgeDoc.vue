<script setup>
import { ref, computed } from 'vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import { t } from '../../locales.js';

// Interactive Sandbox State
const selectedVariant = ref('success');
const selectedShape = ref('pill');
const hasDot = ref(true);
const isPulsing = ref(true);
const badgeLabel = ref('Online');

const variants = ['success', 'warn', 'danger', 'info', 'purple', 'neutral'];

const generatedCode = computed(() => {
  const classes = ['nano-badge', `nano-badge-${selectedVariant.value}`];
  if (selectedShape.value === 'square') {
    classes.push('nano-badge-square');
  }

  let inner = '';
  if (hasDot.value) {
    const dotClasses = ['nano-status-dot'];
    if (isPulsing.value) dotClasses.push('nano-status-dot-pulse');
    inner = `\n  <span class="${dotClasses.join(' ')}"></span>\n  ${badgeLabel.value}\n`;
  } else {
    inner = badgeLabel.value;
  }

  return `<span class="${classes.join(' ')}">${inner}</span>`;
});

// Real-World Database Tables Pills Demo State
const activeTable = ref('summoners');
const dbTables = [
  { id: 'champions', name: 'champions', count: 174 },
  { id: 'combat_simulations', name: 'combat_simulations', count: '43,854' },
  { id: 'combat_snapshots', name: 'combat_snapshots', count: '27,931' },
  { id: 'death_telemetry', name: 'death_telemetry', count: '6,736' },
  { id: 'matches', name: 'matches', count: '107,787' },
  { id: 'match_gold_timeline', name: 'match_gold_timeline', count: '2,128' },
  { id: 'match_players', name: 'match_players', count: '18,451' },
  { id: 'rune_pages', name: 'rune_pages', count: 1 },
  { id: 'schema_migrations', name: 'schema_migrations', count: 2 },
  { id: 'summoners', name: 'summoners', count: '8,919' },
];

const pillsCode = `<div class="nano-pill-group">
  <button
    v-for="table in tables"
    :key="table.id"
    :class="['nano-pill', { 'is-active': activeTable === table.id }]"
    v-tooltip="table.name"
    @click="activeTable = table.id"
  >
    <span class="nano-pill-label">{{ table.name }}</span>
    <span class="nano-pill-count">{{ table.count }}</span>
  </button>
</div>`;

const cssApiDoc = `/* Nano UI Badge & Status Indicator Primitives */
.nano-badge              /* High-contrast status pill: uppercase, letter-spacing, line-height: 1 */
.nano-badge-pill         /* Fully rounded pill shape (border-radius: 9999px) [default] */
.nano-badge-square       /* Subtle rounded rectangle shape (border-radius: 4px) */

/* Semantic Color Tokens */
.nano-badge-ok,
.nano-badge-success      /* Emerald green fill + matching border (online, active, complete) */
.nano-badge-warn         /* Warm amber fill + matching border (pending, warning, attention) */
.nano-badge-danger       /* Crimson red fill + matching border (error, failed, offline) */
.nano-badge-info,
.nano-badge-cyan         /* Neon cyan fill + matching border (informational, active mode) */
.nano-badge-purple       /* Soft purple fill + matching border (special category, tags) */
.nano-badge-neutral      /* Muted gray fill + subtle border (neutral metadata, counts) */

/* Status Dots */
.nano-status-dot         /* 6px circular dot inheriting font color (currentColor) */
.nano-status-dot-pulse   /* Gentle breathing opacity animation (1.8s ease-in-out infinite) */

/* Pill Tabs & Filter Chips */
.nano-pill-group         /* Flexible wrap strip with 6px gap for multi-tag filters */
.nano-pill               /* Clickable pill button with hover fill and active border */
.nano-pill.is-active     /* Highlighted active filter pill with tinted background */
.nano-pill-label         /* Truncated text container (max-width + ellipsis for long names) */
.nano-pill-count         /* Monospaced numeric counter badge (flex-shrink: 0, tabular-nums) */`;
</script>

<template>
  <div class="doc-page">
    <h2>{{ t('nav.badges') }}</h2>
    <p class="desc">
      Ultra-compact status indicators, pulsating telemetry dots, semantic badges, and filter pills with embedded counts for high-density applications.
    </p>

    <!-- Interactive Sandbox -->
    <div class="sandbox-container">
      <div class="sandbox-preview">
        <div class="preview-area">
          <span
            :class="[
              'nano-badge',
              `nano-badge-${selectedVariant}`,
              selectedShape === 'square' ? 'nano-badge-square' : 'nano-badge-pill'
            ]"
          >
            <span
              v-if="hasDot"
              :class="['nano-status-dot', isPulsing ? 'nano-status-dot-pulse' : '']"
            ></span>
            <span>{{ badgeLabel }}</span>
          </span>
        </div>

        <NanoCodeBlock :code="generatedCode" lang="html" title="Generated Markup" :default-wrap="true" />
      </div>

      <!-- Controls Panel -->
      <div class="controls-panel">
        <div class="control-group">
          <label class="control-label">Variant</label>
          <div class="nano-btn-group wrap-group">
            <button
              v-for="v in variants"
              :key="v"
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': selectedVariant === v }"
              @click="selectedVariant = v"
            >
              {{ v }}
            </button>
          </div>
        </div>

        <div class="control-group">
          <label class="control-label">Shape</label>
          <div class="nano-btn-group">
            <button
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': selectedShape === 'pill' }"
              @click="selectedShape = 'pill'"
            >
              Pill
            </button>
            <button
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': selectedShape === 'square' }"
              @click="selectedShape = 'square'"
            >
              Square
            </button>
          </div>
        </div>

        <label class="control-group toggle-row">
          <span class="control-label">Status Dot</span>
          <NanoSwitch v-model="hasDot" />
        </label>

        <label v-if="hasDot" class="control-group toggle-row">
          <span class="control-label">Pulsing Animation</span>
          <NanoSwitch v-model="isPulsing" />
        </label>
      </div>
    </div>

    <!-- Filter Pills with Embedded Counts (Database Tables Pattern) -->
    <h3 class="section-title">Pill Tabs & Filter Tokens (.nano-pill, .nano-pill-group)</h3>
    <p class="desc">
      The standard pattern for category tabs, database table selectors, and dataset filters. Labels gracefully truncate while count badges remain pinned and readable.
    </p>

    <div class="pills-showcase-card">
      <div class="pills-card-header">
        <span class="pills-title">Database Table Navigator</span>
        <span class="pills-active-info">Active: <code class="active-code">{{ activeTable }}</code></span>
      </div>

      <div class="nano-pill-group">
        <button
          v-for="table in dbTables"
          :key="table.id"
          :class="['nano-pill', { 'is-active': activeTable === table.id }]"
          v-tooltip="table.name"
          @click="activeTable = table.id"
        >
          <span class="nano-pill-label">{{ table.name }}</span>
          <span class="nano-pill-count">{{ table.count }}</span>
        </button>
      </div>
    </div>

    <NanoCodeBlock :code="pillsCode" lang="html" title="Pill Tabs Pattern" />

    <!-- Live Telemetry Status Dots -->
    <h3 class="section-title">Live Telemetry Status Indicators (.nano-status-dot)</h3>
    <p class="desc">
      Minimalist status dots for live service health, socket connections, and node indicators.
    </p>

    <div class="telemetry-status-grid">
      <div class="telemetry-status-row">
        <span class="status-indicator-badge success">
          <span class="nano-status-dot nano-status-dot-pulse"></span>
          <span>Relay Server (DE)</span>
        </span>
        <span class="status-meta">Online (28ms)</span>
      </div>

      <div class="telemetry-status-row">
        <span class="status-indicator-badge cyan">
          <span class="nano-status-dot nano-status-dot-pulse"></span>
          <span>Agent LCU Link</span>
        </span>
        <span class="status-meta">Ingesting Telemetry</span>
      </div>

      <div class="telemetry-status-row">
        <span class="status-indicator-badge warn">
          <span class="nano-status-dot nano-status-dot-pulse"></span>
          <span>Database Compactor</span>
        </span>
        <span class="status-meta">VACUUM In Progress</span>
      </div>

      <div class="telemetry-status-row">
        <span class="status-indicator-badge danger">
          <span class="nano-status-dot"></span>
          <span>Cloud Staging Backup</span>
        </span>
        <span class="status-meta">Connection Refused</span>
      </div>
    </div>

    <!-- CSS Reference -->
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
  padding: 3rem 1.5rem;
  background: var(--nano-bg-app);
  border: 1px dashed var(--nano-border-card);
  border-radius: 8px;
  min-height: 120px;
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

.wrap-group {
  flex-wrap: wrap;
}

/* Pills Showcase Card */
.pills-showcase-card {
  background: var(--nano-bg-card-elevated);
  border: 1px solid var(--nano-border-card);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pills-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--nano-border-subtle);
}

.pills-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--nano-text-main);
}

.pills-active-info {
  font-size: 0.8rem;
  color: var(--nano-text-muted);
}

.active-code {
  color: var(--nano-state-active);
  font-weight: 600;
}

/* Telemetry Status Grid */
.telemetry-status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.telemetry-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-subtle);
  border-radius: 6px;
  padding: 10px 14px;
}

.status-indicator-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--nano-text-main);
}

.status-indicator-badge.success .nano-status-dot { color: var(--nano-status-success-text); }
.status-indicator-badge.cyan .nano-status-dot { color: var(--nano-status-info-text); }
.status-indicator-badge.warn .nano-status-dot { color: var(--nano-status-warn-text); }
.status-indicator-badge.danger .nano-status-dot { color: var(--nano-status-danger-text); }

.status-meta {
  font-size: 0.75rem;
  color: var(--nano-text-muted);
}
</style>
