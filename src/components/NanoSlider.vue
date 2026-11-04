<script setup>
import { ref, computed, watch } from 'vue';
import { clamp, countStepDecimals, quantizeStepValue } from '../utils/math.js';

const props = defineProps({
  modelValue: {
    type: [Number, Array],
    default: 50,
  },
  range: {
    type: Boolean,
    default: false,
  },
  allowCross: {
    type: Boolean,
    default: true,
  },
  min: {
    type: Number,
    default: 0,
  },
  max: {
    type: Number,
    default: 100,
  },
  step: {
    type: Number,
    default: 1,
  },
  showTicks: {
    type: Boolean,
    default: true,
  },
  size: {
    type: String,
    default: 'md', // 'sm' | 'md' | 'lg'
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  ariaLabel: {
    type: String,
    default: 'Slider',
  },
});

const emit = defineEmits(['update:modelValue', 'change']);

const trackRef = ref(null);
const isDragging = ref(false);
const activeThumbIndex = ref(0);
const pendingOverlapResolve = ref(false);

const isRange = computed(() => Boolean(props.range || Array.isArray(props.modelValue)));

const decimals = computed(() => countStepDecimals(props.step || 1));

function quantizeValue(raw) {
  return quantizeStepValue(raw, {
    min: props.min,
    max: props.max,
    step: props.step,
    origin: props.min,
  });
}

function normalizePairFromProp(val) {
  const arr = Array.isArray(val) ? val : [props.min, props.max];
  const rawLow = Number.isFinite(Number(arr[0])) ? Number(arr[0]) : props.min;
  const rawHigh = Number.isFinite(Number(arr[1])) ? Number(arr[1]) : props.max;
  const low = quantizeValue(Math.min(rawLow, rawHigh));
  const high = quantizeValue(Math.max(rawLow, rawHigh));
  return [low, high];
}

// Physical positions of [thumb0, thumb1]; may cross during active pointer drag when allowCross=true
const thumbPair = ref(normalizePairFromProp(props.modelValue));

watch(
  () => [props.modelValue, props.min, props.max, props.step],
  () => {
    if (!isDragging.value && isRange.value) {
      thumbPair.value = normalizePairFromProp(props.modelValue);
    }
  },
  { immediate: true, deep: true }
);

// Sorted [min, max] output tuple
const rangeValues = computed(() => {
  if (!isRange.value) {
    const val = Number.isFinite(Number(props.modelValue)) ? Number(props.modelValue) : props.min;
    const clamped = quantizeValue(val);
    return [props.min, clamped];
  }
  if (isDragging.value) {
    const a = quantizeValue(thumbPair.value[0]);
    const b = quantizeValue(thumbPair.value[1]);
    return [Math.min(a, b), Math.max(a, b)];
  }
  return normalizePairFromProp(props.modelValue);
});

const percentage = computed(() => {
  const span = props.max - props.min;
  if (span <= 0) return 0;
  const current = Number.isFinite(Number(props.modelValue)) ? Number(props.modelValue) : props.min;
  return ((clamp(current, props.min, props.max) - props.min) / span) * 100;
});

const thumb0Percentage = computed(() => {
  const span = props.max - props.min;
  if (span <= 0) return 0;
  const v = isDragging.value ? quantizeValue(thumbPair.value[0]) : rangeValues.value[0];
  return ((v - props.min) / span) * 100;
});

const thumb1Percentage = computed(() => {
  const span = props.max - props.min;
  if (span <= 0) return 100;
  const v = isDragging.value ? quantizeValue(thumbPair.value[1]) : rangeValues.value[1];
  return ((v - props.min) / span) * 100;
});

const minPercentage = computed(() => Math.min(thumb0Percentage.value, thumb1Percentage.value));
const maxPercentage = computed(() => Math.max(thumb0Percentage.value, thumb1Percentage.value));

function rawValueFromClientX(clientX) {
  if (!trackRef.value) return props.min;
  const rect = trackRef.value.getBoundingClientRect();
  if (rect.width <= 0) return props.min;
  const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
  return props.min + ratio * (props.max - props.min);
}

function updateFromClientX(clientX, pickNearestThumb = false) {
  if (props.disabled || !trackRef.value) return;
  const rawValue = rawValueFromClientX(clientX);
  const next = quantizeValue(rawValue);

  if (!isRange.value) {
    emit('update:modelValue', next);
    return;
  }

  if (pickNearestThumb) {
    const [low, high] = normalizePairFromProp(props.modelValue);
    thumbPair.value = [low, high];
    const distLow = Math.abs(rawValue - low);
    const distHigh = Math.abs(rawValue - high);

    if (low === high) {
      // Both thumbs are stacked at the exact same value:
      // if click is already away from the stacked point, resolve immediately;
      // otherwise wait for the first pointermove direction so dragging left or right never deadlocks.
      if (next < low) {
        activeThumbIndex.value = 0;
        pendingOverlapResolve.value = false;
      } else if (next > high) {
        activeThumbIndex.value = 1;
        pendingOverlapResolve.value = false;
      } else {
        activeThumbIndex.value = rawValue < low ? 0 : 1;
        pendingOverlapResolve.value = true;
      }
    } else if (distLow < distHigh) {
      activeThumbIndex.value = 0;
      pendingOverlapResolve.value = false;
    } else if (distHigh < distLow) {
      activeThumbIndex.value = 1;
      pendingOverlapResolve.value = false;
    } else {
      activeThumbIndex.value = rawValue < low ? 0 : 1;
      pendingOverlapResolve.value = false;
    }
  } else if (pendingOverlapResolve.value && thumbPair.value[0] === thumbPair.value[1]) {
    if (next < thumbPair.value[0]) {
      activeThumbIndex.value = 0;
      pendingOverlapResolve.value = false;
    } else if (next > thumbPair.value[1]) {
      activeThumbIndex.value = 1;
      pendingOverlapResolve.value = false;
    } else if (rawValue !== thumbPair.value[0]) {
      activeThumbIndex.value = rawValue < thumbPair.value[0] ? 0 : 1;
    }
  }

  if (props.allowCross) {
    const nextThumbs = [...thumbPair.value];
    nextThumbs[activeThumbIndex.value] = next;
    thumbPair.value = nextThumbs;
  } else {
    const [low, high] = thumbPair.value;
    if (activeThumbIndex.value === 0) {
      thumbPair.value = [Math.min(next, high), high];
    } else {
      thumbPair.value = [low, Math.max(next, low)];
    }
  }

  const sortedLow = Math.min(thumbPair.value[0], thumbPair.value[1]);
  const sortedHigh = Math.max(thumbPair.value[0], thumbPair.value[1]);
  emit('update:modelValue', [sortedLow, sortedHigh]);
}

function onPointerDown(e) {
  if (props.disabled) return;
  isDragging.value = true;
  if (e.currentTarget?.setPointerCapture && e.pointerId !== undefined) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore pointer capture errors in headless/synthetic events
    }
  }
  updateFromClientX(e.clientX, true);
}

