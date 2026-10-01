<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { normalizeAngle } from '../utils/math.js';
import { createKineticTransition } from '../utils/kinetics.js';

const props = defineProps({
  /**
   * Target angle in degrees. Can be controlled via v-model.
   */
  modelValue: {
    type: Number,
    default: 0
  },
  /**
   * Base duration in milliseconds for a 90° rotation.
   */
  duration: {
    type: Number,
    default: 1000
  },
  /**
   * Speed multiplier factor (e.g. 1 = normal, 0.5 = half speed, 0.25 = quarter speed).
   */
  speedMultiplier: {
    type: Number,
    default: 1
  },
  /**
   * Step angle in degrees for relative rotation increments.
   */
  step: {
    type: Number,
    default: 90
  },
  /**
   * When true, targets are reduced modulo 360° along the geodesic shortest angular path.
   * e.g. +450° smoothly decelerates toward +90° without multiple wild spins.
   */
  shortestPath: {
    type: Boolean,
    default: true
  },
  /**
   * Timing mode: 'proportional' scales duration with deltaAngle (v ~ const).
   * 'fixed' duration is always constant T (1 click = now + 1T, isochronous mode T = const).
   */
  timingMode: {
    type: String,
    default: 'proportional',
    validator: (v) => ['proportional', 'fixed'].includes(v)
  },
  /**
   * Momentum threshold in seconds for modular shortest-path reversal avoidance.
   * If > 0, continuing in current velocity direction is preferred over abrupt reversal
   * if the extra distance (360 - 2*|diff|) < |vel| * inertiaThreshold.
   * Set to 0 to disable and strictly pick static shortest geodesic.
   */
  inertiaThreshold: {
    type: Number,
    default: 0.25
  },
  /**
   * Dimension of the rotator container in px or css string.
   */
  size: {
    type: [Number, String],
    default: 260
  },
  /**
   * When true, allows dragging the rotator with mouse/touch to interactively rotate it.
   */
  interactive: {
    type: Boolean,
    default: false
  },
  /**
   * Minimum allowed angle for interactive dragging (null = unbounded).
   */
  min: {
    type: Number,
    default: null
  },
  /**
   * Maximum allowed angle for interactive dragging (null = unbounded).
   */
  max: {
    type: Number,
    default: null
  },
  /**
   * When true, wraps angle within [min, max] during interactive dragging instead of clamping.
   */
  wrap: {
    type: Boolean,
    default: false
  },
  /**
   * Visual angular offset in degrees added to the CSS transform: rotate(...)
   */
  angleOffset: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits([
  'update:modelValue',
  'change',
  'settled',
  'frame',
  'drag-start',
  'drag',
  'drag-end'
]);

// Kinematic State
const currentAngle = ref(props.modelValue);
const targetAngle = ref(props.modelValue);
const velocity = ref(0); // in degrees per second
const acceleration = ref(0); // in degrees per second squared
const isMoving = ref(false);
const progress = ref(1);
const initialVelocityParam = ref(0);

let isFromProp = false;

// Container dimension styling
const containerStyle = computed(() => {
  const s = typeof props.size === 'number' ? `${props.size}px` : props.size;
  return {
    width: s,
    height: s
  };
});

let lastEmittedAngle = null;

const emitFrame = (frame) => {
  // Merge boundary: if angle is identical to last emitted angle, do not emit duplicate sample
  if (
    lastEmittedAngle !== null &&
    Math.abs(frame.currentAngle - lastEmittedAngle) < 1e-4
  ) {
    return;
  }
  lastEmittedAngle = frame.currentAngle;
  emit('frame', frame);
};

// Pure Headless Kinetic Transition Controller
const transition = createKineticTransition({
  initialValue: props.modelValue,
  duration: props.duration,
  speedMultiplier: props.speedMultiplier,
  step: props.step,
  timingMode: props.timingMode,
  modular: props.shortestPath,
  inertiaThreshold: props.inertiaThreshold,
  onUpdate: ({ value, target, velocity: vel, acceleration: acc, progress: p, v0, timestamp }) => {
    currentAngle.value = value;
    targetAngle.value = target;
    velocity.value = vel;
    acceleration.value = acc;
    progress.value = p;
    initialVelocityParam.value = v0 || 0;
    isMoving.value = p < 1;

    emitFrame({
      currentAngle: value,
      targetAngle: target,
      velocity: vel,
      acceleration: acc,
      progress: p,
      isMoving: p < 1,
      v0: v0 || 0,
      timestamp
    });
  },
  onSettled: ({ value, normalizedValue }) => {
    currentAngle.value = value;
    targetAngle.value = value;
    velocity.value = 0;
    acceleration.value = 0;
    progress.value = 1;
    initialVelocityParam.value = 0;
    isMoving.value = false;

    if (!isFromProp) {
      emit('update:modelValue', value);
    }
    isFromProp = false;

    emit('settled', {
      angle: value,
      normalizedAngle: normalizedValue
    });
  }
});

// Public API
const rotateBy = (deltaDegrees) => {
  isFromProp = false;
  transition.setTarget(targetAngle.value + deltaDegrees, {
    isRelative: true,
    delta: deltaDegrees
  });
  targetAngle.value = transition.getTarget();
  emit('change', targetAngle.value);
};

const setAngle = (newAngle, fromProp = false) => {
  isFromProp = fromProp;
  transition.setTarget(newAngle, { isRelative: false });
  targetAngle.value = transition.getTarget();
  emit('change', targetAngle.value);
};

const reset = () => {
  isFromProp = false;
  lastEmittedAngle = null;
  transition.setTarget(0, { immediate: true });
  targetAngle.value = 0;
  currentAngle.value = 0;
  velocity.value = 0;
  acceleration.value = 0;
  progress.value = 1;
  isMoving.value = false;
  initialVelocityParam.value = 0;
  emit('update:modelValue', 0);
  emit('settled', { angle: 0, normalizedAngle: 0 });
};

/**
 * Update duration and kinematics parameters in-flight without spatial jumps.
 */
const updateActiveDuration = () => {
  transition.setConfig({
    duration: props.duration,
    speedMultiplier: props.speedMultiplier,
    timingMode: props.timingMode,
    step: props.step,
    modular: props.shortestPath,
    inertiaThreshold: props.inertiaThreshold,
  });
};

watch(
  [
    () => props.duration,
    () => props.speedMultiplier,
    () => props.timingMode,
    () => props.shortestPath,
    () => props.inertiaThreshold,
    () => props.step
  ],
  updateActiveDuration
);

// Interactive pointer dragging using pure Math.atan2 with additive delta accumulation
const containerRef = ref(null);
const isDragging = ref(false);
let dragPointerId = null;
let prevPointerAngle = null;

// Calculate angle in degrees [-90, 270) where top is -90°, right is 0°, bottom is 90°, left is 180°
const getAngleFromPointer = (clientX, clientY) => {
  const rect = containerRef.value?.getBoundingClientRect();
  if (!rect) return null;

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;

  // Pure Math.atan2
  let deg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);

  // Map to [-90, 270) range
  if (deg < -90) deg += 360;

  return deg;
};

const onPointerDown = (e) => {
  if (!props.interactive) return;
  if (e.button !== 0) return;

  const deg = getAngleFromPointer(e.clientX, e.clientY);
  if (deg === null) return;

  transition.stop();
  isMoving.value = false;

  prevPointerAngle = deg;
  isDragging.value = true;
  dragPointerId = e.pointerId;

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('blur', onPointerUp);

  emit('drag-start', { angle: currentAngle.value });
};

const onPointerMove = (e) => {
  if (!isDragging.value) return;
  if (dragPointerId !== null && e.pointerId !== dragPointerId) return;

  // Safeguard: if mouse button is no longer pressed, release drag
  if (e.pointerType === 'mouse' && e.buttons === 0) {
    onPointerUp(e);
    return;
  }

  const deg = getAngleFromPointer(e.clientX, e.clientY);
  if (deg === null || prevPointerAngle === null) return;

  // Shortest angular difference between consecutive pointer frames
  let delta = deg - prevPointerAngle;
  if (delta > 180) delta -= 360;
  else if (delta < -180) delta += 360;

  prevPointerAngle = deg;

  let nextAngle = currentAngle.value + delta;
  if (props.wrap && props.min !== null && props.max !== null) {
    const range = props.max - props.min;
    if (range > 0) {
      while (nextAngle > props.max) nextAngle -= range;
      while (nextAngle < props.min) nextAngle += range;
    }
  } else {
    if (props.max !== null && nextAngle > props.max) nextAngle = props.max;
    if (props.min !== null && nextAngle < props.min) nextAngle = props.min;
  }

  currentAngle.value = nextAngle;
  targetAngle.value = nextAngle;

  emit('update:modelValue', nextAngle);
  emit('change', nextAngle);
  emit('drag', { angle: nextAngle });
};

const onPointerUp = (e) => {
  if (!isDragging.value) return;
  if (e && dragPointerId !== null && e.pointerId !== undefined && e.pointerId !== dragPointerId) return;

  isDragging.value = false;
  dragPointerId = null;
  prevPointerAngle = null;

  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('pointercancel', onPointerUp);
  window.removeEventListener('blur', onPointerUp);

  transition.setTarget(currentAngle.value, { immediate: true });

  emit('drag-end', { angle: currentAngle.value });
  emit('settled', {
    angle: currentAngle.value,
    normalizedAngle: normalizeAngle(currentAngle.value)
  });
};

// Watch modelValue updates from parent
watch(() => props.modelValue, (newVal) => {
  if (isDragging.value) return;
  if (Math.abs(newVal - targetAngle.value) > 0.01) {
    setAngle(newVal, true);
  }
});

onMounted(() => {
  currentAngle.value = props.modelValue;
  targetAngle.value = props.modelValue;
  transition.setTarget(props.modelValue, { immediate: true });
});

onUnmounted(() => {
  transition.destroy();
  if (typeof window !== 'undefined') {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    window.removeEventListener('blur', onPointerUp);
  }
});

defineExpose({
  currentAngle,
  targetAngle,
  velocity,
  acceleration,
  isMoving,
  isDragging,
  progress,
  v0: initialVelocityParam,
  rotateBy,
  setAngle,
  reset,
  updateActiveDuration
});
</script>

<template>
  <div
    ref="containerRef"
    class="nano-kinetic-rotator"
    :class="{ 'is-interactive': interactive, 'is-dragging': isDragging }"
    :style="containerStyle"
    @pointerdown="onPointerDown"
  >
    <div
      class="rotator-tile"
      :style="{
        transform: `rotate(${currentAngle + angleOffset}deg)`
      }"
    >
      <slot
        :current-angle="currentAngle"
        :target-angle="targetAngle"
        :normalized-angle="normalizeAngle(currentAngle)"
        :velocity="velocity"
        :acceleration="acceleration"
        :is-moving="isMoving"
        :is-dragging="isDragging"
        :progress="progress"
      >
        <!-- Default fallback graphic if slot empty -->
        <div class="rotator-fallback">
          <span class="fallback-icon">⚡</span>
          <span class="fallback-angle">{{ Math.round(normalizeAngle(currentAngle)) }}°</span>
        </div>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.nano-kinetic-rotator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: visible;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

.nano-kinetic-rotator.is-interactive {
  cursor: grab;
}

.nano-kinetic-rotator.is-interactive.is-dragging {
  cursor: grabbing;
}

.rotator-tile {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: center center;
  will-change: transform;
  border-radius: var(--nano-radius-lg, 16px);
  position: relative;
}

.rotator-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--nano-space-xs, 4px);
  background: var(--nano-bg-card, #0f172a);
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.15));
  border-radius: var(--nano-radius-lg, 16px);
  box-shadow: var(--nano-shadow-card, 0 4px 16px rgba(0, 0, 0, 0.3));
}

.fallback-icon {
  font-size: 2.5rem;
}

.fallback-angle {
  font-family: var(--font-mono, monospace);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--nano-state-active, #00f2fe);
}
</style>
