<script setup>
import { ref, computed } from 'vue';
import ThreeDDonutChart from '../../components/ThreeDDonutChart.vue';

const isExpanded = ref(true);
const is3D = ref(true);
const showLabels = ref(true);
const rotationAngle = ref(-90);
const autoRotate = ref(true);
const slopeRatio = ref(0.5);

// Aggregation settings
const aggregateOthers = ref(true);
const othersThreshold = ref(0.05); // 5%
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

const computedCenterValue = computed(() => {
  const total = computedChartData.value.reduce((sum, item) => sum + item.value, 0);
  const hovered = computedChartData.value.find(item => item.id === hoveredItemId.value);
  const decs = valueDecimals.value !== undefined ? valueDecimals.value : 1;
  if (hovered) {
    return hovered.value.toFixed(decs);
  }
  return total.toFixed(decs);
});

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
            <label class="switch">
              <input type="checkbox" v-model="showLabels" />
              <span class="switch-slider"></span>
            </label>
          </div>

          <div class="switch-row" style="margin-top: 10px;">
            <span class="switch-label">Compact (Mini) Layout</span>
            <label class="switch">
              <input type="checkbox" :checked="!isExpanded" @change="isExpanded = !$event.target.checked" />
              <span class="switch-slider"></span>
            </label>
          </div>

          <div class="switch-row" style="margin-top: 10px;">
            <span class="switch-label">3D Render Mode</span>
            <label class="switch">
              <input type="checkbox" v-model="is3D" />
              <span class="switch-slider"></span>
            </label>
          </div>
          
          <div class="switch-row" style="margin-top: 10px;">
            <span class="switch-label">Auto-Rotate</span>
            <label class="switch">
              <input type="checkbox" v-model="autoRotate" />
              <span class="switch-slider"></span>
            </label>
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
            <label class="switch">
              <input type="checkbox" v-model="selectable" />
              <span class="switch-slider"></span>
            </label>
          </div>

          <div v-if="selectable && selectedItemId" style="font-size: 0.85rem; color: #10b981; margin-top: 8px; font-weight: 500;">
            Locked on: {{ selectedItemId }}
          </div>

          <div class="slider-row" :style="!is3D ? 'opacity: 0.35; pointer-events: none;' : ''">
            <span class="slider-label">Slope Ratio (Tilt): {{ slopeRatio }}</span>
            <input type="range" v-model.number="slopeRatio" min="0.2" max="1.0" step="0.01" :disabled="!is3D" />
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
            <label class="switch">
              <input type="checkbox" v-model="aggregateOthers" />
              <span class="switch-slider"></span>
            </label>
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
            :aggregateOthers="aggregateOthers"
            :othersThreshold="othersThreshold"
            :othersLabel="othersLabel"
            :othersColor="othersColor"
            :valueDecimals="valueDecimals"
            :centerValue="computedCenterValue"
            centerLabel="Total Area (M km²)"
            emptyText="Add countries to render the 3D donut chart!"
          />
        </div>
      </div>
    </div>

    <div class="api-reference">
      <h3>API Reference</h3>
      <code>
        // Props<br>
        data: Array (required) - Array of { id, name, value, percentage, color, unit }<br>
        isExpanded: Boolean (default: false) - Expanded container layout (large viewBox) vs compact (120x120px viewBox)<br>
        showLabels: Boolean (default: true) - Renders side labels & callout lines (when isExpanded is true)<br>
        is3D: Boolean (default: true) - Enables 3D perspective (depth & tilt)<br>
        centerValue: String | Number (default: '') - Value shown in center hole (defaults to sum)<br>
        centerLabel: String (default: '') - Label shown below center value<br>
        rotationAngle: Number (default: -90) - Starting rotation of the donut chart<br>
        autoRotate: Boolean (default: false) - Balances labels evenly across left & right columns<br>
        slopeRatio: Number (default: 0.5) - Vertical tilt of the chart (0.2 to 1.0)<br>
        aggregateOthers: Boolean (default: false) - Aggregates small values below threshold<br>
        othersThreshold: Number (default: 0.01) - Fraction below which values are merged (e.g. 0.05 for 5%)<br>
        othersLabel: String (default: 'Other') - Merged slice label name<br>
        othersColor: String (default: '#64748b') - Color code of the merged slice<br>
        valueDecimals: Number (default: undefined) - Decimal places to round slice values on labels (e.g. 2)<br>
        selectable: Boolean (default: false) - Enables locking of items on click/tap<br>
        selectedItemId: String | Number (default: null) - Currently selected/locked item ID (supports v-model:selectedItemId)
      </code>
    </div>
  </div>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

