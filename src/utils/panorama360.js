import { clamp } from './math.js';
import { parseLightboxAspectRatio } from './lightboxGeometry.js';
import { is } from './type.js';

export const IDEAL_PANORAMA_ASPECT_RATIO = 2;
export const PANORAMA_PREFERRED_RATIO_TOLERANCE = 0.14;
export const DEFAULT_TINY_PLANET_HORIZON_RADIUS = 0.36;
export const DEFAULT_PANORAMA_KEYBOARD_SPEED_DEG = 84;
export const DEFAULT_PANORAMA_ZOOM_SPEED_DEG = 52;
export const DEFAULT_PANORAMA_ACCEL_MS = 100;
export const DEFAULT_PANORAMA_DECEL_MS = 165;

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const LN10 = Math.LN10;

const COMPASS_SECTORS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/**
 * Normalizes yaw angle into `[-180, 180)`.
 */
export const normalizeYawDeg = (yawDeg = 0) => {
  const n = Number(yawDeg) || 0;
  return ((((n + 180) % 360) + 360) % 360) - 180;
};

/**
 * Formats yaw angle into compass bearing (`0° N`, `90° E`, `270° W`).
 */
export const formatCompassHeading = (yawDeg = 0) => {
  const bearing = ((((Number(yawDeg) || 0) % 360) + 360) % 360);
  const rounded = Math.round(bearing) % 360;
  const idx = Math.round(rounded / 45) % 8;
  return `${rounded}° ${COMPASS_SECTORS[idx]}`;
};

/**
 * Resolves spherical / dome / inverse-stereographic Tiny-Planet projection parameters
 * for a 360° equirectangular, cylindrical, partial, or Insta360 "Tiny Planet" image.
 *
 * - Prefers canonical `2:1` (`width / height ≈ 2.0`) equirectangular full-sphere mapping
 *   (`360° × 180°`, seamless horizontal wraparound).
 * - Supports Insta360 Stereographic **"Tiny Planet" (`projectionMode = 'tiny-planet'`)**:
 *   unwraps a flat stereographic Tiny Planet photo (`(0.5, 0.5)` = nadir, circular horizon
 *   at `planetHorizonRadius * height`) back into a walkable `360°` 3D sphere while preserving
 *   exact `1:1` pixel isotropy across arbitrary `1:1`, `4:3`, `16:9`, or `9:16` exports, plus
 *   `'tiny-planet-flat'` for interactive orbital spin/zoom of the planet view itself.
 * - Respects arbitrary non-`2:1` aspect ratios (`projectionMode = 'auto'`):
 *   1. Wide cylindrical panoramas (`ratio > 2.14`): full `360°` horizontal wrap with
 *      isotropic vertical span `360° / ratio` (zero vertical stretching).
 *   2. Narrower / portrait images (`ratio < 1.86`, e.g. `16:9`, `4:3`, `9:16`):
 *      curved spherical dome segment with `hSpanDeg / vSpanDeg === imageAspect`.
 */
