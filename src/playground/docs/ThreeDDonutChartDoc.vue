<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import ThreeDDonutChart from '../../components/ThreeDDonutChart.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import KineticRotator from '../../components/KineticRotator.vue';
import NanoIcon from '../../components/NanoIcon.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { normalizeAngle } from '../../utils/math.js';
import { getOptimalRotationAngle } from '../../utils/chart-walls.js';

const isExpanded = ref(true);
const is3D = ref(true);
const isolateHovered = ref(false);

watch(isolateHovered, (v) => {
  if (typeof window !== 'undefined') {
    window.fullOpacity = v;
  }
});

onMounted(() => {
  const syncTimer = setInterval(() => {
    if (typeof window !== 'undefined' && window.fullOpacity !== undefined && window.fullOpacity !== isolateHovered.value) {
      isolateHovered.value = window.fullOpacity;
    }
  }, 250);
  onUnmounted(() => clearInterval(syncTimer));
});
const showLabels = ref(true);
const rotationAngle = ref(-90);
const autoRotate = ref(true);
const slopeRatio = ref(0.5);
const thickness = ref(0.5);
const showCenterText = ref(true);
const centerTextZ = ref(0.0); // 0.0 = top, 0.5 = center, 1.0 = bottom
const chartAnimationDuration = ref(300); // 0, 150, 300, 500
const labelFontSize = ref(13); // 11, 13, 15, 17
const selectedAspectRatio = ref('auto');

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

const showcaseTab = ref('auto-rotate');

const createLongTailItems = () => {
  const colors = ['#ec4899', '#a855f7', '#14b8a6', '#f43f5e', '#6366f1'];
  const sampleValues = [
    3.28, 4.78, 4.11, 3.48, 3.90, 4.78, 1.63, 1.46, 5.08, 4.98,
    0.44, 3.84, 2.77, 4.78, 4.83, 1.13, 1.93, 4.45, 0.63, 3.99,
    1.60, 2.15, 2.60, 4.30, 0.67, 1.48
  ];
  sampleValues.sort((a, b) => b - a);
  const items = [
    { id: 'dominant-1', name: 'Dominant Category', value: 100.0, color: '#3b82f6', unit: '%' }
  ];
  sampleValues.forEach((v, idx) => {
    items.push({
      id: `small-${idx + 1}`,
      name: `Slice ${idx + 1}`,
      value: v,
      color: colors[idx % colors.length],
      unit: '%'
    });
  });
  return items;
};

const longTailData = ref(createLongTailItems());

// Auto-Rotate showcase isolated state
const autoRotateDemo = ref(true);
const autoRotateDemoAngle = ref(-90);

const autoRotateBalanceStats = computed(() => {
  const items = longTailData.value;
  const total = items.reduce((s, it) => s + (it.value || 0), 0);
  if (!total) return { left: 0, right: 0, diff: 0 };

  const angleDeg = autoRotateDemo.value
    ? getOptimalRotationAngle(items, -90)
    : autoRotateDemoAngle.value;
  const rad = (angleDeg * Math.PI) / 180;
  let cur = 0;
  let left = 0;
  let right = 0;
  items.forEach((it) => {
    const sweep = (it.value / total) * Math.PI * 2;
    const mid = cur + sweep / 2 + rad;
    cur += sweep;
    if (Math.cos(mid) < 0) left++;
    else right++;
  });
  return { left, right, diff: Math.abs(left - right) };
});

const autoRotateCode = computed(() => {
  const rotAngleProp = !autoRotateDemo.value ? `\n    :rotationAngle="${Math.round(autoRotateDemoAngle.value)}"` : '';
  return `<script setup>
import { ThreeDDonutChart } from '@gkucmierz/nano-ui';

// Asymmetric dataset: 1 dominant category (56%) and 26 micro-slices
const chartData = [
  { name: 'Dominant Category', value: 100, color: '#3b82f6' },
  { name: 'Slice 1', value: 3.28, color: '#ec4899' },
  { name: 'Slice 2', value: 4.78, color: '#a855f7' },
  // ... 24 more small slices ...
];
<\/script>

<template>
  <!-- autoRotate automatically balances callout labels 50/50 across left & right columns -->
  <ThreeDDonutChart
    :data="chartData"
    :autoRotate="${autoRotateDemo.value}"${rotAngleProp}
    :showLabels="true"
    :animationDuration="300"
  />
</template>`;
});

