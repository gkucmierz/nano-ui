import { normalizeAngle, shortestAngleDiff } from './math.js';

/**
 * Cubic Hermite polynomial matching boundary conditions:
 * P(0) = 0, P'(0) = v0, P(1) = 1, P'(1) = 0
 *
 * @param {number} t - Progress in [0, 1]
 * @param {number} v0 - Normalized initial velocity derivative at t = 0
 * @returns {number} Value along Hermite trajectory
 */
export const cubicHermite = (t, v0 = 0) => {
  return (v0 - 2) * t * t * t + (3 - 2 * v0) * t * t + v0 * t;
};

/**
 * First derivative of the Hermite cubic polynomial for instantaneous velocity.
 *
 * @param {number} t - Progress in [0, 1]
 * @param {number} v0 - Normalized initial velocity derivative
 * @returns {number} Derivative factor dP/dt
 */
export const cubicHermiteDerivative = (t, v0 = 0) => {
  return 3 * (v0 - 2) * t * t + 2 * (3 - 2 * v0) * t + v0;
};

/**
 * Second derivative of the Hermite cubic polynomial for instantaneous acceleration.
 *
 * @param {number} t - Progress in [0, 1]
 * @param {number} v0 - Normalized initial velocity derivative
 * @returns {number} Second derivative factor d2P/dt2
 */
export const cubicHermiteSecondDerivative = (t, v0 = 0) => {
  return 6 * (v0 - 2) * t + 2 * (3 - 2 * v0);
};

/**
 * Standard cubic ease-in-out curve for starting from rest (v0 = 0).
 *
 * @param {number} t - Progress in [0, 1]
 * @returns {number}
 */
