const objTag = (v) => Object.prototype.toString.call(v);
const isFn = (v) => objTag(v) === '[object Function]';
const isObj = (v) => v !== null && objTag(v) === '[object Object]';
const isBool = (v) => objTag(v) === '[object Boolean]';
const isNum = (v) => objTag(v) === '[object Number]' && Number.isFinite(v);

/**
 * Builds a 2D occupancy matrix `rows[r][c] = itemIndex` (or `-1` for empty gap)
 * when `spanLastRow` or `colSpans` is enabled.
 * Mirrors `@gkucmierz/utils` (`grid-navigation.mjs`).
 *
 * @param {number} totalItems
 * @param {number} cols
 * @param {Object} opts
 * @returns {{ matrix: number[][], itemPos: Array<{ row: number, cols: number[] }> }}
 */
const buildSpannedGridMatrix = (totalItems, cols, opts = {}) => {
  const spanLastRow = Boolean(opts.spanLastRow);
  const colSpans = opts.colSpans || null;
  const matrix = [];
  const itemPos = Array.from({ length: totalItems }, () => ({ row: 0, cols: [] }));

  let curRow = new Array(cols).fill(-1);
  let c = 0;

  for (let i = 0; i < totalItems; i += 1) {
    let span = 1;
    if (colSpans) {
      const rawSpan = colSpans[i];
      if (Number.isFinite(Number(rawSpan)) && Number(rawSpan) >= 1) {
        span = Math.min(cols, Math.floor(Number(rawSpan)));
      }
    }
    if (c + span > cols) {
      matrix.push(curRow);
      curRow = new Array(cols).fill(-1);
      c = 0;
    }
    if (spanLastRow && i === totalItems - 1 && c < cols) {
      span = cols - c;
    }
    const rowIdx = matrix.length;
    itemPos[i].row = rowIdx;
    for (let k = 0; k < span && c < cols; k += 1) {
      curRow[c] = i;
      itemPos[i].cols.push(c);
      c += 1;
    }
    if (c >= cols) {
      matrix.push(curRow);
      curRow = new Array(cols).fill(-1);
      c = 0;
    }
  }

  if (c > 0) {
    matrix.push(curRow);
  }

  return { matrix, itemPos };
};

/**
 * Resolves the next 0-based index when navigating a 2D grid (matrix) that may contain
 * trailing gaps in its last row (`totalItems` not divisible by `columns`) or spanned cells.
 * Pure 1:1 companion to `navigateGrid` in `@gkucmierz/utils`.
 *
 * @param {number} currentIndex
 * @param {number} totalItems
 * @param {'left'|'right'|'up'|'down'|'ArrowLeft'|'ArrowRight'|'ArrowUp'|'ArrowDown'} direction
 * @param {number|Object} [columnsOrOptions=1]
 * @param {Object} [maybeOptions={}]
 * @returns {number}
 */
