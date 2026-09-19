<script setup>
import { ref, computed } from 'vue';
import ThreeDDonutChart from '../../components/ThreeDDonutChart.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';

const isExpanded = ref(true);
const is3D = ref(true);
const showLabels = ref(true);
const rotationAngle = ref(-90);
const autoRotate = ref(true);
const slopeRatio = ref(0.5);
const thickness = ref(0.5);
const showCenterText = ref(true);

// Aggregation settings
const aggregateOthers = ref(true);
const othersThreshold = ref(0.01); // 1%
const othersLabel = ref('Other');
const othersColor = ref('#64748b');

// Decimals formatting
const valueDecimalsRange = ref(2); // -1 = Auto, 0-10 = decimals
const valueDecimals = computed(() => {
  return valueDecimalsRange.value === -1 ? undefined : valueDecimalsRange.value;
});

const hoveredItemId = ref(null);
const selectable = ref(true);
const selectedItemId = ref(null);

const testData = ref([
  { name: 'Russia', value: 17.1, color: '#3b82f6' },
  { name: 'Canada', value: 9.98, color: '#ef4444' },
  { name: 'China', value: 9.59, color: '#eab308' },
  { name: 'United States', value: 9.52, color: '#10b981' },
  { name: 'Brazil', value: 8.51, color: '#a855f7' },
  { name: 'Australia', value: 7.69, color: '#f97316' },
  { name: 'India', value: 3.29, color: '#06b6d4' },
  { name: 'Argentina', value: 2.78, color: '#84cc16' },
  { name: 'Poland', value: 0.31, color: '#ec4899' },
  { name: 'Iceland', value: 0.10, color: '#14b8a6' }
]);

const computedChartData = computed(() => {
  const total = testData.value.reduce((sum, item) => sum + (item.value || 0), 0);
  return testData.value.map(item => {
    const val = item.value || 0;
    const pct = total > 0 ? Math.round((val / total) * 100) : 0;
    return {
      id: item.name || Math.random().toString(),
      name: item.name || 'Unnamed',
      value: val,
      percentage: pct,
      color: item.color || '#3b82f6',
      unit: 'M km²'
    };
  });
});

const centerValueFormatter = (val, item) => {
  const decs = valueDecimals.value !== undefined ? valueDecimals.value : 1;
  const formatted = val.toFixed(decs);
  if (item) {
    return `${formatted} ${item.unit || 'M km²'}`;
  }
  return `${formatted}`;
};

const addItem = () => {
  const colorsList = ['#ec4899', '#a855f7', '#14b8a6', '#f43f5e', '#6366f1'];
  const randomColor = colorsList[testData.value.length % colorsList.length];
  testData.value.push({
    name: 'New Country ' + (testData.value.length + 1),
    value: parseFloat((Math.random() * 5 + 0.1).toFixed(2)),
    color: randomColor
  });
};

const removeItem = (idx) => {
  testData.value.splice(idx, 1);
};

const resetToDefault = () => {
  testData.value = [
    { name: 'Russia', value: 17.1, color: '#3b82f6' },
    { name: 'Canada', value: 9.98, color: '#ef4444' },
    { name: 'China', value: 9.59, color: '#eab308' },
    { name: 'United States', value: 9.52, color: '#10b981' },
    { name: 'Brazil', value: 8.51, color: '#a855f7' },
    { name: 'Australia', value: 7.69, color: '#f97316' },
    { name: 'India', value: 3.29, color: '#06b6d4' },
    { name: 'Argentina', value: 2.78, color: '#84cc16' },
    { name: 'Poland', value: 0.31, color: '#ec4899' },
    { name: 'Iceland', value: 0.10, color: '#14b8a6' }
  ];
};

const setSingleDatapoint = () => {
  testData.value = [
    { name: 'Poland', value: 0.31, color: '#ec4899' }
  ];
};
</script>

