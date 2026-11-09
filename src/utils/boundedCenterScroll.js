/**
 * 1D & 2D Bounded-Center Scroll Engine for @gkucmierz/nano-ui.
 *
 * Generalizes the horizontal filmstrip centering from trip-hub (`computeCenteredScrollLeft`)
 * and vertical timeline/table centering (`computeCenteredScrollTop`) into a single,
 * axis-agnostic mathematical & DOM utility that:
 *   1. Centers the active item along X, Y, or both axes as closely as possible.
 *   2. Strictly respects top/bottom (`[0, scrollHeight - clientHeight]`) and
 *      left/right (`[0, scrollWidth - clientWidth]`) container boundaries.
 *   3. Never calls native `el.scrollIntoView()`, preventing unwanted ancestor/window jumps.
 */

import { easeInOutCubic } from './kinetics.js';

const activeScrollTweens = new WeakMap();

/**
 * Computes the optimal 1D scroll offset (`scrollLeft` or `scrollTop`) that places
 * an item of size `itemSize` at `itemOffset` into the center of `viewportSize`,
 * strictly clamped to `[0, max(0, scrollSize - viewportSize)]`.
 *
 * @param {Object} params
 * @param {number} params.viewportSize - Visible container size (`clientWidth` or `clientHeight`)
 * @param {number} params.scrollSize - Total scrollable size (`scrollWidth` or `scrollHeight`)
 * @param {number} params.itemOffset - Item start coordinate relative to scroll content origin (or offsetParent)
 * @param {number} params.itemSize - Item dimension along the axis (`offsetWidth` or `offsetHeight`)
 * @param {number} [params.containerOffset=0] - Optional container offset when using `offsetLeft`/`offsetTop`
 * @returns {number} Clamped integer scroll offset in `[0, maxScroll]`
 */
export const computeBoundedCenterScroll = ({
  viewportSize,
  scrollSize,
  itemOffset,
  itemSize,
  containerOffset = 0,
} = {}) => {
  const vSize = Math.max(0, Number(viewportSize) || 0);
  const sSize = Math.max(0, Number(scrollSize) || 0);
  const iSize = Math.max(0, Number(itemSize) || 0);
  const localItemStart = Math.max(
    0,
    (Number(itemOffset) || 0) - (Number(containerOffset) || 0)
  );
  const maxScroll = Math.max(0, sSize - vSize);
  const rawCenter = localItemStart - vSize / 2 + iSize / 2;
  return Math.round(Math.max(0, Math.min(maxScroll, rawCenter)));
};

/**
 * Horizontal bounded-center scroll calculator (compatible with trip-hub filmstrip).
 *
 * @param {Object} params
 * @param {number} params.containerWidth
 * @param {number} params.scrollWidth
 * @param {number} params.itemOffsetLeft
 * @param {number} params.itemWidth
 * @param {number} [params.containerOffsetLeft=0]
 * @returns {number} Clamped `scrollLeft` in `[0, maxScrollLeft]`
 */
export const computeCenteredScrollLeft = ({
  containerWidth,
  scrollWidth,
  itemOffsetLeft,
  itemWidth,
  containerOffsetLeft = 0,
} = {}) =>
  computeBoundedCenterScroll({
    viewportSize: containerWidth,
    scrollSize: scrollWidth,
    itemOffset: itemOffsetLeft,
    itemSize: itemWidth,
    containerOffset: containerOffsetLeft,
  });

/**
 * Vertical bounded-center scroll calculator for timelines, thought graphs, and tables.
 *
 * @param {Object} params
 * @param {number} params.containerHeight
 * @param {number} params.scrollHeight
 * @param {number} params.itemOffsetTop
 * @param {number} params.itemHeight
 * @param {number} [params.containerOffsetTop=0]
 * @returns {number} Clamped `scrollTop` in `[0, maxScrollTop]`
 */
export const computeCenteredScrollTop = ({
  containerHeight,
  scrollHeight,
  itemOffsetTop,
  itemHeight,
  containerOffsetTop = 0,
} = {}) =>
  computeBoundedCenterScroll({
    viewportSize: containerHeight,
    scrollSize: scrollHeight,
    itemOffset: itemOffsetTop,
    itemSize: itemHeight,
    containerOffset: containerOffsetTop,
  });

/**
 * 2D bounded-center scroll calculator returning `{ left, top }`.
 */
export const computeBoundedCenterScroll2D = ({
  containerWidth,
  containerHeight,
  scrollWidth,
  scrollHeight,
  itemOffsetLeft,
  itemOffsetTop,
  itemWidth,
  itemHeight,
  containerOffsetLeft = 0,
  containerOffsetTop = 0,
} = {}) => ({
  left: computeCenteredScrollLeft({
    containerWidth,
    scrollWidth,
    itemOffsetLeft,
    itemWidth,
    containerOffsetLeft,
  }),
  top: computeCenteredScrollTop({
    containerHeight,
    scrollHeight,
    itemOffsetTop,
    itemHeight,
    containerOffsetTop,
  }),
});

/**
 * Measures a child element's position and size relative to `containerEl`'s scroll origin.
 * Uses `getBoundingClientRect()` when available so intermediate `position: relative` wrappers
 * never skew the offset calculation.
 */
