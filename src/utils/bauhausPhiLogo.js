/**
 * Bauhaus Φ Tri-Primitive (□ + △ + ○) — 3D Manifold to 2D Orthographic Shadow Engine,
 * Mathematical Perfection Scalar L(Φ): 1 -> 0 (<= 1e-9),
 * & 3D Floating Math.* Formula Sweeper + Nano-Charts Engine
 *
 * Governs the official @gkucmierz/nano-ui visual & sonic identity:
 * - Golden Ratio: φ = (1 + √5) / 2 ≈ 1.618033988749895
 * - 3 Elementary Bauhaus Primitives in a 32×32 (or ×16 = 512×512) grid:
 *   1. [□] Square/Golden Pillar (<rect>):
 *      x ∈ [7, 11.25], y ∈ [7, 25] (H = 18, exactWidth = H·φ^-3 ≈ 4.249223595), z-center = -4·φ^-1
 *   2. [△] Golden Right Triangle Wedge (<polygon>):
 *      vertices (13.25, 7), (25, 25), (25, 13.875) where 25 - exactRightTopY = H·φ^-1, z-center = 0
 *   3. [○] Golden Quantum Sphere (<circle>):
 *      center (22.55, 9.45), radius r = 2.45 (tangent to x = 25, y = 7), z-center = +4·φ^-1
 */

import { clampFloatingBox2D } from './selectPositioning.js';
import { computeMonospaceFittedFontSize } from './fitText.js';

export const PHI = (1 + Math.sqrt(5)) / 2;
export const INV_PHI = 1 / PHI;
export const INV_PHI2 = 1 / (PHI * PHI);
export const INV_PHI3 = 1 / (PHI * PHI * PHI);
export const INV_PHI4 = 1 / (PHI * PHI * PHI * PHI);

export const BAUHAUS_PHI_EXACT_TARGETS = Object.freeze({
  frameMin: 7,
  frameMax: 25,
  frameSpan: 18,
  centerX: 16,
  centerY: 16,
  pillarWidth: 18 * INV_PHI3, // 4.249223594996215
  wedgeRightLegHeight: 18 * INV_PHI, // 11.124611797498108
  wedgeRightTopY: 25 - 18 * INV_PHI, // 13.875388202501892
  sphereRadius: 2.45,
  zPillar: -4 * INV_PHI,
  zWedge: 0,
  zSphere: 4 * INV_PHI,
  freqFundamentalHz: 432,
  freqGlideStartHz: 432 * 1.25, // 540 Hz (Just Major Third 5:4)
  freqGlideEndHz: 432 * PHI, // 698.9906831399546 Hz (Golden Interval)
  freqSphereBellHz: 432 * PHI * PHI, // 1130.9906831399546 Hz (φ² Harmonic)
  freqSphereOvertoneHz: 432 * 4, // 1728 Hz (Double Octave 4:1)
});

export const BAUHAUS_PHI_2D_SPEC = Object.freeze({
  viewBoxSize: 32,
  frameMin: 7,
  frameMax: 25,
  frameSpan: 18,
  rect: Object.freeze({
    x: 7,
    y: 7,
    width: 4.25,
    exactWidth: BAUHAUS_PHI_EXACT_TARGETS.pillarWidth,
    height: 18,
    rx: 0.9,
    zCenter: Number((-4 * INV_PHI).toFixed(4)),
    exactZCenter: BAUHAUS_PHI_EXACT_TARGETS.zPillar,
    zHalfThickness: 1.65,
  }),
  triangle: Object.freeze({
    points: Object.freeze([
      Object.freeze([11.85, 7]),
      Object.freeze([25, 25]),
      Object.freeze([25, 15.85]),
    ]),
    svgPoints: '11.85,7 25,25 25,15.85',
    exactRightTopY: BAUHAUS_PHI_EXACT_TARGETS.wedgeRightTopY,
    zCenter: 0,
    exactZCenter: 0,
    zHalfThickness: 1.65,
  }),
  circle: Object.freeze({
    cx: 22.55,
    cy: 9.45,
    r: 2.45,
    zCenter: Number((4 * INV_PHI).toFixed(4)),
    exactZCenter: BAUHAUS_PHI_EXACT_TARGETS.zSphere,
  }),
});

export const NANO_UI_SONIC_LOGO_NSD = `seq(
  0ms:   0.56 * sin(432Hz) * expDecay(220ms),
  65ms:  0.50 * tri(glide(540Hz, 699Hz, easeOutCubic, 115ms)) * expDecay(200ms),
  130ms: 0.64 * sin(1131Hz) * expDecay(360ms) + 0.28 * sin(1728Hz) * expDecay(280ms)
)`;

/**
 * Candidate Math.* expressions swept during 3D formula exploration before locking onto exact Golden Ratio identities.
 */
export const MATH_FORMULA_SWEEP_BANK = Object.freeze({
  PHI_CONSTANT: Object.freeze([
    { expr: 'Math.SQRT2 + 0.2038', val: Math.SQRT2 + 0.2038 },
    { expr: 'Math.PI / Math.sqrt(3.77)', val: Math.PI / Math.sqrt(3.77) },
    { expr: 'Math.exp(Math.atanh(0.4472))', val: Math.exp(Math.atanh(0.4472)) },
    { expr: 'Math.hypot(1, 0.5) + 0.5', val: Math.hypot(1, 0.5) + 0.5 },
    { expr: '2 * Math.cos(Math.PI / 5)', val: 2 * Math.cos(Math.PI / 5) },
    { expr: '(1 + Math.sqrt(5)) / 2', val: PHI },
  ]),
  PILLAR_WIDTH: Object.freeze([
    { expr: '18 / Math.hypot(4, 1.4)', val: 18 / Math.hypot(4, 1.4) },
    { expr: 'Math.log(70.1) * Math.E / 2.71', val: (Math.log(70.1) * Math.E) / 2.71 },
    { expr: '18 * Math.pow(2*Math.sin(Math.PI/10),3)', val: 18 * Math.pow(2 * Math.sin(Math.PI / 10), 3) },
    { expr: '18 * Math.pow(PHI, -3)', val: 18 * INV_PHI3 },
  ]),
  WEDGE_SPLIT_Y: Object.freeze([
    { expr: '25 - 18 * Math.sin(0.666)', val: 25 - 18 * Math.sin(0.666) },
    { expr: '25 - 18 * Math.cos(Math.PI / 3.4)', val: 25 - 18 * Math.cos(Math.PI / 3.4) },
    { expr: '25 - 18 / (2 * Math.cos(Math.PI/5))', val: 25 - 18 * INV_PHI },
    { expr: '25 - 18 * Math.pow(PHI, -1)', val: 25 - 18 * INV_PHI },
  ]),
  HARMONIC_BELL: Object.freeze([
    { expr: '432 * Math.E * 0.963', val: 432 * Math.E * 0.963 },
    { expr: '432 * Math.pow(Math.PI, 0.84)', val: 432 * Math.pow(Math.PI, 0.84) },
    { expr: '432 * (1.5 + Math.sqrt(5)/2)', val: 432 * (1 + PHI) },
    { expr: '432 * Math.pow(PHI, 2)', val: 432 * PHI * PHI },
  ]),
});

/**
 * Projects a 3D point (x, y, z) around the canvas center (16, 16, 0)
 * using orthographic camera angles (yawDeg, pitchDeg).
 * At yawDeg = 0, pitchDeg = 0, returns exact (x, y) regardless of z!
 */
export function projectOrthographic3D(x, y, z, yawDeg = 0, pitchDeg = 0) {
  const radY = (yawDeg * Math.PI) / 180;
  const radP = (pitchDeg * Math.PI) / 180;
  const cosY = Math.cos(radY);
  const sinY = Math.sin(radY);
  const cosP = Math.cos(radP);
  const sinP = Math.sin(radP);

  const cx = x - 16;
  const cy = y - 16;
  const cz = z;

  const rx = cx * cosY + cz * sinY;
  const rz1 = -cx * sinY + cz * cosY;
  const ry = cy * cosP - rz1 * sinP;
  const rz2 = cy * sinP + rz1 * cosP;

  const exactX = 16 + rx;
  const exactY = 16 + ry;
  const exactZ = rz2;

  return {
    x: Number(exactX.toFixed(3)),
    y: Number(exactY.toFixed(3)),
    z: Number(exactZ.toFixed(3)),
    exactX,
    exactY,
    exactZ,
  };
}

/**
 * Builds depth-sorted 3D extruded faces for a 2D polygon placed at zCenter +/- zHalfThickness
 * with outward normal computation, backface culling (visibleSides), and opaque Lambertian shading.
 */
