<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
  createKineticTransition,
  createKineticPoints,
  buildSplinePath,
  evaluateSplineY,
} from '../utils/kinetics.js';
import {
  computeVerticalBands,
  getDateWeekdayInfo,
} from '../utils/chart-bands.js';

const props = defineProps({
  /**
   * Multi-series array:
   * [{
   *   id: string,
   *   label: string,
   *   color: string,
   *   strokeWidth?: number,
   *   dash?: string,
   *   area?: boolean,
   *   areaOpacity?: number,
   *   points: Array<{ key?: string, label?: string, value: number|null, rawValue?: number, subValue?: string, subtext?: string, badge?: string|{text:string,highlight?:boolean}, ...meta }>
   * }]
   */
  series: {
    type: Array,
    default: () => [],
  },
  /**
   * Single-series convenience shorthand (used when `series` is empty).
   */
  points: {
    type: Array,
    default: () => [],
  },
  label: {
    type: String,
    default: '',
  },
  color: {
    type: String,
    default: '#6366f1',
  },
  area: {
    type: Boolean,
    default: undefined,
  },
  /**
   * Curve interpolation mode: 'spline' (Catmull-Rom cubic Bezier) or 'linear'.
   */
  curve: {
    type: String,
    default: 'spline',
  },
  /**
   * Catmull-Rom spline tension (default 0.35).
   */
  tension: {
    type: Number,
    default: 0.35,
  },
  /**
   * Duration (ms) for kinetic curve and Y-axis transitions.
   */
  kineticDuration: {
    type: Number,
    default: 350,
  },
  /**
   * Optional scalar key (e.g. `${currency}:${unit}`). When ONLY this key changes,
   * Y-bounds and points update with `immediate: true` so pure unit/currency scaling
   * does not trigger a redundant vertical bounce.
   */
  immediateKey: {
    type: [String, Number],
    default: '',
  },
  /**
   * SVG coordinate space dimensions & padding.
   */
  width: {
    type: Number,
    default: 920,
  },
  height: {
    type: Number,
    default: 300,
  },
  padLeft: {
    type: Number,
    default: 64,
  },
  padRight: {
    type: Number,
    default: 24,
  },
  padTop: {
    type: Number,
    default: 24,
  },
  padBottom: {
    type: Number,
    default: 38,
  },
  /**
   * Number of horizontal Y-axis grid intervals (default 4 -> 5 grid lines).
   */
  yTicks: {
    type: Number,
    default: 4,
  },
  /**
   * Maximum number of X-axis tick labels to display.
   */
  maxXTicks: {
    type: Number,
    default: 7,
  },
  /**
   * Whether to show a 0.0 horizontal reference line when 0 is within [min, max].
   */
  zeroBaseline: {
    type: Boolean,
    default: false,
  },
  /**
   * Optional horizontal reference lines: [{ value: number, label?: string, color?: string, dash?: string }]
   */
  referenceLines: {
    type: Array,
    default: () => [],
  },
  /**
   * Vertical bands configuration:
   * - false / null: disabled
   * - true / 'weekend': calendar weekend bands (SB–ND / SAT–SUN)
   * - Object: passed to `computeVerticalBands(xPoints, leftBound, rightBound, config)`
   * - Array: explicit band definitions
   */
  verticalBands: {
    type: [Boolean, String, Object, Array],
    default: false,
  },
  /**
   * Toggle visibility of configured vertical bands.
   */
  showVerticalBands: {
    type: Boolean,
    default: true,
  },
  /**
   * Locale hint ('pl' | 'en') used by optional date/weekday presets.
   */
  lang: {
    type: String,
    default: 'pl',
  },
  /**
   * Custom formatters.
   */
  formatYLabel: {
    type: Function,
    default: null,
  },
  formatXLabel: {
    type: Function,
    default: null,
  },
  formatValue: {
    type: Function,
    default: null,
  },
  /**
   * Optional badge resolver for tooltip header: `(point, index, key) => null | string | { text, highlight }`.
   * If omitted and `key` matches `YYYY-MM-DD`, automatically resolves weekday badge via `getDateWeekdayInfo`.
   */
  getXBadge: {
    type: Function,
    default: null,
  },
  /**
   * Optional footer text or function `({ index, key, items }) => string` for tooltip bubble.
   */
  tooltipFooter: {
    type: [String, Function],
    default: '',
  },
  /**
   * Optional custom Y-bounds calculator `(values: number[]) => { minVal, maxVal }`.
   */
  computeBounds: {
    type: Function,
    default: null,
  },
  /**
   * Accessible label for the SVG chart.
   */
  ariaLabel: {
    type: String,
    default: 'Interactive trend chart',
  },
});

const emit = defineEmits(['hover', 'leave', 'point-click']);

const instanceUid = Math.random().toString(36).slice(2, 9);

const plotW = computed(() => Math.max(10, props.width - props.padLeft - props.padRight));
const plotH = computed(() => Math.max(10, props.height - props.padTop - props.padBottom));
const groundY = computed(() => props.height - props.padBottom);

