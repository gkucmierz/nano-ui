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
    if (animRecord && isMoving) {
      const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      const elapsed = now - animRecord.startTime;
      const p = Math.max(0, Math.min(1, elapsed / animRecord.duration));
      if (p < 1) {
        const totalDelta = animRecord.targetValue - animRecord.startValue;
        const effectiveSpeed = Math.max(0.01, config.speedMultiplier || 1);
        let newDuration = config.duration / effectiveSpeed;
        if (config.timingMode === 'proportional') {
          const stepQuantum = Math.max(0.1, config.step || 90);
          newDuration = (config.duration / effectiveSpeed) * Math.max(0.2, Math.abs(totalDelta) / stepQuantum);
        }
        animRecord.duration = newDuration;
        animRecord.startTime = now - p * newDuration;
      }
    }
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
    getV0: () => (animRecord ? (animRecord.v0 || 0) : 0),
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
const computeSplineControlPoints = (p0, p1, p2, p3, tension = 0.35) => {
  const halfTension = tension / 2;
  let tx1 = (p2.x - p0.x) * halfTension;
  let ty1 = (p2.y - p0.y) * halfTension;
  let tx2 = (p3.x - p1.x) * halfTension;
  let ty2 = (p3.y - p1.y) * halfTension;

  const segDx = p2.x - p1.x;
  if (segDx > 0) {
    const maxHandleX = segDx * tension;
    if (tx1 > maxHandleX && tx1 > 0) {
      const s1 = maxHandleX / tx1;
      tx1 *= s1;
      ty1 *= s1;
    }
    if (tx2 > maxHandleX && tx2 > 0) {
      const s2 = maxHandleX / tx2;
      tx2 *= s2;
      ty2 *= s2;
    }
  }

  return {
    cp1x: p1.x + tx1,
    cp1y: p1.y + ty1,
    cp2x: p2.x - tx2,
    cp2y: p2.y - ty2,
  };
};

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

      const { cp1x, cp1y, cp2x, cp2y } = computeSplineControlPoints(p0, p1, p2, p3, tension);

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
 * Evaluates the exact Y coordinate on the Catmull-Rom cubic Bezier spline at targetX.
 * Uses 16-step bisection inversion of the cubic Bezier segment to guarantee the hover point
 * rides strictly along the stroke of the curve during kinetic transitions.
 *
 * @param {Array<{ x: number, y: number }>} points - Array of coordinate objects
 * @param {number} targetX - X coordinate to sample
 * @param {number} [tension=0.35] - Spline curve tension factor matching buildSplinePath
 * @returns {number} Exact Y coordinate on the spline
 */
export const evaluateSplineY = (points, targetX, tension = 0.35) => {
  if (!points || !points.length) return 0;
  const n = points.length;
  if (n === 1) return points[0].y;
  if (targetX <= points[0].x) return points[0].y;
  if (targetX >= points[n - 1].x) return points[n - 1].y;

  if (n === 2) {
    const dx = points[1].x - points[0].x;
    if (Math.abs(dx) < 0.0001) return points[0].y;
    const t = (targetX - points[0].x) / dx;
    return points[0].y + t * (points[1].y - points[0].y);
  }

  let i = 0;
  for (let j = 0; j < n - 1; j++) {
    if (targetX >= points[j].x && targetX <= points[j + 1].x) {
      i = j;
      break;
    }
  }

  const p1 = points[i];
  const p2 = points[i + 1];

  if (Math.abs(targetX - p1.x) < 0.0001) return p1.y;
  if (Math.abs(targetX - p2.x) < 0.0001) return p2.y;
  if (Math.abs(p2.x - p1.x) < 0.0001) return p1.y;

  const p0 = i > 0 ? points[i - 1] : p1;
  const p3 = i + 2 < n ? points[i + 2] : p2;

  const { cp1x, cp1y, cp2x, cp2y } = computeSplineControlPoints(p0, p1, p2, p3, tension);

  let low = 0;
  let high = 1;
  let t = 0.5;

  for (let iter = 0; iter < 16; iter++) {
    t = (low + high) * 0.5;
    const mt = 1 - t;
    const x =
      mt * mt * mt * p1.x +
      3 * mt * mt * t * cp1x +
      3 * mt * t * t * cp2x +
      t * t * t * p2.x;
    if (x < targetX) {
      low = t;
    } else {
      high = t;
    }
  }

  const mt = 1 - t;
  return (
    mt * mt * mt * p1.y +
    3 * mt * mt * t * cp1y +
    3 * mt * t * t * cp2y +
    t * t * t * p2.y
  );
};

