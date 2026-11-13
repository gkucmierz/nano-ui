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
  let insideKeepInScroller = false;
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

        if (keepInScroller && !wouldInflateScrollbar) {
          insideKeepInScroller = true;
        } else if (
          wouldInflateScrollbar ||
          (isHardClip && (roomBelowVisible < desiredHeight + 12 || roomAboveVisible < desiredHeight + 12)) ||
          (roomBelowVisible < desiredHeight + 12 && !keepInScroller)
        ) {
          highestClippingEl = curr;
          escapedScrollers++;
        }
      }
    }

    curr = curr.parentNode;
  }

  if (viewportEl) {
    return {
      mountEl: insideKeepInScroller && escapedScrollers === 0 ? null : viewportEl,
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
 *   utilizing the maximum available screen height (`screenHeight = viewportH - 2 * edgeMargin`) with
 *   strictly symmetrical top and bottom margins (`topMargin === bottomMargin === edgeMargin`).
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
  autoHeight = false,
  actualDropdownHeight = null,
  actualChromeHeight = null,
  optionsScrollHeight = null,
  gap = 6,
  edgeMargin = 8,
} = {}) => {
  const margin = Math.max(0, Number(edgeMargin ?? 8));
  const rawScreenTop = screenRect?.top ?? 0;
  const rawScreenBottom = screenRect?.bottom ?? 768;
  const rawScreenLeft = screenRect?.left ?? 0;
  const rawScreenRight = screenRect?.right ?? 1024;

  const safeScreen = {
    top: rawScreenTop + margin,
    bottom: rawScreenBottom - margin,
    left: rawScreenLeft + margin,
    right: rawScreenRight - margin,
  };
  const screenHeight = Math.max(96, safeScreen.bottom - safeScreen.top);
  const screenWidth = Math.max(180, safeScreen.right - safeScreen.left);

  // Exact chrome height: search bar (~33px) + top/bottom 1px borders (2px) = 35px
  const chromeHeight =
    typeof actualChromeHeight === 'number' && actualChromeHeight > 0
      ? actualChromeHeight
      : searchable
        ? 35
        : 2;
  const chromePadding = 12;
  const estimatedOptionsHeight =
    typeof optionsScrollHeight === 'number' && optionsScrollHeight > 0
      ? optionsScrollHeight
      : Math.max(46, optionsCount * 42 + chromePadding);

  const isAutoMax =
    autoHeight ||
    maxDropdownHeight === 'auto' ||
    maxDropdownHeight === null ||
    maxDropdownHeight === undefined ||
    !Number.isFinite(Number(maxDropdownHeight));
  const resolvedMaxDropdownHeight = isAutoMax
    ? Math.max(60, screenHeight - chromeHeight)
    : Number(maxDropdownHeight);

  const idealOptionsHeight = Math.min(resolvedMaxDropdownHeight, estimatedOptionsHeight);
  const idealTotalHeight = chromeHeight + idealOptionsHeight;

  const spaceBelow = safeScreen.bottom - (triggerRect.bottom + gap);
  const spaceAbove = (triggerRect.top - gap) - safeScreen.top;

  // Threshold below which a single side feels cramped and we should either flip or span both sides
  const minSingleSideHeight = Math.min(idealTotalHeight, 175);

  let placement = 'bottom';
  let optionsMaxHeight = resolvedMaxDropdownHeight;
  let screenTop = triggerRect.bottom + gap;

  if (spaceBelow >= idealTotalHeight) {
    // 1. Fits cleanly below without clipping
    placement = 'bottom';
    optionsMaxHeight = isAutoMax
      ? Math.max(idealOptionsHeight, Math.min(resolvedMaxDropdownHeight, spaceBelow - chromeHeight))
      : resolvedMaxDropdownHeight;
    screenTop = triggerRect.bottom + gap;
  } else if (
    spaceAbove >= idealTotalHeight ||
    (spaceAbove > spaceBelow && spaceAbove >= minSingleSideHeight)
  ) {
    // 2. Flip above the trigger (e.g. select near bottom of modal or screen)
    placement = 'top';
    const availableAbove = Math.max(88, Math.min(screenHeight, spaceAbove));
    optionsMaxHeight = Math.max(60, Math.min(resolvedMaxDropdownHeight, availableAbove - chromeHeight));
    const renderedOptionsH = Math.min(estimatedOptionsHeight, optionsMaxHeight);
    const totalH = actualDropdownHeight
      ? Math.min(actualDropdownHeight, chromeHeight + optionsMaxHeight)
      : chromeHeight + renderedOptionsH;
    screenTop = Math.max(safeScreen.top, triggerRect.top - gap - totalH);
  } else if (spaceBelow >= minSingleSideHeight && spaceBelow >= spaceAbove) {
    // 3. Open below, but clamp height to the visible screen bottom
    placement = 'bottom-clamped';
    const availableBelow = Math.max(88, Math.min(screenHeight, spaceBelow));
    optionsMaxHeight = Math.max(60, Math.min(resolvedMaxDropdownHeight, availableBelow - chromeHeight));
    screenTop = triggerRect.bottom + gap;
  } else {
    // 4. Tight vertical viewport: open simultaneously above AND below the trigger ('overlap'),
    //    utilizing the full available screenHeight (from safeScreen.top to safeScreen.bottom)
    //    with strictly symmetrical top and bottom margins (margin === topMargin === bottomMargin)!
    placement = 'overlap';
    const maxScreenOptionsH = Math.max(60, screenHeight - chromeHeight);
    const targetOptionsH = Math.max(resolvedMaxDropdownHeight, estimatedOptionsHeight);
    optionsMaxHeight = Math.min(maxScreenOptionsH, targetOptionsH);

    const renderedOptionsH = Math.min(estimatedOptionsHeight, optionsMaxHeight);
    const totalH = Math.min(screenHeight, chromeHeight + renderedOptionsH);

    // Symmetrical vertical centering inside safeScreen so topMargin === bottomMargin!
    screenTop = safeScreen.top + Math.max(0, (screenHeight - totalH) * 0.5);
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

  const renderedTotalH = Math.min(
    screenHeight,
    chromeHeight + Math.min(estimatedOptionsHeight, optionsMaxHeight)
  );
  const topMarginPx = Math.round(screenTop - rawScreenTop);
  const bottomMarginPx = Math.round(rawScreenBottom - (screenTop + renderedTotalH));

  return {
    placement,
    optionsMaxHeight: Math.round(optionsMaxHeight),
    top: localTop,
    left: localLeft,
    minWidth: Math.round(triggerRect.width ? Math.min(triggerRect.width, screenWidth) : 220),
    maxWidth: Math.round(Math.min(360, screenWidth)),
    spaceBelow: Math.round(spaceBelow),
    spaceAbove: Math.round(spaceAbove),
    screenHeight: Math.round(screenHeight),
    edgeMargin: Math.round(margin),
    topMarginPx,
    bottomMarginPx,
  };
};

/**
 * Shared alias for `findSafeSelectMount` so any component in `@gkucmierz/nano-ui`
 * (`<NanoSelect>`, `<NanoCoverFlow>`, `<NanoDatePicker>`) can walk up `parentNode`
 * to locate clipping/scrolling ancestors and safe viewport boundaries.
 */
export const findSafeAncestorMount = findSafeSelectMount;

/**
 * Uses recursive `parentNode` ancestor traversal (`findSafeAncestorMount`) to compute
 * symmetrical vertical expansion (up & down from center) for an active 3D card (`<NanoCoverFlow>`)
 * when its inner content `scrollHeight` exceeds the base `cardHeight`.
 */
export const computeAdaptiveCardExpansion = ({
  rootEl = null,
  baseCardHeight = 230,
  baseStageHeight = 330,
  contentScrollHeight = 0,
  extraPadding = 4,
  viewportMargin = 24,
} = {}) => {
  const baseCard = Math.max(120, Number(baseCardHeight) || 230);
  const baseStage = Math.max(baseCard + 40, Number(baseStageHeight) || 330);
  const naturalContentH = Math.max(0, Number(contentScrollHeight) || 0);

  if (naturalContentH <= baseCard + 2) {
    return {
      activeCardHeight: baseCard,
      effectiveStageHeight: baseStage,
      isExpanded: false,
      needsInnerScroll: false,
      escapedScrollers: 0,
    };
  }

  let maxViewportHeight = 760;
  let escapedScrollers = 0;

  if (rootEl && typeof window !== 'undefined') {
    const desiredH = naturalContentH + extraPadding;
    const ancestorInfo = findSafeAncestorMount(rootEl, desiredH);
    escapedScrollers = ancestorInfo.escapedScrollers || 0;
    const vpEl = ancestorInfo.viewportEl;
    if (vpEl && typeof vpEl.getBoundingClientRect === 'function') {
      const vpRect = vpEl.getBoundingClientRect();
      maxViewportHeight = Math.max(baseCard, vpRect.height - viewportMargin * 2 - 56);
    } else if (typeof window.innerHeight === 'number' && window.innerHeight > 0) {
      maxViewportHeight = Math.max(baseCard, window.innerHeight - viewportMargin * 2 - 64);
    }
  }

  const desiredCardHeight = naturalContentH + extraPadding;
  const activeCardHeight = Math.round(
    Math.max(baseCard, Math.min(desiredCardHeight, maxViewportHeight))
  );
  const stagePadding = Math.max(44, baseStage - baseCard);
  const effectiveStageHeight = Math.round(
    Math.max(baseStage, activeCardHeight + stagePadding)
  );

  return {
    activeCardHeight,
    effectiveStageHeight,
    isExpanded: activeCardHeight > baseCard,
    needsInnerScroll: desiredCardHeight > activeCardHeight + 2,
    escapedScrollers,
  };
};

/**
 * Pure 2D bounding-box clamp supporting two coordinate conventions:
 * 1. Center-coordinate 3D/SVG stage mode:
 *    `clampFloatingBox2D({ x, y, halfWidth, halfHeight, bounds: { minX, maxX, minY, maxY }, padding })`
 *    -> `{ x, y, clampedX, clampedY }`
 * 2. Top-left DOM viewport rect mode:
 *    `clampFloatingBox2D({ left, top, width, height }, { left, top, right, bottom }, padding)`
 *    -> `{ left, top, clampedLeft, clampedTop }`
 */
export const clampFloatingBox2D = (box = {}, maybeBounds = null, maybePadding = undefined) => {
  if (box && (box.left !== undefined || box.top !== undefined)) {
    const pad = Math.max(0, Number(maybePadding ?? box.padding ?? 8) || 0);
    const w = Math.max(0, Number(box.width) || 0);
    const h = Math.max(0, Number(box.height) || 0);
    const b = maybeBounds || box.bounds || {};
    const minLeft = (Number.isFinite(b.left) ? b.left : 0) + pad;
    const minTop = (Number.isFinite(b.top) ? b.top : 0) + pad;
    const maxRight = (Number.isFinite(b.right) ? b.right : 1280) - pad;
    const maxBottom = (Number.isFinite(b.bottom) ? b.bottom : 800) - pad;

    const rawLeft = Number.isFinite(Number(box.left)) ? Number(box.left) : minLeft;
    const rawTop = Number.isFinite(Number(box.top)) ? Number(box.top) : minTop;

    const maxAllowedLeft = Math.max(minLeft, maxRight - w);
    const maxAllowedTop = Math.max(minTop, maxBottom - h);

    const clampedLeftVal = Math.max(minLeft, Math.min(maxAllowedLeft, rawLeft));
    const clampedTopVal = Math.max(minTop, Math.min(maxAllowedTop, rawTop));

    return {
      left: Math.round(clampedLeftVal),
      top: Math.round(clampedTopVal),
      clampedLeft: Math.abs(clampedLeftVal - rawLeft) > 0.5,
      clampedTop: Math.abs(clampedTopVal - rawTop) > 0.5,
    };
  }

  const {
    x = 0,
    y = 0,
    halfWidth = 0,
    halfHeight = 0,
    bounds = { minX: -21, maxX: 53, minY: -6, maxY: 38 },
    padding = 0.65,
  } = box || {};
  const pad = Math.max(0, Number(padding) || 0);
  const hw = Math.max(0, Number(halfWidth) || 0);
  const hh = Math.max(0, Number(halfHeight) || 0);

  const rawMinX = Number.isFinite(bounds?.minX) ? bounds.minX : -21;
  const rawMaxX = Number.isFinite(bounds?.maxX) ? bounds.maxX : 53;
  const rawMinY = Number.isFinite(bounds?.minY) ? bounds.minY : -6;
  const rawMaxY = Number.isFinite(bounds?.maxY) ? bounds.maxY : 38;

  const safeMinX = rawMinX + pad + hw;
  const safeMaxX = rawMaxX - pad - hw;
  const safeMinY = rawMinY + pad + hh;
  const safeMaxY = rawMaxY - pad - hh;

  const clampedX =
    safeMinX <= safeMaxX
      ? Math.max(safeMinX, Math.min(safeMaxX, Number(x) || 0))
      : (rawMinX + rawMaxX) * 0.5;
  const clampedY =
    safeMinY <= safeMaxY
      ? Math.max(safeMinY, Math.min(safeMaxY, Number(y) || 0))
      : (rawMinY + rawMaxY) * 0.5;

  return {
    x: Number(clampedX.toFixed(3)),
    y: Number(clampedY.toFixed(3)),
    clampedX: Math.abs(clampedX - (Number(x) || 0)) > 1e-3,
    clampedY: Math.abs(clampedY - (Number(y) || 0)) > 1e-3,
  };
};

/**
 * Computes finite `{ left, top, placement }` viewport coordinates for a fixed/teleported
 * floating panel tethered to `triggerRect` (e.g. `NanoLangPicker`), flipping above the trigger
 * when bottom space overflows and clamping strictly within `[paddingPx, viewport - size - paddingPx]`.
 */
export const computeAnchoredOverlayPosition = ({
  triggerRect = {},
  panelWidth = 240,
  panelHeight = 160,
  viewportWidth = 1280,
  viewportHeight = 800,
  gapPx = 6,
  paddingPx = 8,
  align = 'end',
} = {}) => {
  const vw = Math.max(64, Number(viewportWidth) || 1280);
  const vh = Math.max(64, Number(viewportHeight) || 800);
  const pw = Math.max(0, Number(panelWidth) || 0);
  const ph = Math.max(0, Number(panelHeight) || 0);
  const gap = Math.max(0, Number(gapPx) || 0);
  const pad = Math.max(0, Number(paddingPx) || 0);

  const trigLeft = Number.isFinite(Number(triggerRect?.left)) ? Number(triggerRect.left) : pad;
  const trigRight = Number.isFinite(Number(triggerRect?.right))
    ? Number(triggerRect.right)
    : trigLeft + Math.max(0, Number(triggerRect?.width) || 0);
  const trigTop = Number.isFinite(Number(triggerRect?.top)) ? Number(triggerRect.top) : pad;
  const trigBottom = Number.isFinite(Number(triggerRect?.bottom))
    ? Number(triggerRect.bottom)
    : trigTop + Math.max(0, Number(triggerRect?.height) || 36);

  const rawLeft =
    align === 'start'
      ? trigLeft
      : align === 'center'
        ? (trigLeft + trigRight - pw) * 0.5
        : trigRight - pw;

  const preferAbove =
    trigBottom + gap + ph > vh - pad && trigTop - gap - ph >= pad;
  const rawTop = preferAbove ? trigTop - gap - ph : trigBottom + gap;

  const clamped = clampFloatingBox2D(
    { left: rawLeft, top: rawTop, width: pw, height: ph },
    { left: 0, top: 0, right: vw, bottom: vh },
    pad
  );

  return {
    left: clamped.left,
    top: clamped.top,
    placement: preferAbove ? 'top' : 'bottom',
  };
};

/**
 * Walks up `parentNode` from `stageEl`, intersecting only explicit `[data-nano-stage-clip]`
 * boundary containers (never clamping internal 3D SVG coordinates to `window.innerHeight` scroll
 * position or document scroll containers, which would squish floating 3D cards when the SVG
 * starts partially below the fold on initial page load).
 */
export const measureSafeStageBounds = (
  stageEl,
  viewBox = { minX: -26, minY: -11, width: 84, height: 54 },
  outerStageBounds = { minX: -25.5, maxX: 57.5, minY: -10.5, maxY: 42.5 }
) => {
  const fallback = { ...outerStageBounds, clippedByAncestors: 0 };
  if (!stageEl || typeof stageEl.getBoundingClientRect !== 'function') {
    return fallback;
  }

  const stageRect = stageEl.getBoundingClientRect();
  if (!stageRect || stageRect.width <= 0 || stageRect.height <= 0) {
    return fallback;
  }

  let visLeft = -Infinity;
  let visRight = Infinity;
  let visTop = -Infinity;
  let visBottom = Infinity;
  let clippedByAncestors = 0;

  const docBody = typeof document !== 'undefined' ? document.body : null;
  const docEl = typeof document !== 'undefined' ? document.documentElement : null;
  let curr = stageEl.parentNode;
  while (curr && curr !== docBody && curr !== docEl && curr.nodeType === 1) {
    if (curr.hasAttribute && curr.hasAttribute('data-nano-stage-clip')) {
      const r = curr.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        clippedByAncestors++;
        visLeft = Math.max(visLeft, r.left);
        visRight = Math.min(visRight, r.right);
        visTop = Math.max(visTop, r.top);
        visBottom = Math.min(visBottom, r.bottom);
      }
    }
    curr = curr.parentNode;
  }

  if (clippedByAncestors === 0) {
    return fallback;
  }

  const vbMinX = Number(viewBox?.minX ?? -22);
  const vbMinY = Number(viewBox?.minY ?? -7);
  const vbW = Math.max(1, Number(viewBox?.width ?? 76));
  const vbH = Math.max(1, Number(viewBox?.height ?? 46));

  const scaleX = vbW / stageRect.width;
  const scaleY = vbH / stageRect.height;

  const ancestorMinX = vbMinX + (visLeft - stageRect.left) * scaleX;
  const ancestorMaxX = vbMinX + vbW - (stageRect.right - visRight) * scaleX;
  const ancestorMinY = vbMinY + (visTop - stageRect.top) * scaleY;
  const ancestorMaxY = vbMinY + vbH - (stageRect.bottom - visBottom) * scaleY;

  return {
    minX: Number(Math.max(outerStageBounds.minX, ancestorMinX).toFixed(2)),
    maxX: Number(Math.min(outerStageBounds.maxX, ancestorMaxX).toFixed(2)),
    minY: Number(Math.max(outerStageBounds.minY, ancestorMinY).toFixed(2)),
    maxY: Number(Math.min(outerStageBounds.maxY, ancestorMaxY).toFixed(2)),
    clippedByAncestors,
  };
};