// Normalize series list (supports either `series` array or single-series `points`)
const normalizedSeries = computed(() => {
  if (Array.isArray(props.series) && props.series.length > 0) {
    return props.series.map((s, sIdx) => ({
      id: String(s.id ?? `series-${sIdx}`),
      label: s.label ?? String(s.id ?? `Series ${sIdx + 1}`),
      color: s.color || '#6366f1',
      strokeWidth: s.strokeWidth ?? 2.5,
      dash: s.dash || '',
      area: s.area !== undefined ? Boolean(s.area) : (props.series.length === 1 && props.area !== false),
      areaOpacity: s.areaOpacity ?? 0.24,
      points: Array.isArray(s.points) ? s.points : [],
    }));
  }
  if (Array.isArray(props.points) && props.points.length > 0) {
    return [
      {
        id: 'primary',
        label: props.label || '',
        color: props.color || '#6366f1',
        strokeWidth: 2.6,
        dash: '',
        area: props.area !== false,
        areaOpacity: 0.25,
        points: props.points,
      },
    ];
  }
  return [];
});

const resolvePtKey = (pt, idx) => {
  if (!pt || typeof pt !== 'object') return String(idx);
  return String(pt.key ?? pt.xKey ?? pt.date ?? pt.id ?? pt.label ?? idx);
};

// Ordered canonical X-axis spine across all active series
const xSpine = computed(() => {
  const map = new Map();
  for (const s of normalizedSeries.value) {
    s.points.forEach((pt, idx) => {
      const k = resolvePtKey(pt, idx);
      if (!map.has(k)) {
        map.set(k, {
          key: k,
          label: String(pt.label ?? pt.xLabel ?? pt.date ?? k),
          date: pt.date,
          band: pt.band,
          bandLabel: pt.bandLabel,
          badge: pt.badge,
          rawPoint: pt,
        });
      }
    });
  }
  const entries = Array.from(map.values());
  // If all keys look like ISO dates YYYY-MM-DD, sort chronologically; otherwise preserve insertion order
  if (entries.length > 1 && entries.every((e) => /^\d{4}-\d{2}-\d{2}/.test(e.key))) {
    entries.sort((a, b) => a.key.localeCompare(b.key));
  }
  const n = entries.length;
  return entries.map((entry, idx) => {
    const x = n === 1
      ? props.padLeft + plotW.value / 2
      : props.padLeft + (idx / (n - 1)) * plotW.value;
    return {
      ...entry,
      index: idx,
      x,
    };
  });
});

// Default positively-homogeneous Y-axis bounds calculator
const defaultComputeBounds = (values) => {
  const finite = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (finite.length === 0) {
    return { minVal: 0, maxVal: 10 };
  }
  let dataMin = Math.min(...finite);
  let dataMax = Math.max(...finite);
  if (props.zeroBaseline) {
    dataMin = Math.min(dataMin, 0);
    dataMax = Math.max(dataMax, 0);
  }
  const rawSpan = dataMax - dataMin;
  const refMag = Math.max(Math.abs(dataMax), Math.abs(dataMin));
  const effectiveSpan = Math.max(rawSpan, refMag * 0.04, 1e-9);
  const pad = effectiveSpan * 0.14;
  const minVal = dataMin >= 0 && !props.zeroBaseline ? Math.max(0, dataMin - pad) : dataMin - pad;
  const maxVal = dataMax + pad;
  return { minVal, maxVal };
};

const targetBounds = computed(() => {
  const vals = [];
  for (const s of normalizedSeries.value) {
    for (const pt of s.points) {
      const v = Number(pt?.value);
      if (pt?.value !== null && pt?.value !== undefined && Number.isFinite(v)) {
        vals.push(v);
      }
    }
  }
  for (const refLine of props.referenceLines) {
    if (typeof refLine?.value === 'number' && Number.isFinite(refLine.value)) {
      vals.push(refLine.value);
    }
  }
  if (typeof props.computeBounds === 'function') {
    const res = props.computeBounds(vals);
    if (res && Number.isFinite(res.minVal) && Number.isFinite(res.maxVal)) {
      return res;
    }
  }
  return defaultComputeBounds(vals);
});

const valueToY = (val, minV, maxV) => {
  const span = Math.max(1e-9, maxV - minV);
  return props.padTop + (1 - (val - minV) / span) * plotH.value;
};

// Target SVG coordinates per series
const targetSeriesCoords = computed(() => {
  const spine = xSpine.value;
  const spineByKey = new Map(spine.map((item) => [item.key, item]));
  const { minVal, maxVal } = targetBounds.value;

  return normalizedSeries.value.map((s) => {
    const pts = [];
    s.points.forEach((pt, idx) => {
      if (pt?.value === null || pt?.value === undefined || !Number.isFinite(Number(pt.value))) {
        return;
      }
      const k = resolvePtKey(pt, idx);
      const spineEntry = spineByKey.get(k);
      if (!spineEntry) return;
      const numVal = Number(pt.value);
      pts.push({
        ...pt,
        key: k,
        label: pt.label ?? spineEntry.label,
        spineIndex: spineEntry.index,
        value: numVal,
        x: spineEntry.x,
        y: valueToY(numVal, minVal, maxVal),
      });
    });
    return {
      ...s,
      coords: pts,
    };
  });
});

