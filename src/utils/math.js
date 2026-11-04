/**
 * Modular, angular, and numerical quantization mathematics utilities (SSoT)
 */

/**
 * Clamps a numeric value to the closed interval [min, max].
 *
 * @param {number} val
 * @param {number} [min=-Infinity]
 * @param {number} [max=Infinity]
 * @returns {number}
 */
export const clamp = (val, min = -Infinity, max = Infinity) =>
  Math.min(max, Math.max(min, val));

/**
 * Counts the number of decimal places in a step increment (supports float and scientific notation).
 *
 * @param {number|string} step
 * @returns {number}
 */
export const countStepDecimals = (step) => {
  const s = Number(step);
  if (!Number.isFinite(s) || s <= 0) return 0;
  const str = String(s);
  if (str.includes('e-')) return parseInt(str.split('e-')[1], 10) || 0;
  const dot = str.indexOf('.');
  return dot === -1 ? 0 : str.length - dot - 1;
};

/**
 * Clamps and quantizes a raw number to the nearest step multiple from `origin` (defaults to finite `min` or `0`),
 * rounding to the step's decimal precision to eliminate IEEE-754 floating-point drift.
 *
 * @param {number} raw
 * @param {Object} [options]
 * @param {number} [options.min=-Infinity]
 * @param {number} [options.max=Infinity]
 * @param {number} [options.step=1]
 * @param {number} [options.origin]
 * @returns {number}
 */
export const quantizeStepValue = (
  raw,
  { min = -Infinity, max = Infinity, step = 1, origin = undefined } = {}
) => {
  const num = Number(raw);
  const fallback = Number.isFinite(min) ? min : 0;
  if (!Number.isFinite(num)) return fallback;
  const stepVal = Number(step) > 0 ? Number(step) : 1;
  const base = origin !== undefined ? origin : (Number.isFinite(min) ? min : 0);
  const clampedInput = clamp(num, min, max);
  const stepped = base + Math.round((clampedInput - base) / stepVal) * stepVal;
  const bounded = clamp(stepped, min, max);
  const decimals = countStepDecimals(stepVal);
  return decimals > 0 ? Number(bounded.toFixed(decimals)) : Math.round(bounded);
};

/**
 * Normalizes an angle in degrees to the [0, 360) interval.
 *
 * @param {number} deg - Angle in degrees
 * @returns {number} Normalized angle in [0, 360)
 */
export const normalizeAngle = (deg) => {
  return ((deg % 360) + 360) % 360;
};

/**
 * Calculates the shortest signed angular difference from fromDeg to toDeg
 * along the geodesic of the circle S^1, returning a value in [-180, 180).
 *
 * @param {number} fromDeg - Initial angle in degrees
 * @param {number} toDeg - Target angle in degrees
 * @returns {number} Signed difference in [-180, 180)
 */
export const shortestAngleDiff = (fromDeg, toDeg) => {
  const fromNorm = normalizeAngle(fromDeg);
  const toNorm = normalizeAngle(toDeg);
  const diff = toNorm - fromNorm;
  return ((diff + 180) % 360 + 360) % 360 - 180;
};