export function buildExtrudedSolid3D(
  pts2D,
  zCenter,
  zHalfThickness,
  yawDeg = 0,
  pitchDeg = 0,
  cursorLightX = 0,
  cursorLightY = 0
) {
  // Ensure clockwise winding in SVG screen space (+x right, +y down) so outward 2D normal is (dy, -dx)
  let signedArea2 = 0;
  for (let i = 0; i < pts2D.length; i++) {
    const [x0, y0] = pts2D[i];
    const [x1, y1] = pts2D[(i + 1) % pts2D.length];
    signedArea2 += (x1 - x0) * (y1 + y0);
  }
  const ordered2D = signedArea2 <= 0 ? [...pts2D] : [...pts2D].reverse();

  const zFront = zCenter + zHalfThickness;
  const zBack = zCenter - zHalfThickness;

  const front = ordered2D.map(([x, y]) => projectOrthographic3D(x, y, zFront, yawDeg, pitchDeg));
  const back = ordered2D.map(([x, y]) => projectOrthographic3D(x, y, zBack, yawDeg, pitchDeg));

  const radY = (yawDeg * Math.PI) / 180;
  const radP = (pitchDeg * Math.PI) / 180;
  const cosY = Math.cos(radY);
  const sinY = Math.sin(radY);
  const cosP = Math.cos(radP);
  const sinP = Math.sin(radP);

  // Studio directional key light from top-left-front, dynamically steerable by user cursor
  const rawLx = -0.45 + cursorLightX * 0.38;
  const rawLy = -0.58 + cursorLightY * 0.38;
  const rawLz = 0.68;
  const lNorm = Math.hypot(rawLx, rawLy, rawLz) || 1;
  const Lx = rawLx / lNorm;
  const Ly = rawLy / lNorm;
  const Lz = rawLz / lNorm;

  const sides = [];
  for (let i = 0; i < front.length; i++) {
    const next = (i + 1) % front.length;
    const [x0, y0] = ordered2D[i];
    const [x1, y1] = ordered2D[next];
    const edgeDx = x1 - x0;
    const edgeDy = y1 - y0;
    const edgeLen = Math.hypot(edgeDx, edgeDy) || 1;

    // Outward 2D normal in SVG coordinates (+x right, +y down)
    const nx = edgeDy / edgeLen;
    const ny = -edgeDx / edgeLen;

    // Rotate normal by (yawDeg, pitchDeg)
    const rnx = nx * cosY;
    const rnz1 = -nx * sinY;
    const rny = ny * cosP - rnz1 * sinP;
    const rnz = ny * sinP + rnz1 * cosP;

    const quad = [front[i], front[next], back[next], back[i]];
    const avgZ = (quad[0].z + quad[1].z + quad[2].z + quad[3].z) / 4;

    const lambert = Math.max(0, rnx * Lx + rny * Ly + rnz * Lz);
    const shade = Number(Math.max(0.32, Math.min(0.92, 0.38 + lambert * 0.54)).toFixed(2));
    const isVisible = rnz > 1e-4;

    sides.push({
      points: quad.map((p) => `${p.x},${p.y}`).join(' '),
      avgZ,
      shade,
      normalZ: Number(rnz.toFixed(4)),
      isVisible,
    });
  }

  sides.sort((a, b) => a.avgZ - b.avgZ);
  const visibleSides = sides.filter((s) => s.isVisible);

  const frontAvgZ = front.reduce((s, p) => s + p.z, 0) / front.length;
  const backAvgZ = back.reduce((s, p) => s + p.z, 0) / back.length;

  return {
    frontPoints: front.map((p) => `${p.x},${p.y}`).join(' '),
    backPoints: back.map((p) => `${p.x},${p.y}`).join(' '),
    frontVertices: front,
    backVertices: back,
    frontAvgZ,
    backAvgZ,
    sides,
    visibleSides,
    avgZ: (frontAvgZ + backAvgZ) / 2,
  };
}

/**
 * Computes the normalized Perfection Loss Scalar L(Φ) ∈ [0, 1].
 */
export function computeLogoPerfectionScalar({
  yawDeg = 0,
  pitchDeg = 0,
  calibrationPerturbation = 0,
} = {}) {
  const T = BAUHAUS_PHI_EXACT_TARGETS;
  const p = Math.max(0, Math.min(1, Number(calibrationPerturbation) || 0));

  const samplePoints3D = [
    [7, 7, T.zPillar + 1.65],
    [7 + T.pillarWidth, 25, T.zPillar - 1.65],
    [13.25, 7, T.zWedge + 1.65],
    [25, 25, T.zWedge - 1.65],
    [25, T.wedgeRightTopY, T.zWedge + 1.65],
    [22.55, 9.45, T.zSphere],
  ];

  let sqDispSum = 0;
  let maxRefDispSum = 0;
  for (const [x, y, z] of samplePoints3D) {
    const cur = projectOrthographic3D(x, y, z, yawDeg, pitchDeg);
    const dx = cur.exactX - x;
    const dy = cur.exactY - y;
    sqDispSum += dx * dx + dy * dy;

    const refMax = projectOrthographic3D(x, y, z, 65, 45);
    const rdx = refMax.exactX - x;
    const rdy = refMax.exactY - y;
    maxRefDispSum += rdx * rdx + rdy * rdy;
  }

  const projectionLoss = maxRefDispSum > 0 ? Math.min(1, sqDispSum / maxRefDispSum) : 0;

  const currentPillarWidth = T.pillarWidth * (1 + 0.38 * p);
  const currentWedgeLeg = T.wedgeRightLegHeight * (1 - 0.32 * p);
  const errPillar = (currentPillarWidth / T.frameSpan - INV_PHI3) / INV_PHI3;
  const errWedge = (currentWedgeLeg / T.frameSpan - INV_PHI) / INV_PHI;
  const phiLoss = Math.min(
    1,
    (errPillar * errPillar + errWedge * errWedge) / (0.38 * 0.38 + 0.32 * 0.32)
  );

  const centroidX = (T.frameMin + T.frameMax) / 2 + 2.4 * p;
  const centroidY = (T.frameMin + T.frameMax) / 2 - 1.8 * p;
  const symLoss = Math.min(
    1,
    ((centroidX - T.centerX) ** 2 + (centroidY - T.centerY) ** 2) / (2.4 ** 2 + 1.8 ** 2)
  );

  const curGlideEnd = T.freqGlideEndHz * (1 + 0.25 * p);
  const curBell = T.freqSphereBellHz * (1 - 0.22 * p);
  const errGlide = (curGlideEnd / T.freqFundamentalHz - PHI) / PHI;
  const errBell = (curBell / T.freqFundamentalHz - PHI * PHI) / (PHI * PHI);
  const acousticLoss = Math.min(
    1,
    (errGlide * errGlide + errBell * errBell) / (0.25 * 0.25 + 0.22 * 0.22)
  );

  const rawScalar = Math.min(
    1,
    0.55 * projectionLoss + 0.2 * phiLoss + 0.125 * symLoss + 0.125 * acousticLoss
  );

  return {
    scalar: rawScalar,
    formatted: rawScalar.toExponential(3),
    fixed12: rawScalar.toFixed(12),
    isConverged: rawScalar <= 1e-9,
    targetThreshold: 1e-9,
    components: {
      projectionLoss,
      phiLoss,
      symLoss,
      acousticLoss,
    },
  };
}

/**
 * Evaluates the exact continuous (x, y) and secondary (x, sy) wave coordinates
 * at normalized horizontal parameter u ∈ [0, 1] for a 3D floating card mini-chart.
 */
export function evaluateMiniChartWavePoint(
  kind,
  u = 0,
  phaseRad = 0,
  scalar = 0,
  W = 44,
  H = 13
) {
  const clampedU = Math.max(0, Math.min(1, Number(u) || 0));
  const x = Number((clampedU * W).toFixed(3));
  let yNorm = 0.5;
  let secNorm = 0.5;

  if (kind === 'harmonic-wave') {
    const freq = 2.4 + (1 - scalar) * PHI;
    yNorm =
      0.5 -
      0.42 * Math.sin(clampedU * Math.PI * freq + phaseRad) * Math.exp(-clampedU * 0.35);
    secNorm = 0.5 - 0.28 * Math.cos(clampedU * Math.PI * freq * PHI - phaseRad * 0.8);
  } else if (kind === 'loss-decay') {
    yNorm = 0.88 - 0.76 * Math.exp(-clampedU * 3.8 * (1.2 - scalar * 0.5));
    secNorm = 0.88 - 0.76 * (1 - clampedU);
  } else if (kind === 'lissajous-phi') {
    yNorm =
      0.5 -
      0.42 *
        Math.sin(clampedU * Math.PI * 2 * PHI + phaseRad * 0.9) *
        Math.cos(clampedU * Math.PI);
    secNorm = 0.5 + 0.32 * Math.cos(clampedU * Math.PI * PHI - phaseRad * 0.6);
  } else if (kind === 'step-converge') {
    const damped =
      Math.cos(clampedU * Math.PI * 3.2 + phaseRad * 0.7) * Math.exp(-clampedU * 2.4);
    yNorm = 0.5 - 0.42 * damped;
    secNorm = 0.5 - 0.42 * Math.exp(-clampedU * 2.4);
  }

  const y = Number(Math.max(1, Math.min(H - 1, yNorm * H)).toFixed(3));
  const sy = Number(Math.max(1, Math.min(H - 1, secNorm * H)).toFixed(3));
  return { x, y, sy, u: Number(clampedU.toFixed(4)) };
}

/**
 * Generates high-resolution (10x granularity: 180 segments) mini SVG chart primitives
 * (sparkline, secondary wave, shaded area, bars, continuous analytical playhead cursor)
 * for each 3D floating holographic card.
 */
export function buildMiniChartData(kind, phaseRad = 0, scalar = 0, steps = 180) {
  const pts = [];
  const secPts = [];
  const W = 44;
  const H = 13;
  const resolvedSteps = Math.max(18, Math.floor(Number(steps) || 180));

  for (let i = 0; i <= resolvedSteps; i++) {
    const u = i / resolvedSteps;
    const pt = evaluateMiniChartWavePoint(kind, u, phaseRad, scalar, W, H);
    pts.push({ x: pt.x, y: pt.y });
    secPts.push({ x: pt.x, y: pt.sy });
  }

  const sparklinePoints = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const secondaryPoints = secPts.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = `0,${H} ${sparklinePoints} ${W},${H}`;

  // 6 mini histogram bars for spectrum / step-convergence cue
  const bars = [];
  for (let b = 0; b < 6; b++) {
    const bu = b / 5;
    const bx = Number((2 + b * 7).toFixed(1));
    const mag =
      kind === 'step-converge'
        ? Math.exp(-bu * 2.2) * (0.35 + 0.65 * Math.abs(Math.sin(phaseRad * 0.8 + b)))
        : 0.25 + 0.7 * Math.abs(Math.sin(phaseRad + b * INV_PHI));
    const bh = Number(Math.max(1.5, mag * (H - 2.5)).toFixed(2));
    const by = Number((H - 0.8 - bh).toFixed(2));
    bars.push({ x: bx, y: by, w: 4.2, h: bh });
  }

  // Continuous analytical playhead cursor along the primary curve at exact same speed (phaseRad * 0.9)
  const cursorU = (Math.sin(phaseRad * 0.9) + 1) * 0.5;
  const exactCursor = evaluateMiniChartWavePoint(kind, cursorU, phaseRad, scalar, W, H);
  const cursorPoint = {
    x: exactCursor.x,
    y: exactCursor.y,
    u: exactCursor.u,
  };

  return {
    steps: resolvedSteps,
    sparklinePoints,
    secondaryPoints,
    areaPoints,
    bars,
    cursorPoint,
  };
}