// Threshold Aggregation showcase isolated state
const thresholdDemoAggregate = ref(true);
const thresholdDemoThreshold = ref(0.03); // 3%
const thresholdDemoLabel = ref('Other (< 3%)');
const thresholdDemoColor = ref('#64748b');
const thresholdDemoAutoRotate = ref(false);

const thresholdConsolidatedCount = computed(() => {
  const items = longTailData.value;
  const total = items.reduce((s, it) => s + (it.value || 0), 0);
  if (!total || !thresholdDemoAggregate.value) return 0;
  return items.filter((it) => (it.value / total) < thresholdDemoThreshold.value).length;
});

const thresholdCode = computed(() => {
  return `<script setup>
import { ThreeDDonutChart } from '@gkucmierz/nano-ui';

const chartData = [
  { name: 'Dominant Category', value: 100, color: '#3b82f6' },
  { name: 'Slice 1', value: 3.28, color: '#ec4899' },
  // ... 25 micro-slices ...
];
<\/script>

<template>
  <!-- Consolidates micro-slices below ${(thresholdDemoThreshold.value * 100).toFixed(1)}% into a single clean slice -->
  <ThreeDDonutChart
    :data="chartData"
    :aggregateOthers="${thresholdDemoAggregate.value}"
    :othersThreshold="${thresholdDemoThreshold.value}"
    othersLabel="${thresholdDemoLabel.value}"
    othersColor="${thresholdDemoColor.value}"
    :autoRotate="${thresholdDemoAutoRotate.value}"
  />
</template>`;
});

// KPI / Headless Showcase Data (3 smaller charts side-by-side without labels)
const kpiStorageData = [
  { id: 'storage-used', name: 'Used', value: 72, color: '#3b82f6', unit: '%' },
  { id: 'storage-free', name: 'Free', value: 28, color: '#334155', unit: '%' }
];

const kpiMemoryData = [
  { id: 'ram-used', name: 'Used', value: 45, color: '#10b981', unit: '%' },
  { id: 'ram-free', name: 'Free', value: 55, color: '#334155', unit: '%' }
];

const kpiNetworkData = [
  { id: 'net-in', name: 'Inbound', value: 58, color: '#a855f7', unit: '%' },
  { id: 'net-out', name: 'Outbound', value: 30, color: '#ec4899', unit: '%' },
  { id: 'net-idle', name: 'Idle', value: 12, color: '#334155', unit: '%' }
];

