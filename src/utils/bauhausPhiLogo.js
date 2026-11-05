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
 * Generates rich mini SVG chart primitives (sparkline, secondary wave, shaded area, bars, cursor)
 * for each 3D floating holographic card.
 */
function buildMiniChartData(kind, phaseRad = 0, scalar = 0) {
  const pts = [];
  const secPts = [];
  const W = 44;
  const H = 13;
  const steps = 18;

  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = Number((u * W).toFixed(1));
    let yNorm = 0.5;
    let secNorm = 0.5;

    if (kind === 'harmonic-wave') {
      const freq = 2.4 + (1 - scalar) * PHI;
      yNorm = 0.5 - 0.42 * Math.sin(u * Math.PI * freq + phaseRad) * Math.exp(-u * 0.35);
      secNorm = 0.5 - 0.28 * Math.cos(u * Math.PI * freq * PHI - phaseRad * 0.8);
    } else if (kind === 'loss-decay') {
      yNorm = 0.88 - 0.76 * Math.exp(-u * 3.8 * (1.2 - scalar * 0.5));
      secNorm = 0.88 - 0.76 * (1 - u);
    } else if (kind === 'lissajous-phi') {
      yNorm = 0.5 - 0.42 * Math.sin(u * Math.PI * 2 * PHI + phaseRad * 0.9) * Math.cos(u * Math.PI);
      secNorm = 0.5 + 0.32 * Math.cos(u * Math.PI * PHI - phaseRad * 0.6);
    } else if (kind === 'step-converge') {
      const damped = Math.cos(u * Math.PI * 3.2 + phaseRad * 0.7) * Math.exp(-u * 2.4);
      yNorm = 0.5 - 0.42 * damped;
      secNorm = 0.5 - 0.42 * Math.exp(-u * 2.4);
    }

    const y = Number(Math.max(1, Math.min(H - 1, yNorm * H)).toFixed(1));
    const sy = Number(Math.max(1, Math.min(H - 1, secNorm * H)).toFixed(1));
    pts.push({ x, y });
    secPts.push({ x, y: sy });
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
    const bh = Number(Math.max(1.5, mag * (H - 2.5)).toFixed(1));
    const by = Number((H - 0.8 - bh).toFixed(1));
    bars.push({ x: bx, y: by, w: 4.2, h: bh });
  }

  // Animated playhead cursor along the primary curve
  const cursorIdx = Math.min(
    pts.length - 1,
    Math.max(0, Math.floor(((Math.sin(phaseRad * 0.9) + 1) * 0.5) * (pts.length - 1)))
  );
  const cursorPoint = pts[cursorIdx] || { x: W / 2, y: H / 2 };

  return {
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
  cursorNormY = 0
) {
  const T = BAUHAUS_PHI_EXACT_TARGETS;
  const isLocked = perfectionScalar <= 1e-9;

  const pickFormula = (bank, exactTarget) => {
    if (isLocked || perfectionScalar < 0.01) {
      const last = bank[bank.length - 1];
      return {
        expr: last.expr,
        val: last.val,
        err: Math.abs(last.val - exactTarget),
      };
    }
    const idx = Math.min(
      bank.length - 2,
      Math.max(0, Math.floor(((Math.sin(phaseRad * 1.35) + 1) * 0.5) * (bank.length - 1)))
    );
    const chosen = bank[idx];
    const blendedVal = chosen.val * perfectionScalar + exactTarget * (1 - perfectionScalar);
    return {
      expr: chosen.expr,
      val: blendedVal,
      err: Math.abs(blendedVal - exactTarget),
    };
  };

  const fPhi = pickFormula(MATH_FORMULA_SWEEP_BANK.PHI_CONSTANT, PHI);
  const fPillar = pickFormula(MATH_FORMULA_SWEEP_BANK.PILLAR_WIDTH, T.pillarWidth);
  const fWedge = pickFormula(MATH_FORMULA_SWEEP_BANK.WEDGE_SPLIT_Y, T.wedgeRightTopY);
  const fBell = pickFormula(MATH_FORMULA_SWEEP_BANK.HARMONIC_BELL, T.freqSphereBellHz);

  // 3D Orbiting coordinates in Left & Right Holographic Wings (zero overlap with central [7..25] sculpture)
  const rawDefs = [
    {
      id: 'art-phi',
      tag: 'Φ SWEEP',
      color: '#38bdf8',
      pos3D: [
        39.5 + Math.cos(phaseRad * 0.65) * 1.8,
        5.8 + Math.sin(phaseRad * 0.65) * 1.4,
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
      tag: '□ FILAR φ⁻³',
      color: '#818cf8',
      pos3D: [
        -7.5 + Math.sin(phaseRad * 0.55) * 1.8,
        6.5 + Math.cos(phaseRad * 0.55) * 1.4,
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
      tag: '△ KLIN φ⁻¹',
      color: '#2dd4bf',
      pos3D: [
        39.5 + Math.sin(phaseRad * 0.72 + 1.4) * 1.8,
        25.2 + Math.cos(phaseRad * 0.72 + 1.4) * 1.3,
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
      tag: '○ SONIC .NSD',
      color: '#f59e0b',
      pos3D: [
        -7.5 + Math.cos(phaseRad * 0.8 + 2.2) * 1.8,
        25.4 + Math.sin(phaseRad * 0.8 + 2.2) * 1.3,
        Math.cos(phaseRad * 0.8 + 2.2) * 5.2,
      ],
      target3D: [13.25, 7, 0],
      expr: fBell.expr,
      readout: `f = ${fBell.val.toFixed(2)}Hz`,
      delta: `L(Φ)=${perfectionScalar.toExponential(1)}`,
      chartKind: 'harmonic-wave',
    },
  ];

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
    // Depth-differential holographic cursor parallax shift (cards at z > 0 glide further than cards at z < 0)
    const parallaxFactor = 1 + normZ * 0.45;
    const shiftedX = Number((pCard.x + cursorNormX * 1.65 * parallaxFactor).toFixed(3));
    const shiftedY = Number((pCard.y + cursorNormY * 1.15 * parallaxFactor).toFixed(3));

    const scale = Number((0.92 + normZ * 0.16).toFixed(3));
    const opacity = Number((0.76 + normZ * 0.24).toFixed(2));
    const chartData = buildMiniChartData(item.chartKind, phaseRad, perfectionScalar);

    return {
      id: item.id,
      tag: item.tag,
      color: item.color,
      chartKind: item.chartKind,
      x: shiftedX,
      y: shiftedY,
      z: pCard.z,
      anchorX: pAnchor.x,
      anchorY: pAnchor.y,
      scale,
      opacity,
      expr: item.expr,
      readout: item.readout,
      delta: item.delta,
      isLocked,
      ...chartData,
    };
  });

  projected.sort((a, b) => a.z - b.z);
  return projected;
}

/**
 * Computes 3D floating formula stream satellites orbiting along the tilted 3D ring.
 */
export function computeOrbitingMathTokens3D(yawDeg = 0, pitchDeg = 0, phaseRad = 0) {
  const tokens = [
    { id: 'tok-1', text: 'Math.sqrt(5)', color: '#38bdf8' },
    { id: 'tok-2', text: 'φ⁻¹ = 0.618', color: '#a78bfa' },
    { id: 'tok-3', text: 'π_XY(x,y,z)', color: '#34d399' },
    { id: 'tok-4', text: '432·φ² Hz', color: '#fbbf24' },
    { id: 'tok-5', text: 'cos(π/5)=φ/2', color: '#f472b6' },
    { id: 'tok-6', text: 'L(Φ) ≤ 10⁻⁹', color: '#2dd4bf' },
  ];

  return tokens
    .map((t, idx) => {
      const angle = phaseRad * 0.55 + (idx / tokens.length) * Math.PI * 2;
      const ox = 16 + Math.cos(angle) * 14.2;
      const oy = 16 + Math.sin(angle) * 5.2;
      const oz = Math.sin(angle) * 10.5;
      const p = projectOrthographic3D(ox, oy, oz, yawDeg, pitchDeg);
      const normZ = Math.max(-1, Math.min(1, p.exactZ / 10.5));
      return {
        ...t,
        x: p.x,
        y: p.y,
        z: p.z,
        scale: Number((0.82 + normZ * 0.22).toFixed(2)),
        opacity: Number((0.45 + (normZ + 1) * 0.26).toFixed(2)),
      };
    })
    .sort((a, b) => a.z - b.z);
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
    Math.max(-65, Math.min(65, anchorYawDeg + autoYawDelta + cursorYawDelta)).toFixed(2)
  );
  const pitchDeg = Number(
    Math.max(-45, Math.min(45, anchorPitchDeg + autoPitchDelta + cursorPitchDelta)).toFixed(2)
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
    autoYawDelta: Number(autoYawDelta.toFixed(2)),
    autoPitchDelta: Number(autoPitchDelta.toFixed(2)),
    cursorYawDelta: Number(cursorYawDelta.toFixed(2)),
    cursorPitchDelta: Number(cursorPitchDelta.toFixed(2)),
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
 * Computes the complete 3D Bauhaus Φ Tri-Primitive scene at (yawDeg, pitchDeg).
 */
export function computeBauhausPhiScene3D(
  yawDeg = 0,
  pitchDeg = 0,
  calibrationPerturbation = 0,
  phaseRad = 0,
  cursorField = null
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
    cursorNormY * cursorPresence
  );

  const backArtifacts = floatingArtifacts.filter((a) => a.z < 0);
  const frontArtifacts = floatingArtifacts.filter((a) => a.z >= 0);

  const orbitTokens = computeOrbitingMathTokens3D(yawDeg, pitchDeg, phaseRad);

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

  return {
    prismBox,
    wedgeTri,
    sphere: {
      ...sphereCenter,
      r: circle.r,
      shadowCx: shadowCenter.x,
      shadowCy: shadowCenter.y,
    },
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
    let color = 'rgba(148, 163, 184, 0.26)';
    let r = 0.22;

    if (inPillar) {
      zone = 'pillar';
      color = '#818cf8';
      r = 0.36;
      pillarHits++;
    } else if (inWedge) {
      zone = 'wedge';
      color = '#22d3ee';
      r = 0.36;
      wedgeHits++;
    } else if (inSphere) {
      zone = 'sphere';
      color = '#38bdf8';
      r = 0.38;
      sphereHits++;
    } else if (inRightStemCorridor) {
      zone = 'n-corridor';
      color = '#10b981';
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
