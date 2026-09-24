<script setup>
import { ref, computed } from 'vue';
import ThreeDDonutChart from '../../components/ThreeDDonutChart.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import KineticRotator from '../../components/KineticRotator.vue';
import NanoIcon from '../../components/NanoIcon.vue';
import { normalizeAngle } from '../../utils/math.js';

const isExpanded = ref(true);
const is3D = ref(true);
const showLabels = ref(true);
const rotationAngle = ref(-90);
const autoRotate = ref(true);
const slopeRatio = ref(0.5);
const thickness = ref(0.5);
const showCenterText = ref(true);
const chartAnimationDuration = ref(300); // 0, 150, 300, 500
const labelFontSize = ref(13); // 11, 13, 15, 17

const stepRotation = (delta) => {
  rotationAngle.value = Math.min(360, Math.max(-360, Math.round(rotationAngle.value + delta)));
};

const setRotation = (angle) => {
  rotationAngle.value = angle;
};

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

    <!-- 1. Full-Width Live Preview Stage on Top -->
    <div class="stage-container">
      <div class="demo-section preview-panel">
        <div class="preview-header">
          <h3>Live Preview</h3>
          <div class="preview-badges">
            <span v-if="selectable && selectedItemId" class="status-badge locked">
              Locked on: {{ selectedItemId }}
            </span>
            <span class="status-badge">
              {{ is3D ? '3D Oblique' : '2D Flat' }}
            </span>
            <span class="status-badge">
              Angle: {{ Math.round(normalizeAngle(rotationAngle)) }}°
            </span>
          </div>
        </div>

        <div class="chart-container">
          <ThreeDDonutChart 
            v-model:hoveredItemId="hoveredItemId"
            v-model:selectedItemId="selectedItemId"
            :selectable="selectable"
            :data="computedChartData"
            :isExpanded="isExpanded"
            :showLabels="showLabels"
            :labelFontSize="labelFontSize"
            :animationDuration="chartAnimationDuration"
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

    <!-- 2. Controls Grid Below the Chart -->
    <div class="controls-grid">
      <!-- Column 1: Slices / Data Points -->
      <div class="demo-section control-card">
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

      <!-- Column 2: 3D & Visual Settings -->
      <div class="demo-section control-card">
        <h4>2. 3D & Visual Settings</h4>
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
          <span class="switch-label">Selectable (Click to lock)</span>
          <NanoSwitch v-model="selectable" size="compact" />
        </div>

        <div class="slider-row" :style="!is3D ? 'opacity: 0.35; pointer-events: none;' : ''">
          <span class="slider-label">Slope Ratio (Tilt): {{ slopeRatio }}</span>
          <input type="range" v-model.number="slopeRatio" min="0.2" max="1.0" step="0.01" :disabled="!is3D" />
        </div>

        <div class="slider-row">
          <span class="slider-label">Donut Thickness: {{ (thickness * 100).toFixed(0) }}%</span>
          <input type="range" v-model.number="thickness" min="0.0" max="1.0" step="0.01" />
        </div>

        <div class="slider-row">
          <span class="slider-label">Label Decimals: {{ valueDecimalsRange === -1 ? 'Auto' : valueDecimalsRange }}</span>
          <input type="range" v-model.number="valueDecimalsRange" min="-1" max="10" step="1" />
        </div>

        <div class="control-subgroup" style="margin-top: 14px;">
          <span class="slider-label" style="display: block; margin-bottom: 6px;">Animation Duration: {{ chartAnimationDuration === 0 ? '0ms (Instant)' : chartAnimationDuration + 'ms' }}</span>
          <div class="nano-btn-group" style="width: 100%;">
            <button 
              v-for="dur in [0, 150, 300, 500]" 
              :key="dur"
              type="button"
              class="nano-btn nano-btn-sm"
              :class="chartAnimationDuration === dur ? 'nano-btn-primary' : 'nano-btn-secondary'"
              style="flex: 1; text-align: center; justify-content: center; font-weight: 600;"
              @click="chartAnimationDuration = dur"
            >
              {{ dur === 0 ? '0ms' : dur + 'ms' }}
            </button>
          </div>
        </div>

        <div class="control-subgroup" style="margin-top: 14px;" :style="!showLabels ? 'opacity: 0.4; pointer-events: none;' : ''">
          <span class="slider-label" style="display: block; margin-bottom: 6px;">Label Font Size: {{ labelFontSize }}px</span>
          <div class="nano-btn-group" style="width: 100%;">
            <button 
              v-for="opt in [
                { label: 'S (11)', value: 11 },
                { label: 'M (13)', value: 13 },
                { label: 'L (15)', value: 15 },
                { label: 'XL (17)', value: 17 }
              ]" 
              :key="opt.value"
              type="button"
              class="nano-btn nano-btn-sm"
              :class="labelFontSize === opt.value ? 'nano-btn-primary' : 'nano-btn-secondary'"
              style="flex: 1; text-align: center; justify-content: center; font-weight: 600;"
              @click="labelFontSize = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Column 3: Rotation & Aggregation -->
      <div class="demo-section control-card">
        <h4>3. Rotation & Kinetic MSP</h4>
        
        <div class="switch-row" style="margin-top: 0.5rem; margin-bottom: 8px;">
          <span class="switch-label">Auto-Rotate (Column Balance)</span>
          <NanoSwitch v-model="autoRotate" size="compact" />
        </div>

        <div 
          class="rotator-control-card" 
          :style="autoRotate ? 'opacity: 0.35; pointer-events: none;' : ''"
        >
          <div class="rotator-card-header">
            <span class="slider-label">Start Angle: <strong>{{ Math.round(rotationAngle) }}°</strong></span>
            <span class="badge-msp">{{ chartAnimationDuration === 0 ? 'Instant (0ms)' : chartAnimationDuration + 'ms Anim' }}</span>
          </div>
          
          <input 
            type="range" 
            v-model.number="rotationAngle" 
            min="-360" 
            max="360" 
            step="1"
          />

          <div class="kinetic-control-row">
            <div class="kinetic-dial-container">
              <KineticRotator
                v-model="rotationAngle"
                :interactive="true"
                :wrap="true"
                :min="-360"
                :max="360"
                :angle-offset="90"
                :size="56"
                :duration="chartAnimationDuration"
                :shortest-path="true"
              >
                <template #default="{ currentAngle, isDragging }">
                  <div class="mini-dial-plate" :class="{ 'is-dragging': isDragging }">
                    <div class="mini-dial-marker"></div>
                    <div class="mini-dial-hub" @pointerdown.stop @click.stop="setRotation(0)">
                      <NanoIcon name="rotate" :size="14" />
                    </div>
                  </div>
                </template>
              </KineticRotator>
            </div>

            <div class="step-buttons-grid">
              <button type="button" class="btn-step" @click="stepRotation(-90)">-90°</button>
              <button type="button" class="btn-step" @click="stepRotation(-45)">-45°</button>
              <button type="button" class="btn-step" @click="setRotation(0)">0°</button>
              <button type="button" class="btn-step" @click="stepRotation(45)">+45°</button>
              <button type="button" class="btn-step" @click="stepRotation(90)">+90°</button>
            </div>
          </div>
        </div>

        <h4 style="margin-top: 1.25rem;">4. Value Aggregation</h4>
        <div class="switch-row" style="margin-top: 0.5rem;">
          <span class="switch-label">Aggregate into "Other"</span>
          <NanoSwitch v-model="aggregateOthers" size="compact" />
        </div>

        <div class="slider-row" :style="!aggregateOthers ? 'opacity: 0.4; pointer-events: none;' : ''">
          <span class="slider-label">Others Threshold: {{ (othersThreshold * 100).toFixed(1) }}%</span>
          <input type="range" v-model.number="othersThreshold" min="0.001" max="0.30" step="0.001" />
        </div>

        <div class="input-row" :style="!aggregateOthers ? 'opacity: 0.4; pointer-events: none;' : ''" style="display: flex; gap: 8px; margin-top: 10px;">
          <input type="text" v-model="othersLabel" class="input-name" style="width: 100%;" placeholder="Other Label" />
          <input type="color" v-model="othersColor" class="input-color" style="height: 32px;" />
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
animationDuration: Number (default: 350) - Duration of chart transitions in ms (0 for instant)
labelSize: String (default: 'md') - Preset size for callout labels ('sm', 'md', 'lg', 'xl')
labelFontSize: Number | String (default: undefined) - Custom font size in px for callout labels (e.g. 13 or '13px')
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

