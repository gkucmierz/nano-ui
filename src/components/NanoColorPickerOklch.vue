<script setup>
import { ref, computed, watch } from 'vue';
import {
  parseColor,
  formatHex,
  formatRgb,
  formatOklch,
  getContrastTextColor,
  getWcagContrastRatio,
} from '../utils/colors.js';
import { normalizeAngle } from '../utils/math.js';

const props = defineProps({
  modelValue: {
    type: String,
    default: 'oklch(0.65 0.18 250)',
  },
  format: {
    type: String,
    default: 'oklch',
    validator: (v) => ['oklch', 'hex', 'rgb'].includes(v),
  },
  maxChroma: {
    type: Number,
    default: 0.32,
  },
  threshold: {
    type: Number,
    default: 0.62,
  },
  lightText: {
    type: String,
    default: '#ffffff',
  },
  darkText: {
    type: String,
    default: '#0b0f17',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'update:format', 'change', 'copy']);

const activeFormat = ref(props.format || 'oklch');
const lightness = ref(0.65);
const chroma = ref(0.18);
const hue = ref(250);
const copied = ref(false);
const discRef = ref(null);
const isDraggingDisc = ref(false);

const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

const syncFromModel = (val) => {
  const parsed = parseColor(val);
  if (!parsed) return;
  lightness.value = clamp(parsed.l, 0, 1);
  chroma.value = clamp(parsed.c, 0, props.maxChroma);
  hue.value = normalizeAngle(parsed.h);
};

watch(() => props.modelValue, (val) => {
  syncFromModel(val);
}, { immediate: true });

watch(() => props.format, (val) => {
  if (['oklch', 'hex', 'rgb'].includes(val)) {
    activeFormat.value = val;
  }
});

const currentOklchObj = computed(() => ({
  l: lightness.value,
  c: chroma.value,
  h: hue.value,
}));

const oklchString = computed(() => formatOklch(currentOklchObj.value));
const hexString = computed(() => formatHex(currentOklchObj.value));
const rgbString = computed(() => formatRgb(currentOklchObj.value));

const formattedValue = computed(() => {
  if (activeFormat.value === 'hex') return hexString.value;
  if (activeFormat.value === 'rgb') return rgbString.value;
  return oklchString.value;
});

const recommendedText = computed(() => getContrastTextColor(currentOklchObj.value, {
  light: props.lightText,
  dark: props.darkText,
  threshold: props.threshold,
  model: 'oklch',
}));

const isLightRecommended = computed(() => recommendedText.value === props.lightText);

const wcagLightRatio = computed(() => getWcagContrastRatio(currentOklchObj.value, props.lightText));
const wcagDarkRatio = computed(() => getWcagContrastRatio(currentOklchObj.value, props.darkText));

const getWcagBadge = (ratio) => {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA+';
  return 'LOW';
};

const lightBadge = computed(() => getWcagBadge(wcagLightRatio.value));
const darkBadge = computed(() => getWcagBadge(wcagDarkRatio.value));

const markerStyle = computed(() => {
  const radiusNorm = clamp(chroma.value / Math.max(0.01, props.maxChroma), 0, 1);
  const rad = (hue.value * Math.PI) / 180;
  const xPct = 50 + Math.cos(rad) * radiusNorm * 46;
  const yPct = 50 + Math.sin(rad) * radiusNorm * 46;
  return {
    left: `${xPct.toFixed(2)}%`,
    top: `${yPct.toFixed(2)}%`,
    backgroundColor: hexString.value,
  };
});

const lightnessGradient = computed(() => {
  const c = Number(chroma.value.toFixed(3));
  const h = Number(hue.value.toFixed(1));
  return `linear-gradient(to right, oklch(0 ${c} ${h}), oklch(0.5 ${c} ${h}), oklch(1 ${c} ${h}))`;
});

const emitUpdate = () => {
  const out = formattedValue.value;
  emit('update:modelValue', out);
  emit('change', {
    value: out,
    oklch: oklchString.value,
    hex: hexString.value,
    rgb: rgbString.value,
    lightness: lightness.value,
    chroma: chroma.value,
    hue: hue.value,
    contrastTextColor: recommendedText.value,
    wcagLight: wcagLightRatio.value,
    wcagDark: wcagDarkRatio.value,
  });
};

const updateFromPointer = (event) => {
  if (props.disabled || !discRef.value) return;
  const rect = discRef.value.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = event.clientX - cx;
  const dy = event.clientY - cy;
  const maxR = (Math.min(rect.width, rect.height) / 2) * 0.92;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const normDist = clamp(dist / Math.max(1, maxR), 0, 1);

  hue.value = normalizeAngle((Math.atan2(dy, dx) * 180) / Math.PI);
  chroma.value = Number((normDist * props.maxChroma).toFixed(3));
  emitUpdate();
};

const onDiscPointerDown = (event) => {
  if (props.disabled) return;
  isDraggingDisc.value = true;
  if (discRef.value && discRef.value.setPointerCapture) {
    try {
      discRef.value.setPointerCapture(event.pointerId);
    } catch {}
  }
  updateFromPointer(event);
};

const onDiscPointerMove = (event) => {
  if (!isDraggingDisc.value || props.disabled) return;
  updateFromPointer(event);
};

const onDiscPointerUp = (event) => {
  if (!isDraggingDisc.value) return;
  isDraggingDisc.value = false;
  if (discRef.value && discRef.value.releasePointerCapture) {
    try {
      discRef.value.releasePointerCapture(event.pointerId);
    } catch {}
  }
};

const onDiscKeyDown = (event) => {
  if (props.disabled) return;
  const hueStep = event.shiftKey ? 15 : 5;
  const chromaStep = event.shiftKey ? 0.02 : 0.005;

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    hue.value = normalizeAngle(hue.value + hueStep);
    emitUpdate();
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    hue.value = normalizeAngle(hue.value - hueStep);
    emitUpdate();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    chroma.value = clamp(Number((chroma.value + chromaStep).toFixed(3)), 0, props.maxChroma);
    emitUpdate();
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    chroma.value = clamp(Number((chroma.value - chromaStep).toFixed(3)), 0, props.maxChroma);
    emitUpdate();
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    emitUpdate();
  }
};