export const resolvePanoramaProjectionMeta = (
  naturalWidth = 0,
  naturalHeight = 0,
  {
    projectionMode = 'auto',
    preferredStageRatio = IDEAL_PANORAMA_ASPECT_RATIO,
    planetHorizonRadius = DEFAULT_TINY_PLANET_HORIZON_RADIUS,
  } = {}
) => {
  const nw = Number(naturalWidth) || 0;
  const nh = Number(naturalHeight) || 0;
  const hasDimensions = nw > 0 && nh > 0;
  const imageAspect = hasDimensions ? nw / nh : IDEAL_PANORAMA_ASPECT_RATIO;
  const stageRatio =
    parseLightboxAspectRatio(preferredStageRatio) || IDEAL_PANORAMA_ASPECT_RATIO;
  const safeHorizonR = clamp(
    Number(planetHorizonRadius) || DEFAULT_TINY_PLANET_HORIZON_RADIUS,
    0.18,
    0.48
  );

  const isPreferredRatio =
    Math.abs(imageAspect - IDEAL_PANORAMA_ASPECT_RATIO) <= PANORAMA_PREFERRED_RATIO_TOLERANCE;

  if (projectionMode === 'tiny-planet') {
    return {
      mode: 'tiny-planet-unwrap',
      isTinyPlanetSource: true,
      isPreferredRatio: false,
      imageAspect: Number(imageAspect.toFixed(5)),
      stageAspectRatio: Number(stageRatio.toFixed(4)),
      planetHorizonRadius: Number(safeHorizonR.toFixed(4)),
      wrapYaw: true,
      hSpanDeg: 360,
      vSpanDeg: 168,
      minPitchDeg: -85,
      maxPitchDeg: 34,
      defaultPitchDeg: -10,
      defaultFovDeg: 74,
      minFovDeg: 34,
      maxFovDeg: 102,
      ratioBadge: `${imageAspect.toFixed(2)}:1 · Mała Planeta → 3D 360°`,
    };
  }

  if (projectionMode === 'tiny-planet-flat') {
    return {
      mode: 'tiny-planet-flat',
      isTinyPlanetSource: true,
      isPreferredRatio: false,
      imageAspect: Number(imageAspect.toFixed(5)),
      stageAspectRatio: Number(stageRatio.toFixed(4)),
      planetHorizonRadius: Number(safeHorizonR.toFixed(4)),
      wrapYaw: true,
      hSpanDeg: 360,
      vSpanDeg: 150,
      minPitchDeg: -45,
      maxPitchDeg: 45,
      defaultPitchDeg: 0,
      defaultFovDeg: 75,
      minFovDeg: 30,
      maxFovDeg: 112,
      ratioBadge: `${imageAspect.toFixed(2)}:1 · Mała Planeta 360°`,
    };
  }

  if (projectionMode === 'force-sphere' || (projectionMode !== 'adaptive-dome' && isPreferredRatio)) {
    return {
      mode: 'equirect-sphere',
      isTinyPlanetSource: false,
      isPreferredRatio,
      imageAspect: Number(imageAspect.toFixed(5)),
      stageAspectRatio: Number(stageRatio.toFixed(4)),
      planetHorizonRadius: Number(safeHorizonR.toFixed(4)),
      wrapYaw: true,
      hSpanDeg: 360,
      vSpanDeg: 180,
      defaultFovDeg: 75,
      minFovDeg: 36,
      maxFovDeg: 105,
      ratioBadge: `${imageAspect.toFixed(2)}:1 · 360°×180°`,
    };
  }

  if (imageAspect > IDEAL_PANORAMA_ASPECT_RATIO + PANORAMA_PREFERRED_RATIO_TOLERANCE) {
    const vSpanDeg = clamp(360 / imageAspect, 34, 180);
    const defaultFovDeg = clamp(vSpanDeg * 0.72, 34, 75);
    return {
      mode: 'cylindrical-360',
      isTinyPlanetSource: false,
      isPreferredRatio: false,
      imageAspect: Number(imageAspect.toFixed(5)),
      stageAspectRatio: Number(stageRatio.toFixed(4)),
      planetHorizonRadius: Number(safeHorizonR.toFixed(4)),
      wrapYaw: true,
      hSpanDeg: 360,
      vSpanDeg: Number(vSpanDeg.toFixed(3)),
      defaultFovDeg: Number(defaultFovDeg.toFixed(2)),
      minFovDeg: 28,
      maxFovDeg: Number(Math.max(38, Math.min(96, vSpanDeg * 0.92)).toFixed(2)),
      ratioBadge: `${imageAspect.toFixed(2)}:1 · 360°×${Math.round(vSpanDeg)}°`,
    };
  }

  // Portrait or standard landscape (< 1.86): map isotropically onto a spherical dome arc
  const baseVSpan = imageAspect < 1 ? 148 : 132;
  let hSpanDeg = baseVSpan * imageAspect;
  let vSpanDeg = baseVSpan;
  if (hSpanDeg > 332) {
    hSpanDeg = 332;
    vSpanDeg = hSpanDeg / imageAspect;
  } else if (hSpanDeg < 54) {
    hSpanDeg = 54;
    vSpanDeg = clamp(hSpanDeg / Math.max(0.2, imageAspect), 54, 172);
  }

  const maxFovByV = vSpanDeg * 0.86;
  const maxFovByH = (hSpanDeg * 0.86) / Math.max(1, stageRatio * 0.85);
  const maxFovDeg = clamp(Math.min(92, maxFovByV, Math.max(36, maxFovByH)), 32, 92);
  const defaultFovDeg = clamp(Math.min(68, maxFovDeg * 0.84), 28, maxFovDeg);

  return {
    mode: 'adaptive-dome',
    isTinyPlanetSource: false,
    isPreferredRatio: false,
    imageAspect: Number(imageAspect.toFixed(5)),
    stageAspectRatio: Number(stageRatio.toFixed(4)),
    planetHorizonRadius: Number(safeHorizonR.toFixed(4)),
    wrapYaw: false,
    hSpanDeg: Number(hSpanDeg.toFixed(3)),
    vSpanDeg: Number(vSpanDeg.toFixed(3)),
    defaultFovDeg: Number(defaultFovDeg.toFixed(2)),
    minFovDeg: Math.min(24, defaultFovDeg),
    maxFovDeg: Number(maxFovDeg.toFixed(2)),
    ratioBadge: `${imageAspect.toFixed(2)}:1 · ${Math.round(hSpanDeg)}°×${Math.round(vSpanDeg)}°`,
  };
};

