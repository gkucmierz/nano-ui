import { clamp } from './math.js';
import {
  getMaxOklchChroma,
  oklchToRgb,
  formatHex,
  formatRgb,
  getWcagContrastRatio,
} from './colors.js';

const toStringTag = (val) => Object.prototype.toString.call(val);
const isObject = (val) => val !== null && toStringTag(val) === '[object Object]';
const isFunction = (val) => toStringTag(val) === '[object Function]';

/**
 * Supported normalization scales for heavy-tailed / Pareto distributions.
 */
export const HEATMAP_SCALES = Object.freeze(['log1p', 'p95', 'sqrt', 'linear']);

/**
 * Supported OKLCH perceptual color palettes.
 */
export const HEATMAP_PALETTES = Object.freeze([
  'cyan-ruby',
  'emerald',
  'viridis',
  'amber-rose',
]);

/**
 * Structural neutral backgrounds for strictly zero / missing cells (`Zero-Value Invariant`).
 * Always visually recessed (dark mode) or paper-neutral (light mode), never using the lowest positive ramp color.
 */
export const HEATMAP_ZERO_COLOR_DARK = 'oklch(0.175 0.008 255)';
export const HEATMAP_ZERO_COLOR_LIGHT = 'oklch(0.968 0.004 250)';

/**
 * Perceptual lightness endpoints guaranteeing strict monotonicity across `t in [0, 1]`.
 * - Dark mode:  L grows monotonically 0.24 -> 0.86
 * - Light mode: L darkens monotonically 0.93 -> 0.44
 */
export const HEATMAP_DARK_L_MIN = 0.24;
export const HEATMAP_DARK_L_MAX = 0.86;
export const HEATMAP_LIGHT_L_MAX = 0.93;
export const HEATMAP_LIGHT_L_MIN = 0.44;

const PALETTE_STOPS = Object.freeze({
  'cyan-ruby': {
    dark: [
      { t: 0.0, c: 0.095, h: 252 },
      { t: 0.36, c: 0.142, h: 196 },
      { t: 0.7, c: 0.158, h: 76 },
      { t: 1.0, c: 0.165, h: 28 },
    ],
    light: [
      { t: 0.0, c: 0.055, h: 236 },
      { t: 0.36, c: 0.135, h: 198 },
      { t: 0.7, c: 0.158, h: 68 },
      { t: 1.0, c: 0.178, h: 22 },
    ],
  },
  emerald: {
    dark: [
      { t: 0.0, c: 0.068, h: 182 },
      { t: 0.5, c: 0.148, h: 160 },
      { t: 1.0, c: 0.165, h: 146 },
    ],
    light: [
      { t: 0.0, c: 0.048, h: 166 },
      { t: 0.5, c: 0.142, h: 158 },
      { t: 1.0, c: 0.155, h: 150 },
    ],
  },
  viridis: {
    dark: [
      { t: 0.0, c: 0.115, h: 304 },
      { t: 0.34, c: 0.108, h: 250 },
      { t: 0.68, c: 0.128, h: 176 },
      { t: 1.0, c: 0.165, h: 104 },
    ],
    light: [
      { t: 0.0, c: 0.078, h: 108 },
      { t: 0.34, c: 0.128, h: 172 },
      { t: 0.68, c: 0.115, h: 248 },
      { t: 1.0, c: 0.135, h: 302 },
    ],
  },
  'amber-rose': {
    dark: [
      { t: 0.0, c: 0.105, h: 14 },
      { t: 0.42, c: 0.168, h: 28 },
      { t: 0.76, c: 0.162, h: 64 },
      { t: 1.0, c: 0.145, h: 86 },
    ],
    light: [
      { t: 0.0, c: 0.058, h: 82 },
      { t: 0.38, c: 0.152, h: 60 },
      { t: 0.72, c: 0.168, h: 30 },
      { t: 1.0, c: 0.178, h: 14 },
    ],
  },
});

