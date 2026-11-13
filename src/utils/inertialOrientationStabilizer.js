/**
 * Inertial World-Space 3D Orientation Stabilizer (Quaternion Horizon & Room Lock)
 * ===============================================================================
 * Self-contained pure mathematical core for @gkucmierz/nano-ui (mirrors
 * @gkucmierz/algorithms inertial_orientation_stabilizer.js without external repo links).
 *
 * Converts W3C DeviceOrientationEvent (alpha, beta, gamma, screenOrientation)
 * into a right-handed 3D camera quaternion, self-calibrates relative to the initial
 * holding angle q_init, fuses manual touch-drag offsets, and computes the inverse
 * world-stabilization quaternion:
 *
 *   q_rel   = conjugate(q_init) (*) q_device
 *   q_total = q_rel (*) q_dragOffset
 *   q_world = conjugate(q_total)
 */

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const SQRT_HALF = Math.sqrt(0.5);

export const Q_HALF_SCREEN_X = Object.freeze([-SQRT_HALF, 0, 0, SQRT_HALF]);
export const IDENTITY_QUAT = Object.freeze([0, 0, 0, 1]);

const cleanZero = (v) => (v === 0 ? 0 : v);

export function quatNormalize(q) {
  const x = Number(q?.[0]) || 0;
  const y = Number(q?.[1]) || 0;
  const z = Number(q?.[2]) || 0;
  const w = q?.[3] !== undefined ? Number(q[3]) : 1;
  const len = Math.hypot(x, y, z, w);
  if (len < 1e-12) return [0, 0, 0, 1];
  return [cleanZero(x / len), cleanZero(y / len), cleanZero(z / len), cleanZero(w / len)];
}

export function quatConjugate(q) {
  return [
    cleanZero(-(Number(q?.[0]) || 0)),
    cleanZero(-(Number(q?.[1]) || 0)),
    cleanZero(-(Number(q?.[2]) || 0)),
    cleanZero(Number(q?.[3] ?? 1)),
  ];
}

