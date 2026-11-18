<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import {
  parseColor,
  formatHex,
  formatRgb,
  formatOklch,
  oklchToRgb,
  getMaxOklchChroma,
  getContrastTextColor,
  getWcagContrastRatio,
} from '../utils/colors.js';
import { clamp, normalizeAngle } from '../utils/math.js';
import {
  findSafeSelectMount,
  computeSelectDropdownLayout,
  getPositionedReferenceEl,
} from '../utils/selectPositioning.js';

const isFn = (val) => Object.prototype.toString.call(val) === '[object Function]';
const isNum = (val) => Object.prototype.toString.call(val) === '[object Number]' && Number.isFinite(val);

const CURATED_OKLCH_PRESETS = [
  { name: 'Indigo', l: 0.62, c: 0.19, h: 272 },
  { name: 'Sky', l: 0.72, c: 0.15, h: 232 },
  { name: 'Cyan', l: 0.78, c: 0.14, h: 198 },
  { name: 'Emerald', l: 0.70, c: 0.17, h: 158 },
  { name: 'Amber', l: 0.78, c: 0.16, h: 78 },
  { name: 'Coral', l: 0.68, c: 0.18, h: 36 },
  { name: 'Rose', l: 0.64, c: 0.20, h: 12 },
  { name: 'Violet', l: 0.64, c: 0.21, h: 306 },
  { name: 'Gold', l: 0.83, c: 0.15, h: 92 },
  { name: 'Slate', l: 0.56, c: 0.03, h: 255 },
];

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
  mode: {
    type: String,
    default: 'inline',
    validator: (v) => ['inline', 'popover'].includes(v),
  },
  popover: {
    type: Boolean,
    default: false,
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  showValue: {
    type: Boolean,
    default: false,
  },
  showPresets: {
    type: Boolean,
    default: true,
  },
  showContrast: {
    type: Boolean,
    default: true,
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
  id: {
    type: String,
    default: '',
  },
  name: {
    type: String,
    default: '',
  },
  ariaLabel: {
    type: String,
    default: '',
  },
});

let oklchUidSeq = 0;

const emit = defineEmits(['update:modelValue', 'update:format', 'change', 'copy']);

const oklchAutoId = `nano-oklch-${++oklchUidSeq}`;
const resolvedId = computed(() => props.id || oklchAutoId);
const resolvedName = computed(() => props.name || resolvedId.value);
const isPopoverMode = computed(() => props.popover || props.mode === 'popover');

const activeFormat = ref(props.format || 'oklch');
const lightness = ref(0.65);
const chroma = ref(0.18);
const hue = ref(250);
const copied = ref(false);
let copyTimer = null;
let wheelRafId = 0;
let lastEmittedModelValue = '';
const rootRef = ref(null);
const triggerRef = ref(null);
const popoverPanelRef = ref(null);
const discRef = ref(null);
const wheelCanvasRef = ref(null);
const isDraggingDisc = ref(false);
const isOpen = ref(false);
const teleportTarget = ref('body');
const popoverStyle = ref({});

const effectiveGamutMaxChroma = (lVal, hVal) => {
  const gamutCap = getMaxOklchChroma(lVal, hVal, Math.max(0.4, props.maxChroma));
  return Math.max(0.0001, Math.min(props.maxChroma, gamutCap));
};

