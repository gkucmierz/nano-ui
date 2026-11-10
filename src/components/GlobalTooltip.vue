<script setup>
import { tooltipState } from '../composables/useTooltip.js';
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';

const tooltipRef = ref(null);
const x = ref(0);
const y = ref(0);
const arrowX = ref(0);
const isBottom = ref(false);
const isPositioned = ref(false);

const GAP = 12;

const computePlacementFromElement = () => {
  if (!tooltipState.isVisible || !tooltipRef.value || !tooltipState.targetRect) return false;

  const rect = tooltipState.targetRect;
  const el = tooltipRef.value;
  const tooltipWidth = el.offsetWidth || el.getBoundingClientRect().width;
  const tooltipHeight = el.offsetHeight || el.getBoundingClientRect().height;
  if (tooltipWidth <= 0 && tooltipHeight <= 0) return false;

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
  const idealCenter = rect.left + (rect.width / 2);
  const left = idealCenter - (tooltipWidth / 2);

  // Bounds checking for left/right
  const minLeft = 8;
  const maxLeft = Math.max(minLeft, viewportWidth - tooltipWidth - 8);
  const actualLeft = Math.max(minLeft, Math.min(maxLeft, left));

  // Difference between ideal target center and actual tooltip box center
  const calculatedArrowX = idealCenter - (actualLeft + (tooltipWidth / 2));

  // Safe inset = arrowHalfWidth (7px) + cornerRadius (10px) + padding (2px) = 19px
  const arrowSafeInset = 19;
  const maxArrowOffset = Math.max(0, (tooltipWidth / 2) - arrowSafeInset);
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
});

onUnmounted(() => {
  window.removeEventListener('resize', updatePosition);
});
</script>

<template>
  <div
    ref="tooltipRef"
    :class="[
      'global-tooltip',
      {
        'visible': tooltipState.isVisible && isPositioned,
        'tooltip-bottom': isBottom
      },
      tooltipState.customClass
    ]"
    :style="{
      transform: `translate3d(${x}px, ${y}px, 0)`,
      '--arrow-offset': `${arrowX}px`
    }"
  >
    <span class="global-tooltip-text">{{ tooltipState.text }}</span>
  </div>
</template>

<style scoped>
.global-tooltip {
  /* Generic Styling Variables */
  --nu-tooltip-bg: var(--nano-tooltip-bg, #0f172a);
  --nu-tooltip-color: var(--nano-tooltip-color, #f8fafc);
  --nu-tooltip-radius: var(--nano-tooltip-radius, var(--nano-radius-md, 9px));
  --nu-tooltip-padding: var(--nano-tooltip-padding, 8px 14px);
  --nu-tooltip-shadow: var(--nano-tooltip-shadow, 0 10px 28px rgba(0, 0, 0, 0.45));
  --nu-tooltip-border: var(--nano-tooltip-border, 1px solid rgba(148, 163, 184, 0.24));
  --nu-tooltip-arrow-border: var(--nano-tooltip-arrow-border, rgba(148, 163, 184, 0.24));

  position: fixed;
  top: 0;
  left: 0;
  z-index: 99999;
  box-sizing: border-box;
  background: var(--nu-tooltip-bg);
  backdrop-filter: blur(var(--nano-blur-md, 10px));
  -webkit-backdrop-filter: blur(var(--nano-blur-md, 10px));
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
  box-shadow: var(--nu-tooltip-shadow);
  border: var(--nu-tooltip-border);
  /* Transition ONLY opacity so singleton tooltip never slides diagonally across viewport from stale (x,y) */
  transition: opacity 0.14s ease;
  opacity: 0;
  visibility: hidden;
}

.global-tooltip-text {
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

.global-tooltip::after {
  content: '';
  position: absolute;
  left: calc(50% + var(--arrow-offset, 0px));
  bottom: -5.5px;
  margin-left: -5px;
  width: 10px;
  height: 10px;
  box-sizing: border-box;
  background: var(--nu-tooltip-bg);
  border-right: 1px solid var(--nu-tooltip-arrow-border);
  border-bottom: 1px solid var(--nu-tooltip-arrow-border);
  transform: rotate(45deg);
  border-radius: 0 0 2px 0;
  /* Extend 1px above diagonal so arrow masks the 1px bottom border of .global-tooltip seamlessly */
  clip-path: polygon(100% -1px, 100% 100%, -1px 100%);
}

.global-tooltip.tooltip-bottom::after {
  bottom: auto;
  top: -5.5px;
  border-right: none;
  border-bottom: none;
  border-left: 1px solid var(--nu-tooltip-arrow-border);
  border-top: 1px solid var(--nu-tooltip-arrow-border);
  border-radius: 2px 0 0 0;
  clip-path: polygon(-1px -1px, 100% -1px, -1px 100%);
}

.global-tooltip.visible {
  opacity: 1;
  visibility: visible;
}
</style>
