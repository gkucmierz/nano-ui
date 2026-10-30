<script setup>
import { ref } from 'vue';
import NanoGlobe from '../../components/NanoGlobe.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoSelect from '../../components/NanoSelect.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { t } from '../../locales.js';

const center = ref([19.0, 52.0]);
const selectedCountries = ref(['POL', 'USA', 'JPN']);
const selectedHealpixPixels = ref([4, 19]);
const preset = ref('teal-coral');
const showGraticule = ref(true);
const showHealpix = ref(true);
const showHealpixLabels = ref(false);
const healpixOrder = ref(1);
const showAtmosphere = ref(true);
const autoRotate = ref(false);

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

const usageSnippet = `<script setup>
import { ref } from 'vue';
import { NanoGlobe } from '@gkucmierz/nano-ui';

const selectedCountries = ref(['POL', 'USA']);
const selectedPixels = ref([4]);
<\/script>

<template>
  <NanoGlobe
    v-model:selected-countries="selectedCountries"
    v-model:selected-healpix-pixels="selectedPixels"
    :size="440"
    preset="teal-coral"
    :show-graticule="true"
    :show-healpix="true"
    :healpix-order="1"
    :show-controls="true"
  />
</template>`;
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
            :auto-rotate-speed="autoRotate ? 14 : 0"
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
            <span class="ctrl-label">{{ t('globe.healpixOrder') }} ({{ healpixOrder }} → Nside={{ 1 << healpixOrder }}, {{ 12 * (1 << (2 * healpixOrder)) }} cells)</span>
            <div class="nano-btn-group">
              <button
                v-for="ord in [0, 1, 2, 3]"
                :key="ord"
                type="button"
                class="nano-btn nano-btn-secondary nano-btn-sm"
                :class="{ 'nano-btn-active': healpixOrder === ord }"
                @click="healpixOrder = ord"
              >
                k={{ ord }} ({{ 12 * (1 << (2 * ord)) }})
              </button>
            </div>
          </div>

          <label class="toggle-row">
            <NanoSwitch v-model="showGraticule" size="compact" />
            <span>{{ t('globe.graticule') }}</span>
          </label>

          <label class="toggle-row">
            <NanoSwitch v-model="showHealpix" size="compact" color="amber" />
            <span>{{ t('globe.healpix') }}</span>
          </label>

          <label class="toggle-row">
            <NanoSwitch v-model="showHealpixLabels" size="compact" :disabled="!showHealpix" />
            <span>{{ t('globe.healpixLabels') }}</span>
          </label>

          <label class="toggle-row">
            <NanoSwitch v-model="showAtmosphere" size="compact" />
            <span>{{ t('globe.atmosphere') }}</span>
          </label>

          <label class="toggle-row">
            <NanoSwitch v-model="autoRotate" size="compact" />
            <span>{{ t('globe.autoRotate') }}</span>
          </label>

          <div class="telemetry-box">
            <div><strong>Center:</strong> {{ center[0].toFixed(1) }}°, {{ center[1].toFixed(1) }}°</div>
            <div><strong>Countries:</strong> {{ selectedCountries.join(', ') || 'None' }}</div>
            <div><strong>HEALPix cells:</strong> {{ selectedHealpixPixels.join(', ') || 'None' }}</div>
          </div>
        </div>
      </div>
    </div>

    <NanoCodeBlock :code="usageSnippet" lang="vue" title="Usage & API Example" />
  </div>
</template>

<style scoped>
.globe-studio-grid {
  display: grid;
  grid-template-columns: 1fr 330px;
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
  gap: 12px;
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