// ============================================================================
// Kinetic Animation State (Multi-Series Points + Y-Bounds + Hover Crosshair)
// ============================================================================
const animatedSeriesMap = ref({});
const animatedMin = ref(0);
const animatedMax = ref(10);
const animatedTooltipX = ref(props.padLeft);
const animatedTooltipOpacity = ref(0);
const hoveredSpineIndex = ref(null);
const lastValidSpineIndex = ref(null);
const svgRef = ref(null);

const seriesControllers = new Map();
let rafId = null;
let lastImmediateKey = props.immediateKey;

const minController = createKineticTransition({
  initialValue: 0,
  duration: props.kineticDuration,
  shortestPath: false,
  timingMode: 'fixed',
  onUpdate: ({ value }) => {
    animatedMin.value = value;
  },
});

const maxController = createKineticTransition({
  initialValue: 10,
  duration: props.kineticDuration,
  shortestPath: false,
  timingMode: 'fixed',
  onUpdate: ({ value }) => {
    animatedMax.value = value;
  },
});

const tooltipXController = createKineticTransition({
  initialValue: props.padLeft,
  duration: 150,
  shortestPath: false,
  timingMode: 'fixed',
  onUpdate: ({ value }) => {
    animatedTooltipX.value = value;
  },
});

const tooltipOpacityController = createKineticTransition({
  initialValue: 0,
  duration: 150,
  shortestPath: false,
  timingMode: 'fixed',
  onUpdate: ({ value }) => {
    animatedTooltipOpacity.value = Math.max(0, Math.min(1, value));
  },
});

const isAnyControllerMoving = () => {
  if (
    minController.isMoving() ||
    maxController.isMoving() ||
    tooltipXController.isMoving() ||
    tooltipOpacityController.isMoving()
  ) {
    return true;
  }
  for (const ctrl of seriesControllers.values()) {
    if (ctrl.isMoving()) return true;
  }
  return false;
};

const tickKinematics = (timestamp) => {
  minController.step(timestamp);
  maxController.step(timestamp);
  tooltipXController.step(timestamp);
  tooltipOpacityController.step(timestamp);

  const nextMap = { ...animatedSeriesMap.value };
  for (const [id, ctrl] of seriesControllers.entries()) {
    if (ctrl.isMoving()) {
      nextMap[id] = [...ctrl.step(timestamp)];
    }
  }
  animatedSeriesMap.value = nextMap;

  if (isAnyControllerMoving()) {
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      rafId = window.requestAnimationFrame(tickKinematics);
    }
  } else {
    rafId = null;
  }
};

const ensureAnimationLoop = () => {
  if (rafId !== null) return;
  if (typeof window !== 'undefined' && window.requestAnimationFrame) {
    rafId = window.requestAnimationFrame(tickKinematics);
  } else {
    tickKinematics(Date.now());
  }
};

const syncKineticTargets = ({ forceImmediate = false } = {}) => {
  const isImmediate =
    forceImmediate ||
    (props.immediateKey !== '' && props.immediateKey !== lastImmediateKey) ||
    Object.keys(animatedSeriesMap.value).length === 0;

  lastImmediateKey = props.immediateKey;

  const { minVal, maxVal } = targetBounds.value;
  minController.setTarget(minVal, { immediate: isImmediate });
  maxController.setTarget(maxVal, { immediate: isImmediate });
  if (isImmediate) {
    animatedMin.value = minVal;
    animatedMax.value = maxVal;
  }

  const activeIds = new Set();
  const nextMap = { ...animatedSeriesMap.value };

  for (const s of targetSeriesCoords.value) {
    activeIds.add(s.id);
    let ctrl = seriesControllers.get(s.id);
    const isNewSeries = !ctrl;
    if (!ctrl) {
      ctrl = createKineticPoints({
        duration: props.kineticDuration,
        onUpdate: (pts) => {
          animatedSeriesMap.value = {
            ...animatedSeriesMap.value,
            [s.id]: [...pts],
          };
        },
      });
      seriesControllers.set(s.id, ctrl);
    }
    const pts = ctrl.setTargets(s.coords, { immediate: isImmediate || isNewSeries });
    nextMap[s.id] = [...pts];
  }

  // Cleanup controllers for removed series
  for (const [id, ctrl] of seriesControllers.entries()) {
    if (!activeIds.has(id)) {
      ctrl.destroy();
      seriesControllers.delete(id);
      delete nextMap[id];
    }
  }

  animatedSeriesMap.value = nextMap;

  if (!isImmediate) {
    ensureAnimationLoop();
  }
};

watch(
  [targetSeriesCoords, targetBounds, () => props.immediateKey],
  () => {
    syncKineticTargets();
  },
  { deep: true, immediate: true }
);

onMounted(() => {
  syncKineticTargets({ forceImmediate: true });
});

