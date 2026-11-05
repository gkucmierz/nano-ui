<script setup>
import { ref, computed, watch } from 'vue';
import NanoGlobe from '../../components/NanoGlobe.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoSelect from '../../components/NanoSelect.vue';
import NanoNumberStepper from '../../components/NanoNumberStepper.vue';
import NanoSlider from '../../components/NanoSlider.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { createDocTabs } from '../docSnippets.js';
import {
  TIMEZONE_ANOMALY_HOTSPOTS,
  buildSphericalVariableWidthLinePolygon,
} from '../../utils/globe-geometry.js';
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
// Strict anti-vertigo rule: at most 1 globe on the entire page can auto-rotate at a time
const activeRotatingGlobe = ref('ribbons');
const autoRotateTurnsPerSec = ref(0.04);
const autoRotate = computed({
  get: () => activeRotatingGlobe.value === 'studio',
  set: (val) => {
    activeRotatingGlobe.value = val ? 'studio' : 'none';
  },
});
function toggleGlobeOrbit(globeId) {
  activeRotatingGlobe.value = activeRotatingGlobe.value === globeId ? 'none' : globeId;
}
const terminatorMode = ref('gradient');
const subsolarLon = ref(-25.0);
const subsolarLat = ref(18.5);
const showTimezones = ref(true);
const timezoneMode = ref('complicated');
const timezoneMorph = ref(1);
const activeTimezoneOffset = ref(1);

function selectTimezoneMode(mode) {
  timezoneMode.value = mode;
  timezoneMorph.value = mode === 'complicated' ? 1 : 0;
}

function jumpToAnomaly(anom) {
  showTimezones.value = true;
  timezoneMode.value = 'complicated';
  timezoneMorph.value = 1;
  activeTimezoneOffset.value = anom.offsetHours;
  center.value = [anom.lon, anom.lat];
}

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

// Example Gallery 1: Variable-Width Spherical Lines / Ribbons rendered natively via :polygons
const variableWidthRibbonPolygons = [
  buildSphericalVariableWidthLinePolygon(
    [
      [-80.2, 25.8, 0.5],
      [-72.0, 35.0, 2.2],
      [-50.0, 43.0, 3.6],
      [-22.0, 53.0, 2.6],
      [6.0, 63.0, 0.9],
    ],
    {
      id: 'gulf-stream-ribbon',
      name: 'Prąd Zatokowy (Gulf Stream · zmienna szerokość 0.5° → 3.6° → 0.9°)',
      label: 'GULF STREAM',
      fill: 'rgba(0, 242, 254, 0.48)',
      hoverFill: 'rgba(0, 242, 254, 0.72)',
      stroke: '#00f2fe',
      strokeWidth: 1.4,
    }
  ),
  buildSphericalVariableWidthLinePolygon(
    [
      [-15.0, 18.0],
      [-42.0, 14.0],
      [-68.0, 12.0],
      [-88.0, 16.0],
    ],
    {
      id: 'trade-wind-jet',
      name: 'Pasat Północnoatlantycki (profil soczewkowy Taper)',
      label: 'TRADE JET',
      profile: 'taper',
      startWidthDeg: 0.4,
      midWidthDeg: 2.8,
      endWidthDeg: 0.4,
      fill: 'rgba(244, 114, 182, 0.46)',
      hoverFill: 'rgba(244, 114, 182, 0.72)',
      stroke: '#f472b6',
      strokeWidth: 1.3,
    }
  ),
  buildSphericalVariableWidthLinePolygon(
    [
      [-45.0, -6.0],
      [-15.0, -2.0],
      [12.0, -4.0],
      [38.0, -8.0],
    ],
    {
      id: 'kelvin-wave-pulse',
      name: 'Równikowa Fala Kelvina (profil falowy Pulse)',
      label: 'KELVIN WAVE',
      profile: 'pulse',
      midWidthDeg: 2.4,
      fill: 'rgba(250, 204, 21, 0.42)',
      hoverFill: 'rgba(250, 204, 21, 0.68)',
      stroke: '#facc15',
      strokeWidth: 1.2,
    }
  ),
];

