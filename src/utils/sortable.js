/**
 * Pure utility functions for NanoSortableList (virtual-keyboard-ext style
 * whole-card & handle drag-and-drop with dashed placeholder and floating ghost).
 */

export const DEFAULT_INTERACTIVE_IGNORE_SELECTOR = [
  'input',
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
  const from = Math.max(0, Math.min(len - 1, Math.trunc(Number(fromIndex) || 0)));
  const to = Math.max(0, Math.min(len - 1, Math.trunc(Number(toIndex) || 0)));
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
 * Mirrors the exact midpoint-crossing feel of `virtual-keyboard-ext` (`MacroConsole.vue`):
 * - In `'vertical'` layout, inserts before the first visible item whose vertical
 *   midpoint (`top + height / 2`) is below `clientY`.
 * - In `'horizontal'` / `'grid'` layout, checks row & horizontal midpoint (`left + width / 2`).
 *
 * @param {Array<{ top: number, left: number, width: number, height: number }>} visibleRects
 * @param {number} clientX
 * @param {number} clientY
 * @param {'vertical'|'horizontal'|'grid'} [direction='vertical']
 * @returns {number} Slot index in `[0, visibleRects.length]` (which equals `toIndex` in the reordered array).
 */
export const resolveSortableSlot = (
  visibleRects,
  clientX,
  clientY,
  direction = 'vertical'
) => {
  if (!Array.isArray(visibleRects) || visibleRects.length === 0) return 0;

  if (direction === 'horizontal') {
    for (let i = 0; i < visibleRects.length; i += 1) {
      const r = visibleRects[i];
      if (clientX < r.left + r.width / 2) {
        return i;
      }
    }
    return visibleRects.length;
  }

  if (direction === 'grid') {
    for (let i = 0; i < visibleRects.length; i += 1) {
      const r = visibleRects[i];
      const isAboveRow = clientY < r.top;
      const isOnSameRow = Math.abs(clientY - r.top) < r.height;
      const isLeftOfCenter = clientX < r.left + r.width / 2;
      if (isAboveRow || (isOnSameRow && isLeftOfCenter)) {
        return i;
      }
    }
    return visibleRects.length;
  }

  // Default: 'vertical' (cards stacked top-to-bottom)
  for (let i = 0; i < visibleRects.length; i += 1) {
    const r = visibleRects[i];
    if (clientY < r.top + r.height / 2) {
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
  const clampedSlot = Math.max(0, Math.min(totalItems - 1, targetSlot));
  if (clampedSlot >= totalItems - 1) {
    return totalItems;
  }
  return clampedSlot < draggedIndex ? clampedSlot : clampedSlot + 1;
};
