<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { tooltipDirective as vTooltip } from '../directives/tooltip.js';
import { getScopedStorageController, normalizeStorageMode } from '../utils/storage-controller.js';
import {
  resolveCollapsibleConfig,
  evaluateSplitterSnapCollapse,
  computeVirtualCollapsedPaneStyles,
  resolveSplitterHitboxSizePx,
  computeSplitterProximityField,
} from '../utils/splitterCollapse.js';

const nanoStorage = getScopedStorageController('nano-ui');

const props = defineProps({
  /**
   * Size of the first pane (ratio 0..1, percent 0..100, or pixels depending on `unit`)
   */
  modelValue: {
    type: Number,
    default: undefined,
  },
  /**
   * Default/initial size of the first pane (also restored on double-click)
   */
  defaultSize: {
    type: Number,
    default: undefined,
  },
  /**
   * Measurement unit for modelValue / defaultSize / min / max:
   * 'ratio' (0..1) | 'percent' (0..100) | 'px'
   */
  unit: {
    type: String,
    default: 'ratio',
  },
  /**
   * Split orientation:
   * 'horizontal' (left / right panes, col-resize) | 'vertical' (top / bottom panes, row-resize)
   */
  orientation: {
    type: String,
    default: 'horizontal',
  },
  /**
   * Minimum size of the first pane (in `unit`)
   */
  min: {
    type: Number,
    default: undefined,
  },
  /**
   * Maximum size of the first pane (in `unit`)
   */
  max: {
    type: Number,
    default: undefined,
  },
  /**
   * Minimum space (in px) always reserved for the second pane
   */
  minSecondPx: {
    type: Number,
    default: 160,
  },
  /**
   * Visual gap (in px) between first and second pane where the splitter sits
   */
  gap: {
    type: Number,
    default: 12,
  },
  /**
   * Show the edge triangle lock/unlock toggle tab
   */
  lockable: {
    type: Boolean,
    default: true,
  },
  /**
   * Whether the splitter is currently locked (v-model:locked)
   */
  locked: {
    type: Boolean,
    default: undefined,
  },
  /**
   * Enable magnetic snap-to-collapse when dragging into the edge snap zone:
   * `false` | `true` | `'both'` | `'first'` | `'second'`
   */
  collapsible: {
    type: [Boolean, String],
    default: false,
  },
  /**
   * Currently collapsed pane (`null` | `'first'` | `'second'`, supports `v-model:collapsedPane`)
   */
  collapsedPane: {
    type: String,
    default: undefined,
  },
  /**
   * Virtual size (in px) of a collapsed pane:
   * - `height` when `orientation === 'vertical'`
   * - `width` when `orientation === 'horizontal'`
   */
  collapsedSize: {
    type: Number,
    default: 38,
  },
  /**
   * Edge snap zone distance (in px) added to `collapsedSize` (`collapsedSize + collapseThreshold` from container edge)
   */
  collapseThreshold: {
    type: Number,
    default: 24,
  },
  /**
   * Label displayed on the virtual collapsed strip when the first pane is collapsed
   */
  firstTitle: {
    type: String,
    default: 'Panel 1',
  },
  /**
   * Optional badge displayed on the virtual collapsed strip for the first pane
   */
  firstBadge: {
    type: [String, Number],
    default: '',
  },
  /**
   * Label displayed on the virtual collapsed strip when the second pane is collapsed
   */
  secondTitle: {
    type: String,
    default: 'Panel 2',
  },
  /**
   * Optional badge displayed on the virtual collapsed strip for the second pane
   */
  secondBadge: {
    type: [String, Number],
    default: '',
  },
  /**
   * Tooltip text when unlocked (hovering lock toggle)
   */
  lockTooltip: {
    type: String,
    default: 'Lock splitter',
  },
  /**
   * Tooltip text when locked (hovering lock toggle)
   */
  unlockTooltip: {
    type: String,
    default: 'Unlock splitter',
  },
  /**
   * Show subtle 3-dot grip pill in the center of the splitter line
   */
  showGrip: {
    type: Boolean,
    default: true,
  },
  /**
   * Minimum ergonomic capture band thickness in px (±minHitboxPx/2 around the splitter axis)
   */
  minHitboxPx: {
    type: Number,
    default: 28,
  },
  /**
   * 1D Voronoi proximity halo radius in px for pre-highlighting the splitter as the pointer approaches
   */
  proximityRadiusPx: {
    type: Number,
    default: 36,
  },
  /**
   * Reset to defaultSize on double-click
   */
  resetOnDblClick: {
    type: Boolean,
    default: true,
  },
  /**
   * Optional storage key suffix to persist split size & lock state (e.g. 'ide_sidebar' -> 'DA_NU_ide_sidebar')
   */
  storageKey: {
    type: String,
    default: '',
  },
  /**
   * Storage persistence mode: 'ls' (localStorage), 'ss' (sessionStorage), or 'none' (false)
   */
  storage: {
    type: [String, Boolean],
    default: 'ls',
  },
  /**
   * Optional host app prefix override (e.g. 'dashboard-app' -> 'DA')
   */
  appPrefix: {
    type: String,
    default: '',
  },
});

