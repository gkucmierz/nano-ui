<script setup>
import { ref, computed, watch } from 'vue';
import NanoGlobe from '../../components/NanoGlobe.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoSelect from '../../components/NanoSelect.vue';
import NanoNumberStepper from '../../components/NanoNumberStepper.vue';
import NanoSlider from '../../components/NanoSlider.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { createDocTabs } from '../docSnippets.js';
import { t } from '../../locales.js';

const center = ref([19.0, 52.0]);
const selectedCountries = ref(['POL', 'USA', 'JPN']);
const preset = ref('teal-coral');
const showGraticule = ref(true);
const showHealpix = ref(true);
const showHealpixLabels = ref(false);
const healpixOrder = ref(1);
const highlightHealpixCell = ref(true);
const activeHealpixIndex = ref(19);
const showAtmosphere = ref(true);
const atmosphereMode = ref('gradient');
const autoRotate = ref(false);
const autoRotateTurnsPerSec = ref(0.05);
const terminatorMode = ref('gradient');
const subsolarLon = ref(-25.0);
const subsolarLat = ref(18.5);

const healpixCellCount = computed(() => 12 * (1 << (2 * healpixOrder.value)));
const maxHealpixIndex = computed(() => Math.max(0, healpixCellCount.value - 1));

watch(maxHealpixIndex, (maxIdx) => {
  if (activeHealpixIndex.value > maxIdx) {
    activeHealpixIndex.value = maxIdx;
  }
});

const selectedHealpixPixels = computed({
  get: () => (highlightHealpixCell.value ? [activeHealpixIndex.value] : []),
  set: (nextList) => {
    if (Array.isArray(nextList) && nextList.length > 0) {
      const lastClicked = Number(nextList[nextList.length - 1]);
      if (Number.isFinite(lastClicked)) {
        activeHealpixIndex.value = Math.max(0, Math.min(maxHealpixIndex.value, lastClicked));
      }
      highlightHealpixCell.value = true;
    } else {
      highlightHealpixCell.value = false;
    }
  },
});

const terminatorModeOptions = [
  { value: 'gradient', label: 'Gradient (Lambert cos θ)' },
  { value: 'line', label: 'Thin Line (90° Horizon)' },
  { value: 'both', label: 'Gradient + Line (Both)' },
  { value: 'off', label: 'Off' },
];

const presetOptions = [
  { value: 'teal-coral', label: 'Teal & Coral (Cartographic)', badge: 'CLASSIC' },
  { value: 'nano-dark', label: 'Nano Dark (Emerald / Slate)', badge: 'DARK' },
  { value: 'nano-light', label: 'Nano Light (Sky / Orange)', badge: 'LIGHT' },
  { value: 'cyber-amber', label: 'Cyber Amber (Obsidian / Gold)', badge: 'NEON' },
];

const demoArcs = [
  { from: [21.01, 52.23], to: [-74.0, 40.71], dashed: true, width: 1.8 },
  { from: [21.01, 52.23], to: [139.69, 35.68], dashed: false, width: 1.8 },
];

const demoMarkers = [
  { id: 'waw', lon: 21.01, lat: 52.23, type: 'target', label: 'WAW' },
  { id: 'nyc', lon: -74.0, lat: 40.71, type: 'dot', label: 'NYC' },
  { id: 'tyo', lon: 139.69, lat: 35.68, type: 'dot', label: 'TYO' },
];

