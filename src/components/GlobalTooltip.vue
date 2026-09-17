<script setup>
import { tooltipState } from '../composables/useTooltip.js'
import { ref, watch, nextTick } from 'vue'

const tooltipRef = ref(null)
const x = ref(0)
const y = ref(0)
const arrowX = ref(0)
const isBottom = ref(false)

watch(() => tooltipState.isVisible, async (visible) => {
  if (visible) {
    // Wait for DOM update to ensure the text content affects height before measuring
    await nextTick()
    if (!tooltipRef.value || !tooltipState.targetRect) return

    const rect = tooltipState.targetRect
    const tooltipRect = tooltipRef.value.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    const spaceAbove = rect.top
    const spaceBelow = viewportHeight - rect.bottom

    // Vertical positioning (prefer above, fallback to below)
    let top = rect.top - tooltipRect.height - 8
    isBottom.value = false

    // If it doesn't fit above, or there is significantly more space below and it fits there
    if (top < 8 || (spaceAbove < tooltipRect.height + 8 && spaceBelow > spaceAbove)) {
      top = rect.bottom + 8
      isBottom.value = true
    }

    // Clamp bottom to viewport if it still overflows
    if (top + tooltipRect.height > viewportHeight - 8) {
      top = viewportHeight - tooltipRect.height - 8
    }

    // Clamp top to viewport if it overflows (e.g. extremely tall tooltip)
    if (top < 8) {
      top = 8
    }

    // Horizontal positioning
    let idealCenter = rect.left + (rect.width / 2)
    let left = idealCenter - (tooltipRect.width / 2)

    // Bounds checking for left/right
    let actualLeft = left
    if (actualLeft < 8) {
      actualLeft = 8
    } else if (actualLeft + tooltipRect.width > viewportWidth - 8) {
      actualLeft = viewportWidth - tooltipRect.width - 8
    }

    // Calculate the difference between where the box is forced to be,
    // and where it naturally wanted to be. We move the arrow by the opposite amount.
    let calculatedArrowX = idealCenter - (actualLeft + (tooltipRect.width / 2))
    
    // Prevent arrow from overflowing the tooltip's corners (assuming 6px border-radius + some padding)
    const maxArrowOffset = (tooltipRect.width / 2) - 12
    if (calculatedArrowX > maxArrowOffset) calculatedArrowX = maxArrowOffset
    if (calculatedArrowX < -maxArrowOffset) calculatedArrowX = -maxArrowOffset

    arrowX.value = calculatedArrowX
    x.value = actualLeft
    y.value = top
  }
})
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
    {{ tooltipState.text }}
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
  max-width: min(350px, calc(100vw - var(--nano-space-xl, 32px)));
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
