import { inject, computed } from 'vue';
import { naturalSearch } from './fitText.js';

export const MUTATING_HEADER_META_KEY = Symbol.for('nano-ui:mutating-header-meta');

export const MUTATING_HEADER_SPREAD_PRESETS = Object.freeze([0, 25, 33, 50, 66, 75, 100]);

export const DEFAULT_HEADER_TIER_WIDTHS = Object.freeze([1040, 860, 680, 520]);

/**
 * Uses `naturalSearch` (exponential galloping + binary bisection) over monotonically
 * decreasing tier width budgets `tierRequiredWidths` to find the lowest compression tier
 * `k` in `0..K` whose natural content width fits inside `containerWidth - safetyGapPx`
 * with zero DOM flex-shrink oscillation.
 *
 * Accepts either a single options object `{ containerWidth, tierRequiredWidths, safetyGapPx }`
 * or positional `(containerWidth, { tierRequiredWidths | requiredWidths, safetyGapPx })`.
 *
 * @param {Object|number} [paramsOrWidth={}] Options object or numeric container width in px
 * @param {Object} [maybeOptions={}] Secondary options when first argument is numeric width
 * @returns {{ tierIndex: number, requiredWidthPx: number, fits: boolean }}
 */
export function resolveOptimalHeaderTier(paramsOrWidth = {}, maybeOptions = {}) {
  const isObjArg =
    paramsOrWidth !== null &&
    Object.prototype.toString.call(paramsOrWidth) === '[object Object]';
  const opts = isObjArg ? paramsOrWidth : maybeOptions || {};
  const containerWidth = isObjArg
    ? (opts.containerWidth ?? opts.availableWidth ?? 1200)
    : paramsOrWidth;
  const legacyMinWidths =
    Number.isFinite(opts.fullMinWidth) && Number.isFinite(opts.midMinWidth)
      ? [
        opts.fullMinWidth,
        opts.midMinWidth,
        ...(Number.isFinite(opts.compactMinWidth) ? [opts.compactMinWidth] : []),
        0,
      ]
      : null;
  const rawTierWidths =
    opts.tierRequiredWidths ?? opts.requiredWidths ?? legacyMinWidths ?? DEFAULT_HEADER_TIER_WIDTHS;
  const safetyGapPx = opts.safetyGapPx ?? (legacyMinWidths ? 0 : 24);

  const safeW = Math.max(0, Number(containerWidth) || 0);
  const gap = Math.max(0, Number(safetyGapPx) || 0);
  const budgets =
    Array.isArray(rawTierWidths) && rawTierWidths.length > 0
      ? rawTierWidths.map((v) => Math.max(0, Number(v) || 0))
      : DEFAULT_HEADER_TIER_WIDTHS;

  const maxTierIdx = budgets.length - 1;
  if (safeW >= budgets[0] + gap) {
    return { tierIndex: 0, requiredWidthPx: budgets[0], fits: true };
  }

  // `naturalSearch` operates on 1-based naturals n >= 1; map n -> tierIdx = n - 1
  const firstFittingStep = naturalSearch(
    (n) => {
      const idx = Math.min(maxTierIdx, n - 1);
      if (n > maxTierIdx + 1) return true;
      return budgets[idx] + gap <= safeW;
    },
    true,
    maxTierIdx + 2
  );

  const resolvedIdx = Math.max(0, Math.min(maxTierIdx, firstFittingStep - 1));
  const reqW = budgets[resolvedIdx];
  return {
    tierIndex: resolvedIdx,
    requiredWidthPx: reqW,
    fits: reqW + gap <= safeW,
  };
}

/**
 * Picks the plain string label candidate for a pre-resolved `tierIndex` (`0..K`),
 * clamping out-of-range indices safely to `[0, candidates.length - 1]`.
 *
 * @param {string[]} candidates Ordered from richest label (`0`) to shortest compact fallback
 * @param {number} [tierIndex=0] Resolved compression tier index
 * @returns {string}
 */