const emit = defineEmits([
  'update:modelValue',
  'update:locked',
  'update:collapsedPane',
  'collapseChange',
  'change',
  'dragStart',
  'dragEnd',
  'reset',
]);

const containerRef = ref(null);
const gutterRef = ref(null);
const isDragging = ref(false);
const containerSpanPx = ref(0);
const approachingPane = ref(null);
const proximityRatio = ref(0);

const collapsibleConfig = computed(() => resolveCollapsibleConfig(props.collapsible));

const fallbackDefault = computed(() => {
  if (props.defaultSize !== undefined) return props.defaultSize;
  if (props.unit === 'px') return 310;
  if (props.unit === 'percent') return 35;
  return 0.35;
});

const minBound = computed(() => {
  if (props.min !== undefined) return props.min;
  if (props.unit === 'px') return 180;
  if (props.unit === 'percent') return 15;
  return 0.15;
});

const maxBound = computed(() => {
  if (props.max !== undefined) return props.max;
  if (props.unit === 'px') return 720;
  if (props.unit === 'percent') return 85;
  return 0.85;
});

const internalSize = ref(props.modelValue !== undefined ? props.modelValue : fallbackDefault.value);
const lastExpandedSize = ref(internalSize.value);
const internalLocked = ref(props.locked !== undefined ? props.locked : false);
const internalCollapsedPane = ref(props.collapsedPane !== undefined ? props.collapsedPane : null);

const isLocked = computed(() => {
  return props.locked !== undefined ? props.locked : internalLocked.value;
});

const currentSize = computed(() => {
  return props.modelValue !== undefined ? props.modelValue : internalSize.value;
});

const activeCollapsedPane = computed(() => {
  if (!collapsibleConfig.value.enabled) return null;
  const raw = props.collapsedPane !== undefined ? props.collapsedPane : internalCollapsedPane.value;
  if (raw === 'first' && collapsibleConfig.value.allowFirst) return 'first';
  if (raw === 'second' && collapsibleConfig.value.allowSecond) return 'second';
  return null;
});

watch(
  () => props.modelValue,
  (val) => {
    if (val !== undefined) {
      internalSize.value = val;
      if (!activeCollapsedPane.value && isWithinComfortableBounds(val)) {
        lastExpandedSize.value = val;
      }
    }
  }
);

watch(
  () => props.locked,
  (val) => {
    if (val !== undefined) internalLocked.value = val;
  }
);

watch(
  () => props.collapsedPane,
  (val) => {
    if (val !== undefined) internalCollapsedPane.value = val;
  }
);

function computeMinMaxFirstPx(totalPx = containerSpanPx.value) {
  const usablePx = Math.max(100, (totalPx > 0 ? totalPx : 800) - props.gap);
  const maxBySecondPx = Math.max(60, usablePx - props.minSecondPx);
  let minFirstPx;
  let maxFirstPx;
  if (props.unit === 'px') {
    minFirstPx = minBound.value;
    maxFirstPx = Math.min(maxBound.value, maxBySecondPx);
  } else if (props.unit === 'percent') {
    minFirstPx = (minBound.value / 100) * usablePx;
    maxFirstPx = Math.min((maxBound.value / 100) * usablePx, maxBySecondPx);
  } else {
    minFirstPx = minBound.value * usablePx;
    maxFirstPx = Math.min(maxBound.value * usablePx, maxBySecondPx);
  }
  return {
    usablePx,
    minFirstPx: Math.max(40, minFirstPx),
    maxFirstPx: Math.max(Math.max(40, minFirstPx), maxFirstPx),
  };
}

function isWithinComfortableBounds(val, totalPx = containerSpanPx.value) {
  if (!Number.isFinite(val)) return false;
  const strict = clampComfortableSize(val, totalPx);
  return Math.abs(strict - val) < 0.001;
}

/**
 * Clamps size strictly to the comfortable `[minBound, maxBound]` reading range
 * (used when restoring a collapsed pane or when `collapsible` is false).
 */
function clampComfortableSize(rawVal, totalPx = containerSpanPx.value) {
  let val = Number.isFinite(rawVal) ? rawVal : fallbackDefault.value;
  if (val < minBound.value) val = minBound.value;
  if (val > maxBound.value) val = maxBound.value;

  if (totalPx > 0) {
    const usablePx = Math.max(100, totalPx - props.gap);
    const maxFirstPx = Math.max(60, usablePx - props.minSecondPx);
    if (props.unit === 'px') {
      val = Math.min(val, maxFirstPx);
      val = Math.max(minBound.value, val);
    } else if (props.unit === 'percent') {
      const maxPct = (maxFirstPx / usablePx) * 100;
      val = Math.min(val, maxPct);
    } else {
      const maxRatio = maxFirstPx / usablePx;
      val = Math.min(val, maxRatio);
    }
  }
  return val;
}