const onLightnessInput = (event) => {
  if (props.disabled) return;
  const val = parseFloat(event.target.value);
  if (Number.isFinite(val)) {
    lightness.value = clamp(val / 100, 0, 1);
    emitUpdate();
  }
};

const setFormat = (fmt) => {
  if (props.disabled) return;
  activeFormat.value = fmt;
  emit('update:format', fmt);
  emitUpdate();
};

const onTextChange = (event) => {
  if (props.disabled) return;
  const parsed = parseColor(event.target.value);
  if (parsed) {
    lightness.value = clamp(parsed.l, 0, 1);
    chroma.value = clamp(parsed.c, 0, props.maxChroma);
    hue.value = normalizeAngle(parsed.h);
    emitUpdate();
  }
};

const copyValue = async () => {
  const text = formattedValue.value;
  try {
    if (globalThis.navigator && globalThis.navigator.clipboard && globalThis.navigator.clipboard.writeText) {
      await globalThis.navigator.clipboard.writeText(text);
    }
    copied.value = true;
    emit('copy', text);
    setTimeout(() => {
      copied.value = false;
    }, 1400);
  } catch {
    emit('copy', text);
  }
};
</script>

<template>
  <div class="nano-oklch-picker" :class="{ 'is-disabled': disabled }">
    <div class="nano-oklch-top">
      <!-- Hue & Chroma Disc -->
      <div
        ref="discRef"
        class="nano-oklch-disc"
        role="slider"
        tabindex="0"
        aria-label="Hue and Chroma selector"
        :aria-valuenow="Math.round(hue)"
        aria-valuemin="0"
        aria-valuemax="360"
        @pointerdown="onDiscPointerDown"
        @pointermove="onDiscPointerMove"
        @pointerup="onDiscPointerUp"
        @pointercancel="onDiscPointerUp"
        @keydown="onDiscKeyDown"
      >
        <div class="nano-oklch-disc-wheel"></div>
        <div class="nano-oklch-disc-marker" :style="markerStyle"></div>
      </div>

      <!-- Live Contrast Preview Card -->
      <div
        class="nano-oklch-preview"
        :class="isLightRecommended ? 'is-light-recommended' : 'is-dark-recommended'"
        :style="{ backgroundColor: hexString, color: recommendedText }"
      >
        <div class="nano-oklch-preview-header">
          <span class="nano-oklch-preview-title">Live Contrast</span>
          <span class="nano-oklch-recommended-pill">
            {{ isLightRecommended ? 'Light' : 'Dark' }}
          </span>
        </div>

        <div class="nano-oklch-samples">
          <div
            class="nano-oklch-sample-row is-dark-sample"
            :class="{ 'is-optimal': !isLightRecommended }"
            :style="{ color: darkText }"
          >
            <span class="sample-label">Dark Aa</span>
            <span class="sample-ratio">{{ wcagDarkRatio.toFixed(1) }}:1 · {{ darkBadge }}</span>
          </div>
          <div
            class="nano-oklch-sample-row is-light-sample"
            :class="{ 'is-optimal': isLightRecommended }"
            :style="{ color: lightText }"
          >
            <span class="sample-label">Light Aa</span>
            <span class="sample-ratio">{{ wcagLightRatio.toFixed(1) }}:1 · {{ lightBadge }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Perceptual Lightness Slider (L) -->
    <div class="nano-oklch-slider-block">
      <div class="nano-oklch-slider-meta">
        <span class="slider-label">Perceptual Lightness (L)</span>
        <span class="slider-val">{{ Math.round(lightness * 100) }}%</span>
      </div>
      <div class="nano-oklch-slider-track" :style="{ background: lightnessGradient }">
        <input
          type="range"
          class="nano-oklch-range"
          min="0"
          max="100"
          step="0.5"
          :value="Number((lightness * 100).toFixed(1))"
          :disabled="disabled"
          aria-label="Perceptual Lightness"
          @input="onLightnessInput"
        />
      </div>
    </div>

    <!-- Format Switcher & Value Copy Bar (CLS = 0) -->
    <div class="nano-oklch-controls">
      <div class="nano-oklch-formats" role="tablist" aria-label="Color format">
        <button
          v-for="fmt in ['oklch', 'hex', 'rgb']"
          :key="fmt"
          type="button"
          role="tab"
          class="nano-oklch-format-btn"
          :class="{ 'is-active': activeFormat === fmt }"
          :aria-selected="activeFormat === fmt"
          :disabled="disabled"
          @click="setFormat(fmt)"
        >
          {{ fmt.toUpperCase() }}
        </button>
      </div>

      <div class="nano-oklch-input-row">
        <input
          type="text"
          class="nano-oklch-value-input"
          :value="formattedValue"
          :disabled="disabled"
          aria-label="Formatted color value"
          spellcheck="false"
          @change="onTextChange"
        />
        <button
          type="button"
          class="nano-oklch-copy-btn"
          :disabled="disabled"
          aria-label="Copy color value"
          @click="copyValue"
        >
          {{ copied ? 'Copied' : 'Copy' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nano-oklch-picker,
.nano-oklch-picker *,
.nano-oklch-picker *::before,
.nano-oklch-picker *::after {
  box-sizing: border-box;
}

.nano-oklch-picker {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  width: 100%;
  max-width: 360px;
  padding: 1rem;
  border-radius: var(--nano-radius-lg, 12px);
  background: var(--nano-bg-card, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.15));
  color: var(--nano-text-main, #f8fafc);
  user-select: none;
  -webkit-user-select: none;
}

.nano-oklch-picker.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.nano-oklch-top {
  display: grid;
  grid-template-columns: 128px 1fr;
  gap: 0.875rem;
  align-items: stretch;
}

.nano-oklch-disc {
  position: relative;
  width: 128px;
  height: 128px;
  border-radius: 50%;
  cursor: crosshair;
  outline: none;
  touch-action: none;
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.15));
  overflow: hidden;
  flex-shrink: 0;
}

.nano-oklch-disc:focus-visible {
  border-color: var(--nano-state-active, #00f2fe);
}

.nano-oklch-disc-wheel {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background:
    radial-gradient(circle closest-side, #808080 0%, transparent 100%),
    conic-gradient(
      from 90deg,
      oklch(0.7 0.25 0),
      oklch(0.7 0.25 60),
      oklch(0.7 0.25 120),
      oklch(0.7 0.25 180),
      oklch(0.7 0.25 240),
      oklch(0.7 0.25 300),
      oklch(0.7 0.25 360)
    );
}

.nano-oklch-disc-marker {
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.65);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.nano-oklch-preview {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0.75rem;
  border-radius: var(--nano-radius-md, 8px);
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.15));
  min-height: 128px;
  transition: background-color 80ms linear;
}

.nano-oklch-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 24px;
}

