<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import NanoIcon from './NanoIcon.vue';
import {
  clampCoverFlowIndex,
  stepCoverFlowIndex,
  computeCoverFlowItemTransform,
} from '../utils/coverflow.js';
import { computeAdaptiveCardExpansion } from '../utils/selectPositioning.js';
import { fitCardContentToHeight } from '../utils/fitText.js';
import { createKineticTransition } from '../utils/kinetics.js';
import { getScopedStorageController } from '../utils/storage-controller.js';

const props = defineProps({
  modelValue: {
    type: Number,
    default: 0,
  },
  items: {
    type: Array,
    default: () => [],
  },
  orientation: {
    type: String,
    default: 'horizontal',
    validator: (v) => ['horizontal', 'vertical'].includes(v),
  },
  sideAngle: {
    type: Number,
    default: 74,
  },
  centerGap: {
    type: Number,
    default: 185,
  },
  stackSpacing: {
    type: Number,
    default: 56,
  },
  depthOffset: {
    type: Number,
    default: 150,
  },
  stackDepthStep: {
    type: Number,
    default: 68,
  },
  cardWidth: {
    type: Number,
    default: 340,
  },
  cardHeight: {
    type: Number,
    default: 230,
  },
  stageHeight: {
    type: Number,
    default: 330,
  },
  loop: {
    type: Boolean,
    default: false,
  },
  reflection: {
    type: Boolean,
    default: true,
  },
  /**
   * Side-card depth attenuation mode:
   * - `'color'` (default): cards stay 100% opaque (`opacity: 1`, preventing rear cards from bleeding
   *   through front cards and avoiding GPU offscreen alpha-group compositing) while `.nano-cf-shade`
   *   fades side cards toward the theme background (`#09090b` in dark mode, `#f8fafc` in light mode).
   * - `'opacity'`: disables `.nano-cf-shade` color overlay and fades side cards via `opacity` + edge
   *   `mask-image` alpha gradient — ideal over mixed/animated backdrops (e.g. `@gkucmierz/trianglify`).
   */
  fadeMode: {
    type: String,
    default: 'color',
    validator: (v) => ['color', 'opacity'].includes(v),
  },
  showControls: {
    type: Boolean,
    default: true,
  },
  showIndicators: {
    type: Boolean,
    default: true,
  },
  wheelNavigation: {
    type: Boolean,
    default: true,
  },
  /**
   * Prevents wheel/trackpad scroll events over the CoverFlow viewport from bubbling up
   * and scrolling the parent page (default: true).
   */
  wheelPreventScroll: {
    type: Boolean,
    default: true,
  },
  /**
   * Enables keyboard navigation (ArrowLeft / ArrowRight in horizontal mode,
   * ArrowUp / ArrowDown in vertical mode) even when focus is on a nearby toggle or page body.
   */
  keyboardNavigation: {
    type: Boolean,
    default: true,
  },
  /**
   * Enables fast kinetic Hermite velocity-chaining animations (`createKineticTransition`)
   * when clicking arrows, indicator dots, or side cards — supporting rapid 2/3/5+ clicks mid-flight.
   */
  animated: {
    type: Boolean,
    default: true,
  },
  /**
   * Base kinetic animation duration in milliseconds (Nano-UI fast standard: 260ms).
   */
  animationDuration: {
    type: Number,
    default: 260,
  },
  /**
   * Automatically measures the active card's natural content height (`scrollHeight`) and
   * expands the active card symmetrically up and down using recursive `parentNode` ancestor
   * bounds (`computeAdaptiveCardExpansion` from `selectPositioning.js`).
   */
  autoExpandActive: {
    type: Boolean,
    default: false,
  },
  /**
   * Automatically fits each card's inner typography and spacing using `naturalSearch`
   * (`fitCardContentToHeight` from `fitText.js`) so cards never require an internal vertical scrollbar.
   */
  autoFitContent: {
    type: Boolean,
    default: true,
  },
  /**
   * In horizontal mode (`orientation === 'horizontal'`), allows vertical wheel/trackpad scrolling
   * to scroll the active card's inner content (`overflow-y: auto`) when explicitly enabled and
   * content still exceeds the expanded card height. Defaults to `false` to prevent vertical scrollbars inside cards.
   */
  innerContentScroll: {
    type: Boolean,
    default: false,
  },
  storageKey: {
    type: String,
    default: '',
  },
  storageMode: {
    type: String,
    default: undefined,
  },
});

