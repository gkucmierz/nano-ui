import { reactive } from 'vue';

const isObjectRecord = (val) => Boolean(val) && Object.prototype.toString.call(val) === '[object Object]';

export const tooltipState = reactive({
  isVisible: false,
  text: '',
  customClass: '',
  targetRect: null,
  themeRevision: 0,
});

let activeTargetEl = null;
const lastPointerPos = { x: null, y: null };
let lastNonEscapeKeyAt = 0;

export function getActiveTooltipTarget() {
  return activeTargetEl;
}

export function isActiveTooltipTarget(el) {
  return Boolean(el && activeTargetEl === el && tooltipState.isVisible);
}

export function recordTooltipPointerPosition(x, y) {
  if (Number.isFinite(x) && Number.isFinite(y)) {
    lastPointerPos.x = x;
    lastPointerPos.y = y;
  }
}

export function recordTooltipKeyActivity(key, now = Date.now()) {
  if (key === 'Escape') {
    hideTooltip();
    return;
  }
  lastNonEscapeKeyAt = now;
  tooltipState.themeRevision += 1;
  refreshActiveTooltipTargetRect();
}

export function refreshActiveTooltipTargetRect() {
  if (!tooltipState.isVisible || !activeTargetEl) return false;
  if (activeTargetEl.isConnected === false) {
    hideTooltip();
    return false;
  }
  const rect = activeTargetEl.getBoundingClientRect();
  if (rect.width <= 0 && rect.height <= 0) return false;
  tooltipState.targetRect = {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    bottom: rect.bottom,
    right: rect.right,
  };
  return true;
}

const isPointInsideRect = (x, y, rect, tolerance = 1) => {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !rect) return false;
  return (
    x >= rect.left - tolerance &&
    x <= rect.right + tolerance &&
    y >= rect.top - tolerance &&
    y <= rect.bottom + tolerance
  );
};

/**
 * Prevents synthetic `mouseleave` dismissal when the user presses a global keyboard shortcut
 * (`T` theme toggle, `L` language switch) without moving the physical cursor:
 * - macOS / Chromium hides the cursor on keypress (`setHiddenUntilMouseMoves`), firing `mouseleave`
 *   at the exact same `(clientX, clientY)` inside the button's bounding box;
 * - Vue re-rendering inner `<svg v-if="isDark">` icons can also emit transient pointer boundary events.
 */
export function shouldSuppressSyntheticMouseLeave(el, event, options = {}) {
  if (!el || el.isConnected === false || activeTargetEl !== el || !tooltipState.isVisible) {
    return false;
  }
  const rect = options.rect || el.getBoundingClientRect?.();
  if (!rect || rect.width <= 0 || rect.height <= 0) return false;

  const related = event?.relatedTarget;
  if (related && el.contains?.(related)) {
    return true;
  }

  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const keyAgeMs = now - (Number.isFinite(options.lastKeyAt) ? options.lastKeyAt : lastNonEscapeKeyAt);
  const pointer = options.lastPos || lastPointerPos;

  const hasEventCoords = Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY);
  const evX = hasEventCoords ? event.clientX : null;
  const evY = hasEventCoords ? event.clientY : null;

  // Case 1: Recent non-Escape shortcut keypress (`T` / `L`) while pointer remains inside target rect
  if (keyAgeMs >= 0 && keyAgeMs <= 750) {
    if (hasEventCoords) {
      const stayedNearLastPos =
        pointer.x === null || Math.hypot(evX - pointer.x, evY - pointer.y) <= 2;
      if (stayedNearLastPos && isPointInsideRect(evX, evY, rect, 1.5)) {
        return true;
      }
    } else if (pointer.x !== null && isPointInsideRect(pointer.x, pointer.y, rect, 1.5)) {
      return true;
    }
  }

  // Case 2: Zero-displacement synthetic mouseleave strictly inside button interior
  if (
    hasEventCoords &&
    pointer.x !== null &&
    Math.hypot(evX - pointer.x, evY - pointer.y) <= 0.5 &&
    isPointInsideRect(evX, evY, rect, -1.5)
  ) {
    return true;
  }

  return false;
}

export function showTooltip(el, options) {
  if (!options || !el || el.isConnected === false) return;

  const isObj = isObjectRecord(options);
  const text = isObj ? options.text : options;
  const customClass = isObj ? (options.class || '') : '';

  if (!text) return;

  if (!el.hasAttribute('aria-label')) {
    el.setAttribute('aria-label', text);
  }

  activeTargetEl = el;
  const rect = el.getBoundingClientRect();
  tooltipState.targetRect = {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    bottom: rect.bottom,
    right: rect.right,
  };
  tooltipState.text = text;
  tooltipState.customClass = customClass;
  tooltipState.isVisible = true;
}

export function hideTooltip(sourceEl) {
  const isDomNodeGuard =
    Boolean(sourceEl) &&
    Boolean(sourceEl.nodeType || sourceEl.getBoundingClientRect) &&
    !('preventDefault' in sourceEl);

  if (isDomNodeGuard && activeTargetEl && sourceEl !== activeTargetEl) {
    return;
  }

  activeTargetEl = null;
  tooltipState.isVisible = false;
  tooltipState.targetRect = null;
}

if (globalThis.window?.addEventListener) {
  // Hide tooltip on any scroll event to avoid floating detached tooltips
  globalThis.window.addEventListener('scroll', () => hideTooltip(), { passive: true, capture: true });

  const handleGlobalPointerMove = (e) => {
    recordTooltipPointerPosition(e.clientX, e.clientY);
    if (!tooltipState.isVisible || !activeTargetEl) return;
    if (activeTargetEl.isConnected === false) {
      hideTooltip();
      return;
    }
    if (globalThis.document?.activeElement === activeTargetEl) return;
    const rect = activeTargetEl.getBoundingClientRect();
    if (!isPointInsideRect(e.clientX, e.clientY, rect, 2)) {
      hideTooltip();
    }
  };

  globalThis.window.addEventListener('pointermove', handleGlobalPointerMove, { passive: true });
  globalThis.window.addEventListener('mousemove', handleGlobalPointerMove, { passive: true });

  globalThis.window.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape') {
        if (tooltipState.isVisible) hideTooltip();
        return;
      }
      lastNonEscapeKeyAt = Date.now();
      if (tooltipState.isVisible && activeTargetEl) {
        tooltipState.themeRevision += 1;
        const schedule = globalThis.requestAnimationFrame || ((fn) => setTimeout(fn, 0));
        schedule(() => {
          tooltipState.themeRevision += 1;
          refreshActiveTooltipTargetRect();
        });
      }
    },
    { passive: true, capture: true }
  );
}
