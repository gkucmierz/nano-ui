<script setup>
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from 'vue';
import { tooltipDirective } from '../directives/tooltip.js';
import { useTheme } from '../composables/useTheme.js';
import { useCoupledSelection } from '../utils/coupledSelection.js';
import { clamp } from '../utils/math.js';
import {
  HEATMAP_SCALES,
  HEATMAP_PALETTES,
  isHeatmapZeroValue,
  computeHeatmapScale,
  resolveHeatmapCellColor,
  resolveHeatmapCellRgb,
  resolveHeatmapTextColor,
  buildHeatmapColorLut,
  computeGaussianDensityGrid,
  normalizeHeatmapMatrixData,
  formatHeatmapCompactValue,
} from '../utils/heatmapScale.js';

const vTooltip = tooltipDirective;

const toStringTag = (val) => Object.prototype.toString.call(val);
const isObject = (val) => val !== null && toStringTag(val) === '[object Object]';
const isString = (val) => toStringTag(val) === '[object String]';
const isFunction = (val) => toStringTag(val) === '[object Function]';

const props = defineProps({
  mode: {
    type: String,
    default: 'matrix',
    validator: (v) => v === 'matrix' || v === 'density',
  },
  rows: {
    type: Array,
    default: () => [],
  },
  cols: {
    type: Array,
    default: () => [],
  },
  data: {
    type: [Array, Object],
    default: () => [],
  },
  points: {
    type: Array,
    default: () => [],
  },
  densityCols: {
    type: Number,
    default: 56,
  },
  densityRows: {
    type: Number,
    default: 36,
  },
  densityRadius: {
    type: Number,
    default: 2.4,
  },
  densityHeight: {
    type: Number,
    default: 240,
  },
  scale: {
    type: String,
    default: 'log1p',
    validator: (v) => HEATMAP_SCALES.includes(v),
  },
  clampPercentile: {
    type: Number,
    default: 0.95,
  },
  buckets: {
    type: Number,
    default: 0,
  },
  palette: {
    type: String,
    default: 'cyan-ruby',
    validator: (v) => HEATMAP_PALETTES.includes(v),
  },
  isDark: {
    type: Boolean,
    default: undefined,
  },
  showValues: {
    type: Boolean,
    default: false,
  },
  showLegend: {
    type: Boolean,
    default: true,
  },
  allowScaleSwitch: {
    type: Boolean,
    default: false,
  },
  showTotals: {
    type: Boolean,
    default: false,
  },
  emptyLabel: {
    type: String,
    default: 'No recorded events yet',
  },
  selectedCell: {
    type: [String, Object],
    default: null,
  },
  formatValue: {
    type: Function,
    default: null,
  },
  formatTooltip: {
    type: Function,
    default: null,
  },
  cellMinSize: {
    type: Number,
    default: 28,
  },
  cellGap: {
    type: Number,
    default: 3,
  },
  ariaLabel: {
    type: String,
    default: 'Perceptual activity heatmap',
  },
});

const emit = defineEmits([
  'update:selectedCell',
  'update:scale',
  'select',
  'hover',
]);

const rootRef = ref(null);
const gridRef = ref(null);
const densityStageRef = ref(null);
const densityCanvasRef = ref(null);

const { resolvedTheme } = useTheme();
const domIsLight = ref(false);
const localScale = ref(HEATMAP_SCALES.includes(props.scale) ? props.scale : 'log1p');
const focusedCoords = ref({ r: 0, c: 0 });
const stageSize = ref({ width: 0, height: 0 });

let themeObserver = null;
let resizeObserver = null;
let rafDrawId = null;

watch(
  () => props.scale,
  (nextScale) => {
    if (HEATMAP_SCALES.includes(nextScale)) {
      localScale.value = nextScale;
    }
  }
);

function syncDomThemeState() {
  if (globalThis.document === undefined) return;
  const html = globalThis.document.documentElement;
  if (!html) return;
  const dataTheme = html.getAttribute('data-theme');
  const hasLightAttr = dataTheme === 'light';
  const hasLightClass =
    html.classList.contains('light') ||
    html.classList.contains('theme-light');
  const closestLight = Boolean(
    rootRef.value &&
    isFunction(rootRef.value.closest) &&
    rootRef.value.closest('[data-theme="light"], .theme-light, .light')
  );
  domIsLight.value = hasLightAttr || hasLightClass || closestLight;
}

const effectiveIsDark = computed(() => {
  if (props.isDark === true || props.isDark === false) {
    return props.isDark;
  }
  if (domIsLight.value) return false;
  if (resolvedTheme?.value === 'light') return false;
  return true;
});

const activePalette = computed(() =>
  HEATMAP_PALETTES.includes(props.palette) ? props.palette : 'cyan-ruby'
);

const activeBuckets = computed(() => {
  const b = Math.trunc(Number(props.buckets) || 0);
  return b >= 2 ? Math.min(b, 16) : 0;
});