function collectNumericValues(source, out = []) {
  if (source === null || source === undefined) return out;
  if (Array.isArray(source) || ArrayBuffer.isView(source)) {
    for (let i = 0; i < source.length; i++) {
      const item = source[i];
      if (Array.isArray(item) || ArrayBuffer.isView(item)) {
        collectNumericValues(item, out);
      } else if (isObject(item)) {
        const num = Number(item.value);
        if (Number.isFinite(num)) out.push(num);
      } else if (item !== null && item !== undefined && item !== '') {
        const num = Number(item);
        if (Number.isFinite(num)) out.push(num);
      }
    }
    return out;
  }
  if (isObject(source)) {
    const vals = Object.values(source);
    return collectNumericValues(vals, out);
  }
  const single = Number(source);
  if (Number.isFinite(single)) out.push(single);
  return out;
}

/**
 * Checks whether a raw cell datum represents a strictly empty / zero state (`Zero-Value Invariant`).
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isHeatmapZeroValue(value) {
  if (value === null || value === undefined || value === '' || value === false) return true;
  const num = Number(value);
  return !Number.isFinite(num) || num <= 0;
}

function roundTickValue(val, effectiveMax) {
  if (!Number.isFinite(val) || val <= 0) return 0;
  if (effectiveMax >= 100) return Math.round(val);
  if (effectiveMax >= 10) return Number(val.toFixed(1));
  if (effectiveMax >= 1) return Number(val.toFixed(2));
  return Number(val.toFixed(4));
}

/**
 * Deterministic heavy-tailed / Pareto perceptual scale solver for `<NanoHeatmap>`.
 *
 * Supports:
 * - `'log1p'`: logarithmic `log(1 + v) / log(1 + M)` compression (default for web traffic & event matrices)
 * - `'p95'`:   upper percentile clamping (`clampPercentile`, default `0.95`) so a 10,000x viral spike
 *              never flattens normal baseline hours (e.g. 20–150 views) into uniform darkness
 * - `'sqrt'`:  square-root Poisson variance-stabilizing transform `sqrt(v / M)`
 * - `'linear'`: direct ratio `v / M`
 *
 * Optional `buckets` (`>= 2`, e.g. `5` GitHub-style steps) quantizes positive values into `buckets`
 * discrete positive levels `{ 1/B, 2/B, ..., 1 }` while strictly preserving `normalize(0) === 0`.
 *
 * @param {Array<any>|Float64Array|Float32Array} values
 * @param {Object} [options]
 * @param {'log1p'|'p95'|'sqrt'|'linear'} [options.scale='log1p']
 * @param {number} [options.clampPercentile=0.95]
 * @param {number} [options.buckets=0]
 * @returns {{
 *   scale: string,
 *   buckets: number,
 *   min: number,
 *   max: number,
 *   effectiveMax: number,
 *   totalSum: number,
 *   positiveCount: number,
 *   normalize: (val: unknown) => number,
 *   ticks: number[]
 * }}
 */
