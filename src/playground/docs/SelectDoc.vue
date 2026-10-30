<script setup>
import { ref } from 'vue';
import NanoSelect from '../../components/NanoSelect.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoModal from '../../components/NanoModal.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { t } from '../../locales.js';

const selectedSingle = ref('rust');
const selectedMulti = ref(['vue', 'rust', 'sqlite']);
const isMultiple = ref(false);
const searchable = ref(true);
const clearable = ref(true);
const disabled = ref(false);
const size = ref('md');
const status = ref('normal');
const modalOpen = ref(false);
const modalSelectedRegion = ref('eu-central-1');

const techOptions = [
  {
    value: 'vue',
    labelPl: 'Vue 3 + Vite (Reaktywne UI)',
    labelEn: 'Vue 3 + Vite (Reactive UI)',
    badge: 'FRONTEND',
    color: '#10b981',
    icon: 'sparkles',
    description: 'Zero-FOUC glassmorphic components & kinetic directives',
  },
  {
    value: 'rust',
    labelPl: 'Rust + Cargo (Silnik DSP / Audio)',
    labelEn: 'Rust + Cargo (DSP / Audio Engine)',
    badge: 'SYSTEMS',
    color: '#f97316',
    icon: 'rotate',
    description: 'Memory-safe SIMD synthesis & consensus pipelines',
  },
  {
    value: 'sqlite',
    labelPl: 'SQLite WAL (Wbudowana baza danych)',
    labelEn: 'SQLite WAL (Embedded Database)',
    badge: 'STORAGE',
    color: '#38bdf8',
    description: 'Strict schema tables with sub-millisecond reads',
  },
  {
    value: 'healpix',
    labelPl: 'Żółta Siatka Sferyczna HEALPix (Nside=2^k)',
    labelEn: 'Yellow HEALPix Spherical Grid (Nside=2^k)',
    badge: 'ASTRO',
    color: '#eab308',
    description: 'Equal-area hierarchical isolatitude pixelization',
  },
  {
    value: 'playwright',
    labelPl: 'Playwright E2E (Weryfikacja wizualna)',
    labelEn: 'Playwright E2E (Visual Verification)',
    badge: 'QA',
    color: '#a855f7',
    description: 'Automated headless Chromium assertions',
  },
  {
    value: 'legacy',
    labelPl: 'Przestarzały moduł Flash (Zablokowany)',
    labelEn: 'Deprecated Flash Module (Disabled)',
    badge: 'EOL',
    color: '#64748b',
    disabled: true,
  },
];

const regionOptions = [
  { value: 'eu-central-1', label: 'Frankfurt (eu-central-1)', badge: '9ms', color: '#10b981' },
  { value: 'eu-north-1', label: 'Stockholm (eu-north-1)', badge: '18ms', color: '#38bdf8' },
  { value: 'us-east-1', label: 'Virginia (us-east-1)', badge: '84ms', color: '#f59e0b' },
  { value: 'ap-northeast-1', label: 'Tokyo (ap-northeast-1)', badge: '210ms', color: '#a855f7' },
];

const usageSnippet = `<script setup>
import { ref } from 'vue';
import { NanoSelect } from '@gkucmierz/nano-ui';

const selectedStack = ref('rust');
const options = [
  { value: 'vue', label: 'Vue 3 + Vite', badge: 'UI', color: '#10b981' },
  { value: 'rust', label: 'Rust + Cargo', badge: 'DSP', color: '#f97316' },
  { value: 'sqlite', label: 'SQLite WAL', badge: 'DB', color: '#38bdf8' },
];
<\/script>

<template>
  <NanoSelect
    v-model="selectedStack"
    :options="options"
    :searchable="true"
    :clearable="true"
    size="md"
  />
</template>`;
</script>