const codeTabs = createDocTabs({
  componentName: 'NanoGlobe',
  stateRef: 'selectedCountries',
  initialValue: "['POL', 'USA']",
  templateAttrs: [
    'v-model:selected-countries="selectedCountries"',
    ':size="440"',
    'preset="teal-coral"',
    ':show-graticule="true"',
    ':show-healpix="true"',
    ':healpix-order="1"',
    ':show-controls="true"',
  ],
  headlessImports: [
    { symbols: ['generateHealpixGrid', 'projectOrthographic'], path: 'dist/utils/healpix.js' },
  ],
  apiSections: [
    {
      title: 'Props',
      items: [
        'size: Number (default: 440) - Canvas/SVG width and height in px',
        'center: Array [lon, lat] (default: [15, 38]) - Initial orthographic camera center (supports v-model:center)',
        'selectedCountries: Array<String> (default: ["POL", "USA", "JPN"]) - Selected ISO-3 country codes (v-model:selectedCountries)',
        'selectedHealpixPixels: Array<Number> (default: []) - Highlighted HEALPix RING pixel indices (v-model:selectedHealpixPixels)',
        'preset: String (default: "teal-coral") - Visual color preset ("teal-coral" | "nano-dark" | "nano-light" | "cyber-amber")',
        'showGraticule: Boolean (default: true) - Render 15-degree meridian/parallel graticule (v-model:showGraticule)',
        'showHealpix: Boolean (default: true) - Render equal-area HEALPix spherical tessellation (v-model:showHealpix)',
        'healpixOrder: Number (default: 1) - HEALPix order k in [0..3], Npix = 12 * 4^k (v-model:healpixOrder)',
        'showHealpixLabels: Boolean (default: false) - Show RING pixel numbers inside visible cells',
        'showAtmosphere: Boolean | "ring" | "gradient" (default: true) - Render outer atmospheric rim glow',
        'atmosphereMode: String (default: "ring") - Atmosphere halo style ("ring" | "gradient" with 100% opacity at Earth surface fading to 0% outward)',
        'showControls: Boolean (default: true) - Render floating HUD controls',
        'autoRotateSpeed: Number (default: 0) - Auto-rotation angular velocity in deg/sec',
        'autoRotateTurnsPerSec: Number (default: undefined) - Auto-rotation angular velocity in full turns/sec (1 turn/s = 360 deg/s)',
        'solarTerminator: Boolean | "gradient" | "line" | "both" (default: false) - Physical Lambert cosine day/night terminator',
        'arcs: Array<{ from: [lon,lat], to: [lon,lat], dashed?: Boolean, width?: Number }> - Great-circle arcs',
        'markers: Array<{ id, lon, lat, type?: "dot"|"target", label?: String }> - Surface markers',
      ],
    },
    {
      title: 'Events',
      items: [
        '@update:center: (coords: [lon, lat]) => void - Emitted while rotating the globe',
        '@update:selectedCountries: (codes: string[]) => void - Emitted when countries are toggled',
        '@update:selectedHealpixPixels: (pixels: number[]) => void - Emitted when HEALPix cells are clicked',
        '@country-click: ({ id, name }) => void - Emitted when a country polygon is clicked',
        '@healpix-click: ({ ipix, nside, order }) => void - Emitted when a HEALPix cell is clicked',
      ],
    },
    {
      title: 'Exposed Methods & State (via template ref)',
      items: [
        'rotateTo(lon, lat): void - Smoothly orient globe camera to target coordinates',
        'resetView(): void - Reset camera back to props.center',
        'toggleGraticule(val?: boolean): void - Toggle meridian/parallel graticule',
        'toggleHealpix(val?: boolean): void - Toggle HEALPix tessellation layer',
        'setHealpixOrder(k: number): void - Set HEALPix order k in [0..3]',
        'rotLon / rotLat / isDragging: Ref - Reactive camera orientation and drag state',
      ],
    },
  ],
});
</script>