export function pickHeaderTierCandidate(candidates = [], tierIndex = 0) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return '';
  }
  const rawIdx = Number(tierIndex);
  const clampedIdx = Number.isFinite(rawIdx)
    ? Math.max(0, Math.min(candidates.length - 1, Math.trunc(rawIdx)))
    : 0;
  return String(candidates[clampedIdx] ?? '');
}

const attachLabelStringCoercion = (descriptor) => {
  const str = String(descriptor.label ?? '');
  Object.defineProperties(descriptor, {
    toString: {
      value: () => str,
      enumerable: false,
      configurable: true,
    },
    valueOf: {
      value: () => str,
      enumerable: false,
      configurable: true,
    },
    [Symbol.toPrimitive]: {
      value: () => str,
      enumerable: false,
      configurable: true,
    },
  });
  return descriptor;
};

/**
 * Picks the richest (longest) label variant from `candidates` (ordered from longest
 * to shortest, e.g. `['Domena na sprzedaż / wynajem', 'Oferta domeny', 'Oferta']`)
 * that fits inside `availableWidthPx` using `naturalSearch`.
 *
 * Dual-Contract Poka-Yoke:
 * 1. If `widthOrTier` is a discrete tier index (`0 <= n <= 12` integer), selects
 *    `candidates[min(maxIdx, n)]` directly instead of treating `0..3` as `0..3px`.
 * 2. Defines non-enumerable `toString()` / `[Symbol.toPrimitive]` returning `label`
 *    so Vue `{{ pickAdaptiveHeaderLabel(...) }}` interpolation renders the string
 *    cleanly even if `.label` was omitted, while preserving `{ label, tierIndex, estimatedWidthPx }`.
 *
 * @param {string[]} candidates Ordered from full label (index 0) to shortest fallback
 * @param {number} [widthOrTier=320] Available horizontal budget in px (`> 12`) OR discrete `tierIndex` (`0..12`)
 * @param {Object} [options]
 * @param {number} [options.charWidthPx=7.4] Average character width in px
 * @param {number} [options.horizontalChromePx=34] Dot + icon + horizontal padding in px
 * @returns {{ label: string, tierIndex: number, estimatedWidthPx: number }}
 */
export function pickAdaptiveHeaderLabel(
  candidates = [],
  widthOrTier = 320,
  { charWidthPx = 7.4, horizontalChromePx = 34 } = {}
) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return attachLabelStringCoercion({ label: '', tierIndex: 0, estimatedWidthPx: 0 });
  }
  const cw = Math.max(4, Number(charWidthPx) || 7.4);
  const chrome = Math.max(0, Number(horizontalChromePx) || 34);
  const maxIdx = candidates.length - 1;

  const estimateW = (idx) => {
    const str = String(candidates[idx] ?? '');
    return str.length === 0 ? chrome : Math.round(str.length * cw + chrome);
  };

  const extractedArg =
    widthOrTier !== null &&
    Object.prototype.toString.call(widthOrTier) === '[object Object]' &&
    Number.isFinite(widthOrTier.tierIndex)
      ? widthOrTier.tierIndex
      : widthOrTier;

  const numArg = Number(extractedArg);
  if (Number.isInteger(numArg) && numArg >= 0 && numArg <= 12) {
    const chosenIdx = Math.min(maxIdx, numArg);
    return attachLabelStringCoercion({
      label: String(candidates[chosenIdx] ?? ''),
      tierIndex: chosenIdx,
      estimatedWidthPx: estimateW(chosenIdx),
    });
  }

  const availW = Math.max(0, numArg || 0);

  if (estimateW(0) <= availW) {
    return attachLabelStringCoercion({
      label: String(candidates[0]),
      tierIndex: 0,
      estimatedWidthPx: estimateW(0),
    });
  }

  const step = naturalSearch(
    (n) => {
      const idx = Math.min(maxIdx, n - 1);
      if (n > maxIdx + 1) return true;
      return estimateW(idx) <= availW;
    },
    true,
    maxIdx + 2
  );

  const chosenIdx = Math.max(0, Math.min(maxIdx, step - 1));
  return attachLabelStringCoercion({
    label: String(candidates[chosenIdx]),
    tierIndex: chosenIdx,
    estimatedWidthPx: estimateW(chosenIdx),
  });
}

