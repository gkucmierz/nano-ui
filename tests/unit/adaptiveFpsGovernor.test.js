import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createAdaptiveFpsGovernor,
  resolveHardwareQualitySeed,
} from '../../src/utils/adaptiveFpsGovernor.js';

describe('Adaptive 60-FPS Particle & FX Quality Governor (ADAPTIVE-60FPS-01)', () => {
  test('resolveHardwareQualitySeed honors prefers-reduced-motion and hardware concurrency/memory tiers', () => {
    assert.equal(
      resolveHardwareQualitySeed({
        minScale: 0.25,
        maxScale: 1.0,
        env: {
          navigator: { hardwareConcurrency: 12, deviceMemory: 16 },
          matchMedia: () => ({ matches: true }),
        },
      }),
      0.25
    );

    assert.equal(
      resolveHardwareQualitySeed({
        minScale: 0.25,
        maxScale: 1.0,
        env: {
          navigator: { hardwareConcurrency: 10, deviceMemory: 16 },
          matchMedia: () => ({ matches: false }),
        },
      }),
      1.0
    );

    assert.equal(
      resolveHardwareQualitySeed({
        minScale: 0.25,
        maxScale: 1.0,
        env: {
          navigator: { hardwareConcurrency: 2, deviceMemory: 2 },
          matchMedia: () => ({ matches: false }),
        },
      }),
      0.42
    );
  });

  test('steps down rapidly on sustained >18.7ms overload, ignores >125ms tab-switch spikes, and holds deadband steady', () => {
    const gov = createAdaptiveFpsGovernor({
      initialScale: 1.0,
      minScale: 0.25,
      maxScale: 1.0,
      overBudgetStreakRequired: 8,
      downCooldownMs: 100,
      upCooldownMs: 1200,
    });

    // Tab backgrounding spike (450 ms) must be ignored completely
    gov.sampleFrame(450, 1.2);
    assert.equal(gov.getScale(), 1.0);

    // Sustained 28ms frames (~35 FPS) trigger fast multiplicative relief
    for (let i = 0; i < 20; i++) {
      gov.sampleFrame(28, 13.5);
    }
    const reduced = gov.getScale();
    assert.ok(reduced < 1.0 && reduced >= 0.25, `Expected reduced scale < 1.0, got ${reduced}`);
    assert.ok(gov.scaleCount(120, 24) < 120);

    // Steady 16.6ms frames inside deadband hold scale strictly constant (zero oscillation)
    const heldScale = gov.getScale();
    for (let i = 0; i < 60; i++) {
      gov.sampleFrame(16.6, 3.0);
    }
    assert.equal(gov.getScale(), heldScale);

    // Sustained 12.0ms headroom for >1.2s gradually steps back up
    for (let i = 0; i < 140; i++) {
      gov.sampleFrame(12.0, 2.0);
    }
    assert.ok(gov.getScale() > heldScale, 'Expected cautious additive recovery on sustained headroom');
    assert.ok(gov.scaleDpr(2.0, 2.0, 1.0) >= 1.0);
  });
});