<template>
  <div class="doc-page">
    <h2>ThreeDDonutChart Component</h2>
    <p>A glossy 3D donut / pie chart component built on SVG, featuring responsive painter's algorithm Z-index layers, auto-balancing label leader lines, and dynamic data aggregation.</p>

    <div class="sandbox-grid">
      <!-- Left Panel: Controls -->
      <div class="demo-section controls-panel">
        <h3>Interactive Controls</h3>
        
        <div class="control-group">
          <h4>1. Slices / Data Points</h4>
          <div class="slices-list">
            <div v-for="(item, idx) in testData" :key="idx" class="slice-row">
              <input type="text" v-model="item.name" class="input-name" placeholder="Name" />
              <input type="number" v-model.number="item.value" class="input-value" min="0.01" step="0.01" placeholder="Value" />
              <input type="color" v-model="item.color" class="input-color" />
              <button @click="removeItem(idx)" class="btn-remove">🗑️</button>
            </div>
          </div>
          <div class="action-buttons">
            <button @click="addItem" class="demo-btn secondary-btn">Add Slice</button>
            <button @click="setSingleDatapoint" class="demo-btn secondary-btn">1 Datapoint Test</button>
            <button @click="resetToDefault" class="demo-btn secondary-btn">Reset</button>
          </div>
        </div>

        <div class="control-group" style="margin-top: 1.5rem;">
          <h4>2. Visual Settings</h4>
          <div class="switch-row" style="margin-top: 0.5rem;">
            <span class="switch-label">Show Labels & Leader Lines</span>
            <NanoSwitch v-model="showLabels" size="compact" />
          </div>

          <div class="switch-row" style="margin-top: 10px;">
            <span class="switch-label">Show Center Value Text</span>
            <NanoSwitch v-model="showCenterText" size="compact" />
          </div>

          <div class="switch-row" style="margin-top: 10px;">
            <span class="switch-label">Compact (Mini) Layout</span>
            <NanoSwitch :modelValue="!isExpanded" @update:modelValue="isExpanded = !$event" size="compact" />
          </div>

          <div class="switch-row" style="margin-top: 10px;">
            <span class="switch-label">3D Render Mode</span>
            <NanoSwitch v-model="is3D" size="compact" />
          </div>
          
          <div class="switch-row" style="margin-top: 10px;">
            <span class="switch-label">Auto-Rotate</span>
            <NanoSwitch v-model="autoRotate" size="compact" />
          </div>

          <div 
            class="slider-row" 
            :style="autoRotate ? 'opacity: 0.35; pointer-events: none;' : ''"
            style="margin-top: 8px; margin-bottom: 8px;"
          >
            <span class="slider-label">Start Angle (Rotation): {{ rotationAngle }}°</span>
            <input type="range" v-model.number="rotationAngle" min="-360" max="360" step="1" />
          </div>

          <div class="switch-row" style="margin-top: 10px;">
            <span class="switch-label">Selectable (Click/Tap to lock item details)</span>
            <NanoSwitch v-model="selectable" size="compact" />
          </div>

          <div v-if="selectable && selectedItemId" style="font-size: 0.85rem; color: #10b981; margin-top: 8px; font-weight: 500;">
            Locked on: {{ selectedItemId }}
          </div>

          <div class="slider-row" :style="!is3D ? 'opacity: 0.35; pointer-events: none;' : ''">
            <span class="slider-label">Slope Ratio (Tilt): {{ slopeRatio }}</span>
            <input type="range" v-model.number="slopeRatio" min="0.2" max="1.0" step="0.01" :disabled="!is3D" />
          </div>

          <div class="slider-row">
            <span class="slider-label">Donut Thickness (Pie-to-Donut): {{ (thickness * 100).toFixed(0) }}%</span>
            <input type="range" v-model.number="thickness" min="0.0" max="1.0" step="0.01" />
          </div>

          <div class="slider-row">
            <span class="slider-label">Label Decimals: {{ valueDecimalsRange === -1 ? 'Auto' : valueDecimalsRange }}</span>
            <input type="range" v-model.number="valueDecimalsRange" min="-1" max="10" step="1" />
          </div>
        </div>

        <div class="control-group" style="margin-top: 1.5rem;">
          <h4>3. Value Aggregation</h4>
          <div class="switch-row">
            <span class="switch-label">Aggregate data below threshold into "Other"</span>
            <NanoSwitch v-model="aggregateOthers" size="compact" />
          </div>

          <div class="slider-row" :style="!aggregateOthers ? 'opacity: 0.4; pointer-events: none;' : ''">
            <span class="slider-label">Others Threshold: {{ (othersThreshold * 100).toFixed(1) }}%</span>
            <input type="range" v-model.number="othersThreshold" min="0.001" max="0.15" step="0.001" />
          </div>

          <div class="input-row" :style="!aggregateOthers ? 'opacity: 0.4; pointer-events: none;' : ''" style="display: flex; gap: 8px; margin-top: 10px;">
            <input type="text" v-model="othersLabel" class="input-name" style="width: 100%;" placeholder="Other Label" />
            <input type="color" v-model="othersColor" class="input-color" style="height: 32px;" />
          </div>
        </div>
      </div>

      <!-- Right Panel: Chart Preview -->
      <div class="demo-section preview-panel">
        <h3>Live Preview</h3>
        <div class="chart-container">
          <ThreeDDonutChart 
            v-model:hoveredItemId="hoveredItemId"
            v-model:selectedItemId="selectedItemId"
            :selectable="selectable"
            :data="computedChartData"
            :isExpanded="isExpanded"
            :showLabels="showLabels"
            :is3D="is3D"
            :rotationAngle="rotationAngle"
            :autoRotate="autoRotate"
            :slopeRatio="slopeRatio"
            :thickness="thickness"
            :showCenterText="showCenterText"
            :aggregateOthers="aggregateOthers"
            :othersThreshold="othersThreshold"
            :othersLabel="othersLabel"
            :othersColor="othersColor"
            :valueDecimals="valueDecimals"
            :centerValueFormatter="centerValueFormatter"
            centerLabel="Total Area (M km²)"
            emptyText="Add countries to render the 3D donut chart!"
          />
        </div>
      </div>
    </div>

    <NanoCodeBlock title="API Reference" lang="api">