/**
 * Computes Fritsch-Carlson (1980) monotone piecewise cubic Hermite tangents m_k = dy/dx.
 * Guarantees C^1 smoothness with strictly zero overshoot/undershoot on step jumps, flat plateaus,
 * and local extrema (recommended for empirical financial, FX, fuel, and telemetry series).
 *
 * @param {Array<{ x: number, y: number }>} points
 * @returns {number[]} Slope array m[0..n-1]
 */
export const computeMonotoneTangents = (points) => {
  if (!Array.isArray(points) || points.length === 0) return [];
  const n = points.length;
  if (n === 1) return [0];

  const dx = new Array(n - 1);
  const delta = new Array(n - 1);
  for (let k = 0; k < n - 1; k++) {
    const h = points[k + 1].x - points[k].x;
    dx[k] = h;
    delta[k] = Math.abs(h) > 1e-12 ? (points[k + 1].y - points[k].y) / h : 0;
  }

  const m = new Array(n).fill(0);
  if (n === 2) {
    m[0] = delta[0];
    m[1] = delta[0];
    return m;
  }

  for (let k = 1; k < n - 1; k++) {
    const d0 = delta[k - 1];
    const d1 = delta[k];
    if (d0 * d1 <= 0) {
      m[k] = 0;
    } else {
      const h0 = Math.abs(dx[k - 1]);
      const h1 = Math.abs(dx[k]);
      const w1 = 2 * h1 + h0;
      const w2 = h1 + 2 * h0;
      const denom = w1 / d0 + w2 / d1;
      m[k] = Math.abs(denom) > 1e-15 ? (w1 + w2) / denom : 0.5 * (d0 + d1);
    }
  }

  const clampEndpoint = (mEnd, dAdj, dNext) => {
    if (dAdj === 0) return 0;
    if (Math.sign(mEnd) !== Math.sign(dAdj)) return 0;
    if (Math.sign(dAdj) !== Math.sign(dNext) && Math.abs(mEnd) > Math.abs(3 * dAdj)) {
      return 3 * dAdj;
    }
    return mEnd;
  };

  const h0 = dx[0];
  const h1 = dx[1];
  const m0Raw = Math.abs(h0 + h1) > 1e-12
    ? ((2 * h0 + h1) * delta[0] - h0 * delta[1]) / (h0 + h1)
    : delta[0];
  m[0] = clampEndpoint(m0Raw, delta[0], delta[1]);

  const hn1 = dx[n - 2];
  const hn2 = dx[n - 3];
  const mnRaw = Math.abs(hn1 + hn2) > 1e-12
    ? ((2 * hn1 + hn2) * delta[n - 2] - hn1 * delta[n - 3]) / (hn1 + hn2)
    : delta[n - 2];
  m[n - 1] = clampEndpoint(mnRaw, delta[n - 2], delta[n - 3]);

  for (let k = 0; k < n - 1; k++) {
    const dk = delta[k];
    if (Math.abs(dk) <= 1e-15) {
      m[k] = 0;
      m[k + 1] = 0;
    } else {
      if (m[k] / dk < 0) m[k] = 0;
      if (m[k + 1] / dk < 0) m[k + 1] = 0;
      const radSq = (m[k] / dk) ** 2 + (m[k + 1] / dk) ** 2;
      if (radSq > 9) {
        const tau = 3 / Math.sqrt(radSq);
        m[k] *= tau;
        m[k + 1] *= tau;
      }
    }
  }

  return m;
};

/**
 * Builds an SVG Cubic Bezier path (`M ... C ...`) from Fritsch-Carlson monotone Hermite tangents.
 *
 * @param {Array<{ x: number, y: number }>} points
 * @param {Object} [options]
 * @param {number|null} [options.groundY=null]
 * @param {number[]|null} [options.tangents=null]
 * @returns {string}
 */
export const buildMonotoneSplinePath = (points, { groundY = null, tangents = null } = {}) => {
  if (!points || !points.length) return '';
  const n = points.length;
  const f = (v) => v.toFixed(2);

  if (n === 1) {
    const pt = points[0];
    if (groundY !== null && groundY !== undefined) {
      return `M ${f(pt.x)} ${f(pt.y)} L ${f(pt.x)} ${f(groundY)} Z`;
    }
    return `M ${f(pt.x)} ${f(pt.y)}`;
  }

  const m = Array.isArray(tangents) && tangents.length === n
    ? tangents
    : computeMonotoneTangents(points);

  let d = `M ${f(points[0].x)} ${f(points[0].y)}`;
  for (let k = 0; k < n - 1; k++) {
    const p0 = points[k];
    const p1 = points[k + 1];
    const h = p1.x - p0.x;
    const cp1x = p0.x + h / 3;
    const cp1y = p0.y + (m[k] * h) / 3;
    const cp2x = p1.x - h / 3;
    const cp2y = p1.y - (m[k + 1] * h) / 3;
    d += ` C ${f(cp1x)} ${f(cp1y)}, ${f(cp2x)} ${f(cp2y)}, ${f(p1.x)} ${f(p1.y)}`;
  }

  if (groundY !== null && groundY !== undefined) {
    const first = points[0];
    const last = points[n - 1];
    d += ` L ${f(last.x)} ${f(groundY)} L ${f(first.x)} ${f(groundY)} Z`;
  }

  return d;
};