<template>
  <div class="doc-page">
    <h2>{{ t('select.title') }}</h2>
    <p>{{ t('select.desc') }}</p>

    <!-- SECTION 1: Interactive Configurator -->
    <div class="demo-section">
      <h3>{{ t('select.sec1Title') }}</h3>
      <p class="demo-desc">{{ t('select.sec1Desc') }}</p>

      <div class="select-sandbox-grid">
        <div class="select-stage">
          <div style="width: 100%; max-width: 460px;">
            <NanoSelect
              v-if="isMultiple"
              v-model="selectedMulti"
              :options="techOptions"
              :multiple="true"
              :searchable="searchable"
              :clearable="clearable"
              :disabled="disabled"
              :size="size"
              :status="status"
            />
            <NanoSelect
              v-else
              v-model="selectedSingle"
              :options="techOptions"
              :multiple="false"
              :searchable="searchable"
              :clearable="clearable"
              :disabled="disabled"
              :size="size"
              :status="status"
            />
          </div>

          <div class="readout-pill">
            <code>v-model: {{ isMultiple ? JSON.stringify(selectedMulti) : JSON.stringify(selectedSingle) }}</code>
          </div>
        </div>

        <div class="select-controls">
          <label class="toggle-row">
            <NanoSwitch v-model="isMultiple" size="compact" />
            <span>{{ t('select.multiple') }}</span>
          </label>
          <label class="toggle-row">
            <NanoSwitch v-model="searchable" size="compact" />
            <span>{{ t('select.searchable') }}</span>
          </label>
          <label class="toggle-row">
            <NanoSwitch v-model="clearable" size="compact" />
            <span>{{ t('select.clearable') }}</span>
          </label>
          <label class="toggle-row">
            <NanoSwitch v-model="disabled" size="compact" />
            <span>{{ t('select.disabled') }}</span>
          </label>

          <div class="ctrl-group">
            <span class="ctrl-label">{{ t('select.size') }}</span>
            <div class="nano-btn-group">
              <button
                v-for="s in ['sm', 'md', 'lg']"
                :key="s"
                type="button"
                class="nano-btn nano-btn-secondary nano-btn-sm"
                :class="{ 'nano-btn-active': size === s }"
                @click="size = s"
              >
                {{ s }}
              </button>
            </div>
          </div>

          <div class="ctrl-group">
            <span class="ctrl-label">{{ t('select.status') }}</span>
            <div class="nano-btn-group">
              <button
                v-for="st in ['normal', 'error', 'success']"
                :key="st"
                type="button"
                class="nano-btn nano-btn-secondary nano-btn-sm"
                :class="{ 'nano-btn-active': status === st }"
                @click="status = st"
              >
                {{ st }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SECTION 2: Modal Escape Isolation Demo -->
    <div class="demo-section">
      <h3>{{ t('select.sec2Title') }}</h3>
      <p class="demo-desc">{{ t('select.sec2Desc') }}</p>

      <button type="button" class="nano-btn nano-btn-primary" @click="modalOpen = true">
        Open NanoModal with NanoSelect
      </button>

      <NanoModal
        v-model="modalOpen"
        title="Deployment Region Selector"
        width="440px"
      >
        <div style="padding: 8px 0 120px;">
          <p style="margin-top: 0; font-size: 0.85rem; color: var(--nano-text-muted);">
            Open the dropdown below and press <kbd class="nano-kbd">Esc</kbd> — notice how only the dropdown closes while the modal stays open!
          </p>
          <NanoSelect
            v-model="modalSelectedRegion"
            :options="regionOptions"
            :searchable="true"
            :clearable="true"
          />
        </div>
      </NanoModal>
    </div>

    <NanoCodeBlock :code="usageSnippet" lang="vue" title="Usage & API Example" />
  </div>
</template>

<style scoped>
.select-sandbox-grid {
  display: grid;
  grid-template-columns: 1fr 310px;
  gap: 20px;
  align-items: start;
}

@media (max-width: 860px) {
  .select-sandbox-grid {
    grid-template-columns: 1fr;
  }
}

.select-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 24px;
  min-height: 290px;
  padding: 36px 24px;
  border-radius: 10px;
  background: var(--nano-bg-app);
  border: 1px dashed var(--nano-border-card);
}

.readout-pill {
  padding: 6px 12px;
  border-radius: 6px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-card);
  font-size: 0.78rem;
}

.select-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-card);
}

.toggle-row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 0.84rem;
  cursor: pointer;
}

.ctrl-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.ctrl-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--nano-text-muted);
}
</style>
