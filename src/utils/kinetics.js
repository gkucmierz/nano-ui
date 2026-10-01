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

  const setTarget = (newTarget, { immediate = false, isRelative = false, delta = 0, timestamp = undefined } = {}) => {
    const now = timestamp !== undefined
      ? timestamp
      : (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

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

/**
 * Generates an SVG path data string using a smooth Catmull-Rom to Cubic Bezier spline.
 *
 * @param {Array<{ x: number, y: number }>} points - Array of coordinate objects
 * @param {Object} [options]
 * @param {boolean} [options.closed=false] - Whether to close path with 'Z'
 * @param {number|null} [options.groundY=null] - Baseline Y to enclose area (e.g. for gradient fills)
 * @param {number} [options.tension=0.35] - Spline curve tension factor
 * @returns {string} SVG path string
 */
export const buildSplinePath = (points, { closed = false, groundY = null, tension = 0.35 } = {}) => {
  if (!points || !points.length) return '';
  const n = points.length;

  if (n === 1) {
    const p = points[0];
    if (groundY !== null) {
      return `M ${p.x.toFixed(1)} ${groundY.toFixed(1)} L ${p.x.toFixed(1)} ${p.y.toFixed(1)} L ${p.x.toFixed(1)} ${groundY.toFixed(1)} Z`;
    }
    return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  if (n === 2) {
    d += ` L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  } else {
    for (let i = 0; i < n - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i + 2 < n ? points[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) * (tension / 2);
      const cp1y = p1.y + (p2.y - p0.y) * (tension / 2);
      const cp2x = p2.x - (p3.x - p1.x) * (tension / 2);
      const cp2y = p2.y - (p3.y - p1.y) * (tension / 2);

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
  }

  if (groundY !== null) {
    const first = points[0];
    const last = points[n - 1];
    d += ` L ${last.x.toFixed(1)} ${groundY.toFixed(1)} L ${first.x.toFixed(1)} ${groundY.toFixed(1)} Z`;
  } else if (closed) {
    d += ' Z';
  }

  return d;
};

/**
 * Creates a pure, headless kinetic multi-point animation controller with continuous
 * velocity chaining and curve resampling for dynamic datasets (e.g. 7d, 30d, 90d transitions).
 *
 * Designed to be completely timer-agnostic (no internal RAF coupling), so it can run
 * either in the browser driven by RAF or on the server for deterministic frame rendering.
 *
 * @param {Object} [options]
 * @param {number} [options.duration=350] - Base duration in ms
 * @param {Function} [options.onUpdate] - Callback (currentPoints, { progress, isMoving })
 * @param {Function} [options.onSettled] - Callback (currentPoints)
 * @returns {Object} Kinetic points controller instance
 */
export const createKineticPoints = (options = {}) => {
  let config = {
    duration: 350,
    onUpdate: null,
    onSettled: null,
    ...options,
  };

  let currentPoints = [];
  let pointRecords = [];
  let animStart = 0;
  let animDuration = config.duration;
  let isMoving = false;

  const stop = () => {
    isMoving = false;
  };

  const step = (timestamp) => {
    if (!isMoving || !pointRecords.length) {
      return currentPoints;
    }

    const now = timestamp !== undefined
      ? timestamp
      : (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

    const elapsed = now - animStart;
    const p = Math.min(1, Math.max(0, elapsed / animDuration));

    const updated = new Array(pointRecords.length);
    for (let i = 0; i < pointRecords.length; i++) {
      const rec = pointRecords[i];
      const easeY = rec.v0Y ? cubicHermite(p, rec.v0Y) : easeInOutCubic(p);
      const curY = rec.startY + (rec.targetY - rec.startY) * easeY;

      const dEaseY = rec.v0Y ? cubicHermiteDerivative(p, rec.v0Y) : easeInOutCubicDerivative(p);
      const curVy = ((rec.targetY - rec.startY) * dEaseY / animDuration) * 1000;

      const easeX = easeInOutCubic(p);
      const curX = rec.startX + (rec.targetX - rec.startX) * easeX;

      updated[i] = {
        ...rec.metadata,
        x: curX,
        y: curY,
        vy: curVy,
      };
    }

    currentPoints = updated;

    if (p < 1) {
      if (config.onUpdate) {
        config.onUpdate(currentPoints, { progress: p, isMoving: true });
      }
    } else {
      // Settled at final targets
      for (let i = 0; i < pointRecords.length; i++) {
        const rec = pointRecords[i];
        currentPoints[i] = {
          ...rec.metadata,
          x: rec.targetX,
          y: rec.targetY,
          vy: 0,
        };
      }
      isMoving = false;

      if (config.onUpdate) {
        config.onUpdate(currentPoints, { progress: 1, isMoving: false });
      }
      if (config.onSettled) {
        config.onSettled(currentPoints);
      }
    }

    return currentPoints;
  };

  const setTargets = (newTargets, { immediate = false, timestamp = undefined } = {}) => {
    if (!newTargets || !newTargets.length) {
      stop();
      currentPoints = [];
      pointRecords = [];
      return currentPoints;
    }

    const now = timestamp !== undefined
      ? timestamp
      : (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

    if (immediate || !currentPoints.length) {
      stop();
      currentPoints = newTargets.map((pt) => ({
        ...pt,
        x: pt.x,
        y: pt.y,
        vy: 0,
      }));
      pointRecords = [];
      isMoving = false;
      if (config.onUpdate) {
        config.onUpdate(currentPoints, { progress: 1, isMoving: false });
      }
      if (config.onSettled) {
        config.onSettled(currentPoints);
      }
      return currentPoints;
    }

    const nOld = currentPoints.length;
    const nNew = newTargets.length;
    pointRecords = new Array(nNew);
    animDuration = Math.max(1, config.duration);
    animStart = now;

    for (let i = 0; i < nNew; i++) {
      const target = newTargets[i];
      let startX, startY, startVy;

      if (nNew === nOld) {
        startX = currentPoints[i].x;
        startY = currentPoints[i].y;
        startVy = currentPoints[i].vy || 0;
      } else {
        const u = nNew > 1 ? i / (nNew - 1) : 0;
        const idx = u * (nOld - 1);
        const i0 = Math.floor(idx);
        const i1 = Math.min(nOld - 1, i0 + 1);
        const frac = idx - i0;

        startX = currentPoints[i0].x + frac * (currentPoints[i1].x - currentPoints[i0].x);
        startY = currentPoints[i0].y + frac * (currentPoints[i1].y - currentPoints[i0].y);
        startVy = (currentPoints[i0].vy || 0) + frac * ((currentPoints[i1].vy || 0) - (currentPoints[i0].vy || 0));
      }

      const totalDeltaY = target.y - startY;
      let v0Y = 0;
      if (totalDeltaY !== 0 && startVy !== 0) {
        v0Y = ((startVy / 1000) * animDuration) / totalDeltaY;
        v0Y = Math.max(-3, Math.min(3, v0Y));
      }

      pointRecords[i] = {
        startX,
        startY,
        targetX: target.x,
        targetY: target.y,
        v0Y,
        metadata: { ...target },
      };
    }

    isMoving = true;

    // Emit initial frame at t = now (progress = 0)
    const initial = new Array(nNew);
    for (let i = 0; i < nNew; i++) {
      initial[i] = {
        ...pointRecords[i].metadata,
        x: pointRecords[i].startX,
        y: pointRecords[i].startY,
        vy: pointRecords[i].v0Y || 0,
      };
    }
    currentPoints = initial;

    if (config.onUpdate) {
      config.onUpdate(currentPoints, { progress: 0, isMoving: true });
    }

    return currentPoints;
  };

  const destroy = () => {
    stop();
    config.onUpdate = null;
    config.onSettled = null;
    currentPoints = [];
    pointRecords = [];
  };

  return {
    setTargets,
    step,
    stop,
    destroy,
    getCurrentPoints: () => currentPoints,
    isMoving: () => isMoving,
  };
};