<template>
  <div class="doc-page">
    <h2>{{ t('globe.title') }}</h2>
    <p>{{ t('globe.desc') }}</p>

    <div class="demo-section">
      <h3>{{ t('globe.sec1Title') }}</h3>
      <p class="demo-desc">{{ t('globe.sec1Desc') }}</p>

      <div class="globe-studio-grid">
        <div class="globe-stage">
          <NanoGlobe
            v-model:center="center"
            v-model:selected-countries="selectedCountries"
            v-model:selected-healpix-pixels="selectedHealpixPixels"
            v-model:show-graticule="showGraticule"
            v-model:show-healpix="showHealpix"
            v-model:healpix-order="healpixOrder"
            :size="420"
            :preset="preset"
            :show-healpix-labels="showHealpixLabels"
            :show-atmosphere="showAtmosphere"
            :atmosphere-mode="atmosphereMode"
            :auto-rotate-turns-per-sec="autoRotate ? autoRotateTurnsPerSec : 0"
            :subsolar-point="[subsolarLon, subsolarLat]"
            :solar-terminator="terminatorMode !== 'off'"
            :terminator-mode="terminatorMode === 'off' ? 'gradient' : terminatorMode"
            :arcs="demoArcs"
            :markers="demoMarkers"
            :show-controls="true"
          />
        </div>

        <div class="globe-controls">
          <div class="ctrl-group">
            <span class="ctrl-label">{{ t('globe.preset') }}</span>
            <NanoSelect
              v-model="preset"
              :options="presetOptions"
              size="sm"
              :searchable="false"
            />
          </div>

          <div class="ctrl-group">
            <span class="ctrl-label">Solar Terminator (Lambert cos θ)</span>
            <div class="nano-btn-group">
              <button
                v-for="opt in terminatorModeOptions"
                :key="opt.value"
                type="button"
                class="nano-btn nano-btn-secondary nano-btn-sm"
                :class="{ 'nano-btn-active': terminatorMode === opt.value }"
                @click="terminatorMode = opt.value"
              >
                {{ opt.value === 'gradient' ? 'Gradient' : opt.value === 'line' ? 'Line' : opt.value === 'both' ? 'Both' : 'Off' }}
              </button>
            </div>
          </div>

          <label class="toggle-row">
            <NanoSwitch v-model="showGraticule" size="compact" />
            <span>{{ t('globe.graticule') }}</span>
          </label>

          <!-- Grouped HEALPix Equal-Area Controls -->
          <div class="ctrl-card">
            <label class="toggle-row">
              <NanoSwitch v-model="showHealpix" size="compact" color="amber" />
              <span>{{ t('globe.healpix') }}</span>
            </label>

            <div class="sub-ctrl-row">
              <span class="sub-ctrl-label">
                {{ t('globe.healpixOrder') }}
                <small>k={{ healpixOrder }} → Nside={{ 1 << healpixOrder }} ({{ healpixCellCount }})</small>
              </span>
              <NanoNumberStepper
                v-model="healpixOrder"
                :min="0"
                :max="3"
                :step="1"
                variant="split"
                align="center"
                size="sm"
                width="98px"
                :disabled="!showHealpix"
              />
            </div>

            <label class="toggle-row">
              <NanoSwitch v-model="showHealpixLabels" size="compact" :disabled="!showHealpix" />
              <span>{{ t('globe.healpixLabels') }}</span>
            </label>

            <div class="sub-ctrl-stack">
              <label class="toggle-row">
                <NanoSwitch
                  v-model="highlightHealpixCell"
                  size="compact"
                  color="amber"
                  :disabled="!showHealpix"
                />
                <span>
                  {{ t('globe.healpixHighlight') }}
                  <strong v-if="highlightHealpixCell">#{{ activeHealpixIndex }}</strong>
                </span>
              </label>
              <div class="slider-with-badge">
                <NanoSlider
                  v-model="activeHealpixIndex"
                  :min="0"
                  :max="maxHealpixIndex"
                  :step="1"
                  :show-ticks="false"
                  size="sm"
                  :disabled="!showHealpix || !highlightHealpixCell"
                />
                <span class="mono-badge">{{ activeHealpixIndex }} / {{ maxHealpixIndex }}</span>
              </div>
            </div>
          </div>

          <!-- Grouped Atmosphere Halo Controls (Ring vs 100% -> 0% Radial Gradient) -->
          <div class="ctrl-card">
            <div class="sub-ctrl-row">
              <label class="toggle-row">
                <NanoSwitch v-model="showAtmosphere" size="compact" />
                <span>{{ t('globe.atmosphere') }}</span>
              </label>
              <div class="nano-btn-group">
                <button
                  type="button"
                  class="nano-btn nano-btn-secondary nano-btn-sm"
                  :class="{ 'nano-btn-active': atmosphereMode === 'gradient' }"
                  :disabled="!showAtmosphere"
                  @click="atmosphereMode = 'gradient'"
                >
                  {{ t('globe.atmosphereGradient') }}
                </button>
                <button
                  type="button"
                  class="nano-btn nano-btn-secondary nano-btn-sm"
                  :class="{ 'nano-btn-active': atmosphereMode === 'ring' }"
                  :disabled="!showAtmosphere"
                  @click="atmosphereMode = 'ring'"
                >
                  {{ t('globe.atmosphereRing') }}
                </button>
              </div>
            </div>
          </div>

          <!-- Grouped Auto-Rotation Controls (turns/s) -->
          <div class="ctrl-card">
            <div class="sub-ctrl-row">
              <label class="toggle-row">
                <NanoSwitch v-model="autoRotate" size="compact" />
                <span>{{ t('globe.autoRotate') }}</span>
              </label>
              <NanoNumberStepper
                v-model="autoRotateTurnsPerSec"
                :min="0.01"
                :max="1"
                :step="0.01"
                :precision="2"
                variant="split"
                align="center"
                size="sm"
                width="112px"
                :disabled="!autoRotate"
              />
            </div>
            <div class="slider-with-badge">
              <NanoSlider
                v-model="autoRotateTurnsPerSec"
                :min="0.01"
                :max="1"
                :step="0.01"
                :show-ticks="false"
                size="sm"
                :disabled="!autoRotate"
              />
              <span class="mono-badge">
                {{ Number(autoRotateTurnsPerSec).toFixed(2) }} turns/s ({{ Math.round(autoRotateTurnsPerSec * 360) }}°/s)
              </span>
            </div>
          </div>

          <div class="telemetry-box">
            <div><strong>Center:</strong> {{ center[0].toFixed(1) }}°, {{ center[1].toFixed(1) }}°</div>
            <div><strong>Countries:</strong> {{ selectedCountries.join(', ') || 'None' }}</div>
            <div><strong>HEALPix cells:</strong> {{ selectedHealpixPixels.join(', ') || 'None' }}</div>
          </div>
        </div>
      </div>
    </div>

    <NanoCodeBlock :tabs="codeTabs" />
  </div>