const syncFromModel = (val) => {
  if (isDraggingDisc.value || (val && val === lastEmittedModelValue)) return;
  const parsed = parseColor(val);
  if (!parsed) return;
  const nextL = clamp(parsed.l, 0, 1);
  const nextH = parsed.c > 0.0005 ? normalizeAngle(parsed.h) : hue.value;
  const maxC = effectiveGamutMaxChroma(nextL, nextH);
  lightness.value = nextL;
  hue.value = nextH;
  chroma.value = clamp(parsed.c, 0, maxC);
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

const presetItems = computed(() =>
  CURATED_OKLCH_PRESETS.map((item) => {
    const safeC = Math.min(item.c, effectiveGamutMaxChroma(item.l, item.h));
    const hex = formatHex({ l: item.l, c: safeC, h: item.h });
    return {
      ...item,
      c: safeC,
      hex,
      isActive: hex.toLowerCase() === hexString.value.toLowerCase(),
    };
  })
);

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
  const maxC = effectiveGamutMaxChroma(lightness.value, hue.value);
  const radiusNorm = clamp(chroma.value / maxC, 0, 1);
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
  const stops = [0, 0.2, 0.4, 0.5, 0.65, 0.82, 1].map((lStop) => {
    const safeC = Math.min(c, effectiveGamutMaxChroma(lStop, h));
    const rgb = oklchToRgb(lStop, safeC, h);
    const pct = Math.round(lStop * 100);
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b}) ${pct}%`;
  });
  return `linear-gradient(to right, ${stops.join(', ')})`;
});

const renderPolarWheelCanvas = () => {
  wheelRafId = 0;
  const canvas = wheelCanvasRef.value;
  if (!canvas || !isFn(canvas.getContext)) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = 160;
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size;
    canvas.height = size;
  }

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = size * 0.5;
  const radius = half - 0.5;
  const curL = clamp(lightness.value, 0, 1);

  const maxChromaLut = new Float32Array(360);
  for (let deg = 0; deg < 360; deg++) {
    maxChromaLut[deg] = effectiveGamutMaxChroma(curL, deg);
  }

  for (let py = 0; py < size; py++) {
    const dy = py + 0.5 - half;
    for (let px = 0; px < size; px++) {
      const dx = px + 0.5 - half;
      const dist = Math.hypot(dx, dy);
      const offset = (py * size + px) * 4;
      if (dist > radius + 1) {
        data[offset + 3] = 0;
        continue;
      }
      const normR = clamp(dist / (radius * 0.96), 0, 1);
      const hueDeg = normalizeAngle((Math.atan2(dy, dx) * 180) / Math.PI);
      const hIdx = Math.floor(hueDeg) % 360;
      const hNext = (hIdx + 1) % 360;
      const frac = hueDeg - Math.floor(hueDeg);
      const maxC = maxChromaLut[hIdx] * (1 - frac) + maxChromaLut[hNext] * frac;
      const rgb = oklchToRgb(curL, normR * maxC, hueDeg);
      const edgeAlpha = dist > radius - 0.8 ? clamp(radius + 0.6 - dist, 0, 1) : 1;
      data[offset] = rgb.r;
      data[offset + 1] = rgb.g;
      data[offset + 2] = rgb.b;
      data[offset + 3] = Math.round(edgeAlpha * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
};

const scheduleWheelRender = () => {
  if (!isFn(globalThis.requestAnimationFrame)) {
    renderPolarWheelCanvas();
    return;
  }
  if (wheelRafId) return;
  wheelRafId = globalThis.requestAnimationFrame(renderPolarWheelCanvas);
};

const updatePopoverPosition = ({ forceResolveMount = false } = {}) => {
  if (!isPopoverMode.value || (!isOpen.value && !forceResolveMount) || !triggerRef.value || !globalThis.window) return;
  const win = globalThis.window;
  const { mountEl, viewportEl } = findSafeSelectMount(triggerRef.value, 368);
  const useAncestorMount = Boolean(mountEl && mountEl.nodeType === 1);
  teleportTarget.value = useAncestorMount ? mountEl : 'body';

  const triggerRect = triggerRef.value.getBoundingClientRect();
  const screenRect =
    viewportEl && isFn(viewportEl.getBoundingClientRect)
      ? viewportEl.getBoundingClientRect()
      : {
        top: 0,
        left: 0,
        right: win.innerWidth || 1024,
        bottom: win.innerHeight || 768,
        width: win.innerWidth || 1024,
        height: win.innerHeight || 768,
      };

  const refEl = useAncestorMount ? getPositionedReferenceEl(mountEl) : null;
  const refRect = refEl && isFn(refEl.getBoundingClientRect)
    ? refEl.getBoundingClientRect()
    : { top: 0, left: 0 };
  const scrollLeft = useAncestorMount && refEl ? (refEl.scrollLeft || 0) : 0;
  const scrollTop = useAncestorMount && refEl ? (refEl.scrollTop || 0) : 0;

  const actualH = popoverPanelRef.value?.offsetHeight || 346;
  const panelWidth = Math.min(348, Math.max(296, (screenRect.width || 360) - 16));
  const layout = computeSelectDropdownLayout({
    triggerRect,
    screenRect,
    mountRect: refRect,
    mountScrollLeft: scrollLeft,
    mountScrollTop: scrollTop,
    searchable: false,
    optionsCount: 8,
    maxDropdownHeight: actualH,
    actualDropdownHeight: actualH,
    actualChromeHeight: 0,
    optionsScrollHeight: actualH,
    gap: 6,
    edgeMargin: 8,
  });

  const maxLeft = useAncestorMount
    ? Math.max(8, (screenRect.width || 1024) - panelWidth - 8)
    : Math.max(8, (win.innerWidth || 1024) - panelWidth - 8);
  const clampedLeft = Math.min(maxLeft, Math.max(8, Math.round(Number(layout.left) || 0)));

  popoverStyle.value = {
    position: useAncestorMount ? 'absolute' : 'fixed',
    top: `${Math.round(Number(layout.top) || 0)}px`,
    left: `${clampedLeft}px`,
    width: `${panelWidth}px`,
    zIndex: 10055,
  };
};

const openPopover = async () => {
  if (props.disabled || !isPopoverMode.value) return;
  updatePopoverPosition({ forceResolveMount: true });
  isOpen.value = true;
  await nextTick();
  updatePopoverPosition();
  renderPolarWheelCanvas();
};

const stopDiscDrag = (pointerId = undefined) => {
  if (!isDraggingDisc.value) return;
  isDraggingDisc.value = false;
  if (pointerId !== undefined && discRef.value && discRef.value.releasePointerCapture) {
    try {
      discRef.value.releasePointerCapture(pointerId);
    } catch {}
  }
  if (globalThis.window) {
    globalThis.window.removeEventListener('pointermove', onWindowDiscPointerMove);
    globalThis.window.removeEventListener('pointerup', onWindowDiscPointerUp);
    globalThis.window.removeEventListener('pointercancel', onWindowDiscPointerUp);
  }
};

const closePopover = () => {
  stopDiscDrag();
  isOpen.value = false;
};

const togglePopover = () => {
  if (isOpen.value) {
    closePopover();
  } else {
    openPopover();
  }
};

const handleOutsidePointerDown = (event) => {
  if (!isPopoverMode.value || !isOpen.value) return;
  const target = event.target;
  if (rootRef.value && rootRef.value.contains(target)) return;
  if (popoverPanelRef.value && popoverPanelRef.value.contains(target)) return;
  closePopover();
};

const handleWindowKeyDown = (event) => {
  if (!isPopoverMode.value || !isOpen.value) return;
  if (event.key === 'Escape') {
    event.stopPropagation();
    event.preventDefault();
    closePopover();
  }
};

onMounted(() => {
  if (!isPopoverMode.value) {
    renderPolarWheelCanvas();
  }
  if (globalThis.window) {
    globalThis.window.addEventListener('pointerdown', handleOutsidePointerDown, true);
    globalThis.window.addEventListener('keydown', handleWindowKeyDown, true);
    globalThis.window.addEventListener('resize', updatePopoverPosition);
    globalThis.window.addEventListener('scroll', updatePopoverPosition, true);
  }
});

watch(() => [lightness.value, props.maxChroma], () => {
  if (!isPopoverMode.value || isOpen.value) {
    scheduleWheelRender();
  }
});

watch(isPopoverMode, async (nextPopover) => {
  if (!nextPopover) {
    isOpen.value = false;
    await nextTick();
    renderPolarWheelCanvas();
  }
});

const emitUpdate = () => {
  const out = formattedValue.value;
  lastEmittedModelValue = out;
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

const selectPreset = (preset) => {
  if (props.disabled) return;
  lightness.value = clamp(preset.l, 0, 1);
  hue.value = normalizeAngle(preset.h);
  chroma.value = clamp(preset.c, 0, effectiveGamutMaxChroma(lightness.value, hue.value));
  emitUpdate();
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

  const nextHue = normalizeAngle((Math.atan2(dy, dx) * 180) / Math.PI);
  const maxC = effectiveGamutMaxChroma(lightness.value, nextHue);
  hue.value = nextHue;
  chroma.value = Number((normDist * maxC).toFixed(4));
  emitUpdate();
};

const onWindowDiscPointerMove = (event) => {
  if (!isDraggingDisc.value || props.disabled) return;
  updateFromPointer(event);
};

const onWindowDiscPointerUp = (event) => {
  stopDiscDrag(event?.pointerId);
};

const onDiscPointerDown = (event) => {
  if (props.disabled || (event.button !== undefined && event.button !== 0)) return;
  if (isFn(event.preventDefault)) event.preventDefault();
  if (discRef.value && isFn(discRef.value.focus)) {
    try {
      discRef.value.focus({ preventScroll: true });
    } catch {
      discRef.value.focus();
    }
  }
  isDraggingDisc.value = true;
  if (discRef.value && discRef.value.setPointerCapture) {
    try {
      discRef.value.setPointerCapture(event.pointerId);
    } catch {}
  }
  if (globalThis.window) {
    globalThis.window.addEventListener('pointermove', onWindowDiscPointerMove);
    globalThis.window.addEventListener('pointerup', onWindowDiscPointerUp);
    globalThis.window.addEventListener('pointercancel', onWindowDiscPointerUp);
  }
  updateFromPointer(event);
};

const onDiscPointerMove = (event) => {
  if (!isDraggingDisc.value || props.disabled) return;
  updateFromPointer(event);
};

const onDiscPointerUp = (event) => {
  stopDiscDrag(event?.pointerId);
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
    const prevMaxC = effectiveGamutMaxChroma(lightness.value, hue.value);
    const satRatio = clamp(chroma.value / prevMaxC, 0, 1);
    const nextL = clamp(val / 100, 0, 1);
    const nextMaxC = effectiveGamutMaxChroma(nextL, hue.value);
    lightness.value = nextL;
    chroma.value = Number((satRatio * nextMaxC).toFixed(4));
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
    if (globalThis.navigator?.clipboard?.writeText) {
      await globalThis.navigator.clipboard.writeText(text);
    }
    copied.value = true;
    emit('copy', text);
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copied.value = false;
      copyTimer = null;
    }, 1400);
  } catch {
    emit('copy', text);
  }
};

onUnmounted(() => {
  stopDiscDrag();
  if (copyTimer) {
    clearTimeout(copyTimer);
    copyTimer = null;
  }
  if (wheelRafId && isFn(globalThis.cancelAnimationFrame)) {
    globalThis.cancelAnimationFrame(wheelRafId);
    wheelRafId = 0;
  }
  if (globalThis.window) {
    globalThis.window.removeEventListener('pointerdown', handleOutsidePointerDown, true);
    globalThis.window.removeEventListener('keydown', handleWindowKeyDown, true);
    globalThis.window.removeEventListener('resize', updatePopoverPosition);
    globalThis.window.removeEventListener('scroll', updatePopoverPosition, true);
  }
});

const setOklch = (l, c, h) => {
  if (props.disabled) return;
  if (isNum(l)) lightness.value = clamp(l, 0, 1);
  if (isNum(c)) chroma.value = clamp(c, 0, props.maxChroma);
  if (isNum(h)) hue.value = normalizeAngle(h);
  emitUpdate();
};

defineExpose({
  copyValue,
  setOklch,
  openPopover,
  closePopover,
  togglePopover,
  isOpen,
  lightness,
  chroma,
  hue,
  hexString,
  formattedValue,
  wcagDarkRatio,
  wcagLightRatio,
});
</script>

<template>
  <div
    ref="rootRef"
    class="nano-oklch-host"
    :class="{
      'is-popover-host': isPopoverMode,
      'is-disabled': disabled,
    }"
  >
    <!-- Compact Swatch Trigger (Popover Mode — replaces native input[type=color]) -->
    <button
      v-if="isPopoverMode"
      :id="resolvedId"
      ref="triggerRef"
      :name="resolvedName"
      type="button"
      class="nano-oklch-swatch-trigger"
      :class="[
        `is-${size}`,
        { 'has-value-label': showValue, 'is-open': isOpen, 'is-disabled': disabled }
      ]"
      :disabled="disabled"
      :aria-expanded="isOpen"
      :aria-label="ariaLabel || `Select color (${formattedValue})`"
      @click="togglePopover"
    >
      <span class="nano-oklch-swatch-chip" :style="{ backgroundColor: hexString }"></span>
      <span v-if="showValue" class="nano-oklch-swatch-code">{{ formattedValue }}</span>
      <svg
        v-if="showValue"
        class="nano-oklch-swatch-chevron"
        viewBox="0 0 12 12"
        width="11"
        height="11"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="2.5 4.5 6 8 9.5 4.5" />
      </svg>
    </button>

    <!-- Teleported Floating Panel (Popover Mode) -->
    <Teleport v-if="isPopoverMode" :to="teleportTarget">
      <div
        v-if="isOpen"
        ref="popoverPanelRef"
        class="nano-oklch-picker is-floating"
        :class="{ 'is-disabled': disabled }"
        :style="popoverStyle"
        role="dialog"
        aria-modal="false"
        :aria-label="ariaLabel || 'OKLCH Color Picker'"
      >
        <div class="nano-oklch-top" :class="{ 'is-single-col': !showContrast }">
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
            <div class="nano-oklch-disc-wheel">
              <canvas ref="wheelCanvasRef" class="nano-oklch-disc-canvas" aria-hidden="true"></canvas>
            </div>
            <div class="nano-oklch-disc-marker" :style="markerStyle"></div>
          </div>

          <div
            v-if="showContrast"
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

        <div class="nano-oklch-slider-block">
          <div class="nano-oklch-slider-meta">
            <span class="slider-label">Perceptual Lightness (L)</span>
            <span class="slider-val">{{ Math.round(lightness * 100) }}%</span>
          </div>
          <div class="nano-oklch-slider-track" :style="{ backgroundImage: lightnessGradient }">
            <input
              :id="`${resolvedId}-lightness`"
              :name="`${resolvedName}-lightness`"
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

        <div v-if="showPresets" class="nano-oklch-presets" role="group" aria-label="Perceptual color presets">
          <button
            v-for="preset in presetItems"
            :key="preset.name"
            type="button"
            class="nano-oklch-preset-swatch"
            :class="{ 'is-active': preset.isActive }"
            :style="{ backgroundColor: preset.hex }"
            :aria-label="`${preset.name} (${preset.hex})`"
            :disabled="disabled"
            @click="selectPreset(preset)"
          ></button>
        </div>

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
              :id="`${resolvedId}-value`"
              :name="`${resolvedName}-value`"
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
    </Teleport>

    <!-- Full Inline Studio Card (Default Mode) -->
    <div v-else class="nano-oklch-picker" :class="{ 'is-disabled': disabled }">
      <div class="nano-oklch-top" :class="{ 'is-single-col': !showContrast }">
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
          <div class="nano-oklch-disc-wheel">
            <canvas ref="wheelCanvasRef" class="nano-oklch-disc-canvas" aria-hidden="true"></canvas>
          </div>
          <div class="nano-oklch-disc-marker" :style="markerStyle"></div>
        </div>

        <!-- Live Contrast Preview Card -->
        <div
          v-if="showContrast"
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
        <div class="nano-oklch-slider-track" :style="{ backgroundImage: lightnessGradient }">
          <input
            :id="`${resolvedId}-lightness`"
            :name="`${resolvedName}-lightness`"
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

      <!-- Curated Perceptual Swatch Presets -->
      <div v-if="showPresets" class="nano-oklch-presets" role="group" aria-label="Perceptual color presets">
        <button
          v-for="preset in presetItems"
          :key="preset.name"
          type="button"
          class="nano-oklch-preset-swatch"
          :class="{ 'is-active': preset.isActive }"
          :style="{ backgroundColor: preset.hex }"
          :aria-label="`${preset.name} (${preset.hex})`"
          :disabled="disabled"
          @click="selectPreset(preset)"
        ></button>
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
            :id="`${resolvedId}-value`"
            :name="`${resolvedName}-value`"
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
  </div>
</template>

<style scoped>
.nano-oklch-host {
  display: inline-flex;
  max-width: 100%;
  box-sizing: border-box;
}

.nano-oklch-host:not(.is-popover-host) {
  display: flex;
  width: 100%;
  max-width: 360px;
}

.nano-oklch-swatch-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 3px;
  border-radius: var(--nano-radius-sm, 7px);
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.2));
  background: var(--nano-bg-card, rgba(255, 255, 255, 0.05));
  color: var(--nano-text-main, #f8fafc);
  cursor: pointer;
  outline: none;
  box-sizing: border-box;
  flex-shrink: 0;
  user-select: none;
  -webkit-user-select: none;
  transition: border-color 140ms ease, box-shadow 140ms ease, background-color 140ms ease;
}

.nano-oklch-swatch-trigger.is-sm {
  height: 32px;
  min-width: 32px;
}

.nano-oklch-swatch-trigger.is-md {
  height: 36px;
  min-width: 36px;
}

.nano-oklch-swatch-trigger.is-lg {
  height: 40px;
  min-width: 40px;
}

.nano-oklch-swatch-trigger.has-value-label {
  padding: 0 0.65rem 0 0.35rem;
}

.nano-oklch-swatch-trigger:hover:not(.is-disabled) {
  border-color: var(--nano-border-hover, rgba(255, 255, 255, 0.42));
  background: var(--nano-bg-hover, rgba(255, 255, 255, 0.08));
}

.nano-oklch-swatch-trigger.is-open,
.nano-oklch-swatch-trigger:focus-visible {
  border-color: var(--nano-state-active, #38bdf8);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--nano-state-active, #38bdf8) 28%, transparent);
}

.nano-oklch-swatch-trigger.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.nano-oklch-swatch-chip {
  width: 22px;
  height: 22px;
  border-radius: 5px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.24);
  flex-shrink: 0;
}

.nano-oklch-swatch-trigger.is-md .nano-oklch-swatch-chip {
  width: 24px;
  height: 24px;
}

.nano-oklch-swatch-trigger.is-lg .nano-oklch-swatch-chip {
  width: 28px;
  height: 28px;
}

.nano-oklch-swatch-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.76rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.nano-oklch-swatch-chevron {
  opacity: 0.68;
  flex-shrink: 0;
}

.nano-oklch-picker,
.nano-oklch-picker *,
.nano-oklch-picker *::before,
.nano-oklch-picker *::after {
  box-sizing: border-box;
}

.nano-oklch-picker {
  display: flex;
  flex-direction: column;
  gap: 0.78rem;
  width: 100%;
  max-width: 360px;
  padding: 0.95rem;
  border-radius: var(--nano-radius-lg, 12px);
  background: var(--nano-bg-card, rgba(15, 23, 42, 0.94));
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.15));
  color: var(--nano-text-main, #f8fafc);
  forced-color-adjust: none;
  user-select: none;
  -webkit-user-select: none;
}

.nano-oklch-picker.is-floating {
  background: var(--nano-bg-card-elevated, var(--nano-bg-card, #0f172a));
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow: var(--nano-shadow-popover, 0 18px 42px rgba(2, 6, 23, 0.45));
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

.nano-oklch-top.is-single-col {
  grid-template-columns: 1fr;
  justify-items: center;
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
  position: relative;
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

.nano-oklch-disc-canvas {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  pointer-events: none;
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
  padding: 0.72rem;
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
  font-size: 0.74rem;
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
  font-size: 0.76rem;
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
  gap: 0.4rem;
}

.nano-oklch-slider-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.1rem;
  font-size: 0.76rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--nano-text-secondary, #cbd5e1);
  font-variant-numeric: tabular-nums;
  min-height: 18px;
}

.nano-oklch-slider-meta .slider-val {
  color: var(--nano-text-main, #f8fafc);
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.nano-oklch-slider-track {
  position: relative;
  height: 14px;
  border-radius: 999px;
  background-origin: border-box;
  background-clip: border-box;
  background-repeat: no-repeat;
  box-shadow:
    inset 0 0 0 1px var(--nano-border-card, rgba(255, 255, 255, 0.22)),
    inset 0 1px 2px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
}

.nano-oklch-range {
  width: 100%;
  height: 20px;
  margin: 0;
  background: transparent;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  outline: none;
}

.nano-oklch-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid #0f172a;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.85);
  cursor: grab;
  transition: box-shadow 120ms ease;
}

.nano-oklch-range::-webkit-slider-thumb:hover {
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.65), 0 0 0 3px rgba(56, 189, 248, 0.35);
}

.nano-oklch-range::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid #0f172a;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.85);
  cursor: grab;
  transition: box-shadow 120ms ease;
}

.nano-oklch-presets {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 0.35rem;
  align-items: center;
}

.nano-oklch-preset-swatch {
  width: 100%;
  aspect-ratio: 1 / 1;
  min-height: 22px;
  padding: 0;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.22);
  cursor: pointer;
  outline: none;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.nano-oklch-preset-swatch:hover:not(:disabled) {
  border-color: #ffffff;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.28);
}

.nano-oklch-preset-swatch.is-active {
  border-color: #ffffff;
  box-shadow: 0 0 0 2px var(--nano-state-active, #38bdf8);
}

.nano-oklch-controls {
  display: flex;
  flex-direction: column;
  gap: 0.52rem;
}

.nano-oklch-formats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.25rem;
  padding: 0.22rem;
  border-radius: var(--nano-radius-md, 8px);
  background: var(--nano-bg-code, rgba(15, 23, 42, 0.65));
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.14));
  min-height: 34px;
}

.nano-oklch-format-btn {
  height: 26px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--nano-text-secondary, #94a3b8);
  font-size: 0.73rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  outline: none;
  transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease;
}

.nano-oklch-format-btn:hover:not(.is-active) {
  color: var(--nano-text-main, #f8fafc);
  background: rgba(255, 255, 255, 0.05);
}

.nano-oklch-format-btn.is-active {
  background: var(--nano-nav-active-bg, rgba(99, 102, 241, 0.22));
  border-color: rgba(99, 102, 241, 0.42);
  color: var(--nano-text-main, #f8fafc);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.nano-oklch-input-row {
  display: grid;
  grid-template-columns: 1fr 74px;
  gap: 0.5rem;
  align-items: center;
  min-height: 36px;
}

.nano-oklch-value-input {
  width: 100%;
  height: 36px;
  padding: 0 0.75rem;
  border-radius: var(--nano-radius-md, 8px);
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.18));
  background: var(--nano-bg-code, #0f172a);
  color: var(--nano-text-main, #f8fafc);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  font-variant-numeric: tabular-nums;
  outline: none;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.nano-oklch-value-input:focus {
  border-color: var(--nano-state-active, #00f2fe);
  box-shadow: 0 0 0 2px rgba(0, 242, 254, 0.15);
}

.nano-oklch-copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  width: 74px;
  padding: 0 0.65rem;
  border-radius: var(--nano-radius-md, 8px);
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.2));
  background: var(--nano-bg-hover, rgba(255, 255, 255, 0.08));
  color: var(--nano-text-main, #f8fafc);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  outline: none;
  transition: border-color 120ms ease, background-color 120ms ease;
}

.nano-oklch-copy-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: var(--nano-border-hover, rgba(255, 255, 255, 0.36));
}
</style>