/**
 * Evaluates exact Y on the Fritsch-Carlson monotone cubic Hermite curve at targetX.
 * Because Hermite cubic X(t) = x_k + t * h is linear in t, no iterative inversion is required!
 *
 * @param {Array<{ x: number, y: number }>} points
 * @param {number} targetX
 * @param {number[]|null} [tangents=null]
 * @returns {number}
 */
export const evaluateMonotoneSplineY = (points, targetX, tangents = null) => {
  if (!points || !points.length) return 0;
  const n = points.length;
  if (n === 1 || targetX <= points[0].x) return points[0].y;
  if (targetX >= points[n - 1].x) return points[n - 1].y;

  const m = Array.isArray(tangents) && tangents.length === n
    ? tangents
    : computeMonotoneTangents(points);

  let k = 0;
  for (let j = 0; j < n - 1; j++) {
    if (targetX >= points[j].x && targetX <= points[j + 1].x) {
      k = j;
      break;
    }
  }

  const p0 = points[k];
  const p1 = points[k + 1];
  const h = p1.x - p0.x;
  if (Math.abs(h) < 1e-6) return p0.y;

  const t = Math.max(0, Math.min(1, (targetX - p0.x) / h));
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;

  return h00 * p0.y + h10 * h * m[k] + h01 * p1.y + h11 * h * m[k + 1];
};

const sampleVelocityAtX = (points, targetX) => {
  if (!points || !points.length) return 0;
  const n = points.length;
  if (n === 1 || targetX <= points[0].x) return points[0].vy || 0;
  if (targetX >= points[n - 1].x) return points[n - 1].vy || 0;
  for (let j = 0; j < n - 1; j++) {
    const p1 = points[j];
    const p2 = points[j + 1];
    if (targetX >= p1.x && targetX <= p2.x) {
      const dx = p2.x - p1.x;
      if (Math.abs(dx) < 0.0001) return p1.vy || 0;
      const frac = (targetX - p1.x) / dx;
      return (p1.vy || 0) + frac * ((p2.vy || 0) - (p1.vy || 0));
    }
  }
  return points[n - 1].vy || 0;
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
 * @param {number} [options.tension=0.35] - Spline tension used when resampling across X
 * @param {Function} [options.onUpdate] - Callback (currentPoints, { progress, isMoving })
 * @param {Function} [options.onSettled] - Callback (currentPoints)
 * @returns {Object} Kinetic points controller instance
 */
export const createKineticPoints = (options = {}) => {
  let config = {
    duration: 350,
    tension: 0.35,
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

    let sameXLayout = nNew === nOld;
    if (sameXLayout) {
      for (let i = 0; i < nNew; i++) {
        if (Math.abs(currentPoints[i].x - newTargets[i].x) > 0.5) {
          sameXLayout = false;
          break;
        }
      }
    }

    const xMinOld = currentPoints[0].x;
    const xMaxOld = currentPoints[nOld - 1].x;
    const xSpanOld = xMaxOld - xMinOld;
    const xMinNew = newTargets[0].x;
    const xMaxNew = newTargets[nNew - 1].x;
    const xSpanNew = xMaxNew - xMinNew;

    for (let i = 0; i < nNew; i++) {
      const target = newTargets[i];
      let startX, startY, startVy;

      if (sameXLayout) {
        startX = target.x;
        startY = currentPoints[i].y;
        startVy = currentPoints[i].vy || 0;
      } else {
        const sampleX =
          xSpanOld > 0.0001 && xSpanNew > 0.0001
            ? xMinOld + ((target.x - xMinNew) / xSpanNew) * xSpanOld
            : target.x;

        startX = target.x;
        startY = evaluateSplineY(currentPoints, sampleX, config.tension);
        startVy = sampleVelocityAtX(currentPoints, sampleX);
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
        startVy,
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
        vy: pointRecords[i].startVy || 0,
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