</template>

<style scoped>
.globe-studio-grid {
  display: grid;
  grid-template-columns: 1fr 370px;
  gap: 20px;
  align-items: center;
}

@media (max-width: 900px) {
  .globe-studio-grid {
    grid-template-columns: 1fr;
  }
}

.globe-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  border-radius: 12px;
  background: var(--nano-bg-app);
  border: 1px dashed var(--nano-border-card);
}

.globe-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: 8px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-card);
}

.ctrl-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ctrl-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-card);
}

.sub-ctrl-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.sub-ctrl-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sub-ctrl-label {
  display: flex;
  flex-direction: column;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--nano-text-main);
  line-height: 1.25;
}

.sub-ctrl-label small {
  font-family: var(--nano-font-mono, monospace);
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--nano-text-muted);
}

.slider-with-badge {
  display: flex;
  align-items: center;
  gap: 10px;
}

.slider-with-badge :deep(.nano-slider) {
  flex: 1;
}

.mono-badge {
  font-family: var(--nano-font-mono, monospace);
  font-size: 0.7rem;
  color: var(--nano-text-muted);
  white-space: nowrap;
  min-width: 72px;
  text-align: right;
}

.ctrl-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--nano-text-muted);
}

.toggle-row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 0.84rem;
  cursor: pointer;
}

.telemetry-box {
  margin-top: 6px;
  padding: 10px;
  border-radius: 6px;
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-card);
  font-family: var(--nano-font-mono, monospace);
  font-size: 0.74rem;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