/**
 * Clamps size during live dragging:
 * - When `collapsible` is false, enforces `[minBound, maxBound]`.
 * - When `collapsible` is enabled on a side, allows 1:1 smooth pointer tracking
 *   all the way down to the pre-snap edge zone (`collapsedSize + collapseThreshold + 12px`)
 *   so the splitter never freezes at `82%` or jumps suddenly from a wide pane!
 */
function clampSize(rawVal, totalPx = containerSpanPx.value) {
  if (!collapsibleConfig.value.enabled) {
    return clampComfortableSize(rawVal, totalPx);
  }
  let val = Number.isFinite(rawVal) ? rawVal : fallbackDefault.value;
  const usablePx = Math.max(100, (totalPx > 0 ? totalPx : 800) - props.gap);
  const edgeStopPx = props.collapsedSize + props.collapseThreshold + 10;

  let minAllowed = minBound.value;
  let maxAllowed = maxBound.value;

  if (collapsibleConfig.value.allowFirst) {
    const edgeMinUnit =
      props.unit === 'px'
        ? edgeStopPx
        : props.unit === 'percent'
          ? (edgeStopPx / usablePx) * 100
          : edgeStopPx / usablePx;
    minAllowed = Math.min(minBound.value, edgeMinUnit);
  }

  if (collapsibleConfig.value.allowSecond) {
    const edgeMaxPx = Math.max(edgeStopPx, usablePx - edgeStopPx);
    const edgeMaxUnit =
      props.unit === 'px'
        ? edgeMaxPx
        : props.unit === 'percent'
          ? (edgeMaxPx / usablePx) * 100
          : edgeMaxPx / usablePx;
    maxAllowed = Math.max(maxBound.value, edgeMaxUnit);
  } else if (totalPx > 0) {
    const maxFirstPx = Math.max(60, usablePx - props.minSecondPx);
    const maxBySecondUnit =
      props.unit === 'px'
        ? maxFirstPx
        : props.unit === 'percent'
          ? (maxFirstPx / usablePx) * 100
          : maxFirstPx / usablePx;
    maxAllowed = Math.min(maxAllowed, maxBySecondUnit);
  }

  if (val < minAllowed) val = minAllowed;
  if (val > maxAllowed) val = maxAllowed;
  return val;
}

const expandedFirstBasis = computed(() => {
  const val = clampSize(currentSize.value);
  const halfGap = `${props.gap / 2}px`;
  if (props.unit === 'px') {
    return `${Math.round(val)}px`;
  }
  if (props.unit === 'percent') {
    return `calc(${val}% - ${halfGap})`;
  }
  return `calc(${(val * 100).toFixed(3)}% - ${halfGap})`;
});

const virtualLayout = computed(() =>
  computeVirtualCollapsedPaneStyles({
    orientation: props.orientation,
    collapsedPane: activeCollapsedPane.value,
    collapsedSizePx: props.collapsedSize,
    expandedFirstBasis: expandedFirstBasis.value,
  })
);

const firstPaneStyle = computed(() => virtualLayout.value.firstPaneStyle);
const secondPaneStyle = computed(() => virtualLayout.value.secondPaneStyle);
const isFirstCollapsed = computed(() => virtualLayout.value.isFirstCollapsed);
const isSecondCollapsed = computed(() => virtualLayout.value.isSecondCollapsed);

const gutterStyle = computed(() => {
  const g = Math.max(0, props.gap);
  return {
    flex: `0 0 ${g}px`,
    [props.orientation === 'vertical' ? 'height' : 'width']: `${g}px`,
    '--nano-splitter-proximity': proximityRatio.value,
  };
});

const hitboxStyle = computed(() => {
  const hitSize = resolveSplitterHitboxSizePx(props.gap, props.minHitboxPx);
  if (props.orientation === 'vertical') {
    return {
      height: `${hitSize}px`,
    };
  }
  return {
    width: `${hitSize}px`,
  };
});

const resolvedStorageMode = computed(() => normalizeStorageMode(props.storage, 'ls'));

const effectiveStorageKey = computed(() => {
  if (!props.storageKey) return '';
  return nanoStorage.resolveKey(props.storageKey, {
    appPrefix: props.appPrefix,
  });
});

