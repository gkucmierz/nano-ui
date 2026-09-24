/**
 * Modular and angular mathematics utilities
 */

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