/**
 * Clamps `(yawDeg, pitchDeg, fovDeg)` cleanly to the resolved projection dome/sphere
 * so camera rays stay inside the valid image angular span without exposing empty borders.
 */
export const clampPanoramaCameraState = (
  { yawDeg = 0, pitchDeg = 0, fovDeg = 75 } = {},
  meta = resolvePanoramaProjectionMeta(4096, 2048),
  viewAspect = IDEAL_PANORAMA_ASPECT_RATIO
) => {
  const safeMeta = meta || resolvePanoramaProjectionMeta(4096, 2048);
  const safeAspect = clamp(Number(viewAspect) || IDEAL_PANORAMA_ASPECT_RATIO, 0.4, 4.5);
  const fov = clamp(
    Number(fovDeg) || safeMeta.defaultFovDeg || 75,
    safeMeta.minFovDeg || 28,
    safeMeta.maxFovDeg || 105
  );

  const halfVFovDeg = fov * 0.5;
  const halfHFovDeg = Math.atan(Math.tan(halfVFovDeg * DEG2RAD) * safeAspect) * RAD2DEG;

  let clampedPitch;
  if (Number.isFinite(safeMeta.minPitchDeg) && Number.isFinite(safeMeta.maxPitchDeg)) {
    const lo = Math.min(-15, safeMeta.minPitchDeg);
    const hi = Math.max(-5, safeMeta.maxPitchDeg - Math.max(0, (fov - 60) * 0.25));
    clampedPitch = clamp(Number(pitchDeg) || 0, lo, hi);
  } else {
    const maxPitchFromSpan = Math.max(0, safeMeta.vSpanDeg * 0.5 - halfVFovDeg * 0.82);
    const maxAbsPitch = Math.min(85, maxPitchFromSpan);
    clampedPitch = clamp(Number(pitchDeg) || 0, -maxAbsPitch, maxAbsPitch);
  }

  let clampedYaw;
  if (safeMeta.wrapYaw) {
    clampedYaw = normalizeYawDeg(yawDeg);
  } else {
    const maxYawFromSpan = Math.max(0, safeMeta.hSpanDeg * 0.5 - halfHFovDeg * 0.82);
    const maxAbsYaw = Math.min(170, maxYawFromSpan);
    clampedYaw = clamp(Number(yawDeg) || 0, -maxAbsYaw, maxAbsYaw);
  }

  return {
    yawDeg: Number(clampedYaw.toFixed(3)),
    pitchDeg: Number(clampedPitch.toFixed(3)),
    fovDeg: Number(fov.toFixed(3)),
  };
};

