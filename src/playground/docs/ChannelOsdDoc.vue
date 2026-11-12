<script setup>
import { ref, computed } from 'vue';
import NanoChannelOsd from '../../components/NanoChannelOsd.vue';
import NanoWelcomeHud from '../../components/NanoWelcomeHud.vue';
import NanoSlider from '../../components/NanoSlider.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { resolveChannelOsdBox, resolveChannelOsdMaxDigits } from '../../utils/channelOsdLayout.js';
import { createDocTabs } from '../docSnippets.js';

const osdRef = ref(null);
const welcomeHudRef = ref(null);
const activeChannel = ref(16);
const maxChannel = ref(128);
const hudSize = ref(140);
const hudShape = ref('rect');
const showSubtitle = ref(true);
const stabilizeCapacity = ref(true);
const timeoutMs = ref(780);
const welcomeActivatedCount = ref(0);

const subtitleText = computed(() =>
  showSubtitle.value ? 'Relatywistyczna Kratownica' : ''
);

const effectiveDigits = computed(() =>
  resolveChannelOsdMaxDigits({ max: maxChannel.value })
);

const formattedActive = computed(() =>
  String(activeChannel.value).padStart(effectiveDigits.value, '0')
);

const liveBoxMetrics = computed(() =>
  resolveChannelOsdBox({
    size: hudSize.value,
    displayText: formattedActive.value,
    max: maxChannel.value,
    subtitle: subtitleText.value,
    shape: hudShape.value,
    stabilizeCapacity: stabilizeCapacity.value,
  })
);

const compareRectMetrics = computed(() =>
  resolveChannelOsdBox({
    size: hudSize.value,
    displayText: formattedActive.value,
    max: maxChannel.value,
    subtitle: subtitleText.value,
    shape: 'rect',
    stabilizeCapacity: stabilizeCapacity.value,
  })
);

const compareSquareMetrics = computed(() =>
  resolveChannelOsdBox({
    size: hudSize.value,
    displayText: formattedActive.value,
    max: maxChannel.value,
    subtitle: subtitleText.value,
    shape: 'square',
    stabilizeCapacity: stabilizeCapacity.value,
  })
);

const triggerDigit = (d) => {
  if (osdRef.value) {
    osdRef.value.pushDigit(String(d));
  }
};

const previewChannelSample = (channelNum) => {
  const clamped = Math.min(maxChannel.value, Math.max(1, channelNum));
  activeChannel.value = clamped;
  osdRef.value?.showOsd?.(String(clamped).padStart(effectiveDigits.value, '0'));
};

const applyChannelPreset = (nextMax, sampleCh) => {
  maxChannel.value = nextMax;
  activeChannel.value = sampleCh;
  const digits = resolveChannelOsdMaxDigits({ max: nextMax });
  osdRef.value?.showOsd?.(String(sampleCh).padStart(digits, '0'));
};

const replayWelcomeHud = () => {
  welcomeHudRef.value?.showHud?.();
};

const codeTabs = createDocTabs({
  componentName: 'NanoChannelOsd',
  stateRef: 'activeChannel',
  initialValue: '16',
  templateAttrs: [
    'v-model="activeChannel"',
    ':min="1"',
    ':max="128"',
    'shape="rect"',
    ':timeout="780"',
    ':size="140"',
    'subtitle="Relatywistyczna Kratownica"',
  ],
  apiSections: [
    {
      title: 'Props',
      items: [
        'modelValue: Number (default: 1) - Currently selected 1-based channel number',
        'min: Number (default: 1) - Minimum valid channel number',
        'max: Number (default: 99) - Maximum valid channel number (e.g. 128 for shaders.7u.pl)',
        'maxDigits: Number (default: 0 -> auto from max) - Maximum digits buffered per sequence (min 2)',
        "shape: 'rect' | 'square' (default: 'rect') - Multi-digit expansion strategy resolved via naturalSearch: 'rect' widens horizontally while keeping height = size; 'square' grows width & height 1:1",
        'stabilizeCapacity: Boolean (default: true) - Locks container width to maxDigits capacity so typing 1 -> 12 -> 128 produces zero layout shift (CLS = 0)',
        'subtitle: String (default: "") - Optional single-line channel title rendered beneath digits',
        'timeout: Number (default: 550) - Auto-dismiss & sequence reset timeout in milliseconds',
        'size: Number (default: 140) - Base HUD height / 2-digit square side in pixels',
        "theme: 'auto' | 'light' | 'dark' (default: 'auto') - Follows global theme tokens by default or forces explicit light/dark glass palette",
        'listenKeyboard: Boolean (default: true) - Listen for global 0-9 keydown events',
      ],
    },
    {
      title: 'Events',
      items: [
        '@update:modelValue: (channel: number) => void - Emitted when a valid channel is parsed',
        '@select: ({ value: number, digits: string }) => void - Emitted with parsed value and raw digit string',
      ],
    },
    {
      title: 'Exposed Methods & Helpers',
      items: [
        'pushDigit(digitChar): number | null - Programmatically push a digit 0-9 into the sequence buffer',
        'showOsd(valueOrText): void - Display custom HUD value and reset auto-hide timer',
        'osdMetrics: ComputedRef<{ widthPx, heightPx, fontSizePx, borderRadiusPx, aspectRatio, shape }>',
        'resolveChannelOsdBox(options): Pure O(log N) naturalSearch layout helper exported from @gkucmierz/nano-ui',
      ],
    },
  ],
});
</script>

