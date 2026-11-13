<script setup>
import { ref, computed } from 'vue';
import NanoHeatmap from '../../components/NanoHeatmap.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoNumberStepper from '../../components/NanoNumberStepper.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import {
  HEATMAP_PALETTES,
  HEATMAP_SCALES,
} from '../../utils/heatmapScale.js';
import { t } from '../../locales.js';
import { createDocTabs } from '../docSnippets.js';

// Demo 1: Matrix Mode (independent state)
const matrixPalette = ref('cyan-ruby');
const matrixScale = ref('log1p');
const matrixBuckets = ref(0);
const injectViralSpike = ref(true);
const matrixShowValues = ref(false);
const matrixShowTotals = ref(true);
const matrixAllZero = ref(false);
const selectedMatrixCell = ref(null);
const hoveredMatrixCell = ref(null);

const WEEKDAY_ROWS = [
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
  { id: 'sun', label: 'Sun' },
];

const HOUR_COLS = Array.from({ length: 24 }, (_, h) => ({
  id: h,
  label: `${String(h).padStart(2, '0')}`,
}));

// Deterministic hourly session snapshot (contains true 0 quiet hours + 20..150 active baseline)
const BASE_WEEKLY_TRAFFIC = [
  [0, 0, 0, 0, 0, 4, 18, 42, 76, 95, 112, 124, 118, 108, 116, 102, 88, 74, 92, 115, 134, 98, 44, 12],
  [0, 0, 0, 0, 2, 6, 22, 48, 84, 106, 128, 136, 122, 114, 126, 118, 96, 82, 104, 128, 146, 150, 52, 16],
  [0, 0, 0, 0, 0, 5, 20, 46, 82, 102, 119, 130, 125, 112, 121, 109, 91, 79, 98, 122, 138, 104, 39, 9],
  [0, 0, 0, 0, 1, 7, 24, 51, 89, 110, 132, 142, 129, 118, 131, 115, 94, 86, 108, 132, 148, 112, 48, 14],
  [0, 0, 0, 0, 0, 6, 19, 44, 78, 96, 114, 122, 116, 104, 108, 92, 76, 68, 84, 96, 108, 86, 54, 24],
  [18, 8, 0, 0, 0, 0, 4, 14, 28, 46, 64, 78, 82, 76, 72, 68, 74, 82, 94, 112, 126, 118, 84, 42],
  [22, 10, 0, 0, 0, 0, 0, 10, 24, 38, 56, 72, 79, 74, 69, 72, 84, 96, 114, 136, 144, 102, 46, 14],
];

const matrixData = computed(() => {
  if (matrixAllZero.value) {
    return WEEKDAY_ROWS.map(() => HOUR_COLS.map(() => 0));
  }
  return BASE_WEEKLY_TRAFFIC.map((row, rIdx) =>
    row.map((val, cIdx) => (injectViralSpike.value && rIdx === 1 && cIdx === 21 ? 10000 : val))
  );
});

// Demo 2: Density 2D KDE Mode (independent state)
const RECORDED_INTERACTION_SAMPLE = [
  { x: 0.22, y: 0.28, weight: 3 },
  { x: 0.24, y: 0.31, weight: 4 },
  { x: 0.21, y: 0.26, weight: 2 },
  { x: 0.54, y: 0.46, weight: 5 },
  { x: 0.56, y: 0.48, weight: 6 },
  { x: 0.52, y: 0.44, weight: 4 },
  { x: 0.58, y: 0.5, weight: 3 },
  { x: 0.78, y: 0.24, weight: 4 },
  { x: 0.8, y: 0.26, weight: 3 },
  { x: 0.36, y: 0.74, weight: 2 },
  { x: 0.38, y: 0.72, weight: 3 },
];

const densityPalette = ref('viridis');
const densityRadius = ref(2.6);
const densityPoints = ref([...RECORDED_INTERACTION_SAMPLE]);
const isDrawingDensity = ref(false);

function recordStageEvent(event) {
  const target = event?.currentTarget;
  if (!target || !target.getBoundingClientRect) return;
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
  densityPoints.value = [
    ...densityPoints.value.slice(-240),
    { x: Number(x.toFixed(4)), y: Number(y.toFixed(4)), weight: 2 },
  ];
}

function onStagePointerDown(event) {
  isDrawingDensity.value = true;
  recordStageEvent(event);
}

