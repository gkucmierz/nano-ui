<script setup>
import { tooltipState } from '../composables/useTooltip.js';
import { buildTooltipBubbleGeometry } from '../utils/tooltipGeometry.js';
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';

const tooltipRef = ref(null);
const x = ref(0);
const y = ref(0);
const arrowX = ref(0);
const boxWidth = ref(160);
const boxHeight = ref(36);
const boxRadius = ref(9);
const isBottom = ref(false);
const isPositioned = ref(false);

const GAP = 12;
const BUBBLE_PAD = 8;

let resizeObserver = null;

const syncBoxDimensions = () => {
  const el = tooltipRef.value;
  if (!el) return false;
  const w = el.offsetWidth || el.getBoundingClientRect().width;
  const h = el.offsetHeight || el.getBoundingClientRect().height;
  if (w <= 0 || h <= 0) return false;
  boxWidth.value = Math.round(w * 2) / 2;
  boxHeight.value = Math.round(h * 2) / 2;
  if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    const cs = window.getComputedStyle(el);
    const parsedRadius = parseFloat(cs.getPropertyValue('--nu-tooltip-radius')) || parseFloat(cs.borderTopLeftRadius);
    if (Number.isFinite(parsedRadius) && parsedRadius >= 0) {
      boxRadius.value = parsedRadius;
    }
  }
  return true;
};

const bubbleGeometry = computed(() =>
  buildTooltipBubbleGeometry({
    width: boxWidth.value,
    height: boxHeight.value,
    radius: boxRadius.value,
    arrowX: arrowX.value,
    arrowHalfWidth: 6.5,
    arrowHeight: 6,
    isBottom: isBottom.value,
    pad: BUBBLE_PAD,
  })
);

const computePlacementFromElement = () => {
  if (!tooltipState.isVisible || !tooltipRef.value || !tooltipState.targetRect) return false;
  if (!syncBoxDimensions()) return false;

  const rect = tooltipState.targetRect;
  const tooltipWidth = boxWidth.value;
  const tooltipHeight = boxHeight.value;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const spaceAbove = rect.top;
  const spaceBelow = viewportHeight - rect.bottom;

  // Vertical positioning (prefer above with 12px gap so arrow tip has clean clearance above button border)
  let top = rect.top - tooltipHeight - GAP;
  isBottom.value = false;

  if (top < 8 || (spaceAbove < tooltipHeight + GAP && spaceBelow > spaceAbove)) {
    top = rect.bottom + GAP;
    isBottom.value = true;
  }

  // Clamp bottom to viewport if it still overflows
  if (top + tooltipHeight > viewportHeight - 8) {
    top = Math.max(8, viewportHeight - tooltipHeight - 8);
  }
  if (top < 8) {
    top = 8;
  }

  // Horizontal positioning
  const idealCenter = rect.left + rect.width / 2;
  const left = idealCenter - tooltipWidth / 2;

  // Bounds checking for left/right
  const minLeft = 8;
  const maxLeft = Math.max(minLeft, viewportWidth - tooltipWidth - 8);
  const actualLeft = Math.max(minLeft, Math.min(maxLeft, left));

  // Difference between ideal target center and actual tooltip box center
  const calculatedArrowX = idealCenter - (actualLeft + tooltipWidth / 2);

  // Safe inset = arrowHalfWidth (6.5px) + shoulderRounding (1px) + cornerRadius (9px) + margin (2.5px) = 19px
  const arrowSafeInset = 19;
  const maxArrowOffset = Math.max(0, tooltipWidth / 2 - arrowSafeInset);
  const clampedArrowX = Math.max(-maxArrowOffset, Math.min(maxArrowOffset, calculatedArrowX));

  arrowX.value = clampedArrowX;
  x.value = Math.round(actualLeft);
  y.value = Math.round(top);
  return true;
};

const updatePosition = async () => {
  if (!tooltipState.isVisible || !tooltipState.targetRect) {
    isPositioned.value = false;
    return;
  }

  // Wait for DOM to finish rendering new text before revealing at exact target coordinates
  await nextTick();
  if (!tooltipState.isVisible || !tooltipRef.value || !tooltipState.targetRect) return;

  computePlacementFromElement();
  isPositioned.value = true;
};

// Reactively re-calculate position whenever visibility, text, or targetRect changes
watch(
  [() => tooltipState.isVisible, () => tooltipState.text, () => tooltipState.targetRect],
  async ([visible]) => {
    if (visible) {
      await updatePosition();
    } else {
      isPositioned.value = false;
    }
  },
  { deep: true }
);