export const measureChildRelativeScrollGeometry = (containerEl, targetEl) => {
  if (!containerEl || !targetEl) {
    return null;
  }

  const containerWidth = Number(containerEl.clientWidth) || 0;
  const containerHeight = Number(containerEl.clientHeight) || 0;
  const scrollWidth = Math.max(containerWidth, Number(containerEl.scrollWidth) || 0);
  const scrollHeight = Math.max(containerHeight, Number(containerEl.scrollHeight) || 0);
  const currentLeft = Number(containerEl.scrollLeft) || 0;
  const currentTop = Number(containerEl.scrollTop) || 0;

  if (containerEl.getBoundingClientRect && targetEl.getBoundingClientRect) {
    const cRect = containerEl.getBoundingClientRect();
    const tRect = targetEl.getBoundingClientRect();
    if (
      (cRect.width > 0 || cRect.height > 0) &&
      (tRect.width > 0 || tRect.height > 0)
    ) {
      return {
        containerWidth: containerWidth || cRect.width,
        containerHeight: containerHeight || cRect.height,
        scrollWidth,
        scrollHeight,
        itemOffsetLeft: (tRect.left - cRect.left) + currentLeft,
        itemOffsetTop: (tRect.top - cRect.top) + currentTop,
        itemWidth: Number(targetEl.offsetWidth) || tRect.width,
        itemHeight: Number(targetEl.offsetHeight) || tRect.height,
        containerOffsetLeft: 0,
        containerOffsetTop: 0,
      };
    }
  }

  return {
    containerWidth,
    containerHeight,
    scrollWidth,
    scrollHeight,
    itemOffsetLeft: Number(targetEl.offsetLeft) || 0,
    itemOffsetTop: Number(targetEl.offsetTop) || 0,
    itemWidth: Number(targetEl.offsetWidth || targetEl.clientWidth) || 0,
    itemHeight: Number(targetEl.offsetHeight || targetEl.clientHeight) || 0,
    containerOffsetLeft: Number(containerEl.offsetLeft) || 0,
    containerOffsetTop: Number(containerEl.offsetTop) || 0,
  };
};

/**
 * Cancels any active kinetic scroll animation on `containerEl`.
 */
export const cancelBoundedCenterScroll = (containerEl) => {
  if (!containerEl) return;
  const prev = activeScrollTweens.get(containerEl);
  if (prev && prev.rafId && globalThis.cancelAnimationFrame) {
    globalThis.cancelAnimationFrame(prev.rafId);
  }
  activeScrollTweens.delete(containerEl);
};

/**
 * Scrolls `containerEl` so `targetEl` is centered along `axis` ('y' | 'x' | 'both')
 * while strictly respecting top/bottom and left/right scroll boundaries.
 *
 * @param {HTMLElement} containerEl - Scrollable container element
 * @param {HTMLElement} targetEl - Active child element inside `containerEl`
 * @param {Object} [options]
 * @param {'y'|'x'|'both'} [options.axis='y'] - Scroll axis
 * @param {'kinetic'|'smooth'|'instant'} [options.behavior='kinetic'] - Scroll mode
 * @param {number} [options.duration=280] - Kinetic easing duration in ms
 * @returns {{ left: number, top: number } | null} Target scroll coordinates
 */
export const scrollElementToBoundedCenter = (
  containerEl,
  targetEl,
  options = {}
) => {
  const geom = measureChildRelativeScrollGeometry(containerEl, targetEl);
  if (!geom) return null;

  const axis = options.axis || 'y';
  const behavior = options.behavior || 'kinetic';
  const duration = options.duration !== undefined ? Number(options.duration) : 280;

  const target2D = computeBoundedCenterScroll2D(geom);
  const startLeft = Number(containerEl.scrollLeft) || 0;
  const startTop = Number(containerEl.scrollTop) || 0;

  const nextLeft = axis === 'x' || axis === 'both' ? target2D.left : startLeft;
  const nextTop = axis === 'y' || axis === 'both' ? target2D.top : startTop;

  const deltaX = nextLeft - startLeft;
  const deltaY = nextTop - startTop;

  cancelBoundedCenterScroll(containerEl);

  if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
    return { left: nextLeft, top: nextTop };
  }

  if (behavior === 'instant' || duration <= 0) {
    if (axis === 'x' || axis === 'both') containerEl.scrollLeft = nextLeft;
    if (axis === 'y' || axis === 'both') containerEl.scrollTop = nextTop;
    return { left: nextLeft, top: nextTop };
  }

  if (behavior === 'smooth' && containerEl.scrollTo && !globalThis.requestAnimationFrame) {
    containerEl.scrollTo({
      left: nextLeft,
      top: nextTop,
      behavior: 'smooth',
    });
    return { left: nextLeft, top: nextTop };
  }

  const raf = globalThis.requestAnimationFrame;
  const nowFn =
    globalThis.performance && globalThis.performance.now
      ? () => globalThis.performance.now()
      : () => Date.now();

  if (!raf) {
    if (axis === 'x' || axis === 'both') containerEl.scrollLeft = nextLeft;
    if (axis === 'y' || axis === 'both') containerEl.scrollTop = nextTop;
    return { left: nextLeft, top: nextTop };
  }

  const startTime = nowFn();
  const state = { rafId: null };
  activeScrollTweens.set(containerEl, state);

  const step = (ts) => {
    if (activeScrollTweens.get(containerEl) !== state) return;
    const currentNow = Number.isFinite(ts) ? ts : nowFn();
    const progress = Math.max(0, Math.min(1, (currentNow - startTime) / duration));
    const eased = easeInOutCubic(progress);

    if (axis === 'x' || axis === 'both') {
      containerEl.scrollLeft = Math.round(startLeft + deltaX * eased);
    }
    if (axis === 'y' || axis === 'both') {
      containerEl.scrollTop = Math.round(startTop + deltaY * eased);
    }

    if (progress < 1) {
      state.rafId = raf(step);
    } else {
      if (axis === 'x' || axis === 'both') containerEl.scrollLeft = nextLeft;
      if (axis === 'y' || axis === 'both') containerEl.scrollTop = nextTop;
      activeScrollTweens.delete(containerEl);
    }
  };

  state.rafId = raf(step);
  return { left: nextLeft, top: nextTop };
};