function serializeCellKey(rowId, colId) {
  return `${String(rowId)}::${String(colId)}`;
}

function parseExternalSelectedKey(val) {
  if (!val) return null;
  if (isString(val)) return val;
  if (isObject(val)) {
    if (isString(val.key) && val.key) return val.key;
    if (val.rowId !== undefined && val.colId !== undefined) {
      return serializeCellKey(val.rowId, val.colId);
    }
  }
  return null;
}

const cshr = useCoupledSelection({
  initialSelectedId: parseExternalSelectedKey(props.selectedCell),
  keyboardNavigation: false,
});

watch(
  () => props.selectedCell,
  (nextVal) => {
    const key = parseExternalSelectedKey(nextVal);
    if (cshr.selectedId.value !== key) {
      cshr.selectedId.value = key;
      if (key !== null) {
        cshr.suppressedHoverId.value = null;
      }
    }
  }
);

const normalizedMatrix = computed(() =>
  normalizeHeatmapMatrixData(props.rows, props.cols, props.data)
);

const densityGrid = computed(() => {
  if (props.mode !== 'density') {
    return {
      cols: 1,
      rows: 1,
      radius: props.densityRadius,
      cells: new Float64Array(1),
      grid: [[0]],
      min: 0,
      max: 0,
      totalWeight: 0,
      pointCount: 0,
    };
  }
  return computeGaussianDensityGrid(props.points, {
    cols: props.densityCols,
    rows: props.densityRows,
    radius: props.densityRadius,
  });
});

const DENSITY_VISIBILITY_FLOOR_RATIO = 0.008;

const scaleStats = computed(() => {
  let sourceValues;
  if (props.mode === 'density') {
    const kde = densityGrid.value;
    const floor = kde.max * DENSITY_VISIBILITY_FLOOR_RATIO;
    const visible = [];
    if (kde.max > 0) {
      for (let i = 0; i < kde.cells.length; i++) {
        const v = kde.cells[i];
        if (v > floor) visible.push(v);
      }
    }
    sourceValues = visible;
  } else {
    sourceValues = normalizedMatrix.value.values2D;
  }
  return computeHeatmapScale(sourceValues, {
    scale: localScale.value,
    clampPercentile: props.clampPercentile,
    buckets: activeBuckets.value,
  });
});

function buildDefaultTooltip(cell) {
  const valStr = isFunction(props.formatValue)
    ? String(props.formatValue(cell.numericValue, cell))
    : Number.isInteger(cell.numericValue)
      ? cell.numericValue.toLocaleString('en-US')
      : cell.numericValue.toFixed(2);
  const shareText =
    normalizedMatrix.value.grandTotal > 0 && cell.numericValue > 0
      ? ` (${cell.sharePct.toFixed(1)}%)`
      : '';
  return `${cell.rowLabel} × ${cell.colLabel} · ${valStr}${shareText}`;
}

const renderedGrid = computed(() => {
  const { rows, cols, values2D, meta2D, grandTotal } = normalizedMatrix.value;
  const sc = scaleStats.value;
  const pal = activePalette.value;
  const dark = effectiveIsDark.value;

  return rows.map((row, rIdx) =>
    cols.map((col, cIdx) => {
      const rawVal = values2D[rIdx]?.[cIdx] ?? null;
      const isZero = isHeatmapZeroValue(rawVal);
      const numericValue = isZero ? 0 : Number(rawVal);
      const normalized = isZero ? 0 : sc.normalize(numericValue);
      const bgColor = resolveHeatmapCellColor(normalized, {
        palette: pal,
        isDark: dark,
        isZero,
      });
      const textColor = resolveHeatmapTextColor(normalized, {
        palette: pal,
        isDark: dark,
        isZero,
      });
      const sharePct = grandTotal > 0 && numericValue > 0 ? (numericValue / grandTotal) * 100 : 0;
      const key = serializeCellKey(row.id, col.id);

      const cellBase = {
        key,
        rowId: row.rawId,
        colId: col.rawId,
        rowLabel: row.label,
        colLabel: col.label,
        rowIndex: rIdx,
        colIndex: cIdx,
        value: rawVal,
        numericValue,
        isZero,
        normalized,
        sharePct,
        bgColor,
        textColor,
        meta: meta2D[rIdx]?.[cIdx] ?? null,
      };

      const displayValue = formatHeatmapCompactValue(numericValue, props.formatValue, cellBase);
      const tooltipText = isFunction(props.formatTooltip)
        ? String(props.formatTooltip(cellBase) ?? '')
        : buildDefaultTooltip(cellBase);

      return {
        ...cellBase,
        displayValue,
        tooltipText,
      };
    })
  );
});

const cellByKeyMap = computed(() => {
  const map = new Map();
  const rows = renderedGrid.value;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      map.set(row[c].key, row[c]);
    }
  }
  return map;
});