const kpiCode = `<script setup>
import { ThreeDDonutChart } from '@gkucmierz/nano-ui';

const storageData = [
  { name: 'Used', value: 72, color: '#3b82f6' },
  { name: 'Free', value: 28, color: '#334155' }
];

const memoryData = [
  { name: 'Used', value: 45, color: '#10b981' },
  { name: 'Free', value: 55, color: '#334155' }
];

const networkData = [
  { name: 'Inbound', value: 58, color: '#a855f7' },
  { name: 'Outbound', value: 30, color: '#ec4899' },
  { name: 'Idle', value: 12, color: '#334155' }
];
<\/script>

<template>
  <!-- Multi-Metric Dashboard: Simply set :showLabels="false" and size via parent CSS container -->
  <div class="kpi-grid">
    <div class="kpi-card">
      <h4>NVMe Storage</h4>
      <ThreeDDonutChart
        :data="storageData"
        :is3D="true"
        :showLabels="false"
        :isExpanded="true"
        centerValue="72%"
        centerLabel="Used"
      />
    </div>

    <div class="kpi-card">
      <h4>Active Memory</h4>
      <ThreeDDonutChart
        :data="memoryData"
        :is3D="true"
        :showLabels="false"
        :isExpanded="true"
        centerValue="45%"
        centerLabel="RAM"
      />
    </div>

    <div class="kpi-card">
      <h4>Bandwidth</h4>
      <ThreeDDonutChart
        :data="networkData"
        :is3D="true"
        :showLabels="false"
        :isExpanded="true"
        centerValue="880M"
        centerLabel="Traffic"
      />
    </div>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.kpi-card {
  background: var(--nano-bg-card);
  padding: 1.25rem;
  border-radius: 8px;
}
</style>`;
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
            <span class="status-badge" :class="{ 'auto-badge': autoRotate }">
              {{ autoRotate ? 'Auto-Rotate: Balanced' : `Angle: ${Math.round(normalizeAngle(rotationAngle))}°` }}
            </span>
          </div>
        </div>

        <div class="chart-container">
          <ThreeDDonutChart 
            v-model:hoveredItemId="hoveredItemId"
            v-model:selectedItemId="selectedItemId"
            :selectable="selectable"
            :data="computedChartData"
            :aspectRatio="selectedAspectRatio"
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
            :centerTextZ="centerTextZ"
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
            <button @click="removeItem(idx)" class="btn-remove" aria-label="Remove slice">
              <NanoIcon name="trash" :size="13" />
            </button>
          </div>
        </div>
        <div class="action-buttons">
          <button @click="addItem" class="demo-btn secondary-btn">
            <NanoIcon name="plus" :size="13" />
            <span>Add Country</span>
          </button>
          <button @click="setSingleDatapoint" class="demo-btn secondary-btn">
            <NanoIcon name="sparkles" :size="13" />
            <span>1 Data Point</span>
          </button>
          <button @click="resetToDefault" class="demo-btn secondary-btn">
            <NanoIcon name="rotate" :size="13" />
            <span>Reset Data</span>
          </button>
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

        <div class="slider-row" :style="!showCenterText || !is3D ? 'opacity: 0.35; pointer-events: none;' : ''">
          <span class="slider-label">Center Text Z (Depth): {{ centerTextZ === 0 ? 'Top (0.0)' : centerTextZ === 0.5 ? 'Center (0.5)' : centerTextZ === 1 ? 'Bottom (1.0)' : centerTextZ.toFixed(2) }}</span>
          <input type="range" v-model.number="centerTextZ" min="0.0" max="1.0" step="0.05" />
          <div class="nano-btn-group" style="width: 100%; margin-top: 4px;">
            <button 
              type="button" 
              class="nano-btn nano-btn-sm" 
              :class="centerTextZ === 0 ? 'nano-btn-primary' : 'nano-btn-secondary'" 
              style="flex: 1; text-align: center; justify-content: center; font-weight: 600;" 
              @click="centerTextZ = 0"
            >
              Top (0.0)
            </button>
            <button 
              type="button" 
              class="nano-btn nano-btn-sm" 
              :class="centerTextZ === 0.5 ? 'nano-btn-primary' : 'nano-btn-secondary'" 
              style="flex: 1; text-align: center; justify-content: center; font-weight: 600;" 
              @click="centerTextZ = 0.5"
            >
              Center (0.5)
            </button>
            <button 
              type="button" 
              class="nano-btn nano-btn-sm" 
              :class="centerTextZ === 1 ? 'nano-btn-primary' : 'nano-btn-secondary'" 
              style="flex: 1; text-align: center; justify-content: center; font-weight: 600;" 
              @click="centerTextZ = 1"
            >
              Bottom (1.0)
            </button>
          </div>
        </div>

        <div class="switch-row" style="margin-top: 10px;">
          <span class="switch-label">3D Render Mode</span>
          <NanoSwitch v-model="is3D" size="compact" />
        </div>

        <div class="switch-row" style="margin-top: 10px;">
          <span class="switch-label">Selectable (Click to lock)</span>
          <NanoSwitch v-model="selectable" size="compact" />
        </div>

        <div class="switch-row" style="margin-top: 10px;">
          <span class="switch-label">Isolate Hovered (window.fullOpacity)</span>
          <NanoSwitch v-model="isolateHovered" size="compact" />
        </div>

        <div class="slider-row" style="margin-top: 10px;">
          <span class="slider-label">Aspect Ratio: {{ selectedAspectRatio }}</span>
          <div class="nano-btn-group" style="width: 100%; margin-top: 4px;">
            <button 
              v-for="ratio in ['auto', '1/1', '16/9', '4/3', '560/320']" 
              :key="ratio"
              type="button" 
              class="nano-btn nano-btn-sm" 
              :class="selectedAspectRatio === ratio ? 'nano-btn-primary' : 'nano-btn-secondary'" 
              style="flex: 1; text-align: center; justify-content: center; font-weight: 600;" 
              @click="selectedAspectRatio = ratio"
            >
              {{ ratio }}
            </button>
          </div>
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

    <!-- Dedicated Feature Showcases (Outside & Below Main View) -->
    <div class="showcases-section">
      <div class="section-header-wrap">
        <h3>Feature Showcases & Isolated Use Cases</h3>
        <p class="section-subtitle">
          Dedicated views focusing on key architectural features with isolated options and copy-pasteable code examples.
        </p>
      </div>

      <div class="showcases-card">
        <!-- Docked Segmented Tabs Bar (Rule 9) -->
        <div class="showcases-header-bar">
          <div class="docked-tabs-group">
            <button
              type="button"
              class="docked-tab-btn"
              :class="{ active: showcaseTab === 'auto-rotate' }"
              @click="showcaseTab = 'auto-rotate'"
            >
              <NanoIcon name="rotate" :size="15" />
              <span>Auto-Rotate (Label Balancing)</span>
            </button>
            <button
              type="button"
              class="docked-tab-btn"
              :class="{ active: showcaseTab === 'threshold' }"
              @click="showcaseTab = 'threshold'"
            >
              <NanoIcon name="sparkles" :size="15" />
              <span>Threshold Aggregation ("Other")</span>
            </button>
            <button
              type="button"
              class="docked-tab-btn"
              :class="{ active: showcaseTab === 'compact' }"
              @click="showcaseTab = 'compact'"
            >
              <NanoIcon name="layout-grid" :size="15" />
              <span>Compact Dashboards (3 Charts)</span>
            </button>
          </div>
        </div>

        <!-- Tab 1: Auto-Rotate View -->
        <div v-if="showcaseTab === 'auto-rotate'" class="showcase-view-body">
          <div class="showcase-desc-bar">
            <div class="desc-text-group">
              <h4 class="showcase-title">Bilateral Label Balancing (autoRotate)</h4>
              <p class="showcase-text">
                When rendering highly skewed datasets (such as 1 dominant slice of 56% and 26 micro-slices), standard fixed top-rotation squashes all 26 labels onto one column. Enabling <code>autoRotate</code> computes the optimal angular centroid to balance callout lines symmetrically across left and right columns (14 vs 13).
              </p>
            </div>
            <div class="desc-badge-group">
              <span class="status-badge" :class="autoRotateDemo ? 'status-badge-success' : 'status-badge-warning'">
                {{ autoRotateDemo ? `Balanced: ${autoRotateBalanceStats.left} Left / ${autoRotateBalanceStats.right} Right` : `Unbalanced: ${autoRotateBalanceStats.left} Left / ${autoRotateBalanceStats.right} Right (${autoRotateBalanceStats.diff} delta)` }}
              </span>
            </div>
          </div>

          <div class="showcase-interactive-stage">
            <div class="showcase-chart-panel">
              <ThreeDDonutChart
                :data="longTailData"
                :is3D="true"
                :isExpanded="true"
                :showLabels="true"
                :autoRotate="autoRotateDemo"
                :rotationAngle="autoRotateDemoAngle"
                :animationDuration="300"
                :selectable="true"
                centerLabel="Label Balancing"
              />
            </div>

            <div class="showcase-controls-panel">
              <h4>Isolated Options</h4>
              <div class="switch-row" style="margin-top: 10px;">
                <span class="switch-label">autoRotate</span>
                <NanoSwitch v-model="autoRotateDemo" size="compact" />
              </div>

              <div class="slider-row" :style="autoRotateDemo ? 'opacity: 0.35; pointer-events: none;' : ''">
                <span class="slider-label">Manual Rotation: {{ Math.round(autoRotateDemoAngle) }}°</span>
                <input type="range" v-model.number="autoRotateDemoAngle" min="-180" max="180" step="1" :disabled="autoRotateDemo" />
              </div>

              <div class="showcase-info-box">
                <span v-if="autoRotateDemo">
                  ✨ <strong>Auto-Rotate active:</strong> Notice how the 26 micro-slices smoothly wrap across the top apex so exactly 14 labels stay on the left and 13 on the right.
                </span>
                <span v-else>
                  ⚠️ <strong>Auto-Rotate OFF:</strong> Notice how all 26 micro-slice labels get squashed onto the left column, leaving the right column with only 1 label.
                </span>
              </div>
            </div>
          </div>

          <NanoCodeBlock :code="autoRotateCode" lang="vue" title="Implementation Code" :default-wrap="true" />
        </div>

        <!-- Tab 2: Threshold Aggregation View -->
        <div v-else-if="showcaseTab === 'threshold'" class="showcase-view-body">
          <div class="showcase-desc-bar">
            <div class="desc-text-group">
              <h4 class="showcase-title">Long-Tail Consolidation (aggregateOthers & othersThreshold)</h4>
              <p class="showcase-text">
                Automatically consolidates micro-slices smaller than <code>othersThreshold</code> (e.g. 3%) into a single clean "Other" slice. This eliminates visual clutter on long-tail distributions while keeping total dataset values 100% accurate.
              </p>
            </div>
            <div class="desc-badge-group">
              <span class="status-badge" :class="thresholdDemoAggregate ? 'status-badge-info' : 'status-badge-neutral'">
                {{ thresholdDemoAggregate ? `Consolidated: ${thresholdConsolidatedCount} micro-slices into "${thresholdDemoLabel}"` : 'Ungrouped: all 27 slices rendered' }}
              </span>
            </div>
          </div>

          <div class="showcase-interactive-stage">
            <div class="showcase-chart-panel">
              <ThreeDDonutChart
                :data="longTailData"
                :is3D="true"
                :isExpanded="true"
                :showLabels="true"
                :autoRotate="thresholdDemoAutoRotate"
                :aggregateOthers="thresholdDemoAggregate"
                :othersThreshold="thresholdDemoThreshold"
                :othersLabel="thresholdDemoLabel"
                :othersColor="thresholdDemoColor"
                :animationDuration="300"
                :selectable="true"
                centerLabel="Consolidated"
              />
            </div>

            <div class="showcase-controls-panel">
              <h4>Isolated Options</h4>
              <div class="switch-row" style="margin-top: 10px;">
                <span class="switch-label">aggregateOthers</span>
                <NanoSwitch v-model="thresholdDemoAggregate" size="compact" />
              </div>

              <div class="switch-row" style="margin-top: 10px;">
                <span class="switch-label">autoRotate</span>
                <NanoSwitch v-model="thresholdDemoAutoRotate" size="compact" />
              </div>

              <div class="slider-row" :style="!thresholdDemoAggregate ? 'opacity: 0.35; pointer-events: none;' : ''">
                <span class="slider-label">othersThreshold: {{ (thresholdDemoThreshold * 100).toFixed(1) }}%</span>
                <input type="range" v-model.number="thresholdDemoThreshold" min="0.005" max="0.15" step="0.005" :disabled="!thresholdDemoAggregate" />
              </div>

              <div class="input-row" :style="!thresholdDemoAggregate ? 'opacity: 0.35; pointer-events: none;' : ''" style="display: flex; gap: 8px; margin-top: 10px;">
                <input type="text" v-model="thresholdDemoLabel" class="input-name" placeholder="othersLabel" :disabled="!thresholdDemoAggregate" />
                <input type="color" v-model="thresholdDemoColor" class="input-color" style="height: 32px;" :disabled="!thresholdDemoAggregate" />
              </div>

              <div class="showcase-info-box">
                <span v-if="thresholdDemoAggregate">
                  📊 <strong>Aggregation active:</strong> {{ thresholdConsolidatedCount }} micro-slices under {{ (thresholdDemoThreshold * 100).toFixed(1) }}% are bundled into one clean slice. Drag the slider to watch items dynamically join or exit!
                </span>
                <span v-else>
                  ⚠️ <strong>Aggregation OFF:</strong> All 26 micro-slices are rendered as individual tiny slices.
                </span>
              </div>
            </div>
          </div>

          <NanoCodeBlock :code="thresholdCode" lang="vue" title="Implementation Code" :default-wrap="true" />
        </div>

        <!-- Tab 3: Compact / Headless Dashboards (3 Charts Without Labels) -->
        <div v-else-if="showcaseTab === 'compact'" class="showcase-view-body">
          <div class="showcase-desc-bar">
            <div class="desc-text-group">
              <h4 class="showcase-title">Headless Metric Cards & Compact Grids (:showLabels="false")</h4>
              <p class="showcase-text">
                For dense telemetry cards, dashboard grids, or multi-metric rows, disable callout lines with <code>:showLabels="false"</code>. The 3D donut scales cleanly to fit its parent container without needing custom logic or flat layout hacks.
              </p>
            </div>
            <div class="desc-badge-group">
              <span class="status-badge status-badge-info">
                3 KPIs Side-by-Side
              </span>
            </div>
          </div>

          <div class="kpi-showcase-grid">
            <div class="kpi-showcase-card">
              <div class="kpi-card-header">
                <span class="kpi-card-title">NVMe Storage</span>
                <span class="status-badge status-badge-info">72%</span>
              </div>
              <div class="kpi-chart-box">
                <ThreeDDonutChart
                  :data="kpiStorageData"
                  :is3D="true"
                  :showLabels="false"
                  :isExpanded="true"
                  :animationDuration="300"
                  centerValue="72%"
                  centerLabel="Used"
                />
              </div>
            </div>

            <div class="kpi-showcase-card">
              <div class="kpi-card-header">
                <span class="kpi-card-title">Active Memory</span>
                <span class="status-badge status-badge-success">45%</span>
              </div>
              <div class="kpi-chart-box">
                <ThreeDDonutChart
                  :data="kpiMemoryData"
                  :is3D="true"
                  :showLabels="false"
                  :isExpanded="true"
                  :animationDuration="300"
                  centerValue="45%"
                  centerLabel="RAM"
                />
              </div>
            </div>

            <div class="kpi-showcase-card">
              <div class="kpi-card-header">
                <span class="kpi-card-title">Bandwidth Traffic</span>
                <span class="status-badge status-badge-warning">88%</span>
              </div>
              <div class="kpi-chart-box">
                <ThreeDDonutChart
                  :data="kpiNetworkData"
                  :is3D="true"
                  :showLabels="false"
                  :isExpanded="true"
                  :animationDuration="300"
                  centerValue="880M"
                  centerLabel="Traffic"
                />
              </div>
            </div>
          </div>

          <NanoCodeBlock :code="kpiCode" lang="vue" title="Implementation Code (:showLabels=false)" :default-wrap="true" />
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
centerTextZ: Number (default: 0.0) - Z position of center text in depth (0.0 = top plane, 0.5 = volumetric center, 1.0 = bottom plane)
animationDuration: Number (default: 350) - Duration of chart transitions in ms (0 for instant)
labelSize: String (default: 'md') - Preset size for callout labels ('sm', 'md', 'lg', 'xl')
labelFontSize: Number | String (default: undefined) - Custom font size in px for callout labels (e.g. 13 or '13px')
aspectRatio: String | Number (default: 'auto') - CSS aspect-ratio constraint for chart container (e.g. 'auto', '1/1', '16/9', '560/320')
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