export const navigateGrid = (
  currentIndex,
  totalItems,
  direction,
  columnsOrOptions = 1,
  maybeOptions = {}
) => {
  if (!Number.isFinite(totalItems) || totalItems <= 0) {
    return -1;
  }

  const hasOptsObj = isObj(columnsOrOptions);
  const opts = hasOptsObj ? columnsOrOptions : (maybeOptions || {});
  const rawCols = hasOptsObj ? opts.columns : columnsOrOptions;
  const cols = Math.max(1, Math.floor(Number(rawCols) || 1));

  const cur =
    Number.isFinite(currentIndex) && currentIndex >= 0 && currentIndex < totalItems
      ? Math.floor(currentIndex)
      : 0;

  const baseWrap = isBool(opts.wrap) ? opts.wrap : true;
  const wrapHoriz = isBool(opts.wrapHorizontal)
    ? opts.wrapHorizontal
    : isBool(opts.wrapHoriz)
      ? opts.wrapHoriz
      : baseWrap;
  const wrapVert = isBool(opts.wrapVertical)
    ? opts.wrapVertical
    : isBool(opts.wrapVert)
      ? opts.wrapVert
      : baseWrap;
  const rowStrict = Boolean(opts.rowStrict);
  const hasSpans = Boolean(opts.spanLastRow || opts.colSpans);

  const row = Math.floor(cur / cols);
  const col = cur % cols;

  let deltaH = 0;
  let deltaV = 0;

  switch (direction) {
  case 'right':
  case 'ArrowRight':
    deltaH = 1;
    break;
  case 'left':
  case 'ArrowLeft':
    deltaH = -1;
    break;
  case 'down':
  case 'ArrowDown':
    deltaV = 1;
    break;
  case 'up':
  case 'ArrowUp':
    deltaV = -1;
    break;
  default:
    return cur;
  }

  if (deltaH !== 0) {
    if (rowStrict) {
      if (hasSpans && cols > 1) {
        const { matrix, itemPos } = buildSpannedGridMatrix(totalItems, cols, opts);
        const curRowIdx = itemPos[cur]?.row ?? 0;
        const rowItems = [];
        for (const cellItem of matrix[curRowIdx] || []) {
          if (cellItem >= 0 && !rowItems.includes(cellItem)) {
            rowItems.push(cellItem);
          }
        }
        const posInRow = rowItems.indexOf(cur);
        if (posInRow < 0 || rowItems.length <= 0) return cur;
        const nextPos = posInRow + deltaH;
        if (nextPos >= 0 && nextPos < rowItems.length) {
          return rowItems[nextPos];
        }
        if (wrapHoriz) {
          return rowItems[((nextPos % rowItems.length) + rowItems.length) % rowItems.length];
        }
        return cur;
      }
      const rowStart = row * cols;
      const rowLen = Math.min(cols, totalItems - rowStart);
      if (rowLen <= 0) return cur;
      const nextCol = col + deltaH;
      if (nextCol >= 0 && nextCol < rowLen) {
        return rowStart + nextCol;
      }
      if (wrapHoriz) {
        return rowStart + (((nextCol % rowLen) + rowLen) % rowLen);
      }
      return cur;
    }

    const nextIdx = cur + deltaH;
    if (nextIdx >= 0 && nextIdx < totalItems) {
      return nextIdx;
    }
    if (wrapHoriz) {
      return ((nextIdx % totalItems) + totalItems) % totalItems;
    }
    return cur;
  }

  if (hasSpans && cols > 1) {
    const { matrix, itemPos } = buildSpannedGridMatrix(totalItems, cols, opts);
    const curInfo = itemPos[cur] || { row: 0, cols: [0] };
    const occupiedCols = curInfo.cols.length > 0 ? curInfo.cols : [0];
    let targetCol = occupiedCols[0];
    if (occupiedCols.length > 1 && Number.isFinite(Number(opts.preferredCol))) {
      const pref = Math.max(0, Math.min(cols - 1, Math.floor(Number(opts.preferredCol))));
      if (occupiedCols.includes(pref)) {
        targetCol = pref;
      }
    }

    const validRowsForCol = [];
    for (let r = 0; r < matrix.length; r += 1) {
      if (matrix[r][targetCol] >= 0) {
        validRowsForCol.push(r);
      }
    }
    if (validRowsForCol.length === 0) return cur;

    const curRowPos = validRowsForCol.indexOf(curInfo.row);
    const baseRowPos = curRowPos >= 0 ? curRowPos : 0;
    const nextRowPos = baseRowPos + deltaV;
    if (nextRowPos >= 0 && nextRowPos < validRowsForCol.length) {
      return matrix[validRowsForCol[nextRowPos]][targetCol];
    }
    if (wrapVert) {
      const wrappedPos =
        ((nextRowPos % validRowsForCol.length) + validRowsForCol.length) %
        validRowsForCol.length;
      return matrix[validRowsForCol[wrappedPos]][targetCol];
    }
    return cur;
  }

  const colRows = col < totalItems ? Math.floor((totalItems - 1 - col) / cols) + 1 : 0;
  if (colRows <= 0) return cur;

  const nextRow = row + deltaV;
  if (nextRow >= 0 && nextRow < colRows) {
    return nextRow * cols + col;
  }
  if (wrapVert) {
    const wrappedRow = ((nextRow % colRows) + colRows) % colRows;
    return wrappedRow * cols + col;
  }
  return cur;
};