onMounted(() => {
  window.addEventListener('resize', updatePosition, { passive: true });
  if (typeof ResizeObserver !== 'undefined' && tooltipRef.value) {
    resizeObserver = new ResizeObserver(() => {
      if (tooltipState.isVisible) {
        computePlacementFromElement();
      }
    });
    resizeObserver.observe(tooltipRef.value);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', updatePosition);
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});
</script>

<template>
  <div
    ref="tooltipRef"
    role="tooltip"
    :class="[
      'global-tooltip',
      {
        visible: tooltipState.isVisible && isPositioned,
        'tooltip-bottom': isBottom,
      },
      tooltipState.customClass,
    ]"
    :style="{
      transform: `translate3d(${x}px, ${y}px, 0)`,
      '--arrow-offset': `${bubbleGeometry.clampedArrowX}px`,
    }"
  >
    <!-- Layer 1: Unified Glassmorphic Backdrop Blur clipped to exact speech-bubble + arrow contour -->
    <div
      class="global-tooltip-glass"
      aria-hidden="true"
      :style="{
        top: `${-bubbleGeometry.pad}px`,
        left: `${-bubbleGeometry.pad}px`,
        width: `${bubbleGeometry.svgWidth}px`,
        height: `${bubbleGeometry.svgHeight}px`,
        clipPath: `path('${bubbleGeometry.clipPathD}')`,
      }"
    ></div>

    <!-- Layer 2: Single Continuous C¹ Vector Speech-Bubble Fill + 1px Perimeter Stroke (zero base line under arrow) -->
    <svg
      class="global-tooltip-bubble-svg"
      aria-hidden="true"
      :width="bubbleGeometry.svgWidth"
      :height="bubbleGeometry.svgHeight"
      :viewBox="bubbleGeometry.viewBox"
      :style="{
        top: `${-bubbleGeometry.pad}px`,
        left: `${-bubbleGeometry.pad}px`,
        width: `${bubbleGeometry.svgWidth}px`,
        height: `${bubbleGeometry.svgHeight}px`,
      }"
    >
      <path class="global-tooltip-bubble-path" :d="bubbleGeometry.svgPathD" />
    </svg>

    <!-- Layer 3: Clamped Balanced Text Copy -->
    <span class="global-tooltip-text">{{ tooltipState.text }}</span>
  </div>
</template>

<style scoped>
.global-tooltip {
  /* Generic Styling Variables */
  --nu-tooltip-bg: var(--nano-tooltip-bg, rgba(15, 23, 42, 0.92));
  --nu-tooltip-color: var(--nano-tooltip-color, #f8fafc);
  --nu-tooltip-radius: var(--nano-tooltip-radius, var(--nano-radius-md, 9px));
  --nu-tooltip-padding: var(--nano-tooltip-padding, 8px 14px);
  --nu-tooltip-shadow: var(--nano-tooltip-shadow, 0 10px 28px rgba(0, 0, 0, 0.45));
  --nu-tooltip-border: var(--nano-tooltip-border, 1px solid rgba(148, 163, 184, 0.24));
  --nu-tooltip-arrow-border: var(--nano-tooltip-arrow-border, rgba(148, 163, 184, 0.28));

  position: fixed;
  top: 0;
  left: 0;
  z-index: 99999;
  box-sizing: border-box;
  background: transparent;
  border: none;
  color: var(--nu-tooltip-color);
  padding: var(--nu-tooltip-padding);
  border-radius: var(--nu-tooltip-radius);
  font-size: 0.82rem;
  font-weight: 500;
  width: max-content;
  max-width: min(var(--nano-tooltip-max-width, 380px), calc(100vw - 24px));
  text-align: center;
  line-height: 1.42;
  white-space: normal;
  word-wrap: break-word;
  pointer-events: none;
  /* Transition ONLY opacity so singleton tooltip never slides diagonally across viewport from stale (x,y) */
  transition: opacity 0.14s ease;
  opacity: 0;
  visibility: hidden;
}

.global-tooltip-glass {
  position: absolute;
  z-index: 0;
  pointer-events: none;
  backdrop-filter: blur(var(--nano-blur-md, 10px));
  -webkit-backdrop-filter: blur(var(--nano-blur-md, 10px));
}

.global-tooltip-bubble-svg {
  position: absolute;
  z-index: 1;
  display: block;
  max-width: none;
  max-height: none;
  overflow: visible;
  pointer-events: none;
  filter: drop-shadow(0 8px 22px rgba(0, 0, 0, 0.36));
}

.global-tooltip-bubble-path {
  fill: var(--nu-tooltip-bg);
  stroke: var(--nu-tooltip-arrow-border);
  stroke-width: 1px;
  vector-effect: non-scaling-stroke;
}

.global-tooltip-text {
  position: relative;
  z-index: 2;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--nano-tooltip-max-lines, 4);
  line-clamp: var(--nano-tooltip-max-lines, 4);
  max-height: calc(1.42em * var(--nano-tooltip-max-lines, 4));
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  text-wrap: balance;
}

.global-tooltip.visible {
  opacity: 1;
  visibility: visible;
}
</style>