const emit = defineEmits(['update:modelValue', 'change', 'select']);

const storageCtrl = computed(() =>
  getScopedStorageController(props.storageKey, props.storageMode)
);

const initialIdx = (() => {
  if (storageCtrl.value.enabled) {
    const saved = storageCtrl.value.load('index', null);
    if (Number.isFinite(Number(saved))) {
      return clampCoverFlowIndex(Number(saved), props.items.length || 1);
    }
  }
  return clampCoverFlowIndex(props.modelValue, props.items.length || 1);
})();

const rootRef = ref(null);
const containerWidth = ref(0);
const internalIndex = ref(initialIdx);
const kineticPosition = ref(initialIdx);
const isKineticMoving = ref(false);
const dragDeltaCards = ref(0);
const isDragging = ref(false);
const measuredActiveScrollHeight = ref(0);
let pointerDownActive = false;
let hasDraggedBeyondThreshold = false;
let dragStartCoord = 0;
let activePointerId = null;
let lastWheelTs = 0;
let containerResizeObserver = null;

function updateContainerWidth() {
  if (!rootRef.value) return;
  const w = Number(rootRef.value.clientWidth) || 0;
  if (w > 0 && w !== containerWidth.value) {
    containerWidth.value = w;
  }
}

const effectiveCardWidth = computed(() => {
  const baseW = Number(props.cardWidth) || 340;
  if (containerWidth.value > 0 && containerWidth.value < baseW + 20) {
    return Math.max(250, containerWidth.value - 20);
  }
  return baseW;
});

function measureActiveCardHeight() {
  if (!rootRef.value || typeof rootRef.value.querySelector !== 'function') return;
  const allItems =
    typeof rootRef.value.querySelectorAll === 'function'
      ? rootRef.value.querySelectorAll('.nano-cf-item')
      : [];
  const activeItem =
    allItems[internalIndex.value] || rootRef.value.querySelector('.nano-cf-item.is-active');
  const activeSurface =
    activeItem?.querySelector?.('.nano-cf-card-surface') ||
    rootRef.value.querySelector('.nano-cf-item.is-active .nano-cf-card-surface');
  if (!activeSurface) return;
  const firstChild = activeSurface.firstElementChild;

  // Reset active card scale to 1.0 first so we measure its true unscaled natural height
  if (props.autoFitContent) {
    fitCardContentToHeight(activeSurface, {
      targetHeight: 9999,
      minScale: 1,
      maxScale: 1,
    });
  }

  const prevItemH = activeItem && activeItem.style ? activeItem.style.height : '';
  const prevSurfaceH = activeSurface.style ? activeSurface.style.height : '';
  const prevChildH = firstChild && firstChild.style ? firstChild.style.height : '';
  const prevChildMinH = firstChild && firstChild.style ? firstChild.style.minHeight : '';

  if (activeItem && activeItem.style) activeItem.style.height = 'auto';
  if (activeSurface.style) activeSurface.style.height = 'auto';
  if (firstChild && firstChild.style) {
    firstChild.style.height = 'auto';
    firstChild.style.minHeight = '0px';
  }

  const naturalH = Math.max(
    activeSurface.scrollHeight || 0,
    firstChild ? firstChild.scrollHeight || 0 : 0
  );

  if (firstChild && firstChild.style) {
    firstChild.style.height = prevChildH;
    firstChild.style.minHeight = prevChildMinH;
  }
  if (activeSurface.style) activeSurface.style.height = prevSurfaceH;
  if (activeItem && activeItem.style) activeItem.style.height = prevItemH;

  measuredActiveScrollHeight.value = naturalH;

  if (props.autoFitContent && typeof rootRef.value.querySelectorAll === 'function') {
    const allItems = rootRef.value.querySelectorAll('.nano-cf-item');
    const activeTargetH = props.autoExpandActive
      ? Math.max(props.cardHeight, expansionState.value.activeCardHeight)
      : props.cardHeight;
    for (const itemEl of allItems) {
      const surfaceEl = itemEl.querySelector?.('.nano-cf-card-surface');
      if (!surfaceEl) continue;
      const isAct = itemEl.classList?.contains('is-active');
      fitCardContentToHeight(surfaceEl, {
        targetHeight: isAct ? activeTargetH : props.cardHeight,
      });
    }
  }
}