function toPublicPayload(cell) {
  if (!cell) return null;
  return {
    key: cell.key,
    rowId: cell.rowId,
    colId: cell.colId,
    rowLabel: cell.rowLabel,
    colLabel: cell.colLabel,
    rowIndex: cell.rowIndex,
    colIndex: cell.colIndex,
    value: cell.numericValue,
    isZero: cell.isZero,
    normalized: cell.normalized,
    sharePct: Number(cell.sharePct.toFixed(2)),
    meta: cell.meta,
  };
}

const activeCrosshairCell = computed(() => {
  const activeKey = cshr.effectiveActiveId.value;
  if (!activeKey) return null;
  return cellByKeyMap.value.get(activeKey) || null;
});

const activeCrosshairRow = computed(() =>
  activeCrosshairCell.value ? activeCrosshairCell.value.rowIndex : -1
);

const activeCrosshairCol = computed(() =>
  activeCrosshairCell.value ? activeCrosshairCell.value.colIndex : -1
);

const zeroSwatchStyle = computed(() => ({
  backgroundColor: resolveHeatmapCellColor(0, {
    palette: activePalette.value,
    isDark: effectiveIsDark.value,
    isZero: true,
  }),
}));

const legendSwatches = computed(() => {
  const b = activeBuckets.value;
  const count = b >= 2 ? b : 9;
  const list = [];
  for (let i = 0; i < count; i++) {
    const t = b >= 2 ? (i + 1) / count : count === 1 ? 1 : i / (count - 1);
    list.push({
      id: i,
      t,
      color: resolveHeatmapCellColor(t, {
        palette: activePalette.value,
        isDark: effectiveIsDark.value,
        isZero: false,
      }),
    });
  }
  return list;
});

const legendMinText = computed(() => {
  const st = scaleStats.value;
  if (st.positiveCount === 0) return '0';
  return formatHeatmapCompactValue(st.min, props.formatValue);
});

const legendMaxText = computed(() => {
  const st = scaleStats.value;
  if (st.positiveCount === 0) return '0';
  const base = formatHeatmapCompactValue(st.effectiveMax, props.formatValue);
  return localScale.value === 'p95' && st.max > st.effectiveMax ? `${base}+` : base;
});

const gridTemplateStyle = computed(() => {
  const cCount = Math.max(1, normalizedMatrix.value.cols.length);
  const minPx = Math.max(24, Math.trunc(Number(props.cellMinSize) || 28));
  const gapPx = Math.max(1, Math.min(12, Math.trunc(Number(props.cellGap) || 3)));
  const totalTrack = props.showTotals ? ' minmax(44px, auto)' : '';
  return {
    '--nano-heatmap-cell-min': `${minPx}px`,
    '--nano-heatmap-gap': `${gapPx}px`,
    gridTemplateColumns: `minmax(54px, max-content) repeat(${cCount}, minmax(${minPx}px, 1fr))${totalTrack}`,
  };
});

const resolvedDensityHeight = computed(() =>
  Math.max(120, Math.trunc(Number(props.densityHeight) || 240))
);

const resolvedDensityAriaLabel = computed(() => {
  const pts = densityGrid.value.pointCount;
  if (pts === 0) return `${props.ariaLabel} (${props.emptyLabel})`;
  return `${props.ariaLabel} (${pts} recorded events)`;
});

function setScaleMode(nextScale) {
  if (!HEATMAP_SCALES.includes(nextScale)) return;
  localScale.value = nextScale;
  emit('update:scale', nextScale);
}

function emitHoverState() {
  const hovKey =
    cshr.hoveredId.value !== null && cshr.hoveredId.value !== cshr.suppressedHoverId.value
      ? cshr.hoveredId.value
      : null;
  const cell = hovKey ? cellByKeyMap.value.get(hovKey) || null : null;
  emit('hover', toPublicPayload(cell));
}

function onCellPointerEnter(cell) {
  const prev = cshr.effectiveActiveId.value;
  cshr.onPointerEnter(cell.key);
  if (cshr.effectiveActiveId.value !== prev) {
    emitHoverState();
  }
}

function onCellPointerMove(cell, event) {
  const prev = cshr.effectiveActiveId.value;
  cshr.onPointerMove(cell.key, event);
  if (cshr.effectiveActiveId.value !== prev) {
    emitHoverState();
  }
}

function onCellPointerLeave(cell) {
  const prev = cshr.effectiveActiveId.value;
  cshr.onPointerLeave(cell.key);
  if (cshr.effectiveActiveId.value !== prev) {
    emitHoverState();
  }
}

function applyToggleCell(cell, event = null) {
  if (!cell) return;
  focusedCoords.value = { r: cell.rowIndex, c: cell.colIndex };
  cshr.toggleSelect(cell.key, event);
  const selKey = cshr.selectedId.value;
  const selCell = selKey ? cellByKeyMap.value.get(selKey) || null : null;
  const payload = toPublicPayload(selCell);
  emit('update:selectedCell', payload);
  emit('select', payload);
  emitHoverState();
}

