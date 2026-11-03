/**
 * Smart DOM Ancestor Traversal (Option 2) & Adaptive 4-Mode Viewport Clamping (Option 3)
 * for NanoSelect dropdown positioning.
 */

const CLIPPING_OVERFLOW_RE = /(auto|scroll|hidden|clip)/i;
const HARD_CLIP_RE = /(hidden|clip)/i;

/**
 * Finds the nearest ancestor with non-static CSS positioning (the actual CSS containing block
 * for `position: absolute` children inside `mountEl`).
 */
export const getPositionedReferenceEl = (mountEl) => {
  if (!mountEl || typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }
  let curr = mountEl;
  while (curr && curr !== document.body && curr !== document.documentElement && curr.nodeType === 1) {
    const style = window.getComputedStyle ? window.getComputedStyle(curr) : null;
    if (style && style.position && style.position !== 'static') {
      return curr;
    }
    curr = curr.parentNode;
  }
  return document.documentElement;
};

/**
 * Walks up `parentNode` from the select root element to find:
 * 1. `viewportEl`: Nearest simulated screen boundary (`[data-nano-viewport]`) if present, else `null` (window viewport).
 * 2. `mountEl`: Nearest ancestor above any tight clipping/scrolling containers (`.nano-modal-body`,
 *    `.nano-modal-window`, `overflow: hidden/auto` cards) that can safely host the dropdown without
 *    inflating inner scrollbars while remaining inside the current modal/layer stacking context
 *    (so any subsequent modal or backdrop opened above it naturally covers the open select).
 */
export const findSafeSelectMount = (rootEl, desiredHeight = 280) => {
  if (!rootEl || typeof window === 'undefined' || typeof document === 'undefined') {
    return { mountEl: null, viewportEl: null, escapedScrollers: 0 };
  }

  let viewportEl = null;
  let highestClippingEl = null;
  let escapedScrollers = 0;
  let curr = rootEl.parentNode;

  while (curr && curr !== document.body && curr !== document.documentElement && curr.nodeType === 1) {
    if (curr.hasAttribute && curr.hasAttribute('data-nano-viewport')) {
      viewportEl = curr;
      break;
    }

    // If inside a NanoModal overlay, the overlay itself is the ideal stacking-context root for that modal!
    if (curr.classList && curr.classList.contains('nano-modal-overlay')) {
      return {
        mountEl: curr,
        viewportEl: curr,
        escapedScrollers: Math.max(1, escapedScrollers),
      };
    }

    const style = window.getComputedStyle ? window.getComputedStyle(curr) : null;
    if (style) {
      const ovY = style.overflowY || style.overflow || '';
      const ovX = style.overflowX || style.overflow || '';
      if (CLIPPING_OVERFLOW_RE.test(ovY) || CLIPPING_OVERFLOW_RE.test(ovX)) {
        const rect = curr.getBoundingClientRect();
        const rootRect = rootEl.getBoundingClientRect();
        const roomBelowVisible = rect.bottom - rootRect.bottom;
        const roomAboveVisible = rootRect.top - rect.top;

        // Calculate whether opening downward inside this scroll container would inflate its scrollHeight
        const offsetBottomInScroll = (rootRect.bottom - rect.top) + (curr.scrollTop || 0);
        const totalScrollH = curr.scrollHeight || rect.height;
        const remainingScrollBelow = totalScrollH - offsetBottomInScroll;
        const wouldInflateScrollbar = remainingScrollBelow < desiredHeight + 12;
        const isHardClip = HARD_CLIP_RE.test(ovY) || HARD_CLIP_RE.test(ovX);
        const keepInScroller = curr.hasAttribute && curr.hasAttribute('data-nano-keep-in-scroller');

        if (!keepInScroller || wouldInflateScrollbar) {
          if (
            wouldInflateScrollbar ||
            (isHardClip && (roomBelowVisible < desiredHeight + 12 || roomAboveVisible < desiredHeight + 12)) ||
            (roomBelowVisible < desiredHeight + 12 && !keepInScroller)
          ) {
            highestClippingEl = curr;
            escapedScrollers++;
          }
        }
      }
    }

    curr = curr.parentNode;
  }

  if (viewportEl) {
    return {
      mountEl: escapedScrollers > 0 ? viewportEl : null,
      viewportEl,
      escapedScrollers,
    };
  }

  if (highestClippingEl && highestClippingEl.parentNode && highestClippingEl.parentNode.nodeType === 1) {
    return {
      mountEl: highestClippingEl.parentNode,
      viewportEl: null,
      escapedScrollers,
    };
  }

  return {
    mountEl: null,
    viewportEl: null,
    escapedScrollers: 0,
  };
};

/**
 * Computes the optimal dropdown placement and dimensions clamped to the visible screen:
 * - `'bottom'`: Full room below the trigger.
 * - `'top'`: Flipped above the trigger when near the bottom edge of a modal/screen.
 * - `'bottom-clamped'`: Opens below the trigger with height clamped to the visible bottom screen edge.
 * - `'overlap'`: Opens simultaneously above AND below the trigger ("na górze i na dole jednocześnie"),
 *   clamped to the visible screen height with internal scrolling when neither side alone has enough height.
 */