function setCollapsedPane(nextCollapsed) {
  const normalized =
    nextCollapsed === 'first' || nextCollapsed === 'second' ? nextCollapsed : null;
  if (internalCollapsedPane.value === normalized) return;
  internalCollapsedPane.value = normalized;
  approachingPane.value = null;
  emit('update:collapsedPane', normalized);
  emit('collapseChange', {
    collapsedPane: normalized,
    virtualAxis: virtualLayout.value.virtualDimensionAxis,
    collapsedSizePx: props.collapsedSize,
    restoredSize: currentSize.value,
  });
}

function expandCollapsedPane() {
  if (!activeCollapsedPane.value) return;
  const restored = clampComfortableSize(lastExpandedSize.value ?? fallbackDefault.value);
  setCollapsedPane(null);
  updateSize(restored);
  persistState();
}

function collapsePane(targetPane = 'first') {
  if (!collapsibleConfig.value.enabled) return;
  if (targetPane === 'first' && !collapsibleConfig.value.allowFirst) return;
  if (targetPane === 'second' && !collapsibleConfig.value.allowSecond) return;
  lastExpandedSize.value = clampComfortableSize(currentSize.value);
  setCollapsedPane(targetPane);
  persistState();
}

function persistState() {
  const mode = resolvedStorageMode.value;
  if (!props.storageKey || mode === 'none') return;
  nanoStorage.set(
    props.storageKey,
    {
      size: currentSize.value,
      locked: isLocked.value,
      collapsedPane: activeCollapsedPane.value,
    },
    {
      mode,
      appPrefix: props.appPrefix,
    }
  );
}

function restoreState() {
  const mode = resolvedStorageMode.value;
  if (!props.storageKey || mode === 'none') return;
  const parsed = nanoStorage.get(props.storageKey, null, {
    mode,
    appPrefix: props.appPrefix,
  });
  if (!parsed) return;
  if (Number.isFinite(parsed?.size)) {
    const clamped = clampComfortableSize(parsed.size);
    internalSize.value = clamped;
    lastExpandedSize.value = clamped;
    if (props.modelValue !== undefined && props.modelValue !== clamped) {
      emit('update:modelValue', clamped);
    }
  }
  if (parsed?.locked === true || parsed?.locked === false) {
    internalLocked.value = parsed.locked;
    if (props.locked !== undefined && props.locked !== parsed.locked) {
      emit('update:locked', parsed.locked);
    }
  }
  if (
    collapsibleConfig.value.enabled &&
    (parsed?.collapsedPane === 'first' ||
      parsed?.collapsedPane === 'second' ||
      parsed?.collapsedPane === null)
  ) {
    internalCollapsedPane.value = parsed.collapsedPane;
    if (props.collapsedPane !== undefined && props.collapsedPane !== parsed.collapsedPane) {
      emit('update:collapsedPane', parsed.collapsedPane);
    }
  }
}

watch(
  () => [props.storage, props.appPrefix, props.storageKey],
  () => {
    restoreState();
  }
);

restoreState();

function updateSize(nextVal) {
  const clamped = clampSize(nextVal);
  internalSize.value = clamped;
  if (!activeCollapsedPane.value && isWithinComfortableBounds(clamped)) {
    lastExpandedSize.value = clamped;
  }
  emit('update:modelValue', clamped);
  emit('change', {
    size: clamped,
    unit: props.unit,
    collapsedPane: activeCollapsedPane.value,
  });
}

function toggleLock() {
  const next = !isLocked.value;
  internalLocked.value = next;
  emit('update:locked', next);
  persistState();
}

function handleContainerPointerMove(e) {
  if (isDragging.value) {
    proximityRatio.value = 1;
    return;
  }
  if (!gutterRef.value) return;
  const gRect = gutterRef.value.getBoundingClientRect();
  const isVert = props.orientation === 'vertical';
  const pointerCoordPx = isVert ? e.clientY : e.clientX;
  const splitterCenterCoordPx = isVert
    ? gRect.top + gRect.height / 2
    : gRect.left + gRect.width / 2;
  const field = computeSplitterProximityField({
    pointerCoordPx,
    splitterCenterCoordPx,
    hitboxSizePx: resolveSplitterHitboxSizePx(props.gap, props.minHitboxPx),
    proximityRadiusPx: props.proximityRadiusPx,
  });
  proximityRatio.value = field.proximityRatio;
}

function handleContainerPointerLeave() {
  if (!isDragging.value) {
    proximityRatio.value = 0;
  }
}

/**
 * Disambiguates between a stationary click (< 3px, toggles lock) and a drag gesture (>= 3px, drags splitter)
 * when the user grabs the glowing edge triangle tab directly.
 */