onUnmounted(() => {
  if (rafId !== null && typeof window !== 'undefined' && window.cancelAnimationFrame) {
    window.cancelAnimationFrame(rafId);
    rafId = null;
  }
  for (const ctrl of seriesControllers.values()) {
    ctrl.destroy();
  }
  seriesControllers.clear();
  minController.destroy();
  maxController.destroy();
  tooltipXController.destroy();
  tooltipOpacityController.destroy();
});

// ============================================================================
// Rendered Paths, Grid Lines, Vertical Bands & Active Hover Points
// ============================================================================
const buildLinearPath = (pts, closeGroundY = null) => {
  if (!pts || pts.length === 0) return '';
  let d = pts
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  if (closeGroundY !== null && pts.length > 1) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    d += ` L ${last.x.toFixed(1)} ${closeGroundY.toFixed(1)} L ${first.x.toFixed(1)} ${closeGroundY.toFixed(1)} Z`;
  }
  return d;
};

const evaluateLinearY = (pts, targetX) => {
  if (!pts || !pts.length) return 0;
  const n = pts.length;
  if (n === 1 || targetX <= pts[0].x) return pts[0].y;
  if (targetX >= pts[n - 1].x) return pts[n - 1].y;
  for (let i = 0; i < n - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    if (targetX >= p1.x && targetX <= p2.x) {
      const dx = p2.x - p1.x;
      if (Math.abs(dx) < 1e-4) return p1.y;
      const t = (targetX - p1.x) / dx;
      return p1.y + t * (p2.y - p1.y);
    }
  }
  return pts[n - 1].y;
};

const renderedSeries = computed(() =>
  targetSeriesCoords.value.map((s) => {
    const pts = animatedSeriesMap.value[s.id]?.length
      ? animatedSeriesMap.value[s.id]
      : s.coords;
    const isSpline = props.curve !== 'linear';
    const linePath = isSpline
      ? buildSplinePath(pts, { tension: props.tension })
      : buildLinearPath(pts, null);
    const areaPath = s.area
      ? isSpline
        ? buildSplinePath(pts, { tension: props.tension, groundY: groundY.value })
        : buildLinearPath(pts, groundY.value)
      : '';
    return {
      ...s,
      pts,
      linePath,
      areaPath,
      gradId: `nano-trend-grad-${instanceUid}-${s.id}`,
    };
  })
);

const defaultFormatY = (val) => {
  const abs = Math.abs(val);
  if (abs >= 1000) return val.toFixed(0);
  if (abs >= 10) return val.toFixed(2);
  if (abs >= 1) return val.toFixed(2);
  return val.toFixed(3);
};

const yGridLines = computed(() => {
  const steps = Math.max(1, props.yTicks);
  const minV = animatedMin.value;
  const maxV = animatedMax.value;
  const span = Math.max(1e-9, maxV - minV);
  const lines = [];
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const val = maxV - ratio * span;
    const y = props.padTop + ratio * plotH.value;
    const label = props.formatYLabel ? props.formatYLabel(val) : defaultFormatY(val);
    lines.push({ y, val, label });
  }
  return lines;
});

const zeroBaselineY = computed(() => {
  if (!props.zeroBaseline) return null;
  const minV = animatedMin.value;
  const maxV = animatedMax.value;
  if (minV < 0 && maxV > 0) {
    return valueToY(0, minV, maxV);
  }
  return null;
});

const renderedReferenceLines = computed(() => {
  const minV = animatedMin.value;
  const maxV = animatedMax.value;
  return props.referenceLines
    .filter((r) => typeof r?.value === 'number' && r.value >= minV && r.value <= maxV)
    .map((r, idx) => ({
      key: r.key || `ref-${idx}`,
      y: valueToY(r.value, minV, maxV),
      label: r.label || '',
      color: r.color || 'var(--nano-text-muted, #64748b)',
      dash: r.dash || '4,4',
    }));
});

const xTickLabels = computed(() => {
  const spine = xSpine.value;
  if (!spine.length) return [];
  const maxTicks = Math.max(2, props.maxXTicks);
  const step = Math.max(1, Math.ceil((spine.length - 1) / (maxTicks - 1)));
  const ticks = [];

  const formatTick = (entry) => {
    if (props.formatXLabel) {
      return props.formatXLabel(entry.label, entry.rawPoint, entry.index);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(entry.label)) {
      return entry.label.slice(5); // MM-DD
    }
    return entry.label;
  };

  for (let i = 0; i < spine.length; i += step) {
    ticks.push({
      key: spine[i].key,
      x: spine[i].x,
      label: formatTick(spine[i]),
    });
  }
  const last = spine[spine.length - 1];
  if (ticks.length && ticks[ticks.length - 1].key !== last.key) {
    const minPxGap = 46;
    if (last.x - ticks[ticks.length - 1].x < minPxGap && ticks.length > 1) {
      ticks[ticks.length - 1] = {
        key: last.key,
        x: last.x,
        label: formatTick(last),
      };
    } else {
      ticks.push({
        key: last.key,
        x: last.x,
        label: formatTick(last),
      });
    }
  }
  return ticks;
});

