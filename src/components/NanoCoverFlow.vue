<script setup>
import { ref, computed, watch } from 'vue';
import NanoIcon from './NanoIcon.vue';
import {
  clampCoverFlowIndex,
  stepCoverFlowIndex,
  computeCoverFlowItemTransform,
} from '../utils/coverflow.js';
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

const internalIndex = ref(initialIdx);
const dragDeltaCards = ref(0);
const isDragging = ref(false);
let dragStartCoord = 0;
let activePointerId = null;
let lastWheelTs = 0;

watch(
  () => props.modelValue,
  (val) => {
    const clamped = clampCoverFlowIndex(val, props.items.length);
    if (clamped !== internalIndex.value) {
      internalIndex.value = clamped;
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

const effectiveActiveFloat = computed(() => {
  const raw = internalIndex.value + dragDeltaCards.value;
  const maxIdx = Math.max(0, props.items.length - 1);
  return Math.max(-0.35, Math.min(maxIdx + 0.35, raw));
});

const decoratedItems = computed(() => {
  return (props.items || []).map((item, idx) => {
    const state = computeCoverFlowItemTransform(idx, effectiveActiveFloat.value, {
      orientation: props.orientation,
      sideAngleDeg: props.sideAngle,
      centerGapPx: props.centerGap,
      stackSpacingPx: props.stackSpacing,
      depthOffsetPx: props.depthOffset,
    });
    return {
      raw: item,
      id: item?.id ?? `cf-item-${idx}`,
      index: idx,
      state,
    };
  });
});

function setActiveIndex(nextIdx) {
  const clamped = clampCoverFlowIndex(nextIdx, props.items.length);
  internalIndex.value = clamped;
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
  if (Math.abs(dragDeltaCards.value) > 0.08) return;
  setActiveIndex(idx);
  emit('select', { index: idx, item });
}

function onPointerDown(e) {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  if (e.target.closest('.nano-cf-control-btn') || e.target.closest('.nano-cf-dot')) return;
  isDragging.value = true;
  activePointerId = e.pointerId;
  dragStartCoord = props.orientation === 'vertical' ? e.clientY : e.clientX;
  dragDeltaCards.value = 0;
  e.currentTarget.setPointerCapture?.(e.pointerId);
}

function onPointerMove(e) {
  if (!isDragging.value || e.pointerId !== activePointerId) return;
  const currentCoord = props.orientation === 'vertical' ? e.clientY : e.clientX;
  const deltaPx = currentCoord - dragStartCoord;
  const sensitivityPx = props.orientation === 'vertical' ? 140 : 160;
  dragDeltaCards.value = -deltaPx / sensitivityPx;
}

function onPointerUp(e) {
  if (!isDragging.value || e.pointerId !== activePointerId) return;
  const finalFloat = internalIndex.value + dragDeltaCards.value;
  isDragging.value = false;
  activePointerId = null;
  if (Math.abs(dragDeltaCards.value) > 0.18) {
    setActiveIndex(Math.round(finalFloat));
  }
  dragDeltaCards.value = 0;
}

function onWheel(e) {
  if (!props.wheelNavigation) return;
  const primaryDelta =
    Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  if (Math.abs(primaryDelta) < 8) return;
  e.preventDefault();
  const now = Date.now();
  if (now - lastWheelTs < 150) return;
  lastWheelTs = now;
  if (primaryDelta > 0) {
    goNext();
  } else {
    goPrev();
  }
}

function onKeydown(e) {
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

defineExpose({
  goPrev,
  goNext,
  setActiveIndex,
});
</script>

<template>
  <div
    class="nano-coverflow"
    :class="[
      `is-${orientation}`,
      { 'is-dragging': isDragging, 'has-reflection': reflection }
    ]"
    tabindex="0"
    role="region"
    aria-roledescription="3D CoverFlow Carousel"
    @keydown="onKeydown"
  >
    <div
      class="nano-cf-viewport"
      :style="{ height: `${stageHeight}px` }"
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
            width: `${cardWidth}px`,
            height: `${cardHeight}px`,
            marginLeft: `${-cardWidth / 2}px`,
            marginTop: `${-cardHeight / 2}px`,
            transform: entry.state.transform,
            zIndex: entry.state.zIndex,
            opacity: entry.state.opacity,
            pointerEvents: entry.state.pointerEvents,
          }"
          @click="handleCardClick(entry.index, entry.raw)"
        >
          <div class="nano-cf-card-surface">
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

            <!-- Side-curtain shading overlay for 3D depth -->
            <div
              class="nano-cf-shade"
              :style="{
                opacity: Math.min(0.55, entry.state.absOffset * 0.22),
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
  perspective: 1150px;
  cursor: grab;
  touch-action: pan-y;
  border-radius: 14px;
  background: radial-gradient(
    ellipse at 50% 55%,
    rgba(56, 189, 248, 0.08),
    transparent 68%
  );
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
    opacity 0.36s ease;
  cursor: pointer;
  will-change: transform, opacity;
}

.nano-coverflow.is-dragging .nano-cf-item {
  transition: none;
}

.nano-cf-card-surface {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 14px;
  overflow: hidden;
  background: var(--nano-bg-surface, rgba(15, 23, 42, 0.92));
  border: 1px solid var(--nano-border, rgba(148, 163, 184, 0.22));
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.42);
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.nano-cf-item.is-active .nano-cf-card-surface {
  border-color: var(--nano-primary, #38bdf8);
  box-shadow:
    0 22px 50px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(56, 189, 248, 0.35);
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
  background: linear-gradient(135deg, rgba(2, 6, 23, 0.75), rgba(2, 6, 23, 0.35));
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.nano-cf-hud {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.85rem;
  margin-top: 0.65rem;
}

.nano-cf-control-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--nano-border, rgba(148, 163, 184, 0.24));
  background: var(--nano-bg-surface, rgba(15, 23, 42, 0.8));
  color: var(--nano-text-main, #f8fafc);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.15s ease, opacity 0.15s ease;
}

.nano-cf-control-btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.nano-cf-control-btn:not(:disabled):hover {
  border-color: var(--nano-primary, #38bdf8);
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
  background: rgba(148, 163, 184, 0.38);
  cursor: pointer;
  transition: width 0.2s ease, background 0.2s ease;
}

.nano-cf-dot.is-active {
  width: 22px;
  background: var(--nano-primary, #38bdf8);
}
</style>