function handleLockToggleMouseDown(e) {
  if (e.button !== undefined && e.button !== 0) return;
  e.stopPropagation();
  e.preventDefault();
  const startX = e.clientX;
  const startY = e.clientY;
  let movedIntoDrag = false;

  const onMove = (moveEvt) => {
    const dist = Math.hypot(moveEvt.clientX - startX, moveEvt.clientY - startY);
    if (!movedIntoDrag && dist >= 3) {
      movedIntoDrag = true;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (isLocked.value) {
        internalLocked.value = false;
        emit('update:locked', false);
      }
      startDrag(moveEvt);
      onDrag(moveEvt);
    }
  };

  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    if (!movedIntoDrag) {
      toggleLock();
    }
  };

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

/**
 * Allows dragging the collapsed bar directly (>= 4px movement) to pull the collapsed pane open,
 * while preserving normal single-click (< 4px) expansion.
 */
function handleCollapsedBarMouseDown(e) {
  if (e.button !== undefined && e.button !== 0) return;
  const startX = e.clientX;
  const startY = e.clientY;
  let movedIntoDrag = false;

  const onMove = (moveEvt) => {
    const dist = Math.hypot(moveEvt.clientX - startX, moveEvt.clientY - startY);
    if (!movedIntoDrag && dist >= 4) {
      movedIntoDrag = true;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (isLocked.value) {
        internalLocked.value = false;
        emit('update:locked', false);
      }
      startDrag(moveEvt);
      onDrag(moveEvt);
    }
  };

  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function handleDoubleClick() {
  if (!props.resetOnDblClick || isLocked.value) return;
  if (activeCollapsedPane.value) {
    expandCollapsedPane();
    return;
  }
  const resetVal = clampComfortableSize(fallbackDefault.value);
  setCollapsedPane(null);
  updateSize(resetVal);
  persistState();
  emit('reset', resetVal);
}

function startDrag(e) {
  if (isLocked.value) return;
  if (e.button !== undefined && e.button !== 0) return;
  e.preventDefault();

  isDragging.value = true;
  if (globalThis.document) {
    document.body.style.cursor = props.orientation === 'vertical' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
  }
  emit('dragStart', currentSize.value);

  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
}

function convertPxToUnit(pxVal, usableSpan) {
  if (props.unit === 'px') {
    return Math.round(pxVal);
  }
  if (props.unit === 'percent') {
    return Number(((pxVal / usableSpan) * 100).toFixed(2));
  }
  return Number((pxVal / usableSpan).toFixed(4));
}

function onDrag(e) {
  if (!isDragging.value || !containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const isVert = props.orientation === 'vertical';
  const totalSpan = isVert ? rect.height : rect.width;
  if (totalSpan <= 0) return;

  containerSpanPx.value = totalSpan;
  const usableSpan = Math.max(1, totalSpan - props.gap);
  const pointerOffset = isVert
    ? e.clientY - rect.top - props.gap / 2
    : e.clientX - rect.left - props.gap / 2;

  if (collapsibleConfig.value.enabled) {
    const { minFirstPx, maxFirstPx } = computeMinMaxFirstPx(totalSpan);
    const snapOutcome = evaluateSplitterSnapCollapse({
      pointerOffsetPx: pointerOffset,
      usableSpanPx: usableSpan,
      minFirstPx,
      maxFirstPx,
      collapseThresholdPx: props.collapseThreshold,
      collapsedSizePx: props.collapsedSize,
      allowFirst: collapsibleConfig.value.allowFirst,
      allowSecond: collapsibleConfig.value.allowSecond,
      currentCollapsedPane: activeCollapsedPane.value,
    });

    approachingPane.value = snapOutcome.approachingPane;

    if (snapOutcome.collapsedPane) {
      setCollapsedPane(snapOutcome.collapsedPane);
      return;
    }

    if (activeCollapsedPane.value) {
      setCollapsedPane(null);
    }
    const nextUnitVal = convertPxToUnit(snapOutcome.clampedFirstPx, usableSpan);
    updateSize(nextUnitVal);
    return;
  }

  const nextVal = convertPxToUnit(pointerOffset, usableSpan);
  updateSize(nextVal);
}

function stopDrag() {
  if (!isDragging.value) return;
  isDragging.value = false;
  approachingPane.value = null;
  if (globalThis.document) {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
  persistState();
  emit('dragEnd', currentSize.value);
}

function handleKeyDown(e) {
  if (isLocked.value) return;
  const isVert = props.orientation === 'vertical';
  const decKey = isVert ? 'ArrowUp' : 'ArrowLeft';
  const incKey = isVert ? 'ArrowDown' : 'ArrowRight';
  if (e.key !== decKey && e.key !== incKey) return;

  e.preventDefault();
  if (activeCollapsedPane.value) {
    expandCollapsedPane();
    return;
  }
  const step = props.unit === 'px' ? 16 : props.unit === 'percent' ? 2 : 0.02;
  const delta = e.key === incKey ? step : -step;
  updateSize(currentSize.value + delta);
  persistState();
}

let resizeObserver = null;

onMounted(() => {
  restoreState();
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect();
    containerSpanPx.value = props.orientation === 'vertical' ? rect.height : rect.width;
  }
  if (globalThis.ResizeObserver && containerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        if (cr) {
          containerSpanPx.value = props.orientation === 'vertical' ? cr.height : cr.width;
        }
      }
    });
    resizeObserver.observe(containerRef.value);
  }
});

