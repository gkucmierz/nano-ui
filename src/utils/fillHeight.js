/**
 * Dynamic Bottom-Boundary Fill Height Engine (`useFillHeight` & `v-fill-height`)
 * for @gkucmierz/nano-ui.
 *
 * Generalizes `tools-app`'s `useFillHeight` composable to work seamlessly both:
 *   1. In full-window views (`window.innerHeight - rect.top - bottomOffset`), and
 *   2. Inside resizable/draggable `<NanoModal>` bodies or custom boundary containers
 *      (`boundaryRect.bottom - rect.top - bottomOffset`), automatically reacting to
 *      window resizes, modal drag-resizing, and sibling `<NanoCollapsible>` toggles.
 */

import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';

/**
 * Pure calculator for the remaining vertical height from `elementTop` down to
 * `boundaryBottom`, minus `bottomOffset`, clamped to `minHeight`.
 *
 * @param {Object} params
 * @param {number} params.elementTop - Element `getBoundingClientRect().top`
 * @param {number} params.boundaryBottom - Container bottom coordinate (`window.innerHeight` or modal body bottom)
 * @param {number} [params.bottomOffset=16] - Footer / padding margin below the element
 * @param {number} [params.minHeight=140] - Minimum pixel height floor
 * @returns {number} Computed pixel height (`>= minHeight`)
 */
export const computeAvailableFillHeight = ({
  elementTop,
  boundaryBottom,
  bottomOffset = 16,
  minHeight = 140,
} = {}) => {
  const top = Number(elementTop) || 0;
  const bottom = Number(boundaryBottom) || 0;
  const offset = Number(bottomOffset) || 0;
  const floor = Math.max(40, Number(minHeight) || 140);
  const raw = Math.floor(bottom - top - offset);
  return Math.max(floor, raw);
};

/**
 * Finds the nearest vertical bounding container for `el`:
 *   - Explicit `boundarySelector` ancestor if provided,
 *   - `.nano-modal-body` or `.nano-modal-window` when rendered inside a `NanoModal`,
 *   - `[data-fill-boundary]` ancestor if present,
 *   - Otherwise `null` (meaning full window viewport `window.innerHeight`).
 */
export const resolveFillHeightBoundary = (el, boundarySelector = '') => {
  if (!el || el.nodeType !== 1) return null;
  if (boundarySelector && el.closest) {
    const matched = el.closest(boundarySelector);
    if (matched) return matched;
  }
  let curr = el.parentNode;
  while (curr && curr.nodeType === 1) {
    if (curr.hasAttribute && curr.hasAttribute('data-fill-boundary')) {
      return curr;
    }
    if (
      curr.classList &&
      (curr.classList.contains('nano-modal-body') ||
        curr.classList.contains('nano-modal-window'))
    ) {
      return curr;
    }
    curr = curr.parentNode;
  }
  return null;
};

/**
 * Measures `el` and its boundary container and returns the optimal pixel height.
 */
export const measureElementFillHeight = (el, options = {}) => {
  if (!el || !el.getBoundingClientRect) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;

  const boundaryEl =
    options.boundaryEl ||
    resolveFillHeightBoundary(el, options.boundarySelector || '');

  let boundaryBottom = 0;
  let defaultBottomOffset = 16;

  if (boundaryEl && boundaryEl.getBoundingClientRect) {
    const bRect = boundaryEl.getBoundingClientRect();
    boundaryBottom = bRect.bottom;
    defaultBottomOffset = 18;
  } else if (globalThis.window) {
    boundaryBottom = Number(globalThis.window.innerHeight) || 800;
  } else {
    return null;
  }

  const bottomOffset =
    options.bottomOffset !== undefined
      ? Number(options.bottomOffset)
      : defaultBottomOffset;
  const minHeight =
    options.minHeight !== undefined ? Number(options.minHeight) : 140;

  return computeAvailableFillHeight({
    elementTop: rect.top,
    boundaryBottom,
    bottomOffset,
    minHeight,
  });
};

/**
 * Vue 3 Composable (`useFillHeight`) that keeps `elementRef` stretched to the bottom
 * of the viewport or enclosing `<NanoModal>`, reacting to window resize, modal resize,
 * and sibling `<NanoCollapsible>` toggles.
 *
 * @param {import('vue').Ref<HTMLElement|null>} elementRef
 * @param {number|Object} [optionsOrExtraMargin=0]
 */
