import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  reorderArray,
  resolveSortableSlot,
  resolvePlaceholderBeforeIndex,
} from '../../src/utils/sortable.js';

describe('sortable utils (NanoSortableList)', () => {
  it('reorders items without mutating original array', () => {
    const items = ['a', 'b', 'c', 'd'];
    const movedDown = reorderArray(items, 0, 2);
    assert.deepEqual(movedDown, ['b', 'c', 'a', 'd']);
    assert.deepEqual(items, ['a', 'b', 'c', 'd']);

    const movedUp = reorderArray(items, 3, 1);
    assert.deepEqual(movedUp, ['a', 'd', 'b', 'c']);
  });

  it('resolves vertical sortable slot across sibling midpoints', () => {
    const visibleRects = [
      { top: 100, left: 0, width: 400, height: 80 }, // midpoint Y = 140
      { top: 190, left: 0, width: 400, height: 80 }, // midpoint Y = 230
      { top: 280, left: 0, width: 400, height: 80 }, // midpoint Y = 320
    ];

    assert.equal(resolveSortableSlot(visibleRects, 50, 120, 'vertical'), 0);
    assert.equal(resolveSortableSlot(visibleRects, 50, 160, 'vertical'), 1);
    assert.equal(resolveSortableSlot(visibleRects, 50, 250, 'vertical'), 2);
    assert.equal(resolveSortableSlot(visibleRects, 50, 350, 'vertical'), 3);
  });

  it('maps targetSlot and draggedIndex to placeholder DOM beforeIndex', () => {
    // 4 items total, dragging index 0
    assert.equal(resolvePlaceholderBeforeIndex(0, 0, 4), 1);
    assert.equal(resolvePlaceholderBeforeIndex(1, 0, 4), 2);
    assert.equal(resolvePlaceholderBeforeIndex(2, 0, 4), 3);
    assert.equal(resolvePlaceholderBeforeIndex(3, 0, 4), 4);

    // 4 items total, dragging index 2
    assert.equal(resolvePlaceholderBeforeIndex(0, 2, 4), 0);
    assert.equal(resolvePlaceholderBeforeIndex(1, 2, 4), 1);
    assert.equal(resolvePlaceholderBeforeIndex(2, 2, 4), 3);
    assert.equal(resolvePlaceholderBeforeIndex(3, 2, 4), 4);
  });
});