const expansionState = computed(() => {
  if (!props.autoExpandActive) {
    return {
      activeCardHeight: props.cardHeight,
      effectiveStageHeight: props.stageHeight,
      isExpanded: false,
      needsInnerScroll: measuredActiveScrollHeight.value > props.cardHeight + 2,
    };
  }
  return computeAdaptiveCardExpansion({
    rootEl: rootRef.value,
    baseCardHeight: props.cardHeight,
    baseStageHeight: props.stageHeight,
    contentScrollHeight: measuredActiveScrollHeight.value,
  });
});

function getItemCardHeight(entry) {
  if (props.autoExpandActive && entry.state.isActive) {
    return expansionState.value.activeCardHeight;
  }
  return props.cardHeight;
}

const hasRaf = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function';

const kineticCtrl = createKineticTransition({
  initialValue: initialIdx,
  duration: props.animationDuration,
  timingMode: 'fixed',
  modular: false,
  onUpdate: ({ value, isMoving }) => {
    kineticPosition.value = value;
    isKineticMoving.value = isMoving;
  },
  onSettled: ({ value }) => {
    kineticPosition.value = value;
    isKineticMoving.value = false;
    nextTick(() => {
      measureActiveCardHeight();
    });
  },
});

watch(
  () => props.animationDuration,
  (dur) => {
    kineticCtrl.setConfig({ duration: Math.max(80, Number(dur) || 260) });
  }
);

function driveToIndex(targetIdx, immediate = false) {
  if (!props.animated || immediate || !hasRaf) {
    kineticCtrl.setTarget(targetIdx, { immediate: true });
    kineticPosition.value = targetIdx;
    isKineticMoving.value = false;
  } else {
    kineticCtrl.setTarget(targetIdx, { immediate: false });
  }
}

watch(
  () => props.modelValue,
  (val) => {
    const clamped = clampCoverFlowIndex(val, props.items.length);
    if (clamped !== internalIndex.value) {
      internalIndex.value = clamped;
      driveToIndex(clamped);
    }
  }
);

watch(
  () => props.items.length,
  (len) => {
    const clamped = clampCoverFlowIndex(internalIndex.value, len);
    if (clamped !== internalIndex.value) {
      setActiveIndex(clamped);
    }
  }
);

function onKeydown(e) {
  if (!props.keyboardNavigation) return;
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
  const target = e.target;
  if (target && typeof target === 'object') {
    const tag = String(target.tagName || '').toUpperCase();
    if (tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
    if (tag === 'INPUT') {
      const type = String(target.type || 'text').toLowerCase();
      if (type !== 'checkbox' && type !== 'radio' && type !== 'button') return;
    }
  }
  if (rootRef.value && typeof rootRef.value.getBoundingClientRect === 'function') {
    const rect = rootRef.value.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    if (typeof window !== 'undefined' && (rect.bottom < 0 || rect.top > window.innerHeight)) return;
  }

  if (props.orientation === 'vertical') {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      goPrev();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      goNext();
    }
  } else {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goNext();
    }
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeydown);
    window.addEventListener('resize', updateContainerWidth, { passive: true });
  }
  updateContainerWidth();
  if (typeof ResizeObserver !== 'undefined' && rootRef.value) {
    containerResizeObserver = new ResizeObserver(() => {
      updateContainerWidth();
      measureActiveCardHeight();
    });
    containerResizeObserver.observe(rootRef.value);
  }
  nextTick(() => {
    updateContainerWidth();
    measureActiveCardHeight();
  });
});

watch(
  [
    internalIndex,
    () => props.items.length,
    () => props.autoExpandActive,
    () => props.cardHeight,
    effectiveCardWidth,
  ],
  () => {
    nextTick(() => {
      measureActiveCardHeight();
    });
  }
);

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('resize', updateContainerWidth);
  }
  if (containerResizeObserver) {
    containerResizeObserver.disconnect();
    containerResizeObserver = null;
  }
  kineticCtrl.destroy();
});