// Configurable Vertical Highlight Bands
const computedBands = computed(() => {
  if (!props.verticalBands || !props.showVerticalBands) return [];
  const spine = xSpine.value;
  if (!spine.length) return [];
  const leftBound = props.padLeft;
  const rightBound = props.width - props.padRight;

  let bandConfig = props.verticalBands;
  if (bandConfig === true || bandConfig === 'weekend') {
    bandConfig = { preset: 'weekend', lang: props.lang };
  } else if (typeof bandConfig === 'object' && !Array.isArray(bandConfig) && !bandConfig.lang) {
    bandConfig = { ...bandConfig, lang: props.lang };
  }

  return computeVerticalBands(spine, leftBound, rightBound, bandConfig).map((b) => {
    const pillWidth = Math.max(22, (b.label?.length || 0) * 6.2 + 10);
    return {
      ...b,
      pillWidth,
      showLabel: Boolean(b.label) && b.width >= Math.min(18, pillWidth * 0.65),
    };
  });
});

// ============================================================================
// Pointer Hover & Kinetic Crosshair Tracking
// ============================================================================
const activeSpineIndex = computed(() =>
  hoveredSpineIndex.value !== null ? hoveredSpineIndex.value : lastValidSpineIndex.value
);

const activeSpineEntry = computed(() => {
  const idx = activeSpineIndex.value;
  if (idx === null || idx < 0 || idx >= xSpine.value.length) return null;
  return xSpine.value[idx];
});

const activeHoverDots = computed(() => {
  const entry = activeSpineEntry.value;
  if (!entry) return [];
  const targetX = animatedTooltipX.value;
  const isSpline = props.curve !== 'linear';

  return renderedSeries.value
    .map((s) => {
      const exactPt = s.coords.find((p) => p.key === entry.key);
      if (!exactPt) return null;
      const y = isSpline
        ? evaluateSplineY(s.pts, targetX, props.tension)
        : evaluateLinearY(s.pts, targetX);
      const formattedVal = props.formatValue
        ? props.formatValue(exactPt.value, s, exactPt)
        : defaultFormatY(exactPt.value);
      return {
        seriesId: s.id,
        label: s.label,
        color: s.color,
        x: targetX,
        y,
        value: exactPt.value,
        rawValue: exactPt.rawValue,
        formattedValue: formattedVal,
        subValue: exactPt.subValue || '',
        subtext: exactPt.subtext || '',
        point: exactPt,
      };
    })
    .filter(Boolean);
});

const activeBadge = computed(() => {
  const entry = activeSpineEntry.value;
  if (!entry) return null;

  if (typeof props.getXBadge === 'function') {
    const res = props.getXBadge(entry.rawPoint, entry.index, entry.key);
    if (!res) return null;
    if (typeof res === 'string') return { text: res, highlight: false };
    return { text: res.text || '', highlight: Boolean(res.highlight) };
  }

  if (entry.badge) {
    if (typeof entry.badge === 'string') {
      return { text: entry.badge, highlight: Boolean(entry.rawPoint?.badgeHighlight) };
    }
    if (typeof entry.badge === 'object') {
      return { text: entry.badge.text || '', highlight: Boolean(entry.badge.highlight) };
    }
  }

  // Automatic weekday badge fallback when key/date is ISO YYYY-MM-DD
  const candidateDate = entry.date || entry.key;
  if (typeof candidateDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(candidateDate.slice(0, 10))) {
    const info = getDateWeekdayInfo(candidateDate, props.lang);
    if (info.shortName) {
      return { text: info.shortName, highlight: info.isWeekend };
    }
  }
  return null;
});

const resolvedTooltipFooter = computed(() => {
  if (!activeSpineEntry.value) return '';
  if (typeof props.tooltipFooter === 'function') {
    return props.tooltipFooter({
      index: activeSpineEntry.value.index,
      key: activeSpineEntry.value.key,
      label: activeSpineEntry.value.label,
      items: activeHoverDots.value,
    });
  }
  return props.tooltipFooter || '';
});

const tooltipXPercent = computed(() => (animatedTooltipX.value / props.width) * 100);

const tooltipStyle = computed(() => {
  const xPct = tooltipXPercent.value;
  let translateX = '-50%';
  if (xPct < 18) translateX = '-10%';
  else if (xPct > 82) translateX = '-90%';

  return {
    left: `${xPct}%`,
    top: '8px',
    transform: `translate(${translateX}, 0)`,
    opacity: animatedTooltipOpacity.value,
    pointerEvents: 'none',
  };
});