/**
 * Projects a normalized viewport coordinate `(nx, ny) ∈ [-1, 1]^2` (`nx` right, `ny` up)
 * onto equirectangular, adaptive-dome, or stereographic Tiny-Planet texture UV `(u, v) ∈ [0, 1]^2`.
 */
export const projectViewPixelToPanoramaUv = (
  nx = 0,
  ny = 0,
  {
    yawDeg = 0,
    pitchDeg = 0,
    fovDeg = 75,
    viewAspect = IDEAL_PANORAMA_ASPECT_RATIO,
    meta = resolvePanoramaProjectionMeta(4096, 2048),
  } = {}
) => {
  const aspect = Math.max(0.25, Number(viewAspect) || IDEAL_PANORAMA_ASPECT_RATIO);
  const imgAspect = Math.max(0.2, Number(meta?.imageAspect) || IDEAL_PANORAMA_ASPECT_RATIO);

  if (meta?.mode === 'tiny-planet-flat') {
    const rotRad = -(Number(yawDeg) || 0) * DEG2RAD;
    const zoomScale = (Number(fovDeg) || 75) / 75;
    const panY = ((Number(pitchDeg) || 0) / 90) * 0.35;
    // Isotropic plane coordinates in image-height units centered at (0.5, 0.5)
    const px = (Number(nx) || 0) * 0.5 * aspect * zoomScale;
    const py = (-(Number(ny) || 0) * 0.5 * zoomScale) + panY;
    const cosR = Math.cos(rotRad);
    const sinR = Math.sin(rotRad);
    const rx = px * cosR - py * sinR;
    const ry = px * sinR + py * cosR;
    const u = 0.5 + rx / imgAspect;
    const v = 0.5 + ry;
    const inBounds = u >= 0 && u <= 1 && v >= 0 && v <= 1;
    return {
      u: clamp(u, 0, 1),
      v: clamp(v, 0, 1),
      inBounds,
      lonDeg: normalizeYawDeg(yawDeg),
      latDeg: Number(pitchDeg) || 0,
    };
  }

  const yaw = (Number(yawDeg) || 0) * DEG2RAD;
  const pitch = (Number(pitchDeg) || 0) * DEG2RAD;
  const tanHalfFov = Math.tan(((Number(fovDeg) || 75) * 0.5) * DEG2RAD);

  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);

  // Forward, Right, Up basis vectors (Y up, +Z north at yaw=0, +X east at yaw=90°)
  const fwdX = sinYaw * cosPitch;
  const fwdY = sinPitch;
  const fwdZ = cosYaw * cosPitch;

  const rightX = cosYaw;
  const rightY = 0;
  const rightZ = -sinYaw;

  const upX = -sinYaw * sinPitch;
  const upY = cosPitch;
  const upZ = -cosYaw * sinPitch;

  const sx = (Number(nx) || 0) * tanHalfFov * aspect;
  const sy = (Number(ny) || 0) * tanHalfFov;

  const rx = fwdX + sx * rightX + sy * upX;
  const ry = fwdY + sx * rightY + sy * upY;
  const rz = fwdZ + sx * rightZ + sy * upZ;
  const invLen = 1 / Math.hypot(rx, ry, rz);

  const dx = rx * invLen;
  const dy = clamp(ry * invLen, -1, 1);
  const dz = rz * invLen;

  const lonRad = Math.atan2(dx, dz); // [-π, π]
  const latRad = Math.asin(dy); // [-π/2, π/2]

  if (meta?.mode === 'tiny-planet-unwrap') {
    const rH = clamp(
      Number(meta.planetHorizonRadius) || DEFAULT_TINY_PLANET_HORIZON_RADIUS,
      0.18,
      0.48
    );
    // Conformal stereographic projection from zenith (0, +1, 0) onto nadir tangent plane:
    // r = R_h * tan(psi/2) = R_h * sqrt(dx^2 + dz^2) / (1 - dy), so (X, Z) = R_h / (1 - dy) * (dx, dz).
    const k = rH / Math.max(0.12, 1 - dy);
    const u = 0.5 + (k * dx) / imgAspect;
    const v = 0.5 + k * dz;
    const inBounds = u >= 0 && u <= 1 && v >= 0 && v <= 1;
    return {
      u: clamp(u, 0, 1),
      v: clamp(v, 0, 1),
      inBounds,
      lonDeg: lonRad * RAD2DEG,
      latDeg: latRad * RAD2DEG,
    };
  }

  const hSpanRad = Math.max(0.1, (meta?.hSpanDeg || 360) * DEG2RAD);
  const vSpanRad = Math.max(0.1, (meta?.vSpanDeg || 180) * DEG2RAD);

  let u = 0.5 + lonRad / hSpanRad;
  if (meta?.wrapYaw) {
    u = ((u % 1) + 1) % 1;
  }
  const v = 0.5 - latRad / vSpanRad;

  const inBounds = (meta?.wrapYaw || (u >= 0 && u <= 1)) && v >= 0 && v <= 1;

  return {
    u: clamp(u, 0, 1),
    v: clamp(v, 0, 1),
    inBounds,
    lonDeg: lonRad * RAD2DEG,
    latDeg: latRad * RAD2DEG,
  };
};

