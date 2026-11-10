import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COVERFLOW_ORIENTATIONS,
  COVERFLOW_FADE_MODES,
  clampCoverFlowIndex,
  stepCoverFlowIndex,
  computeCoverFlowItemTransform,
} from '../../src/utils/coverflow.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const coverFlowVuePath = path.resolve(__dirname, '../../src/components/NanoCoverFlow.vue');

describe('NanoCoverFlow 3D Bookshelf / Curtain Geometry Engine', () => {
  test('clampCoverFlowIndex and stepCoverFlowIndex should bound and wrap indices cleanly', () => {
    assert.deepEqual(COVERFLOW_ORIENTATIONS, ['horizontal', 'vertical']);
    assert.equal(clampCoverFlowIndex(-3, 4), 0);
    assert.equal(clampCoverFlowIndex(9, 4), 3);
    assert.equal(stepCoverFlowIndex(0, -1, 4, false), 0);
    assert.equal(stepCoverFlowIndex(0, -1, 4, true), 3);
    assert.equal(stepCoverFlowIndex(3, 1, 4, true), 0);
  });

  test('computeCoverFlowItemTransform should fold left and right cards inward like library books / stage curtains', () => {
    const center = computeCoverFlowItemTransform(1, 1, {
      orientation: 'horizontal',
      sideAngleDeg: 75,
      centerGapPx: 180,
      stackSpacingPx: 50,
      depthOffsetPx: 140,
    });
    assert.equal(center.isActive, true);
    assert.equal(center.rotateY, 0);
    assert.equal(center.translateX, 0);
    assert.equal(center.translateZ, 0);

    const leftCard = computeCoverFlowItemTransform(0, 1, {
      orientation: 'horizontal',
      sideAngleDeg: 75,
      centerGapPx: 180,
      stackSpacingPx: 50,
      depthOffsetPx: 140,
    });
    assert.equal(leftCard.isLeftOrTop, true);
    assert.equal(leftCard.rotateY, 75);
    assert.equal(leftCard.translateX, -180);
    assert.equal(leftCard.translateZ, -140);

    const rightCard = computeCoverFlowItemTransform(2, 1, {
      orientation: 'horizontal',
      sideAngleDeg: 75,
      centerGapPx: 180,
      stackSpacingPx: 50,
      depthOffsetPx: 140,
    });
    assert.equal(rightCard.isRightOrBottom, true);
    assert.equal(rightCard.rotateY, -75);
    assert.equal(rightCard.translateX, 180);
    assert.equal(rightCard.translateZ, -140);
  });

  test('computeCoverFlowItemTransform should support vertical 1-column orientation', () => {
    const topCard = computeCoverFlowItemTransform(0, 1, {
      orientation: 'vertical',
      sideAngleDeg: 72,
      centerGapPx: 160,
    });
    assert.equal(topCard.translateX, 0);
    assert.equal(topCard.translateY, -160);
    assert.equal(topCard.rotateX, -72);
    assert.equal(topCard.rotateY, 0);
  });

  test('NanoCoverFlow.vue enforces fixed card height by default (autoExpandActive: false) and clamps effectiveCardWidth on mobile', () => {
    const src = fs.readFileSync(coverFlowVuePath, 'utf8');
    assert.match(
      src,
      /autoExpandActive:\s*\{\s*type:\s*Boolean,\s*default:\s*false/s,
      'autoExpandActive must default to false so cards have a deterministic fixed height'
    );
    assert.ok(
      src.includes('effectiveCardWidth'),
      'Clamps effectiveCardWidth on narrow mobile viewports'
    );
  });

  test('computeCoverFlowItemTransform supports fadeMode switch ("color" default vs "opacity" for mixed/animated backdrops)', () => {
    assert.deepEqual(COVERFLOW_FADE_MODES, ['color', 'opacity']);
    const colorSide = computeCoverFlowItemTransform(3, 1, { fadeMode: 'color' });
    assert.equal(colorSide.opacity, 1, 'color fadeMode keeps shelf cards at opacity=1 to prevent rear bleed and GPU alpha group overhead');

    const opacitySide1 = computeCoverFlowItemTransform(2, 1, { fadeMode: 'opacity' });
    const opacitySide3 = computeCoverFlowItemTransform(4, 1, { fadeMode: 'opacity' });
    assert.ok(opacitySide1.opacity < 1 && opacitySide1.opacity > 0.6);
    assert.ok(opacitySide3.opacity < opacitySide1.opacity && opacitySide3.opacity > 0.2);

    const src = fs.readFileSync(coverFlowVuePath, 'utf8');
    assert.match(src, /fadeMode:\s*\{/);
    assert.match(src, /\.theme-light\s+\.nano-cf-shade/);
    assert.match(src, /\.theme-light\s+\.nano-cf-card-surface/);
  });
});