function onStagePointerMove(event) {
  if (!isDrawingDensity.value) return;
  recordStageEvent(event);
}

function stopStageDrawing() {
  isDrawingDensity.value = false;
}

function loadSamplePoints() {
  densityPoints.value = [...RECORDED_INTERACTION_SAMPLE];
}

function clearDensityPoints() {
  densityPoints.value = [];
}

const codeTabs = createDocTabs({
  componentName: 'NanoHeatmap',
  stateRef: 'selectedSlot',
  initialValue: 'null',
  templateAttrs: [
    'v-model:selected-cell="selectedSlot"',
    'v-model:scale="scaleMode"',
    'mode="matrix"',
    ':rows="weekdayRows"',
    ':cols="hourCols"',
    ':data="trafficMatrix"',
    'palette="cyan-ruby"',
    'allow-scale-switch',
    'show-totals',
    'show-legend',
  ],
  headlessImports: [
    {
      symbols: [
        'computeHeatmapScale',
        'resolveHeatmapCellColor',
        'resolveHeatmapTextColor',
        'computeGaussianDensityGrid',
      ],
      path: 'src/utils/heatmapScale.js',
    },
  ],
  apiSections: [
    {
      title: 'Props',
      items: [
        'mode: "matrix" | "density" (default: "matrix") — Semantic WAI-ARIA 2D matrix grid vs. HiDPI <canvas> KDE density map',
        'rows: Array<{ id, label, sublabel? } | string> — Row descriptors for matrix mode',
        'cols: Array<{ id, label, sublabel? } | string> — Column descriptors for matrix mode',
        'data: number[][] | Array<{ rowId, colId, value, meta? }> | Record<string, any> — Matrix data source',
        'points: Array<{ x, y, weight? }> — Normalized [0..1] empirical points for mode="density"',
        'scale: "log1p" | "p95" | "sqrt" | "linear" (default: "log1p") — Heavy-tailed Pareto normalization mode',
        'clampPercentile: Number (default: 0.95) — Upper percentile ceiling used in "p95" mode',
        'buckets: Number (default: 0) — Discrete quantization steps (e.g. 5 GitHub steps; 0 = continuous)',
        'palette: "cyan-ruby" | "emerald" | "viridis" | "amber-rose" (default: "cyan-ruby") — Monotonic OKLCH ramp',
        'isDark: Boolean | undefined — Explicit theme override (auto-detects data-theme="light" / .theme-light when omitted)',
        'showValues / showTotals / showLegend / allowScaleSwitch: Boolean — Telemetry overlays & inline scale switcher',
        'emptyLabel: String — Honest zero-data message (never renders synthetic placeholder blobs)',
      ],
    },
    {
      title: 'Events & v-model',
      items: [
        'v-model:selectedCell / @select: (payload | null) => void — Coupled CSHR 1st-click lock & 2nd-click deselect with >= 3px hover re-arm',
        'v-model:scale: ("log1p" | "p95" | "sqrt" | "linear") => void — Emitted when user switches scale in legend',
        '@hover: (payload | null) => void — Active crosshair cell descriptor',
      ],
    },
    {
      title: 'Headless Perceptual Engine',
      items: [
        'computeHeatmapScale(values, { scale, clampPercentile, buckets }) -> { min, max, effectiveMax, normalize(val), ticks }',
        'resolveHeatmapCellColor(t, { palette, isDark, isZero }) -> Monotonic oklch(L C H) with Zero-Value Invariant',
        'resolveHeatmapTextColor(t, { palette, isDark, isZero }) -> Guaranteed WCAG AA (>= 4.5:1) cell label color',
        'computeGaussianDensityGrid(points, { cols, rows, radius }) -> Deterministic 2D KDE grid (points=[] -> max=0)',
      ],
    },
  ],
});
</script>