/**
 * Normalizes a spread value into a percentage in [0, 100] and a ratio in [0, 1].
 * Accepts percentages (0..100) or ratios (0..1 when strictly between 0 and 1).
 *
 * @param {number|string} value
 * @param {number} [fallback=0]
 * @returns {{ spreadPercent: number, spreadRatio: number }}
 */
export function normalizeHeaderSpread(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    const fb = Math.max(0, Math.min(100, Number(fallback) || 0));
    return {
      spreadPercent: fb,
      spreadRatio: Number((fb / 100).toFixed(4)),
    };
  }
  const pct = num > 0 && num <= 1 ? num * 100 : num;
  const clamped = Math.max(0, Math.min(100, pct));
  return {
    spreadPercent: Math.round(clamped * 100) / 100,
    spreadRatio: Number((clamped / 100).toFixed(4)),
  };
}

/**
 * Parses the total horizontal outer inset (`parentWidth - floatingOuterWidth`) in pixels
 * implied by a CSS `floatingWidth` expression such as `'calc(100% - 48px)'`,
 * `'calc(100% - 2rem)'`, `'92%'`, or `'1120px'`.
 *
 * @param {string|number} [floatingWidth='calc(100% - 48px)']
 * @param {number} [parentWidth=1440]
 * @param {number} [rootFontSizePx=16]
 * @returns {number}
 */
export function parseFloatingHorizontalInsetPx(
  floatingWidth = 'calc(100% - 48px)',
  parentWidth = 1440,
  rootFontSizePx = 16
) {
  const safeParentW = Math.max(240, Number(parentWidth) || 1440);
  const remPx = Math.max(10, Number(rootFontSizePx) || 16);

  if (Number.isFinite(floatingWidth)) {
    return Math.max(0, safeParentW - floatingWidth);
  }

  const raw = String(floatingWidth || 'calc(100% - 48px)').trim();
  if (!raw || raw === '100%' || raw === 'auto') {
    return 0;
  }

  // Match `calc(100% - 48px)` or `calc(100% - 2.5rem)`
  const calcMatch = raw.match(
    /^calc\(\s*100%\s*-\s*([0-9]*\.?[0-9]+)\s*(px|rem|em|%)\s*\)$/i
  );
  if (calcMatch) {
    const val = parseFloat(calcMatch[1]);
    const unit = calcMatch[2].toLowerCase();
    if (Number.isFinite(val)) {
      if (unit === 'px') return Math.max(0, val);
      if (unit === 'rem' || unit === 'em') return Math.max(0, val * remPx);
      if (unit === '%') return Math.max(0, safeParentW * (val / 100));
    }
  }

  if (raw.endsWith('px')) {
    const px = parseFloat(raw);
    if (Number.isFinite(px)) return Math.max(0, safeParentW - px);
  }

  if (raw.endsWith('rem') || raw.endsWith('em')) {
    const rem = parseFloat(raw);
    if (Number.isFinite(rem)) return Math.max(0, safeParentW - rem * remPx);
  }

  if (raw.endsWith('%')) {
    const pct = parseFloat(raw);
    if (Number.isFinite(pct)) {
      return Math.max(0, safeParentW * (1 - Math.max(0, Math.min(100, pct)) / 100));
    }
  }

  return 0;
}