/**
 * Pure geometric utility detecting the number of columns in the first row of a 2D layout.
 * Mirrors `detectGridColumns` in `@gkucmierz/utils`.
 *
 * @param {Iterable<*>} items
 * @param {Function|number} [getRowOffset=(x) => x]
 * @param {number} [tolerance=0]
 * @returns {number}
 */
export const detectGridColumns = (items, getRowOffset = (x) => x, tolerance = 0) => {
  if (!items || !isFn(items[Symbol.iterator])) {
    return 1;
  }

  const hasProjector = isFn(getRowOffset);
  const projector = hasProjector ? getRowOffset : (x) => x;
  const tol = Math.max(0, Number(hasProjector ? tolerance : getRowOffset) || 0);

  let firstOffset = null;
  let firstRowCount = 0;
  let idx = 0;

  for (const item of items) {
    const raw = projector(item, idx++);
    const offset = isNum(raw) ? raw : Number(raw);
    if (!Number.isFinite(offset)) {
      continue;
    }
    if (firstOffset === null) {
      firstOffset = offset;
      firstRowCount = 1;
    } else if (Math.abs(offset - firstOffset) <= tol) {
      firstRowCount += 1;
    } else {
      break;
    }
  }

  return Math.max(1, firstRowCount);
};

/**
 * Computes a balanced column count for desktop/tablet 2D language or preset matrices
 * (e.g. 4->2x2, 6->3x2, 8->4x2, 9->3x3, 12->4x3) to avoid orphan single-item trailing rows.
 *
 * @param {number} count
 * @param {{ maxCols?: number }} [opts]
 * @returns {number}
 */
export const resolveAdaptiveMatrixColumns = (count, { maxCols = 4 } = {}) => {
  const n = Math.max(1, Math.floor(Number(count) || 1));
  const cap = Math.max(1, Math.floor(Number(maxCols) || 4));
  if (n <= 3) return Math.min(cap, n);
  if (n === 4) return Math.min(cap, 2);
  if (n === 5 || n === 6) return Math.min(cap, 3);
  if (n === 9 && cap >= 3) return 3;
  return Math.min(cap, 4);
};

/**
 * Detects the live number of rendered columns in a CSS Grid or Flex container
 * by inspecting the bounding rectangles (`getBoundingClientRect().top`) of its visible children,
 * falling back to `getComputedStyle(gridEl).gridTemplateColumns`.
 *
 * @param {HTMLElement|null} gridEl - Grid container element.
 * @param {string|null} [itemSelector=':scope > *'] - Optional CSS selector for grid items.
 * @param {number} [tolerance=10] - Vertical pixel tolerance for grouping items in the first row.
 * @returns {number} Detected column count ($\ge 1$).
 */
export const detectRenderedGridColumns = (gridEl, itemSelector = ':scope > *', tolerance = 10) => {
  if (!gridEl) {
    return 1;
  }

  let items = [];
  if (isFn(gridEl.querySelectorAll) && itemSelector) {
    items = Array.from(gridEl.querySelectorAll(itemSelector));
  }
  if (items.length === 0 && gridEl.children) {
    items = Array.from(gridEl.children);
  }

  items = items.filter((el) =>
    isFn(el.checkVisibility) ? el.checkVisibility() : true
  );

  if (items.length >= 2 && isFn(items[0].getBoundingClientRect)) {
    return detectGridColumns(
      items,
      (el) => el.getBoundingClientRect().top,
      tolerance
    );
  }

  const win = globalThis.window;
  if (win && isFn(win.getComputedStyle)) {
    const template = win.getComputedStyle(gridEl).gridTemplateColumns || '';
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