export const easeInOutCubic = (t) => {
  if (t < 0.5) return 4 * t * t * t;
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/**
 * First derivative of standard cubic ease-in-out.
 *
 * @param {number} t - Progress in [0, 1]
 * @returns {number}
 */
export const easeInOutCubicDerivative = (t) => {
  if (t < 0.5) return 12 * t * t;
  return 3 * Math.pow(-2 * t + 2, 2);
};

/**
 * Second derivative of standard cubic ease-in-out.
 *
 * @param {number} t - Progress in [0, 1]
 * @returns {number}
 */
export const easeInOutCubicSecondDerivative = (t) => {
  if (t < 0.5) return 24 * t;
  return 24 * t - 24;
};

/**
 * Samples instantaneous kinematic state (value, velocity, acceleration, progress)
 * at a given timestamp.
 *
 * @param {Object} params
 * @param {number} params.startTime - Epoch timestamp in ms when animation began
 * @param {number} params.duration - Total animation duration in ms (> 0)
 * @param {number} params.startValue - Starting scalar value
 * @param {number} params.targetValue - Target scalar value
 * @param {number} [params.v0] - Normalized initial velocity
 * @param {number} params.now - Current timestamp in ms
 * @returns {{ value: number, velocity: number, acceleration: number, progress: number }}
 */
export const sampleKinematics = ({
  startTime,
  duration,
  startValue,
  targetValue,
  v0 = undefined,
  now,
}) => {
  const safeDuration = Math.max(1, duration);
  const elapsed = now - startTime;
  const p = Math.max(0, Math.min(1, elapsed / safeDuration));

  const hasV0 = v0 !== undefined && v0 !== null;
  const ease = hasV0 ? cubicHermite(p, v0) : easeInOutCubic(p);
  const value = startValue + (targetValue - startValue) * ease;

  const dEaseDp = hasV0 ? cubicHermiteDerivative(p, v0) : easeInOutCubicDerivative(p);
  const totalDelta = targetValue - startValue;
  // Velocity in units per second = (totalDelta * dEaseDp / duration_ms) * 1000
  const velocity = ((totalDelta * dEaseDp) / safeDuration) * 1000;

  const d2EaseDp2 = hasV0 ? cubicHermiteSecondDerivative(p, v0) : easeInOutCubicSecondDerivative(p);
  // Acceleration in units per second^2 = (totalDelta * d2EaseDp2 / duration_ms^2) * 10^6
  const acceleration = ((totalDelta * d2EaseDp2) / (safeDuration * safeDuration)) * 1000000;

  return { value, velocity, acceleration, progress: p };
};

/**
 * Creates a pure JavaScript kinetic transition controller with continuous velocity chaining.
 *
 * Supports:
 * - Fixed duration (T = const) vs Proportional duration (v ~ const)
 * - Modular shortest-path (geodesic mod 360°) vs Non-modular direct tracking
 * - Interruption at any point mid-flight with seamless C1 velocity preservation (v0 parameter)
 *
 * @param {Object} options
 * @param {number} [options.initialValue=0] - Initial scalar value
 * @param {number} [options.duration=350] - Base duration in ms
 * @param {'fixed'|'proportional'} [options.timingMode='fixed'] - Timing strategy
 * @param {boolean} [options.modular=false] - Whether values wrap modulo 360 along geodesic arc
 * @param {number} [options.step=90] - Unit step size when timingMode === 'proportional'
 * @param {number} [options.speedMultiplier=1] - Multiplier factor for animation speed
 * @param {number} [options.inertiaThreshold=0.25] - Momentum allowance in seconds for modular arc reversal
 * @param {Function} [options.onUpdate] - Callback ({ value, velocity, acceleration, progress, isMoving, timestamp })
 * @param {Function} [options.onSettled] - Callback ({ value, normalizedValue })
 * @returns {Object} Kinetic transition controller instance
 */
export const createKineticTransition = (options = {}) => {
  let config = {
    initialValue: 0,
    duration: 350,
    timingMode: 'fixed',
    modular: false,
    step: 90,
    speedMultiplier: 1,
    inertiaThreshold: 0.25,
    onUpdate: null,
    onSettled: null,
    ...options,
  };

  let currentValue = config.initialValue;
  let targetValue = config.initialValue;
  let currentVelocity = 0;
  let currentAcceleration = 0;
  let isMoving = false;
  let animRecord = null;
  let rafId = null;

  const stop = () => {
    if (rafId) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafId);
      } else if (typeof clearTimeout === 'function') {
        clearTimeout(rafId);
      }
      rafId = null;
    }
    isMoving = false;
    currentVelocity = 0;
    currentAcceleration = 0;
    animRecord = null;
  };

  const tick = (now) => {
    if (!animRecord) {
      stop();
      return;
    }

    const sampled = sampleKinematics({
      startTime: animRecord.startTime,
      duration: animRecord.duration,
      startValue: animRecord.startValue,
      targetValue: animRecord.targetValue,
      v0: animRecord.v0,
      now,
    });

    currentValue = sampled.value;
    currentVelocity = sampled.velocity;
    currentAcceleration = sampled.acceleration;

    if (config.onUpdate) {
      config.onUpdate({
        value: currentValue,
        target: animRecord.targetValue,
        velocity: currentVelocity,
        acceleration: currentAcceleration,
        progress: sampled.progress,
        isMoving: true,
        v0: animRecord.v0 || 0,
        timestamp: now,
      });
    }

    if (sampled.progress < 1) {
      if (typeof requestAnimationFrame === 'function') {
        rafId = requestAnimationFrame(tick);
      } else if (typeof setTimeout === 'function') {
        rafId = setTimeout(() => {
          tick(typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
        }, 16);
      }
    } else {
      // Settled at final target
      currentValue = animRecord.targetValue;
      currentVelocity = 0;
      currentAcceleration = 0;
      isMoving = false;
      const settledVal = animRecord.targetValue;
      animRecord = null;
      rafId = null;

      if (config.onUpdate) {
        config.onUpdate({
          value: settledVal,
          target: settledVal,
          velocity: 0,
          acceleration: 0,
          progress: 1,
          isMoving: false,
          v0: 0,
          timestamp: now,
        });
      }

      if (config.onSettled) {
        config.onSettled({
          value: settledVal,
          normalizedValue: config.modular ? normalizeAngle(settledVal) : settledVal,
        });
      }
    }
  };

  const step = (timestamp) => {
    if (!animRecord) return;
    const now = timestamp !== undefined
      ? timestamp
      : (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
    tick(now);
  };

  const setTarget = (newTarget, { immediate = false, isRelative = false, delta = 0 } = {}) => {
    const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();

    let startVal = currentValue;
    let startVel = currentVelocity;

    if (animRecord && isMoving) {
      const sampled = sampleKinematics({
        startTime: animRecord.startTime,
        duration: animRecord.duration,
        startValue: animRecord.startValue,
        targetValue: animRecord.targetValue,
        v0: animRecord.v0,
        now,
      });
      startVal = sampled.value;
      startVel = sampled.velocity;
    }

    let finalTarget = newTarget;

    if (config.modular) {
      let desiredOrientation = 0;
      if (isRelative) {
        const prevTarget = targetValue;
        desiredOrientation = normalizeAngle(prevTarget + delta);
      } else {
        desiredOrientation = normalizeAngle(newTarget);
      }

      let diff = shortestAngleDiff(startVal, desiredOrientation);

      if (config.inertiaThreshold > 0 && Math.abs(startVel) > 20) {
        const isReversal = (startVel > 0 && diff < 0) || (startVel < 0 && diff > 0);
        if (isReversal) {
          const altDiff = diff > 0 ? diff - 360 : diff + 360;
          const extraDistance = 360 - 2 * Math.abs(diff);
          const momentumAllowance = Math.abs(startVel) * config.inertiaThreshold;
          if (extraDistance < momentumAllowance) {
            diff = altDiff;
          }
        }
      }

      finalTarget = startVal + diff;
    }

    targetValue = finalTarget;

    const totalDelta = finalTarget - startVal;

    // If immediate mode requested or delta is negligible, snap instantaneously
    if (immediate || Math.abs(totalDelta) < 0.01) {
      stop();
      currentValue = finalTarget;
      if (config.onUpdate) {
        config.onUpdate({
          value: currentValue,
          target: currentValue,
          velocity: 0,
          acceleration: 0,
          progress: 1,
          isMoving: false,
          v0: 0,
          timestamp: now,
        });
      }
      if (config.onSettled) {
        config.onSettled({
          value: currentValue,
          normalizedValue: config.modular ? normalizeAngle(currentValue) : currentValue,
        });
      }
      return;
    }

    // Determine duration based on timingMode
    const effectiveSpeed = Math.max(0.01, config.speedMultiplier || 1);
    let transitionDuration = config.duration / effectiveSpeed;

    if (config.timingMode === 'proportional') {
      const stepQuantum = Math.max(0.1, config.step || 90);
      transitionDuration = (config.duration / effectiveSpeed) * Math.max(0.2, Math.abs(totalDelta) / stepQuantum);
    }

    // Calculate normalized initial velocity derivative v0:
    // v0 = (velocity in units/ms * duration in ms) / totalDelta
    let v0 = 0;
    if (Math.abs(totalDelta) > 0.01 && Math.abs(startVel) > 0.1) {
      const velPerMs = startVel / 1000;
      v0 = (velPerMs * transitionDuration) / totalDelta;
      // Clamp to prevent extreme polynomial overshoots while preserving momentum
      v0 = Math.max(-2.5, Math.min(2.5, v0));
    }

    isMoving = true;
    animRecord = {
      startTime: now,
      duration: transitionDuration,
      startValue: startVal,
      targetValue: finalTarget,
      v0,
    };

    if (rafId) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafId);
      } else if (typeof clearTimeout === 'function') {
        clearTimeout(rafId);
      }
      rafId = null;
    }

    // Emit initial frame at t = now synchronously
    if (config.onUpdate) {
      config.onUpdate({
        value: startVal,
        target: finalTarget,
        velocity: startVel,
        acceleration: 0,
        progress: 0,
        isMoving: true,
        v0,
        timestamp: now,
      });
    }

    if (typeof requestAnimationFrame === 'function') {
      rafId = requestAnimationFrame(tick);
    } else if (typeof setTimeout === 'function') {
      rafId = setTimeout(() => {
        tick(typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
      }, 16);
    }
  };

  const setConfig = (newOptions = {}) => {
    config = { ...config, ...newOptions };
  };

  const destroy = () => {
    stop();
    config.onUpdate = null;
    config.onSettled = null;
  };

  return {
    setTarget,
    step,
    stop,
    destroy,
    setConfig,
    getValue: () => currentValue,
    getTarget: () => targetValue,
    getVelocity: () => currentVelocity,
    getAcceleration: () => currentAcceleration,
    isMoving: () => isMoving,
  };
};