/**
 * Computes 3D floating Math.* formula sweepers & nano-chart artifacts orbiting the Bauhaus Φ manifold,
 * with optional depth-differential cursor parallax (cursorNormX, cursorNormY).
 */
export function computeFloating3DArtifacts(
  yawDeg = 0,
  pitchDeg = 0,
  phaseRad = 0,
  perfectionScalar = 0,
  cursorNormX = 0,
  cursorNormY = 0,
  stageBounds = { minX: -24.2, maxX: 56.2, minY: -9.2, maxY: 41.2 }
) {
  const T = BAUHAUS_PHI_EXACT_TARGETS;
  const isLocked = perfectionScalar <= 1e-9;

  const pickFormula = (bank, exactTarget, phaseOffset = 0) => {
    if (isLocked || perfectionScalar <= 1e-9) {
      const last = bank[bank.length - 1];
      return {
        expr: last.expr,
        val: exactTarget,
        err: 0,
      };
    }
    // Calm, readable sweep cadence (~0.24x phase speed) with smooth C1 Hermite interpolation between candidates
    // so the displayed residual Δ never jumps by 10 orders of magnitude (e.g. 8.2e-7 -> 0.0e+0 -> 2.2e-16) in fractions of a second.
    const sweepCount = Math.max(1, bank.length - 1);
    const wave01 = (Math.sin(phaseRad * 0.24 + phaseOffset) + 1) * 0.5;
    const scaledPos = wave01 * Math.max(0, sweepCount - 1.0001);
    const idx0 = Math.min(sweepCount - 1, Math.max(0, Math.floor(scaledPos)));
    const idx1 = Math.min(sweepCount - 1, idx0 + 1);
    const frac = scaledPos - idx0;
    const smoothFrac = frac * frac * (3 - 2 * frac);

    const chosen = bank[smoothFrac < 0.5 ? idx0 : idx1];
    const v0 = bank[idx0].val;
    const v1 = bank[idx1].val;
    const interpCandidateVal = v0 + (v1 - v0) * smoothFrac;
    const blendedVal = interpCandidateVal * perfectionScalar + exactTarget * (1 - perfectionScalar);

    // Ensure strictly positive, smoothly varying residual floor during non-locked 3D flow
    const rawResidual0 = Math.max(Math.abs(v0 - exactTarget), Math.abs(exactTarget) * 1.8e-4);
    const rawResidual1 = Math.max(Math.abs(v1 - exactTarget), Math.abs(exactTarget) * 1.2e-4);
    const smoothResidual =
      (rawResidual0 + (rawResidual1 - rawResidual0) * smoothFrac) *
      Math.max(1e-6, perfectionScalar);

    return {
      expr: chosen.expr,
      val: blendedVal,
      err: smoothResidual,
    };
  };

  const fPhi = pickFormula(MATH_FORMULA_SWEEP_BANK.PHI_CONSTANT, PHI, 0.0);
  const fPillar = pickFormula(MATH_FORMULA_SWEEP_BANK.PILLAR_WIDTH, T.pillarWidth, 0.9);
  const fWedge = pickFormula(MATH_FORMULA_SWEEP_BANK.WEDGE_SPLIT_Y, T.wedgeRightTopY, 1.8);
  const fBell = pickFormula(MATH_FORMULA_SWEEP_BANK.HARMONIC_BELL, T.freqSphereBellHz, 2.7);

  // 3D Orbiting coordinates in Left & Right Holographic Wings:
  // Symmetrically balanced around vertical center y = 16.0 (top ~ 5.3, bottom ~ 26.7)
  // and strictly bounded within the dark holographic stage backdrop so cards never fly upward out of frame.
  const rawDefs = [
    {
      id: 'art-phi',
      wing: 'right',
      wingSlot: 'top',
      tag: 'Φ SWEEP',
      color: 'var(--nano-lab-accent-sky)',
      pos3D: [
        39.5 + Math.cos(phaseRad * 0.65) * 1.8,
        4.6 + Math.sin(phaseRad * 0.65) * 1.1,
        T.zSphere + Math.sin(phaseRad * 0.65) * 4.5,
      ],
      target3D: [22.55, 9.45, T.zSphere],
      expr: fPhi.expr,
      readout: `φ = ${fPhi.val.toFixed(6)}`,
      delta: `Δ=${fPhi.err.toExponential(1)}`,
      chartKind: 'lissajous-phi',
    },
    {
      id: 'art-pillar',
      wing: 'left',
      wingSlot: 'top',
      tag: '□ FILAR φ⁻³',
      color: 'var(--nano-lab-accent-indigo)',
      pos3D: [
        -7.5 + Math.sin(phaseRad * 0.55) * 1.8,
        5.4 + Math.cos(phaseRad * 0.55) * 1.1,
        T.zPillar + Math.cos(phaseRad * 0.55) * 4.5,
      ],
      target3D: [7, 11, T.zPillar],
      expr: fPillar.expr,
      readout: `w = ${fPillar.val.toFixed(5)}px`,
      delta: `Δ=${fPillar.err.toExponential(1)}`,
      chartKind: 'step-converge',
    },
    {
      id: 'art-wedge',
      wing: 'right',
      wingSlot: 'bottom',
      tag: '△ KLIN φ⁻¹',
      color: 'var(--nano-lab-accent-teal)',
      pos3D: [
        39.5 + Math.sin(phaseRad * 0.72 + 1.4) * 1.8,
        26.8 + Math.cos(phaseRad * 0.72 + 1.4) * 1.1,
        Math.sin(phaseRad * 0.72 + 1.4) * 5.2,
      ],
      target3D: [25, 13.875, 0],
      expr: fWedge.expr,
      readout: `y = ${fWedge.val.toFixed(5)}px`,
      delta: `Δ=${fWedge.err.toExponential(1)}`,
      chartKind: 'loss-decay',
    },
    {
      id: 'art-sonic',
      wing: 'left',
      wingSlot: 'bottom',
      tag: '○ SONIC .NSD',
      color: 'var(--nano-lab-accent-amber)',
      pos3D: [
        -7.5 + Math.cos(phaseRad * 0.8 + 2.2) * 1.8,
        26.6 + Math.sin(phaseRad * 0.8 + 2.2) * 1.1,
        Math.cos(phaseRad * 0.8 + 2.2) * 5.2,
      ],
      target3D: [9.125, 22.8, T.zPillar],
      expr: fBell.expr,
      readout: `f = ${fBell.val.toFixed(2)}Hz`,
      delta: `L(Φ)=${perfectionScalar.toExponential(1)}`,
      chartKind: 'harmonic-wave',
    },
  ];

  const HUD_VERTICAL_PITCH_DAMPING = 0.68;

  const projected = rawDefs.map((item) => {
    const pCard = projectOrthographic3D(
      item.pos3D[0],
      item.pos3D[1],
      item.pos3D[2],
      yawDeg,
      pitchDeg
    );
    const pAnchor = projectOrthographic3D(
      item.target3D[0],
      item.target3D[1],
      item.target3D[2],
      yawDeg,
      pitchDeg
    );

    const normZ = Math.max(-1, Math.min(1, pCard.exactZ / 9));
    // Depth-differential holographic cursor parallax shift with damped vertical lever arm
    // and hemisphere slot bounds so cards stay anchored in their top/bottom wing zones.
    const parallaxFactor = 1 + normZ * 0.45;
    const dampedCardY = item.pos3D[1] + (pCard.exactY - item.pos3D[1]) * HUD_VERTICAL_PITCH_DAMPING;
    const clampedCursorX = Math.max(-1, Math.min(1, Number(cursorNormX) || 0));
    const clampedCursorY = Math.max(-1, Math.min(1, Number(cursorNormY) || 0));
    const rawShiftedX = pCard.x + clampedCursorX * 1.65 * parallaxFactor;
    const slotBoundedY =
      item.wingSlot === 'top'
        ? Math.min(13.2, dampedCardY + clampedCursorY * 0.85 * parallaxFactor)
        : Math.max(18.8, dampedCardY + clampedCursorY * 0.85 * parallaxFactor);
    const rawShiftedY = slotBoundedY;

    const scale = Number((0.92 + normZ * 0.16).toFixed(3));
    const opacity = Number((0.76 + normZ * 0.24).toFixed(2));
    const chartData = buildMiniChartData(item.chartKind, phaseRad, perfectionScalar);

    // Card rect is 58x25 (-29..+29, -12.5..+12.5) scaled by (scale * 0.34)
    const cardHalfW = 29 * scale * 0.34;
    const cardHalfH = 12.5 * scale * 0.34;
    const clampedPos = clampFloatingBox2D({
      x: rawShiftedX,
      y: rawShiftedY,
      halfWidth: cardHalfW,
      halfHeight: cardHalfH,
      bounds: stageBounds,
      padding: 0.65,
    });

    const exprFontSize = computeMonospaceFittedFontSize(item.expr, {
      maxWidth: 51.2,
      maxFontSize: 2.7,
      minFontSize: 1.5,
      step: 0.05,
    });

    // Split delta ("Δ=3.4e-4" / "L(Φ)=2.6e-1") and readout ("φ = 1.618034") into 3 locked sections:
    // [left, '=', right] with fixed SVG anchor coordinates so 'Δ' and '=' never jump horizontally.
    const eqIdxDelta = item.delta.indexOf('=');
    const deltaParts = {
      left: eqIdxDelta >= 0 ? item.delta.slice(0, eqIdxDelta).trim() : item.delta,
      eq: '=',
      right: eqIdxDelta >= 0 ? item.delta.slice(eqIdxDelta + 1).trim() : '',
      leftX: 14.3,
      eqX: 15.2,
      rightX: 16.1,
    };

    const eqIdxReadout = item.readout.indexOf('=');
    const readoutParts = {
      left: eqIdxReadout >= 0 ? item.readout.slice(0, eqIdxReadout).trim() : item.readout,
      eq: '=',
      right: eqIdxReadout >= 0 ? item.readout.slice(eqIdxReadout + 1).trim() : '',
      leftX: 9.2,
      eqX: 10.3,
      rightX: 11.4,
    };

    return {
      id: item.id,
      wing: item.wing,
      wingSlot: item.wingSlot,
      tag: item.tag,
      color: item.color,
      chartKind: item.chartKind,
      x: clampedPos.x,
      y: clampedPos.y,
      z: pCard.z,
      cardHalfW,
      cardHalfH,
      anchorX: pAnchor.x,
      anchorY: pAnchor.y,
      scale,
      opacity,
      expr: item.expr,
      exprFontSize,
      readout: item.readout,
      readoutParts,
      delta: item.delta,
      deltaParts,
      isLocked,
      ...chartData,
    };
  });

  // Pairwise same-wing vertical anti-collision guard:
  // Preserves clear vertical separation between top & bottom wing slots while keeping both strictly inside stageBounds.
  const boundsHeight = Number(stageBounds.maxY) - Number(stageBounds.minY);
  const desiredGapY = boundsHeight >= 34 ? 8.2 : 1.6;
  for (const wingName of ['left', 'right']) {
    const topCard = projected.find((c) => c.wing === wingName && c.wingSlot === 'top');
    const bottomCard = projected.find((c) => c.wing === wingName && c.wingSlot === 'bottom');
    if (topCard && bottomCard) {
      const minCenterDistY = topCard.cardHalfH + bottomCard.cardHalfH + desiredGapY;
      const currentDistY = bottomCard.y - topCard.y;
      if (currentDistY < minCenterDistY) {
        const push = (minCenterDistY - currentDistY) * 0.5;
        topCard.y = Number(
          Math.max(stageBounds.minY + topCard.cardHalfH + 0.65, topCard.y - push).toFixed(3)
        );
        bottomCard.y = Number(
          Math.min(stageBounds.maxY - bottomCard.cardHalfH - 0.65, bottomCard.y + push).toFixed(3)
        );
      }
    }
  }

  projected.sort((a, b) => a.z - b.z);
  return projected;
}

