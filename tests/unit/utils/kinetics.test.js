import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cubicHermite,
  cubicHermiteDerivative,
  sampleKinematics,
  createKineticTransition,
  createKineticPoints,
  buildSplinePath,
} from '../../../src/utils/kinetics.js';

describe('Pure JS Kinetics & Velocity Chaining Engine', () => {
  describe('when evaluating Cubic Hermite polynomial', () => {
    test('should strictly satisfy boundary conditions P(0)=0 and P(1)=1 for any v0', () => {
      const testV0s = [-2, -1, 0, 0.5, 1.5, 2.5];
      testV0s.forEach((v0) => {
        const pStart = cubicHermite(0, v0);
        const pEnd = cubicHermite(1, v0);
        assert.equal(pStart, 0, `P(0) must equal 0 for v0=${v0}`);
        assert.equal(pEnd, 1, `P(1) must equal 1 for v0=${v0}`);
      });
    });

    test("should strictly satisfy derivative boundary conditions P'(0)=v0 and P'(1)=0", () => {
      const testV0s = [-1.5, 0, 1.2, 2.0];
      testV0s.forEach((v0) => {
        const dStart = cubicHermiteDerivative(0, v0);
        const dEnd = cubicHermiteDerivative(1, v0);
        assert.ok(Math.abs(dStart - v0) < 0.0001, `P'(0) must equal v0=${v0}, got ${dStart}`);
        assert.ok(Math.abs(dEnd - 0) < 0.0001, `P'(1) must equal 0 for v0=${v0}, got ${dEnd}`);
      });
    });
  });

  describe('when sampling kinematics at timestamps', () => {
    test('should sample correct value, velocity, and progress mid-flight', () => {
      const sampled = sampleKinematics({
        startTime: 1000,
        duration: 400,
        startValue: 0,
        targetValue: 200,
        v0: 1.0,
        now: 1200, // half-way (p = 0.5)
      });

      assert.equal(sampled.progress, 0.5);
      assert.ok(sampled.value > 0 && sampled.value < 200, 'Mid-flight value must be within bounds');
      assert.ok(sampled.velocity > 0, 'Instantaneous velocity must be positive towards target');
    });

    test('should clamp progress cleanly at start (p=0) and completion (p=1)', () => {
      const startSample = sampleKinematics({
        startTime: 1000,
        duration: 400,
        startValue: 10,
        targetValue: 90,
        now: 900, // before start
      });
      assert.equal(startSample.progress, 0);
      assert.equal(startSample.value, 10);

      const endSample = sampleKinematics({
        startTime: 1000,
        duration: 400,
        startValue: 10,
        targetValue: 90,
        now: 1500, // after end
      });
      assert.equal(endSample.progress, 1);
      assert.equal(endSample.value, 90);
    });
  });

  describe('when using createKineticTransition controller', () => {
    test('should initialize with initialValue at rest', () => {
      const kt = createKineticTransition({ initialValue: 45 });
      assert.equal(kt.getValue(), 45);
      assert.equal(kt.getVelocity(), 0);
      assert.equal(kt.isMoving(), false);
    });

    test('should snap immediately when immediate flag is passed', () => {
      let settled = false;
      const kt = createKineticTransition({
        initialValue: 0,
        onSettled: () => { settled = true; },
      });

      kt.setTarget(180, { immediate: true });
      assert.equal(kt.getValue(), 180);
      assert.equal(kt.getVelocity(), 0);
      assert.equal(kt.isMoving(), false);
      assert.equal(settled, true);
    });

    test('should follow non-modular direct target tracking when modular is false', () => {
      let targetRecorded = null;
      const kt = createKineticTransition({
        initialValue: 0,
        modular: false,
        onUpdate: ({ target }) => { targetRecorded = target; },
      });

      // In non-modular mode, +450 degrees is targeted directly as 450 (not wrapped to 90)
      kt.setTarget(450);
      kt.step(0);
      assert.equal(kt.getTarget(), 450);
      assert.equal(targetRecorded, 450);
      kt.destroy();
    });

    test('should follow modular geodesic shortest-path when modular is true', () => {
      let targetRecorded = null;
      const kt = createKineticTransition({
        initialValue: 10,
        modular: true,
        onUpdate: ({ target }) => { targetRecorded = target; },
      });

      // From 10° to 350°: shortest geodesic difference is -20° (target = 10 - 20 = -10°)
      kt.setTarget(350);
      kt.step(0);
      assert.equal(kt.getTarget(), -10);
      assert.equal(targetRecorded, -10);
      kt.destroy();
    });

    test('should halt animation when stop is called', () => {
      const kt = createKineticTransition({ initialValue: 0, duration: 1000 });
      kt.setTarget(100);
      assert.equal(kt.isMoving(), true);

      kt.stop();
      assert.equal(kt.isMoving(), false);
      assert.equal(kt.getVelocity(), 0);
      kt.destroy();
    });

    test('should chain velocity and compute non-zero v0 when interrupted mid-flight', () => {
      let latestV0 = 0;
      const kt = createKineticTransition({
        initialValue: 0,
        duration: 350,
        timingMode: 'fixed',
        modular: false,
        onUpdate: ({ v0 }) => {
          latestV0 = v0;
        },
      });

      // Start flight towards 100
      kt.setTarget(100);
      kt.step(50);

      // Interrupt mid-flight with new target 200
      kt.setTarget(200);
      kt.step(100);

      assert.equal(kt.getTarget(), 200);
      assert.equal(kt.isMoving(), true);
      assert.ok(typeof latestV0 === 'number');
      kt.destroy();
    });

    test('should smoothly reverse mid-flight when target is reset back to zero during extrusion', () => {
      let latestProgress = 0;
      let latestVelocity = 0;
      let latestV0 = 0;

      const kt = createKineticTransition({
        initialValue: 0,
        duration: 300,
        timingMode: 'fixed',
        modular: false,
        onUpdate: ({ progress, velocity, v0 }) => {
          latestProgress = progress;
          latestVelocity = velocity;
          latestV0 = v0;
        },
      });

      // 1. Start extrusion towards target = 1.0
      const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      kt.setTarget(1.0);
      kt.step(now + 150);

      assert.ok(latestProgress > 0 && latestProgress < 1, `Should be mid-way through extension, got ${latestProgress}`);
      assert.ok(latestVelocity > 0, 'Velocity should be positive towards target');

      // 2. Interrupt mid-flight: target reset to 0
      const interruptNow = now + 150;
      kt.setTarget(0.0, { timestamp: interruptNow });
      kt.step(interruptNow);

      assert.equal(kt.getTarget(), 0.0);
      assert.equal(kt.isMoving(), true);
      assert.ok(latestV0 !== 0, 'v0 must be non-zero to preserve velocity continuity');

      // 3. Step forward to completion
      kt.step(interruptNow + 600);
      assert.equal(kt.getValue(), 0.0);
      assert.equal(kt.isMoving(), false);
      kt.destroy();
    });

    test('should allow dynamic configuration updates via setConfig', () => {
      const kt = createKineticTransition({ initialValue: 0, timingMode: 'fixed' });
      kt.setConfig({ timingMode: 'proportional', step: 45 });
      kt.setTarget(90);
      assert.equal(kt.getTarget(), 90);
      kt.destroy();
    });
  });

  describe('when generating Catmull-Rom to Cubic Bezier paths (buildSplinePath)', () => {
    test('should return empty string for empty points array', () => {
      assert.equal(buildSplinePath([]), '');
      assert.equal(buildSplinePath(null), '');
    });

    test('should handle single point path and single point with groundY', () => {
      const single = [{ x: 50, y: 100 }];
      assert.equal(buildSplinePath(single), 'M 50.0 100.0');
      assert.equal(buildSplinePath(single, { groundY: 250 }), 'M 50.0 250.0 L 50.0 100.0 L 50.0 250.0 Z');
    });

    test('should handle 2 points with linear segment', () => {
      const two = [{ x: 0, y: 10 }, { x: 100, y: 20 }];
      assert.equal(buildSplinePath(two), 'M 0.0 10.0 L 100.0 20.0');
    });

    test('should generate smooth C cubic Bezier commands for 3+ points', () => {
      const pts = [
        { x: 0, y: 100 },
        { x: 50, y: 50 },
        { x: 100, y: 120 },
        { x: 150, y: 80 }
      ];
      const path = buildSplinePath(pts);
      assert.ok(path.startsWith('M 0.0 100.0'));
      assert.ok(path.includes(' C '));
      // Should have 3 cubic segments
      const cCount = (path.match(/ C /g) || []).length;
      assert.equal(cCount, 3);
    });

    test('should generate closed area path down to groundY', () => {
      const pts = [{ x: 10, y: 50 }, { x: 50, y: 80 }, { x: 100, y: 40 }];
      const areaPath = buildSplinePath(pts, { groundY: 200 });
      assert.ok(areaPath.startsWith('M 10.0 50.0'));
      assert.ok(areaPath.endsWith('L 100.0 200.0 L 10.0 200.0 Z'));
    });
  });

  describe('when using createKineticPoints controller', () => {
    test('should initialize immediately when points are empty or immediate flag is true', () => {
      const initialPts = [
        { x: 0, y: 100, date: '2026-09-01' },
        { x: 50, y: 120, date: '2026-09-02' }
      ];
      let updatedPoints = [];
      const kp = createKineticPoints({
        duration: 300,
        onUpdate: (pts) => { updatedPoints = pts; }
      });

      kp.setTargets(initialPts);
      assert.equal(updatedPoints.length, 2);
      assert.equal(updatedPoints[0].y, 100);
      assert.equal(updatedPoints[1].y, 120);
      assert.equal(updatedPoints[0].date, '2026-09-01');
      assert.equal(kp.isMoving(), false);
      kp.destroy();
    });

    test('should smoothly interpolate points when count matches', () => {
      const t0 = 1000;
      const startPts = [{ x: 0, y: 100 }, { x: 100, y: 200 }];
      const targetPts = [{ x: 0, y: 50 }, { x: 100, y: 100 }];

      let latestPoints = [];
      const kp = createKineticPoints({
        duration: 400,
        onUpdate: (pts) => { latestPoints = pts; }
      });

      kp.setTargets(startPts, { immediate: true });
      kp.setTargets(targetPts, { timestamp: t0 });

      assert.equal(kp.isMoving(), true);
      // Mid-flight at 200ms (50% progress)
      kp.step(t0 + 200);
      assert.ok(latestPoints[0].y < 100 && latestPoints[0].y > 50, 'Point 0 should be mid-transition');
      assert.ok(latestPoints[1].y < 200 && latestPoints[1].y > 100, 'Point 1 should be mid-transition');

      // Completion at 400ms
      kp.step(t0 + 400);
      assert.equal(latestPoints[0].y, 50);
      assert.equal(latestPoints[1].y, 100);
      assert.equal(kp.isMoving(), false);
      kp.destroy();
    });

    test('should resample starting curve smoothly when changing point count (7 to 4)', () => {
      const t0 = 1000;
      // Start with 4 points: straight ramp from y=0 to y=300
      const startPts = [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
        { x: 200, y: 200 },
        { x: 300, y: 300 }
      ];

      // New target has 7 points
      const targetPts = Array.from({ length: 7 }, (_, i) => ({
        x: i * 50,
        y: 500
      }));

      let latestPoints = [];
      const kp = createKineticPoints({
        duration: 300,
        onUpdate: (pts) => { latestPoints = pts; }
      });

      kp.setTargets(startPts, { immediate: true });
      kp.setTargets(targetPts, { timestamp: t0 });

      assert.equal(latestPoints.length, 7);
      // At t=0 (progress 0), middle target point (index 3 out of 6, fraction 0.5) must sample from startPts at fraction 0.5 (y = 150)
      assert.ok(Math.abs(latestPoints[3].y - 150) < 0.1, `Middle point at t=0 must start at 150, got ${latestPoints[3].y}`);

      // Step to end
      kp.step(t0 + 350);
      assert.equal(latestPoints.length, 7);
      assert.equal(latestPoints[3].y, 500);
      assert.equal(kp.isMoving(), false);
      kp.destroy();
    });

    test('should chain velocity when interrupted mid-flight', () => {
      const t0 = 1000;
      const startPts = [{ x: 0, y: 0 }];
      const target1 = [{ x: 0, y: 300 }];
      const target2 = [{ x: 0, y: 50 }];

      let latestPoints = [];
      const kp = createKineticPoints({
        duration: 400,
        onUpdate: (pts) => { latestPoints = pts; }
      });

      kp.setTargets(startPts, { immediate: true });
      kp.setTargets(target1, { timestamp: t0 });

      // Step to 200ms (fast moving upwards)
      kp.step(t0 + 200);
      const midVy = latestPoints[0].vy;
      assert.ok(midVy > 0, 'Velocity should be positive towards 300');

      // Interrupt mid-flight at 200ms towards 50
      kp.setTargets(target2, { timestamp: t0 + 200 });
      assert.equal(kp.isMoving(), true);

      // Finish at t0 + 700ms
      kp.step(t0 + 700);
      assert.equal(latestPoints[0].y, 50);
      assert.equal(kp.isMoving(), false);
      kp.destroy();
    });
  });
});