.nano-oklch-preview-title {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.nano-oklch-preview.is-light-recommended .nano-oklch-preview-title {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
}

.nano-oklch-preview.is-dark-recommended .nano-oklch-preview-title {
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
}

.nano-oklch-recommended-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 20px;
  padding: 0 0.5rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  background: rgba(15, 23, 42, 0.58);
  border: 1px solid rgba(255, 255, 255, 0.28);
  color: #ffffff;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.nano-oklch-samples {
  display: flex;
  flex-direction: column;
  gap: 0.38rem;
}

.nano-oklch-sample-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.28rem 0.5rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  border: 1.5px solid transparent;
  transition: background-color 100ms ease, border-color 100ms ease;
}

.nano-oklch-sample-row.is-dark-sample {
  background: rgba(255, 255, 255, 0.28);
  border-color: rgba(15, 23, 42, 0.18);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
}

.nano-oklch-sample-row.is-dark-sample:not(.is-optimal) {
  background: rgba(255, 255, 255, 0.68);
  border-color: rgba(255, 255, 255, 0.42);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.75);
}

.nano-oklch-sample-row.is-light-sample {
  background: rgba(15, 23, 42, 0.28);
  border-color: rgba(255, 255, 255, 0.22);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.nano-oklch-sample-row.is-light-sample:not(.is-optimal) {
  background: rgba(15, 23, 42, 0.66);
  border-color: rgba(15, 23, 42, 0.42);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.75);
}