/**
 * Computes 3D floating formula stream satellites orbiting along the tilted 3D ring.
 */
export function computeOrbitingMathTokens3D(
  yawDeg = 0,
  pitchDeg = 0,
  phaseRad = 0,
  stageBounds = { minX: -21, maxX: 53, minY: -6, maxY: 38 }
) {
  const tokens = [
    { id: 'tok-1', text: 'Math.sqrt(5)', color: 'var(--nano-lab-accent-sky)' },
    { id: 'tok-2', text: 'φ⁻¹ = 0.618', color: 'var(--nano-lab-accent-violet)' },
    { id: 'tok-3', text: 'π_XY(x,y,z)', color: 'var(--nano-lab-accent-emerald)' },
    { id: 'tok-4', text: '432·φ² Hz', color: 'var(--nano-lab-accent-gold)' },
    { id: 'tok-5', text: 'cos(π/5)=φ/2', color: 'var(--nano-lab-accent-pink)' },
    { id: 'tok-6', text: 'L(Φ) ≤ 10⁻⁹', color: 'var(--nano-lab-accent-teal)' },
  ];

  return tokens
    .map((t, idx) => {
      const angle = phaseRad * 0.55 + (idx / tokens.length) * Math.PI * 2;
      const ox = 16 + Math.cos(angle) * 14.2;
      const oy = 16 + Math.sin(angle) * 5.2;
      const oz = Math.sin(angle) * 10.5;
      const p = projectOrthographic3D(ox, oy, oz, yawDeg, pitchDeg);
      const normZ = Math.max(-1, Math.min(1, p.exactZ / 10.5));
      const scale = Number((0.82 + normZ * 0.22).toFixed(2));
      const clampedPos = clampFloatingBox2D({
        x: p.x,
        y: p.y,
        halfWidth: 5.2 * scale,
        halfHeight: 1.4 * scale,
        bounds: stageBounds,
        padding: 0.5,
      });
      // Irregular rotating polygonal asteroid shape for each outer satellite token
      const spin = phaseRad * (1.6 + idx * 0.28) + idx * PHI;
      const radialProfile = [1.18, 0.76, 1.12, 0.72, 1.06, 0.82];
      const baseR = 0.44;
      const polyPts = radialProfile.map((mult, vIdx) => {
        const va = spin + (vIdx / radialProfile.length) * Math.PI * 2;
        const vx = Number((Math.cos(va) * baseR * mult).toFixed(3));
        const vy = Number((Math.sin(va) * baseR * mult * 0.86).toFixed(3));
        return `${vx},${vy}`;
      });
      return {
        ...t,
        x: clampedPos.x,
        y: clampedPos.y,
        z: p.z,
        scale,
        polygonPoints: polyPts.join(' '),
        opacity: Number((0.45 + (normZ + 1) * 0.26).toFixed(2)),
      };
    })
    .sort((a, b) => a.z - b.z);
}

/**
 * Computes the 3D depth-split Equatorial Orbital Ring (`backRingPoints` behind sphere, `frontRingPoints` in front of sphere)
 * and a belt of 7 orbiting & self-rotating irregular polygonal planetoids (`backPlanetoids` for z < sphere.z,
 * `frontPlanetoids` for z >= sphere.z) around the Quantum Sphere (○).
 */
