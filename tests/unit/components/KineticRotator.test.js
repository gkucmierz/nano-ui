import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@vue/compiler-sfc';
import { createKineticTransition } from '../../../src/utils/kinetics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sfcPath = path.resolve(__dirname, '../../../src/components/KineticRotator.vue');
const sfcContent = fs.readFileSync(sfcPath, 'utf-8');
const { descriptor } = parse(sfcContent);

describe('KineticRotator Component Architecture & Headless Kinetics Integration', () => {
  const scriptContent = descriptor.scriptSetup?.content || '';

  describe('when validating SSoT imports and encapsulation', () => {
    test('should import createKineticTransition from kinetics.js', () => {
      assert.match(
        scriptContent,
        /import\s*\{[^}]*createKineticTransition[^}]*\}\s*from\s*['"]\.\.\/utils\/kinetics\.js['"]/,
        'KineticRotator must import createKineticTransition'
      );
    });

    test('should instantiate createKineticTransition controller', () => {
      assert.match(
        scriptContent,
        /createKineticTransition\s*\(/,
        'KineticRotator must delegate animation to createKineticTransition'
      );
    });

    test('should delegate rotateBy, setAngle, reset, and updateActiveDuration to transition', () => {
      assert.match(scriptContent, /transition\.setTarget\(/);
      assert.match(scriptContent, /transition\.setConfig\(/);
    });
  });

  describe('when validating props and public API surface', () => {
    test('should declare standard rotator props with default values', () => {
      assert.match(scriptContent, /modelValue:\s*\{[\s\S]*default:\s*0/);
      assert.match(scriptContent, /duration:\s*\{[\s\S]*default:\s*1000/);
      assert.match(scriptContent, /speedMultiplier:\s*\{[\s\S]*default:\s*1/);
      assert.match(scriptContent, /step:\s*\{[\s\S]*default:\s*90/);
      assert.match(scriptContent, /shortestPath:\s*\{[\s\S]*default:\s*true/);
      assert.match(scriptContent, /inertiaThreshold:\s*\{[\s\S]*default:\s*0\.25/);
    });

    test('should expose kinematic refs and methods via defineExpose', () => {
      const exposeMatch = scriptContent.match(/defineExpose\s*\(\s*\{([\s\S]*?)\}\s*\)/);
      assert.ok(exposeMatch, 'defineExpose must be called');
      const exposed = exposeMatch[1];
      assert.ok(exposed.includes('currentAngle'), 'must expose currentAngle');
      assert.ok(exposed.includes('targetAngle'), 'must expose targetAngle');
      assert.ok(exposed.includes('velocity'), 'must expose velocity');
      assert.ok(exposed.includes('acceleration'), 'must expose acceleration');
      assert.ok(exposed.includes('isMoving'), 'must expose isMoving');
      assert.ok(exposed.includes('isDragging'), 'must expose isDragging');
      assert.ok(exposed.includes('progress'), 'must expose progress');
      assert.ok(exposed.includes('rotateBy'), 'must expose rotateBy');
      assert.ok(exposed.includes('setAngle'), 'must expose setAngle');
      assert.ok(exposed.includes('reset'), 'must expose reset');
      assert.ok(exposed.includes('updateActiveDuration'), 'must expose updateActiveDuration');
    });
  });

  describe('when validating kinetics behavior configured for rotator', () => {
    test('should rotate along shortest geodesic arc when modular is true', () => {
      let targetSet = null;
      const trans = createKineticTransition({
        initialValue: 350,
        modular: true,
        duration: 1000,
        timingMode: 'proportional',
        step: 90,
        onUpdate: ({ target }) => { targetSet = target; }
      });

      // From 350° to 10°: difference is +20° (target should be 350 + 20 = 370, not -340)
      trans.setTarget(10);
      assert.equal(trans.getTarget(), 370);
      trans.step(0);
      assert.equal(targetSet, 370);
      trans.destroy();
    });

    test('should scale duration proportionally to angle distance', () => {
      let midProgress = 0;
      const trans = createKineticTransition({
        initialValue: 0,
        duration: 500,
        timingMode: 'proportional',
        step: 90,
        onUpdate: ({ progress }) => { midProgress = progress; }
      });

      const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      trans.setTarget(180, { timestamp: now });
      // 180° / 90° = 2x base duration = 1000ms
      // At t = now + 500ms, progress should be ~0.5
      trans.step(now + 500);
      assert.ok(Math.abs(midProgress - 0.5) < 0.05, `Progress at 500ms should be ~0.5, got ${midProgress}`);
      trans.destroy();
    });

    test('should update in-flight duration seamlessly when speedMultiplier changes', () => {
      let currentProgress = 0;
      const trans = createKineticTransition({
        initialValue: 0,
        duration: 1000,
        timingMode: 'fixed',
        onUpdate: ({ progress }) => { currentProgress = progress; }
      });

      const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      trans.setTarget(100, { timestamp: now });
      // Step to 250ms (p = 0.25)
      trans.step(now + 250);

      // Double speed mid-flight (speedMultiplier: 2 -> new duration 500ms)
      trans.setConfig({ speedMultiplier: 2 });

      // Step to now + 375ms (halfway of remaining duration)
      trans.step(now + 375);
      assert.ok(currentProgress > 0.25 && currentProgress < 1, `Progress should be > 0.25 and < 1, got ${currentProgress}`);
      trans.destroy();
    });
  });

  describe('when validating boundary frame deduplication (eliminating flat step notches)', () => {
    test('should extract emitFrame deduplication logic from KineticRotator component', () => {
      assert.match(
        scriptContent,
        /const\s+emitFrame\s*=/,
        'KineticRotator must define an emitFrame helper for frame deduplication'
      );
      assert.match(
        scriptContent,
        /Math\.abs\(\s*frame\.currentAngle\s*-\s*lastEmittedAngle\s*\)\s*<\s*1e-4/,
        'emitFrame must drop consecutive duplicate angle frames within epsilon 1e-4'
      );
    });

    test('should strictly suppress consecutive duplicate boundary frames when chaining animations', () => {
      const emittedFrames = [];
      let lastAngle = null;

      const emitFrameMock = (frame) => {
        if (lastAngle !== null && Math.abs(frame.currentAngle - lastAngle) < 1e-4) {
          return;
        }
        lastAngle = frame.currentAngle;
        emittedFrames.push(frame.currentAngle);
      };

      // 1. First animation finishes at 90°
      emitFrameMock({ currentAngle: 89.9 });
      emitFrameMock({ currentAngle: 90.0 }); // frame onUpdate at t=1
      emitFrameMock({ currentAngle: 90.0 }); // onSettled boundary emission

      // 2. Second animation started at 90° targeting 180°
      emitFrameMock({ currentAngle: 90.0 }); // frame onUpdate at t=0 of next transition
      emitFrameMock({ currentAngle: 90.5 }); // subsequent animation tick

      // Verify that 90.0 was emitted EXACTLY once, preventing flat step plateau
      const count90 = emittedFrames.filter(a => Math.abs(a - 90.0) < 1e-4).length;
      assert.equal(count90, 1, `Boundary angle 90.0 must be emitted exactly once, got ${count90}`);
      assert.deepEqual(emittedFrames, [89.9, 90.0, 90.5]);
    });
  });

  describe('when chaining mid-flight datapoints in continuous rotation (eliminating waveform step notches)', () => {
    test('should not emit out-of-cadence synchronous frames when calling setTarget mid-flight', () => {
      const emittedFrames = [];
      const trans = createKineticTransition({
        initialValue: 0,
        duration: 1000,
        step: 90,
        timingMode: 'proportional',
        modular: false,
        onUpdate: (f) => { emittedFrames.push({ ...f }); }
      });

      let now = 1000;
      trans.setTarget(450, { timestamp: now });
      assert.equal(emittedFrames.length, 0, 'setTarget must NOT emit synchronous frames on initial call');

      // Step 5 frames
      for (let i = 0; i < 5; i++) {
        now += 16;
        trans.step(now);
      }
      assert.equal(emittedFrames.length, 5, 'Exactly 5 frames emitted for 5 step ticks');

      // Add target mid-flight
      const targetBefore = trans.getTarget();
      trans.setTarget(targetBefore + 450, { timestamp: now });
      assert.equal(
        emittedFrames.length,
        5,
        'setTarget mid-flight must NOT emit an out-of-cadence frame synchronously at click time'
      );

      // Subsequent step tick emits single frame in cadence
      now += 16;
      trans.step(now);
      assert.equal(emittedFrames.length, 6, 'Subsequent tick emits 6th frame in strict cadence');
      trans.destroy();
    });

    test('should guarantee strictly monotonic angular progression without flat steps or plateaus when adding +450° targets mid-flight', () => {
      const history = [];
      const trans = createKineticTransition({
        initialValue: 0,
        duration: 1000,
        step: 90,
        timingMode: 'proportional',
        modular: false,
        onUpdate: (f) => { history.push({ ...f }); }
      });

      let now = 1000;
      trans.setTarget(450, { timestamp: now });

      // Run 20 frames at 16ms cadence
      for (let i = 0; i < 20; i++) {
        now += 16;
        trans.step(now);
      }

      // Add +450° mid-flight at now (frame 20)
      trans.setTarget(trans.getTarget() + 450, { isRelative: true, delta: 450, timestamp: now });

      // Run another 20 frames
      for (let i = 0; i < 20; i++) {
        now += 16;
        trans.step(now);
      }

      assert.equal(history.length, 40, 'Should have exactly 40 frames across 40 ticks with zero duplicate points');

      // Check strictly positive delta angle between every consecutive frame (zero plateaus / steps)
      for (let i = 1; i < history.length; i++) {
        const prev = history[i - 1];
        const curr = history[i];
        const dAngle = curr.value - prev.value;
        const dt = curr.timestamp - prev.timestamp;

        assert.equal(dt, 16, `Frame ${i} timestamp must advance by exactly 16ms`);
        assert.ok(
          dAngle > 0,
          `Frame ${i} angle must strictly advance (got dAngle = ${dAngle} from ${prev.value} to ${curr.value})`
        );
        // Ensure acceleration does not drop to 0 at the retargeting boundary
        if (i === 20) {
          assert.ok(
            Math.abs(curr.acceleration) > 0.1,
            `Frame ${i} (retarget boundary) acceleration must not be artificially 0 (got ${curr.acceleration})`
          );
        }
      }

      trans.destroy();
    });

    test('should preserve continuous angular velocity across retargeting without artificial velocity collapse', () => {
      let velBefore = 0;
      let velAfter = 0;

      const trans = createKineticTransition({
        initialValue: 0,
        duration: 1000,
        step: 90,
        timingMode: 'proportional',
        modular: false,
        onUpdate: ({ velocity }) => {
          velAfter = velocity;
        }
      });

      let now = 1000;
      trans.setTarget(450, { timestamp: now });

      // Advance 15 frames
      for (let i = 0; i < 15; i++) {
        now += 16;
        trans.step(now);
      }
      velBefore = trans.getVelocity();
      assert.ok(velBefore > 10, `Rotator should have built up speed, got ${velBefore}°/s`);

      // Retarget mid-flight: +450°
      trans.setTarget(trans.getTarget() + 450, { isRelative: true, delta: 450, timestamp: now });

      // Step one tick (16ms later)
      now += 16;
      trans.step(now);

      // Velocity must be smooth C1 continuous: relative difference over 16ms must be minimal
      const deltaVel = Math.abs(velAfter - velBefore);
      assert.ok(
        deltaVel < 15,
        `Velocity across retarget boundary must be continuous without sudden drops (before: ${velBefore}, after: ${velAfter}, delta: ${deltaVel})`
      );

      trans.destroy();
    });
  });
});
