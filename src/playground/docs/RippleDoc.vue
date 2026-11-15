<script setup>
import { ref, computed, onUnmounted } from 'vue';
import NanoColorPickerOklch from '../../components/NanoColorPickerOklch.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoSlider from '../../components/NanoSlider.vue';
import NanoIcon from '../../components/NanoIcon.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { t, currentLang } from '../../locales.js';

// Section 1: Interactive Wave Laboratory State
const useCustomColor = ref(true);
const customColor = ref('oklch(0.74 0.16 205)');
const pickerFormat = ref('oklch');
const isCentered = ref(false);
const isDisabled = ref(false);
const durationMs = ref(540);
const peakOpacity = ref(0.42);

const lastOriginX = ref(160);
const lastOriginY = ref(64);
const lastRadiusPx = ref(172);
const lastDiameterPx = ref(344);
const wavesSpawned = ref(0);

const handleLabRipple = (geom) => {
  lastOriginX.value = geom.x;
  lastOriginY.value = geom.y;
  lastRadiusPx.value = geom.radius;
  lastDiameterPx.value = geom.diameter;
  wavesSpawned.value += 1;
};

const labRippleBinding = computed(() => ({
  color: useCustomColor.value ? customColor.value : '',
  centered: isCentered.value,
  disabled: isDisabled.value,
  duration: durationMs.value,
  opacity: peakOpacity.value,
  onRipple: handleLabRipple,
}));

const liveDirectiveSnippet = computed(() => {
  if (isDisabled.value) {
    return '<div v-ripple="false" class="interactive-surface">...</div>';
  }
  const isDefault =
    !useCustomColor.value &&
    !isCentered.value &&
    durationMs.value === 540 &&
    Math.abs(peakOpacity.value - 0.28) < 0.01;
  if (isDefault) {
    return '<div v-ripple class="interactive-surface">...</div>';
  }
  const fields = [];
  if (useCustomColor.value) fields.push(`color: '${customColor.value}'`);
  if (isCentered.value) fields.push('centered: true');
  if (durationMs.value !== 540) fields.push(`duration: ${durationMs.value}`);
  fields.push(`opacity: ${peakOpacity.value.toFixed(2)}`);
  return `<div v-ripple="{ ${fields.join(', ')} }" class="interactive-surface">...</div>`;
});

// Section 2: Independent Surface Archetype States
const activeToolId = ref('sparkles');
const toolbarItems = [
  { id: 'sparkles', icon: 'sparkles', label: 'FX' },
  { id: 'layers', icon: 'layers', label: 'Layers' },
  { id: 'sliders', icon: 'sliders', label: 'Tune' },
  { id: 'rotate', icon: 'rotate', label: 'Reset' },
];

const selectedRowId = ref('gpu-compositor');
const listRows = computed(() =>
  currentLang.value === 'en'
    ? [
        { id: 'gpu-compositor', title: 'GPU Transform Compositor', meta: '120 fps · CLS = 0' },
        { id: 'farthest-corner', title: 'Euclidean Farthest-Corner R', meta: 'hypot(Δx, Δy)' },
        { id: 'concurrency-cap', title: 'Bounded Wave Pool', meta: 'max 4 active nodes' },
      ]
    : [
        { id: 'gpu-compositor', title: 'Kompozytor GPU (Transform + Opacity)', meta: '120 fps · CLS = 0' },
        { id: 'farthest-corner', title: 'Promień Euklidesowy R', meta: 'hypot(Δx, Δy)' },
        { id: 'concurrency-cap', title: 'Pula Współbieżnych Fal', meta: 'maks. 4 węzły DOM' },
      ]
);

const copiedLive = ref(false);
let copyTimer = null;

const copyLiveDirective = async () => {
  try {
    if (globalThis.navigator?.clipboard?.writeText) {
      await globalThis.navigator.clipboard.writeText(liveDirectiveSnippet.value);
    }
    copiedLive.value = true;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copiedLive.value = false;
      copyTimer = null;
    }, 1400);
  } catch {
    copiedLive.value = false;
  }
};

onUnmounted(() => {
  if (copyTimer) {
    clearTimeout(copyTimer);
    copyTimer = null;
  }
});