const handlePointerMove = (e) => {
  const spine = xSpine.value;
  if (!svgRef.value || !spine.length) return;
  const rect = svgRef.value.getBoundingClientRect();
  if (!rect.width) return;

  const clientX = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
  const relX = ((clientX - rect.left) / rect.width) * props.width;

  let closestIdx = 0;
  let minDist = Infinity;
  for (let i = 0; i < spine.length; i++) {
    const dist = Math.abs(spine[i].x - relX);
    if (dist < minDist) {
      minDist = dist;
      closestIdx = i;
    }
  }

  const isFirstAppear = hoveredSpineIndex.value === null && animatedTooltipOpacity.value < 0.05;
  hoveredSpineIndex.value = closestIdx;
  lastValidSpineIndex.value = closestIdx;

  const targetX = spine[closestIdx].x;
  tooltipXController.setTarget(targetX, { immediate: isFirstAppear });
  if (isFirstAppear) {
    animatedTooltipX.value = targetX;
  }
  tooltipOpacityController.setTarget(1);
  ensureAnimationLoop();

  emit('hover', {
    index: closestIdx,
    key: spine[closestIdx].key,
    label: spine[closestIdx].label,
    items: activeHoverDots.value,
  });
};

const handlePointerLeave = () => {
  hoveredSpineIndex.value = null;
  tooltipOpacityController.setTarget(0);
  ensureAnimationLoop();
  emit('leave');
};

const handlePointClick = () => {
  if (activeSpineEntry.value) {
    emit('point-click', {
      index: activeSpineEntry.value.index,
      key: activeSpineEntry.value.key,
      label: activeSpineEntry.value.label,
      items: activeHoverDots.value,
    });
  }
};

const setHoverIndex = (idx) => {
  const spine = xSpine.value;
  if (!spine.length || typeof idx !== 'number' || idx < 0 || idx >= spine.length) return;
  const isFirstAppear = hoveredSpineIndex.value === null && animatedTooltipOpacity.value < 0.05;
  hoveredSpineIndex.value = idx;
  lastValidSpineIndex.value = idx;
  const targetX = spine[idx].x;
  tooltipXController.setTarget(targetX, { immediate: isFirstAppear });
  if (isFirstAppear) animatedTooltipX.value = targetX;
  tooltipOpacityController.setTarget(1);
  ensureAnimationLoop();
};

const clearHover = () => {
  handlePointerLeave();
};

const getBounds = () => ({
  minVal: animatedMin.value,
  maxVal: animatedMax.value,
  targetMin: targetBounds.value.minVal,
  targetMax: targetBounds.value.maxVal,
});

defineExpose({
  setHoverIndex,
  clearHover,
  getBounds,
  hoveredSpineIndex,
  activeSpineEntry,
  activeHoverDots,
  computedBands,
});
</script>