/**
 * Computes exact pixel geometry for `<MutatingHeader>` outer and inner containers
 * so that when `spreadPercent === 0`, `innerFloatingMaxPx === innerStuckMaxPx` across
 * ALL viewport widths (`320px..3840px`) and ALL intermediate CSS transition frames `t in [0, 1]`,
 * guaranteeing `0.00px` horizontal logo drift on scroll docking/undocking.
 *
 * @param {Object} [params]
 * @param {number} [params.parentWidth=1440] Measured parent/viewport clientWidth in px
 * @param {string|number} [params.floatingWidth='calc(100% - 48px)'] Outer floating width expression
 * @param {string|number} [params.floatingMaxWidth='100%'] Outer floating max-width cap
 * @param {number} [params.spreadPercent=0] Inner content spread percentage (0..100)
 * @param {number} [params.horizontalChromePx=42] Sum of left+right padding (`40px`) + borders (`2px`)
 * @param {number} [params.rootFontSizePx=16] Root rem size in px
 * @returns {{
 *   parentWidthPx: number,
 *   floatingOuterMaxPx: number,
 *   stuckOuterMaxPx: number,
 *   innerFloatingMaxPx: number,
 *   innerStuckMaxPx: number,
 *   spreadRatio: number
 * }}
 */
export function computeMutatingHeaderWidths({
  parentWidth = 1440,
  floatingWidth = 'calc(100% - 48px)',
  floatingMaxWidth = '100%',
  spreadPercent = 0,
  horizontalChromePx = 42,
  rootFontSizePx = 16,
} = {}) {
  const safeParentW = Math.max(240, Math.round(Number(parentWidth) || 1440));
  const chromePx = Math.max(0, Number(horizontalChromePx) || 42);
  const remPx = Math.max(10, Number(rootFontSizePx) || 16);
  const { spreadRatio } = normalizeHeaderSpread(spreadPercent, 0);

  const insetPx = parseFloatingHorizontalInsetPx(floatingWidth, safeParentW, remPx);
  const widthFromFloatingProp = Math.max(180, safeParentW - insetPx);

  let maxCapPx = safeParentW;
  if (Number.isFinite(floatingMaxWidth)) {
    maxCapPx = Math.max(180, floatingMaxWidth);
  } else {
    const rawMax = String(floatingMaxWidth || '100%').trim();
    if (rawMax && rawMax !== '100%' && rawMax !== 'none') {
      if (rawMax.endsWith('px')) {
        const px = parseFloat(rawMax);
        if (Number.isFinite(px)) maxCapPx = Math.max(180, px);
      } else if (rawMax.endsWith('rem') || rawMax.endsWith('em')) {
        const rem = parseFloat(rawMax);
        if (Number.isFinite(rem)) maxCapPx = Math.max(180, rem * remPx);
      } else if (rawMax.endsWith('%')) {
        const pct = parseFloat(rawMax);
        if (Number.isFinite(pct)) {
          maxCapPx = Math.max(180, safeParentW * (Math.max(0, Math.min(100, pct)) / 100));
        }
      } else {
        const num = Number(rawMax);
        if (Number.isFinite(num) && num > 0) maxCapPx = Math.max(180, num);
      }
    }
  }

  const floatingOuterMaxPx = Math.round(Math.min(safeParentW, widthFromFloatingProp, maxCapPx));
  const stuckOuterMaxPx = safeParentW;

  const innerFloatingMaxPx = Math.max(140, Math.round(floatingOuterMaxPx - chromePx));
  const innerFullMaxPx = Math.max(innerFloatingMaxPx, Math.round(safeParentW - chromePx));
  const innerStuckMaxPx = Math.round(
    innerFloatingMaxPx + spreadRatio * (innerFullMaxPx - innerFloatingMaxPx)
  );

  return {
    parentWidthPx: safeParentW,
    floatingOuterMaxPx,
    stuckOuterMaxPx,
    innerFloatingMaxPx,
    innerStuckMaxPx,
    spreadRatio,
  };
}

/**
 * Extracts vertical top/bottom margins from a CSS margin shorthand while
 * preserving `margin-left: auto; margin-right: auto` so CSS width/max-width
 * transitions never snap horizontal margins from `auto` to `0px`.
 *
 * @param {string} [floatingMargin='12px auto 0 auto']
 * @returns {{ top: string, bottom: string }}
 */
