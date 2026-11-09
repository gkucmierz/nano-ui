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
 * @param {Object} params
 * @param {number} [params.containerWidth=1200] Available inner header width in px
 * @param {number[]} [params.tierRequiredWidths=[1040, 860, 680, 520]] Natural width required by each tier
 * @param {number} [params.safetyGapPx=24] Minimum breathing gap between #left, #center, #right
 * @returns {{ tierIndex: number, requiredWidthPx: number, fits: boolean }}
 */
export function resolveOptimalHeaderTier({
  containerWidth = 1200,
  tierRequiredWidths = DEFAULT_HEADER_TIER_WIDTHS,
  safetyGapPx = 24,
} = {}) {
  const safeW = Math.max(0, Number(containerWidth) || 0);
  const gap = Math.max(0, Number(safetyGapPx) || 0);
  const budgets =
    Array.isArray(tierRequiredWidths) && tierRequiredWidths.length > 0
      ? tierRequiredWidths.map((v) => Math.max(0, Number(v) || 0))
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
 * Picks the richest (longest) label variant from `candidates` (ordered from longest
 * to shortest, e.g. `['Domena na sprzedaż / wynajem', 'Oferta domeny', 'Oferta']`)
 * that fits inside `availableWidthPx` using `naturalSearch`.
 *
 * @param {string[]} candidates Ordered from full label (index 0) to shortest fallback
 * @param {number} availableWidthPx Available horizontal budget for the button/pill in px
 * @param {Object} [options]
 * @param {number} [options.charWidthPx=7.4] Average character width in px
 * @param {number} [options.horizontalChromePx=34] Dot + icon + horizontal padding in px
 * @returns {{ label: string, tierIndex: number, estimatedWidthPx: number }}
 */
export function pickAdaptiveHeaderLabel(
  candidates = [],
  availableWidthPx = 320,
  { charWidthPx = 7.4, horizontalChromePx = 34 } = {}
) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { label: '', tierIndex: 0, estimatedWidthPx: 0 };
  }
  const availW = Math.max(0, Number(availableWidthPx) || 0);
  const cw = Math.max(4, Number(charWidthPx) || 7.4);
  const chrome = Math.max(0, Number(horizontalChromePx) || 34);
  const maxIdx = candidates.length - 1;

  const estimateW = (idx) => {
    const str = String(candidates[idx] ?? '');
    return Math.round(str.length * cw + chrome);
  };

  if (estimateW(0) <= availW) {
    return { label: String(candidates[0]), tierIndex: 0, estimatedWidthPx: estimateW(0) };
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
  return {
    label: String(candidates[chosenIdx]),
    tierIndex: chosenIdx,
    estimatedWidthPx: estimateW(chosenIdx),
  };
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