/**
 * Normalizes a `KeyboardEvent` or raw key string into a canonical panorama navigation token.
 * Uses `@gkucmierz/utils` `is(...)` introspection (`UTILS-IS-CASE-01` compliant).
 */
export const normalizePanoramaKeyToken = (eventOrKey) => {
  if (!eventOrKey) return '';
  let code = '';
  let key = '';
  if (is(eventOrKey, 'string')) {
    const raw = eventOrKey.trim().toLowerCase();
    code = raw;
    key = raw;
  } else {
    if (is(eventOrKey.code, 'string')) code = eventOrKey.code.trim().toLowerCase();
    if (is(eventOrKey.key, 'string')) key = eventOrKey.key.trim().toLowerCase();
  }

  if (code === 'arrowleft' || key === 'arrowleft' || key === 'left') return 'arrowleft';
  if (code === 'arrowright' || key === 'arrowright' || key === 'right') return 'arrowright';
  if (code === 'arrowup' || key === 'arrowup' || key === 'up') return 'arrowup';
  if (code === 'arrowdown' || key === 'arrowdown' || key === 'down') return 'arrowdown';
  if (code === 'keyw' || key === 'w') return 'keyw';
  if (code === 'keya' || key === 'a') return 'keya';
  if (code === 'keys' || key === 's') return 'keys';
  if (code === 'keyd' || key === 'd') return 'keyd';
  if (key === '+' || key === '=' || code === 'numpadadd' || code === 'equal' || key === 'zoomin') {
    return 'zoomin';
  }
  if (
    key === '-' ||
    key === '_' ||
    code === 'numpadsubtract' ||
    code === 'minus' ||
    key === 'zoomout'
  ) {
    return 'zoomout';
  }
  if (key === 'shift' || code === 'shiftleft' || code === 'shiftright') return 'shift';
  return key || code;
};

/**
 * Checks whether a key event or token is an active continuous camera navigation thruster.
 */
export const isPanoramaNavigationKey = (eventOrKey, { wasd = false } = {}) => {
  const tok = normalizePanoramaKeyToken(eventOrKey);
  if (
    tok === 'arrowleft' ||
    tok === 'arrowright' ||
    tok === 'arrowup' ||
    tok === 'arrowdown' ||
    tok === 'zoomin' ||
    tok === 'zoomout'
  ) {
    return true;
  }
  if (wasd && (tok === 'keyw' || tok === 'keya' || tok === 'keys' || tok === 'keyd')) {
    return true;
  }
  return false;
};