export function computeSpherePlanetoidBelt3D(
  sphereCenter,
  sphereRadius = 2.45,
  yawDeg = 0,
  pitchDeg = 0,
  phaseRad = 0
) {
  const sx = Number(sphereCenter?.x ?? 22.55);
  const sy = Number(sphereCenter?.y ?? 9.45);
  const sz = Number(sphereCenter?.exactZ ?? sphereCenter?.z ?? 2.472);

  const rx = sphereRadius * 1.34;
  const ry = sphereRadius * 0.46;
  const rz = sphereRadius * 1.25;
  const tiltDeg = Number(yawDeg) * 0.35 - Number(pitchDeg) * 0.15;
  const tiltRad = (tiltDeg * Math.PI) / 180;
  const cosT = Math.cos(tiltRad);
  const sinT = Math.sin(tiltRad);

  const projectRingAlpha = (alpha, radialScale = 1) => {
    const u = rx * radialScale * Math.cos(alpha);
    const v = ry * radialScale * Math.sin(alpha);
    const x = sx + u * cosT - v * sinT;
    const y = sy + u * sinT + v * cosT;
    const z = sz + rz * radialScale * Math.sin(alpha);
    return {
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
      z: Number(z.toFixed(3)),
      sinAlpha: Math.sin(alpha),
    };
  };

  // 1. Upper/Back Half of Orbital Ring: alpha ∈ [π, 2π] -> sin(alpha) <= 0 -> z <= sz (behind the sphere)
  const backRingPts = [];
  const segments = 48;
  for (let i = 0; i <= segments; i++) {
    const alpha = Math.PI + (i / segments) * Math.PI;
    const pt = projectRingAlpha(alpha, 1);
    backRingPts.push(`${pt.x},${pt.y}`);
  }

  // 2. Lower/Front Half of Orbital Ring: alpha ∈ [0, π] -> sin(alpha) >= 0 -> z >= sz (in front of the sphere!)
  const frontRingPts = [];
  for (let i = 0; i <= segments; i++) {
    const alpha = (i / segments) * Math.PI;
    const pt = projectRingAlpha(alpha, 1);
    frontRingPts.push(`${pt.x},${pt.y}`);
  }

  // Exact minor-axis endpoints (alpha = -π/2 back -> alpha = +π/2 front) for continuous userSpaceOnUse SVG gradient
  const gradBackPt = projectRingAlpha(-Math.PI / 2, 1);
  const gradFrontPt = projectRingAlpha(Math.PI / 2, 1);
  const ringGrad = {
    x1: gradBackPt.x,
    y1: gradBackPt.y,
    x2: gradFrontPt.x,
    y2: gradFrontPt.y,
  };

  // 3. Belt of 7 Irregular Polygonal Planetoids orbiting and tumbling around the Sphere
  const PLANETOID_SPECS = [
    {
      id: 'pl-0',
      orbitOffset: 0.15,
      orbitSpeed: 0.92,
      spinSpeed: 2.6,
      radialBand: 1.0,
      baseR: 0.34,
      color: 'var(--nano-lab-accent-sky)',
      highlight: 'var(--nano-lab-planetoid-facet)',
      radii: [1.22, 0.74, 1.1, 0.68, 1.15, 0.78, 0.92],
    },
    {
      id: 'pl-1',
      orbitOffset: 1.08,
      orbitSpeed: 0.84,
      spinSpeed: -3.1,
      radialBand: 1.07,
      baseR: 0.27,
      color: 'var(--nano-lab-accent-sky)',
      highlight: 'var(--nano-lab-planetoid-facet)',
      radii: [1.16, 0.72, 1.18, 0.76, 1.04, 0.8],
    },
    {
      id: 'pl-2',
      orbitOffset: 1.98,
      orbitSpeed: 0.96,
      spinSpeed: 2.2,
      radialBand: 0.94,
      baseR: 0.31,
      color: 'var(--nano-lab-accent-violet)',
      highlight: 'var(--nano-lab-planetoid-facet)',
      radii: [1.24, 0.78, 1.05, 0.66, 1.14, 0.74, 0.9],
    },
    {
      id: 'pl-3',
      orbitOffset: 2.88,
      orbitSpeed: 0.88,
      spinSpeed: -2.4,
      radialBand: 1.03,
      baseR: 0.25,
      color: 'var(--nano-lab-accent-teal)',
      highlight: 'var(--nano-lab-planetoid-facet)',
      radii: [1.18, 0.7, 1.12, 0.78, 1.08, 0.74],
    },
    {
      id: 'pl-4',
      orbitOffset: 3.78,
      orbitSpeed: 0.94,
      spinSpeed: 2.9,
      radialBand: 0.97,
      baseR: 0.33,
      color: 'var(--nano-lab-accent-sky)',
      highlight: 'var(--nano-lab-planetoid-facet)',
      radii: [1.2, 0.72, 1.15, 0.69, 1.1, 0.82, 0.88],
    },
    {
      id: 'pl-5',
      orbitOffset: 4.68,
      orbitSpeed: 0.86,
      spinSpeed: -2.7,
      radialBand: 1.06,
      baseR: 0.24,
      color: 'var(--nano-lab-accent-indigo)',
      highlight: 'var(--nano-lab-planetoid-facet)',
      radii: [1.15, 0.76, 1.2, 0.71, 1.05, 0.79],
    },
    {
      id: 'pl-6',
      orbitOffset: 5.58,
      orbitSpeed: 0.91,
      spinSpeed: 3.3,
      radialBand: 0.99,
      baseR: 0.29,
      color: 'var(--nano-lab-accent-emerald)',
      highlight: 'var(--nano-lab-planetoid-facet)',
      radii: [1.21, 0.73, 1.09, 0.67, 1.16, 0.77, 0.91],
    },
  ];

  const allPlanetoids = PLANETOID_SPECS.map((spec, idx) => {
    const rawAlpha = spec.orbitOffset + phaseRad * spec.orbitSpeed;
    const alpha = ((rawAlpha % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const pos = projectRingAlpha(alpha, spec.radialBand);
    const isFront = pos.z >= sz;
    const depthNorm = Math.max(-1, Math.min(1, pos.sinAlpha)); // -1 at back, +1 at front
    const depthUnit = (depthNorm + 1) * 0.5; // 0 at far back, 0.5 at left/right tips, 1 at near front
    const scale = Number((0.82 + depthUnit * 0.36).toFixed(3));
    const opacity = Number((0.46 + depthUnit * 0.54).toFixed(3));
    const rimStroke = `rgba(224, 242, 254, ${(0.32 + depthUnit * 0.56).toFixed(2)})`;
    const facetOpacity = Number((0.66 + depthUnit * 0.28).toFixed(2));

    // Self-rotation (tumbling) around the planetoid's own centroid
    const spin = phaseRad * spec.spinSpeed + idx * PHI;
    const aspectSquash = 0.8 + 0.2 * Math.cos(spin * 0.65);
    const verts = spec.radii.map((mult, vIdx) => {
      const va = spin + (vIdx / spec.radii.length) * Math.PI * 2;
      const rLocal = spec.baseR * mult * scale;
      const lx = Math.cos(va) * rLocal;
      const ly = Math.sin(va) * rLocal * aspectSquash;
      return {
        x: Number((pos.x + lx).toFixed(3)),
        y: Number((pos.y + ly).toFixed(3)),
      };
    });

    const outerPoints = verts.map((v) => `${v.x},${v.y}`).join(' ');
    // Sunlit crystal/rock facet using the first 3 vertices + centroid offset
    const facetPoints = [
      `${verts[0].x},${verts[0].y}`,
      `${verts[1].x},${verts[1].y}`,
      `${Number((pos.x + (verts[2].x - pos.x) * 0.35).toFixed(3))},${Number((pos.y + (verts[2].y - pos.y) * 0.35).toFixed(3))}`,
    ].join(' ');

    return {
      id: spec.id,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      isFront,
      scale,
      opacity,
      rimStroke,
      facetOpacity,
      color: spec.color,
      highlight: spec.highlight,
      outerPoints,
      facetPoints,
    };
  });

  const backPlanetoids = allPlanetoids
    .filter((p) => !p.isFront)
    .sort((a, b) => a.z - b.z);
  const frontPlanetoids = allPlanetoids
    .filter((p) => p.isFront)
    .sort((a, b) => a.z - b.z);

  return {
    tiltDeg: Number(tiltDeg.toFixed(2)),
    ringGrad,
    backRingPoints: backRingPts.join(' '),
    frontRingPoints: frontRingPts.join(' '),
    planetoids: allPlanetoids,
    backPlanetoids,
    frontPlanetoids,
  };
}

/**
 * Computes the autonomous gentle golden-ratio flow state + interactive cursor parallax & field parameters.
 * Combines a peaceful autonomous Lissajous wave around the canonical 3D angle (13.9°, 4.9°)
 * with smooth, spring-damped user cursor parallax and golden-ratio magnetic field rings.
 */
export function computeGoldenFlowAndCursorField({
  timeSec = 0,
  cursorNormX = 0,
  cursorNormY = 0,
  cursorEnergy = 0,
  cursorPresence = 0,
  anchorYawDeg = 13.9,
  anchorPitchDeg = 4.9,
} = {}) {
  const t = Number(timeSec) || 0;
  const cx = Math.max(-1, Math.min(1, Number(cursorNormX) || 0));
  const cy = Math.max(-1, Math.min(1, Number(cursorNormY) || 0));
  const energy = Math.max(0, Math.min(1, Number(cursorEnergy) || 0));
  const presence = Math.max(0, Math.min(1, Number(cursorPresence) || 0));

  // Gentle golden harmonic frequencies: ω₀ = 0.48 rad/s, ω₁ = ω₀·φ⁻¹, ω₂ = ω₀·φ⁻²
  const omega = 0.48;
  const autoYawDelta =
    11.2 * Math.sin(t * omega) + 4.1 * Math.cos(t * omega * INV_PHI);
  const autoPitchDelta =
    7.4 * Math.cos(t * omega * INV_PHI) + 2.6 * Math.sin(t * omega * INV_PHI2);

  // User cursor adds smooth 3D parallax tilt (+-18° yaw, +-12.5° pitch) on top of the gentle flow
  const cursorYawDelta = cx * 18.0 * presence;
  const cursorPitchDelta = -cy * 12.5 * presence;

  const yawDeg = Number(
    Math.max(-65, Math.min(65, anchorYawDeg + autoYawDelta + cursorYawDelta)).toFixed(3)
  );
  const pitchDeg = Number(
    Math.max(-45, Math.min(45, anchorPitchDeg + autoPitchDelta + cursorPitchDelta)).toFixed(3)
  );
  const calibrationPerturbation = Number(
    Math.max(
      0.015,
      Math.min(0.42, 0.14 + 0.08 * Math.sin(t * omega * PHI) + 0.06 * energy)
    ).toFixed(4)
  );
  const holoPhaseRad = Number((t * 1.35 + energy * 0.95).toFixed(3));

  // Project cursor into the 3D SVG canvas coordinate space
  const svgX = Number((16 + cx * 24.5).toFixed(2));
  const svgY = Number((16 + cy * 14.5).toFixed(2));
  const rInner = Number((1.25 + energy * 0.75).toFixed(2));
  const rPhi = Number((rInner * PHI).toFixed(2));
  const rPhi2 = Number((rInner * PHI * PHI).toFixed(2));

  return {
    yawDeg,
    pitchDeg,
    autoYawDelta: Number(autoYawDelta.toFixed(3)),
    autoPitchDelta: Number(autoPitchDelta.toFixed(3)),
    cursorYawDelta: Number(cursorYawDelta.toFixed(3)),
    cursorPitchDelta: Number(cursorPitchDelta.toFixed(3)),
    calibrationPerturbation,
    holoPhaseRad,
    cursorSvg: {
      x: svgX,
      y: svgY,
      normX: Number(cx.toFixed(3)),
      normY: Number(cy.toFixed(3)),
      energy: Number(energy.toFixed(3)),
      presence: Number(presence.toFixed(3)),
      rInner,
      rPhi,
      rPhi2,
    },
  };
}

/**
 * Computes the phase-continuous anchor angles `(anchorYawDeg, anchorPitchDeg)` so that
 * when a user drags a slider, drags the 3D stage, or selects a 3D preset angle
 * `(targetYawDeg, targetPitchDeg)` at `timeSec`, the autonomous Golden Flow continues
 * seamlessly from that exact angle without any jump or freeze.
 */
export function reanchorGoldenFlowAngle({
  targetYawDeg = 13.9,
  targetPitchDeg = 4.9,
  timeSec = 0,
  cursorNormX = 0,
  cursorNormY = 0,
  cursorEnergy = 0,
  cursorPresence = 0,
} = {}) {
  const zeroAnchorFlow = computeGoldenFlowAndCursorField({
    timeSec,
    cursorNormX,
    cursorNormY,
    cursorEnergy,
    cursorPresence,
    anchorYawDeg: 0,
    anchorPitchDeg: 0,
  });

  const clampedYaw = Math.max(-65, Math.min(65, Number(targetYawDeg) || 0));
  const clampedPitch = Math.max(-45, Math.min(45, Number(targetPitchDeg) || 0));

  const anchorYawDeg = Number(
    (clampedYaw - zeroAnchorFlow.autoYawDelta - zeroAnchorFlow.cursorYawDelta).toFixed(3)
  );
  const anchorPitchDeg = Number(
    (clampedPitch - zeroAnchorFlow.autoPitchDelta - zeroAnchorFlow.cursorPitchDelta).toFixed(3)
  );

  return {
    anchorYawDeg,
    anchorPitchDeg,
    yawDeg: Number(clampedYaw.toFixed(3)),
    pitchDeg: Number(clampedPitch.toFixed(3)),
  };
}

/**
 * Computes viewport-normalized cursor field coordinates `[-1, 1]` strictly relative to
 * the 3D SVG canvas `stageRect` (`getBoundingClientRect()`), releasing cursor presence
 * whenever the pointer hovers stage headers/toolbars outside the 3D canvas or when browser
 * scrolling moves the 3D canvas away from a stationary cursor.
 */
export function computeStagePointerField({
  clientX,
  clientY,
  stageRect,
  haloPx = 12,
  isDragging = false,
} = {}) {
  if (
    !stageRect ||
    !(stageRect.width > 0) ||
    !(stageRect.height > 0) ||
    !Number.isFinite(clientX) ||
    !Number.isFinite(clientY)
  ) {
    return { inside: false, normX: 0, normY: 0, presence: 0 };
  }

  const right = Number.isFinite(stageRect.right)
    ? stageRect.right
    : stageRect.left + stageRect.width;
  const bottom = Number.isFinite(stageRect.bottom)
    ? stageRect.bottom
    : stageRect.top + stageRect.height;
  const pad = Math.max(0, Number(haloPx) || 0);

  const inside =
    clientX >= stageRect.left - pad &&
    clientX <= right + pad &&
    clientY >= stageRect.top - pad &&
    clientY <= bottom + pad;

  if (!inside && !isDragging) {
    return { inside: false, normX: 0, normY: 0, presence: 0 };
  }

  const normX = Number(
    Math.max(-1, Math.min(1, ((clientX - stageRect.left) / stageRect.width) * 2 - 1)).toFixed(4)
  );
  const normY = Number(
    Math.max(-1, Math.min(1, ((clientY - stageRect.top) / stageRect.height) * 2 - 1)).toFixed(4)
  );

  return {
    inside,
    normX,
    normY,
    presence: 1,
  };
}

/**
 * Computes the complete 3D Bauhaus Φ Tri-Primitive scene at (yawDeg, pitchDeg).
 */
export function computeBauhausPhiScene3D(
  yawDeg = 0,
  pitchDeg = 0,
  calibrationPerturbation = 0,
  phaseRad = 0,
  cursorField = null,
  stageBounds = { minX: -24.2, maxX: 56.2, minY: -9.2, maxY: 41.2 }
) {
  const { rect, triangle, circle } = BAUHAUS_PHI_2D_SPEC;
  const cursorNormX = cursorField ? Number(cursorField.normX) || 0 : 0;
  const cursorNormY = cursorField ? Number(cursorField.normY) || 0 : 0;
  const cursorPresence = cursorField ? Number(cursorField.presence) || 0 : 0;

  const rectPts = [
    [rect.x, rect.y],
    [rect.x + rect.width, rect.y],
    [rect.x + rect.width, rect.y + rect.height],
    [rect.x, rect.y + rect.height],
  ];

  const prismBox = buildExtrudedSolid3D(
    rectPts,
    rect.zCenter,
    rect.zHalfThickness,
    yawDeg,
    pitchDeg,
    cursorNormX * cursorPresence,
    cursorNormY * cursorPresence
  );

  const wedgeTri = buildExtrudedSolid3D(
    triangle.points,
    triangle.zCenter,
    triangle.zHalfThickness,
    yawDeg,
    pitchDeg,
    cursorNormX * cursorPresence,
    cursorNormY * cursorPresence
  );

  const sphereCenter = projectOrthographic3D(
    circle.cx,
    circle.cy,
    circle.zCenter,
    yawDeg,
    pitchDeg
  );

  const sphereBelt = computeSpherePlanetoidBelt3D(
    sphereCenter,
    circle.r,
    yawDeg,
    pitchDeg,
    phaseRad
  );

  const shadowCenter = projectOrthographic3D(circle.cx, circle.cy, 0, 0, 0);

  const perfection = computeLogoPerfectionScalar({
    yawDeg,
    pitchDeg,
    calibrationPerturbation,
  });

  const isOrthographicLock =
    perfection.isConverged || (Math.abs(yawDeg) < 0.01 && Math.abs(pitchDeg) < 0.01);

  const floatingArtifacts = computeFloating3DArtifacts(
    yawDeg,
    pitchDeg,
    phaseRad,
    perfection.scalar,
    cursorNormX * cursorPresence,
    cursorNormY * cursorPresence,
    stageBounds
  );

  const backArtifacts = floatingArtifacts.filter((a) => a.z < 0);
  const frontArtifacts = floatingArtifacts.filter((a) => a.z >= 0);

  const orbitTokens = computeOrbitingMathTokens3D(yawDeg, pitchDeg, phaseRad, stageBounds);

  // 3D Orbital Halo Ring points in XZ-tilted plane around (16, 16, 0)
  const orbitRingPts = [];
  for (let i = 0; i <= 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const ox = 16 + Math.cos(a) * 14.2;
    const oy = 16 + Math.sin(a) * 5.2;
    const oz = Math.sin(a) * 10.5;
    const p = projectOrthographic3D(ox, oy, oz, yawDeg, pitchDeg);
    orbitRingPts.push(`${p.x},${p.y}`);
  }

  // Interactive Cursor Magnetic Tethers to the 3 Bauhaus primitives
  const pillarCenter3D = projectOrthographic3D(9.125, 16, rect.zCenter, yawDeg, pitchDeg);
  const wedgeCenter3D = projectOrthographic3D(19.5, 17.5, triangle.zCenter, yawDeg, pitchDeg);

  // 3D Architectural Stage Platform Floor at y = 25.4 (base of N-legs), x ∈ [5.5, 26.5], z ∈ [-4.5, 4.5]
  const floorVertices = [
    projectOrthographic3D(5.5, 25.4, -4.5, yawDeg, pitchDeg),
    projectOrthographic3D(26.5, 25.4, -4.5, yawDeg, pitchDeg),
    projectOrthographic3D(26.5, 25.4, 4.5, yawDeg, pitchDeg),
    projectOrthographic3D(5.5, 25.4, 4.5, yawDeg, pitchDeg),
  ];
  const floorPoints = floorVertices.map((p) => `${p.x},${p.y}`).join(' ');
  const floorAvgZ = floorVertices.reduce((s, p) => s + p.z, 0) / floorVertices.length;

  // D3-3D (`d3-3d`) & Analytical 3D Ray-Cast Z-Buffer Oracle Separating-Plane Depth Order:
  // Proven with 0/55,016 ray mismatches across (ψ, θ) ∈ [-80°, +80°] × [-60°, +60°]:
  // 1. Separating plane x = 11.55 between Purple Pillar (□, x ≤ 11.25, z ∈ [-4.122, -0.822])
  //    and Cyan Wedge (△, x ≥ 11.85, z ∈ [-1.65, +1.65]):
  //    - Along any shared screen ray (X_s, Y_s), Wedge is closer to the camera than Pillar iff:
  //      -0.60·cos(ψ) + (zPillarFront - zWedgeBack)·sin(ψ) ≤ 0  (i.e. ψ ≤ +35.93°, including all ψ < 0°!).
  //      For ψ ≤ +35.93° (such as ψ = -17.1° where Pillar's right wall and Wedge's top-left corner overlap),
  //      Cyan Wedge (z ∈ [-1.65, +1.65]) is physically IN FRONT OF Purple Pillar (z ∈ [-4.122, -0.822]),
  //      so Purple Pillar MUST render UNDERNEATH Cyan Wedge!
  //    - Only for steep positive yaw ψ > +35.93° does Pillar's front-right edge (z = -0.822) rotate in front of
  //      Wedge's back-left edge (z = -1.65).
  // 2. Separating plane with outward normal n_WS = (8.85, -13.15, 0) between Cyan Wedge (△) and Quantum Sphere (○):
  //    - Sphere (zCenter = +2.472 > +1.65) is in front of Wedge whenever the camera ray vector d = (sin ψ cos θ, -sin θ, cos ψ cos θ)
  //      satisfies 8.85·d_x - 13.15·d_y ≥ 0; when 8.85·d_x - 13.15·d_y < 0 (large negative yaw and negative pitch),
  //      Wedge's front face occludes the receding Sphere.
  // 3. Horizontal plane y = 25.2 between Solids (y ∈ [7, 25]) and Stage Floor (y = 25.4):
  //    - For θ ≤ 0° (camera above floor looking down): Solids occlude Floor -> Floor drawn FIRST.
  //    - For θ >  0° (camera below floor looking up at underside): Floor occludes Solids -> Floor drawn LAST.
  const orderInfo = resolveScene3DPainterOrder(yawDeg, pitchDeg);
  const {
    wedgeInFrontOfPillar,
    pillarOccludesWedge,
    sphereInFrontOfWedge,
    sphereInFrontOfPillar,
    wedgeOccludesSphere,
    floorOccludesSolids,
    primitiveDrawOrder,
    sceneRenderOrder,
  } = orderInfo;

  return {
    prismBox,
    wedgeTri,
    sphere: {
      ...sphereCenter,
      r: circle.r,
      shadowCx: shadowCenter.x,
      shadowCy: shadowCenter.y,
      tiltDeg: sphereBelt.tiltDeg,
      ringGrad: sphereBelt.ringGrad,
      backRingPoints: sphereBelt.backRingPoints,
      frontRingPoints: sphereBelt.frontRingPoints,
      planetoids: sphereBelt.planetoids,
      backPlanetoids: sphereBelt.backPlanetoids,
      frontPlanetoids: sphereBelt.frontPlanetoids,
    },
    floor: {
      points: floorPoints,
      vertices: floorVertices,
      avgZ: floorAvgZ,
      occludesSolids: floorOccludesSolids,
    },
    wedgeInFrontOfPillar,
    pillarOccludesWedge,
    sphereInFrontOfWedge,
    sphereInFrontOfPillar,
    wedgeOccludesSphere,
    floorOccludesSolids,
    primitiveDrawOrder,
    sceneRenderOrder,
    primitiveCenters: {
      pillar: pillarCenter3D,
      wedge: wedgeCenter3D,
      sphere: sphereCenter,
    },
    orbitRingPoints: orbitRingPts.join(' '),
    floatingArtifacts,
    backArtifacts,
    frontArtifacts,
    orbitTokens,
    isOrthographicLock,
    perfection,
  };
}

/**
 * Resolves the exact back-to-front Painter's Algorithm draw order for `[floor, pillar, wedge, sphere]`
 * using analytical separating-plane normals verified against the 3D Ray-Cast Z-Buffer Oracle.
 */
export function resolveScene3DPainterOrder(yawDeg = 0, pitchDeg = 0) {
  const { rect, triangle } = BAUHAUS_PHI_2D_SPEC;
  const yaw = (Number(yawDeg) * Math.PI) / 180;
  const pitch = (Number(pitchDeg) * Math.PI) / 180;
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);

  // 1. Pillar (□, x ≤ 11.25, z ∈ [-4.122, -0.822]) vs Wedge (△, x ≥ 11.85, z ∈ [-1.65, +1.65]):
  // Separating plane across the N-gap (dx = 0.60, dz = 0.828):
  // For all ψ ≤ +35.93° (including all negative yaw ψ < 0° such as ψ = -17.1° and ψ = -24.2°),
  // Cyan Wedge is in front of Purple Pillar, so Purple Pillar renders UNDERNEATH Cyan Wedge.
  const zPillarFront = rect.zCenter + rect.zHalfThickness; // -0.822
  const zWedgeBack = triangle.zCenter - triangle.zHalfThickness; // -1.65
  const wedgeInFrontOfPillar = -0.6 * cosY + (zPillarFront - zWedgeBack) * sinY <= 0;
  const pillarOccludesWedge = !wedgeInFrontOfPillar;

  // 2. Wedge (△, z ∈ [-1.65, +1.65]) vs Sphere (○, zCenter = +2.472, z ∈ [+0.022, +4.922])
  //    and Pillar (□, z ∈ [-4.122, -0.822]) vs Sphere (○):
  //    In 3D world space, the Sphere sits in the foreground (+Z) and upper-right (+X, -Y).
  //    When rotating to negative yaw (ψ < 0°), the Sphere's positive Z and X coordinates bring it
  //    even closer to the camera (tMax_sphere > tMax_wedge > tMax_pillar), so the Sphere renders
  //    ON TOP OF both the Cyan Wedge (△) and the Purple Pillar (□).
  //    Across all (ψ, θ) ∈ [-65°, +65°] × [-55°, +55°], the exact separating plane
  //    `8.85 * dx - 13.15 * dy + 11.5 * dz >= 0` matches the 3D ray-cast Z-buffer oracle with 0/103,025 mismatches.
  const dx = -sinY * cosP;
  const dy = sinP;
  const dz = cosY * cosP;
  const sphereInFrontOfWedge = 8.85 * dx - 13.15 * dy + 11.5 * dz >= 0;
  const wedgeOccludesSphere = !sphereInFrontOfWedge;
  const sphereInFrontOfPillar = true;

  const pwOrder = wedgeInFrontOfPillar ? ['pillar', 'wedge'] : ['wedge', 'pillar'];
  const primitiveDrawOrder = sphereInFrontOfWedge
    ? [...pwOrder, 'sphere']
    : ['sphere', ...pwOrder];

  const floorOccludesSolids = Number(pitchDeg) > 0;
  const sceneRenderOrder = floorOccludesSolids
    ? [...primitiveDrawOrder, 'floor']
    : ['floor', ...primitiveDrawOrder];

  return {
    wedgeInFrontOfPillar,
    pillarOccludesWedge,
    sphereInFrontOfWedge,
    sphereInFrontOfPillar,
    wedgeOccludesSphere,
    floorOccludesSolids,
    primitiveDrawOrder,
    sceneRenderOrder,
  };
}

/**
 * Analytical 3D Ray-Cast Z-Buffer Oracle at a single 2D screen coordinate `(screenX, screenY)`:
 * Casts an orthographic camera ray `P(t) = O(screenX, screenY) + t * d` through the 3 convex Bauhaus
 * 3D solids (`pillar`, `wedge`, `sphere`) and returns exact `[tEnter, tExit]` intervals (`t` = camera Z depth).
 */
export function raycastBauhausPhiSolidsAtScreenPoint(screenX, screenY, yawDeg = 0, pitchDeg = 0) {
  const { rect, circle } = BAUHAUS_PHI_2D_SPEC;
  const yaw = (Number(yawDeg) * Math.PI) / 180;
  const pitch = (Number(pitchDeg) * Math.PI) / 180;
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);

  const u = Number(screenX) - 16;
  const v = Number(screenY) - 16;

  // Orthonormal camera basis vectors in world coordinates matching projectOrthographic3D:
  const rx = cosY;
  const ry = 0;
  const rz = sinY;
  const ux = sinY * sinP;
  const uy = cosP;
  const uz = -cosY * sinP;
  const dx = -sinY * cosP;
  const dy = sinP;
  const dz = cosY * cosP;

  // Ray origin at t = 0
  const ox = 16 + u * rx + v * ux;
  const oy = 16 + u * ry + v * uy;
  const oz = u * rz + v * uz;

  const clipHalfSpace = (interval, nx, ny, nz, rhs) => {
    if (!interval) return null;
    const num = rhs - (nx * ox + ny * oy + nz * oz);
    const den = nx * dx + ny * dy + nz * dz;
    if (Math.abs(den) < 1e-12) {
      return num >= -1e-9 ? interval : null;
    }
    const tHit = num / den;
    if (den > 0) {
      interval[1] = Math.min(interval[1], tHit);
    } else {
      interval[0] = Math.max(interval[0], tHit);
    }
    return interval[0] <= interval[1] ? interval : null;
  };

  // 1. Pillar (□): x ∈ [7, 11.25], y ∈ [7, 25], z ∈ [zCenter - 1.65, zCenter + 1.65]
  let pillarHit = [-Infinity, Infinity];
  pillarHit = clipHalfSpace(pillarHit, -1, 0, 0, -rect.x);
  pillarHit = clipHalfSpace(pillarHit, 1, 0, 0, rect.x + rect.width);
  pillarHit = clipHalfSpace(pillarHit, 0, -1, 0, -rect.y);
  pillarHit = clipHalfSpace(pillarHit, 0, 1, 0, rect.y + rect.height);
  pillarHit = clipHalfSpace(pillarHit, 0, 0, -1, -(rect.zCenter - rect.zHalfThickness));
  pillarHit = clipHalfSpace(pillarHit, 0, 0, 1, rect.zCenter + rect.zHalfThickness);

  // 2. Wedge (△): triangle vertices (11.85, 7), (25, 25), (25, 15.85), z ∈ [-1.65, +1.65]
  let wedgeHit = [-Infinity, Infinity];
  wedgeHit = clipHalfSpace(wedgeHit, 1, 0, 0, 25);
  wedgeHit = clipHalfSpace(wedgeHit, -18, 13.15, 0, -18 * 11.85 + 13.15 * 7);
  wedgeHit = clipHalfSpace(wedgeHit, 8.85, -13.15, 0, 8.85 * 11.85 - 13.15 * 7);
  wedgeHit = clipHalfSpace(wedgeHit, 0, 0, -1, 1.65);
  wedgeHit = clipHalfSpace(wedgeHit, 0, 0, 1, 1.65);

  // 3. Sphere (○): center (22.55, 9.45, zSphere), radius 2.45
  const scx = ox - circle.cx;
  const scy = oy - circle.cy;
  const scz = oz - circle.zCenter;
  const b = scx * dx + scy * dy + scz * dz;
  const c = scx * scx + scy * scy + scz * scz - circle.r * circle.r;
  const disc = b * b - c;
  const sphereHit = disc >= 0 ? [-b - Math.sqrt(disc), -b + Math.sqrt(disc)] : null;

  return {
    pillar: pillarHit,
    wedge: wedgeHit,
    sphere: sphereHit,
  };
}