export function computeHeatmapScale(values, options = {}) {
  const opts = isObject(options) ? options : {};
  const resolvedScale = HEATMAP_SCALES.includes(opts.scale) ? opts.scale : 'log1p';
  const pct = Number.isFinite(Number(opts.clampPercentile))
    ? clamp(Number(opts.clampPercentile), 0.5, 1)
    : 0.95;
  const rawBuckets = Math.trunc(Number(opts.buckets) || 0);
  const buckets = rawBuckets >= 2 ? Math.min(rawBuckets, 32) : 0;

  const flat = collectNumericValues(values, []);
  const positive = [];
  let totalSum = 0;

  for (let i = 0; i < flat.length; i++) {
    const v = flat[i];
    if (Number.isFinite(v) && v > 0) {
      positive.push(v);
      totalSum += v;
    }
  }

  if (positive.length === 0) {
    return {
      scale: resolvedScale,
      buckets,
      min: 0,
      max: 0,
      effectiveMax: 0,
      totalSum: 0,
      positiveCount: 0,
      normalize: () => 0,
      ticks: [0],
    };
  }

  positive.sort((a, b) => a - b);
  const n = positive.length;
  const min = positive[0];
  const max = positive[n - 1];

  // Type-1 floor order statistic on positive samples guarantees that a single 10,000x spike
  // cannot contaminate `effectiveMax` even on compact arrays (n >= 3).
  const percentileIdx = n <= 2 ? n - 1 : Math.min(n - 1, Math.max(0, Math.floor((n - 1) * pct)));
  const pMax = positive[percentileIdx];
  const effectiveMax = resolvedScale === 'p95' ? Math.max(min, pMax) : max;

  // Quantum unit keeps `log1p` unit-invariant for fractional KDE densities (< 1)
  // while remaining exact `Math.log1p(v) / Math.log1p(effectiveMax)` for integer event counts (>= 1).
  const logQuantum = min < 1 ? min : 1;
  const logDenom = Math.log1p(effectiveMax / logQuantum);

  const normalizeContinuous = (num) => {
    const clampedVal = Math.min(num, effectiveMax);
    if (effectiveMax <= 0) return 0;

    if (resolvedScale === 'log1p') {
      return logDenom > 0 ? clamp(Math.log1p(clampedVal / logQuantum) / logDenom, 0, 1) : 1;
    }
    if (resolvedScale === 'sqrt') {
      return clamp(Math.sqrt(clampedVal / effectiveMax), 0, 1);
    }
    // 'linear' and 'p95' (clampedVal is already capped at p95 effectiveMax)
    return clamp(clampedVal / effectiveMax, 0, 1);
  };

  const normalize = (val) => {
    if (isHeatmapZeroValue(val)) return 0;
    const num = Number(val);
    const rawT = normalizeContinuous(num);
    if (buckets >= 2) {
      const idx = Math.min(buckets - 1, Math.max(0, Math.floor(rawT * buckets - 1e-12)));
      return Number(((idx + 1) / buckets).toFixed(6));
    }
    return rawT;
  };

  const invertAt = (u) => {
    const t = clamp(u, 0, 1);
    if (t <= 0) return 0;
    if (resolvedScale === 'log1p') {
      return Math.expm1(t * logDenom) * logQuantum;
    }
    if (resolvedScale === 'sqrt') {
      return t * t * effectiveMax;
    }
    return t * effectiveMax;
  };

  const rawTicks = [
    0,
    min,
    invertAt(0.5),
    invertAt(0.75),
    effectiveMax,
  ];
  const ticks = [];
  for (let i = 0; i < rawTicks.length; i++) {
    const rounded = i === 0 ? 0 : roundTickValue(rawTicks[i], effectiveMax);
    if (ticks.length === 0 || rounded > ticks[ticks.length - 1]) {
      ticks.push(rounded);
    }
  }

  return {
    scale: resolvedScale,
    buckets,
    min,
    max,
    effectiveMax,
    totalSum,
    positiveCount: n,
    normalize,
    ticks,
  };
}

function interpolatePaletteChromaHue(t, palette, isDark) {
  const key = Object.prototype.hasOwnProperty.call(PALETTE_STOPS, palette) ? palette : 'cyan-ruby';
  const stops = isDark ? PALETTE_STOPS[key].dark : PALETTE_STOPS[key].light;
  const u = clamp(t, 0, 1);

  if (u <= stops[0].t) {
    return { c: stops[0].c, h: stops[0].h };
  }
  const last = stops[stops.length - 1];
  if (u >= last.t) {
    return { c: last.c, h: last.h };
  }

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (u >= a.t && u <= b.t) {
      const span = b.t - a.t;
      const alpha = span > 0 ? (u - a.t) / span : 0;
      return {
        c: a.c + (b.c - a.c) * alpha,
        h: a.h + (b.h - a.h) * alpha,
      };
    }
  }

  return { c: last.c, h: last.h };
}

