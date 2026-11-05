import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PHI,
  INV_PHI,
  INV_PHI2,
  INV_PHI3,
  BAUHAUS_PHI_EXACT_TARGETS,
  BAUHAUS_PHI_2D_SPEC,
  MATH_FORMULA_SWEEP_BANK,
  projectOrthographic3D,
  computeLogoPerfectionScalar,
  computeFloating3DArtifacts,
  computeGoldenFlowAndCursorField,
  computeBauhausPhiScene3D,
  sampleMonteCarloNShadow,
} from '../../src/utils/bauhausPhiLogo.js';

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
});