<template>
  <div class="nano-trend-chart">
    <slot name="header" />
    <slot name="subbar" />

    <div
      class="nano-trend-canvas-wrap"
      @mousemove="handlePointerMove"
      @touchstart.passive="handlePointerMove"
      @touchmove.passive="handlePointerMove"
      @mouseleave="handlePointerLeave"
      @touchend="handlePointerLeave"
      @click="handlePointClick"
    >
      <svg
        ref="svgRef"
        :viewBox="`0 0 ${width} ${height}`"
        class="nano-trend-svg"
        role="img"
        :aria-label="ariaLabel"
      >
        <defs>
          <linearGradient
            v-for="s in renderedSeries"
            :id="s.gradId"
            :key="`grad-${s.id}`"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" :stop-color="s.color" :stop-opacity="s.areaOpacity" />
            <stop offset="100%" :stop-color="s.color" stop-opacity="0.0" />
          </linearGradient>
        </defs>

        <!-- 1. Configurable Vertical Highlight Bands (e.g. SB–ND, Q1–Q2, Peak Zones) -->
        <g v-if="computedBands.length" class="nano-chart-vertical-bands">
          <g v-for="band in computedBands" :key="`band-${band.key}`">
            <rect
              :x="band.x"
              :y="padTop"
              :width="band.width"
              :height="plotH"
              class="nano-chart-band-rect"
              :style="band.color ? { fill: band.color, stroke: band.color } : undefined"
            />
            <line
              v-for="(divX, dIdx) in band.dividers"
              :key="`div-${band.key}-${dIdx}`"
              :x1="divX"
              :y1="padTop"
              :x2="divX"
              :y2="height - padBottom"
              class="nano-chart-band-divider"
              stroke-dasharray="2 3"
            />
            <g v-if="band.showLabel" class="nano-chart-band-badge">
              <rect
                :x="band.labelX - band.pillWidth / 2"
                :y="padTop + 4"
                :width="band.pillWidth"
                height="13"
                rx="3.5"
                class="nano-chart-band-pill"
              />
              <text
                :x="band.labelX"
                :y="padTop + 13"
                text-anchor="middle"
                class="nano-chart-band-label"
              >
                {{ band.label }}
              </text>
            </g>
          </g>
        </g>

        <!-- 2. Horizontal Y-Axis Grid Lines & Labels -->
        <g class="nano-chart-grid-y">
          <g v-for="(g, idx) in yGridLines" :key="`ygrid-${idx}`">
            <line
              :x1="padLeft"
              :y1="g.y"
              :x2="width - padRight"
              :y2="g.y"
              class="nano-chart-grid-line"
              stroke-dasharray="4 4"
            />
            <text
              :x="padLeft - 10"
              :y="g.y + 4"
              text-anchor="end"
              class="nano-chart-axis-label"
            >
              {{ g.label }}
            </text>
          </g>
        </g>

        <!-- 3. Zero Baseline & Custom Reference Lines -->
        <line
          v-if="zeroBaselineY !== null"
          :x1="padLeft"
          :y1="zeroBaselineY"
          :x2="width - padRight"
          :y2="zeroBaselineY"
          class="nano-chart-zero-line"
          stroke-dasharray="3 3"
        />
        <g v-for="refLine in renderedReferenceLines" :key="refLine.key">
          <line
            :x1="padLeft"
            :y1="refLine.y"
            :x2="width - padRight"
            :y2="refLine.y"
            :stroke="refLine.color"
            :stroke-dasharray="refLine.dash"
            stroke-width="1.2"
          />
          <text
            v-if="refLine.label"
            :x="width - padRight - 4"
            :y="refLine.y - 4"
            text-anchor="end"
            class="nano-chart-ref-label"
            :fill="refLine.color"
          >
            {{ refLine.label }}
          </text>
        </g>

        <!-- 4. X-Axis Tick Labels -->
        <g class="nano-chart-grid-x">
          <text
            v-for="tick in xTickLabels"
            :key="`xtick-${tick.key}`"
            :x="tick.x"
            :y="height - 10"
            text-anchor="middle"
            class="nano-chart-axis-label"
          >
            {{ tick.label }}
          </text>
        </g>

        <!-- 5. Series Area Fills & Kinetic Spline / Linear Strokes -->
        <g v-for="s in renderedSeries" :key="`series-${s.id}`" class="nano-chart-series-layer">
          <path
            v-if="s.area && s.areaPath"
            :d="s.areaPath"
            :fill="`url(#${s.gradId})`"
            class="nano-chart-area-path"
          />
          <path
            v-if="s.linePath"
            :d="s.linePath"
            fill="none"
            :stroke="s.color"
            :stroke-width="s.strokeWidth"
            :stroke-dasharray="s.dash || undefined"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="nano-chart-line-path"
          />
        </g>

        <!-- 6. Kinetic Crosshair & Active Curve-Riding Hover Dots -->
        <g
          v-if="activeSpineEntry && animatedTooltipOpacity > 0.01"
          :style="{ opacity: animatedTooltipOpacity }"
          class="nano-chart-hover-layer"
        >
          <line
            :x1="animatedTooltipX"
            :y1="padTop"
            :x2="animatedTooltipX"
            :y2="height - padBottom"
            class="nano-chart-crosshair"
            stroke-dasharray="3 3"
          />
          <circle
            v-for="dot in activeHoverDots"
            :key="`dot-${dot.seriesId}`"
            :cx="dot.x"
            :cy="dot.y"
            r="5.5"
            :fill="dot.color"
            stroke="#ffffff"
            stroke-width="2.2"
            class="nano-chart-active-dot"
          />
        </g>
      </svg>

      <!-- 7. Floating Glassmorphic Kinetic Tooltip Bubble ("Chmurka") -->
      <div
        v-if="activeSpineEntry && activeHoverDots.length && animatedTooltipOpacity > 0.01"
        class="nano-chart-tooltip"
        :class="{ 'is-multi': activeHoverDots.length > 1 }"
        :style="tooltipStyle"
      >
        <slot
          name="tooltip"
          :index="activeSpineEntry.index"
          :key-name="activeSpineEntry.key"
          :label="activeSpineEntry.label"
          :badge="activeBadge"
          :items="activeHoverDots"
          :footer="resolvedTooltipFooter"
        >
          <div class="nano-tooltip-header">
            <span class="nano-tooltip-title">{{ activeSpineEntry.label }}</span>
            <span
              v-if="activeBadge && activeBadge.text"
              class="nano-tooltip-badge"
              :class="{ 'is-highlight': activeBadge.highlight }"
            >
              {{ activeBadge.text }}
            </span>
          </div>

          <!-- Single-series compact layout -->
          <template v-if="activeHoverDots.length === 1 && !renderedSeries[0]?. forceSeriesRow">
            <div class="nano-tooltip-single-val">
              <strong>{{ activeHoverDots[0].formattedValue }}</strong>
            </div>
            <div
              v-if="activeHoverDots[0].subtext || activeHoverDots[0].subValue"
              class="nano-tooltip-subtext"
            >
              {{ activeHoverDots[0].subtext || activeHoverDots[0].subValue }}
            </div>
          </template>

          <!-- Multi-series rows -->
          <template v-else>
            <div
              v-for="dot in activeHoverDots"
              :key="`trow-${dot.seriesId}`"
              class="nano-tooltip-row"
            >
              <span class="nano-tooltip-dot" :style="{ background: dot.color }"></span>
              <span class="nano-tooltip-series-name">{{ dot.label }}:</span>
              <strong class="nano-tooltip-series-val">{{ dot.formattedValue }}</strong>
              <span v-if="dot.subValue" class="nano-tooltip-series-sub">
                ({{ dot.subValue }})
              </span>
            </div>
          </template>

          <div v-if="resolvedTooltipFooter || $slots['tooltip-footer']" class="nano-tooltip-footer">
            <slot name="tooltip-footer" :items="activeHoverDots" :entry="activeSpineEntry">
              {{ resolvedTooltipFooter }}
            </slot>
          </div>
        </slot>
      </div>
    </div>

    <slot
      name="footer"
      :active-index="hoveredSpineIndex"
      :active-label="hoveredSpineIndex !== null && activeSpineEntry ? activeSpineEntry.label : null"
      :active-key="hoveredSpineIndex !== null && activeSpineEntry ? activeSpineEntry.key : null"
      :items="activeHoverDots"
    />
  </div>