// Props
data: Array (required) - Array of { id, name, value, percentage, color, unit }
isExpanded: Boolean (default: false) - Expanded container layout (large viewBox) vs compact (120x120px viewBox)
showLabels: Boolean (default: true) - Renders side labels &amp; callout lines (when isExpanded is true)
is3D: Boolean (default: true) - Enables 3D perspective (depth &amp; tilt)
centerValue: String | Number (default: '') - Value shown in center hole (defaults to sum)
centerLabel: String (default: '') - Label shown below center value
centerValueFormatter: Function (default: null) - Custom formatter function: (value, item) =&gt; string
rotationAngle: Number (default: -90) - Starting rotation of the donut chart
autoRotate: Boolean (default: false) - Balances labels evenly across left &amp; right columns
slopeRatio: Number (default: 0.5) - Vertical tilt of the chart (0.2 to 1.0)
aggregateOthers: Boolean (default: false) - Aggregates small values below threshold
othersThreshold: Number (default: 0.01) - Fraction below which values are merged (e.g. 0.05 for 5%)
othersLabel: String (default: 'Other') - Merged slice label name
othersColor: String (default: '#64748b') - Color code of the merged slice
valueDecimals: Number (default: undefined) - Decimal places to round slice values on labels (e.g. 2)
selectable: Boolean (default: false) - Enables locking of items on click/tap
selectedItemId: String | Number (default: null) - Currently selected/locked item ID (supports v-model:selectedItemId)
thickness: Number (default: 0.5) - Thickness from 0.0 (thin ring) to 1.0 (full pie chart)
showCenterText: Boolean (default: true) - Show/hide center value and label texts
    </NanoCodeBlock>
  </div>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

