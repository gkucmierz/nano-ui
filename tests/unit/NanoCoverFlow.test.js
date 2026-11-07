import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COVERFLOW_ORIENTATIONS,
  clampCoverFlowIndex,
  stepCoverFlowIndex,
  computeCoverFlowItemTransform,
} from '../../src/utils/coverflow.js';

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
});