</template>

<style scoped>
.nano-trend-chart {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.nano-trend-canvas-wrap {
  position: relative;
  width: 100%;
  user-select: none;
  -webkit-user-select: none;
  cursor: crosshair;
}

.nano-trend-svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
  stroke: none;
}

.nano-chart-grid-line {
  stroke: var(--nano-border-subtle, var(--border-subtle, rgba(148, 163, 184, 0.16)));
  stroke-width: 1;
}

.nano-chart-zero-line {
  stroke: var(--nano-text-muted, var(--text-muted, #64748b));
  stroke-width: 1.25;
  opacity: 0.65;
}

.nano-chart-axis-label {
  fill: var(--nano-text-muted, var(--text-muted, #64748b));
  stroke: none;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-variant-numeric: tabular-nums;
}

.nano-chart-ref-label {
  stroke: none;
  font-size: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 700;
}

/* Vertical Highlight Bands */
.nano-chart-band-rect {
  fill: rgba(245, 158, 11, 0.085);
  stroke: rgba(245, 158, 11, 0.24);
  stroke-width: 0.75;
  pointer-events: none;
}

[data-theme="light"] .nano-chart-band-rect {
  fill: rgba(217, 119, 6, 0.075);
  stroke: rgba(217, 119, 6, 0.22);
}

.nano-chart-band-divider {
  stroke: rgba(245, 158, 11, 0.26);
  stroke-width: 0.85;
  pointer-events: none;
}

.nano-chart-band-pill {
  fill: rgba(245, 158, 11, 0.16);
  stroke: rgba(245, 158, 11, 0.35);
  stroke-width: 0.75;
}

[data-theme="light"] .nano-chart-band-pill {
  fill: rgba(217, 119, 6, 0.13);
  stroke: rgba(217, 119, 6, 0.32);
}

.nano-chart-band-label {
  fill: #f59e0b;
  stroke: none;
  font-size: 8.5px;
  font-weight: 800;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  letter-spacing: 0.03em;
  pointer-events: none;
}

[data-theme="light"] .nano-chart-band-label {
  fill: #b45309;
  stroke: none;
}

.nano-chart-crosshair {
  stroke: var(--nano-text-muted, var(--text-muted, #94a3b8));
  stroke-width: 1.2;
}

.nano-chart-active-dot {
  filter: drop-shadow(0 0 6px rgba(99, 102, 241, 0.45));
  pointer-events: none;
}

/* Floating Glassmorphic Kinetic Tooltip Bubble ("Chmurka") */
.nano-chart-tooltip {
  position: absolute;
  background: var(--nano-bg-card-elevated, var(--bg-elevated, rgba(15, 23, 42, 0.94)));
  border: 1px solid var(--nano-border-card, var(--border-subtle, rgba(148, 163, 184, 0.24)));
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 12;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.nano-tooltip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 3px;
}

.nano-tooltip-title {
  font-size: 0.72rem;
  color: var(--nano-text-muted, var(--text-muted, #94a3b8));
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.nano-tooltip-badge {
  font-size: 0.65rem;
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(148, 163, 184, 0.14);
  color: var(--nano-text-muted, var(--text-muted, #94a3b8));
}

.nano-tooltip-badge.is-highlight {
  background: rgba(245, 158, 11, 0.18);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.35);
}

[data-theme="light"] .nano-tooltip-badge.is-highlight {
  background: rgba(217, 119, 6, 0.14);
  color: #b45309;
  border-color: rgba(217, 119, 6, 0.3);
}

.nano-tooltip-single-val {
  font-size: 0.92rem;
  color: var(--nano-text-main, var(--text-primary, #f8fafc));
}

.nano-tooltip-subtext {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--nano-state-active, #00f2fe);
  margin-top: 2px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.nano-tooltip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--nano-text-main, var(--text-primary, #f8fafc));
  line-height: 1.45;
}

.nano-tooltip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.nano-tooltip-series-name {
  font-weight: 700;
}

.nano-tooltip-series-val {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 600;
}

.nano-tooltip-series-sub {
  font-size: 0.74rem;
  color: var(--nano-text-muted, var(--text-muted, #94a3b8));
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.nano-tooltip-footer {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed var(--nano-border-subtle, var(--border-subtle, rgba(148, 163, 184, 0.22)));
  font-size: 0.74rem;
  color: var(--nano-text-muted, var(--text-muted, #94a3b8));
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