/**
 * Resolves the exact in-gamut OKLCH coordinates `{ l, c, h }` for a normalized heatmap intensity `t in [0, 1]`.
 *
 * Pre-clamps chroma via `getMaxOklchChroma(L, H) * 0.96` so browsers and 8-bit `<canvas>` buffers
 * render identical colors without unpredictable out-of-gamut hue clipping.
 *
 * @param {number} t - Normalized intensity in `[0, 1]`
 * @param {Object} [options]
 * @param {'cyan-ruby'|'emerald'|'viridis'|'amber-rose'} [options.palette='cyan-ruby']
 * @param {boolean} [options.isDark=true]
 * @param {boolean} [options.isZero=false]
 * @returns {{ l: number, c: number, h: number }}
 */
export function resolveHeatmapCellOklch(t, options = {}) {
  const opts = isObject(options) ? options : {};
  const isDark = opts.isDark !== false;
  const isZero = Boolean(opts.isZero);

  if (isZero) {
    return isDark
      ? { l: 0.175, c: 0.008, h: 255 }
      : { l: 0.968, c: 0.004, h: 250 };
  }

  const u = Number.isFinite(Number(t)) ? clamp(Number(t), 0, 1) : 0;
  const l = isDark
    ? HEATMAP_DARK_L_MIN + (HEATMAP_DARK_L_MAX - HEATMAP_DARK_L_MIN) * u
    : HEATMAP_LIGHT_L_MAX - (HEATMAP_LIGHT_L_MAX - HEATMAP_LIGHT_L_MIN) * u;

  const { c: rawC, h } = interpolatePaletteChromaHue(u, opts.palette || 'cyan-ruby', isDark);
  const maxC = getMaxOklchChroma(l, h, Math.max(0.4, rawC));
  const safeC = Math.min(rawC, maxC * 0.96);

  return {
    l: Number(l.toFixed(4)),
    c: Number(safeC.toFixed(4)),
    h: Number(h.toFixed(2)),
  };
}

/**
 * Resolves a perceptual OKLCH CSS color string (`oklch(L C H)`) for a heatmap cell.
 *
 * Enforces:
 * 1. **Zero-Value Invariant**: `isZero: true` ALWAYS receives the structural empty background,
 *    never the lowest positive ramp step.
 * 2. **Monotonic OKLCH Lightness**:
 *    - Dark mode: `L` increases monotonically `0.24 -> 0.86`
 *    - Light mode: `L` decreases monotonically `0.93 -> 0.44`
 *
 * @param {number} t - Normalized intensity in `[0, 1]`
 * @param {Object} [options]
 * @param {'cyan-ruby'|'emerald'|'viridis'|'amber-rose'} [options.palette='cyan-ruby']
 * @param {boolean} [options.isDark=true]
 * @param {boolean} [options.isZero=false]
 * @param {'oklch'|'hex'|'rgb'} [options.format='oklch']
 * @returns {string}
 */
export function resolveHeatmapCellColor(t, options = {}) {
  const opts = isObject(options) ? options : {};
  const isDark = opts.isDark !== false;
  const isZero = Boolean(opts.isZero);
  const format = opts.format || 'oklch';

  if (isZero && format === 'oklch') {
    return isDark ? HEATMAP_ZERO_COLOR_DARK : HEATMAP_ZERO_COLOR_LIGHT;
  }

  const coords = resolveHeatmapCellOklch(t, opts);
  if (format === 'hex') return formatHex(coords);
  if (format === 'rgb') return formatRgb(coords);
  return `oklch(${coords.l} ${coords.c} ${coords.h})`;
}

/**
 * Resolves 8-bit sRGB channels `{ r, g, b }` for `<canvas>` heatmap rendering.
 *
 * @param {number} t
 * @param {Object} [options]
 * @returns {{ r: number, g: number, b: number }}
 */
export function resolveHeatmapCellRgb(t, options = {}) {
  const coords = resolveHeatmapCellOklch(t, options);
  return oklchToRgb(coords.l, coords.c, coords.h);
}

/**
 * Resolves a guaranteed WCAG AA (`>= 4.5:1`) foreground text color for inside-cell numeric labels.
 *
 * @param {number} t
 * @param {Object} [options]
 * @param {'cyan-ruby'|'emerald'|'viridis'|'amber-rose'} [options.palette='cyan-ruby']
 * @param {boolean} [options.isDark=true]
 * @param {boolean} [options.isZero=false]
 * @returns {string}
 */