const codeTabs = computed(() => [
  {
    id: 'declarative',
    label: 'Declarative Usage',
    lang: 'vue',
    code: `<template>
  <!-- 1. Zero-config pointer-origin wave (auto currentColor tint) -->
  <button type="button" v-ripple class="btn-primary">
    Save Configuration
  </button>

  <!-- 2. Custom OKLCH / HEX string shorthand -->
  <button type="button" v-ripple="'oklch(0.74 0.16 205)'" class="btn-secondary">
    Perceptual Cyan Wave
  </button>

  <!-- 3. Structured options object (centered icon pill, custom duration & opacity) -->
  <button
    type="button"
    v-ripple="{ color: 'oklch(0.72 0.18 158)', centered: true, duration: 620, opacity: 0.36 }"
    class="icon-pill"
    aria-label="Refresh telemetry"
  >
    <NanoIcon name="rotate" :size="16" />
  </button>

  <!-- 4. Conditional disable without unmounting -->
  <div v-ripple="{ disabled: isLocked, opacity: 0.16 }" class="data-row">
    Row Surface
  </div>
</template>`,
  },
  {
    id: 'headless',
    label: 'Headless Geometry & Options',
    lang: 'javascript',
    code: `import { computeRippleGeometry, resolveRippleOptions } from '@gkucmierz/nano-ui';

// Exact Euclidean farthest-corner wave geometry:
// R = ceil(max(hypot(x, y), hypot(w - x, y), hypot(x, h - y), hypot(w - x, h - y), 12))
const geom = computeRippleGeometry(
  { left: 100, top: 200, width: 240, height: 56 },
  124, // pointer clientX
  228  // pointer clientY
);
// -> { x: 24, y: 28, width: 240, height: 56, centered: false, radius: 218, diameter: 436, left: -194, top: -190 }

// Normalize string / boolean / object directive bindings:
const opts = resolveRippleOptions({
  color: 'oklch(0.74 0.16 205)',
  centered: true,
  duration: 640,
  opacity: 0.38,
});`,
  },
  {
    id: 'css-tokens',
    label: 'CSS Motion Tokens',
    lang: 'css',
    code: `:root {
  /* Core SSoT Motion Tokens */
  --nano-ease-ripple: cubic-bezier(0.22, 1, 0.36, 1);
  --nano-transition-ripple: 540ms var(--nano-ease-ripple);

  /* Polarity-aware fallback tint (automatically mixed with currentColor) */
  --nano-ripple-color: rgba(255, 255, 255, 0.28);
}

/* Automatic accessibility & hardware guarantees:
 * - Respects @media (prefers-reduced-motion: reduce) -> 0 waves spawned
 * - Respects [disabled] and [aria-disabled="true"] -> 0 waves spawned
 * - Caps concurrent DOM nodes at MAX_CONCURRENT_RIPPLES = 4
 * - GPU-only transform: translate3d(0,0,0) scale(0.06 -> 1.04) + opacity (CLS = 0)
 */`,
  },
]);
</script>

