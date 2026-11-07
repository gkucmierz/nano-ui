import { inject, computed } from 'vue';

export const MUTATING_HEADER_META_KEY = Symbol.for('nano-ui:mutating-header-meta');

export const MUTATING_HEADER_SPREAD_PRESETS = Object.freeze([0, 25, 33, 50, 66, 75, 100]);

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
    isSubtitleFolded: compressionLevel >= 1,
    isSecondaryNavFolded: compressionLevel >= 2,
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