h2 { margin: 0; color: #fff; }
h3 { margin-bottom: 1rem; color: #a1a1aa; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; }
h4 { margin: 0 0 0.5rem 0; color: #e4e4e7; font-size: 0.9rem; }

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
  background: rgba(255, 255, 255, 0.02);
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.demo-btn {
  background: #6366f1;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s ease;
}

.demo-btn:hover { background: #4f46e5; }

.secondary-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e4e4e7;
}

.secondary-btn:hover {
  background: rgba(255, 255, 255, 0.1);
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
  background: #09090b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 10px;
  border-radius: 6px;
  color: #fff;
  font-size: 0.85rem;
}

.input-value {
  width: 70px;
  background: #09090b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 10px;
  border-radius: 6px;
  color: #fff;
  font-size: 0.85rem;
}

.input-color {
  width: 32px;
  height: 30px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  border-radius: 6px;
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
  color: #d4d4d8;
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
  color: #a1a1aa;
}

/* Custom premium Switch */
.switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition: .3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 20px;
}

.switch-slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 2px;
  bottom: 2px;
  background-color: #a1a1aa;
  transition: .3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 50%;
}

input:checked + .switch-slider {
  background-color: rgba(99, 102, 241, 0.2);
  border-color: #6366f1;
}

input:checked + .switch-slider:before {
  transform: translateX(16px);
  background-color: #6366f1;
}

.switch:hover .switch-slider:before {
  background-color: #e4e4e7;
}

input:checked:hover + .switch-slider:before {
  background-color: #818cf8;
}

input:disabled + .switch-slider {
  opacity: 0.5;
  cursor: not-allowed;
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
  color: #d4d4d8;
  user-select: none;
}

/* Premium styled range slider */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  outline: none;
  transition: background 0.2s ease;
  cursor: pointer;
  margin: 8px 0;
}

input[type="range"]:hover {
  background: rgba(255, 255, 255, 0.15);
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #6366f1;
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
  transition: transform 0.1s ease, background 0.1s ease;
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  background: #818cf8;
}

input[type="range"]::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: #6366f1;
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
  transition: transform 0.1s ease, background 0.1s ease;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb:hover {
  transform: scale(1.2);
  background: #818cf8;
}

.chart-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  padding: 10px;
}

.api-reference {
  background: #1e1e1e;
  padding: 1rem;
  border-radius: 8px;
  font-family: monospace;
  color: #a1a1aa;
  line-height: 1.5;
}

/* Light mode overrides */
:root[data-theme="light"] h2 { color: #0f172a; }
:root[data-theme="light"] h4 { color: #1e293b; }
:root[data-theme="light"] .demo-section {
  background: #ffffff;
  border-color: #e2e8f0;
}
:root[data-theme="light"] .input-name,
:root[data-theme="light"] .input-value {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #0f172a;
}
:root[data-theme="light"] .secondary-btn {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #334155;
}
:root[data-theme="light"] .secondary-btn:hover {
  background: #e2e8f0;
}
:root[data-theme="light"] .checkbox-label {
  color: #334155;
}
:root[data-theme="light"] .switch-label {
  color: #334155;
}
:root[data-theme="light"] .switch-slider {
  background-color: #cbd5e1;
  border-color: #94a3b8;
}
:root[data-theme="light"] .switch-slider:before {
  background-color: #64748b;
}
:root[data-theme="light"] input:checked + .switch-slider {
  background-color: rgba(99, 102, 241, 0.15);
  border-color: #6366f1;
}
:root[data-theme="light"] input:checked + .switch-slider:before {
  background-color: #6366f1;
}
:root[data-theme="light"] input[type="range"] {
  background: #cbd5e1;
}
:root[data-theme="light"] .api-reference {
  background: #f1f5f9;
  color: #334155;
}
</style>