<template>
  <div class="doc-page">
    <h2>{{ t('rippleDoc.title') }}</h2>
    <p class="desc">{{ t('rippleDoc.desc') }}</p>

    <!-- 1. Interactive Wave Configurator + Live Geometry Telemetry -->
    <div class="demo-section">
      <h3>{{ t('rippleDoc.labTitle') }}</h3>
      <p class="demo-desc">{{ t('rippleDoc.labDesc') }}</p>

      <div class="ripple-lab-grid">
        <!-- Left: Interactive Target Stage & Telemetry -->
        <div class="ripple-stage-col">
          <div
            v-ripple="labRippleBinding"
            class="ripple-interactive-stage"
            :class="{ 'is-stage-disabled': isDisabled }"
            role="button"
            tabindex="0"
            :aria-disabled="isDisabled ? 'true' : 'false'"
          >
            <div class="stage-crosshair" aria-hidden="true"></div>
            <div class="stage-badge">
              <NanoIcon name="sparkles" :size="15" />
              <span>{{ isCentered ? 'centered (w/2, h/2)' : 'pointerdown (x, y)' }}</span>
            </div>
            <strong class="stage-headline">{{ t('rippleDoc.surfaceTapTitle') }}</strong>
            <span class="stage-sub">{{ t('rippleDoc.surfaceTapSub') }}</span>
          </div>

          <div class="telemetry-strip">
            <div class="telemetry-cell">
              <span class="telemetry-label">{{ t('rippleDoc.telemetryOrigin') }}</span>
              <code class="telemetry-val">({{ lastOriginX }}px, {{ lastOriginY }}px)</code>
            </div>
            <div class="telemetry-cell">
              <span class="telemetry-label">{{ t('rippleDoc.telemetryRadius') }}</span>
              <code class="telemetry-val">{{ lastRadiusPx }}px</code>
            </div>
            <div class="telemetry-cell">
              <span class="telemetry-label">{{ t('rippleDoc.telemetryDiameter') }}</span>
              <code class="telemetry-val">{{ lastDiameterPx }}px</code>
            </div>
            <div class="telemetry-cell">
              <span class="telemetry-label">{{ t('rippleDoc.telemetryCount') }}</span>
              <code class="telemetry-val">{{ wavesSpawned }}</code>
            </div>
          </div>

          <div class="live-snippet-bar">
            <code class="live-snippet-code">{{ liveDirectiveSnippet }}</code>
            <button
              type="button"
              class="copy-pill-btn"
              :aria-label="t('common.clickToCopy')"
              @click="copyLiveDirective"
            >
              {{ copiedLive ? 'Copied' : 'Copy' }}
            </button>
          </div>
        </div>

        <!-- Right: Controls Panel (NanoColorPickerOklch Popover + NanoSwitch + NanoSlider) -->
        <div class="ripple-controls-card">
          <label class="ctrl-toggle-row">
            <span class="ctrl-label">{{ t('rippleDoc.useCustomColor') }}</span>
            <NanoSwitch v-model="useCustomColor" size="compact" />
          </label>

          <div class="ctrl-picker-row" :class="{ 'is-muted': !useCustomColor }">
            <span class="ctrl-label">{{ t('rippleDoc.colorLabel') }}</span>
            <NanoColorPickerOklch
              id="ripple-lab-color"
              v-model="customColor"
              v-model:format="pickerFormat"
              popover
              show-value
              size="md"
              :disabled="!useCustomColor"
              aria-label="Custom ripple OKLCH color"
            />
          </div>

          <label class="ctrl-toggle-row">
            <span class="ctrl-label">{{ t('rippleDoc.centeredToggle') }}</span>
            <NanoSwitch v-model="isCentered" size="compact" />
          </label>

          <label class="ctrl-toggle-row">
            <span class="ctrl-label">{{ t('rippleDoc.disabledToggle') }}</span>
            <NanoSwitch v-model="isDisabled" size="compact" />
          </label>

          <div class="ctrl-slider-block">
            <div class="ctrl-slider-head">
              <span class="ctrl-label">{{ t('rippleDoc.durationLabel') }}</span>
              <code class="ctrl-readout">{{ durationMs }}ms</code>
            </div>
            <NanoSlider
              v-model="durationMs"
              :min="200"
              :max="1200"
              :step="20"
              size="sm"
            />
          </div>

          <div class="ctrl-slider-block">
            <div class="ctrl-slider-head">
              <span class="ctrl-label">{{ t('rippleDoc.opacityLabel') }}</span>
              <code class="ctrl-readout">{{ Math.round(peakOpacity * 100) }}%</code>
            </div>
            <NanoSlider
              v-model="peakOpacity"
              :min="0.10"
              :max="0.85"
              :step="0.02"
              size="sm"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Surface Archetypes Gallery (Independent Demo States) -->
    <div class="demo-section">
      <h3>{{ t('rippleDoc.archetypesTitle') }}</h3>
      <p class="demo-desc">{{ t('rippleDoc.archetypesDesc') }}</p>

      <div class="archetype-grid">
        <!-- Archetype A: Semantic Buttons -->
        <div class="archetype-card">
          <h4>{{ t('rippleDoc.archButtonsTitle') }}</h4>
          <p class="archetype-desc">{{ t('rippleDoc.archButtonsDesc') }}</p>
          <div class="btn-row">
            <button type="button" v-ripple class="demo-action-btn is-primary">
              Primary
            </button>
            <button type="button" v-ripple class="demo-action-btn is-emerald">
              Emerald
            </button>
            <button type="button" v-ripple class="demo-action-btn is-ghost">
              Ghost currentColor
            </button>
          </div>
        </div>

        <!-- Archetype B: Glassmorphism Card -->
        <div class="archetype-card">
          <h4>{{ t('rippleDoc.archCardTitle') }}</h4>
          <p class="archetype-desc">{{ t('rippleDoc.archCardDesc') }}</p>
          <div v-ripple="{ color: 'oklch(0.75 0.15 245)', opacity: 0.32 }" class="glass-surface-demo">
            <span class="glass-title">Glassmorphism Surface</span>
            <small class="glass-sub">v-ripple="{ color: 'oklch(0.75 0.15 245)', opacity: 0.32 }"</small>
          </div>
        </div>

        <!-- Archetype C: Centered Icon Toolbar -->
        <div class="archetype-card">
          <h4>{{ t('rippleDoc.archCenteredTitle') }}</h4>
          <p class="archetype-desc">{{ t('rippleDoc.archCenteredDesc') }}</p>
          <div class="toolbar-demo">
            <button
              v-for="tool in toolbarItems"
              :key="tool.id"
              type="button"
              v-ripple="{ centered: true, duration: 460, opacity: 0.38 }"
              class="toolbar-icon-pill"
              :class="{ 'is-active': activeToolId === tool.id }"
              :aria-label="tool.label"
              @click="activeToolId = tool.id"
            >
              <NanoIcon :name="tool.icon" :size="16" />
              <span>{{ tool.label }}</span>
            </button>
          </div>
        </div>

        <!-- Archetype D: Subtle Interactive List Rows -->
        <div class="archetype-card">
          <h4>{{ t('rippleDoc.archListTitle') }}</h4>
          <p class="archetype-desc">{{ t('rippleDoc.archListDesc') }}</p>
          <div class="list-rows-demo">
            <button
              v-for="row in listRows"
              :key="row.id"
              type="button"
              v-ripple="{ opacity: 0.16, duration: 640 }"
              class="demo-list-row"
              :class="{ 'is-selected': selectedRowId === row.id }"
              @click="selectedRowId = row.id"
            >
              <span class="row-title">{{ row.title }}</span>
              <code class="row-meta">{{ row.meta }}</code>
            </button>
          </div>
        </div>

        <!-- Archetype E: Disabled & Guarded States -->
        <div class="archetype-card">
          <h4>{{ t('rippleDoc.archGuardTitle') }}</h4>
          <p class="archetype-desc">{{ t('rippleDoc.archGuardDesc') }}</p>
          <div class="btn-row">
            <button type="button" v-ripple disabled class="demo-action-btn is-ghost is-disabled-btn">
              [disabled] Guard
            </button>
            <button type="button" v-ripple="false" class="demo-action-btn is-ghost">
              v-ripple="false"
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Code & Token Reference -->
    <NanoCodeBlock :tabs="codeTabs" />
  </div>