export const useFillHeight = (elementRef, optionsOrExtraMargin = 0) => {
  const opts =
    optionsOrExtraMargin && optionsOrExtraMargin.constructor === Object
      ? optionsOrExtraMargin
      : { bottomOffset: Number(optionsOrExtraMargin) || 16 };

  const height = ref('auto');
  const heightPx = ref(null);
  let resizeObserver = null;
  let settleTimer = null;

  const updateHeight = () => {
    const el = elementRef?.value;
    if (!el) return;
    const px = measureElementFillHeight(el, opts);
    if (px !== null) {
      heightPx.value = px;
      height.value = `${px}px`;
      if (opts.applyStyle !== false && el.style) {
        if (opts.useMaxHeight) {
          el.style.maxHeight = `${px}px`;
        } else {
          el.style.height = `${px}px`;
          el.style.maxHeight = `${px}px`;
        }
      }
    }
  };

  const attachObservers = () => {
    const el = elementRef?.value;
    if (!el) return;
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    const RO = globalThis.ResizeObserver;
    if (RO) {
      resizeObserver = new RO(() => {
        updateHeight();
      });
      const boundaryEl = resolveFillHeightBoundary(el, opts.boundarySelector || '');
      if (boundaryEl) resizeObserver.observe(boundaryEl);
      if (el.parentNode && el.parentNode.nodeType === 1) {
        resizeObserver.observe(el.parentNode);
      }
    }
  };

  onMounted(() => {
    updateHeight();
    nextTick(() => {
      updateHeight();
      attachObservers();
      if (globalThis.window) {
        globalThis.window.addEventListener('resize', updateHeight);
      }
    });
    settleTimer = setTimeout(updateHeight, 120);

    watch(
      elementRef,
      () => {
        nextTick(() => {
          updateHeight();
          attachObservers();
        });
      }
    );
  });

  onUnmounted(() => {
    if (globalThis.window) {
      globalThis.window.removeEventListener('resize', updateHeight);
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (settleTimer) {
      clearTimeout(settleTimer);
      settleTimer = null;
    }
  });

  return {
    height,
    heightPx,
    updateHeight,
  };
};

/**
 * Declarative Vue directive `v-fill-height` (`v-fill-height="{ bottomOffset: 16, minHeight: 180 }"`).
 */
export const fillHeightDirective = {
  mounted(el, binding) {
    const rawVal = binding?.value;
    const opts =
      rawVal && rawVal.constructor === Object
        ? rawVal
        : { bottomOffset: Number(rawVal) || 16 };

    const update = () => {
      const px = measureElementFillHeight(el, opts);
      if (px !== null && el.style) {
        if (opts.useMaxHeight) {
          el.style.maxHeight = `${px}px`;
        } else {
          el.style.height = `${px}px`;
          el.style.maxHeight = `${px}px`;
        }
      }
    };

    let ro = null;
    const RO = globalThis.ResizeObserver;
    if (RO) {
      ro = new RO(update);
      const boundaryEl = resolveFillHeightBoundary(el, opts.boundarySelector || '');
      if (boundaryEl) ro.observe(boundaryEl);
      if (el.parentNode && el.parentNode.nodeType === 1) {
        ro.observe(el.parentNode);
      }
    }

    if (globalThis.window) {
      globalThis.window.addEventListener('resize', update);
    }
    const timer = setTimeout(update, 60);
    update();

    el.__nanoFillHeightCleanup = () => {
      clearTimeout(timer);
      if (globalThis.window) {
        globalThis.window.removeEventListener('resize', update);
      }
      if (ro) ro.disconnect();
    };
    el.__nanoFillHeightUpdate = update;
  },
  updated(el) {
    if (el.__nanoFillHeightUpdate) {
      el.__nanoFillHeightUpdate();
    }
  },
  unmounted(el) {
    if (el.__nanoFillHeightCleanup) {
      el.__nanoFillHeightCleanup();
      delete el.__nanoFillHeightCleanup;
      delete el.__nanoFillHeightUpdate;
    }
  },
};
