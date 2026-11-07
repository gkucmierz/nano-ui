<script setup>
import { ref } from 'vue';
import MutatingHeader from '../../components/MutatingHeader.vue';
import NanoSlider from '../../components/NanoSlider.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { createDocTabs } from '../docSnippets.js';
import { t, currentLang } from '../../locales.js';

const isHeaderStuck = ref(false);
const thresholdVal = ref(24);
const hysteresisVal = ref(8);
const spreadVal = ref(0);
const demoViewportWidthPct = ref(100);
const liveMeta = ref({
  compressionLevel: 0,
  densityTier: 'spacious',
  containerWidth: 720,
  contentWidth: 480,
  freeSpacePx: 240,
  utilizationRatio: 0.66,
  isSubtitleFolded: false,
  isSecondaryNavFolded: false,
  isActionsCompact: false,
});

const spreadPresets = [
  { value: 0, label: '0% (Fixed)' },
  { value: 25, label: '25%' },
  { value: 33, label: '33%' },
  { value: 50, label: '50%' },
  { value: 66, label: '66%' },
  { value: 100, label: '100% (Full)' },
];

const codeTabs = createDocTabs({
  componentName: 'MutatingHeader',
  stateRef: 'isStuck',
  initialValue: 'false',
  templateAttrs: [
    'v-model:stuck="isStuck"',
    ':threshold="24"',
    ':hysteresis="8"',
    ':floating-max-width="1080"',
    ':spread="50"',
    ':glassmorphism="true"',
  ],
  slotContent:
    '<template #left="{ meta }">\n      <span>Brand</span>\n      <small v-if="!meta.isSubtitleFolded">Subtitle</small>\n    </template>\n    <template #right="{ meta }">\n      <button>{{ meta.isActionsCompact ? "+" : "+ Add Project" }}</button>\n    </template>',
  apiSections: [
    {
      title: 'Props',
      items: [
        'threshold: Number (default: 24) - Scroll distance in px after which header docks edge-to-edge',
        'hysteresis: Number (default: 8) - Scroll distance in px below which header undocks back into floating card',
        'floatingMaxWidth: String | Number (default: "100%") - Centered max-width when floating (e.g. 1240 or "1240px")',
        'spread: Number (default: 0) - Option 1 (0%): inner layout stays fixed on dock; Option 2 (1..100%, e.g. 25, 33, 50, 66, 100): inner elements spread across spread% of unlocked docked width',
        'scrollContainer: String | HTMLElement (default: null -> window) - Custom scroll container selector or element',
        'height: String (default: "60px") - Header bar height',
        'floatingMargin: String (default: "12px auto 0 auto") - Floating vertical margins (horizontal auto-centered)',
        'floatingRadius: String (default: "16px") - Border radius when floating',
        'stuckRadius: String | Number (default: undefined) - Border radius when docked',
        'glassmorphism: Boolean (default: true) - Enable backdrop blur',
        'stuck: Boolean (v-model:stuck) - Reactive docked state',
      ],
    },
    {
      title: 'Events, Scoped Slots & Priority+ Meta Context',
      items: [
        '@update:stuck / @stuck / @unstick - Docked state lifecycle events',
        '@meta-change: (meta: HeaderCompressionMeta) => void - Emitted when Priority+ space/compression telemetry updates',
        '#left / #center / #right / #default: Scoped slots receiving { isStuck, spread, meta, compressionLevel, density }',
        'useMutatingHeaderMeta(): Composable for deeply nested child components to inject live { compressionLevel (0..3), densityTier, containerWidth, contentWidth, freeSpacePx, utilizationRatio, isSubtitleFolded, isSecondaryNavFolded, isActionsCompact }',
      ],
    },
  ],
});
</script>