</template>

<style scoped>
.doc-page {
  padding-top: 0.5rem;
}

.desc {
  color: var(--nano-text-muted);
  margin-bottom: 1.75rem;
  line-height: 1.6;
}

.ripple-lab-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.95fr);
  gap: 1.25rem;
  align-items: stretch;
}

@media (max-width: 880px) {
  .ripple-lab-grid {
    grid-template-columns: 1fr;
  }
}

.ripple-stage-col {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.ripple-interactive-stage {
  position: relative;
  overflow: hidden;
  min-height: 196px;
  padding: 1.5rem;
  border-radius: 14px;
  border: 1px solid var(--nano-border-card);
  background:
    radial-gradient(circle at 18% 22%, rgba(56, 189, 248, 0.08), transparent 58%),
    radial-gradient(circle at 84% 80%, rgba(99, 102, 241, 0.09), transparent 58%),
    var(--nano-bg-card-elevated, var(--nano-bg-card));
  color: var(--nano-text-main);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  text-align: center;
  cursor: pointer;
  outline: none;
  user-select: none;
  -webkit-user-select: none;
  transition: border-color var(--nano-transition-interactive), box-shadow var(--nano-transition-interactive);
}

.ripple-interactive-stage:hover:not(.is-stage-disabled) {
  border-color: var(--nano-border-hover);
}

.ripple-interactive-stage:focus-visible {
  border-color: var(--nano-state-active, #38bdf8);
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.25);
}

.ripple-interactive-stage.is-stage-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stage-crosshair {
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px dashed var(--nano-border-hover);
  opacity: 0.45;
  pointer-events: none;
}

.stage-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  height: 26px;
  padding: 0 0.65rem;
  border-radius: 999px;
  background: var(--nano-bg-code);
  border: 1px solid var(--nano-border-card);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.74rem;
  color: var(--nano-text-secondary);
  pointer-events: none;
}

.stage-headline {
  font-size: 1.02rem;
  font-weight: 700;
  color: var(--nano-text-main);
  pointer-events: none;
}

.stage-sub {
  max-width: 44ch;
  font-size: 0.83rem;
  color: var(--nano-text-muted);
  line-height: 1.45;
  pointer-events: none;
}

.telemetry-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.55rem;
}

@media (max-width: 560px) {
  .telemetry-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.telemetry-cell {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.55rem 0.7rem;
  border-radius: 9px;
  background: var(--nano-bg-app);
  border: 1px solid var(--nano-border-card);
}

.telemetry-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--nano-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.telemetry-val {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--nano-text-main);
  font-variant-numeric: tabular-nums;
}

.live-snippet-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.55rem 0.75rem;
  border-radius: 9px;
  background: var(--nano-bg-code);
  border: 1px solid var(--nano-border-card);
}