export function quatMultiply(a, b) {
  const ax = a[0];
  const ay = a[1];
  const az = a[2];
  const aw = a[3];
  const bx = b[0];
  const by = b[1];
  const bz = b[2];
  const bw = b[3];
  return [
    ax * bw + aw * bx + ay * bz - az * by,
    ay * bw + aw * by + az * bx - ax * bz,
    az * bw + aw * bz + ax * by - ay * bx,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function quatFromAxisAngle(ax, ay, az, angleRad) {
  const len = Math.hypot(ax, ay, az);
  if (len < 1e-12) return [0, 0, 0, 1];
  const half = angleRad * 0.5;
  const s = Math.sin(half) / len;
  return [ax * s, ay * s, az * s, Math.cos(half)];
}

export function quatFromEulerYXZ(xRad, yRad, zRad) {
  const c1 = Math.cos(xRad * 0.5);
  const c2 = Math.cos(yRad * 0.5);
  const c3 = Math.cos(zRad * 0.5);
  const s1 = Math.sin(xRad * 0.5);
  const s2 = Math.sin(yRad * 0.5);
  const s3 = Math.sin(zRad * 0.5);

  return [
    s1 * c2 * c3 + c1 * s2 * s3,
    c1 * s2 * c3 - s1 * c2 * s3,
    c1 * c2 * s3 - s1 * s2 * c3,
    c1 * c2 * c3 + s1 * s2 * s3,
  ];
}

export function quatSlerp(qa, qb, t) {
  const clampedT = Math.max(0, Math.min(1, Number(t) || 0));
  if (clampedT === 0) return [qa[0], qa[1], qa[2], qa[3]];
  if (clampedT === 1) return [qb[0], qb[1], qb[2], qb[3]];

  let bx = qb[0];
  let by = qb[1];
  let bz = qb[2];
  let bw = qb[3];
  let cosHalfTheta = qa[0] * bx + qa[1] * by + qa[2] * bz + qa[3] * bw;

  if (cosHalfTheta < 0) {
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
    cosHalfTheta = -cosHalfTheta;
  }

  if (cosHalfTheta >= 0.9995) {
    return quatNormalize([
      qa[0] + (bx - qa[0]) * clampedT,
      qa[1] + (by - qa[1]) * clampedT,
      qa[2] + (bz - qa[2]) * clampedT,
      qa[3] + (bw - qa[3]) * clampedT,
    ]);
  }

  const halfTheta = Math.acos(cosHalfTheta);
  const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);
  const ratioA = Math.sin((1 - clampedT) * halfTheta) / sinHalfTheta;
  const ratioB = Math.sin(clampedT * halfTheta) / sinHalfTheta;

  return [
    qa[0] * ratioA + bx * ratioB,
    qa[1] * ratioA + by * ratioB,
    qa[2] * ratioA + bz * ratioB,
    qa[3] * ratioA + bw * ratioB,
  ];
}

export function deviceOrientationToQuaternion({
  alpha = 0,
  beta = 0,
  gamma = 0,
  screenOrientationDeg = 0,
} = {}) {
  const alphaRad = (Number(alpha) || 0) * DEG_TO_RAD;
  const betaRad = (Number(beta) || 0) * DEG_TO_RAD;
  const gammaRad = (Number(gamma) || 0) * DEG_TO_RAD;
  const orientRad = (Number(screenOrientationDeg) || 0) * DEG_TO_RAD;

  const qEuler = quatFromEulerYXZ(betaRad, alphaRad, -gammaRad);
  const qScreenFixed = quatMultiply(qEuler, Q_HALF_SCREEN_X);
  const qOrient = quatFromAxisAngle(0, 0, 1, -orientRad);
  return quatNormalize(quatMultiply(qScreenFixed, qOrient));
}

export function computeStabilizedWorldQuaternion({
  currentDeviceQuat = IDENTITY_QUAT,
  initialDeviceQuat = null,
  dragOffsetX = 0,
  dragOffsetY = 0,
  gain = 1.0,
} = {}) {
  const anchor = initialDeviceQuat || currentDeviceQuat || IDENTITY_QUAT;
  const rawRelative = quatNormalize(quatMultiply(quatConjugate(anchor), currentDeviceQuat));
  const scaledRelative =
    gain === 1
      ? rawRelative
      : quatSlerp(IDENTITY_QUAT, rawRelative, Math.max(0, Math.min(1, gain)));

  const clampedPitchOffset = Math.max(-1.48, Math.min(1.48, Number(dragOffsetX) || 0));
  const yawOffset = -(Number(dragOffsetY) || 0);
  const offsetQuat = quatFromEulerYXZ(clampedPitchOffset, yawOffset, 0);

  const totalCameraQuat = quatNormalize(quatMultiply(scaledRelative, offsetQuat));
  const worldInverseQuat = quatConjugate(totalCameraQuat);

  const [qx, qy, qz, qw] = worldInverseQuat;
  const sinPitch = Math.max(-1, Math.min(1, 2 * (qw * qx - qy * qz)));
  const pitch = Math.asin(sinPitch) * RAD_TO_DEG;
  const yaw = Math.atan2(2 * (qw * qy + qz * qx), 1 - 2 * (qx * qx + qy * qy)) * RAD_TO_DEG;
  const roll = Math.atan2(2 * (qw * qz + qx * qy), 1 - 2 * (qx * qx + qz * qz)) * RAD_TO_DEG;

  return {
    relativeQuat: scaledRelative,
    worldInverseQuat,
    tiltDeg: {
      pitch: Number(pitch.toFixed(2)),
      yaw: Number(yaw.toFixed(2)),
      roll: Number(roll.toFixed(2)),
    },
  };
}

export function createInertialStabilizerEngine(options = {}) {
  const smoothing = Math.max(0.02, Math.min(1, Number(options.smoothing ?? 0.18)));
  const gain = Math.max(0, Math.min(1.5, Number(options.gain ?? 1.0)));
  const dragSensitivity = Number(options.dragSensitivity ?? 0.005);

  let hasSensorReading = false;
  let initialQuat = null;
  let latestDeviceQuat = [0, 0, 0, 1];
  let smoothedWorldQuat = [0, 0, 0, 1];
  let dragOffset = { x: 0, y: 0 };
  let lastRawAngles = { alpha: 0, beta: 0, gamma: 0, screenOrientationDeg: 0 };
  let latestTiltDeg = { pitch: 0, yaw: 0, roll: 0 };

  function ingestOrientation({ alpha, beta, gamma, screenOrientationDeg = 0 } = {}) {
    if (alpha === null || alpha === undefined || beta === null || beta === undefined) {
      return false;
    }
    lastRawAngles = {
      alpha: Number(alpha) || 0,
      beta: Number(beta) || 0,
      gamma: Number(gamma) || 0,
      screenOrientationDeg: Number(screenOrientationDeg) || 0,
    };
    latestDeviceQuat = deviceOrientationToQuaternion(lastRawAngles);
    if (!hasSensorReading || !initialQuat) {
      initialQuat = [...latestDeviceQuat];
      hasSensorReading = true;
    }
    return true;
  }

  function recalibrate() {
    if (hasSensorReading) {
      initialQuat = [...latestDeviceQuat];
    } else {
      initialQuat = null;
    }
    dragOffset = { x: 0, y: 0 };
    smoothedWorldQuat = [0, 0, 0, 1];
    latestTiltDeg = { pitch: 0, yaw: 0, roll: 0 };
  }

  function addDragOffset(deltaXPixels = 0, deltaYPixels = 0) {
    dragOffset.y += (Number(deltaXPixels) || 0) * dragSensitivity;
    dragOffset.x = Math.max(
      -1.48,
      Math.min(1.48, dragOffset.x + (Number(deltaYPixels) || 0) * dragSensitivity),
    );
  }

  function stepFrame() {
    const computed = computeStabilizedWorldQuaternion({
      currentDeviceQuat: latestDeviceQuat,
      initialDeviceQuat: initialQuat,
      dragOffsetX: dragOffset.x,
      dragOffsetY: dragOffset.y,
      gain,
    });
    smoothedWorldQuat = quatSlerp(smoothedWorldQuat, computed.worldInverseQuat, smoothing);
    latestTiltDeg = computed.tiltDeg;
    return {
      worldQuaternion: smoothedWorldQuat,
      targetWorldQuaternion: computed.worldInverseQuat,
      relativeQuaternion: computed.relativeQuat,
      tiltDeg: latestTiltDeg,
      hasSensorReading,
    };
  }

  function getState() {
    return {
      hasSensorReading,
      worldQuaternion: [...smoothedWorldQuat],
      deviceQuaternion: [...latestDeviceQuat],
      initialQuaternion: initialQuat ? [...initialQuat] : null,
      dragOffset: { ...dragOffset },
      rawAngles: { ...lastRawAngles },
      tiltDeg: { ...latestTiltDeg },
    };
  }

  return {
    ingestOrientation,
    recalibrate,
    addDragOffset,
    stepFrame,
    getState,
  };
}