export function resolveHeatmapTextColor(t, options = {}) {
  const opts = isObject(options) ? options : {};
  const isDark = opts.isDark !== false;
  const isZero = Boolean(opts.isZero);

  if (isZero) {
    return isDark ? '#94a3b8' : '#475569';
  }

  const bgCss = resolveHeatmapCellColor(t, opts);
  const darkText = '#000000';
  const lightText = '#ffffff';
  const darkRatio = getWcagContrastRatio(bgCss, darkText);
  const lightRatio = getWcagContrastRatio(bgCss, lightText);
  return darkRatio >= lightRatio ? darkText : lightText;
}

/**
 * Builds a 256-entry RGB lookup table (`Uint8ClampedArray(256 * 3)`) for high-FPS `<canvas>` blitting.
 *
 * @param {Object} [options]
 * @param {'cyan-ruby'|'emerald'|'viridis'|'amber-rose'} [options.palette='cyan-ruby']
 * @param {boolean} [options.isDark=true]
 * @returns {Uint8ClampedArray}
 */
export function buildHeatmapColorLut(options = {}) {
  const opts = isObject(options) ? options : {};
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const rgb = resolveHeatmapCellRgb(i / 255, {
      palette: opts.palette || 'cyan-ruby',
      isDark: opts.isDark !== false,
      isZero: false,
    });
    const base = i * 3;
    lut[base] = rgb.r;
    lut[base + 1] = rgb.g;
    lut[base + 2] = rgb.b;
  }
  return lut;
}

/**
 * Deterministic 2D Gaussian Kernel Density Estimation (`KDE`) grid for pointer / click density maps.
 *
 * Pure empirical invariant: when `points` is empty (`[]`), returns an all-zero grid with `max = 0`
 * and `pointCount = 0` — never fabricating synthetic hotspots.
 *
 * @param {Array<{ x: number, y: number, weight?: number }>} points - Normalized points in `[0, 1] x [0, 1]`
 * @param {Object} [options]
 * @param {number} [options.cols=48]
 * @param {number} [options.rows=32]
 * @param {number} [options.radius=2.4] - Gaussian sigma in grid cell units
 * @returns {{
 *   cols: number,
 *   rows: number,
 *   radius: number,
 *   cells: Float64Array,
 *   grid: number[][],
 *   min: number,
 *   max: number,
 *   totalWeight: number,
 *   pointCount: number
 * }}
 */
export function computeGaussianDensityGrid(points, options = {}) {
  const opts = isObject(options) ? options : {};
  const cols = Math.max(1, Math.min(512, Math.trunc(Number(opts.cols) || 48)));
  const rows = Math.max(1, Math.min(512, Math.trunc(Number(opts.rows) || 32)));
  const radius = Math.max(0.25, Number(opts.radius) || 2.4);
  const cells = new Float64Array(cols * rows);

  if (!Array.isArray(points) || points.length === 0) {
    const emptyGrid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
    return {
      cols,
      rows,
      radius,
      cells,
      grid: emptyGrid,
      min: 0,
      max: 0,
      totalWeight: 0,
      pointCount: 0,
    };
  }

  const twoSigmaSq = 2 * radius * radius;
  const cutoff = Math.ceil(radius * 3.5);
  let pointCount = 0;
  let totalWeight = 0;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (!isObject(pt)) continue;
    const rawX = Number(pt.x);
    const rawY = Number(pt.y);
    if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) continue;
    if (rawX < -0.05 || rawX > 1.05 || rawY < -0.05 || rawY > 1.05) continue;

    const w = pt.weight === undefined ? 1 : Number(pt.weight);
    if (!Number.isFinite(w) || w <= 0) continue;

    const x = clamp(rawX, 0, 1);
    const y = clamp(rawY, 0, 1);
    const gx = cols === 1 ? 0 : x * (cols - 1);
    const gy = rows === 1 ? 0 : y * (rows - 1);

    const rStart = Math.max(0, Math.floor(gy - cutoff));
    const rEnd = Math.min(rows - 1, Math.ceil(gy + cutoff));
    const cStart = Math.max(0, Math.floor(gx - cutoff));
    const cEnd = Math.min(cols - 1, Math.ceil(gx + cutoff));

    for (let r = rStart; r <= rEnd; r++) {
      const dy = r - gy;
      const dySq = dy * dy;
      const rowOffset = r * cols;
      for (let c = cStart; c <= cEnd; c++) {
        const dx = c - gx;
        const d2 = dx * dx + dySq;
        cells[rowOffset + c] += w * Math.exp(-d2 / twoSigmaSq);
      }
    }

    pointCount += 1;
    totalWeight += w;
  }

  let max = 0;
  let min = Infinity;
  for (let i = 0; i < cells.length; i++) {
    const v = cells[i];
    if (v > max) max = v;
    if (v > 0 && v < min) min = v;
  }
  if (!Number.isFinite(min)) min = 0;

  const grid = Array.from({ length: rows }, (_, r) =>
    Array.from(cells.subarray(r * cols, (r + 1) * cols))
  );

  return {
    cols,
    rows,
    radius,
    cells,
    grid,
    min,
    max,
    totalWeight,
    pointCount,
  };
}