<template>
  <div class="doc-page">
    <div class="header-section">
      <h2>NanoChannelOsd</h2>
      <p class="desc">
        TV-style multi-digit glassmorphic HUD overlay (used on <code>geo-words.7u.pl</code> and <code>shaders.7u.pl</code>). Uses <code>naturalSearch</code> to size 3+ digit channels (<code>&gt; 99</code>) cleanly in two selectable geometries: horizontal rounded rectangle (<code>shape="rect"</code>) or expanded <code>1:1</code> square (<code>shape="square"</code>).
      </p>
    </div>

    <div class="demo-section">
      <div class="osd-stage-card">
        <div class="osd-stage-hint">
          <div class="osd-telemetry-row">
            <div class="active-channel-pill">
              Active: <strong>#{{ formattedActive }}</strong> / {{ maxChannel }}
            </div>
            <div class="active-channel-pill is-muted">
              <code>{{ liveBoxMetrics.shape }}</code> · <strong>{{ liveBoxMetrics.widthPx }}×{{ liveBoxMetrics.heightPx }}px</strong> ({{ liveBoxMetrics.aspectRatio }}:1)
            </div>
          </div>

          <p>Press digits <kbd>0</kbd>–<kbd>9</kbd> on your keyboard or test multi-digit presets:</p>

          <div class="preset-row">
            <button type="button" class="preset-btn" :class="{ 'is-active': maxChannel <= 99 }" @click="applyChannelPreset(99, 12)">
              2 Digits (01–99)
            </button>
            <button type="button" class="preset-btn" :class="{ 'is-active': maxChannel === 128 }" @click="applyChannelPreset(128, 16)">
              3 Digits (016 / 128 · Shaders)
            </button>
            <button type="button" class="preset-btn" :class="{ 'is-active': maxChannel >= 1000 }" @click="applyChannelPreset(1024, 512)">
              4 Digits (0512 / 1024)
            </button>
            <button type="button" class="preset-btn" @click="previewChannelSample(activeChannel)">
              Show OSD Now
            </button>
          </div>

          <div class="keypad-row">
            <button
              v-for="d in [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]"
              :key="d"
              type="button"
              class="keypad-btn"
              @click="triggerDigit(d)"
            >
              {{ d }}
            </button>
          </div>
        </div>

        <NanoChannelOsd
          ref="osdRef"
          v-model="activeChannel"
          :min="1"
          :max="maxChannel"
          :shape="hudShape"
          :stabilize-capacity="stabilizeCapacity"
          :subtitle="subtitleText"
          :timeout="timeoutMs"
          :size="hudSize"
        />
      </div>

      <div class="osd-controls-card">
        <h3 class="controls-title">Playground Controls &amp; <code>naturalSearch</code> Geometry</h3>

        <div class="shape-toggle-bar">
          <div class="shape-segmented" role="radiogroup" aria-label="OSD Multi-Digit Shape">
            <button
              type="button"
              class="shape-seg-btn"
              :class="{ 'is-selected': hudShape === 'rect' }"
              @click="hudShape = 'rect'; previewChannelSample(activeChannel)"
            >
              shape="rect" (Horizontal Capsule &gt; 1:1)
            </button>
            <button
              type="button"
              class="shape-seg-btn"
              :class="{ 'is-selected': hudShape === 'square' }"
              @click="hudShape = 'square'; previewChannelSample(activeChannel)"
            >
              shape="square" (Expanded 1:1 Square)
            </button>
          </div>

          <div class="switch-group">
            <label class="switch-label">
              <NanoSwitch v-model="showSubtitle" size="sm" />
              <span>Show Subtitle</span>
            </label>
            <label class="switch-label">
              <NanoSwitch v-model="stabilizeCapacity" size="sm" />
              <span>CLS=0 Capacity Lock</span>
            </label>
          </div>
        </div>

        <div class="controls-grid">
          <div class="control-item">
            <div class="control-label">
              <span>Max Channel (<code>{{ effectiveDigits }}</code> digits)</span>
              <span class="control-value">{{ maxChannel }}</span>
            </div>
            <NanoSlider v-model="maxChannel" :min="9" :max="1024" :step="1" size="sm" aria-label="Max Channel" />
          </div>

          <div class="control-item">
            <div class="control-label">
              <span>Base Size (px)</span>
              <span class="control-value">{{ hudSize }}px</span>
            </div>
            <NanoSlider v-model="hudSize" :min="96" :max="200" :step="4" size="sm" aria-label="HUD Size" />
          </div>

          <div class="control-item">
            <div class="control-label">
              <span>Fade Timeout</span>
              <span class="control-value">{{ timeoutMs }}ms</span>
            </div>
            <NanoSlider v-model="timeoutMs" :min="250" :max="2000" :step="50" size="sm" aria-label="Fade Timeout" />
          </div>
        </div>

        <!-- Static Side-by-Side Comparison of rect vs square -->
        <div class="comparison-grid">
          <div class="comparison-cell">
            <div class="comparison-caption">
              <strong>Option A: <code>shape="rect"</code></strong>
              <span>{{ compareRectMetrics.widthPx }}×{{ compareRectMetrics.heightPx }}px · {{ compareRectMetrics.aspectRatio }}:1</span>
            </div>
            <div class="comparison-stage">
              <div
                class="osd-static-preview"
                :style="{
                  width: `${compareRectMetrics.widthPx}px`,
                  height: `${compareRectMetrics.heightPx}px`,
                  borderRadius: `${compareRectMetrics.borderRadiusPx}px`,
                }"
              >
                <span class="osd-static-digits" :style="{ fontSize: `${compareRectMetrics.fontSizePx}px` }">
                  {{ formattedActive }}
                </span>
                <span v-if="subtitleText" class="osd-static-sub">{{ subtitleText }}</span>
              </div>
            </div>
          </div>

          <div class="comparison-cell">
            <div class="comparison-caption">
              <strong>Option B: <code>shape="square"</code></strong>
              <span>{{ compareSquareMetrics.widthPx }}×{{ compareSquareMetrics.heightPx }}px · 1:1</span>
            </div>
            <div class="comparison-stage">
              <div
                class="osd-static-preview"
                :style="{
                  width: `${compareSquareMetrics.widthPx}px`,
                  height: `${compareSquareMetrics.heightPx}px`,
                  borderRadius: `${compareSquareMetrics.borderRadiusPx}px`,
                }"
              >
                <span class="osd-static-digits" :style="{ fontSize: `${compareSquareMetrics.fontSizePx}px` }">
                  {{ formattedActive }}
                </span>
                <span v-if="subtitleText" class="osd-static-sub">{{ subtitleText }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="osd-controls-card">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
          <div>
            <h3 class="controls-title" style="margin-bottom: 4px;">NanoWelcomeHud (First-Visit Audio &amp; Shortcut Prompt)</h3>
            <p class="desc" style="font-size: 0.85rem; margin: 0;">
              Non-blocking glassmorphic welcome banner with animated countdown progress bar (Activations: <strong>{{ welcomeActivatedCount }}</strong>).
            </p>
          </div>
          <button type="button" class="keypad-btn" style="width: auto; padding: 0 14px;" @click="replayWelcomeHud">
            Replay NanoWelcomeHud
          </button>
        </div>
        <div class="welcome-stage">
          <NanoWelcomeHud
            ref="welcomeHudRef"
            storage-key="nano_ui_playground_welcome_demo"
            :only-first-visit="false"
            :force-show="true"
            :duration="6000"
            icon="💓"
            title="Włącz dźwięk"
            subtitle="Kliknij tutaj lub naciśnij [M], aby odblokować syntezę WebAudio"
            shortcut-key="M"
            @activate="welcomeActivatedCount++"
          />
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
  gap: var(--nano-space-lg, 24px);
  max-width: 900px;
}