<template>
  <div class="doc-page">
    <h2>{{ t('mutatingHeader.title') }}</h2>
    <p>{{ t('mutatingHeader.desc') }}</p>

    <div class="demo-section">
      <h3>Interactive Scroll, Inner Spread (0%–100%) &amp; Priority+ Compression Demo</h3>
      <p class="demo-desc">
        <span>
          {{
            currentLang === 'pl'
              ? 'Przewiń kontener poniżej i przetestuj Opcję 1 (0% — stały rozkład wewnętrzny) oraz Opcję 2 (25% / 33% / 50% / 66% / 100% — proporcjonalne rozszczepienie elementów na odblokowaną szerokość) wraz z propagacją meta-telemetrii Priority+ do sub-komponentów.'
              : 'Scroll inside the container below to test Option 1 (0% — fixed inner layout) vs. Option 2 (25% / 33% / 50% / 66% / 100% — proportional inner spread across unlocked docked width) and Priority+ adaptive compression meta propagation.'
          }}
        </span>
      </p>

      <!-- Controls Bar: Spread Presets + Sliders + Live Meta Telemetry -->
      <div class="mh-controls-card">
        <div class="mh-control-row">
          <div class="mh-control-group">
            <span class="mh-control-label">
              {{
                currentLang === 'pl'
                  ? 'Rozszczepienie elementów po zadokowaniu (spread):'
                  : 'Inner Element Spread When Docked (spread):'
              }}
              <strong>{{ spreadVal }}%</strong>
            </span>
            <div class="mh-preset-pills">
              <button
                v-for="p in spreadPresets"
                :key="p.value"
                type="button"
                class="mh-preset-btn"
                :class="{ active: spreadVal === p.value }"
                @click="spreadVal = p.value"
              >
                {{ p.label }}
              </button>
            </div>
          </div>

          <div class="mh-slider-box">
            <NanoSlider v-model="spreadVal" :min="0" :max="100" :step="1" />
          </div>
        </div>

        <div class="mh-control-row">
          <div class="mh-control-group">
            <span class="mh-control-label">
              {{
                currentLang === 'pl'
                  ? 'Symulacja szerokości okna (test kompresji Priority+ meta):'
                  : 'Simulated Viewport Width (Priority+ meta compression test):'
              }}
              <strong>{{ demoViewportWidthPct }}%</strong>
            </span>
          </div>
          <div class="mh-slider-box">
            <NanoSlider v-model="demoViewportWidthPct" :min="48" :max="100" :step="1" />
          </div>
        </div>

        <div class="mh-telemetry-bar">
          <span class="status-pill" :class="{ stuck: isHeaderStuck }">
            {{ isHeaderStuck ? 'Docked (is-stuck)' : 'Floating Card (720px)' }}
          </span>
          <span class="meta-pill">
            meta.densityTier: <strong>{{ liveMeta.densityTier }}</strong>
          </span>
          <span class="meta-pill">
            meta.compressionLevel: <strong>L{{ liveMeta.compressionLevel }}/3</strong>
          </span>
          <span class="meta-pill">
            inner: <strong>{{ liveMeta.containerWidth }}px</strong> (free:
            <strong>{{ liveMeta.freeSpacePx }}px</strong> · {{ Math.round(liveMeta.utilizationRatio * 100) }}%)
          </span>
        </div>
      </div>

      <div
        class="scroll-demo-viewport"
        id="demo-scroll-box"
        :style="{ width: `${demoViewportWidthPct}%` }"
      >
        <!-- The Mutating Header inside the demo container -->
        <MutatingHeader
          scroll-container="#demo-scroll-box"
          :threshold="thresholdVal"
          :hysteresis="hysteresisVal"
          :floating-max-width="720"
          :spread="spreadVal"
          v-model:stuck="isHeaderStuck"
          @meta-change="(m) => (liveMeta = m)"
        >
          <template #left="{ meta }">
            <div class="demo-brand">
              <span class="brand-icon">⚡</span>
              <div class="brand-text-col">
                <span class="brand-name">Nano Mutating Nav</span>
                <span v-if="!meta.isSubtitleFolded" class="brand-sub">
                  Priority+ Adaptive Header
                </span>
              </div>
            </div>
            <span v-if="!meta.isSubtitleFolded" class="demo-badge">PORT 45330</span>
          </template>

          <template #center="{ meta }">
            <div class="demo-center-stat">
              <span class="stat-num">11</span>
              <span class="stat-lbl">tasks</span>
            </div>
            <template v-if="!meta.isSecondaryNavFolded">
              <div class="demo-divider"></div>
              <div class="demo-center-stat">
                <span class="stat-num">37</span>
                <span class="stat-lbl">projects</span>
              </div>
              <div class="demo-divider"></div>
              <div class="demo-center-stat">
                <span class="stat-num">{{ spreadVal }}%</span>
                <span class="stat-lbl">spread</span>
              </div>
            </template>
          </template>

          <template #right="{ meta }">
            <button v-if="!meta.isSecondaryNavFolded" type="button" class="demo-btn">
              🛠️ Scripts
            </button>
            <span class="demo-pill">EN</span>
            <button type="button" class="demo-btn-action">
              {{ meta.isActionsCompact ? '+ Add' : '+ Add Project' }}
            </button>
          </template>
        </MutatingHeader>

        <!-- Dummy content to provide scroll distance -->
        <div class="demo-scroll-content">
          <div class="demo-card-placeholder" v-for="i in 8" :key="i">
            <h4>Sample Content Block #{{ i }}</h4>
            <p>
              Scroll down to dock the header (720px floating card → 100% edge-to-edge bar).
              Click <strong>0%</strong>, <strong>25%</strong>, <strong>33%</strong>,
              <strong>50%</strong>, <strong>66%</strong>, or <strong>100%</strong> above to control
              how far the inner elements spread across the unlocked horizontal space!
            </p>
          </div>
        </div>
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
  --status-bg: rgba(59, 130, 246, 0.15);
  --status-color: #60a5fa;
  --status-border: rgba(59, 130, 246, 0.3);
  --status-stuck-bg: rgba(16, 185, 129, 0.15);
  --status-stuck-color: #34d399;
  --status-stuck-border: rgba(16, 185, 129, 0.3);
  --viewport-bg: var(--nano-bg-card-elevated);
  --viewport-border: var(--nano-border-card);
  --viewport-shadow: var(--nano-shadow-elevated);
  --brand-color: var(--nano-text-main);
  --badge-bg: rgba(6, 182, 212, 0.15);
  --badge-color: #22d3ee;
  --badge-border: rgba(6, 182, 212, 0.3);
  --stat-num: var(--nano-state-active);
  --stat-lbl: var(--nano-text-muted);
  --divider-bg: var(--nano-border-subtle);
  --btn-color: var(--nano-text-muted);
  --btn-hover-bg: var(--nano-bg-hover);
  --btn-hover-color: var(--nano-text-main);
  --pill-border: var(--nano-border-card);
  --pill-color: var(--nano-text-muted);
  --card-bg: var(--nano-bg-card);
  --card-border: var(--nano-border-card);
  --card-title: var(--nano-text-main);
  --card-text: var(--nano-text-muted);
  --card-shadow: var(--nano-shadow-card);
}

