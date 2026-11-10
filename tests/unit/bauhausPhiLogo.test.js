import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PHI,
  INV_PHI,
  INV_PHI2,
  INV_PHI3,
  BAUHAUS_PHI_EXACT_TARGETS,
  BAUHAUS_PHI_2D_SPEC,
  NANO_UI_SONIC_LOGO_NSD,
  MATH_FORMULA_SWEEP_BANK,
  projectOrthographic3D,
  buildExtrudedSolid3D,
  computeLogoPerfectionScalar,
  evaluateMiniChartWavePoint,
  buildMiniChartData,
  computeFloating3DArtifacts,
  computeGoldenFlowAndCursorField,
  reanchorGoldenFlowAngle,
  computeBauhausPhiScene3D,
  auditScene3DOcclusionInvariants,
  sampleMonteCarloNShadow,
} from '../../src/utils/bauhausPhiLogo.js';
import { measureSafeStageBounds } from '../../src/utils/selectPositioning.js';
import {
  createKeyController,
  stepWrappedIndex,
} from '../../src/utils/key-controller.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Bauhaus Φ Tri-Primitive (□ + △ + ○) & Perfection Scalar L(Φ): 1 -> 0 <= 1e-9', () => {
  it('satisfies exact Golden Ratio algebraic identities (φ^-1 + φ^-2 = 1, φ^-3 + 2·φ^-2 = 1)', () => {
    assert.ok(Math.abs(PHI - 1.618033988749895) < 1e-12);
    assert.ok(Math.abs(INV_PHI + INV_PHI2 - 1) < 1e-15);
    assert.ok(Math.abs(INV_PHI3 + 2 * INV_PHI2 - 1) < 1e-15);
  });

  it('projects 3D coordinates at (yaw=0°, pitch=0°) onto exact 1:1 2D shadow regardless of Z depth', () => {
    const p1 = projectOrthographic3D(7, 7, BAUHAUS_PHI_EXACT_TARGETS.zPillar, 0, 0);
    const p2 = projectOrthographic3D(25, 13.875, 0, 0, 0);
    const p3 = projectOrthographic3D(22.55, 9.45, BAUHAUS_PHI_EXACT_TARGETS.zSphere, 0, 0);

    assert.equal(p1.exactX, 7);
    assert.equal(p1.exactY, 7);
    assert.equal(p2.exactX, 25);
    assert.equal(p2.exactY, 13.875);
    assert.equal(p3.exactX, 22.55);
    assert.equal(p3.exactY, 9.45);
  });

  it('converges Perfection Scalar L(Φ) from 1.0 down to <= 1e-9 at Golden Orthographic Lock (0°, 0°)', () => {
    const initialUncalibrated = computeLogoPerfectionScalar({
      yawDeg: 65,
      pitchDeg: 45,
      calibrationPerturbation: 1,
    });
    assert.ok(
      Math.abs(initialUncalibrated.scalar - 1.0) < 1e-9,
      `Expected initial scalar ~1.0, got ${initialUncalibrated.scalar}`
    );
    assert.equal(initialUncalibrated.isConverged, false);

    const midState = computeLogoPerfectionScalar({
      yawDeg: 25,
      pitchDeg: 15,
      calibrationPerturbation: 0.25,
    });
    assert.ok(midState.scalar > 0.01 && midState.scalar < 0.9);

    const converged = computeLogoPerfectionScalar({
      yawDeg: 0,
      pitchDeg: 0,
      calibrationPerturbation: 0,
    });
    assert.ok(
      converged.scalar <= 1e-9,
      `Expected converged L(Φ) <= 1e-9, got ${converged.scalar}`
    );
    assert.equal(converged.isConverged, true);
  });

  it('computes depth-sorted 3D floating Math.* formula sweepers and nano-chart sparklines', () => {
    assert.ok(MATH_FORMULA_SWEEP_BANK.PHI_CONSTANT.length >= 4);
    const artifacts = computeFloating3DArtifacts(34, 22, 1.2, 0.35);
    assert.equal(artifacts.length, 4);
    // Verify back-to-front depth sorting (z ascending)
    for (let i = 1; i < artifacts.length; i++) {
      assert.ok(artifacts[i].z >= artifacts[i - 1].z);
      assert.ok(artifacts[i].sparklinePoints.length > 10);
      assert.ok(artifacts[i].secondaryPoints.length > 10);
      assert.ok(artifacts[i].areaPoints.length > 10);
      assert.equal(artifacts[i].bars.length, 6);
      assert.ok(typeof artifacts[i].cursorPoint.x === 'number');
      assert.ok(artifacts[i].expr.includes('Math.'));
    }

    const lockedArtifacts = computeFloating3DArtifacts(0, 0, 0, 0);
    for (const art of lockedArtifacts) {
      assert.equal(art.isLocked, true);
      // Verify Left Wing (x < 0) and Right Wing (x > 32) placement at (0°, 0°) so central [0..32] sculpture is unobstructed
      assert.ok(
        art.x < 0 || art.x > 32,
        `Expected wing card ${art.id} outside [0..32], got x=${art.x}`
      );
    }
  });

  it('computes complete 3D scene with orthographic lock flag, orbital ring, and 3 Bauhaus primitives', () => {
    const lockedScene = computeBauhausPhiScene3D(0, 0, 0, 0);
    assert.equal(lockedScene.isOrthographicLock, true);
    assert.equal(lockedScene.perfection.isConverged, true);
    assert.equal(lockedScene.sphere.x, BAUHAUS_PHI_2D_SPEC.circle.cx);
    assert.equal(lockedScene.sphere.y, BAUHAUS_PHI_2D_SPEC.circle.cy);
    assert.equal(lockedScene.floatingArtifacts.length, 4);
    assert.equal(
      lockedScene.backArtifacts.length + lockedScene.frontArtifacts.length,
      4
    );
    assert.equal(lockedScene.orbitTokens.length, 6);
    assert.ok(lockedScene.orbitRingPoints.length > 20);

    const rotatedScene = computeBauhausPhiScene3D(34, 22, 0.2, 0.5);
    assert.equal(rotatedScene.isOrthographicLock, false);
    assert.notEqual(rotatedScene.sphere.x, BAUHAUS_PHI_2D_SPEC.circle.cx);
    assert.ok(rotatedScene.prismBox.visibleSides.length >= 1);
    assert.ok(rotatedScene.prismBox.visibleSides.length < rotatedScene.prismBox.sides.length);
  });

  it('samples 2D N-Shadow via Weyl-R2 Golden Monte Carlo shooter with >95% legibility convergence', () => {
    const mc = sampleMonteCarloNShadow(400, 0);
    assert.equal(mc.totalShots, 400);
    assert.equal(mc.samples.length, 400);
    assert.ok(mc.pillarHits > 20);
    assert.ok(mc.wedgeHits > 20);
    assert.ok(mc.sphereHits > 5);
    assert.ok(mc.nLegibilityScore > 0.95);
  });

  it('computes gentle autonomous golden flow blended with interactive cursor parallax and φ-scaled rings', () => {
    const baseFlow = computeGoldenFlowAndCursorField({
      timeSec: 1.5,
      cursorNormX: 0,
      cursorNormY: 0,
      cursorEnergy: 0,
      cursorPresence: 0,
      anchorYawDeg: 13.9,
      anchorPitchDeg: 4.9,
    });
    assert.equal(baseFlow.cursorYawDelta, 0);
    assert.equal(baseFlow.cursorPitchDelta, 0);
    assert.equal(baseFlow.cursorSvg.x, 16);
    assert.equal(baseFlow.cursorSvg.y, 16);
    assert.ok(Math.abs(baseFlow.cursorSvg.rPhi / baseFlow.cursorSvg.rInner - PHI) < 0.02);

    const activeCursorFlow = computeGoldenFlowAndCursorField({
      timeSec: 1.5,
      cursorNormX: 0.5,
      cursorNormY: -0.4,
      cursorEnergy: 0.6,
      cursorPresence: 1,
      anchorYawDeg: 13.9,
      anchorPitchDeg: 4.9,
    });
    assert.equal(activeCursorFlow.cursorYawDelta, 9.0);
    assert.equal(activeCursorFlow.cursorPitchDelta, 5.0);
    assert.ok(activeCursorFlow.yawDeg > baseFlow.yawDeg);
    assert.ok(activeCursorFlow.pitchDeg > baseFlow.pitchDeg);
    assert.ok(activeCursorFlow.cursorSvg.x > 16);
    assert.ok(activeCursorFlow.cursorSvg.y < 16);
    assert.ok(activeCursorFlow.cursorSvg.rInner > baseFlow.cursorSvg.rInner);

    const sceneWithCursor = computeBauhausPhiScene3D(
      activeCursorFlow.yawDeg,
      activeCursorFlow.pitchDeg,
      activeCursorFlow.calibrationPerturbation,
      activeCursorFlow.holoPhaseRad,
      activeCursorFlow.cursorSvg
    );
    assert.ok(sceneWithCursor.primitiveCenters.pillar);
    assert.ok(sceneWithCursor.primitiveCenters.wedge);
    assert.ok(sceneWithCursor.primitiveCenters.sphere);
  });

  it('allows 3D cards to break out beyond the violet backdrop via .parentNode overflow:visible while preventing same-wing vertical overlap', () => {
    const extremeArtifacts = computeFloating3DArtifacts(65, 45, 0, 0, -1, -1);
    for (const art of extremeArtifacts) {
      const cardHalfW = 29 * art.scale * 0.34;
      const cardHalfH = 12.5 * art.scale * 0.34;
      assert.ok(
        art.y - cardHalfH >= -10.51,
        `Card ${art.id} top edge (${art.y - cardHalfH}) must stay within .parentNode outer top (-10.5)`
      );
      assert.ok(
        art.y + cardHalfH <= 42.51,
        `Card ${art.id} bottom edge (${art.y + cardHalfH}) must stay within .parentNode outer bottom (42.5)`
      );
      assert.ok(
        art.x - cardHalfW >= -25.51,
        `Card ${art.id} left edge (${art.x - cardHalfW}) must stay within .parentNode outer left (-25.5)`
      );
      assert.ok(
        art.x + cardHalfW <= 57.51,
        `Card ${art.id} right edge (${art.x + cardHalfW}) must stay within .parentNode outer right (57.5)`
      );
      assert.ok(typeof art.exprFontSize === 'number' && art.exprFontSize >= 1.45 && art.exprFontSize <= 2.7);
      const estW = art.expr.length * art.exprFontSize * 0.615;
      assert.ok(
        estW <= 51.5,
        `Formula "${art.expr}" width (${estW}) at font-size ${art.exprFontSize} must fit inside 51.5`
      );
    }

    // Verify top card (Φ SWEEP) breaks out above the inner violet backdrop top edge (y = -6) at positive pitch
    const topBreakout = computeFloating3DArtifacts(-45, 42, -1.5, 0.2, 0, -1);
    const phiCard = topBreakout.find((a) => a.id === 'art-phi');
    assert.ok(
      phiCard.y - phiCard.cardHalfH < -6,
      `Expected Φ SWEEP top edge (${phiCard.y - phiCard.cardHalfH}) to break out above inner violet frame (y = -6)`
    );

    // Verify same-wing top and bottom cards never overlap vertically across steep pitch angles
    for (const pitch of [-45, -25, 0, 25, 45]) {
      const cards = computeFloating3DArtifacts(35, pitch, 1.2, 0.25);
      for (const wing of ['left', 'right']) {
        const topC = cards.find((c) => c.wing === wing && c.wingSlot === 'top');
        const botC = cards.find((c) => c.wing === wing && c.wingSlot === 'bottom');
        const verticalClearance = (botC.y - botC.cardHalfH) - (topC.y + topC.cardHalfH);
        assert.ok(
          verticalClearance >= 1.0,
          `Expected non-overlapping vertical gap >= 1.0 on ${wing} wing at pitch=${pitch}°, got ${verticalClearance}`
        );
      }
    }
  });

  it('preserves canonical 2D/3D Bauhaus Φ geometry, backface culling, and safe stage bounds across aspect ratios', () => {
    // 1. Canonical 2D/3D specification invariants
    const { rect, triangle, circle } = BAUHAUS_PHI_2D_SPEC;
    assert.equal(rect.x, 7);
    assert.equal(rect.y, 7);
    assert.equal(rect.width, 4.25);
    assert.equal(rect.height, 18);
    assert.equal(rect.zHalfThickness, 1.65);
    assert.equal(triangle.svgPoints, '11.85,7 25,25 25,15.85');
    assert.equal(triangle.zCenter, 0);
    assert.equal(triangle.zHalfThickness, 1.65);
    assert.equal(circle.cx, 22.55);
    assert.equal(circle.cy, 9.45);
    assert.equal(circle.r, 2.45);
    assert.ok(rect.zCenter < triangle.zCenter && triangle.zCenter < circle.zCenter);

    // 2. Strict 3D separating plane x = 11.55 between Pillar (x <= 11.25) and Wedge (x >= 11.85)
    const maxPillarX = rect.x + rect.width;
    const minWedgeX = Math.min(...triangle.points.map(([x]) => x));
    assert.equal(maxPillarX, 11.25);
    assert.equal(minWedgeX, 11.85);
    assert.ok(maxPillarX < 11.55 && 11.55 < minWedgeX);

    // 3. At (0°, 0°) orthographic lock, all extruded side walls are edge-on (0 visible sides)
    const lockedSolid = buildExtrudedSolid3D(triangle.points, 0, 1.65, 0, 0);
    assert.equal(lockedSolid.visibleSides.length, 0);

    // 4. Winding order normalization (CW vs CCW input produces identical frontVertices set)
    const reversedSolid = buildExtrudedSolid3D([...triangle.points].reverse(), 0, 1.65, 28, -12);
    const forwardSolid = buildExtrudedSolid3D(triangle.points, 0, 1.65, 28, -12);
    assert.equal(reversedSolid.visibleSides.length, forwardSolid.visibleSides.length);
    for (const side of forwardSolid.visibleSides) {
      assert.ok(side.normalZ > 1e-4);
      assert.ok(side.shade >= 0.32 && side.shade <= 0.92);
    }

    // 5. Safe stage bounds fallback (.parentNode unclipped outer space beyond [-21..53, -6..38]) & sonic DSL invariants
    const unclippedStage = {
      getBoundingClientRect: () => ({ left: 0, right: 760, top: 0, bottom: 460, width: 760, height: 460 }),
    };
    const safeBounds = measureSafeStageBounds(unclippedStage);
    assert.equal(safeBounds.minX, -25.5);
    assert.equal(safeBounds.maxX, 57.5);
    assert.equal(safeBounds.minY, -10.5);
    assert.equal(safeBounds.maxY, 42.5);

    // 5b. Below-the-fold initial page load regression check (top=660, bottom=932 on a 720px viewport inside a scroll container):
    // Must NEVER crush maxY down to ~5.5 or cause top/bottom cards (FILAR+SONIC, SWEEP+KLIN) to collide at the top of the SVG!
    const belowFoldStage = {
      getBoundingClientRect: () => ({ left: 320, right: 800, top: 660, bottom: 968, width: 480, height: 308 }),
      parentNode: {
        nodeType: 1,
        hasAttribute: () => false,
        getBoundingClientRect: () => ({ left: 280, right: 1200, top: 0, bottom: 720, width: 920, height: 720 }),
        parentNode: null,
      },
    };
    const belowFoldBounds = measureSafeStageBounds(belowFoldStage);
    assert.equal(belowFoldBounds.minY, -10.5);
    assert.equal(belowFoldBounds.maxY, 42.5);
    const belowFoldCards = computeFloating3DArtifacts(20.8, -20.8, 1.2, 0.1, 0, 0, belowFoldBounds);
    for (const wing of ['left', 'right']) {
      const topC = belowFoldCards.find((c) => c.wing === wing && c.wingSlot === 'top');
      const botC = belowFoldCards.find((c) => c.wing === wing && c.wingSlot === 'bottom');
      const gapY = (botC.y - botC.cardHalfH) - (topC.y + topC.cardHalfH);
      assert.ok(
        gapY >= 8.0,
        `Expected generous vertical separation (>= 8.0) between ${topC.tag} and ${botC.tag} at initial load, got ${gapY}`
      );
    }

    assert.ok(NANO_UI_SONIC_LOGO_NSD.includes('432Hz'));
    assert.ok(NANO_UI_SONIC_LOGO_NSD.includes('699Hz'));
    assert.ok(NANO_UI_SONIC_LOGO_NSD.includes('1131Hz'));
  });

  it('orders 3D SVG scene elements via D3-3D Unified Painter’s Algorithm & 3D Ray-Cast Z-Buffer Oracle (Sphere OVER Wedge and Pillar, Pillar UNDER Wedge for ψ ≤ 35.93°, pitch-aware Floor over/under N-legs)', () => {
    // 1. Critical Angle 1 (ψ = -17.1°, θ = -13.9°):
    // Purple Pillar (□, z ∈ [-4.122, -0.822]) renders UNDERNEATH Cyan Wedge (△, z ∈ [-1.65, +1.65]),
    // and Quantum Sphere (○, z ∈ [+0.022, +4.922]) renders ON TOP OF both Wedge and Pillar.
    const auditCrit1 = auditScene3DOcclusionInvariants(-17.1, -13.9);
    assert.equal(auditCrit1.ok, true);
    assert.equal(auditCrit1.overlaps.pillarWedge, true);
    assert.deepEqual(auditCrit1.sceneRenderOrder, ['floor', 'pillar', 'wedge', 'sphere']);

    // 2. Critical Angle 2 (ψ = -24.2°, θ = -13.9°):
    // Quantum Sphere (○) overlaps Cyan Wedge (△) and renders ON TOP OF both Cyan Wedge and Purple Pillar (□).
    const auditCrit2 = auditScene3DOcclusionInvariants(-24.2, -13.9);
    assert.equal(auditCrit2.ok, true);
    assert.equal(auditCrit2.overlaps.wedgeSphere, true);
    assert.deepEqual(auditCrit2.sceneRenderOrder, ['floor', 'pillar', 'wedge', 'sphere']);

    // 2b. Triple-Overlap Angle (ψ = -50°, θ = -0.4°):
    // Quantum Sphere (○) simultaneously overlaps BOTH Cyan Wedge (△) and Purple Pillar (□)
    // and renders ON TOP OF both Wedge and Pillar (while Pillar stays UNDERNEATH Wedge).
    const sceneTripleOverlap = computeBauhausPhiScene3D(-50, -0.4);
    assert.equal(sceneTripleOverlap.sphereInFrontOfWedge, true);
    assert.equal(sceneTripleOverlap.sphereInFrontOfPillar, true);
    assert.equal(sceneTripleOverlap.wedgeInFrontOfPillar, true);
    assert.deepEqual(sceneTripleOverlap.primitiveDrawOrder, ['pillar', 'wedge', 'sphere']);
    assert.deepEqual(sceneTripleOverlap.sceneRenderOrder, ['floor', 'pillar', 'wedge', 'sphere']);

    const auditTriple = auditScene3DOcclusionInvariants(-50, -0.4);
    assert.equal(auditTriple.ok, true);
    assert.equal(auditTriple.overlaps.wedgeSphere, true);
    assert.equal(auditTriple.overlaps.pillarSphere, true);
    assert.equal(auditTriple.overlaps.pillarWedge, true);

    // 3. Critical Angles 3a & 3b (ψ = -17.1°, θ = +8.0° and ψ = -17.1°, θ = +18.3°):
    // Viewing from below (θ > 0°): Floor renders ON TOP OF N-legs, Pillar renders UNDER Wedge, and Sphere renders OVER Wedge & Pillar.
    const scenePitchPos = computeBauhausPhiScene3D(-17.1, 8.0);
    assert.equal(scenePitchPos.wedgeInFrontOfPillar, true);
    assert.equal(scenePitchPos.pillarOccludesWedge, false);
    assert.equal(scenePitchPos.sphereInFrontOfWedge, true);
    assert.equal(scenePitchPos.sphereInFrontOfPillar, true);
    assert.equal(scenePitchPos.wedgeOccludesSphere, false);
    assert.equal(scenePitchPos.floorOccludesSolids, true);
    assert.deepEqual(scenePitchPos.primitiveDrawOrder, ['pillar', 'wedge', 'sphere']);
    assert.deepEqual(scenePitchPos.sceneRenderOrder, ['pillar', 'wedge', 'sphere', 'floor']);

    const auditA = auditScene3DOcclusionInvariants(-17.1, 8.0);
    assert.equal(auditA.ok, true);
    assert.equal(auditA.overlaps.pillarWedge, true);
    assert.equal(auditA.overlaps.floorPillar, true);
    assert.equal(auditA.overlaps.floorWedge, true);

    const auditB = auditScene3DOcclusionInvariants(-17.1, 18.3);
    assert.equal(auditB.ok, true);
    assert.equal(auditB.overlaps.floorPillar, true);
    assert.equal(auditB.overlaps.floorWedge, true);
    assert.deepEqual(auditB.sceneRenderOrder, ['pillar', 'wedge', 'sphere', 'floor']);

    // 4. User Screenshot Case C (ψ = -24.2°, θ = -11.4°):
    // - Quantum Sphere (○) renders ON TOP OF Cyan Wedge (△) and ON TOP OF Purple Pillar (□).
    // - Cyan Wedge (△) renders ON TOP OF Purple Pillar (□).
    // - Because θ = -11.4° <= 0 (viewing from above the floor plane downward),
    //   the 3D Stage Floor renders UNDERNEATH the N-sculpture solids!
    const scenePitchNeg = computeBauhausPhiScene3D(-24.2, -11.4);
    assert.equal(scenePitchNeg.wedgeInFrontOfPillar, true);
    assert.equal(scenePitchNeg.pillarOccludesWedge, false);
    assert.equal(scenePitchNeg.sphereInFrontOfWedge, true);
    assert.equal(scenePitchNeg.sphereInFrontOfPillar, true);
    assert.equal(scenePitchNeg.wedgeOccludesSphere, false);
    assert.equal(scenePitchNeg.floorOccludesSolids, false);
    assert.deepEqual(scenePitchNeg.primitiveDrawOrder, ['pillar', 'wedge', 'sphere']);
    assert.deepEqual(scenePitchNeg.sceneRenderOrder, ['floor', 'pillar', 'wedge', 'sphere']);

    const auditC = auditScene3DOcclusionInvariants(-24.2, -11.4);
    assert.equal(auditC.ok, true);
    assert.equal(auditC.overlaps.wedgeSphere, true);

    // 4b. Steep positive yaw (ψ = +50°, θ = -13.9°): Pillar's front-right edge (z = -0.822) rotates in front of Wedge's back-left edge (z = -1.65), while Sphere remains in front
    const sceneSteepPos = computeBauhausPhiScene3D(50, -13.9);
    assert.equal(sceneSteepPos.pillarOccludesWedge, true);
    assert.equal(sceneSteepPos.sphereInFrontOfWedge, true);
    assert.deepEqual(sceneSteepPos.sceneRenderOrder, ['floor', 'wedge', 'pillar', 'sphere']);

    // 5. Exhaustive 165-point 2D Angle Matrix Audit across (ψ, θ) ∈ [-65°, +65°] × [-55°, +55°]
    const yaws = [-65, -50, -36.4, -24.2, -17.1, -8, -1, 0, 1, 8, 13.9, 24.2, 35.3, 50, 65];
    const pitches = [-55, -30, -13.9, -11.4, -2, 0, 2, 4.9, 8.0, 18.3, 55];
    for (const yaw of yaws) {
      for (const pitch of pitches) {
        const report = auditScene3DOcclusionInvariants(yaw, pitch);
        assert.equal(
          report.ok,
          true,
          `Occlusion audit failed at (ψ=${yaw}°, θ=${pitch}°): ${report.violations.join('; ')}`
        );
      }
    }

    // 6. Verify LogoConceptsLab.vue renders the unified 3D scene in scene3D.sceneRenderOrder,
    // wires ArrowLeft/ArrowRight with % wrap via key-controller, and centers .concept-badge / .active-pill text
    const labVuePath = path.resolve(__dirname, '../../src/playground/LogoConceptsLab.vue');
    const labVueSrc = fs.readFileSync(labVuePath, 'utf8');
    assert.ok(
      labVueSrc.includes('v-for="primId in scene3D.sceneRenderOrder"'),
      'LogoConceptsLab.vue must render the 3D scene in scene3D.sceneRenderOrder'
    );
    assert.ok(
      labVueSrc.includes('stepWrappedIndex') && labVueSrc.includes('getGlobalKeyController'),
      'LogoConceptsLab.vue must wire ArrowLeft/ArrowRight with stepWrappedIndex and getGlobalKeyController'
    );
    assert.equal(stepWrappedIndex(0, -1, 3), 2);
    assert.equal(stepWrappedIndex(2, 1, 3), 0);
    assert.equal(stepWrappedIndex(0, 1, 3), 1);

    const kc = createKeyController({ target: null });
    let idx = 0;
    kc.bindAll({
      ArrowLeft: () => { idx = stepWrappedIndex(idx, -1, 3); },
      ArrowRight: () => { idx = stepWrappedIndex(idx, 1, 3); },
    });
    kc.handleKeyDown({ key: 'ArrowLeft', target: { tagName: 'DIV' } });
    assert.equal(idx, 2);
    kc.handleKeyDown({ key: 'ArrowRight', target: { tagName: 'DIV' } });
    assert.equal(idx, 0);
  });

  it('splits floating card equations into 3 locked sections (left | = | right) and prevents sub-second Δ order-of-magnitude jumps', () => {
    const sampleA = computeFloating3DArtifacts(24, 12, 1.0, 0.18);
    const sampleB = computeFloating3DArtifacts(24, 12, 1.15, 0.18);

    for (let i = 0; i < sampleA.length; i++) {
      const a = sampleA[i];
      const b = sampleB[i];

      // 1. Verify 3-section structure [left, '=', right] and invariant anchor X positions
      assert.equal(a.deltaParts.eq, '=');
      assert.equal(a.readoutParts.eq, '=');
      assert.ok(a.deltaParts.left.length >= 1);
      assert.ok(a.deltaParts.right.length >= 3);
      assert.equal(a.deltaParts.leftX, b.deltaParts.leftX);
      assert.equal(a.deltaParts.eqX, b.deltaParts.eqX);
      assert.equal(a.deltaParts.rightX, b.deltaParts.rightX);
      assert.ok(a.deltaParts.leftX < a.deltaParts.eqX && a.deltaParts.eqX < a.deltaParts.rightX);
      assert.ok(a.readoutParts.leftX < a.readoutParts.eqX && a.readoutParts.eqX < a.readoutParts.rightX);

      // 2. While not converged (perfectionScalar = 0.18), Δ must never jump to 0.0e+0 or 2.2e-16
      assert.notEqual(a.deltaParts.right, '0.0e+0');
      assert.notEqual(a.deltaParts.right, '2.2e-16');
      assert.notEqual(b.deltaParts.right, '0.0e+0');
      assert.notEqual(b.deltaParts.right, '2.2e-16');
    }

    // When converged at (0°, 0°), Δ cleanly reaches 0.0e+0 while preserving identical leftX/eqX/rightX anchors
    const locked = computeFloating3DArtifacts(0, 0, 1.0, 0);
    for (const card of locked) {
      assert.equal(card.deltaParts.eq, '=');
      assert.equal(card.deltaParts.right, '0.0e+0');
      assert.equal(card.deltaParts.eqX, 15.2);
    }
  });

  it('splits the Quantum Sphere orbital ring into back/front 3D arcs and orbits 7 irregular rotating polygon planetoids', () => {
    const scene0 = computeBauhausPhiScene3D(13.9, 4.9, 0.18, 0.4);
    const scene1 = computeBauhausPhiScene3D(13.9, 4.9, 0.18, 1.2);

    assert.ok(scene0.sphere.backRingPoints.length > 20, 'backRingPoints must be populated');
    assert.ok(scene0.sphere.frontRingPoints.length > 20, 'frontRingPoints must be populated');
    assert.ok(
      Number.isFinite(scene0.sphere.ringGrad?.x1) &&
        Number.isFinite(scene0.sphere.ringGrad?.y1) &&
        Number.isFinite(scene0.sphere.ringGrad?.x2) &&
        Number.isFinite(scene0.sphere.ringGrad?.y2),
      'ringGrad minor-axis userSpaceOnUse coordinates must be finite'
    );
    assert.ok(
      scene0.sphere.ringGrad.y2 > scene0.sphere.ringGrad.y1,
      'ringGrad must point from back/upper rim toward front/lower rim'
    );
    assert.equal(scene0.sphere.planetoids.length, 7);
    assert.equal(
      scene0.sphere.backPlanetoids.length + scene0.sphere.frontPlanetoids.length,
      7
    );

    // Every backPlanetoid must have z <= sphere.z, and every frontPlanetoid must have z >= sphere.z
    for (const bp of scene0.sphere.backPlanetoids) {
      assert.ok(bp.z <= scene0.sphere.z + 1e-6);
      assert.ok(bp.outerPoints.split(' ').length >= 6);
      assert.ok(bp.rimStroke.startsWith('rgba('));
      assert.ok(bp.facetOpacity >= 0.66 && bp.facetOpacity <= 0.94);
    }
    for (const fp of scene0.sphere.frontPlanetoids) {
      assert.ok(fp.z >= scene0.sphere.z - 1e-6);
      assert.ok(fp.outerPoints.split(' ').length >= 6);
      assert.ok(fp.rimStroke.startsWith('rgba('));
      assert.ok(fp.facetOpacity >= 0.66 && fp.facetOpacity <= 0.94);
    }

    // Advancing phaseRad must both orbit planetoid positions and rotate their irregular polygon vertices
    assert.notEqual(scene0.sphere.planetoids[0].x, scene1.sphere.planetoids[0].x);
    assert.notEqual(
      scene0.sphere.planetoids[0].outerPoints,
      scene1.sphere.planetoids[0].outerPoints
    );
  });

  it('re-anchors autonomous Golden Flow smoothly on slider/preset interaction without freezing isAutoOrbiting', () => {
    const t0 = 4.25;
    const reanchored = reanchorGoldenFlowAngle({
      targetYawDeg: 25.3,
      targetPitchDeg: -11.4,
      timeSec: t0,
      cursorNormX: 0.2,
      cursorNormY: -0.1,
      cursorEnergy: 0.3,
      cursorPresence: 0.8,
    });

    // 1. At exact re-anchor instant t0, computeGoldenFlowAndCursorField must reproduce (25.3°, -11.4°) with zero jump
    const flowAtT0 = computeGoldenFlowAndCursorField({
      timeSec: t0,
      cursorNormX: 0.2,
      cursorNormY: -0.1,
      cursorEnergy: 0.3,
      cursorPresence: 0.8,
      anchorYawDeg: reanchored.anchorYawDeg,
      anchorPitchDeg: reanchored.anchorPitchDeg,
    });
    assert.ok(Math.abs(flowAtT0.yawDeg - 25.3) <= 0.005);
    assert.ok(Math.abs(flowAtT0.pitchDeg - -11.4) <= 0.005);

    // 2. One frame later (t0 + 0.1s), autonomous motion continues evolving smoothly from (25.3°, -11.4°)
    const flowNext = computeGoldenFlowAndCursorField({
      timeSec: t0 + 0.1,
      cursorNormX: 0.2,
      cursorNormY: -0.1,
      cursorEnergy: 0.3,
      cursorPresence: 0.8,
      anchorYawDeg: reanchored.anchorYawDeg,
      anchorPitchDeg: reanchored.anchorPitchDeg,
    });
    assert.notEqual(flowNext.yawDeg, flowAtT0.yawDeg);
    assert.notEqual(flowNext.pitchDeg, flowAtT0.pitchDeg);

    // 3. Verify LogoConceptsLab.vue never calls stopOrbitAnimation() inside onSliderYaw / onSliderPitch
    const labVuePath = path.resolve(__dirname, '../../src/playground/LogoConceptsLab.vue');
    const labVueSrc = fs.readFileSync(labVuePath, 'utf8');
    const sliderYawMatch = labVueSrc.match(/const onSliderYaw = [\s\S]*?const onSliderPitch =/);
    const sliderPitchMatch = labVueSrc.match(/const onSliderPitch = [\s\S]*?const scene3D =/);
    assert.ok(sliderYawMatch && !sliderYawMatch[0].includes('stopOrbitAnimation()'));
    assert.ok(sliderPitchMatch && !sliderPitchMatch[0].includes('stopOrbitAnimation()'));
    assert.ok(sliderYawMatch[0].includes('reanchorAtCurrentFlowTime'));
    assert.ok(sliderPitchMatch[0].includes('reanchorAtCurrentFlowTime'));
  });

  it('renders 10x mini-chart curve granularity (180 segments) and continuous analytical playhead cursor motion', () => {
    const chart0 = buildMiniChartData('harmonic-wave', 0.5, 0.18);
    assert.equal(chart0.steps, 180);
    assert.equal(chart0.sparklinePoints.split(' ').length, 181);
    assert.equal(chart0.secondaryPoints.split(' ').length, 181);

    // Verify fine sub-step phase increments (ΔphaseRad = 0.015) produce distinct continuous cursorPoint coordinates
    // (previously quantized to 19 discrete integer buckets via Math.floor(u * 18))
    const xs = new Set();
    const ys = new Set();
    for (let k = 0; k < 12; k++) {
      const phase = 0.2 + k * 0.015;
      const c = buildMiniChartData('harmonic-wave', phase, 0.18);
      xs.add(c.cursorPoint.x);
      ys.add(c.cursorPoint.y);
      const exact = evaluateMiniChartWavePoint('harmonic-wave', c.cursorPoint.u, phase, 0.18);
      assert.ok(Math.abs(c.cursorPoint.x - exact.x) <= 0.01);
      assert.ok(Math.abs(c.cursorPoint.y - exact.y) <= 0.01);
    }
    assert.equal(xs.size, 12, 'Expected 12 distinct playhead X positions across 12 fine phase steps');
    assert.equal(ys.size, 12, 'Expected 12 distinct playhead Y positions across 12 fine phase steps');
  });
});