.header-section h2 {
  margin: 0 0 var(--nano-space-xs, 4px) 0;
  color: var(--nano-text-main);
  font-size: 1.5rem;
  font-weight: 700;
}

.desc {
  color: var(--nano-text-muted);
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
}

.demo-section {
  display: flex;
  flex-direction: column;
  gap: var(--nano-space-md, 16px);
}

.osd-stage-card {
  position: relative;
  min-height: 300px;
  border-radius: var(--nano-radius-lg, 12px);
  border: 1px solid var(--nano-border-card);
  background: var(--nano-osd-stage-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: hidden;
}

.osd-stage-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  color: var(--nano-text-secondary);
  font-size: 0.9rem;
}

.osd-telemetry-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.active-channel-pill {
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--nano-status-info-bg);
  border: 1px solid var(--nano-status-info-border);
  color: var(--nano-text-main);
  font-size: 0.84rem;
}

.active-channel-pill.is-muted {
  background: var(--nano-bg-card);
  border-color: var(--nano-border-card);
  color: var(--nano-text-secondary);
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.preset-btn {
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-card);
  color: var(--nano-text-secondary);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  line-height: 1;
  transition:
    background var(--nano-duration-fast, 150ms) ease,
    border-color var(--nano-duration-fast, 150ms) ease,
    color var(--nano-duration-fast, 150ms) ease;
}