function clearSelection() {
  if (cshr.selectedId.value === null && cshr.hoveredId.value === null) return;
  cshr.selectedId.value = null;
  cshr.hoveredId.value = null;
  cshr.suppressedHoverId.value = null;
  emit('update:selectedCell', null);
  emit('select', null);
  emit('hover', null);
}

function selectCellByKey(key) {
  if (!key) {
    clearSelection();
    return;
  }
  const resolvedKey = parseExternalSelectedKey(key);
  const cell = resolvedKey ? cellByKeyMap.value.get(resolvedKey) : null;
  if (!cell) return;
  cshr.suppressedHoverId.value = null;
  cshr.selectedId.value = cell.key;
  focusedCoords.value = { r: cell.rowIndex, c: cell.colIndex };
  const payload = toPublicPayload(cell);
  emit('update:selectedCell', payload);
  emit('select', payload);
}

function focusGridCellElement(rIdx, cIdx) {
  focusedCoords.value = { r: rIdx, c: cIdx };
  nextTick(() => {
    const root = gridRef.value;
    if (!root || !isFunction(root.querySelector)) return;
    const target = root.querySelector(`[data-r="${rIdx}"][data-c="${cIdx}"]`);
    if (target && isFunction(target.focus)) {
      target.focus();
      if (isFunction(target.scrollIntoView)) {
        target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
  });
}

function onCellKeydown(cell, event) {
  if (!event) return;
  if (event.altKey || event.ctrlKey || event.metaKey) return;

  const rCount = normalizedMatrix.value.rows.length;
  const cCount = normalizedMatrix.value.cols.length;
  if (rCount === 0 || cCount === 0) return;

  const { rowIndex: r, colIndex: c } = cell;

  if (event.key === 'ArrowRight') {
    event.stopPropagation();
    if (c + 1 < cCount) {
      event.preventDefault();
      focusGridCellElement(r, c + 1);
    }
    return;
  }
  if (event.key === 'ArrowLeft') {
    event.stopPropagation();
    if (c - 1 >= 0) {
      event.preventDefault();
      focusGridCellElement(r, c - 1);
    }
    return;
  }
  if (event.key === 'ArrowDown') {
    event.stopPropagation();
    if (r + 1 < rCount) {
      event.preventDefault();
      focusGridCellElement(r + 1, c);
    }
    return;
  }
  if (event.key === 'ArrowUp') {
    event.stopPropagation();
    if (r - 1 >= 0) {
      event.preventDefault();
      focusGridCellElement(r - 1, c);
    }
    return;
  }
  if (event.key === 'Home') {
    event.preventDefault();
    event.stopPropagation();
    focusGridCellElement(r, 0);
    return;
  }
  if (event.key === 'End') {
    event.preventDefault();
    event.stopPropagation();
    focusGridCellElement(r, cCount - 1);
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    event.stopPropagation();
    applyToggleCell(cell, null);
    return;
  }
  if (event.key === ' ') {
    // Prevent page scroll on keydown; activation fires on keyup per WAI-ARIA button/cell ergonomics
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  if (event.key === 'Escape') {
    if (cshr.selectedId.value !== null) {
      event.preventDefault();
      event.stopPropagation();
      clearSelection();
    }
  }
}

function onCellKeyup(cell, event) {
  if (!event) return;
  if (event.key === ' ') {
    event.preventDefault();
    event.stopPropagation();
    applyToggleCell(cell, null);
  }
}

function redrawDensityCanvas() {
  if (props.mode !== 'density') return;
  const canvas = densityCanvasRef.value;
  const stage = densityStageRef.value;
  if (!canvas || !stage || !isFunction(canvas.getContext)) return;

  const cssWidth = Math.max(1, Math.round(stageSize.value.width || stage.clientWidth || 320));
  const cssHeight = Math.max(1, Math.round(stageSize.value.height || stage.clientHeight || resolvedDensityHeight.value));
  const dpr = clamp(Number(globalThis.devicePixelRatio) || 1, 1, 2);
  const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
  const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));

  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

  let ctx = null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    ctx = null;
  }
  if (!ctx || !isFunction(ctx.createImageData)) return;

  const dark = effectiveIsDark.value;
  const pal = activePalette.value;
  const zeroRgb = resolveHeatmapCellRgb(0, {
    palette: pal,
    isDark: dark,
    isZero: true,
  });

  const kde = densityGrid.value;
  const sc = scaleStats.value;
  const imgData = ctx.createImageData(pixelWidth, pixelHeight);
  const buf = imgData.data;

  if (kde.pointCount === 0 || kde.max <= 0) {
    for (let i = 0; i < buf.length; i += 4) {
      buf[i] = zeroRgb.r;
      buf[i + 1] = zeroRgb.g;
      buf[i + 2] = zeroRgb.b;
      buf[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    return;
  }

  const lut = buildHeatmapColorLut({ palette: pal, isDark: dark });
  const { cols, rows, cells } = kde;
  const zeroCutoff = kde.max * DENSITY_VISIBILITY_FLOOR_RATIO;

  for (let py = 0; py < pixelHeight; py++) {
    const gy = rows <= 1 ? 0 : (py / Math.max(1, pixelHeight - 1)) * (rows - 1);
    const r0 = Math.floor(gy);
    const r1 = Math.min(rows - 1, r0 + 1);
    const fy = gy - r0;
    const rowOff0 = r0 * cols;
    const rowOff1 = r1 * cols;

    for (let px = 0; px < pixelWidth; px++) {
      const gx = cols <= 1 ? 0 : (px / Math.max(1, pixelWidth - 1)) * (cols - 1);
      const c0 = Math.floor(gx);
      const c1 = Math.min(cols - 1, c0 + 1);
      const fx = gx - c0;

      const v00 = cells[rowOff0 + c0];
      const v10 = cells[rowOff0 + c1];
      const v01 = cells[rowOff1 + c0];
      const v11 = cells[rowOff1 + c1];

      const top = v00 + (v10 - v00) * fx;
      const bottom = v01 + (v11 - v01) * fx;
      const val = top + (bottom - top) * fy;

      const outIdx = (py * pixelWidth + px) * 4;
      if (val <= zeroCutoff) {
        buf[outIdx] = zeroRgb.r;
        buf[outIdx + 1] = zeroRgb.g;
        buf[outIdx + 2] = zeroRgb.b;
        buf[outIdx + 3] = 255;
      } else {
        const normT = sc.normalize(val);
        const lutIdx = clamp(Math.round(normT * 255), 0, 255) * 3;
        // Smoothstep feathering across the outer halo edge into the structural zero surface
        const rawEdge = val < zeroCutoff * 4 ? (val - zeroCutoff) / (zeroCutoff * 3) : 1;
        const edgeBlend = rawEdge * rawEdge * (3 - 2 * rawEdge);
        buf[outIdx] = Math.round(zeroRgb.r + (lut[lutIdx] - zeroRgb.r) * edgeBlend);
        buf[outIdx + 1] = Math.round(zeroRgb.g + (lut[lutIdx + 1] - zeroRgb.g) * edgeBlend);
        buf[outIdx + 2] = Math.round(zeroRgb.b + (lut[lutIdx + 2] - zeroRgb.b) * edgeBlend);
        buf[outIdx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

function scheduleDensityRedraw() {
  if (props.mode !== 'density') return;
  if (globalThis.requestAnimationFrame === undefined) {
    redrawDensityCanvas();
    return;
  }
  if (rafDrawId !== null) {
    globalThis.cancelAnimationFrame(rafDrawId);
  }
  rafDrawId = globalThis.requestAnimationFrame(() => {
    rafDrawId = null;
    redrawDensityCanvas();
  });
}

function bindDensityResizeObserver() {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (props.mode !== 'density' || !densityStageRef.value) return;
  if (globalThis.ResizeObserver !== undefined) {
    resizeObserver = new globalThis.ResizeObserver((entries) => {
      const entry = entries && entries[0];
      if (!entry) return;
      const w = entry.contentRect?.width ?? densityStageRef.value?.clientWidth ?? 0;
      const h = entry.contentRect?.height ?? densityStageRef.value?.clientHeight ?? 0;
      stageSize.value = { width: w, height: h };
      scheduleDensityRedraw();
    });
    resizeObserver.observe(densityStageRef.value);
  }
}

watch(
  [
    () => props.mode,
    () => props.points,
    () => props.densityCols,
    () => props.densityRows,
    () => props.densityRadius,
    () => props.densityHeight,
    localScale,
    activePalette,
    activeBuckets,
    effectiveIsDark,
  ],
  () => {
    if (props.mode === 'density') {
      nextTick(() => {
        bindDensityResizeObserver();
        scheduleDensityRedraw();
      });
    }
  }
);

onMounted(() => {
  syncDomThemeState();
  if (globalThis.MutationObserver !== undefined && globalThis.document?.documentElement) {
    themeObserver = new globalThis.MutationObserver(() => {
      syncDomThemeState();
    });
    themeObserver.observe(globalThis.document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });
  }
  if (props.mode === 'density') {
    bindDensityResizeObserver();
    scheduleDensityRedraw();
  }
});

onBeforeUnmount(() => {
  if (themeObserver) {
    themeObserver.disconnect();
    themeObserver = null;
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (rafDrawId !== null && globalThis.cancelAnimationFrame !== undefined) {
    globalThis.cancelAnimationFrame(rafDrawId);
    rafDrawId = null;
  }
});

defineExpose({
  clearSelection,
  selectCellByKey,
  redrawDensityCanvas,
  scaleStats,
});
</script>

<template>
  <div
    ref="rootRef"
    class="nano-heatmap"
    :class="{
      'is-light': !effectiveIsDark,
      'is-dark': effectiveIsDark,
      'is-density-mode': mode === 'density',
    }"
  >
    <!-- MATRIX MODE -->
    <template v-if="mode === 'matrix'">
      <div
        v-if="normalizedMatrix.rows.length === 0 || normalizedMatrix.cols.length === 0"
        class="nano-heatmap-empty-card"
        role="status"
      >
        <span class="nano-heatmap-empty-dot" aria-hidden="true" />
        <span>{{ emptyLabel }}</span>
      </div>

      <div v-else class="nano-heatmap-scroll">
        <div
          ref="gridRef"
          class="nano-heatmap-grid"
          role="grid"
          :aria-label="ariaLabel"
          :style="gridTemplateStyle"
        >
          <!-- Column Header Row -->
          <div class="nano-heatmap-row is-header-row" role="row">
            <div class="nano-heatmap-corner" role="presentation" />
            <div
              v-for="(col, cIdx) in normalizedMatrix.cols"
              :key="`col-${col.id}`"
              role="columnheader"
              class="nano-heatmap-col-header"
              :class="{ 'is-crosshair-axis': activeCrosshairCol === cIdx }"
            >
              <span class="nano-heatmap-axis-label">{{ col.label }}</span>
              <span v-if="col.sublabel" class="nano-heatmap-axis-sublabel">{{ col.sublabel }}</span>
            </div>
            <div
              v-if="showTotals"
              role="columnheader"
              class="nano-heatmap-col-header is-total-axis"
            >
              Σ
            </div>
          </div>

          <!-- Matrix Data Rows -->
          <div
            v-for="(row, rIdx) in normalizedMatrix.rows"
            :key="`row-${row.id}`"
            class="nano-heatmap-row"
            role="row"
          >
            <div
              role="rowheader"
              class="nano-heatmap-row-header"
              :class="{ 'is-crosshair-axis': activeCrosshairRow === rIdx }"
            >
              <span class="nano-heatmap-axis-label">{{ row.label }}</span>
              <span v-if="row.sublabel" class="nano-heatmap-axis-sublabel">{{ row.sublabel }}</span>
            </div>

            <div
              v-for="(cell, cIdx) in renderedGrid[rIdx]"
              :key="cell.key"
              v-tooltip="cell.tooltipText"
              role="gridcell"
              class="nano-heatmap-cell"
              :class="{
                'is-zero': cell.isZero,
                'is-hovered': cshr.isHovered(cell.key) && !cshr.isSelected(cell.key),
                'is-selected': cshr.isSelected(cell.key),
                'is-hover-active': cshr.isSelected(cell.key) && cshr.isHovered(cell.key),
                'is-dimmed': cshr.selectedId.value !== null && !cshr.isSelected(cell.key) && !cshr.isHovered(cell.key),
              }"
              :data-r="rIdx"
              :data-c="cIdx"
              :tabindex="focusedCoords.r === rIdx && focusedCoords.c === cIdx ? 0 : -1"
              :aria-selected="cshr.isSelected(cell.key) ? 'true' : 'false'"
              :aria-label="cell.tooltipText"
              :style="{
                backgroundColor: cell.bgColor,
                color: cell.textColor,
              }"
              @mouseenter="onCellPointerEnter(cell)"
              @mousemove="onCellPointerMove(cell, $event)"
              @mouseleave="onCellPointerLeave(cell)"
              @click="applyToggleCell(cell, $event)"
              @focus="focusedCoords = { r: rIdx, c: cIdx }"
              @keydown="onCellKeydown(cell, $event)"
              @keyup="onCellKeyup(cell, $event)"
            >
              <span v-if="showValues" class="nano-heatmap-cell-value">
                {{ cell.displayValue }}
              </span>
            </div>

            <div
              v-if="showTotals"
              role="gridcell"
              class="nano-heatmap-total-cell"
              :class="{ 'is-crosshair-axis': activeCrosshairRow === rIdx }"
            >
              {{ formatHeatmapCompactValue(normalizedMatrix.rowTotals[rIdx], formatValue) }}
            </div>
          </div>

          <!-- Optional Column Totals Footer -->
          <div
            v-if="showTotals"
            class="nano-heatmap-row is-totals-row"
            role="row"
          >
            <div role="rowheader" class="nano-heatmap-row-header is-total-axis">
              Σ
            </div>
            <div
              v-for="(colTotal, cIdx) in normalizedMatrix.colTotals"
              :key="`col-sum-${cIdx}`"
              role="gridcell"
              class="nano-heatmap-total-cell is-col-sum"
              :class="{ 'is-crosshair-axis': activeCrosshairCol === cIdx }"
            >
              {{ formatHeatmapCompactValue(colTotal, formatValue) }}
            </div>
            <div role="gridcell" class="nano-heatmap-total-cell is-grand-total">
              {{ formatHeatmapCompactValue(normalizedMatrix.grandTotal, formatValue) }}
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- DENSITY 2D KDE CANVAS MODE -->
    <template v-else>
      <div
        ref="densityStageRef"
        class="nano-heatmap-density-stage"
        :style="{ height: `${resolvedDensityHeight}px` }"
      >
        <canvas
          ref="densityCanvasRef"
          class="nano-heatmap-density-canvas"
          role="img"
          :aria-label="resolvedDensityAriaLabel"
        />
        <div class="nano-heatmap-density-slot">
          <slot />
        </div>
        <div
          v-if="densityGrid.pointCount === 0"
          class="nano-heatmap-empty-overlay"
          role="status"
        >
          <span class="nano-heatmap-empty-dot" aria-hidden="true" />
          <span>{{ emptyLabel }}</span>
        </div>
      </div>
    </template>

    <!-- PERCEPTUAL LEGEND & OPTIONAL SCALE SWITCHER -->
    <div v-if="showLegend" class="nano-heatmap-legend">
      <div class="nano-heatmap-legend-ramp">
        <div class="nano-heatmap-zero-group">
          <span
            class="nano-heatmap-swatch is-zero-swatch"
            :style="zeroSwatchStyle"
            aria-hidden="true"
          />
          <span class="nano-heatmap-legend-num">0</span>
        </div>

        <span class="nano-heatmap-legend-sep" aria-hidden="true">·</span>

        <span class="nano-heatmap-legend-num">{{ legendMinText }}</span>
        <div class="nano-heatmap-swatches" aria-hidden="true">
          <span
            v-for="sw in legendSwatches"
            :key="sw.id"
            class="nano-heatmap-swatch"
            :style="{ backgroundColor: sw.color }"
          />
        </div>
        <span class="nano-heatmap-legend-num">{{ legendMaxText }}</span>

        <span
          v-if="mode === 'matrix' && normalizedMatrix.positiveCount === 0"
          class="nano-heatmap-legend-empty-pill"
        >
          {{ emptyLabel }}
        </span>
      </div>

      <div
        v-if="allowScaleSwitch"
        class="nano-heatmap-scale-switch"
        role="group"
        aria-label="Perceptual normalization scale"
      >
        <button
          v-for="scName in HEATMAP_SCALES"
          :key="scName"
          type="button"
          class="nano-heatmap-scale-btn"
          :class="{ 'is-active': localScale === scName }"
          :aria-pressed="localScale === scName ? 'true' : 'false'"
          @click="setScaleMode(scName)"
        >
          {{ scName }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nano-heatmap {
  --nano-heatmap-text: #e2e8f0;
  --nano-heatmap-muted: #94a3b8;
  --nano-heatmap-axis-active-bg: rgba(56, 189, 248, 0.14);
  --nano-heatmap-axis-active-fg: #38bdf8;
  --nano-heatmap-hover-ring: #38bdf8;
  --nano-heatmap-select-ring: #fbbf24;
  --nano-heatmap-cell-border: rgba(148, 163, 184, 0.12);
  --nano-heatmap-surface: rgba(15, 23, 42, 0.45);
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
  color: var(--nano-heatmap-text);
  font-family: var(--nano-font-sans, system-ui, -apple-system, sans-serif);
}

.nano-heatmap.is-light {
  --nano-heatmap-text: #0f172a;
  --nano-heatmap-muted: #475569;
  --nano-heatmap-axis-active-bg: rgba(2, 132, 199, 0.13);
  --nano-heatmap-axis-active-fg: #0369a1;
  --nano-heatmap-hover-ring: #0284c7;
  --nano-heatmap-select-ring: #d97706;
  --nano-heatmap-cell-border: rgba(15, 23, 42, 0.13);
  --nano-heatmap-surface: #f1f5f9;
}

.nano-heatmap-scroll {
  width: 100%;
  overflow-x: auto;
  box-sizing: border-box;
}

.nano-heatmap-grid {
  display: grid;
  gap: var(--nano-heatmap-gap, 3px);
  align-items: stretch;
  min-width: max-content;
  user-select: none;
}

.nano-heatmap-row {
  display: contents;
}

.nano-heatmap-corner {
  min-height: 22px;
}

.nano-heatmap-col-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  min-height: 24px;
  padding: 2px 3px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.15;
  color: var(--nano-heatmap-muted);
  font-variant-numeric: tabular-nums;
  box-sizing: border-box;
  transition: background-color 140ms ease, color 140ms ease;
}

.nano-heatmap-row-header {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-end;
  padding: 2px 8px 2px 4px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.15;
  color: var(--nano-heatmap-muted);
  white-space: nowrap;
  box-sizing: border-box;
  transition: background-color 140ms ease, color 140ms ease;
}

.nano-heatmap-axis-label {
  display: block;
}

.nano-heatmap-axis-sublabel {
  display: block;
  font-size: 9.5px;
  font-weight: 500;
  opacity: 0.72;
}

.nano-heatmap-col-header.is-crosshair-axis,
.nano-heatmap-row-header.is-crosshair-axis,
.nano-heatmap-total-cell.is-crosshair-axis {
  background-color: var(--nano-heatmap-axis-active-bg);
  color: var(--nano-heatmap-axis-active-fg);
}

/* Stationary Hit-Box Cell (CSS-HOVER-01 & CLS = 0: strictly zero transform on :hover / :active) */
.nano-heatmap-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: var(--nano-heatmap-cell-min, 28px);
  min-height: var(--nano-heatmap-cell-min, 28px);
  border-radius: 5px;
  box-sizing: border-box;
  cursor: pointer;
  outline: none;
  box-shadow: inset 0 0 0 1px var(--nano-heatmap-cell-border);
  transition: box-shadow 120ms ease, opacity 140ms ease;
}

.nano-heatmap-cell.is-dimmed {
  opacity: 0.62;
}

.nano-heatmap-cell.is-hovered {
  box-shadow: inset 0 0 0 1.5px var(--nano-heatmap-hover-ring);
}

.nano-heatmap-cell.is-selected {
  box-shadow:
    inset 0 0 0 2px var(--nano-heatmap-select-ring),
    0 0 0 1px rgba(251, 191, 36, 0.25);
}

.nano-heatmap-cell.is-hover-active {
  box-shadow:
    inset 0 0 0 2px var(--nano-heatmap-select-ring),
    inset 0 0 0 3.5px var(--nano-heatmap-hover-ring);
}

.nano-heatmap-cell:focus-visible {
  box-shadow:
    inset 0 0 0 2px var(--nano-heatmap-hover-ring),
    0 0 0 2px rgba(56, 189, 248, 0.35);
}

.nano-heatmap-cell-value {
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

.nano-heatmap-total-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--nano-heatmap-cell-min, 28px);
  padding: 2px 6px;
  border-radius: 5px;
  background: var(--nano-heatmap-surface);
  color: var(--nano-heatmap-muted);
  font-size: 10.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  box-sizing: border-box;
}

.nano-heatmap-total-cell.is-grand-total,
.is-total-axis {
  font-weight: 700;
  color: var(--nano-heatmap-text);
}

/* Density 2D Canvas Stage */
.nano-heatmap-density-stage {
  position: relative;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-sizing: border-box;
  box-shadow: inset 0 0 0 1px var(--nano-heatmap-cell-border);
}

.nano-heatmap-density-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.nano-heatmap-density-slot {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.nano-heatmap-empty-overlay,
.nano-heatmap-empty-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--nano-heatmap-muted);
}

.nano-heatmap-empty-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.nano-heatmap-empty-card {
  min-height: 96px;
  padding: 16px;
  border-radius: 8px;
  background: var(--nano-heatmap-surface);
  box-shadow: inset 0 0 0 1px var(--nano-heatmap-cell-border);
}

.nano-heatmap-empty-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--nano-heatmap-muted);
  opacity: 0.65;
}

