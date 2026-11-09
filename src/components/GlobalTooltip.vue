<script setup>
import { tooltipState } from '../composables/useTooltip.js';
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';

const tooltipRef = ref(null);
const x = ref(0);
const y = ref(0);
const arrowX = ref(0);
const isBottom = ref(false);

const updatePosition = async () => {
  if (!tooltipState.isVisible || !tooltipRef.value || !tooltipState.targetRect) return;

  // Wait for DOM to finish rendering text so width and height are 100% accurate
  await nextTick();
  if (!tooltipRef.value || !tooltipState.targetRect) return;

  const rect = tooltipState.targetRect;
  const el = tooltipRef.value;
  const tooltipWidth = el.offsetWidth || el.getBoundingClientRect().width;
  const tooltipHeight = el.offsetHeight || el.getBoundingClientRect().height;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const spaceAbove = rect.top;
  const spaceBelow = viewportHeight - rect.bottom;

  // Vertical positioning (prefer above, fallback to below)
  let top = rect.top - tooltipHeight - 8;
  isBottom.value = false;

  if (top < 8 || (spaceAbove < tooltipHeight + 8 && spaceBelow > spaceAbove)) {
    top = rect.bottom + 8;
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

  // The arrow is a 10x10 rotated box (diagonal ~14px, half-width ~7.1px)
  // Border radius of tooltip is up to 10px.
  // To strictly prevent the arrow from overflowing rounded corners or sticking out,
  // safe inset = arrowHalfWidth (7px) + cornerRadius (10px) + padding (2px) = 19px.
  const arrowSafeInset = 19;
  const maxArrowOffset = Math.max(0, (tooltipWidth / 2) - arrowSafeInset);
  const clampedArrowX = Math.max(-maxArrowOffset, Math.min(maxArrowOffset, calculatedArrowX));

  arrowX.value = clampedArrowX;
  x.value = actualLeft;
  y.value = top;
};

// Reactively re-calculate position whenever visibility, text, or targetRect changes
watch(
  [() => tooltipState.isVisible, () => tooltipState.text, () => tooltipState.targetRect],
  async ([visible]) => {
    if (visible) {
      await updatePosition();
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
    :class="['global-tooltip', { 'visible': tooltipState.isVisible, 'tooltip-bottom': isBottom }, tooltipState.customClass]"
    :style="{
      transform: `translate(${x}px, ${y}px)`,
      '--arrow-offset': `${arrowX}px`
    }"
  >
    <span class="global-tooltip-text">{{ tooltipState.text }}</span>
  </div>
</template>

<style scoped>
.global-tooltip {
  /* Generic Styling Variables */
  --nu-tooltip-bg: var(--nano-tooltip-bg, rgba(15, 23, 42, 0.95));
  --nu-tooltip-color: var(--nano-tooltip-color, #f8fafc);
  --nu-tooltip-radius: var(--nano-tooltip-radius, var(--nano-radius-md, 8px));
  --nu-tooltip-padding: var(--nano-tooltip-padding, var(--nano-space-sm, 8px) var(--nano-space-md, 16px));
  --nu-tooltip-shadow: var(--nano-tooltip-shadow, 0 var(--nano-space-sm, 8px) var(--nano-space-lg, 24px) rgba(0, 0, 0, 0.3));
  --nu-tooltip-border: var(--nano-tooltip-border, var(--nano-border-width, 1px) solid rgba(255, 255, 255, 0.1));
  --nu-tooltip-arrow-border: var(--nano-tooltip-arrow-border, rgba(255, 255, 255, 0.1));

  position: fixed;
  top: 0;
  left: 0;
  z-index: 99999;
  background: var(--nu-tooltip-bg);
  backdrop-filter: blur(var(--nano-blur-md, 8px));
  -webkit-backdrop-filter: blur(var(--nano-blur-md, 8px));
  color: var(--nu-tooltip-color);
  padding: var(--nu-tooltip-padding);
  border-radius: var(--nu-tooltip-radius);
  font-size: 0.85rem;
  font-weight: 500;
  width: max-content;
  max-width: min(var(--nano-tooltip-max-width, 420px), calc(100vw - var(--nano-space-lg, 24px)));
  text-align: center;
  line-height: 1.4;
  white-space: normal;
  word-wrap: break-word;
  pointer-events: none;
  box-shadow: var(--nu-tooltip-shadow);
  border: var(--nu-tooltip-border);
  transition: opacity var(--nano-transition-tooltip), transform var(--nano-transition-tooltip);
  opacity: 0;
  visibility: hidden;
}

.global-tooltip-text {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--nano-tooltip-max-lines, 4);
  line-clamp: var(--nano-tooltip-max-lines, 4);
  max-height: calc(1.4em * var(--nano-tooltip-max-lines, 4));
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
}

.global-tooltip::after {
  content: '';
  position: absolute;
  left: calc(50% + var(--arrow-offset, 0px));
  bottom: -5px;
  margin-left: -5px;
  width: 10px;
  height: 10px;
  background: var(--nu-tooltip-bg);
  backdrop-filter: blur(var(--nano-blur-md, 8px));
  -webkit-backdrop-filter: blur(var(--nano-blur-md, 8px));
  border-right: var(--nano-border-width, 1px) solid var(--nu-tooltip-arrow-border);
  border-bottom: var(--nano-border-width, 1px) solid var(--nu-tooltip-arrow-border);
  transform: rotate(45deg);
  border-radius: 0 0 var(--nano-radius-xs, 2px) 0;
  clip-path: polygon(100% 0, 100% 100%, 0 100%);
}

.global-tooltip.tooltip-bottom::after {
  bottom: auto;
  top: -5px;
  border-right: none;
  border-bottom: none;
  border-left: var(--nano-border-width, 1px) solid var(--nu-tooltip-arrow-border);
  border-top: var(--nano-border-width, 1px) solid var(--nu-tooltip-arrow-border);
  border-radius: var(--nano-radius-xs, 2px) 0 0 0;
  clip-path: polygon(0 0, 100% 0, 0 100%);
}

.global-tooltip.visible {
  opacity: 1;
  visibility: visible;
  /* Transform returns to natural pos defined by inline styles when visible */
}
</style>