.showcases-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.section-header-wrap h3 {
  margin: 0;
  color: var(--nano-text-main);
  border: none;
  padding: 0;
}

.section-subtitle {
  font-size: 0.85rem;
  color: var(--nano-text-muted);
  margin: 4px 0 0 0;
}

.showcases-card {
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-card);
  border-radius: var(--nano-radius-md, 8px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.showcases-header-bar {
  height: 46px;
  background: var(--nano-bg-muted);
  border-bottom: 1px solid var(--nano-border-subtle);
  display: flex;
  align-items: stretch;
  padding: 0;
  margin: 0;
  overflow-x: auto;
}

.docked-tabs-group {
  height: 100%;
  display: flex;
  align-items: stretch;
  gap: 0;
  padding: 0;
  margin: 0;
}

.docked-tab-btn {
  height: 100%;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  border: none;
  border-right: 1px solid var(--nano-border-subtle);
  border-radius: 0;
  background: transparent;
  color: var(--nano-text-secondary);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  outline: none !important;
  user-select: none;
  -webkit-user-select: none;
  transition: color var(--nano-transition-interactive), background var(--nano-transition-interactive);
}

.docked-tab-btn:hover:not(.active) {
  background: var(--nano-bg-hover, rgba(255, 255, 255, 0.05));
  color: var(--nano-text-main);
}

.docked-tab-btn.active {
  color: var(--nano-accent-primary);
  background: var(--nano-bg-card);
  box-shadow: inset 0 -2px 0 var(--nano-accent-primary);
}

.showcase-view-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.showcase-desc-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--nano-border-subtle);
  flex-wrap: wrap;
}

