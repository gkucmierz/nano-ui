<script setup>
import { ref, computed, provide, onMounted, onUnmounted, watch, nextTick } from 'vue';
import {
  MUTATING_HEADER_META_KEY,
  normalizeHeaderSpread,
  parseFloatingVerticalMargins,
  computeHeaderCompressionMeta,
} from '../utils/mutatingHeader.js';

const props = defineProps({
  /**
   * Scroll distance in pixels after which the header docks edge-to-edge
   */
  threshold: {
    type: Number,
    default: 24,
  },
  /**
   * Alias for threshold (`:scroll-threshold`)
   */
  scrollThreshold: {
    type: Number,
    default: undefined,
  },
  /**
   * Scroll distance in pixels below which the header un-docks back into floating card
   */
  hysteresis: {
    type: Number,
    default: 8,
  },
  /**
   * Optional custom scroll container selector (e.g. '.content-scroll') or HTMLElement.
   * If null, window scroll is monitored.
   */
  scrollContainer: {
    type: [String, Object],
    default: null,
  },
  /**
   * Height of the header bar
   */
  height: {
    type: String,
    default: '60px',
  },
  /**
   * Floating margins when at the top (horizontal margins are always locked to `auto`
   * so docking/undocking expands symmetrically from center with zero horizontal jump).
   */
  floatingMargin: {
    type: String,
    default: '12px auto 0 auto',
  },
  /**
   * Floating width when at the top (e.g. 'calc(100% - 48px)' or 'calc(100% - 2.5rem)')
   */
  floatingWidth: {
    type: String,
    default: 'calc(100% - 48px)',
  },
  /**
   * Optional max-width when floating at the top so the header aligns with a centered page container (e.g. '1240px'),
   * then smoothly expands to 100% full viewport width on scroll (`is-stuck`).
   */
  floatingMaxWidth: {
    type: [String, Number],
    default: '100%',
  },
  /**
   * Percentage (0..100) of newly unlocked horizontal space across which inner header elements
   * (`#left`, `#center`, `#right`) spread when docked (`is-stuck`):
   * - `0` (default, Option 1): Inner elements keep their exact floating layout width (0px shift).
   * - `1..100` (Option 2, e.g. 25, 33, 50, 66, 100): Inner elements spread proportionally across
   *   `spread%` of the extra docked width.
   */
  spread: {
    type: Number,
    default: 0,
  },
  /**
   * Floating border radius when at the top
   */
  floatingRadius: {
    type: String,
    default: '16px',
  },
  /**
   * Border radius when stuck/docked. Default: undefined (falls back to CSS var --stuck-radius or '11px 11px 0 0').
   */
  stuckRadius: {
    type: [String, Number],
    default: undefined,
  },
  /**
   * Whether to enable backdrop blur glassmorphism
   */
  glassmorphism: {
    type: Boolean,
    default: true,
  },
  /**
   * Controlled stuck state via v-model:stuck
   */
  stuck: {
    type: Boolean,
    default: undefined,
  },
});

const emit = defineEmits(['update:stuck', 'stuck', 'unstick', 'meta-change']);

const headerElRef = ref(null);
const innerElRef = ref(null);
const leftElRef = ref(null);
const centerElRef = ref(null);
const rightElRef = ref(null);

const internalIsStuck = ref(false);
const measuredParentWidth = ref(1440);
const measuredContainerWidth = ref(1200);
const measuredContentWidth = ref(0);

const isStuck = computed({
  get: () => (props.stuck !== undefined ? props.stuck : internalIsStuck.value),
  set: (val) => {
    internalIsStuck.value = val;
    emit('update:stuck', val);
    if (val) {
      emit('stuck');
    } else {
      emit('unstick');
    }
  },
});

const normalizedSpreadObj = computed(() => normalizeHeaderSpread(props.spread, 0));
const verticalMargins = computed(() => parseFloatingVerticalMargins(props.floatingMargin));

