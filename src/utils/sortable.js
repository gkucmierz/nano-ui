/**
 * Pure utility functions for NanoSortableList (virtual-keyboard-ext style
 * whole-card & handle drag-and-drop with dashed placeholder, floating ghost,
 * and 2D dominant shared surface area detection via interval set algebra).
 */

import { clamp } from './math.js';

export const DEFAULT_INTERACTIVE_IGNORE_SELECTOR = [
  'input',
  'label',
  'button:not([data-drag-handle])',
  'select',
  'textarea',
  'a',
  '[contenteditable="true"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="spinbutton"]',
  '[role="slider"]',
  '.nano-slider',
  '.nano-select',
  '.nano-number-stepper',
  '.nano-switch',
  '.nano-checkbox',
  '.nano-knob',
  '.color-picker',
  '[data-no-drag]',
].join(', ');

const normalizeInterval1D = (r) => {
  if (!Array.isArray(r) || r.length < 2) return null;
  const a = Number(r[0]);
  const b = Number(r[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return a <= b ? [a, b] : [b, a];
};

const mergeIntervals1D = (intervals) => {
  if (!Array.isArray(intervals) || intervals.length === 0) return [];
  const sorted = intervals
    .filter((iv) => Array.isArray(iv) && iv[0] < iv[1])
    .map((iv) => [iv[0], iv[1]])
    .sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  if (sorted.length === 0) return [];

  const merged = [sorted[0]];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = merged[merged.length - 1];
    const curr = sorted[i];
    if (curr[0] <= prev[1]) {
      if (curr[1] > prev[1]) prev[1] = curr[1];
    } else {
      merged.push(curr);
    }
  }
  return merged;
};

const toIntervalList1D = (input) => {
  if (!Array.isArray(input) || input.length === 0) return [];
  if (typeof input[0] === 'number') {
    const single = normalizeInterval1D(input);
    return single && single[0] < single[1] ? [single] : [];
  }
  const list = [];
  for (let i = 0; i < input.length; i += 1) {
    const norm = normalizeInterval1D(input[i]);
    if (norm && norm[0] < norm[1]) {
      list.push(norm);
    }
  }
  return mergeIntervals1D(list);
};

/**
 * Computes the 1D intersection (AND / mutual range) of two ranges or range sets.
 * @param {Array} rangeA - `[min, max]` or `[[min1, max1], ...]`
 * @param {Array} rangeB - `[min, max]` or `[[min1, max1], ...]`
 * @returns {Array<Array<number>>}
 */
export const mutualRange = (rangeA, rangeB) => {
  const listA = toIntervalList1D(rangeA);
  const listB = toIntervalList1D(rangeB);
  if (listA.length === 0 || listB.length === 0) return [];

  const result = [];
  let i = 0;
  let j = 0;
  while (i < listA.length && j < listB.length) {
    const lo = Math.max(listA[i][0], listB[j][0]);
    const hi = Math.min(listA[i][1], listB[j][1]);
    if (lo < hi) {
      result.push([lo, hi]);
    }
    if (listA[i][1] < listB[j][1]) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return result;
};

/**
 * Computes the 1D union (OR / sum range) of two ranges or range sets.
 * @param {Array} rangeA - `[min, max]` or `[[min1, max1], ...]`
 * @param {Array} rangeB - `[min, max]` or `[[min1, max1], ...]`
 * @returns {Array<Array<number>>}
 */
export const sumRange = (rangeA, rangeB) => {
  const listA = toIntervalList1D(rangeA);
  const listB = toIntervalList1D(rangeB);
  return mergeIntervals1D([...listA, ...listB]);
};

/**
 * Computes the 1D set difference (A \ B) of two ranges or range sets.
 * @param {Array} rangeA
 * @param {Array} rangeB
 * @returns {Array<Array<number>>}
 */
export const diffRange = (rangeA, rangeB) => {
  let current = toIntervalList1D(rangeA);
  const subList = toIntervalList1D(rangeB);
  if (current.length === 0 || subList.length === 0) return current;

  for (let s = 0; s < subList.length; s += 1) {
    const [cutLo, cutHi] = subList[s];
    const next = [];
    for (let i = 0; i < current.length; i += 1) {
      const [lo, hi] = current[i];
      if (cutHi <= lo || cutLo >= hi) {
        next.push([lo, hi]);
      } else {
        if (lo < cutLo) next.push([lo, cutLo]);
        if (cutHi < hi) next.push([cutHi, hi]);
      }
    }
    current = next;
    if (current.length === 0) break;
  }
  return current;
};

/**
 * Computes the 1D symmetric difference (XOR / A Δ B) of two ranges or range sets.
 * @param {Array} rangeA
 * @param {Array} rangeB
 * @returns {Array<Array<number>>}
 */
export const xorRange = (rangeA, rangeB) => {
  const onlyA = diffRange(rangeA, rangeB);
  const onlyB = diffRange(rangeB, rangeA);
  return mergeIntervals1D([...onlyA, ...onlyB]);
};

/**
 * Measures the total 1D length of a range `[min, max]` or array of ranges `[[min, max], ...]`.
 * @param {Array} rangeOrRanges
 * @returns {number}
 */
export const measureRange = (rangeOrRanges) => {
  const list = toIntervalList1D(rangeOrRanges);
  let total = 0;
  for (let i = 0; i < list.length; i += 1) {
    total += list[i][1] - list[i][0];
  }
  return total;
};

/**
 * Computes the 2D shared surface area (intersection area) between two bounding rectangles
 * by factoring the 2D intersection into 1D `mutualRange` projections along X and Y.
 * @param {{ left: number, top: number, width: number, height: number }} rectA
 * @param {{ left: number, top: number, width: number, height: number }} rectB
 * @returns {number} Shared 2D area (>= 0)
 */
export const computeSharedArea2D = (rectA, rectB) => {
  if (!rectA || !rectB) return 0;
  const xOverlap = mutualRange(
    [rectA.left, rectA.left + rectA.width],
    [rectB.left, rectB.left + rectB.width]
  );
  if (xOverlap.length === 0) return 0;

  const yOverlap = mutualRange(
    [rectA.top, rectA.top + rectA.height],
    [rectB.top, rectB.top + rectB.height]
  );
  if (yOverlap.length === 0) return 0;

  return measureRange(xOverlap) * measureRange(yOverlap);
};

/**
 * Resolves the candidate slot index (`0 .. slotRects.length - 1`) that shares the
 * dominant 2D overlapping surface area with `draggedRect`.
 * Returns `null` if `draggedRect` does not overlap with any candidate slot (`maxArea <= 0`).
 *
 * @param {Array<{ left: number, top: number, width: number, height: number }>} slotRects
 * @param {{ left: number, top: number, width: number, height: number }} draggedRect
 * @param {number|null} [currentSlot=null]
 * @returns {number|null}
 */
export const resolveSortableSlotByArea = (slotRects, draggedRect, currentSlot = null) => {
  if (!Array.isArray(slotRects) || slotRects.length === 0 || !draggedRect) {
    return null;
  }

  let bestIndex = -1;
  let maxArea = 0;
  let currentSlotArea = 0;

  for (let i = 0; i < slotRects.length; i += 1) {
    const area = computeSharedArea2D(draggedRect, slotRects[i]);
    if (i === currentSlot) {
      currentSlotArea = area;
    }
    if (area > maxArea) {
      maxArea = area;
      bestIndex = i;
    }
  }

  if (bestIndex < 0 || maxArea <= 0) {
    return null;
  }

  // Tie-breaker stability: if currentSlot has equal shared area, keep currentSlot
  if (
    currentSlot !== null &&
    currentSlot >= 0 &&
    currentSlot < slotRects.length &&
    currentSlotArea >= maxArea
  ) {
    return currentSlot;
  }

  return bestIndex;
};

/**
 * Non-mutating array reorder moving element from `fromIndex` to `toIndex`.
 * @param {Array} items
 * @param {number} fromIndex
 * @param {number} toIndex
 * @returns {Array}
 */
export const reorderArray = (items, fromIndex, toIndex) => {
  if (!Array.isArray(items) || items.length <= 1) {
    return Array.isArray(items) ? [...items] : [];
  }
  const len = items.length;
  const from = clamp(Math.trunc(Number(fromIndex) || 0), 0, len - 1);
  const to = clamp(Math.trunc(Number(toIndex) || 0), 0, len - 1);
  if (from === to) return [...items];
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

/**
 * Given the bounding boxes of the non-hidden sibling items (all items except
 * the currently dragged item), computes the target slot index (`0 .. visibleRects.length`)
 * where the dashed placeholder should sit and where the item will land on drop.
 *
 * When `options.slotRects` and `options.draggedRect` are provided, first selects the
 * candidate slot with the dominant 2D shared surface area (`computeSharedArea2D`),
 * falling back to midpoint crossing when the dragged card is outside all slots.
 *
 * @param {Array<{ top: number, left: number, width: number, height: number }>} visibleRects
 * @param {number} clientX
 * @param {number} clientY
 * @param {'vertical'|'horizontal'|'grid'} [direction='vertical']
 * @param {Object} [options={}]
 * @returns {number} Slot index in `[0, visibleRects.length]` (which equals `toIndex` in the reordered array).
 */
export const resolveSortableSlot = (
  visibleRects,
  clientX,
  clientY,
  direction = 'vertical',
  options = {}
) => {
  if (options && Array.isArray(options.slotRects) && options.draggedRect) {
    const areaWinner = resolveSortableSlotByArea(
      options.slotRects,
      options.draggedRect,
      options.currentSlot ?? null
    );
    if (areaWinner !== null) {
      return areaWinner;
    }
  }

  if (!Array.isArray(visibleRects) || visibleRects.length === 0) return 0;

  // Use the geometric center of draggedRect if available, otherwise cursor (clientX, clientY)
  const refX = options?.draggedRect
    ? options.draggedRect.left + options.draggedRect.width / 2
    : clientX;
  const refY = options?.draggedRect
    ? options.draggedRect.top + options.draggedRect.height / 2
    : clientY;

  if (direction === 'horizontal') {
    for (let i = 0; i < visibleRects.length; i += 1) {
      const r = visibleRects[i];
      if (refX < r.left + r.width / 2) {
        return i;
      }
    }
    return visibleRects.length;
  }

  if (direction === 'grid') {
    for (let i = 0; i < visibleRects.length; i += 1) {
      const r = visibleRects[i];
      const isAboveRow = refY < r.top;
      const isOnSameRow = Math.abs(refY - r.top) < r.height;
      const isLeftOfCenter = refX < r.left + r.width / 2;
      if (isAboveRow || (isOnSameRow && isLeftOfCenter)) {
        return i;
      }
    }
    return visibleRects.length;
  }

  // Default: 'vertical' (cards stacked top-to-bottom)
  for (let i = 0; i < visibleRects.length; i += 1) {
    const r = visibleRects[i];
    if (refY < r.top + r.height / 2) {
      return i;
    }
  }
  return visibleRects.length;
};

/**
 * Maps a `targetSlot` (`0 .. totalItems - 1`) and `draggedIndex` (`0 .. totalItems - 1`)
 * to the raw item index (`0 .. totalItems`) before which the `.nano-sortable-placeholder`
 * should be rendered in the DOM (while `item[draggedIndex]` is hidden with `display: none`).
 *
 * @param {number} targetSlot
 * @param {number} draggedIndex
 * @param {number} totalItems
 * @returns {number} Raw DOM index (`0 .. totalItems`), where `totalItems` means append at end of list.
 */
export const resolvePlaceholderBeforeIndex = (targetSlot, draggedIndex, totalItems) => {
  if (totalItems <= 1) return 0;
  const clampedSlot = clamp(targetSlot, 0, totalItems - 1);
  if (clampedSlot >= totalItems - 1) {
    return totalItems;
  }
  return clampedSlot < draggedIndex ? clampedSlot : clampedSlot + 1;
};