onUnmounted(() => {
  stopDrag();
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

function resetToDefault() {
  setCollapsedPane(null);
  const resetVal = clampComfortableSize(fallbackDefault.value);
  updateSize(resetVal);
  if (props.storageKey && resolvedStorageMode.value !== 'none') {
    nanoStorage.remove(props.storageKey, {
      mode: resolvedStorageMode.value,
      appPrefix: props.appPrefix,
    });
  }
  emit('reset', resetVal);
}

defineExpose({
  setSize: updateSize,
  reset: resetToDefault,
  toggleLock,
  collapsePane,
  expandCollapsedPane,
  persistState,
  restoreState,
  effectiveStorageKey,
  resolvedStorageMode,
  currentSize,
  activeCollapsedPane,
  approachingPane,
  isLocked,
  isDragging,
});
</script>

<template>
  <div
    ref="containerRef"
    class="nano-splitter"
    :class="[
      `is-${orientation}`,
      {
        'is-dragging': isDragging,
        'is-locked': isLocked,
        'has-collapsed-pane': Boolean(activeCollapsedPane),
        'is-near-splitter': proximityRatio > 0.05,
      },
    ]"
    @mousemove="handleContainerPointerMove"
    @mouseleave="handleContainerPointerLeave"
  >
    <!-- First Pane (Left / Top) -->
    <div
      class="nano-splitter-pane is-first"
      :class="{
        'is-collapsed': isFirstCollapsed,
        'is-approaching-collapse': approachingPane === 'first',
      }"
      :style="firstPaneStyle"
    >
      <button
        v-if="isFirstCollapsed"
        type="button"
        class="nano-splitter-collapsed-bar"
        :class="`is-${orientation}-bar`"
        v-tooltip="`Rozwiń lub przeciągnij: ${firstTitle}`"
        :aria-label="`Rozwiń: ${firstTitle}`"
        @mousedown="handleCollapsedBarMouseDown"
        @click="expandCollapsedPane"
      >
        <slot name="first-collapsed" :pane-title="firstTitle" :badge="firstBadge" :expand="expandCollapsedPane">
          <span class="nano-splitter-collapsed-chevron" aria-hidden="true">
            {{ orientation === 'vertical' ? '▾' : '▸' }}
          </span>
          <span class="nano-splitter-collapsed-title">{{ firstTitle }}</span>
          <span v-if="firstBadge !== '' && firstBadge !== null" class="nano-splitter-collapsed-badge">
            {{ firstBadge }}
          </span>
          <span class="nano-splitter-collapsed-action">Rozwiń</span>
        </slot>
      </button>
      <slot name="first">
        <slot name="left" />
      </slot>
    </div>

    <!-- Splitter Gutter & Laser Line -->
    <div ref="gutterRef" class="nano-splitter-gutter" :style="gutterStyle">
      <div
        class="nano-splitter-hitbox"
        :class="{
          active: isDragging,
          'is-near': proximityRatio > 0.15,
          'is-locked': isLocked,
          'is-snapped': Boolean(activeCollapsedPane),
          'is-approaching': Boolean(approachingPane),
        }"
        :style="hitboxStyle"
        role="separator"
        :tabindex="isLocked ? -1 : 0"
        :aria-orientation="orientation"
        :aria-disabled="isLocked"
        @mousedown="startDrag"
        @dblclick="handleDoubleClick"
        @keydown="handleKeyDown"
      >
        <!-- Triangle Lock/Unlock Pull-Tab (supports both Drag >= 3px to resize and Click < 3px to lock/unlock) -->
        <button
          v-if="lockable"
          type="button"
          class="nano-splitter-lock-toggle"
          v-tooltip="isLocked ? unlockTooltip : lockTooltip"
          :aria-label="isLocked ? unlockTooltip : lockTooltip"
          @mousedown="handleLockToggleMouseDown"
          @click.stop.prevent
        >
          <svg
            v-if="orientation === 'vertical'"
            viewBox="0 0 70 100"
            class="nano-splitter-triangle is-vert-tri"
            :class="{ 'is-locked': isLocked }"
          >
            <polygon
              points="6,10 6,90 62,50"
              fill="currentColor"
              stroke="currentColor"
              stroke-width="12"
              stroke-linejoin="round"
            />
          </svg>
          <svg
            v-else
            viewBox="0 0 100 70"
            class="nano-splitter-triangle is-horiz-tri"
            :class="{ 'is-locked': isLocked }"
          >
            <polygon
              points="10,6 90,6 50,62"
              fill="currentColor"
              stroke="currentColor"
              stroke-width="12"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <!-- Center 3-Dot Grip Pill -->
        <div v-if="showGrip" class="nano-splitter-grip" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>

    <!-- Second Pane (Right / Bottom) -->
    <div
      class="nano-splitter-pane is-second"
      :class="{
        'is-collapsed': isSecondCollapsed,
        'is-approaching-collapse': approachingPane === 'second',
      }"
      :style="secondPaneStyle"
    >
      <button
        v-if="isSecondCollapsed"
        type="button"
        class="nano-splitter-collapsed-bar"
        :class="`is-${orientation}-bar`"
        v-tooltip="`Rozwiń lub przeciągnij: ${secondTitle}`"
        :aria-label="`Rozwiń: ${secondTitle}`"
        @mousedown="handleCollapsedBarMouseDown"
        @click="expandCollapsedPane"
      >
        <slot name="second-collapsed" :pane-title="secondTitle" :badge="secondBadge" :expand="expandCollapsedPane">
          <span class="nano-splitter-collapsed-chevron" aria-hidden="true">
            {{ orientation === 'vertical' ? '▴' : '◂' }}
          </span>
          <span class="nano-splitter-collapsed-title">{{ secondTitle }}</span>
          <span v-if="secondBadge !== '' && secondBadge !== null" class="nano-splitter-collapsed-badge">
            {{ secondBadge }}
          </span>
          <span class="nano-splitter-collapsed-action">Rozwiń</span>
        </slot>
      </button>
      <slot name="second">
        <slot name="right" />
      </slot>
    </div>
  </div>
