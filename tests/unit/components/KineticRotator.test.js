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
});