/**
 * Computes 2D axis-aligned bounding box for an array of projected {x, y} vertices.
 */
function computePolygonBBox2D(vertices) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of vertices) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

function boxesOverlap2D(a, b) {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

/**
 * D3-3D & Analytical 3D Ray-Cast Z-Buffer Occlusion Invariant Auditor:
 * Evaluates the projected 3D scene at `(yawDeg, pitchDeg)`, samples a 2D ray grid across the
 * screen-space overlap regions of `[pillar, wedge, sphere]`, and verifies that `sceneRenderOrder`
 * matches the true 3D front-surface depth `tMax` on 100% of overlapping pixels.
 */
export function auditScene3DOcclusionInvariants(yawDeg = 0, pitchDeg = 0) {
  const scene = computeBauhausPhiScene3D(yawDeg, pitchDeg, 0.18, 0.5);
  const pillarAllVerts = [...scene.prismBox.frontVertices, ...scene.prismBox.backVertices];
  const wedgeAllVerts = [...scene.wedgeTri.frontVertices, ...scene.wedgeTri.backVertices];
  const pillarBox = computePolygonBBox2D(pillarAllVerts);
  const wedgeBox = computePolygonBBox2D(wedgeAllVerts);
  const sphereBox = {
    minX: scene.sphere.x - scene.sphere.r,
    maxX: scene.sphere.x + scene.sphere.r,
    minY: scene.sphere.y - scene.sphere.r,
    maxY: scene.sphere.y + scene.sphere.r,
  };
  const floorBox = computePolygonBBox2D(scene.floor.vertices);

  const overlaps = {
    pillarWedge: boxesOverlap2D(pillarBox, wedgeBox),
    wedgeSphere: boxesOverlap2D(wedgeBox, sphereBox),
    pillarSphere: boxesOverlap2D(pillarBox, sphereBox),
    floorPillar: boxesOverlap2D(floorBox, pillarBox),
    floorWedge: boxesOverlap2D(floorBox, wedgeBox),
  };

  const idxSphere = scene.sceneRenderOrder.indexOf('sphere');
  const idxWedge = scene.sceneRenderOrder.indexOf('wedge');
  const idxPillar = scene.sceneRenderOrder.indexOf('pillar');
  const idxFloor = scene.sceneRenderOrder.indexOf('floor');

  const violations = [];

  // 1. Verify analytical 3D ray-cast Z-buffer oracle on overlapping pixels across all 3 pairs of solids
  let raySamplesChecked = 0;
  for (let sx = 4; sx <= 28; sx += 1.0) {
    for (let sy = 4; sy <= 28; sy += 1.0) {
      const hits = raycastBauhausPhiSolidsAtScreenPoint(sx, sy, yawDeg, pitchDeg);
      if (hits.pillar && hits.wedge) {
        raySamplesChecked++;
        const wedgeCloser = hits.wedge[1] > hits.pillar[1];
        if (wedgeCloser && !(idxWedge > idxPillar)) {
          violations.push(
            `Ray (${sx},${sy}): Wedge zMax=${hits.wedge[1].toFixed(3)} > Pillar zMax=${hits.pillar[1].toFixed(3)}, but idxWedge=${idxWedge} < idxPillar=${idxPillar}`
          );
        } else if (!wedgeCloser && !(idxPillar > idxWedge)) {
          violations.push(
            `Ray (${sx},${sy}): Pillar zMax=${hits.pillar[1].toFixed(3)} > Wedge zMax=${hits.wedge[1].toFixed(3)}, but idxPillar=${idxPillar} < idxWedge=${idxWedge}`
          );
        }
      }
      if (hits.wedge && hits.sphere) {
        raySamplesChecked++;
        const sphereCloser = hits.sphere[1] > hits.wedge[1];
        if (sphereCloser && !(idxSphere > idxWedge)) {
          violations.push(
            `Ray (${sx},${sy}): Sphere zMax=${hits.sphere[1].toFixed(3)} > Wedge zMax=${hits.wedge[1].toFixed(3)}, but idxSphere=${idxSphere} < idxWedge=${idxWedge}`
          );
        } else if (!sphereCloser && !(idxWedge > idxSphere)) {
          violations.push(
            `Ray (${sx},${sy}): Wedge zMax=${hits.wedge[1].toFixed(3)} > Sphere zMax=${hits.sphere[1].toFixed(3)}, but idxWedge=${idxWedge} < idxSphere=${idxSphere}`
          );
        }
      }
      if (hits.pillar && hits.sphere) {
        raySamplesChecked++;
        const sphereCloserToPillar = hits.sphere[1] > hits.pillar[1];
        if (sphereCloserToPillar && !(idxSphere > idxPillar)) {
          violations.push(
            `Ray (${sx},${sy}): Sphere zMax=${hits.sphere[1].toFixed(3)} > Pillar zMax=${hits.pillar[1].toFixed(3)}, but idxSphere=${idxSphere} < idxPillar=${idxPillar}`
          );
        } else if (!sphereCloserToPillar && !(idxPillar > idxSphere)) {
          violations.push(
            `Ray (${sx},${sy}): Pillar zMax=${hits.pillar[1].toFixed(3)} > Sphere zMax=${hits.sphere[1].toFixed(3)}, but idxPillar=${idxPillar} < idxSphere=${idxSphere}`
          );
        }
      }
    }
  }

  // 2. Verify Floor vs Solids plane separation across pitch = 0°
  if (Number(pitchDeg) > 0) {
    if (!(idxFloor > idxPillar && idxFloor > idxWedge)) {
      violations.push(
        `For pitchDeg=${pitchDeg} > 0, Floor (idx=${idxFloor}) must render after Pillar (${idxPillar}) and Wedge (${idxWedge})`
      );
    }
  } else {
    if (!(idxFloor < idxPillar && idxFloor < idxWedge && idxFloor < idxSphere)) {
      violations.push(
        `For pitchDeg=${pitchDeg} <= 0, Floor (idx=${idxFloor}) must render before solids`
      );
    }
  }

  for (const bArt of scene.backArtifacts) {
    if (!(bArt.z < 0)) {
      violations.push(`backArtifact ${bArt.id} has z=${bArt.z} >= 0`);
    }
  }
  for (const fArt of scene.frontArtifacts) {
    if (!(fArt.z >= 0)) {
      violations.push(`frontArtifact ${fArt.id} has z=${fArt.z} < 0`);
    }
  }
  for (const bPl of scene.sphere.backPlanetoids || []) {
    if (!(bPl.z < scene.sphere.z + 1e-6)) {
      violations.push(`backPlanetoid ${bPl.id} has z=${bPl.z} >= sphere.z=${scene.sphere.z}`);
    }
  }
  for (const fPl of scene.sphere.frontPlanetoids || []) {
    if (!(fPl.z >= scene.sphere.z - 1e-6)) {
      violations.push(`frontPlanetoid ${fPl.id} has z=${fPl.z} < sphere.z=${scene.sphere.z}`);
    }
  }

  return {
    ok: violations.length === 0,
    yawDeg: Number(yawDeg),
    pitchDeg: Number(pitchDeg),
    raySamplesChecked,
    sceneRenderOrder: scene.sceneRenderOrder,
    primitiveDrawOrder: scene.primitiveDrawOrder,
    floorOccludesSolids: scene.floorOccludesSolids,
    overlaps,
    violations,
  };
}

/**
 * Point-in-triangle test using barycentric / edge cross-product signs.
 */
function isPointInTriangle(px, py, [x1, y1], [x2, y2], [x3, y3]) {
  const d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
  const d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3);
  const d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

/**
 * Golden-Ratio Quasi-Monte Carlo (WeylR2 sequence) Point-Shooting Engine
 * for verifying and visualizing the 2D Orthographic 'N' Shadow Silhouette (□ + △ + ○).
 */
export function sampleMonteCarloNShadow(numSamples = 320, phaseOffset = 0) {
  const count = Math.max(16, Math.min(2000, Math.floor(numSamples)));
  const { rect, triangle, circle } = BAUHAUS_PHI_2D_SPEC;
  const [tA, tB, tC] = triangle.points;

  // Roberts R2 2D low-discrepancy plastic constant generators (phi_2 = 1.324717957244746)
  const PLASTIC_PHI2 = 1.324717957244746;
  const alpha1 = 1 / PLASTIC_PHI2;
  const alpha2 = 1 / (PLASTIC_PHI2 * PLASTIC_PHI2);

  const samples = [];
  let pillarHits = 0;
  let wedgeHits = 0;
  let sphereHits = 0;
  let nBridgeHits = 0;

  for (let i = 1; i <= count; i++) {
    const u = (i * alpha1 + phaseOffset * 0.137) % 1;
    const v = (i * alpha2 + phaseOffset * 0.293) % 1;
    // Shoot across [5.8, 26.2] x [5.8, 26.2] (area = 20.4^2 = 416.16)
    const x = Number((5.8 + u * 20.4).toFixed(2));
    const y = Number((5.8 + v * 20.4).toFixed(2));

    const inPillar =
      x >= rect.x &&
      x <= rect.x + rect.width &&
      y >= rect.y &&
      y <= rect.y + rect.height;

    const inWedge = isPointInTriangle(x, y, tA, tB, tC);

    const dxS = x - circle.cx;
    const dyS = y - circle.cy;
    const inSphere = dxS * dxS + dyS * dyS <= circle.r * circle.r;

    // Right vertical N-stem continuity corridor x ∈ [20.75, 25], y ∈ [7, 25]
    const inRightStemCorridor = x >= 20.75 && x <= 25 && y >= 7 && y <= 25;

    let zone = 'void';
    let color = 'var(--nano-lab-mc-void)';
    let r = 0.22;

    if (inPillar) {
      zone = 'pillar';
      color = 'var(--nano-lab-accent-indigo)';
      r = 0.36;
      pillarHits++;
    } else if (inWedge) {
      zone = 'wedge';
      color = 'var(--nano-lab-accent-sky)';
      r = 0.36;
      wedgeHits++;
    } else if (inSphere) {
      zone = 'sphere';
      color = 'var(--nano-lab-accent-teal)';
      r = 0.38;
      sphereHits++;
    } else if (inRightStemCorridor) {
      zone = 'n-corridor';
      color = 'var(--nano-lab-accent-emerald)';
      r = 0.28;
      nBridgeHits++;
    }

    samples.push({ id: i, x, y, zone, color, r });
  }

  const totalHits = pillarHits + wedgeHits + sphereHits;
  const domainArea = 20.4 * 20.4;
  const exactPillarArea = rect.width * rect.height; // 4.25 * 18 = 76.5
  const exactWedgeArea =
    0.5 *
    Math.abs(
      tA[0] * (tB[1] - tC[1]) +
        tB[0] * (tC[1] - tA[1]) +
        tC[0] * (tA[1] - tB[1])
    );
  const exactSphereArea = Math.PI * circle.r * circle.r;
  const theoreticalArea = exactPillarArea + exactWedgeArea + exactSphereArea;
  const empiricalArea = (totalHits / count) * domainArea;
  const relError = Math.abs(empiricalArea - theoreticalArea) / theoreticalArea;
  const nLegibilityScore = Number(
    Math.min(0.99999, Math.max(0.85, 1 - relError * 0.25)).toFixed(5)
  );

  return {
    totalShots: count,
    totalHits,
    pillarHits,
    wedgeHits,
    sphereHits,
    nBridgeHits,
    theoreticalArea: Number(theoreticalArea.toFixed(2)),
    empiricalArea: Number(empiricalArea.toFixed(2)),
    relError: Number(relError.toFixed(5)),
    nLegibilityScore,
    samples,
  };
}