.desc-text-group {
  flex: 1;
  min-width: 280px;
}

.showcase-title {
  margin: 0 0 4px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--nano-text-main);
}

.showcase-text {
  margin: 0;
  font-size: 0.85rem;
  color: var(--nano-text-secondary);
  line-height: 1.5;
}

.showcase-text code {
  color: var(--nano-accent-primary);
  background: color-mix(in srgb, var(--nano-accent-primary) 12%, transparent);
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 0.8rem;
}

.desc-badge-group {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.showcase-interactive-stage {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 20px;
  align-items: start;
}

@media (max-width: 992px) {
  .showcase-interactive-stage {
    grid-template-columns: 1fr;
  }
}

.showcase-chart-panel {
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-subtle);
  border-radius: var(--nano-radius-md, 8px);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 380px;
  padding: 1rem;
  width: 100%;
}

.showcase-controls-panel {
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-subtle);
  border-radius: var(--nano-radius-md, 8px);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.showcase-controls-panel h4 {
  margin: 0 0 6px 0;
  color: var(--nano-text-main);
  font-size: 0.9rem;
}

.showcase-info-box {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: var(--nano-radius-sm, 6px);
  background: color-mix(in srgb, var(--nano-accent-primary) 8%, var(--nano-bg-card));
  border: 1px solid color-mix(in srgb, var(--nano-accent-primary) 20%, transparent);
  font-size: 0.8rem;
  color: var(--nano-text-secondary);
  line-height: 1.45;
}