.nano-oklch-sample-row.is-optimal {
  border-color: currentColor;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
}

.nano-oklch-slider-block {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.nano-oklch-slider-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--nano-text-main, #f8fafc);
  font-variant-numeric: tabular-nums;
  min-height: 18px;
}

.nano-oklch-slider-track {
  position: relative;
  height: 14px;
  border-radius: 7px;
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.15));
  display: flex;
  align-items: center;
}

.nano-oklch-range {
  width: 100%;
  height: 100%;
  margin: 0;
  background: transparent;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  outline: none;
}

.nano-oklch-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nano-oklch-formats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.25rem;
  padding: 0.2rem;
  border-radius: var(--nano-radius-md, 8px);
  background: var(--nano-bg-muted, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--nano-border-subtle, rgba(255, 255, 255, 0.08));
  min-height: 32px;
}

.nano-oklch-format-btn {
  height: 26px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--nano-text-secondary, #cbd5e1);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  transition: background-color 120ms ease, color 120ms ease;
}

.nano-oklch-format-btn.is-active {
  background: var(--nano-nav-active-bg, rgba(99, 102, 241, 0.18));
  color: var(--nano-text-main, #f8fafc);
}

.nano-oklch-input-row {
  display: grid;
  grid-template-columns: 1fr 68px;
  gap: 0.5rem;
  min-height: 34px;
}

.nano-oklch-value-input {
  width: 100%;
  height: 34px;
  padding: 0 0.65rem;
  border-radius: var(--nano-radius-md, 8px);
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.15));
  background: var(--nano-bg-code, #0f172a);
  color: var(--nano-text-main, #f8fafc);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  outline: none;
}

.nano-oklch-value-input:focus {
  border-color: var(--nano-state-active, #00f2fe);
}

.nano-oklch-copy-btn {
  height: 34px;
  width: 68px;
  border-radius: var(--nano-radius-md, 8px);
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.15));
  background: var(--nano-bg-hover, rgba(255, 255, 255, 0.1));
  color: var(--nano-text-main, #f8fafc);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  transition: border-color 120ms ease, background-color 120ms ease;
}

.nano-oklch-copy-btn:hover {
  border-color: var(--nano-border-hover, rgba(255, 255, 255, 0.3));
}
</style>