</template>

<style scoped>
.nano-splitter {
  display: flex;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  position: relative;
  align-items: stretch;
}

.nano-splitter.is-horizontal {
  flex-direction: row;
}

.nano-splitter.is-vertical {
  flex-direction: column;
}

.nano-splitter-pane {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: opacity 0.14s ease;
}

.nano-splitter-pane.is-second {
  flex: 1 1 0%;
}

.nano-splitter-pane.is-approaching-collapse {
  opacity: 0.48;
}

/* Preserve mounted DOM state inside collapsed pane while displaying the 38px virtual collapsed bar */
.nano-splitter-pane.is-collapsed > :not(.nano-splitter-collapsed-bar) {
  display: none !important;
}

.nano-splitter-collapsed-bar {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(56, 189, 248, 0.32);
  background: var(--color-bg-card, var(--nano-surface-2, rgba(15, 23, 42, 0.88)));
  color: var(--color-text-primary, var(--nano-text-primary, #e2e8f0));
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font-family: inherit;
  font-size: 0.76rem;
  font-weight: 700;
  box-sizing: border-box;
  transition: border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease;
}

.nano-splitter-collapsed-bar:hover {
  border-color: rgba(0, 229, 255, 0.65);
  box-shadow: 0 0 14px rgba(0, 229, 255, 0.16);
}

/* Horizontal splitter -> collapsed pane is a vertical 38px dock strip (virtual width) */
.nano-splitter-collapsed-bar.is-horizontal-bar {
  flex-direction: column;
  padding: 12px 4px;
  justify-content: flex-start;
}

.nano-splitter-collapsed-bar.is-horizontal-bar .nano-splitter-collapsed-title {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1 1 auto;
  text-align: left;
  letter-spacing: 0.03em;
}

.nano-splitter-collapsed-bar.is-horizontal-bar .nano-splitter-collapsed-action {
  display: none;
}

/* Vertical splitter -> collapsed pane is a horizontal 38px header bar (virtual height) */
.nano-splitter-collapsed-bar.is-vertical-bar .nano-splitter-collapsed-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nano-splitter-collapsed-bar.is-vertical-bar .nano-splitter-collapsed-action {
  margin-left: auto;
  font-size: 0.68rem;
  font-weight: 700;
  color: #38bdf8;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.nano-splitter-collapsed-chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: rgba(56, 189, 248, 0.14);
  border: 1px solid rgba(56, 189, 248, 0.35);
  color: #38bdf8;
  font-size: 0.72rem;
  flex-shrink: 0;
}

.nano-splitter-collapsed-badge {
  font-size: 0.66rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.14);
  border: 1px solid rgba(56, 189, 248, 0.32);
  color: #38bdf8;
  flex-shrink: 0;
}

.nano-splitter-gutter {
  position: relative;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  flex-shrink: 0;
}

.nano-splitter-hitbox {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  background: transparent;
  z-index: 30;
}

.nano-splitter.is-horizontal .nano-splitter-hitbox {
  top: 0;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  cursor: col-resize;
}

.nano-splitter.is-vertical .nano-splitter-hitbox {
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  cursor: row-resize;
}

.nano-splitter-hitbox.is-locked {
  cursor: default !important;
}

/* Signature Laser Line with 1D Voronoi Proximity Halo Response */
.nano-splitter-hitbox::before {
  content: '';
  position: absolute;
  background: rgba(56, 189, 248, calc(0.18 + var(--nano-splitter-proximity, 0) * 0.62));
  transition: background-color 0.14s ease, box-shadow 0.14s ease;
  pointer-events: none;
}

.nano-splitter.is-horizontal .nano-splitter-hitbox::before {
  width: 1px;
  top: 4px;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
}

.nano-splitter.is-vertical .nano-splitter-hitbox::before {
  height: 1px;
  left: 4px;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

.nano-splitter-hitbox.is-near::before {
  background: rgba(0, 229, 255, calc(0.32 + var(--nano-splitter-proximity, 0) * 0.58));
  box-shadow: 0 0 6px rgba(0, 229, 255, calc(var(--nano-splitter-proximity, 0) * 0.45));
}

.nano-splitter-hitbox:hover::before,
.nano-splitter-hitbox.active::before,
.nano-splitter-hitbox:focus-visible::before {
  background: var(--nano-splitter-laser, #00e5ff);
  box-shadow: 0 0 8px rgba(0, 229, 255, 0.65);
}

.nano-splitter.is-horizontal .nano-splitter-hitbox:hover::before,
.nano-splitter.is-horizontal .nano-splitter-hitbox.active::before {
  width: 2px;
}

.nano-splitter.is-vertical .nano-splitter-hitbox:hover::before,
.nano-splitter.is-vertical .nano-splitter-hitbox.active::before {
  height: 2px;
}

.nano-splitter-hitbox.is-approaching::before {
  background: #f59e0b !important;
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.85) !important;
}

.nano-splitter-hitbox.is-snapped::before {
  background: rgba(56, 189, 248, 0.48);
}

.nano-splitter-hitbox.is-locked::before,
.nano-splitter-hitbox.is-locked:hover::before,
.nano-splitter-hitbox.is-locked.active::before {
  background: rgba(148, 163, 184, 0.14) !important;
  box-shadow: none !important;
}

/* Triangle Lock Pull-Tab */
.nano-splitter-lock-toggle {
  position: absolute;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  display: flex;
  cursor: pointer;
  z-index: 20;
  outline: none;
}

.nano-splitter.is-horizontal .nano-splitter-lock-toggle {
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 18px;
  align-items: flex-start;
  justify-content: center;
}

.nano-splitter.is-vertical .nano-splitter-lock-toggle {
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 24px;
  align-items: center;
  justify-content: flex-start;
}

.nano-splitter-triangle {
  display: block;
  color: rgba(148, 163, 184, 0.28);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.nano-splitter-triangle.is-horiz-tri {
  width: 15px;
  height: 11px;
  transform-origin: top center;
}

.nano-splitter-triangle.is-vert-tri {
  width: 11px;
  height: 15px;
  transform-origin: left center;
}

/* Unlocked state: glowing cyan triangle */
.nano-splitter-triangle:not(.is-locked) {
  color: var(--nano-splitter-laser, #00e5ff);
  filter: drop-shadow(0 0 4px rgba(0, 229, 255, 0.85));
}

/* Hover state (both locked & unlocked): stretches inward in warm amber like pulling a tab */
.nano-splitter-lock-toggle:hover .nano-splitter-triangle.is-horiz-tri {
  color: #fbbf24;
  filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.85));
  transform: scaleY(1.22);
}

.nano-splitter-lock-toggle:hover .nano-splitter-triangle.is-vert-tri {
  color: #fbbf24;
  filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.85));
  transform: scaleX(1.22);
}

/* Center 3-dot grip pill */
.nano-splitter-grip {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.78);
  border: 1px solid rgba(56, 189, 248, calc(0.28 + var(--nano-splitter-proximity, 0) * 0.55));
  pointer-events: none;
  opacity: calc(0.62 + var(--nano-splitter-proximity, 0) * 0.38);
  transition: opacity 0.14s ease, transform 0.14s ease, border-color 0.14s ease, box-shadow 0.14s ease;
}

.nano-splitter.is-horizontal .nano-splitter-grip {
  flex-direction: column;
  padding: 6px 2px;
}

.nano-splitter.is-vertical .nano-splitter-grip {
  flex-direction: row;
  padding: 2px 6px;
}

.nano-splitter-hitbox:hover .nano-splitter-grip,
.nano-splitter-hitbox.active .nano-splitter-grip {
  opacity: 1;
  border-color: var(--nano-splitter-laser, #00e5ff);
  box-shadow: 0 0 8px rgba(0, 229, 255, 0.42);
  transform: scale(1.08);
}

.nano-splitter-grip span {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--nano-splitter-laser, #00e5ff);
}
</style>