<template>
  <div class="doc-page">
    <div class="header-section">
      <h2>{{ t('heatmapDoc.title') }}</h2>
      <p>{{ t('heatmapDoc.desc') }}</p>
    </div>

    <!-- Section 1: Matrix Mode -->
    <div class="nano-card demo-card">
      <div class="demo-header">
        <div>
          <h3>{{ t('heatmapDoc.matrixTitle') }}</h3>
          <p class="demo-desc">{{ t('heatmapDoc.matrixDesc') }}</p>
        </div>
      </div>

      <div class="controls-bar">
        <div class="control-group">
          <span class="control-label">{{ t('heatmapDoc.paletteLabel') }}</span>
          <div class="pill-row" role="group" :aria-label="t('heatmapDoc.paletteLabel')">
            <button
              v-for="pal in HEATMAP_PALETTES"
              :key="`m-pal-${pal}`"
              type="button"
              class="nano-pill-btn"
              :class="{ 'is-active': matrixPalette === pal }"
              @click="matrixPalette = pal"
            >
              {{ pal }}
            </button>
          </div>
        </div>

        <div class="control-group">
          <span class="control-label">{{ t('heatmapDoc.scaleLabel') }}</span>
          <div class="pill-row" role="group" :aria-label="t('heatmapDoc.scaleLabel')">
            <button
              v-for="sc in HEATMAP_SCALES"
              :key="`m-sc-${sc}`"
              type="button"
              class="nano-pill-btn"
              :class="{ 'is-active': matrixScale === sc }"
              @click="matrixScale = sc"
            >
              {{ sc }}
            </button>
          </div>
        </div>

        <div class="control-group">
          <span class="control-label">{{ t('heatmapDoc.bucketsLabel') }}</span>
          <NanoNumberStepper
            v-model="matrixBuckets"
            :min="0"
            :max="9"
            :step="1"
            variant="split"
            color="info"
          />
        </div>
      </div>

      <div class="toggles-row">
        <label class="toggle-label">
          <NanoSwitch v-model="injectViralSpike" size="sm" />
          <span>{{ t('heatmapDoc.outlierToggle') }}</span>
        </label>

        <label class="toggle-label">
          <NanoSwitch v-model="matrixShowValues" size="sm" />
          <span>{{ t('heatmapDoc.showValuesToggle') }}</span>
        </label>

        <label class="toggle-label">
          <NanoSwitch v-model="matrixShowTotals" size="sm" />
          <span>{{ t('heatmapDoc.showTotalsToggle') }}</span>
        </label>

        <label class="toggle-label">
          <NanoSwitch v-model="matrixAllZero" size="sm" />
          <span>{{ t('heatmapDoc.zeroMatrixToggle') }}</span>
        </label>
      </div>

      <NanoHeatmap
        v-model:selected-cell="selectedMatrixCell"
        v-model:scale="matrixScale"
        mode="matrix"
        :rows="WEEKDAY_ROWS"
        :cols="HOUR_COLS"
        :data="matrixData"
        :palette="matrixPalette"
        :buckets="matrixBuckets"
        :show-values="matrixShowValues"
        :show-totals="matrixShowTotals"
        allow-scale-switch
        show-legend
        :cell-min-size="28"
        @hover="hoveredMatrixCell = $event"
      />

      <div class="telemetry-readout">
        <div class="readout-chip">
          <span class="readout-key">{{ t('heatmapDoc.selectedLabel') }}:</span>
          <strong v-if="selectedMatrixCell">
            {{ selectedMatrixCell.rowLabel }} · {{ selectedMatrixCell.colLabel }}:00 — {{ selectedMatrixCell.value }} ({{ selectedMatrixCell.sharePct }}%)
          </strong>
          <span v-else class="readout-empty">{{ t('heatmapDoc.noneLabel') }}</span>
        </div>

        <div class="readout-chip">
          <span class="readout-key">{{ t('heatmapDoc.hoveredLabel') }}:</span>
          <strong v-if="hoveredMatrixCell">
            {{ hoveredMatrixCell.rowLabel }} · {{ hoveredMatrixCell.colLabel }}:00 — {{ hoveredMatrixCell.value }}
          </strong>
          <span v-else class="readout-empty">{{ t('heatmapDoc.noneLabel') }}</span>
        </div>
      </div>
    </div>

    <!-- Section 2: 2D KDE Density Canvas Mode -->
    <div class="nano-card demo-card">
      <div class="demo-header">
        <div>
          <h3>{{ t('heatmapDoc.densityTitle') }}</h3>
          <p class="demo-desc">{{ t('heatmapDoc.densityDesc') }}</p>
        </div>
      </div>

      <div class="controls-bar">
        <div class="control-group">
          <span class="control-label">{{ t('heatmapDoc.densityPaletteLabel') }}</span>
          <div class="pill-row" role="group" :aria-label="t('heatmapDoc.densityPaletteLabel')">
            <button
              v-for="pal in HEATMAP_PALETTES"
              :key="`d-pal-${pal}`"
              type="button"
              class="nano-pill-btn"
              :class="{ 'is-active': densityPalette === pal }"
              @click="densityPalette = pal"
            >
              {{ pal }}
            </button>
          </div>
        </div>

        <div class="control-group">
          <span class="control-label">{{ t('heatmapDoc.densityRadiusLabel') }}</span>
          <NanoNumberStepper
            v-model="densityRadius"
            :min="1"
            :max="6"
            :step="0.4"
            variant="split"
            color="info"
          />
        </div>

        <div class="control-group actions-group">
          <button type="button" class="nano-action-btn is-accent" @click="loadSamplePoints">
            {{ t('heatmapDoc.loadEmpiricalBtn') }}
          </button>
          <button
            type="button"
            class="nano-action-btn is-muted"
            :disabled="densityPoints.length === 0"
            @click="clearDensityPoints"
          >
            {{ t('heatmapDoc.clearPointsBtn') }} ({{ densityPoints.length }})
          </button>
        </div>
      </div>

      <div
        class="density-collector-wrap"
        @pointerdown="onStagePointerDown"
        @pointermove="onStagePointerMove"
        @pointerup="stopStageDrawing"
        @pointerleave="stopStageDrawing"
      >
        <NanoHeatmap
          mode="density"
          :points="densityPoints"
          :palette="densityPalette"
          :density-radius="densityRadius"
          :density-height="240"
          :empty-label="t('heatmapDoc.densityEmptyLabel')"
          allow-scale-switch
        >
          <div v-if="densityPoints.length > 0" class="density-hud-badge">
            {{ densityPoints.length }} pts · {{ t('heatmapDoc.clickHint') }}
          </div>
        </NanoHeatmap>
      </div>
    </div>

    <NanoCodeBlock :tabs="codeTabs" />
  </div>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.demo-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

