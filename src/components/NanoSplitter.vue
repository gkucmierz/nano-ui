<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { tooltipDirective as vTooltip } from '../directives/tooltip.js';

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
   * Show the LoL-Inspector-style top triangle lock/unlock toggle tab
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
    default: false,
  },
  /**
   * Reset to defaultSize on double-click
   */
  resetOnDblClick: {
    type: Boolean,
    default: true,
  },
  /**
   * Optional localStorage key to persist split size & lock state
   */
  storageKey: {
    type: String,
    default: '',
  },
});

const emit = defineEmits([
  'update:modelValue',
  'update:locked',
  'change',
  'dragStart',
  'dragEnd',
  'reset',
]);

const containerRef = ref(null);
const isDragging = ref(false);
const containerSpanPx = ref(0);

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
const internalLocked = ref(props.locked !== undefined ? props.locked : false);

watch(
  () => props.modelValue,
  (val) => {
    if (val !== undefined) internalSize.value = val;
  }
);

watch(
  () => props.locked,
  (val) => {
    if (val !== undefined) internalLocked.value = val;
  }
);

const isLocked = computed(() => {
  return props.locked !== undefined ? props.locked : internalLocked.value;
});

const currentSize = computed(() => {
  return props.modelValue !== undefined ? props.modelValue : internalSize.value;
});

function clampSize(rawVal, totalPx = containerSpanPx.value) {
  let val = Number.isFinite(rawVal) ? rawVal : fallbackDefault.value;
  if (val < minBound.value) val = minBound.value;
  if (val > maxBound.value) val = maxBound.value;

  if (totalPx > 0) {
    const usablePx = Math.max(100, totalPx - props.gap);
    const maxFirstPx = Math.max(80, usablePx - props.minSecondPx);
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

const firstPaneStyle = computed(() => {
  const val = clampSize(currentSize.value);
  const halfGap = `${props.gap / 2}px`;
  let basis;
  if (props.unit === 'px') {
    basis = `${Math.round(val)}px`;
  } else if (props.unit === 'percent') {
    basis = `calc(${val}% - ${halfGap})`;
  } else {
    basis = `calc(${(val * 100).toFixed(3)}% - ${halfGap})`;
  }

  return {
    flex: `0 0 ${basis}`,
    [props.orientation === 'vertical' ? 'height' : 'width']: basis,
  };
});

const gutterStyle = computed(() => {
  const g = Math.max(0, props.gap);
  return {
    flex: `0 0 ${g}px`,
    [props.orientation === 'vertical' ? 'height' : 'width']: `${g}px`,
  };
});

const hitboxStyle = computed(() => {
  const hitSize = Math.max(props.gap, 20);
  if (props.orientation === 'vertical') {
    return {
      height: `${hitSize}px`,
    };
  }
  return {
    width: `${hitSize}px`,
  };
});

function persistState() {
  if (!props.storageKey || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      props.storageKey,
      JSON.stringify({
        size: internalSize.value,
        locked: internalLocked.value,
      })
    );
  } catch {}
}

function restoreState() {
  if (!props.storageKey || typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(props.storageKey);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.size === 'number' && props.modelValue === undefined) {
      internalSize.value = clampSize(parsed.size);
    }
    if (typeof parsed?.locked === 'boolean' && props.locked === undefined) {
      internalLocked.value = parsed.locked;
    }
  } catch {}
}

function updateSize(nextVal) {
  const clamped = clampSize(nextVal);
  internalSize.value = clamped;
  emit('update:modelValue', clamped);
  emit('change', {
    size: clamped,
    unit: props.unit,
  });
}

function toggleLock() {
  const next = !isLocked.value;
  internalLocked.value = next;
  emit('update:locked', next);
  persistState();
}

function handleDoubleClick() {
  if (!props.resetOnDblClick || isLocked.value) return;
  const resetVal = clampSize(fallbackDefault.value);
  updateSize(resetVal);
  persistState();
  emit('reset', resetVal);
}

function startDrag(e) {
  if (isLocked.value) return;
  if (e.button !== undefined && e.button !== 0) return;
  e.preventDefault();

  isDragging.value = true;
  if (typeof document !== 'undefined') {
    document.body.style.cursor = props.orientation === 'vertical' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
  }
  emit('dragStart', currentSize.value);

  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
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

  let nextVal;
  if (props.unit === 'px') {
    nextVal = Math.round(pointerOffset);
  } else if (props.unit === 'percent') {
    nextVal = Number(((pointerOffset / usableSpan) * 100).toFixed(2));
  } else {
    nextVal = Number((pointerOffset / usableSpan).toFixed(4));
  }

  updateSize(nextVal);
}

function stopDrag() {
  if (!isDragging.value) return;
  isDragging.value = false;
  if (typeof document !== 'undefined') {
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
  if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
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
      },
    ]"
  >
    <!-- First Pane (Left / Top) -->
    <div class="nano-splitter-pane is-first" :style="firstPaneStyle">
      <slot name="first">
        <slot name="left" />
      </slot>
    </div>

    <!-- LoL-Inspector-styled Splitter Gutter & Laser Line -->
    <div class="nano-splitter-gutter" :style="gutterStyle">
      <div
        class="nano-splitter-hitbox"
        :class="{ active: isDragging, 'is-locked': isLocked }"
        :style="hitboxStyle"
        role="separator"
        :tabindex="isLocked ? -1 : 0"
        :aria-orientation="orientation"
        :aria-disabled="isLocked"
        @mousedown="startDrag"
        @dblclick="handleDoubleClick"
        @keydown="handleKeyDown"
      >
        <!-- LoL Inspector Triangle Lock/Unlock Pull-Tab -->
        <button
          v-if="lockable"
          type="button"
          class="nano-splitter-lock-toggle"
          v-tooltip="isLocked ? unlockTooltip : lockTooltip"
          :aria-label="isLocked ? unlockTooltip : lockTooltip"
          @mousedown.stop
          @click.stop="toggleLock"
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

        <!-- Optional Center 3-Dot Grip -->
        <div v-if="showGrip" class="nano-splitter-grip" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>

    <!-- Second Pane (Right / Bottom) -->
    <div class="nano-splitter-pane is-second">
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
}

.nano-splitter-pane.is-second {
  flex: 1 1 0%;
}

.nano-splitter-gutter {
  position: relative;
  z-index: 15;
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

/* Signature LoL 1px Laser Line */
.nano-splitter-hitbox::before {
  content: '';
  position: absolute;
  background: transparent;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
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

.nano-splitter-hitbox:hover::before,
.nano-splitter-hitbox.active::before,
.nano-splitter-hitbox:focus-visible::before {
  background: var(--nano-splitter-laser, #00e5ff);
}

.nano-splitter-hitbox.is-locked:hover::before,
.nano-splitter-hitbox.is-locked.active::before {
  background: transparent !important;
  box-shadow: none !important;
}

/* LoL Inspector Triangle Lock Pull-Tab */
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

/* Optional 3-dot grip */
.nano-splitter-grip {
  position: absolute;
  display: flex;
  gap: 3px;
  pointer-events: none;
  opacity: 0.45;
  transition: opacity 0.15s ease;
}

.nano-splitter.is-horizontal .nano-splitter-grip {
  flex-direction: column;
}

.nano-splitter.is-vertical .nano-splitter-grip {
  flex-direction: row;
}

.nano-splitter-hitbox:hover .nano-splitter-grip,
.nano-splitter-hitbox.active .nano-splitter-grip {
  opacity: 0.95;
}

.nano-splitter-grip span {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--nano-splitter-laser, #00e5ff);
}
</style>