function onPointerMove(e) {
  if (!isDragging.value || props.disabled) return;
  updateFromClientX(e.clientX, false);
}

function onPointerUp() {
  if (!isDragging.value) return;
  if (isRange.value) {
    const activeVal = thumbPair.value[activeThumbIndex.value];
    const sortedLow = Math.min(thumbPair.value[0], thumbPair.value[1]);
    const sortedHigh = Math.max(thumbPair.value[0], thumbPair.value[1]);
    thumbPair.value = [sortedLow, sortedHigh];
    activeThumbIndex.value = activeVal === sortedLow && sortedLow !== sortedHigh ? 0 : 1;
    pendingOverlapResolve.value = false;
    isDragging.value = false;
    emit('change', [sortedLow, sortedHigh]);
    return;
  }
  isDragging.value = false;
  emit('change', props.modelValue);
}

function onKeydown(e) {
  if (props.disabled) return;
  const stepVal = props.step > 0 ? props.step : 1;
  const delta = e.shiftKey ? stepVal * 10 : stepVal;

  if (isRange.value) {
    const [low, high] = rangeValues.value;
    const idx = activeThumbIndex.value;
    const cur = idx === 0 ? low : high;
    let nextVal = cur;

    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextVal = quantizeValue(cur + delta);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextVal = quantizeValue(cur - delta);
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextVal = props.min;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextVal = props.max;
    } else {
      return;
    }

    const nextPair =
      idx === 0
        ? [Math.min(nextVal, high), high]
        : [low, Math.max(nextVal, low)];
    emit('update:modelValue', nextPair);
    emit('change', nextPair);
    return;
  }

  const cur = Number.isFinite(Number(props.modelValue)) ? Number(props.modelValue) : props.min;

  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
    e.preventDefault();
    const next = quantizeValue(cur + delta);
    emit('update:modelValue', next);
    emit('change', next);
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
    e.preventDefault();
    const next = quantizeValue(cur - delta);
    emit('update:modelValue', next);
    emit('change', next);
  } else if (e.key === 'Home') {
    e.preventDefault();
    emit('update:modelValue', props.min);
    emit('change', props.min);
  } else if (e.key === 'End') {
    e.preventDefault();
    emit('update:modelValue', props.max);
    emit('change', props.max);
  }
}

