/**
 * Smart DOM Ancestor Traversal (`parentNode` loop) for NanoSlider thumb overhang protection.
 *
 * Walks up the DOM tree from the slider root element (`curr = curr.parentNode`) to detect
 * any clipping or scrolling containers (`overflow: hidden | auto | scroll | clip` — note that
 * in CSS, `overflow-y: auto` forces `overflow-x` to clip at the padding box).
 * Computes the exact horizontal safe insets (`safeLeftPx`, `safeRightPx`) so that the circular
 * slider thumb and its active focus/drag glow ring are never sliced into a half-circle ("D" shape)
 * at 0% or 100%.
 */

const CLIPPING_OVERFLOW_RE = /(auto|scroll|hidden|clip)/i;

export const SLIDER_THUMB_OVERHANG_BY_SIZE = Object.freeze({
  sm: 9, // 8px thumb radius + 1px border/ring clearance
  md: 11, // 10px thumb radius + 1px border/ring clearance
  lg: 13, // 12px thumb radius + 1px border/ring clearance
});

export function getSliderThumbOverhangPx(size = 'md') {
  return SLIDER_THUMB_OVERHANG_BY_SIZE[size] || SLIDER_THUMB_OVERHANG_BY_SIZE.md;
}

/**
 * Walks up `parentNode` from `sliderEl` to inspect all ancestors that clip horizontal overflow
 * (`overflow-x` or `overflow-y` matching `auto|scroll|hidden|clip`) and returns the required
 * left and right safe insets so the slider thumb never clips against any ancestor border/padding edge,
 * while subtracting existing clearance when the parent container already provides horizontal padding.
 */
export function resolveSliderSafeInsets(sliderEl, size = 'md') {
  const baseOverhang = getSliderThumbOverhangPx(size);
  if (!sliderEl || typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      safeLeftPx: baseOverhang,
      safeRightPx: baseOverhang,
      clippingAncestors: 0,
      nearestClipEl: null,
    };
  }

  const sliderRect = sliderEl.getBoundingClientRect ? sliderEl.getBoundingClientRect() : null;
  if (!sliderRect || sliderRect.width <= 0) {
    return {
      safeLeftPx: baseOverhang,
      safeRightPx: baseOverhang,
      clippingAncestors: 0,
      nearestClipEl: null,
    };
  }

  let requiredLeftPx = 0;
  let requiredRightPx = 0;
  let clippingAncestors = 0;
  let nearestClipEl = null;

  let curr = sliderEl.parentNode;
  while (
    curr &&
    curr !== document.body &&
    curr !== document.documentElement &&
    curr.nodeType === 1
  ) {
    const style = window.getComputedStyle ? window.getComputedStyle(curr) : null;
    if (style) {
      const ovX = style.overflowX || style.overflow || '';
      const ovY = style.overflowY || style.overflow || '';
      if (CLIPPING_OVERFLOW_RE.test(ovX) || CLIPPING_OVERFLOW_RE.test(ovY)) {
        const clipRect = curr.getBoundingClientRect ? curr.getBoundingClientRect() : null;
        if (clipRect && clipRect.width > 0) {
          clippingAncestors++;
          if (!nearestClipEl) nearestClipEl = curr;

          const borderLeft = parseFloat(style.borderLeftWidth) || 0;
          const borderRight = parseFloat(style.borderRightWidth) || 0;
          const innerLeft = clipRect.left + borderLeft;
          const innerRight = clipRect.right - borderRight;

          // Existing clearance between the clipping edge and the slider box:
          const leftClearance = sliderRect.left - innerLeft;
          const rightClearance = innerRight - sliderRect.right;

          const neededLeft = Math.max(0, Math.ceil(baseOverhang - leftClearance));
          const neededRight = Math.max(0, Math.ceil(baseOverhang - rightClearance));

          requiredLeftPx = Math.max(requiredLeftPx, neededLeft);
          requiredRightPx = Math.max(requiredRightPx, neededRight);
        }
      }
    }
    curr = curr.parentNode;
  }

  if (clippingAncestors === 0) {
    return {
      safeLeftPx: baseOverhang,
      safeRightPx: baseOverhang,
      clippingAncestors: 0,
      nearestClipEl: null,
    };
  }

  return {
    safeLeftPx: requiredLeftPx,
    safeRightPx: requiredRightPx,
    clippingAncestors,
    nearestClipEl,
  };
}