.doc-page h2 {
  color: var(--nano-text-main);
  margin: 0;
}

.doc-page > p {
  color: var(--nano-text-muted);
  margin: 0;
}

.demo-section h3 {
  color: var(--nano-text-main);
  margin: 0 0 8px 0;
}

.demo-desc {
  color: var(--nano-text-muted);
  font-size: 0.9rem;
  margin-bottom: 14px;
  line-height: 1.5;
}

.mh-controls-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  margin-bottom: 16px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
}

.mh-control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.mh-control-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.mh-control-label {
  font-size: 0.82rem;
  color: var(--nano-text-muted);
}

.mh-control-label strong {
  color: var(--nano-text-main);
  font-family: var(--font-mono, monospace);
}

.mh-preset-pills {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mh-preset-btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--card-border);
  background: transparent;
  color: var(--nano-text-muted);
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--nano-transition-interactive);
}

.mh-preset-btn:hover {
  color: var(--nano-text-main);
  background: var(--btn-hover-bg);
}

.mh-preset-btn.active {
  background: rgba(56, 189, 248, 0.16);
  color: #38bdf8;
  border-color: rgba(56, 189, 248, 0.45);
}

.mh-slider-box {
  width: 220px;
  max-width: 100%;
}

.mh-telemetry-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid var(--divider-bg);
}

.meta-pill {
  font-family: var(--font-mono, monospace);
  font-size: 0.74rem;
  padding: 2px 9px;
  border-radius: 999px;
  border: 1px solid var(--card-border);
  color: var(--nano-text-muted);
}

.meta-pill strong {
  color: var(--nano-text-main);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  text-align: center;
  flex-shrink: 0;
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 9999px;
  background: var(--status-bg);
  color: var(--status-color);
  border: 1px solid var(--status-border);
  user-select: none;
  -webkit-user-select: none;
}

.status-pill.stuck {
  background: var(--status-stuck-bg);
  color: var(--status-stuck-color);
  border-color: var(--status-stuck-border);
}

.scroll-demo-viewport {
  position: relative;
  height: 440px;
  margin: 0 auto;
  overflow-y: auto;
  border-radius: 12px;
  border: 1px solid var(--viewport-border);
  background: var(--viewport-bg);
  box-shadow: var(--viewport-shadow);
  --stuck-radius: 11px 11px 0 0;
  transition: width 200ms ease;
}

.demo-brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 0.95rem;
  line-height: 1.1;
  color: var(--brand-color);
  white-space: nowrap;
}

.brand-text-col {
  display: flex;
  flex-direction: column;
}

.brand-sub {
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--stat-lbl);
}

.demo-badge {
  font-size: 0.68rem;
  font-family: var(--font-mono, monospace);
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--badge-bg);
  color: var(--badge-color);
  border: 1px solid var(--badge-border);
  white-space: nowrap;
}

.demo-center-stat {
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
}

.stat-num {
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--stat-num);
}

.stat-lbl {
  font-size: 0.74rem;
  color: var(--stat-lbl);
}

.demo-divider {
  width: 1px;
  height: 16px;
  background: var(--divider-bg);
}

.demo-btn {
  background: transparent;
  border: none;
  color: var(--btn-color);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  outline: none;
  user-select: none;
  white-space: nowrap;
  transition: var(--nano-transition-interactive);
}

.demo-btn:hover {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-color);
}

.demo-btn-action {
  background: #0284c7;
  color: #ffffff;
  border: none;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  outline: none;
  user-select: none;
  white-space: nowrap;
}

.demo-pill {
  font-size: 0.72rem;
  font-family: var(--font-mono, monospace);
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--pill-border);
  color: var(--pill-color);
}

.demo-scroll-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.demo-card-placeholder {
  padding: 18px 20px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  box-shadow: var(--card-shadow);
}

.demo-card-placeholder h4 {
  margin: 0 0 6px 0;
  color: var(--card-title);
}

.demo-card-placeholder p {
  margin: 0;
  font-size: 0.88rem;
  color: var(--card-text);
  line-height: 1.5;
}
</style>
