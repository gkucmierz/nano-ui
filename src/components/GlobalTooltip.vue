<script setup>
import { tooltipState } from '../composables/useTooltip.js';
import { buildTooltipBubbleGeometry, computeTightTooltipWidth } from '../utils/tooltipGeometry.js';
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';

const tooltipRef = ref(null);
const textRef = ref(null);
const x = ref(0);
const y = ref(0);
const arrowX = ref(0);
const boxWidth = ref(140);
const boxHeight = ref(28);
const boxRadius = ref(7);
const isBottom = ref(false);
const isPositioned = ref(false);

const GAP = 10;
const BUBBLE_PAD = 8;

let resizeObserver = null;

const syncBoxDimensions = () => {
  const el = tooltipRef.value;
  if (!el) return false;

  // 1. Reset inline width so CSS lays out natural max-content up to --nano-tooltip-max-width
  el.style.width = '';

  const naturalW = el.offsetWidth || el.getBoundingClientRect().width;
  const naturalH = el.offsetHeight || el.getBoundingClientRect().height;
  if (naturalW <= 0 || naturalH <= 0) return false;

  let padLeft = 10;
  let padRight = 10;
  let borderLeft = 0;
  let borderRight = 0;

  if (globalThis.window?.getComputedStyle) {
    const cs = globalThis.window.getComputedStyle(el);
    padLeft = parseFloat(cs.paddingLeft) || 0;
    padRight = parseFloat(cs.paddingRight) || 0;
    borderLeft = parseFloat(cs.borderLeftWidth) || 0;
    borderRight = parseFloat(cs.borderRightWidth) || 0;
    const parsedRadius =
      parseFloat(cs.getPropertyValue('--nu-tooltip-radius')) || parseFloat(cs.borderTopLeftRadius);
    if (Number.isFinite(parsedRadius) && parsedRadius >= 0) {
      boxRadius.value = parsedRadius;
    }
  }

  // 2. Shrink-wrap around post-wrap balanced glyph lines (eliminates dead side margins when max-width triggers text-wrap: balance)
  if (textRef.value && globalThis.document?.createRange) {
    const range = globalThis.document.createRange();
    range.selectNodeContents(textRef.value);
    const glyphRect = range.getBoundingClientRect();
    const tightW = computeTightTooltipWidth({
      naturalWidth: naturalW,
      glyphWidth: glyphRect.width,
      padLeft,
      padRight,
      borderLeft,
      borderRight,
    });
    if (tightW !== null) {
      el.style.width = `${tightW}px`;
      const postH = el.offsetHeight || el.getBoundingClientRect().height;
      if (postH > naturalH + 1) {
        if (tightW + 3 < naturalW) {
          el.style.width = `${tightW + 3}px`;
          const retryH = el.offsetHeight || el.getBoundingClientRect().height;
          if (retryH > naturalH + 1) {
            el.style.width = '';
          }
        } else {
          el.style.width = '';
        }
      }
    }
  }

  const finalW = el.offsetWidth || el.getBoundingClientRect().width;
  const finalH = el.offsetHeight || el.getBoundingClientRect().height;
  boxWidth.value = Math.round(finalW * 2) / 2;
  boxHeight.value = Math.round(finalH * 2) / 2;
  return true;
};

const bubbleGeometry = computed(() =>
  buildTooltipBubbleGeometry({
    width: boxWidth.value,
    height: boxHeight.value,
    radius: boxRadius.value,
    arrowX: arrowX.value,
    arrowHalfWidth: 5.5,
    arrowHeight: 5,
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

  const viewportWidth = globalThis.window.innerWidth;
  const viewportHeight = globalThis.window.innerHeight;

  const spaceAbove = rect.top;
  const spaceBelow = viewportHeight - rect.bottom;

  // Vertical positioning (prefer above with clean clearance above button border)
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

  // Safe inset = arrowHalfWidth (5.5px) + shoulderRounding (1px) + cornerRadius (7px) + margin (2.5px) = 16px
  const arrowSafeInset = 16;
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
  globalThis.window.addEventListener('resize', updatePosition, { passive: true });
  if (globalThis.ResizeObserver && tooltipRef.value) {
    resizeObserver = new globalThis.ResizeObserver(() => {
      if (tooltipState.isVisible) {
        computePlacementFromElement();
      }
    });
    resizeObserver.observe(tooltipRef.value);
  }
});

onUnmounted(() => {
  globalThis.window.removeEventListener('resize', updatePosition);
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
    <span ref="textRef" class="global-tooltip-text">{{ tooltipState.text }}</span>
  </div>
</template>

<style scoped>
.global-tooltip {
  /* Inverted-Polarity Compact Micro-Tooltip Tokens (Soft Pearl in Dark Mode, Deep Slate in Light Mode) */
  --nu-tooltip-bg: var(--nano-tooltip-bg, rgba(226, 232, 240, 0.96));
  --nu-tooltip-color: var(--nano-tooltip-color, #0f172a);
  --nu-tooltip-radius: var(--nano-tooltip-radius, 7px);
  --nu-tooltip-padding: var(--nano-tooltip-padding, 5px 10px);
  --nu-tooltip-shadow: var(--nano-tooltip-shadow, 0 6px 18px rgba(2, 6, 23, 0.44));
  --nu-tooltip-border: var(--nano-tooltip-border, 1px solid rgba(148, 163, 184, 0.55));
  --nu-tooltip-arrow-border: var(--nano-tooltip-arrow-border, rgba(148, 163, 184, 0.62));

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
  font-size: var(--nano-tooltip-font-size, 0.78rem);
  font-weight: 500;
  letter-spacing: -0.005em;
  width: max-content;
  max-width: min(var(--nano-tooltip-max-width, 260px), calc(100vw - 24px));
  text-align: center;
  line-height: 1.36;
  white-space: normal;
  word-wrap: break-word;
  pointer-events: none;
  /* Transition ONLY opacity so singleton tooltip never slides diagonally across viewport from stale (x,y) */
  transition: opacity 0.14s ease;
  opacity: 0;
  visibility: hidden;
}

/* Built-in Semantic Contextual Tooltip Variants (Guaranteed Contrast in Both Dark & Light Themes) */
.global-tooltip.tooltip-danger {
  --nu-tooltip-bg: rgba(234, 88, 12, 0.96);
  --nu-tooltip-color: #ffffff;
  --nu-tooltip-arrow-border: rgba(253, 186, 116, 0.42);
}

.global-tooltip.tooltip-error {
  --nu-tooltip-bg: rgba(220, 38, 38, 0.96);
  --nu-tooltip-color: #ffffff;
  --nu-tooltip-arrow-border: rgba(252, 165, 165, 0.42);
}

.global-tooltip.tooltip-success {
  --nu-tooltip-bg: rgba(5, 150, 105, 0.96);
  --nu-tooltip-color: #ffffff;
  --nu-tooltip-arrow-border: rgba(110, 231, 183, 0.42);
}

.global-tooltip.tooltip-dark {
  --nu-tooltip-bg: rgba(15, 23, 42, 0.96);
  --nu-tooltip-color: #f8fafc;
  --nu-tooltip-arrow-border: rgba(51, 65, 85, 0.72);
}

.global-tooltip.tooltip-light {
  --nu-tooltip-bg: rgba(226, 232, 240, 0.96);
  --nu-tooltip-color: #0f172a;
  --nu-tooltip-arrow-border: rgba(148, 163, 184, 0.62);
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
  filter: drop-shadow(var(--nu-tooltip-shadow));
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
  max-height: calc(1.36em * var(--nano-tooltip-max-lines, 4));
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
