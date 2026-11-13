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
let activeTriggerSource = 'pointer'; // 'pointer' | 'focus' | 'touch'
const lastPointerPos = { x: null, y: null };
let lastNonEscapeKeyAt = 0;
let lastPointerDownAt = 0;
let pendingHideTimer = null;

export function getActiveTooltipTarget() {
  return activeTargetEl;
}

export function getActiveTooltipSource() {
  return activeTriggerSource;
}

export function isActiveTooltipTarget(el) {
  return Boolean(el && activeTargetEl === el && tooltipState.isVisible);
}

export function cancelPendingTooltipHide() {
  if (pendingHideTimer !== null) {
    clearTimeout(pendingHideTimer);
    pendingHideTimer = null;
  }
}

export function recordTooltipPointerPosition(x, y) {
  if (Number.isFinite(x) && Number.isFinite(y)) {
    lastPointerPos.x = x;
    lastPointerPos.y = y;
  }
}

export function recordTooltipPointerDown(now = Date.now()) {
  if (Number.isFinite(now)) {
    lastPointerDownAt = now;
  }
}

export function wasRecentTooltipPointerDown(now = Date.now(), windowMs = 350) {
  if (!Number.isFinite(now) || lastPointerDownAt <= 0) return false;
  const age = now - lastPointerDownAt;
  return age >= 0 && age <= windowMs;
}

export function recordTooltipKeyActivity(key, now = Date.now()) {
  if (key === 'Escape') {
    hideTooltip();
    return;
  }
  if (key === 'Tab' || String(key || '').startsWith('Arrow')) {
    lastPointerDownAt = 0;
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

export function showTooltip(el, options, source = 'pointer') {
  if (!options || !el || el.isConnected === false) return;

  const isObj = isObjectRecord(options);
  const text = isObj ? options.text : options;
  const customClass = isObj ? (options.class || '') : '';

  if (!text) return;

  cancelPendingTooltipHide();

  if (!el.hasAttribute('aria-label')) {
    el.setAttribute('aria-label', text);
  }

  activeTargetEl = el;
  activeTriggerSource = source || 'pointer';
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

  cancelPendingTooltipHide();
  activeTargetEl = null;
  activeTriggerSource = 'pointer';
  tooltipState.isVisible = false;
  tooltipState.targetRect = null;
}

export function scheduleHideTooltip(sourceEl, delayMs = 36) {
  const isDomNodeGuard =
    Boolean(sourceEl) &&
    Boolean(sourceEl.nodeType || sourceEl.getBoundingClientRect) &&
    !('preventDefault' in sourceEl);

  if (isDomNodeGuard && activeTargetEl && sourceEl !== activeTargetEl) {
    return;
  }
  if (!Number.isFinite(delayMs) || delayMs <= 0 || !globalThis.window) {
    hideTooltip(sourceEl);
    return;
  }
  cancelPendingTooltipHide();
  pendingHideTimer = setTimeout(() => {
    pendingHideTimer = null;
    hideTooltip(sourceEl);
  }, delayMs);
}

if (globalThis.window?.addEventListener) {
  // Hide tooltip on any scroll event to avoid floating detached tooltips
  globalThis.window.addEventListener('scroll', () => hideTooltip(), { passive: true, capture: true });

  const handleGlobalPointerDown = (e) => {
    if (e && e.type === 'click' && e.detail === 0) {
      return;
    }
    recordTooltipPointerDown(Date.now());
    if (e && Number.isFinite(e.clientX) && Number.isFinite(e.clientY)) {
      recordTooltipPointerPosition(e.clientX, e.clientY);
    }
  };
  globalThis.window.addEventListener('pointerdown', handleGlobalPointerDown, { passive: true, capture: true });
  globalThis.window.addEventListener('mousedown', handleGlobalPointerDown, { passive: true, capture: true });
  globalThis.window.addEventListener('pointerup', handleGlobalPointerDown, { passive: true, capture: true });
  globalThis.window.addEventListener('mouseup', handleGlobalPointerDown, { passive: true, capture: true });
  globalThis.window.addEventListener('click', handleGlobalPointerDown, { passive: true, capture: true });

  const handleGlobalPointerMove = (e) => {
    const prevX = lastPointerPos.x;
    const prevY = lastPointerPos.y;
    const hasCoords = Number.isFinite(e.clientX) && Number.isFinite(e.clientY);
    const movedDist =
      hasCoords && prevX !== null && prevY !== null
        ? Math.hypot(e.clientX - prevX, e.clientY - prevY)
        : 0;
    recordTooltipPointerPosition(e.clientX, e.clientY);

    if (!tooltipState.isVisible || !activeTargetEl) return;
    if (activeTargetEl.isConnected === false) {
      hideTooltip();
      return;
    }

    const rect = activeTargetEl.getBoundingClientRect();

    // Keep keyboard-focused tooltip steady when pointer is stationary, but dismiss if user moves mouse elsewhere
    if (activeTriggerSource === 'focus' && globalThis.document?.activeElement === activeTargetEl) {
      if (movedDist >= 3 && !isPointInsideRect(e.clientX, e.clientY, rect, 4)) {
        hideTooltip();
      }
      return;
    }

    // Allow micro-gap corridor bridging (e.g. 3px CSS grid gaps in NanoHeatmap) while pendingHideTimer is active
    const tolerance = pendingHideTimer !== null ? 8 : 3;
    if (!isPointInsideRect(e.clientX, e.clientY, rect, tolerance)) {
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
      if (e.key === 'Tab' || String(e.key || '').startsWith('Arrow')) {
        lastPointerDownAt = 0;
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