const effectiveActiveFloat = computed(() => {
  const base = isDragging.value
    ? internalIndex.value + dragDeltaCards.value
    : props.animated && hasRaf
      ? kineticPosition.value
      : internalIndex.value;
  const maxIdx = Math.max(0, props.items.length - 1);
  return Math.max(-0.35, Math.min(maxIdx + 0.35, base));
});

const decoratedItems = computed(() => {
  return (props.items || []).map((item, idx) => {
    const state = computeCoverFlowItemTransform(idx, effectiveActiveFloat.value, {
      orientation: props.orientation,
      sideAngleDeg: props.sideAngle,
      centerGapPx: props.centerGap,
      stackSpacingPx: props.stackSpacing,
      depthOffsetPx: props.depthOffset,
      stackDepthStepPx: props.stackDepthStep,
      fadeMode: props.fadeMode,
    });
    return {
      raw: item,
      id: item?.id ?? `cf-item-${idx}`,
      index: idx,
      state,
    };
  });
});

function setActiveIndex(nextIdx, { immediate = false } = {}) {
  const clamped = clampCoverFlowIndex(nextIdx, props.items.length);
  internalIndex.value = clamped;
  driveToIndex(clamped, immediate);
  if (storageCtrl.value.enabled) {
    storageCtrl.value.save('index', clamped);
  }
  emit('update:modelValue', clamped);
  emit('change', {
    index: clamped,
    item: props.items[clamped] || null,
  });
}

function goPrev() {
  const next = stepCoverFlowIndex(internalIndex.value, -1, props.items.length, props.loop);
  setActiveIndex(next);
}

function goNext() {
  const next = stepCoverFlowIndex(internalIndex.value, 1, props.items.length, props.loop);
  setActiveIndex(next);
}

function handleCardClick(idx, item) {
  if (hasDraggedBeyondThreshold || Math.abs(dragDeltaCards.value) > 0.08) return;
  setActiveIndex(idx);
  emit('select', { index: idx, item });
}

function onPointerDown(e) {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  if (e.target.closest('.nano-cf-control-btn') || e.target.closest('.nano-cf-dot')) return;
  pointerDownActive = true;
  hasDraggedBeyondThreshold = false;
  activePointerId = e.pointerId;
  dragStartCoord = props.orientation === 'vertical' ? e.clientY : e.clientX;
  dragDeltaCards.value = 0;
}