/**
 * Resolves the normalized 2D spherical panning + FOV zoom input vector `(ux, uy, uz)`
 * from the currently held physical keys (`Set` or `Array`), with exact `1/sqrt(2)` diagonal
 * normalization so diagonal movement (`W+D` or `ArrowUp+ArrowRight`) preserves steady speed.
 */
export const resolvePanoramaKeyInputVector = (pressedKeys, { wasd = false } = {}) => {
  let left = 0;
  let right = 0;
  let up = 0;
  let down = 0;
  let zoomIn = 0;
  let zoomOut = 0;
  let boost = false;

  if (pressedKeys && is(pressedKeys[Symbol.iterator], 'callable')) {
    for (const raw of pressedKeys) {
      const tok = normalizePanoramaKeyToken(raw);
      if (tok === 'arrowleft' || (wasd && tok === 'keya')) left = 1;
      else if (tok === 'arrowright' || (wasd && tok === 'keyd')) right = 1;
      else if (tok === 'arrowup' || (wasd && tok === 'keyw')) up = 1;
      else if (tok === 'arrowdown' || (wasd && tok === 'keys')) down = 1;
      else if (tok === 'zoomin') zoomIn = 1;
      else if (tok === 'zoomout') zoomOut = 1;
      else if (tok === 'shift') boost = true;
    }
  }

  let ux = right - left;
  let uy = up - down;
  const uz = zoomOut - zoomIn;

  const mag = Math.hypot(ux, uy);
  if (mag > 1) {
    ux /= mag;
    uy /= mag;
  }

  return {
    ux,
    uy,
    uz,
    boost,
    isActive: ux !== 0 || uy !== 0 || uz !== 0,
  };
};

/**
 * Exact closed-form analytical integrator for 1st-order kinematic velocity envelope:
 * `dv/dt = (vTarget - v) / tau`
 * Guarantees frame-rate-independent trajectories across 60 Hz, 120 Hz, and 240 Hz displays:
 * - Press & hold (`vTarget != 0`): smooth ~100 ms acceleration (`90%` rise at `t = accelMs`)
 *   into steady constant cruising speed while held.
 * - Release (`vTarget == 0`): smooth kinematic glide down to rest without abrupt stops.
 */
const integrateKinematicAxis = (v0, vTarget, dtSec, tauSec, restThreshold = 0.14) => {
  const tau = Math.max(0.004, Number(tauSec) || 0.045);
  const alpha = Math.exp(-dtSec / tau);
  const rawVel = vTarget + (v0 - vTarget) * alpha;
  const delta = vTarget * dtSec + (v0 - vTarget) * tau * (1 - alpha);
  const vel = vTarget === 0 && Math.abs(rawVel) < restThreshold ? 0 : rawVel;
  return { vel, delta };
};

/**
 * Advances camera `(yawDeg, pitchDeg, fovDeg)` and angular velocities `(velYaw, velPitch, velFov)`
 * in `deg/s` over `dtSec` with C1-continuous acceleration (~100 ms), steady hold velocity,
 * smooth release deceleration, FOV-proportional speed scaling, and pole/dome boundary absorption.
 */