.stage-container {
  width: 100%;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--nano-border-subtle);
  padding-bottom: 0.5rem;
}

.preview-header h3 {
  margin: 0;
  border: none;
  padding: 0;
}

.preview-badges {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--nano-bg-muted);
  color: var(--nano-text-secondary);
  border: 1px solid var(--nano-border-subtle);
}

.status-badge.locked {
  background: color-mix(in srgb, #10b981 15%, transparent);
  color: #10b981;
  border-color: color-mix(in srgb, #10b981 30%, transparent);
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

@media (max-width: 1100px) {
  .controls-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .controls-grid {
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
  max-height: 440px;
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
  min-height: 400px;
  padding: 1rem 0;
  width: 100%;
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

.rotator-control-card {
  background: var(--nano-bg-subtle, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--nano-border-subtle);
  border-radius: var(--nano-radius-md, 8px);
  padding: 10px 12px;
  margin: 10px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rotator-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.badge-msp {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--nano-accent-primary) 15%, transparent);
  color: var(--nano-accent-primary);
  border: 1px solid color-mix(in srgb, var(--nano-accent-primary) 30%, transparent);
}

.kinetic-control-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.kinetic-dial-container {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mini-dial-plate {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--nano-bg-surface) 85%, var(--nano-accent-primary) 15%);
  border: 2px solid var(--nano-border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: grab;
  user-select: none;
  touch-action: none;
  transition: border-color var(--nano-transition-interactive), box-shadow var(--nano-transition-interactive);
}

.mini-dial-plate:hover {
  border-color: var(--nano-accent-primary);
  box-shadow: 0 0 10px color-mix(in srgb, var(--nano-accent-primary) 35%, transparent);
}

.mini-dial-plate:active,
.mini-dial-plate.is-dragging {
  cursor: grabbing;
  border-color: var(--nano-accent-primary);
  box-shadow: 0 0 16px color-mix(in srgb, var(--nano-accent-primary) 60%, transparent);
}

.mini-dial-marker {
  position: absolute;
  top: 3px;
  left: calc(50% - 1.5px);
  width: 3px;
  height: 8px;
  background: var(--nano-accent-primary);
  border-radius: 2px;
  box-shadow: 0 0 4px var(--nano-accent-primary);
}

.mini-dial-hub {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--nano-bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--nano-text-primary);
  border: 1px solid var(--nano-border-subtle);
  cursor: pointer;
  transition: background var(--nano-transition-interactive), border-color var(--nano-transition-interactive), color var(--nano-transition-interactive);
}

.mini-dial-hub:hover {
  background: var(--nano-bg-hover);
  border-color: var(--nano-accent-primary);
  color: var(--nano-accent-primary);
}

.step-buttons-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1;
}

.btn-step {
  flex: 1 1 calc(33.333% - 4px);
  min-width: 40px;
  padding: 4px 6px;
  font-size: 0.75rem;
  font-weight: 500;
  background: var(--nano-bg-surface);
  color: var(--nano-text-primary);
  border: 1px solid var(--nano-border-subtle);
  border-radius: 4px;
  cursor: pointer;
  transition: background var(--nano-transition-interactive), border-color var(--nano-transition-interactive);
}

.btn-step:hover {
  background: var(--nano-border-subtle);
  border-color: var(--nano-accent-primary);
}
</style>
