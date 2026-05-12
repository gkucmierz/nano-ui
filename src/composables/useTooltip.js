import { reactive } from 'vue'

export const tooltipState = reactive({
  isVisible: false,
  text: '',
  customClass: '',
  targetRect: null
})

export function showTooltip(el, options) {
  if (!options) return;

  const text = typeof options === 'object' ? options.text : options;
  const customClass = typeof options === 'object' ? (options.class || '') : '';

  if (!text) return;

  if (!el.hasAttribute('aria-label')) {
    el.setAttribute('aria-label', text);
  }

  const rect = el.getBoundingClientRect();
  tooltipState.targetRect = {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    bottom: rect.bottom,
    right: rect.right
  };
  tooltipState.text = text;
  tooltipState.customClass = customClass;
  tooltipState.isVisible = true;
}

// Hide tooltip on any scroll event to avoid floating detached tooltips
if (typeof window !== 'undefined') {
  window.addEventListener('scroll', hideTooltip, { passive: true, capture: true })
}

export function hideTooltip() {
  tooltipState.isVisible = false;
}
