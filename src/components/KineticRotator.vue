<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

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
   * Dimension of the rotator container in px or css string.
   */
  size: {
    type: [Number, String],
    default: 260
  }
});

const emit = defineEmits([
  'update:modelValue',
  'change',
  'settled',
  'frame'
]);

// Cubic Hermite polynomial matching boundary conditions:
// P(0) = 0, P'(0) = v0, P(1) = 1, P'(1) = 0
const cubicEaseWithInitialVelocity = (t, v0) => {
  return (v0 - 2) * t * t * t + (3 - 2 * v0) * t * t + v0 * t;
};

// Derivative of the Hermite cubic polynomial for instantaneous velocity
const cubicEaseWithInitialVelocityDerivative = (t, v0) => {
  return 3 * (v0 - 2) * t * t + 2 * (3 - 2 * v0) * t + v0;
};

// Standard cubic ease-in-out for fresh starts from rest (v0 = 0)
const easeInOutCubic = (t) => {
  if (t < 0.5) return 4 * t * t * t;
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const easeInOutCubicDerivative = (t) => {
  if (t < 0.5) return 12 * t * t;
  return 3 * Math.pow(-2 * t + 2, 2);
};

// Modulo helper keeping degrees within [0, 360)
const normalizeAngle = (deg) => {
  return ((deg % 360) + 360) % 360;
};

// Shortest difference from fromDeg to toOrientationDeg in range [-180, 180)
const shortestAngleDiff = (fromDeg, toOrientationDeg) => {
  const fromNorm = normalizeAngle(fromDeg);
  const toNorm = normalizeAngle(toOrientationDeg);
  let diff = toNorm - fromNorm;
  return ((diff + 180) % 360 + 360) % 360 - 180;
};

// Kinematic State
const currentAngle = ref(props.modelValue);
const targetAngle = ref(props.modelValue);
const velocity = ref(0); // in degrees per second
const isMoving = ref(false);
const progress = ref(1);
const initialVelocityParam = ref(0);

// Animation record
let animRecord = null;
let rafId = null;

// Container dimension styling
const containerStyle = computed(() => {
  const s = typeof props.size === 'number' ? `${props.size}px` : props.size;
  return {
    width: s,
    height: s
  };
});

// Calculate current angular position and velocity at given timestamp
const sampleKinematics = (now) => {
  if (!animRecord) {
    return { angle: currentAngle.value, vel: 0, p: 1 };
  }

  const elapsed = now - animRecord.startTime;
  const p = Math.max(0, Math.min(1, elapsed / animRecord.duration));

  const ease = animRecord.v0 !== undefined
    ? cubicEaseWithInitialVelocity(p, animRecord.v0)
    : easeInOutCubic(p);

  const angle = animRecord.startAngle + (animRecord.targetAngle - animRecord.startAngle) * ease;

  const dEaseDp = animRecord.v0 !== undefined
    ? cubicEaseWithInitialVelocityDerivative(p, animRecord.v0)
    : easeInOutCubicDerivative(p);

  const totalDelta = animRecord.targetAngle - animRecord.startAngle;
  // Velocity in degrees per millisecond * 1000 = deg/sec
  const vel = ((totalDelta * dEaseDp) / animRecord.duration) * 1000;

  return { angle, vel, p };
};

// Core animation loop
const tick = (now) => {
  if (!animRecord) {
    isMoving.value = false;
    velocity.value = 0;
    progress.value = 1;
    return;
  }

  const { angle, vel, p } = sampleKinematics(now);
  currentAngle.value = angle;
  velocity.value = vel;
  progress.value = p;

  emit('frame', {
    currentAngle: angle,
    targetAngle: animRecord.targetAngle,
    velocity: vel,
    progress: p,
    isMoving: true,
    v0: animRecord.v0 || 0,
    timestamp: now
  });

  if (p < 1) {
    rafId = requestAnimationFrame(tick);
  } else {
    // Settled at target
    currentAngle.value = animRecord.targetAngle;
    velocity.value = 0;
    progress.value = 1;
    isMoving.value = false;
    const settledAngle = animRecord.targetAngle;
    animRecord = null;

    emit('update:modelValue', settledAngle);
    emit('settled', {
      angle: settledAngle,
      normalizedAngle: normalizeAngle(settledAngle)
    });

    emit('frame', {
      currentAngle: settledAngle,
      targetAngle: settledAngle,
      velocity: 0,
      progress: 1,
      isMoving: false,
      v0: 0,
      timestamp: now
    });
  }
};

/**
 * Start or chain a rotation to target orientation.
 * If called mid-flight, preserves instantaneous velocity v0 for seamless C1 continuity.
 */
const startKineticTransition = (newTarget, { isRelative = false, delta = 0 } = {}) => {
  const now = performance.now();
  let currentPos = currentAngle.value;
  let currentVel = velocity.value; // deg/sec

  if (animRecord && isMoving.value) {
    const sampled = sampleKinematics(now);
    currentPos = sampled.angle;
    currentVel = sampled.vel;
  }

  let finalTarget = newTarget;

  if (props.shortestPath) {
    // Modular shortest-path optimization
    let desiredOrientation = 0;
    if (isRelative) {
      // Delta is added to previous intended target
      const prevIntended = targetAngle.value;
      desiredOrientation = normalizeAngle(prevIntended + delta);
    } else {
      desiredOrientation = normalizeAngle(newTarget);
    }

    const shortestDiff = shortestAngleDiff(currentPos, desiredOrientation);
    finalTarget = currentPos + shortestDiff;
  }

  targetAngle.value = finalTarget;
  emit('change', finalTarget);

  const deltaAngle = finalTarget - currentPos;

  // If already at target within epsilon, snap immediately
  if (Math.abs(deltaAngle) < 0.05) {
    currentAngle.value = finalTarget;
    velocity.value = 0;
    progress.value = 1;
    isMoving.value = false;
    animRecord = null;
    emit('update:modelValue', finalTarget);
    return;
  }

  // Base duration scaled by step proportion and speed multiplier
  const effectiveSpeedMultiplier = Math.max(0.01, props.speedMultiplier);
  const baseDuration = (props.duration / effectiveSpeedMultiplier) * Math.max(0.2, Math.abs(deltaAngle) / props.step);

  // Calculate normalized initial velocity v0
  // v0 = (instantaneous velocity in deg/ms * duration in ms) / total delta
  let v0 = 0;
  if (Math.abs(deltaAngle) > 0.01 && Math.abs(currentVel) > 0.1) {
    const velPerMs = currentVel / 1000;
    v0 = (velPerMs * baseDuration) / deltaAngle;
    // Clamp to prevent extreme polynomial overshoots while preserving momentum
    v0 = Math.max(-2.5, Math.min(2.5, v0));
  }

  initialVelocityParam.value = v0;
  isMoving.value = true;

  animRecord = {
    startAngle: currentPos,
    targetAngle: finalTarget,
    startTime: now,
    duration: baseDuration,
    v0: v0
  };

  if (rafId) {
    cancelAnimationFrame(rafId);
  }
  rafId = requestAnimationFrame(tick);
};

// Public API
const rotateBy = (deltaDegrees) => {
  startKineticTransition(targetAngle.value + deltaDegrees, {
    isRelative: true,
    delta: deltaDegrees
  });
};

const setAngle = (newAngle) => {
  startKineticTransition(newAngle, { isRelative: false });
};

const reset = () => {
  if (rafId) cancelAnimationFrame(rafId);
  animRecord = null;
  currentAngle.value = 0;
  targetAngle.value = 0;
  velocity.value = 0;
  progress.value = 1;
  isMoving.value = false;
  initialVelocityParam.value = 0;
  emit('update:modelValue', 0);
  emit('settled', { angle: 0, normalizedAngle: 0 });
};

// Watch modelValue updates from parent
watch(() => props.modelValue, (newVal) => {
  if (Math.abs(newVal - targetAngle.value) > 0.01) {
    setAngle(newVal);
  }
});

onMounted(() => {
  currentAngle.value = props.modelValue;
  targetAngle.value = props.modelValue;
});

onUnmounted(() => {
  if (rafId) {
    cancelAnimationFrame(rafId);
  }
});

defineExpose({
  currentAngle,
  targetAngle,
  velocity,
  isMoving,
  progress,
  v0: initialVelocityParam,
  rotateBy,
  setAngle,
  reset
});
</script>

<template>
  <div class="nano-kinetic-rotator" :style="containerStyle">
    <div
      class="rotator-tile"
      :style="{
        transform: `rotate(${currentAngle}deg)`
      }"
    >
      <slot
        :current-angle="currentAngle"
        :target-angle="targetAngle"
        :normalized-angle="normalizeAngle(currentAngle)"
        :velocity="velocity"
        :is-moving="isMoving"
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