.preset-btn:hover {
  background: var(--nano-bg-hover);
  border-color: var(--nano-border-hover);
  color: var(--nano-text-main);
}

.preset-btn.is-active {
  border-color: var(--nano-state-active);
  background: var(--nano-status-info-bg);
  color: var(--nano-text-main);
}

.keypad-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 4px;
}

.keypad-btn {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-card);
  color: var(--nano-text-main);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  line-height: 1;
}

.osd-controls-card {
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-card);
  border-radius: var(--nano-radius-lg, 12px);
  padding: 24px;
}

.controls-title {
  margin: 0 0 16px 0;
  font-size: 1rem;
  font-weight: 600;
}

.shape-toggle-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.shape-segmented {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
}

.shape-seg-btn {
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-surface, transparent);
  color: var(--nano-text-muted);
  font-size: 0.83rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  line-height: 1;
}

.shape-seg-btn.is-selected {
  border-color: var(--nano-state-active);
  background: var(--nano-status-info-bg);
  color: var(--nano-text-main);
}

.switch-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.switch-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--nano-text-main);
  cursor: pointer;
  user-select: none;
}

.controls-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.control-item {
  flex: 1 1 180px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.control-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--nano-text-muted);
}

.control-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 600;
  color: var(--nano-text-main);
}

.comparison-grid {
  margin-top: 22px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
  gap: 16px;
}

.comparison-cell {
  border: 1px solid var(--nano-border-card);
  border-radius: 10px;
  padding: 14px;
  background: var(--nano-bg-muted);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comparison-caption {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--nano-text-muted);
}

.comparison-caption strong {
  color: var(--nano-text-main);
}

.comparison-stage {
  min-height: 250px;
  border-radius: 8px;
  border: 1px solid var(--nano-border-subtle);
  background: var(--nano-osd-comparison-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow: auto;
}

.osd-static-preview {
  background: var(--nano-osd-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--nano-osd-border);
  color: var(--nano-osd-fg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 0 12px;
  box-shadow: var(--nano-osd-shadow);
  text-shadow: var(--nano-osd-text-shadow);
  user-select: none;
}

.osd-static-digits {
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: -0.03em;
  white-space: nowrap;
}

.osd-static-sub {
  margin-top: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--nano-osd-subtitle-fg);
  max-width: calc(100% - 8px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.welcome-stage {
  position: relative;
  margin-top: 14px;
  min-height: 230px;
  border-radius: var(--nano-radius-md, 10px);
  border: 1px solid var(--nano-border-card);
  background: var(--nano-osd-stage-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
</style>