h2 { margin: 0; color: var(--nano-text-main); }
h3 { margin-bottom: 1rem; color: var(--nano-text-muted); border-bottom: 1px solid var(--nano-border-subtle); padding-bottom: 0.5rem; }
h4 { margin: 0 0 0.5rem 0; color: var(--nano-text-secondary); font-size: 0.9rem; }

.sandbox-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 900px) {
  .sandbox-grid {
    grid-template-columns: 1fr;
  }
}

.demo-section {
  background: var(--nano-bg-card);
  padding: 1.5rem;
  border-radius: var(--nano-radius-md, 8px);
  border: 1px solid var(--nano-border-card);
}

.demo-btn {
  background: var(--nano-accent-primary);
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: var(--nano-radius-sm, 6px);
  cursor: pointer;
  font-weight: 600;
  transition: background var(--nano-transition-interactive);
}

.demo-btn:hover { background: var(--nano-accent-primary-hover); }

.secondary-btn {
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-subtle);
  color: var(--nano-text-main);
}

.secondary-btn:hover {
  background: var(--nano-bg-hover);
  border-color: var(--nano-border-hover);
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.slices-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
  padding-right: 5px;
  margin-bottom: 10px;
}

.slice-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.input-name {
  flex-grow: 1;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-subtle);
  padding: 6px 10px;
  border-radius: var(--nano-radius-sm, 6px);
  color: var(--nano-text-main);
  font-size: 0.85rem;
  outline: none;
  transition: border-color var(--nano-transition-interactive);
}

.input-name:focus {
  border-color: var(--nano-border-hover);
}

.input-value {
  width: 70px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-subtle);
  padding: 6px 10px;
  border-radius: var(--nano-radius-sm, 6px);
  color: var(--nano-text-main);
  font-size: 0.85rem;
  outline: none;
  transition: border-color var(--nano-transition-interactive);
}

.input-value:focus {
  border-color: var(--nano-border-hover);
}

.input-color {
  width: 32px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--nano-border-subtle);
  background: transparent;
  border-radius: var(--nano-radius-sm, 6px);
  cursor: pointer;
}

.btn-remove {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--nano-text-secondary);
  cursor: pointer;
}

.slider-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 12px;
}

.slider-label {
  font-size: 0.85rem;
  color: var(--nano-text-muted);
}

/* Controls inputs */
.control-row {
  margin-bottom: 12px;
}

.control-row label {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--nano-text-muted);
  margin-bottom: 4px;
}

.control-row label span {
  font-family: monospace;
  color: var(--nano-text-main);
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
}

.switch-label {
  font-size: 0.9rem;
  color: var(--nano-text-secondary);
  user-select: none;
}

/* Premium styled range slider */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 8px;
  background: var(--nano-border-subtle);
  border-radius: 4px;
  outline: none;
  transition: background var(--nano-transition-interactive);
  cursor: pointer;
  margin: 8px 0;
}

input[type="range"]:hover {
  background: var(--nano-border-hover);
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--nano-accent-primary);
  box-shadow: 0 0 10px color-mix(in srgb, var(--nano-accent-primary) 50%, transparent);
  transition: transform var(--nano-transition-interactive), background var(--nano-transition-interactive);
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  background: var(--nano-accent-primary-hover);
}

input[type="range"]::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: var(--nano-accent-primary);
  box-shadow: 0 0 10px color-mix(in srgb, var(--nano-accent-primary) 50%, transparent);
  transition: transform var(--nano-transition-interactive), background var(--nano-transition-interactive);
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb:hover {
  transform: scale(1.2);
  background: var(--nano-accent-primary-hover);
}

.chart-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  padding: 10px;
}

.api-reference {
  background: var(--nano-bg-code);
  border: 1px solid var(--nano-border-subtle);
  padding: 1rem;
  border-radius: var(--nano-radius-md, 8px);
  font-family: monospace;
  color: var(--nano-text-code);
  line-height: 1.5;
}
</style>