function onPointerMove(e) {
  if (!pointerDownActive || e.pointerId !== activePointerId) return;
  const currentCoord = props.orientation === 'vertical' ? e.clientY : e.clientX;
  const deltaPx = currentCoord - dragStartCoord;
  if (!hasDraggedBeyondThreshold) {
    if (Math.abs(deltaPx) < 6) return;
    hasDraggedBeyondThreshold = true;
    isDragging.value = true;
    // Sync internalIndex to current kinetic position if dragged mid-animation
    if (isKineticMoving.value) {
      internalIndex.value = clampCoverFlowIndex(Math.round(kineticPosition.value), props.items.length);
      kineticCtrl.stop();
      isKineticMoving.value = false;
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  const sensitivityPx = props.orientation === 'vertical' ? 140 : 160;
  dragDeltaCards.value = -deltaPx / sensitivityPx;
}

function onPointerUp(e) {
  if (!pointerDownActive || e.pointerId !== activePointerId) return;
  pointerDownActive = false;
  activePointerId = null;
  if (!isDragging.value) {
    dragDeltaCards.value = 0;
    return;
  }
  const finalFloat = internalIndex.value + dragDeltaCards.value;
  isDragging.value = false;
  const delta = dragDeltaCards.value;
  dragDeltaCards.value = 0;
  // Hand off drag position to kinetic controller so it settles smoothly from dragged offset
  kineticCtrl.setTarget(finalFloat, { immediate: true });
  kineticPosition.value = finalFloat;
  if (Math.abs(delta) > 0.16) {
    setActiveIndex(Math.round(finalFloat));
  } else {
    driveToIndex(internalIndex.value);
  }
}

function onWheel(e) {
  if (!props.wheelNavigation) return;

  // In horizontal mode, if the active card's inner content overflows vertically and the user
  // scrolls vertically, scroll the active card's content first before switching cards.
  if (
    props.innerContentScroll &&
    props.orientation === 'horizontal' &&
    Math.abs(e.deltaY) > Math.abs(e.deltaX) &&
    !e.shiftKey &&
    rootRef.value &&
    typeof rootRef.value.querySelector === 'function'
  ) {
    const activeSurface = rootRef.value.querySelector('.nano-cf-item.is-active .nano-cf-card-surface');
    if (activeSurface && activeSurface.scrollHeight > activeSurface.clientHeight + 2) {
      const canScrollDown =
        e.deltaY > 0 &&
        activeSurface.scrollTop + activeSurface.clientHeight < activeSurface.scrollHeight - 2;
      const canScrollUp = e.deltaY < 0 && activeSurface.scrollTop > 1;
      if (canScrollDown || canScrollUp) {
        e.preventDefault();
        e.stopPropagation();
        activeSurface.scrollTop += e.deltaY;
        return;
      }
    }
  }

  if (props.wheelPreventScroll) {
    e.preventDefault();
    e.stopPropagation();
  }
  const primaryDelta =
    Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  if (Math.abs(primaryDelta) < 8) return;
  if (!props.wheelPreventScroll) {
    e.preventDefault();
  }
  const now = Date.now();
  if (now - lastWheelTs < 120) return;
  lastWheelTs = now;
  if (primaryDelta > 0) {
    goNext();
  } else {
    goPrev();
  }
}

defineExpose({
  goPrev,
  goNext,
  setActiveIndex,
  measureActiveCardHeight,
});
</script>

<template>
  <div
    ref="rootRef"
    class="nano-coverflow"
    :class="[
      `is-${orientation}`,
      `is-fade-${fadeMode}`,
      {
        'is-dragging': isDragging,
        'is-kinetic-moving': isKineticMoving,
        'is-static': !animated,
        'has-reflection': reflection,
      }
    ]"
    tabindex="0"
    role="region"
    aria-roledescription="3D CoverFlow Carousel"
    @keydown="onKeydown"
  >
    <div
      class="nano-cf-viewport"
      :style="{ height: `${expansionState.effectiveStageHeight}px` }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel="onWheel"
    >
      <div class="nano-cf-stage">
        <div
          v-for="entry in decoratedItems"
          :key="entry.id"
          class="nano-cf-item"
          :class="{
            'is-active': entry.state.isActive,
            'is-left': entry.state.isLeftOrTop,
            'is-right': entry.state.isRightOrBottom,
          }"
          :style="{
            width: `${effectiveCardWidth}px`,
            height: `${getItemCardHeight(entry)}px`,
            marginLeft: `${-effectiveCardWidth / 2}px`,
            marginTop: `${-getItemCardHeight(entry) / 2}px`,
            transform: entry.state.transform,
            zIndex: entry.state.zIndex,
            opacity: entry.state.opacity,
            pointerEvents: entry.state.pointerEvents,
          }"
          @click="handleCardClick(entry.index, entry.raw)"
        >
          <div
            class="nano-cf-card-surface"
            :class="{
              'is-scrollable':
                innerContentScroll &&
                !autoFitContent &&
                expansionState.needsInnerScroll &&
                entry.state.isActive &&
                orientation === 'horizontal',
            }"
          >
            <slot
              name="item"
              :item="entry.raw"
              :index="entry.index"
              :is-active="entry.state.isActive"
              :state="entry.state"
            >
              <!-- Default Card / Image Presentation -->
              <div class="nano-cf-default-card">
                <div
                  v-if="entry.raw?.image"
                  class="nano-cf-media"
                  :style="{ backgroundImage: `url(${entry.raw.image})` }"
                >
                  <span v-if="entry.raw?.badge" class="nano-cf-badge">
                    {{ entry.raw.badge }}
                  </span>
                </div>
                <div class="nano-cf-body">
                  <div v-if="entry.raw?.badge && !entry.raw?.image" class="nano-cf-top-row">
                    <span class="nano-cf-inline-badge">{{ entry.raw.badge }}</span>
                    <span class="nano-cf-index-tag">0{{ entry.index + 1 }}</span>
                  </div>
                  <h4 v-if="entry.raw?.title" class="nano-cf-title">
                    {{ entry.raw.title }}
                  </h4>
                  <p v-if="entry.raw?.subtitle || entry.raw?.description" class="nano-cf-desc">
                    {{ entry.raw.description || entry.raw.subtitle }}
                  </p>
                </div>
              </div>
            </slot>

            <!-- Side-curtain shading overlay for 3D depth (active in 'color' fadeMode) -->
            <div
              v-if="fadeMode !== 'opacity'"
              class="nano-cf-shade"
              :style="{
                opacity: Math.min(0.62, entry.state.absOffset * 0.2),
              }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom HUD Controls & Shelf Indicators -->
    <div v-if="showControls || showIndicators" class="nano-cf-hud">
      <button
        v-if="showControls"
        type="button"
        class="nano-cf-control-btn"
        :disabled="!loop && internalIndex <= 0"
        aria-label="Previous card"
        @click="goPrev"
      >
        <NanoIcon :name="orientation === 'vertical' ? 'chevron-up' : 'chevron-left'" :size="15" />
      </button>

      <div v-if="showIndicators" class="nano-cf-dots" role="tablist">
        <button
          v-for="(entry, idx) in decoratedItems"
          :key="entry.id"
          type="button"
          role="tab"
          class="nano-cf-dot"
          :class="{ 'is-active': idx === internalIndex }"
          :aria-selected="idx === internalIndex"
          :aria-label="entry.raw?.title || `Slide ${idx + 1}`"
          @click="setActiveIndex(idx)"
        />
      </div>

      <button
        v-if="showControls"
        type="button"
        class="nano-cf-control-btn"
        :disabled="!loop && internalIndex >= items.length - 1"
        aria-label="Next card"
        @click="goNext"
      >
        <NanoIcon :name="orientation === 'vertical' ? 'chevron-down' : 'chevron-right'" :size="15" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.nano-coverflow {
  position: relative;
  width: 100%;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
}