function normalizeAxisItems(items, fallbackPrefix) {
  if (!Array.isArray(items)) return [];
  return items.map((entry, idx) => {
    if (isObject(entry)) {
      const id = entry.id ?? entry.key ?? idx;
      return {
        id: String(id),
        rawId: id,
        label: entry.label !== undefined ? String(entry.label) : String(id),
        sublabel: entry.sublabel ? String(entry.sublabel) : '',
      };
    }
    const text = entry !== null && entry !== undefined ? String(entry) : `${fallbackPrefix}-${idx}`;
    return {
      id: text,
      rawId: entry ?? idx,
      label: text,
      sublabel: '',
    };
  });
}

/**
 * Normalizes `rows`, `cols`, and `data` (2D `number[][]`, list of `{ rowId, colId, value, meta? }`,
 * or keyed lookup map) into a canonical matrix structure with row/column/grand totals.
 *
 * @param {Array<any>} rows
 * @param {Array<any>} cols
 * @param {Array<any>|Record<string, any>} data
 * @returns {{
 *   rows: Array<{ id: string, rawId: any, label: string, sublabel: string }>,
 *   cols: Array<{ id: string, rawId: any, label: string, sublabel: string }>,
 *   values2D: Array<Array<number|null>>,
 *   meta2D: Array<Array<any>>,
 *   rowTotals: number[],
 *   colTotals: number[],
 *   grandTotal: number,
 *   positiveCount: number
 * }}
 */