.live-snippet-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.76rem;
  color: var(--nano-text-code);
  overflow-x: auto;
  white-space: nowrap;
}

.copy-pill-btn {
  height: 28px;
  min-width: 64px;
  padding: 0 0.65rem;
  border-radius: 6px;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-card);
  color: var(--nano-text-main);
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color var(--nano-transition-interactive), background-color var(--nano-transition-interactive);
}

.copy-pill-btn:hover {
  border-color: var(--nano-border-hover);
  background: var(--nano-bg-hover);
}

.ripple-controls-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.85rem;
  padding: 1.1rem;
  border-radius: 14px;
  background: var(--nano-bg-app);
  border: 1px solid var(--nano-border-card);
}

.ctrl-toggle-row,
.ctrl-picker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 34px;
}

.ctrl-toggle-row {
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}

.ctrl-picker-row.is-muted {
  opacity: 0.45;
}

.ctrl-label {
  font-size: 0.83rem;
  font-weight: 600;
  color: var(--nano-text-secondary);
}

.ctrl-slider-block {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.ctrl-slider-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.ctrl-readout {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--nano-text-main);
  font-variant-numeric: tabular-nums;
}

.archetype-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.archetype-card {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 1.1rem;
  border-radius: 12px;
  background: var(--nano-bg-app);
  border: 1px solid var(--nano-border-card);
}

.archetype-card h4 {
  margin: 0;
  font-size: 0.94rem;
  font-weight: 700;
  color: var(--nano-text-main);
}

.archetype-desc {
  margin: 0;
  font-size: 0.81rem;
  color: var(--nano-text-muted);
  line-height: 1.5;
}

.btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: auto;
  padding-top: 0.35rem;
}

.demo-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  padding: 0 1rem;
  border-radius: 9px;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
  outline: none;
  box-sizing: border-box;
  user-select: none;
  -webkit-user-select: none;
  transition: border-color var(--nano-transition-interactive), box-shadow var(--nano-transition-interactive), background-color var(--nano-transition-interactive);
}

.demo-action-btn.is-primary {
  border: 1px solid rgba(99, 102, 241, 0.45);
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #ffffff;
}

.demo-action-btn.is-primary:hover {
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
}

.demo-action-btn.is-emerald {
  border: 1px solid rgba(16, 185, 129, 0.45);
  background: linear-gradient(135deg, #059669, #0ea5e9);
  color: #ffffff;
}

.demo-action-btn.is-emerald:hover {
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.32);
}

.demo-action-btn.is-ghost {
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-card);
  color: var(--nano-text-main);
}

.demo-action-btn.is-ghost:hover:not(:disabled) {
  border-color: var(--nano-border-hover);
  background: var(--nano-bg-hover);
}

.demo-action-btn.is-disabled-btn {
  opacity: 0.45;
  cursor: not-allowed;
}

.glass-surface-demo {
  margin-top: auto;
  padding: 1.15rem;
  border-radius: 11px;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-card-elevated, var(--nano-bg-card));
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  transition: border-color var(--nano-transition-interactive);
}

.glass-surface-demo:hover {
  border-color: var(--nano-border-hover);
}

.glass-title {
  display: block;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--nano-text-main);
}

.glass-sub {
  display: block;
  margin-top: 0.3rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.72rem;
  color: var(--nano-text-muted);
}

.toolbar-demo {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: auto;
}

.toolbar-icon-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  height: 36px;
  padding: 0 0.75rem;
  border-radius: 9px;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-card);
  color: var(--nano-text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  transition: border-color var(--nano-transition-interactive), color var(--nano-transition-interactive), background-color var(--nano-transition-interactive);
}

.toolbar-icon-pill:hover {
  border-color: var(--nano-border-hover);
  color: var(--nano-text-main);
}

.toolbar-icon-pill.is-active {
  border-color: var(--nano-state-active, #38bdf8);
  background: var(--nano-nav-active-bg, rgba(56, 189, 248, 0.14));
  color: var(--nano-text-main);
}

.list-rows-demo {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: auto;
}

.demo-list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  width: 100%;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-card);
  color: var(--nano-text-main);
  text-align: left;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  transition: border-color var(--nano-transition-interactive), background-color var(--nano-transition-interactive);
}

.demo-list-row:hover {
  border-color: var(--nano-border-hover);
}

.demo-list-row.is-selected {
  border-color: var(--nano-state-active, #38bdf8);
  background: var(--nano-nav-active-bg, rgba(56, 189, 248, 0.1));
}

.row-title {
  font-size: 0.8rem;
  font-weight: 600;
}

.row-meta {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.72rem;
  color: var(--nano-text-muted);
}
</style>