const resolvedStuckRadius = computed(() => {
  if (props.stuckRadius === undefined || props.stuckRadius === null || props.stuckRadius === '') {
    return undefined;
  }
  if (props.stuckRadius === 0 || props.stuckRadius === '0' || props.stuckRadius === '0px') {
    return '0px';
  }
  if (typeof props.stuckRadius === 'number') {
    return `${props.stuckRadius}px ${props.stuckRadius}px 0 0`;
  }
  const str = String(props.stuckRadius).trim();
  const parts = str.split(/\s+/);
  if (parts.length === 1) {
    const num = parseFloat(parts[0]);
    if (!isNaN(num)) {
      if (num === 0) return '0px';
      const unit = parts[0].replace(/^[0-9.-]+/, '') || 'px';
      return `${num}${unit} ${num}${unit} 0 0`;
    }
  }
  return str;
});

/**
 * Resolves explicit pixel or calc expressions for both outer max-width and inner spread max-width
 * so CSS transitions interpolate smoothly in Chromium/WebKit/Gecko without mixed-unit snaps.
 */
const resolvedFloatingMaxPx = computed(() => {
  const raw = props.floatingMaxWidth;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.min(raw, measuredParentWidth.value);
  }
  const str = String(raw || '100%').trim();
  if (str.endsWith('px')) {
    const px = parseFloat(str);
    if (Number.isFinite(px)) {
      return Math.min(px, measuredParentWidth.value);
    }
  }
  return null;
});

const headerStyleVars = computed(() => {
  const { spreadRatio } = normalizedSpreadObj.value;
  const parentW = Math.max(320, measuredParentWidth.value || 1440);
  const floatMaxPx = resolvedFloatingMaxPx.value;

  const floatingMaxCss =
    floatMaxPx !== null
      ? `${Math.round(floatMaxPx)}px`
      : typeof props.floatingMaxWidth === 'number'
        ? `${props.floatingMaxWidth}px`
        : String(props.floatingMaxWidth || '100%');

  const stuckMaxCss = floatMaxPx !== null ? `${Math.round(parentW)}px` : '100%';

  // Base inner content width (before spread) matches the floating inner width
  let innerBaseMaxCss = '100%';
  let innerStuckMaxCss = '100%';
  if (floatMaxPx !== null) {
    const innerFloatW = Math.max(240, floatMaxPx - 40);
    const innerFullW = Math.max(innerFloatW, parentW - 48);
    const innerSpreadW = Math.round(innerFloatW + spreadRatio * (innerFullW - innerFloatW));
    innerBaseMaxCss = `${Math.round(innerFloatW)}px`;
    innerStuckMaxCss = `${innerSpreadW}px`;
  } else {
    innerBaseMaxCss = '100%';
    innerStuckMaxCss = '100%';
  }

  // When floatingMaxWidth is '100%' (default), Option 1 vs Option 2 controls how much of the
  // horizontal padding/margin delta (e.g. 48px) is unlocked by `.header-inner` when stuck:
  const stuckSideInsetFormula =
    floatMaxPx === null
      ? `calc(24px + (1 - ${spreadRatio}) * 16px)`
      : '24px';

  return {
    '--header-height': props.height,
    '--floating-margin-top': verticalMargins.value.top,
    '--floating-margin-bottom': verticalMargins.value.bottom,
    '--floating-width': props.floatingWidth,
    '--floating-max-width': floatingMaxCss,
    '--stuck-max-width': stuckMaxCss,
    '--inner-floating-max-width': innerBaseMaxCss,
    '--inner-stuck-max-width': innerStuckMaxCss,
    '--stuck-padding-x': stuckSideInsetFormula,
    '--spread-ratio': String(spreadRatio),
    '--floating-radius': props.floatingRadius,
    '--stuck-radius': resolvedStuckRadius.value,
    '--nano-header-free-px': `${headerMeta.value.freeSpacePx}px`,
    '--nano-header-utilization': String(headerMeta.value.utilizationRatio),
    '--nano-header-compression': String(headerMeta.value.compressionLevel),
  };
});