.demo-header h3 {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 700;
}

.demo-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  opacity: 0.8;
}

.controls-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 16px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.actions-group {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--nano-text-muted, #64748b);
}

.pill-row {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
}

.nano-pill-btn,
.nano-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 11px;
  border-radius: 6px;
  border: 1px solid var(--nano-border-card, rgba(148, 163, 184, 0.28));
  background: var(--nano-bg-muted, rgba(255, 255, 255, 0.05));
  color: var(--nano-text-secondary, #cbd5e1);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  box-sizing: border-box;
  cursor: pointer;
  user-select: none;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
}

.nano-pill-btn:hover:not(:disabled),
.nano-action-btn:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--nano-status-info, #0284c7) 52%, var(--nano-border-card, #cbd5e1));
  background: color-mix(in srgb, var(--nano-status-info, #0284c7) 10%, var(--nano-bg-muted, #f1f5f9));
  color: var(--nano-text-main, #0f172a);
}

.nano-pill-btn.is-active {
  border-color: var(--nano-status-info, #0284c7);
  background: var(--nano-status-info-bg, rgba(2, 132, 199, 0.12));
  color: var(--nano-status-info-text, #075985);
}

.nano-action-btn.is-accent {
  border-color: color-mix(in srgb, var(--nano-status-info, #0284c7) 42%, var(--nano-border-card, #cbd5e1));
  color: var(--nano-text-main, #0f172a);
}

.nano-action-btn:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.toggles-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px;
}

.toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
}

.telemetry-readout {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 6px;
  font-size: 12px;
}

.readout-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--nano-bg-muted, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--nano-border-subtle, rgba(148, 163, 184, 0.2));
  color: var(--nano-text-secondary, #cbd5e1);
  font-variant-numeric: tabular-nums;
}

.readout-key {
  color: var(--nano-text-muted, #64748b);
}

.readout-empty {
  color: var(--nano-text-muted, #64748b);
  opacity: 0.8;
}

.density-collector-wrap {
  cursor: crosshair;
  user-select: none;
  touch-action: none;
}

.density-hud-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--nano-bg-card, #ffffff) 86%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--nano-border-card, rgba(148, 163, 184, 0.28));
  color: var(--nano-text-secondary, #1e293b);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.1);
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

@media (forced-colors: active) {
  .nano-pill-btn.is-active {
    outline: 2px solid SelectedItem;
    outline-offset: -2px;
  }
}
</style>