export const computeSelectDropdownLayout = ({
  triggerRect,
  screenRect,
  mountRect = null,
  mountScrollLeft = 0,
  mountScrollTop = 0,
  searchable = true,
  optionsCount = 5,
  maxDropdownHeight = 260,
  actualDropdownHeight = null,
  gap = 6,
  edgeMargin = 8,
} = {}) => {
  const safeScreen = {
    top: (screenRect?.top ?? 0) + edgeMargin,
    bottom: (screenRect?.bottom ?? 768) - edgeMargin,
    left: (screenRect?.left ?? 0) + edgeMargin,
    right: (screenRect?.right ?? 1024) - edgeMargin,
  };
  const screenHeight = Math.max(110, safeScreen.bottom - safeScreen.top);
  const screenWidth = Math.max(180, safeScreen.right - safeScreen.left);

  const searchBarHeight = searchable ? 41 : 0;
  const chromePadding = 12;
  const estimatedOptionsHeight = Math.max(46, optionsCount * 42 + chromePadding);
  const idealOptionsHeight = Math.min(maxDropdownHeight, estimatedOptionsHeight);
  const idealTotalHeight = searchBarHeight + idealOptionsHeight;

  const spaceBelow = safeScreen.bottom - (triggerRect.bottom + gap);
  const spaceAbove = (triggerRect.top - gap) - safeScreen.top;

  // Threshold below which a single side feels cramped and we should either flip or span both sides
  const minSingleSideHeight = Math.min(idealTotalHeight, 175);

  let placement = 'bottom';
  let optionsMaxHeight = maxDropdownHeight;
  let screenTop = triggerRect.bottom + gap;

  if (spaceBelow >= idealTotalHeight) {
    // 1. Fits cleanly below
    placement = 'bottom';
    optionsMaxHeight = maxDropdownHeight;
    screenTop = triggerRect.bottom + gap;
  } else if (
    spaceAbove >= idealTotalHeight ||
    (spaceAbove > spaceBelow && spaceAbove >= minSingleSideHeight)
  ) {
    // 2. Flip above the trigger (e.g. select near bottom of modal or screen)
    placement = 'top';
    const availableAbove = Math.max(88, Math.min(screenHeight, spaceAbove));
    optionsMaxHeight = Math.max(60, Math.min(maxDropdownHeight, availableAbove - searchBarHeight));
    const renderedOptionsH = Math.min(estimatedOptionsHeight, optionsMaxHeight);
    const totalH = actualDropdownHeight
      ? Math.min(actualDropdownHeight, searchBarHeight + optionsMaxHeight)
      : searchBarHeight + renderedOptionsH;
    screenTop = Math.max(safeScreen.top, triggerRect.top - gap - totalH);
  } else if (spaceBelow >= minSingleSideHeight && spaceBelow >= spaceAbove) {
    // 3. Open below, but clamp height to the visible screen bottom
    placement = 'bottom-clamped';
    const availableBelow = Math.max(88, Math.min(screenHeight, spaceBelow));
    optionsMaxHeight = Math.max(60, Math.min(maxDropdownHeight, availableBelow - searchBarHeight));
    screenTop = triggerRect.bottom + gap;
  } else {
    // 4. Tight vertical viewport: open simultaneously above AND below the trigger ('overlap'),
    //    clamped strictly to the visible screen bounds!
    placement = 'overlap';
    const maxTotalH = Math.min(idealTotalHeight, screenHeight);
    optionsMaxHeight = Math.max(60, Math.min(maxDropdownHeight, maxTotalH - searchBarHeight));
    const renderedOptionsH = Math.min(estimatedOptionsHeight, optionsMaxHeight);
    const totalH = actualDropdownHeight
      ? Math.min(actualDropdownHeight, screenHeight)
      : Math.min(searchBarHeight + renderedOptionsH, screenHeight);
    const triggerCenterY = (triggerRect.top + triggerRect.bottom) * 0.5;
    const rawTop = triggerCenterY - totalH * 0.5;
    screenTop = Math.max(safeScreen.top, Math.min(rawTop, safeScreen.bottom - totalH));
  }

  const desiredWidth = Math.min(Math.max(triggerRect.width, 220), screenWidth);
  const screenLeft = Math.max(
    safeScreen.left,
    Math.min(triggerRect.left, safeScreen.right - desiredWidth)
  );

  // Convert screen coordinates into `mountRect`-relative coordinates if mounted in an ancestor
  const localTop = mountRect
    ? Math.round(screenTop - mountRect.top + mountScrollTop)
    : Math.round(screenTop - triggerRect.top);
  const localLeft = mountRect
    ? Math.round(screenLeft - mountRect.left + mountScrollLeft)
    : Math.round(screenLeft - triggerRect.left);

  return {
    placement,
    optionsMaxHeight: Math.round(optionsMaxHeight),
    top: localTop,
    left: localLeft,
    minWidth: Math.round(Math.min(triggerRect.width, screenWidth)),
    maxWidth: Math.round(Math.min(360, screenWidth)),
    spaceBelow: Math.round(spaceBelow),
    spaceAbove: Math.round(spaceAbove),
    screenHeight: Math.round(screenHeight),
  };
};