.nano-cf-viewport {
  position: relative;
  width: 100%;
  overflow: hidden;
  overscroll-behavior: contain;
  perspective: 1150px;
  cursor: grab;
  touch-action: pan-y;
  border-radius: 14px;
  transition: height 0.24s cubic-bezier(0.22, 1, 0.36, 1);
  background: radial-gradient(
    ellipse at 50% 55%,
    rgba(56, 189, 248, 0.08),
    transparent 68%
  );
}

[data-theme="light"] .nano-cf-viewport,
.light .nano-cf-viewport,
.theme-light .nano-cf-viewport {
  background: transparent;
}

.nano-coverflow.is-fade-opacity.is-horizontal .nano-cf-viewport {
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 7%, #000 93%, transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0%, #000 7%, #000 93%, transparent 100%);
}

.nano-coverflow.is-fade-opacity.is-vertical .nano-cf-viewport {
  -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 8%, #000 92%, transparent 100%);
  mask-image: linear-gradient(180deg, transparent 0%, #000 8%, #000 92%, transparent 100%);
}

.nano-coverflow.is-vertical .nano-cf-viewport {
  touch-action: none;
}

.nano-coverflow.is-dragging .nano-cf-viewport {
  cursor: grabbing;
}

.nano-cf-stage {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}

.nano-cf-item {
  position: absolute;
  left: 50%;
  top: 50%;
  transform-style: preserve-3d;
  transition:
    transform 0.44s cubic-bezier(0.22, 1, 0.36, 1),
    height 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    margin-top 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.36s ease;
  cursor: pointer;
  will-change: transform, opacity;
}

.nano-coverflow.is-dragging .nano-cf-item,
.nano-coverflow.is-kinetic-moving .nano-cf-item,
.nano-coverflow.is-static .nano-cf-item {
  transition:
    height 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    margin-top 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.nano-cf-card-surface {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 14px;
  overflow: hidden;
  background: var(
    --nano-coverflow-card-bg,
    color-mix(in srgb, var(--nano-bg-sidebar, #18181b) 95%, var(--nano-text-main, #f8fafc) 5%)
  );
  border: 1px solid var(--nano-border-card, rgba(148, 163, 184, 0.24));
  box-shadow: var(--nano-shadow-card, 0 8px 20px -6px rgba(0, 0, 0, 0.38));
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

[data-theme="light"] .nano-cf-card-surface,
.light .nano-cf-card-surface,
.theme-light .nano-cf-card-surface {
  background: var(--nano-coverflow-card-bg, #ffffff);
  border-color: var(--nano-border-card, rgba(15, 23, 42, 0.12));
  box-shadow: var(
    --nano-shadow-card,
    0 6px 16px -6px rgba(15, 23, 42, 0.06),
    0 2px 6px -2px rgba(15, 23, 42, 0.03)
  );
}

.nano-cf-card-surface.is-scrollable {
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
}

.nano-cf-item.is-active .nano-cf-card-surface {
  background: var(
    --nano-coverflow-active-card-bg,
    color-mix(in srgb, var(--nano-bg-sidebar, #18181b) 94%, var(--nano-primary, #38bdf8) 6%)
  );
  border-color: var(--nano-primary, #38bdf8);
  box-shadow:
    0 10px 24px -6px rgba(0, 0, 0, 0.44),
    0 0 0 1px rgba(56, 189, 248, 0.35);
}

[data-theme="light"] .nano-cf-item.is-active .nano-cf-card-surface,
.light .nano-cf-item.is-active .nano-cf-card-surface,
.theme-light .nano-cf-item.is-active .nano-cf-card-surface {
  background: var(--nano-coverflow-active-card-bg, #ffffff);
  border-color: var(--nano-primary, #0284c7);
  box-shadow:
    0 8px 20px -6px rgba(2, 132, 199, 0.12),
    0 3px 8px -3px rgba(15, 23, 42, 0.05),
    0 0 0 1px rgba(2, 132, 199, 0.28);
}

.nano-cf-default-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.nano-cf-media {
  position: relative;
  height: 54%;
  background-size: cover;
  background-position: center;
  border-bottom: 1px solid var(--nano-border, rgba(148, 163, 184, 0.16));
}

.nano-cf-badge {
  position: absolute;
  top: 0.65rem;
  left: 0.65rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: rgba(9, 13, 22, 0.78);
  color: #38bdf8;
  font-size: 0.7rem;
  font-weight: 700;
}

.nano-cf-body {
  flex: 1;
  padding: 1rem 1.15rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.nano-cf-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
}

.nano-cf-inline-badge {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--nano-primary, #38bdf8);
  font-family: var(--nano-font-mono, monospace);
}

.nano-cf-index-tag {
  font-size: 0.72rem;
  font-weight: 800;
  opacity: 0.6;
  font-family: var(--nano-font-mono, monospace);
}

.nano-cf-title {
  margin: 0 0 0.4rem;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--nano-text-main, #f8fafc);
}

.nano-cf-desc {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--nano-text-muted, #94a3b8);
}

.nano-cf-shade {
  position: absolute;
  inset: 0;
  background: var(
    --nano-coverflow-shade-bg,
    color-mix(in srgb, var(--nano-bg-main, #09090b) 65%, transparent)
  );
  pointer-events: none;
  transition: opacity 0.25s ease;
}

[data-theme="light"] .nano-cf-shade,
.light .nano-cf-shade,
.theme-light .nano-cf-shade {
  background: var(
    --nano-coverflow-shade-bg,
    color-mix(in srgb, var(--nano-bg-main, #f8fafc) 84%, #e2e8f0 16%)
  );
}

.nano-cf-hud {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.85rem;
  margin-top: 0.75rem;
  padding-bottom: 0.35rem;
}

.nano-cf-control-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--nano-border-subtle, rgba(148, 163, 184, 0.28));
  background: var(--nano-bg-card, #ffffff);
  color: var(--nano-text-main, #0f172a);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
}

.nano-cf-control-btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.nano-cf-control-btn:not(:disabled):hover {
  border-color: var(--nano-primary, #0284c7);
  background: var(--nano-bg-hover, rgba(56, 189, 248, 0.08));
  color: var(--nano-primary, #0284c7);
}

.nano-cf-dots {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.nano-cf-dot {
  width: 8px;
  height: 8px;
  padding: 0;
  border-radius: 999px;
  border: none;
  background: color-mix(in srgb, var(--nano-text-muted, #64748b) 42%, transparent);
  cursor: pointer;
  transition: width 0.2s ease, background 0.2s ease;
}

.nano-cf-dot.is-active {
  width: 22px;
  background: var(--nano-primary, #38bdf8);
}
</style>