export function parseFloatingVerticalMargins(floatingMargin = '12px auto 0 auto') {
  const raw = String(floatingMargin || '12px auto 0 auto').trim();
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { top: '12px', bottom: '0px' };
  }
  if (parts.length === 1) {
    const v = parts[0] === 'auto' ? '0px' : parts[0];
    return { top: v, bottom: v };
  }
  if (parts.length === 2) {
    const v = parts[0] === 'auto' ? '0px' : parts[0];
    return { top: v, bottom: v };
  }
  const top = parts[0] === 'auto' ? '0px' : parts[0];
  const bottom = parts[2] === 'auto' ? '0px' : parts[2];
  return { top, bottom };
}

/**
 * Computes Priority+ / Adaptive Header Compression telemetry (`headerMeta`)
 * propagated to `<MutatingHeader>` children via scoped slots and `provide/inject`.
 *
 * Pattern Names:
 * - Priority+ Adaptive Navigation Pattern (progressive overflow folding)
 * - Reactive Container-Space Telemetry Context (`useMutatingHeaderMeta`)
 *
 * Compression levels (`0..3`):
 * - `0` (`spacious`): Full brand subtitle, badges, and all navigation items visible
 * - `1` (`comfortable`): Secondary subtitle / decorative badges can fold
 * - `2` (`compact`): Tertiary navigation items fold into overflow menu / compact pills
 * - `3` (`critical`): Icon-only action buttons & compact navigation (zero overflow)
 *
 * @param {Object} params
 * @param {number} [params.containerWidth=1200] Current inner header width in px
 * @param {number} [params.contentWidth=0] Sum of natural child slot widths + gaps in px
 * @param {boolean} [params.isStuck=false] Whether header is currently docked edge-to-edge
 * @param {number} [params.spreadPercent=0] Active inner spread percentage (0..100)
 * @returns {Object}
 */
export function computeHeaderCompressionMeta({
  containerWidth = 1200,
  contentWidth = 0,
  isStuck = false,
  spreadPercent = 0,
} = {}) {
  const safeContainerW = Math.max(0, Math.round(Number(containerWidth) || 0));
  const safeContentW = Math.max(0, Math.round(Number(contentWidth) || 0));
  const { spreadPercent: normPct, spreadRatio } = normalizeHeaderSpread(spreadPercent, 0);

  const freeSpacePx = Math.max(0, safeContainerW - safeContentW);
  const overflowPx = Math.max(0, safeContentW - safeContainerW);
  const utilizationRatio =
    safeContainerW > 0 ? Number((safeContentW / safeContainerW).toFixed(3)) : 0;

  let compressionLevel = 0;
  let densityTier = 'spacious';

  if (overflowPx > 0 || utilizationRatio >= 0.95 || (safeContainerW > 0 && safeContainerW < 560)) {
    compressionLevel = 3;
    densityTier = 'critical';
  } else if (utilizationRatio >= 0.84 || (safeContainerW > 0 && safeContainerW < 780)) {
    compressionLevel = 2;
    densityTier = 'compact';
  } else if (utilizationRatio >= 0.70 || (safeContainerW > 0 && safeContainerW < 980)) {
    compressionLevel = 1;
    densityTier = 'comfortable';
  }

  return {
    isStuck: Boolean(isStuck),
    spreadPercent: normPct,
    spreadRatio,
    containerWidth: safeContainerW,
    contentWidth: safeContentW,
    freeSpacePx,
    overflowPx,
    utilizationRatio,
    densityTier,
    compressionLevel,
    ctaLabelTier: compressionLevel,
    isSubtitleFolded: compressionLevel >= 1,
    isSecondaryNavFolded: compressionLevel >= 2,
    isUtilityMenuFolded: compressionLevel >= 2,
    isActionsCompact: compressionLevel >= 3,
  };
}

/**
 * Composable for child components inside `<MutatingHeader>` to consume live
 * Priority+ adaptive space & compression metadata without prop-drilling.
 */
export function useMutatingHeaderMeta() {
  const injected = inject(MUTATING_HEADER_META_KEY, null);
  if (injected) return injected;
  return computed(() => computeHeaderCompressionMeta());
}