const measureHeaderGeometry = () => {
  const headerEl = headerElRef.value;
  const innerEl = innerElRef.value;
  if (!headerEl || !innerEl) return;

  const parentEl = headerEl.parentElement;
  if (parentEl && parentEl.clientWidth > 0) {
    measuredParentWidth.value = parentEl.clientWidth;
  } else if (typeof window !== 'undefined' && window.innerWidth > 0) {
    measuredParentWidth.value = window.innerWidth;
  }

  if (innerEl.clientWidth > 0) {
    measuredContainerWidth.value = innerEl.clientWidth;
  }

  let sumW = 0;
  let activeSlotCount = 0;
  for (const el of [leftElRef.value, centerElRef.value, rightElRef.value]) {
    if (el) {
      const children = Array.from(el.children || []);
      let w = 0;
      if (children.length > 0) {
        for (const child of children) {
          w += Math.max(
            child.scrollWidth || 0,
            Math.round(child.getBoundingClientRect?.().width || 0)
          );
        }
        if (children.length > 1) {
          w += (children.length - 1) * 10;
        }
      } else {
        w = Math.max(el.scrollWidth || 0, Math.round(el.getBoundingClientRect().width || 0));
      }
      if (w > 0) {
        sumW += w;
        activeSlotCount += 1;
      }
    }
  }
  if (activeSlotCount > 1) {
    sumW += (activeSlotCount - 1) * 16;
  }
  measuredContentWidth.value = sumW;
};

const headerMeta = computed(() =>
  computeHeaderCompressionMeta({
    containerWidth: measuredContainerWidth.value,
    contentWidth: measuredContentWidth.value,
    isStuck: isStuck.value,
    spreadPercent: normalizedSpreadObj.value.spreadPercent,
  })
);

provide(MUTATING_HEADER_META_KEY, headerMeta);

watch(
  headerMeta,
  (nextMeta) => {
    emit('meta-change', nextMeta);
  },
  { deep: true }
);

watch(
  () => [props.spread, props.floatingMaxWidth, isStuck.value],
  () => {
    nextTick(() => {
      measureHeaderGeometry();
    });
  }
);

let targetContainer = null;
let resizeObserver = null;

const getScrollY = () => {
  if (targetContainer && targetContainer !== window) {
    return targetContainer.scrollTop || 0;
  }
  return window.scrollY || document.documentElement.scrollTop || 0;
};

const handleScroll = () => {
  const y = getScrollY();
  const stickThresh = props.scrollThreshold !== undefined ? props.scrollThreshold : props.threshold;
  const unstickThresh = props.hysteresis;

  if (!isStuck.value && y > stickThresh) {
    isStuck.value = true;
  } else if (isStuck.value && y < unstickThresh) {
    isStuck.value = false;
  }
};

const setupScrollListener = () => {
  cleanupScrollListener();

  if (typeof window === 'undefined') return;

  if (props.scrollContainer) {
    if (typeof props.scrollContainer === 'string') {
      targetContainer = document.querySelector(props.scrollContainer);
    } else if (props.scrollContainer instanceof HTMLElement) {
      targetContainer = props.scrollContainer;
    }
  }

  if (!targetContainer) {
    targetContainer = window;
  }

  targetContainer.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
};

const cleanupScrollListener = () => {
  if (targetContainer) {
    targetContainer.removeEventListener('scroll', handleScroll);
    targetContainer = null;
  }
};

watch(
  () => props.scrollContainer,
  () => {
    setupScrollListener();
  }
);

onMounted(() => {
  setupScrollListener();
  measureHeaderGeometry();

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      measureHeaderGeometry();
    });
    if (headerElRef.value?.parentElement) {
      resizeObserver.observe(headerElRef.value.parentElement);
    }
    if (innerElRef.value) {
      resizeObserver.observe(innerElRef.value);
    }
  } else if (typeof window !== 'undefined') {
    window.addEventListener('resize', measureHeaderGeometry, { passive: true });
  }
});

onUnmounted(() => {
  cleanupScrollListener();
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', measureHeaderGeometry);
  }
});

defineExpose({
  refreshScroll: handleScroll,
  measureHeaderGeometry,
  setStuck: (val) => {
    isStuck.value = Boolean(val);
  },
  isStuck,
  headerMeta,
  getScrollY,
});
</script>