export function normalizeHeatmapMatrixData(rows, cols, data) {
  let normRows = normalizeAxisItems(rows, 'r');
  let normCols = normalizeAxisItems(cols, 'c');

  const is2DMatrix =
    Array.isArray(data) &&
    data.length > 0 &&
    Array.isArray(data[0]);

  if (normRows.length === 0 && is2DMatrix) {
    normRows = data.map((_, rIdx) => ({
      id: String(rIdx),
      rawId: rIdx,
      label: String(rIdx + 1),
      sublabel: '',
    }));
  }
  if (normCols.length === 0 && is2DMatrix) {
    const maxCols = data.reduce((acc, row) => (Array.isArray(row) ? Math.max(acc, row.length) : acc), 0);
    normCols = Array.from({ length: maxCols }, (_, cIdx) => ({
      id: String(cIdx),
      rawId: cIdx,
      label: String(cIdx + 1),
      sublabel: '',
    }));
  }

  const rCount = normRows.length;
  const cCount = normCols.length;
  const values2D = Array.from({ length: rCount }, () => Array.from({ length: cCount }, () => null));
  const meta2D = Array.from({ length: rCount }, () => Array.from({ length: cCount }, () => null));

  const rowIndexById = new Map();
  for (let r = 0; r < rCount; r++) {
    rowIndexById.set(normRows[r].id, r);
  }
  const colIndexById = new Map();
  for (let c = 0; c < cCount; c++) {
    colIndexById.set(normCols[c].id, c);
  }

  if (is2DMatrix) {
    for (let r = 0; r < rCount; r++) {
      const srcRow = data[r];
      if (!Array.isArray(srcRow)) continue;
      for (let c = 0; c < cCount; c++) {
        const entry = srcRow[c];
        if (isObject(entry)) {
          const num = Number(entry.value);
          values2D[r][c] = Number.isFinite(num) ? num : null;
          meta2D[r][c] = entry.meta ?? entry;
        } else if (entry !== null && entry !== undefined && entry !== '') {
          const num = Number(entry);
          values2D[r][c] = Number.isFinite(num) ? num : null;
        }
      }
    }
  } else if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (!isObject(item)) continue;
      const rKey = item.rowId !== undefined ? String(item.rowId) : item.row !== undefined ? String(item.row) : '';
      const cKey = item.colId !== undefined ? String(item.colId) : item.col !== undefined ? String(item.col) : '';
      const rIdx = rowIndexById.get(rKey);
      const cIdx = colIndexById.get(cKey);
      if (rIdx === undefined || cIdx === undefined) continue;
      const num = Number(item.value);
      if (Number.isFinite(num)) {
        values2D[rIdx][cIdx] = (values2D[rIdx][cIdx] ?? 0) + num;
      }
      if (item.meta !== undefined) {
        meta2D[rIdx][cIdx] = item.meta;
      }
    }
  } else if (isObject(data)) {
    for (let r = 0; r < rCount; r++) {
      const rId = normRows[r].id;
      const nestedRow = isObject(data[rId]) ? data[rId] : null;
      for (let c = 0; c < cCount; c++) {
        const cId = normCols[c].id;
        let rawVal;
        if (nestedRow && Object.prototype.hasOwnProperty.call(nestedRow, cId)) {
          rawVal = nestedRow[cId];
        } else {
          const compositeKey = `${rId}::${cId}`;
          const colonKey = `${rId}:${cId}`;
          if (Object.prototype.hasOwnProperty.call(data, compositeKey)) {
            rawVal = data[compositeKey];
          } else if (Object.prototype.hasOwnProperty.call(data, colonKey)) {
            rawVal = data[colonKey];
          }
        }
        if (isObject(rawVal)) {
          const num = Number(rawVal.value);
          values2D[r][c] = Number.isFinite(num) ? num : null;
          meta2D[r][c] = rawVal.meta ?? rawVal;
        } else if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
          const num = Number(rawVal);
          values2D[r][c] = Number.isFinite(num) ? num : null;
        }
      }
    }
  }

  const rowTotals = Array.from({ length: rCount }, () => 0);
  const colTotals = Array.from({ length: cCount }, () => 0);
  let grandTotal = 0;
  let positiveCount = 0;

  for (let r = 0; r < rCount; r++) {
    for (let c = 0; c < cCount; c++) {
      const val = values2D[r][c];
      if (Number.isFinite(val) && val > 0) {
        rowTotals[r] += val;
        colTotals[c] += val;
        grandTotal += val;
        positiveCount += 1;
      }
    }
  }

  return {
    rows: normRows,
    cols: normCols,
    values2D,
    meta2D,
    rowTotals,
    colTotals,
    grandTotal,
    positiveCount,
  };
}

/**
 * Formats compact telemetry counts (e.g. `12400` -> `'12.4k'`) for dense inside-cell badges.
 *
 * @param {number|null|undefined} value
 * @param {Function|null} [customFormatter=null]
 * @param {Object|null} [cell=null]
 * @returns {string}
 */
export function formatHeatmapCompactValue(value, customFormatter = null, cell = null) {
  if (isFunction(customFormatter)) {
    return String(customFormatter(value, cell) ?? '');
  }
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '0';
  const n = Number(value);
  if (n <= 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  if (Number.isInteger(n)) return String(n);
  return n >= 10 ? n.toFixed(1) : n.toFixed(2);
}