const galleryHealpixSelected = ref([42, 43, 58, 74]);
const galleryChoroplethColors = {
  POL: '#10b981',
  DEU: '#0ea5e9',
  FRA: '#6366f1',
  ESP: '#f59e0b',
  ITA: '#ec4899',
  GBR: '#14b8a6',
  NOR: '#38bdf8',
  SWE: '#8b5cf6',
  UKR: '#eab308',
};
const galleryChoroplethPolygons = [
  buildSphericalVariableWidthLinePolygon(
    [
      [-9.1, 38.7, 0.6],
      [2.3, 48.8, 1.8],
      [13.4, 52.5, 2.4],
      [21.0, 52.2, 1.5],
      [24.9, 60.2, 0.7],
    ],
    {
      id: 'ten-t-corridor',
      name: 'Korytarz Transportowy TEN-T (Lizbona → Paryż → Berlin → Warszawa → Helsinki)',
      label: 'TEN-T CORRIDOR',
      fill: 'rgba(234, 88, 12, 0.42)',
      hoverFill: 'rgba(234, 88, 12, 0.68)',
      stroke: '#ea580c',
      strokeWidth: 1.4,
    }
  ),
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
            v-model:show-timezones="showTimezones"
            v-model:timezone-mode="timezoneMode"
            v-model:active-timezone-offset="activeTimezoneOffset"
            :timezone-morph="timezoneMorph"
            :size="420"
            :preset="preset"
            :show-healpix-labels="showHealpixLabels"
            :show-atmosphere="showAtmosphere"
            :atmosphere-mode="atmosphereMode"
            :auto-rotate-turns-per-sec="autoRotate ? autoRotateTurnsPerSec : 0"
            :subsolar-point="[subsolarLon, subsolarLat]"
            :solar-terminator="terminatorMode !== 'off'"
            :terminator-mode="terminatorMode === 'off' ? 'gradient' : terminatorMode"
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

          <!-- Spherical Vector-Spine Timezones: Clear (Solar 15°) vs Complicated (Political IANA) -->
          <div class="ctrl-card">
            <div class="sub-ctrl-row">
              <label class="toggle-row">
                <NanoSwitch v-model="showTimezones" size="compact" color="cyan" />
                <span>Strefy Czasowe (Wektory S²: Clear vs Complicated)</span>
              </label>
            </div>

            <div class="sub-ctrl-row">
              <div class="nano-btn-group">
                <button
                  type="button"
                  class="nano-btn nano-btn-secondary nano-btn-sm"
                  :class="{ 'nano-btn-active': timezoneMorph < 0.5 }"
                  :disabled="!showTimezones"
                  @click="selectTimezoneMode('clear')"
                >
                  📐 Clear (Słoneczne 15°)
                </button>
                <button
                  type="button"
                  class="nano-btn nano-btn-secondary nano-btn-sm"
                  :class="{ 'nano-btn-active': timezoneMorph >= 0.5 }"
                  :disabled="!showTimezones"
                  @click="selectTimezoneMode('complicated')"
                >
                  🧩 Complicated (IANA)
                </button>
              </div>
              <NanoNumberStepper
                v-model="activeTimezoneOffset"
                :min="-11"
                :max="12"
                :step="1"
                variant="split"
                align="center"
                size="sm"
                width="98px"
                :disabled="!showTimezones"
              />
            </div>

            <div class="slider-with-badge">
              <NanoSlider
                v-model="timezoneMorph"
                :min="0"
                :max="1"
                :step="0.02"
                :show-ticks="false"
                size="sm"
                :disabled="!showTimezones"
              />
              <span class="mono-badge">
                SLERP τ={{ Number(timezoneMorph).toFixed(2) }} (UTC{{ activeTimezoneOffset >= 0 ? '+' : '' }}{{ activeTimezoneOffset }})
              </span>
            </div>

            <div v-if="showTimezones" class="anomaly-pills-row">
              <button
                v-for="anom in TIMEZONE_ANOMALY_HOTSPOTS"
                :key="anom.id"
                type="button"
                class="nano-btn nano-btn-secondary nano-btn-sm anomaly-pill-btn"
                :class="{ 'nano-btn-active': activeTimezoneOffset === anom.offsetHours }"
                @click="jumpToAnomaly(anom)"
              >
                🎯 {{ anom.titlePl.split(' (')[0] }} (UTC{{ anom.offsetHours >= 0 ? '+' : '' }}{{ anom.offsetHours }})
              </button>
            </div>
          </div>

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
            <div><strong>Aktywna Orbits (Max 1):</strong> {{ activeRotatingGlobe }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Showcase Gallery: 3 Specialized Globes with Strict Max-1 Auto-Rotate Guard -->
    <div class="demo-section">
      <div class="gallery-header-row">
        <div>
          <h3>Galeria Zastosowań Sferycznych (Linie o Zmiennej Grubości, HEALPix &amp; Choropleth)</h3>
          <p class="demo-desc">
            Generyczny silnik <code>:polygons</code> i <code>:layers</code> pozwala renderować nie tylko strefy czasowe, ale też
            <strong>wstęgi sferyczne o zmiennej grubości</strong> (prądy oceaniczne, korytarze jet-stream, fale Kelvina) z wygładzaniem
            krzywymi Beziera <code>Q</code> oraz płynnym wyłanianiem etykiet (<code>1.5%</code> obrotu <code>ease-in-out</code>).
            <strong>Zasada Zero-Oczopląsu:</strong> w danym momencie może obracać się maksymalnie <strong>1 globus</strong>!
          </p>
        </div>
        <div class="nano-btn-group">
          <button
            v-for="gOpt in [
              { id: 'none', label: '⏸ Wszystkie Stop' },
              { id: 'studio', label: '🪐 #1 Studio' },
              { id: 'ribbons', label: '🌊 #2 Wstęgi' },
              { id: 'healpix', label: '❖ #3 HEALPix' },
              { id: 'choropleth', label: '🗺️ #4 Choropleth' },
            ]"
            :key="gOpt.id"
            type="button"
            class="nano-btn nano-btn-secondary nano-btn-sm"
            :class="{ 'nano-btn-active': activeRotatingGlobe === gOpt.id }"
            @click="activeRotatingGlobe = gOpt.id"
          >
            {{ gOpt.label }}
          </button>
        </div>
      </div>

      <div class="globe-gallery-grid">
        <!-- Card 1: Variable-Width Spherical Lines / Ribbons -->
        <div class="globe-gallery-card">
          <div class="gallery-card-top">
            <div>
              <h4>🌊 Linie o Zmiennej Grubości (:polygons)</h4>
              <p>Wstęgi sferyczne S²: Gulf Stream (0.5° → 3.6° → 0.9°), Pasat (Taper) i Fala Kelvina (Pulse).</p>
            </div>
            <button
              type="button"
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': activeRotatingGlobe === 'ribbons' }"
              @click="toggleGlobeOrbit('ribbons')"
            >
              {{ activeRotatingGlobe === 'ribbons' ? '⏸ Kręci się (1/1)' : '🪐 Obracaj ten' }}
            </button>
          </div>
          <div class="gallery-globe-wrap">
            <NanoGlobe
              :size="300"
              :center="[-38, 24]"
              preset="nano-dark"
              :show-graticule="true"
              :show-atmosphere="true"
              atmosphere-mode="gradient"
              :polygons="variableWidthRibbonPolygons"
              :auto-rotate-turns-per-sec="activeRotatingGlobe === 'ribbons' ? 0.035 : 0"
            />
          </div>
        </div>

        <!-- Card 2: Astrophysical Equal-Area HEALPix Nside=4 -->
        <div class="globe-gallery-card">
          <div class="gallery-card-top">
            <div>
              <h4>❖ Siatka Astrofizyczna HEALPix (Nside=4)</h4>
              <p>192 komórki o równej powierzchni z płynnym wyłanianiem indeksów (1.5% obrotu ease-in-out).</p>
            </div>
            <button
              type="button"
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': activeRotatingGlobe === 'healpix' }"
              @click="toggleGlobeOrbit('healpix')"
            >
              {{ activeRotatingGlobe === 'healpix' ? '⏸ Kręci się (1/1)' : '🪐 Obracaj ten' }}
            </button>
          </div>
          <div class="gallery-globe-wrap">
            <NanoGlobe
              v-model:selected-healpix-pixels="galleryHealpixSelected"
              :size="300"
              :center="[18, 28]"
              preset="cyber-amber"
              :show-graticule="false"
              :show-healpix="true"
              :healpix-order="2"
              :show-healpix-labels="true"
              :show-atmosphere="true"
              atmosphere-mode="gradient"
              :auto-rotate-turns-per-sec="activeRotatingGlobe === 'healpix' ? 0.035 : 0"
            />
          </div>
        </div>

        <!-- Card 3: Geopolitical Choropleth & Corridor Ribbon -->
        <div class="globe-gallery-card">
          <div class="gallery-card-top">
            <div>
              <h4>🗺️ Choropleth + Korytarz TEN-T (Nano Light)</h4>
              <p>Indywidualne barwienie państw (countryColors) + wstęga korytarza Lizbona → Helsinki.</p>
            </div>
            <button
              type="button"
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': activeRotatingGlobe === 'choropleth' }"
              @click="toggleGlobeOrbit('choropleth')"
            >
              {{ activeRotatingGlobe === 'choropleth' ? '⏸ Kręci się (1/1)' : '🪐 Obracaj ten' }}
            </button>
          </div>
          <div class="gallery-globe-wrap">
            <NanoGlobe
              :size="300"
              :center="[12, 49]"
              preset="nano-light"
              :country-colors="galleryChoroplethColors"
              :selected-countries="['POL']"
              :polygons="galleryChoroplethPolygons"
              :show-graticule="true"
              :show-atmosphere="true"
              atmosphere-mode="gradient"
              :auto-rotate-turns-per-sec="activeRotatingGlobe === 'choropleth' ? 0.035 : 0"
            />
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

.anomaly-pills-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 4px;
}

.anomaly-pill-btn {
  width: 100%;
  justify-content: flex-start;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.gallery-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.globe-gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
  gap: 16px;
}

.globe-gallery-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-card);
}

.gallery-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.gallery-card-top h4 {
  margin: 0 0 4px;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--nano-text-main);
}

.gallery-card-top p {
  margin: 0;
  font-size: 0.76rem;
  line-height: 1.4;
  color: var(--nano-text-muted);
}

.gallery-globe-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 0 4px;
}
</style>
