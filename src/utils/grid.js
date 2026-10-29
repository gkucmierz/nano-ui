/**
 * Detects the live number of rendered columns in a CSS Grid or Flex container
 * by inspecting the bounding rectangles (`getBoundingClientRect().top`) of its visible children,
 * falling back to `getComputedStyle(gridEl).gridTemplateColumns`.
 *
 * @param {HTMLElement|null} gridEl - Grid container element.
 * @param {string|null} [itemSelector=null] - Optional CSS selector for grid items (falls back to direct `gridEl.children`).
 * @param {number} [tolerance=10] - Vertical pixel tolerance for grouping items in the first row.
 * @returns {number} Detected column count ($\ge 1$).
 */
export const detectRenderedGridColumns = (gridEl, itemSelector = ':scope > *', tolerance = 10) => {
  if (!gridEl) {
    return 1;
  }

  let items = [];
  if (typeof gridEl.querySelectorAll === 'function' && itemSelector) {
    items = Array.from(gridEl.querySelectorAll(itemSelector));
  }
  if (items.length === 0 && gridEl.children) {
    items = Array.from(gridEl.children);
  }

  items = items.filter((el) =>
    typeof el.checkVisibility === 'function' ? el.checkVisibility() : true
  );

  if (items.length >= 2 && typeof items[0].getBoundingClientRect === 'function') {
    const firstTop = items[0].getBoundingClientRect().top;
    let firstRowCount = 0;
    for (const item of items) {
      const rect = item.getBoundingClientRect();
      if (Math.abs(rect.top - firstTop) <= tolerance) {
        firstRowCount += 1;
      } else {
        break;
      }
    }
    if (firstRowCount >= 1) {
      return firstRowCount;
    }
  }

  if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    const template = window.getComputedStyle(gridEl).gridTemplateColumns || '';
    const tracks = template
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (tracks.length >= 1) {
      return tracks.length;
    }
  }

  return 1;
};
