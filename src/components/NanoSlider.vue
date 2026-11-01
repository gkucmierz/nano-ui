<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Number,
    default: 50,
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

const decimals = computed(() => {
  const s = String(props.step || 1);
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
});

function quantizeValue(raw) {
  const stepVal = props.step > 0 ? props.step : 1;
  const stepped = props.min + Math.round((raw - props.min) / stepVal) * stepVal;
  const clamped = Math.max(props.min, Math.min(props.max, stepped));
  return Number(clamped.toFixed(decimals.value));
}

const percentage = computed(() => {
  const span = props.max - props.min;
  if (span <= 0) return 0;
  const current = Number.isFinite(Number(props.modelValue)) ? Number(props.modelValue) : props.min;
  const clamped = Math.max(props.min, Math.min(props.max, current));
  return ((clamped - props.min) / span) * 100;
});

function updateFromClientX(clientX) {
  if (props.disabled || !trackRef.value) return;
  const rect = trackRef.value.getBoundingClientRect();
  if (rect.width <= 0) return;
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const rawValue = props.min + ratio * (props.max - props.min);
  const next = quantizeValue(rawValue);
  emit('update:modelValue', next);
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
  updateFromClientX(e.clientX);
}

function onPointerMove(e) {
  if (!isDragging.value || props.disabled) return;
  updateFromClientX(e.clientX);
}

function onPointerUp() {
  if (!isDragging.value) return;
  isDragging.value = false;
  emit('change', props.modelValue);
}

function onKeydown(e) {
  if (props.disabled) return;
  const cur = Number.isFinite(Number(props.modelValue)) ? Number(props.modelValue) : props.min;
  const stepVal = props.step > 0 ? props.step : 1;
  const delta = e.shiftKey ? stepVal * 10 : stepVal;

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
  isDragging,
});
</script>

<template>
  <div
    ref="trackRef"
    class="nano-slider"
    :class="[
      `nano-slider--${size}`,
      { 'is-dragging': isDragging, 'is-disabled': disabled }
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
      <!-- Gradient Fill -->
      <div class="nano-slider-fill" :style="{ width: `${percentage}%` }"></div>

      <!-- Subtle Scale Ticks (25%, 50%, 75%) -->
      <div v-if="showTicks" class="nano-slider-ticks" aria-hidden="true">
        <span class="nano-slider-tick" style="left: 25%"></span>
        <span class="nano-slider-tick" style="left: 50%"></span>
        <span class="nano-slider-tick" style="left: 75%"></span>
      </div>
    </div>

    <!-- Tactile Dual-Core Thumb Handle -->
    <div class="nano-slider-thumb" :style="{ left: `${percentage}%` }">
      <span class="nano-slider-thumb-core"></span>
    </div>
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

.nano-slider.is-dragging .nano-slider-thumb,
.nano-slider:focus-visible .nano-slider-thumb {
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