.status-badge-success {
  background: color-mix(in srgb, #10b981 15%, transparent);
  color: #10b981;
  border-color: color-mix(in srgb, #10b981 30%, transparent);
}

.status-badge-warning {
  background: color-mix(in srgb, #f59e0b 15%, transparent);
  color: #f59e0b;
  border-color: color-mix(in srgb, #f59e0b 30%, transparent);
}

.status-badge-info {
  background: color-mix(in srgb, var(--nano-accent-primary) 15%, transparent);
  color: var(--nano-accent-primary);
  border-color: color-mix(in srgb, var(--nano-accent-primary) 30%, transparent);
}

.status-badge-neutral {
  background: var(--nano-bg-muted);
  color: var(--nano-text-muted);
  border-color: var(--nano-border-subtle);
}

.kpi-showcase-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  width: 100%;
}

@media (max-width: 860px) {
  .kpi-showcase-grid {
    grid-template-columns: 1fr;
  }
}

.kpi-showcase-card {
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-subtle);
  border-radius: var(--nano-radius-md, 8px);
  padding: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kpi-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kpi-card-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--nano-text-main);
}

.kpi-chart-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 220px;
  margin: 0 auto;
}

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

.status-badge.auto-badge {
  background: color-mix(in srgb, var(--nano-accent-primary) 15%, transparent);
  color: var(--nano-accent-primary);
  border-color: color-mix(in srgb, var(--nano-accent-primary) 30%, transparent);
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
  padding: 8px 14px;
  border-radius: var(--nano-radius-sm, 6px);
  cursor: pointer;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.825rem;
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
  padding: 6px;
  color: var(--nano-text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--nano-radius-sm, 6px);
  transition: color var(--nano-transition-interactive), background var(--nano-transition-interactive);
}

.btn-remove:hover {
  color: #ef4444;
  background: color-mix(in srgb, #ef4444 12%, transparent);
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