export const stepPanoramaKinematics = (
  state = {},
  input = { ux: 0, uy: 0, uz: 0, boost: false },
  dtSec = 1 / 60,
  {
    meta = resolvePanoramaProjectionMeta(4096, 2048),
    viewAspect = IDEAL_PANORAMA_ASPECT_RATIO,
    keyboardSpeed = DEFAULT_PANORAMA_KEYBOARD_SPEED_DEG,
    zoomSpeed = DEFAULT_PANORAMA_ZOOM_SPEED_DEG,
    accelMs = DEFAULT_PANORAMA_ACCEL_MS,
    decelMs = DEFAULT_PANORAMA_DECEL_MS,
  } = {}
) => {
  const dt = clamp(Number(dtSec) || 1 / 60, 0.0005, 0.1);
  const curYaw = Number(state.yawDeg) || 0;
  const curPitch = Number(state.pitchDeg) || 0;
  const curFov = Number(state.fovDeg) || meta?.defaultFovDeg || 75;
  const vYaw0 = Number(state.velYaw) || 0;
  const vPitch0 = Number(state.velPitch) || 0;
  const vFov0 = Number(state.velFov) || 0;

  const ux = clamp(Number(input?.ux) || 0, -1, 1);
  const uy = clamp(Number(input?.uy) || 0, -1, 1);
  const uz = clamp(Number(input?.uz) || 0, -1, 1);
  const boostMul = input?.boost ? 1.65 : 1;
  const fovScale = clamp(curFov / 75, 0.35, 1.35);

  const maxYawSpeed = Math.max(8, Number(keyboardSpeed) || DEFAULT_PANORAMA_KEYBOARD_SPEED_DEG) * fovScale * boostMul;
  const maxPitchSpeed = maxYawSpeed * 0.82;
  const maxFovSpeed = Math.max(8, Number(zoomSpeed) || DEFAULT_PANORAMA_ZOOM_SPEED_DEG) * boostMul;

  // 90% of target velocity is reached at t = tau * ln(10) = accelMs
  const accelTau = Math.max(0.008, (Math.max(16, Number(accelMs) || DEFAULT_PANORAMA_ACCEL_MS) / 1000) / LN10);
  const decelTau = Math.max(0.012, (Math.max(24, Number(decelMs) || DEFAULT_PANORAMA_DECEL_MS) / 1000) / LN10);

  const targetYawVel = ux * maxYawSpeed;
  const targetPitchVel = uy * maxPitchSpeed;
  const targetFovVel = uz * maxFovSpeed;

  const yawStep = integrateKinematicAxis(
    vYaw0,
    targetYawVel,
    dt,
    ux !== 0 ? accelTau : decelTau
  );
  const pitchStep = integrateKinematicAxis(
    vPitch0,
    targetPitchVel,
    dt,
    uy !== 0 ? accelTau : decelTau
  );
  const fovStep = integrateKinematicAxis(
    vFov0,
    targetFovVel,
    dt,
    uz !== 0 ? accelTau : decelTau
  );

  const rawYaw = curYaw + yawStep.delta;
  const rawPitch = curPitch + pitchStep.delta;
  const rawFov = curFov + fovStep.delta;

  const clamped = clampPanoramaCameraState(
    { yawDeg: rawYaw, pitchDeg: rawPitch, fovDeg: rawFov },
    meta,
    viewAspect
  );

  let nextVelYaw = yawStep.vel;
  let nextVelPitch = pitchStep.vel;
  let nextVelFov = fovStep.vel;

  // Absorb outward velocity at non-wrapping dome yaw edges, poles, and FOV stops
  if (!meta?.wrapYaw && Math.abs(clamped.yawDeg - rawYaw) > 0.01) {
    if ((rawYaw > clamped.yawDeg && nextVelYaw > 0) || (rawYaw < clamped.yawDeg && nextVelYaw < 0)) {
      nextVelYaw = 0;
    }
  }
  if (Math.abs(clamped.pitchDeg - rawPitch) > 0.01) {
    if ((rawPitch > clamped.pitchDeg && nextVelPitch > 0) || (rawPitch < clamped.pitchDeg && nextVelPitch < 0)) {
      nextVelPitch = 0;
    }
  }
  if (Math.abs(clamped.fovDeg - rawFov) > 0.01) {
    if ((rawFov > clamped.fovDeg && nextVelFov > 0) || (rawFov < clamped.fovDeg && nextVelFov < 0)) {
      nextVelFov = 0;
    }
  }

  const isMoving =
    ux !== 0 ||
    uy !== 0 ||
    uz !== 0 ||
    Math.abs(nextVelYaw) > 0 ||
    Math.abs(nextVelPitch) > 0 ||
    Math.abs(nextVelFov) > 0;

  return {
    yawDeg: clamped.yawDeg,
    pitchDeg: clamped.pitchDeg,
    fovDeg: clamped.fovDeg,
    velYaw: nextVelYaw,
    velPitch: nextVelPitch,
    velFov: nextVelFov,
    isMoving,
  };
};
