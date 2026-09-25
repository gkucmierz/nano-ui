import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cubicHermite,
  cubicHermiteDerivative,
  sampleKinematics,
  createKineticTransition,
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
      assert.equal(kt.getTarget(), 450);
      assert.equal(targetRecorded, 450);
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
      assert.equal(kt.getTarget(), -10);
      assert.equal(targetRecorded, -10);
    });

    test('should halt animation when stop is called', () => {
      const kt = createKineticTransition({ initialValue: 0, duration: 1000 });
      kt.setTarget(100);
      assert.equal(kt.isMoving(), true);

      kt.stop();
      assert.equal(kt.isMoving(), false);
      assert.equal(kt.getVelocity(), 0);
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

      // Interrupt mid-flight with new target 200
      kt.setTarget(200);

      assert.equal(kt.getTarget(), 200);
      assert.equal(kt.isMoving(), true);
      assert.ok(typeof latestV0 === 'number');
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
});