/* Legend & Scale Switcher */
.nano-heatmap-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 11px;
  color: var(--nano-heatmap-muted);
  font-variant-numeric: tabular-nums;
}

.nano-heatmap-legend-ramp {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.nano-heatmap-zero-group {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.nano-heatmap-legend-sep {
  opacity: 0.5;
}

.nano-heatmap-swatches {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.nano-heatmap-swatch {
  width: 13px;
  height: 13px;
  border-radius: 3px;
  box-shadow: inset 0 0 0 1px var(--nano-heatmap-cell-border);
  box-sizing: border-box;
}

.nano-heatmap-legend-num {
  font-weight: 600;
  line-height: 1;
}

.nano-heatmap-legend-empty-pill {
  margin-left: 6px;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--nano-heatmap-surface);
  font-size: 10.5px;
}

.nano-heatmap-scale-switch {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 6px;
  background: var(--nano-heatmap-surface);
  box-shadow: inset 0 0 0 1px var(--nano-heatmap-cell-border);
}

.nano-heatmap-scale-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  padding: 0 8px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--nano-heatmap-muted);
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1;
  box-sizing: border-box;
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}

.nano-heatmap-scale-btn:hover {
  color: var(--nano-heatmap-text);
  background: rgba(148, 163, 184, 0.14);
}

.nano-heatmap-scale-btn.is-active {
  background: var(--nano-heatmap-axis-active-bg);
  color: var(--nano-heatmap-axis-active-fg);
}

@media (forced-colors: active) {
  .nano-heatmap-cell.is-hovered,
  .nano-heatmap-cell:focus-visible {
    outline: 2px solid Highlight;
    outline-offset: -2px;
  }

  .nano-heatmap-cell.is-selected,
  .nano-heatmap-cell.is-hover-active,
  .nano-heatmap-scale-btn.is-active {
    outline: 2px solid SelectedItem;
    outline-offset: -2px;
  }
}
</style>