function setValue(val) {
  if (props.disabled) return;
  if (Array.isArray(val)) {
    const low = quantizeValue(Math.min(val[0], val[1]));
    const high = quantizeValue(Math.max(val[0], val[1]));
    emit('update:modelValue', [low, high]);
    emit('change', [low, high]);
    return;
  }
  const next = quantizeValue(val);
  emit('update:modelValue', next);
  emit('change', next);
}

function stepBy(steps = 1) {
  const cur = Number.isFinite(Number(props.modelValue)) ? Number(props.modelValue) : props.min;
  const stepVal = props.step > 0 ? props.step : 1;
  setValue(cur + steps * stepVal);
}

defineExpose({
  setValue,
  stepBy,
  quantizeValue,
  percentage,
  minPercentage,
  maxPercentage,
  rangeValues,
  isRange,
  isDragging,
});
</script>

<template>
  <div
    ref="trackRef"
    class="nano-slider"
    :class="[
      `nano-slider--${size}`,
      {
        'is-range': isRange,
        'is-dragging': isDragging,
        'is-disabled': disabled
      }
    ]"
    role="slider"
    :tabindex="disabled ? -1 : 0"
    :aria-label="ariaLabel"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuenow="modelValue"
    :aria-disabled="disabled ? 'true' : undefined"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @keydown="onKeydown"
  >
    <div class="nano-slider-track">
      <!-- Gradient Fill (Single or Dual-Range) -->
      <div
        v-if="!isRange"
        class="nano-slider-fill"
        :style="{ width: `${percentage}%` }"
      ></div>
      <div
        v-else
        class="nano-slider-fill nano-slider-fill--range"
        :style="{
          left: `${minPercentage}%`,
          width: `${Math.max(0, maxPercentage - minPercentage)}%`
        }"
      ></div>

      <!-- Subtle Scale Ticks (25%, 50%, 75%) -->
      <div v-if="showTicks" class="nano-slider-ticks" aria-hidden="true">
        <span class="nano-slider-tick" style="left: 25%"></span>
        <span class="nano-slider-tick" style="left: 50%"></span>
        <span class="nano-slider-tick" style="left: 75%"></span>
      </div>
    </div>

    <!-- Single Thumb Handle -->
    <div
      v-if="!isRange"
      class="nano-slider-thumb"
      :style="{ left: `${percentage}%` }"
    >
      <span class="nano-slider-thumb-core"></span>
    </div>

    <!-- Dual Range Thumb Handles -->
    <template v-else>
      <div
        class="nano-slider-thumb"
        :class="{ 'is-active-thumb': activeThumbIndex === 0 }"
        :style="{ left: `${thumb0Percentage}%` }"
      >
        <span class="nano-slider-thumb-core"></span>
      </div>
      <div
        class="nano-slider-thumb"
        :class="{ 'is-active-thumb': activeThumbIndex === 1 }"
        :style="{ left: `${thumb1Percentage}%` }"
      >
        <span class="nano-slider-thumb-core"></span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.nano-slider {
  --_slider-primary: var(
    --nano-slider-primary,
    var(--dport-accent, var(--nano-state-active, #4cc2e6))
  );
  --_slider-secondary: var(
    --nano-slider-secondary,
    var(--dport-secondary, var(--nano-accent-primary, #2dd4bf))
  );
  --_slider-track-bg: var(
    --nano-slider-track-bg,
    var(--bg-elevated, var(--nano-bg-card-elevated, rgba(15, 23, 42, 0.72)))
  );
  --_slider-border: var(
    --nano-slider-border,
    var(--border-subtle, var(--nano-border-card, rgba(148, 163, 184, 0.3)))
  );
  --_slider-thumb-bg: var(
    --nano-slider-thumb-bg,
    var(--bg-card, var(--nano-bg-card, #0b1322))
  );
  --_slider-glow: var(
    --nano-slider-glow,
    rgba(76, 194, 230, 0.22)
  );

  position: relative;
  width: 100%;
  height: 38px;
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

.nano-slider--sm {
  height: 30px;
}

.nano-slider--lg {
  height: 44px;
}

.nano-slider.is-disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.nano-slider-track {
  position: relative;
  width: 100%;
  height: 14px;
  border-radius: 999px;
  background: var(--_slider-track-bg);
  border: 1px solid var(--_slider-border);
  overflow: hidden;
  transition: border-color 150ms ease;
}

.nano-slider--sm .nano-slider-track {
  height: 11px;
}

.nano-slider--lg .nano-slider-track {
  height: 17px;
}

.nano-slider:hover:not(.is-disabled) .nano-slider-track,
.nano-slider.is-dragging .nano-slider-track,
.nano-slider:focus-visible .nano-slider-track {
  border-color: var(--_slider-primary);
}

.nano-slider-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--_slider-secondary) 0%, var(--_slider-primary) 100%);
}

.nano-slider-fill--range {
  position: absolute;
  top: 0;
  bottom: 0;
}

.nano-slider-ticks {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.nano-slider-tick {
  position: absolute;
  top: 2px;
  bottom: 2px;
  width: 1px;
  background: var(--_slider-border);
  opacity: 0.65;
}

.nano-slider-thumb {
  position: absolute;
  top: 50%;
  width: 24px;
  height: 24px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: var(--_slider-thumb-bg);
  border: 2.5px solid var(--_slider-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  transition: border-color 150ms ease, box-shadow 150ms ease, transform 120ms ease;
}

.nano-slider--sm .nano-slider-thumb {
  width: 20px;
  height: 20px;
}

.nano-slider--lg .nano-slider-thumb {
  width: 28px;
  height: 28px;
}

.nano-slider-thumb.is-active-thumb {
  z-index: 2;
}

.nano-slider.is-dragging .nano-slider-thumb.is-active-thumb,
.nano-slider:not(.is-range).is-dragging .nano-slider-thumb,
.nano-slider:focus-visible .nano-slider-thumb.is-active-thumb,
.nano-slider:not(.is-range):focus-visible .nano-slider-thumb {
  box-shadow: 0 0 0 4px var(--_slider-glow);
  transform: translate(-50%, -50%) scale(1.06);
}

.nano-slider-thumb-core {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--_slider-secondary), var(--_slider-primary));
}

.nano-slider--sm .nano-slider-thumb-core {
  width: 7px;
  height: 7px;
}

.nano-slider--lg .nano-slider-thumb-core {
  width: 11px;
  height: 11px;
}
</style>