<template>
  <header
    ref="headerElRef"
    class="nano-mutating-header"
    :class="{
      'is-stuck': isStuck,
      'has-glassmorphism': glassmorphism,
    }"
    :data-density="headerMeta.densityTier"
    :data-compression-level="headerMeta.compressionLevel"
    :style="{
      ...headerStyleVars,
      '--stuck-radius': resolvedStuckRadius,
    }"
  >
    <div ref="innerElRef" class="header-inner">
      <!-- Left Slot (Brand, Logo, Back Action) -->
      <div v-if="$slots.left" ref="leftElRef" class="header-left">
        <slot
          name="left"
          :is-stuck="isStuck"
          :spread="normalizedSpreadObj.spreadPercent"
          :meta="headerMeta"
          :compression-level="headerMeta.compressionLevel"
          :density="headerMeta.densityTier"
        />
      </div>

      <!-- Center Slot (Metrics, Search, Navigation Tabs) -->
      <div v-if="$slots.center" ref="centerElRef" class="header-center">
        <slot
          name="center"
          :is-stuck="isStuck"
          :spread="normalizedSpreadObj.spreadPercent"
          :meta="headerMeta"
          :compression-level="headerMeta.compressionLevel"
          :density="headerMeta.densityTier"
        />
      </div>

      <!-- Right Slot (User profile, Actions, Theme Toggle) -->
      <div v-if="$slots.right" ref="rightElRef" class="header-right">
        <slot
          name="right"
          :is-stuck="isStuck"
          :spread="normalizedSpreadObj.spreadPercent"
          :meta="headerMeta"
          :compression-level="headerMeta.compressionLevel"
          :density="headerMeta.densityTier"
        />
      </div>

      <!-- Default Slot (Fallback for custom inner markup) -->
      <slot
        v-if="!$slots.left && !$slots.center && !$slots.right"
        :is-stuck="isStuck"
        :spread="normalizedSpreadObj.spreadPercent"
        :meta="headerMeta"
        :compression-level="headerMeta.compressionLevel"
        :density="headerMeta.densityTier"
      />
    </div>
  </header>
</template>

<style scoped>
.nano-mutating-header {
  position: sticky;
  top: 0;
  z-index: 1000;
  width: var(--floating-width, calc(100% - 48px));
  max-width: var(--floating-max-width, 100%);
  height: var(--header-height, 60px);
  /* Horizontal margins MUST remain `auto` in both floating and stuck states so the bar
     expands symmetrically from center without snapping to left: 0 on frame 1 */
  margin-top: var(--floating-margin-top, 12px);
  margin-bottom: var(--floating-margin-bottom, 0px);
  margin-left: auto;
  margin-right: auto;
  padding: 0 20px;
  border-radius: var(--floating-radius, 16px);
  border: 1px solid var(--nano-border-subtle, rgba(255, 255, 255, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-sizing: border-box;
  -webkit-user-select: none;
  user-select: none;
  box-shadow: var(--nano-shadow-card, 0 8px 24px -6px rgba(0, 0, 0, 0.45));
  background: var(
    --nano-mutating-header-bg,
    color-mix(in srgb, var(--nano-bg-sidebar, #18181b) 88%, transparent)
  );
  color: var(--nano-text-main);
  will-change: width, max-width, margin-top, margin-bottom, border-radius, border-color, padding, box-shadow;
  transition: width var(--nano-transition-header),
              max-width var(--nano-transition-header),
              margin-top var(--nano-transition-header),
              margin-bottom var(--nano-transition-header),
              border-radius var(--nano-transition-header),
              border-color var(--nano-transition-interactive),
              padding var(--nano-transition-header),
              box-shadow var(--nano-transition-header),
              background-color var(--nano-transition-interactive);
}

.nano-mutating-header.has-glassmorphism {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.nano-mutating-header.is-stuck {
  width: calc(100% - 0px);
  max-width: var(--stuck-max-width, 100%);
  margin: var(--stuck-margin, 0);
  margin-left: auto;
  margin-right: auto;
  border-radius: var(--stuck-radius, 11px 11px 0 0);
  border-color: transparent transparent var(--nano-border-subtle, rgba(255, 255, 255, 0.1)) transparent;
  padding: 0 var(--stuck-padding-x, 24px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}

.header-inner {
  width: 100%;
  max-width: var(--inner-floating-max-width, 100%);
  height: 100%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  transition: max-width var(--nano-transition-header);
}

.nano-mutating-header.is-stuck .header-inner {
  max-width: var(--inner-stuck-max-width, 100%);
}

.header-left,
.header-center,
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.header-left {
  justify-content: flex-start;
}

.header-center {
  justify-content: center;
}

.header-right {
  justify-content: flex-end;
}
</style>
