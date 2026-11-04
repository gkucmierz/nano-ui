import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  reorderArray,
  mutualRange,
  sumRange,
  diffRange,
  xorRange,
  measureRange,
  computeSharedArea2D,
  resolveSortableSlotByArea,
  resolveSortableSlot,
  resolvePlaceholderBeforeIndex,
} from '../../src/utils/sortable.js';
import { NANO_ACCENT_PRESETS, pickNanoPresetByPort } from '../../src/utils/colors.js';

describe('sortable utils (NanoSortableList)', () => {
  it('reorders items without mutating original array', () => {
    const items = ['a', 'b', 'c', 'd'];
    const movedDown = reorderArray(items, 0, 2);
    assert.deepEqual(movedDown, ['b', 'c', 'a', 'd']);
    assert.deepEqual(items, ['a', 'b', 'c', 'd']);

    const movedUp = reorderArray(items, 3, 1);
    assert.deepEqual(movedUp, ['a', 'd', 'b', 'c']);
  });

  it('computes 1D range set operations (AND, OR, SUB, XOR, measure)', () => {
    assert.deepEqual(mutualRange([1, 4], [3, 7]), [[3, 4]]);
    assert.deepEqual(mutualRange([1, 2], [5, 7]), []);
    assert.deepEqual(sumRange([[1, 4], [3, 7], [8, 10]]), [[1, 7], [8, 10]]);
    assert.deepEqual(diffRange([1, 9], [3, 7]), [[1, 3], [7, 9]]);
    assert.deepEqual(xorRange([1, 4], [3, 7]), [[1, 3], [4, 7]]);
    assert.equal(measureRange([[1, 3], [4, 7]]), 5);
  });

  it('computes 2D shared surface area and selects slot with dominant overlap', () => {
    const slotRects = [
      { left: 0, top: 0, width: 200, height: 100 },     // Slot #0
      { left: 210, top: 0, width: 200, height: 100 },   // Slot #1
      { left: 420, top: 0, width: 200, height: 100 },   // Slot #2 (Slot #3 in UI)
      { left: 630, top: 0, width: 200, height: 100 },   // Slot #3 (Slot #4 in UI)
    ];

    // Dragged card overlaps 140x80 = 11200 px^2 with Slot #2, and only 50x80 = 4000 px^2 with Slot #3,
    // even if the pointer (e.g. near right edge of card at x=640) is inside Slot #3!
    const draggedRect = { left: 480, top: 10, width: 200, height: 80 };
    assert.equal(computeSharedArea2D(draggedRect, slotRects[2]), 140 * 80);
    assert.equal(computeSharedArea2D(draggedRect, slotRects[3]), 50 * 80);
    assert.equal(resolveSortableSlotByArea(slotRects, draggedRect, 3), 2);
    assert.equal(
      resolveSortableSlot(slotRects.slice(0, 3), 640, 50, 'grid', {
        slotRects,
        draggedRect,
        currentSlot: 3,
      }),
      2
    );
  });

  it('maps port deterministically to a Nano UI color preset via modulo', () => {
    const p1 = pickNanoPresetByPort(24613);
    const p2 = pickNanoPresetByPort(24613);
    assert.equal(p1, p2);
    assert.ok(NANO_ACCENT_PRESETS.includes(p1));
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

  it('NanoCheckbox wraps box and label in a clickable <label> without native double-toggle', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const src = await fs.readFile(
      path.resolve(import.meta.dirname, '../../src/components/NanoCheckbox.vue'),
      'utf8'
    );
    assert.match(src, /<label[\s\S]*?class="nano-checkbox"[\s\S]*?@click\.stop\.prevent="toggle"/);
    assert.doesNotMatch(src, /class="nano-checkbox-label"[^>]*@click/);
  });
});
