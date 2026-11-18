import { is } from './type.js';

/**
 * Extracts a deterministic per-feature slug from a modal title by stripping
 * dynamic per-entity / per-repository / per-instance suffixes (`—`, `–`, ` - `, `(`, `:`, `|`, `·`).
 *
 * Examples:
 * - "Working Tree Diff — bitcoin-logo (±5 uncommitted on main)" -> "working_tree_diff"
 * - "Confirm Git Push — milowice-pl" -> "confirm_git_push"
 * - "🏗️ Gitea Live Build Stream — dashboard-app" -> "gitea_live_build_stream"
 */
export function extractFeatureTitleSlug(title) {
  const raw = is(title, 'string') ? title : String(title || '');
  if (!raw.trim()) return '';

  const featurePart = raw
    .split(/\s+[—–|-]\s+|\s*[:|·]\s+|\s*\(/)[0]
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return featurePart;
}

/**
 * Parses numeric pixel values or CSS viewport-unit strings ('80vh', '94vw', '680px')
 * into concrete pixels for bounding-box clamping.
 */
export function resolveCssViewportPixels(dim, viewportSpan, fallbackPx) {
  if (is(dim, 'number') && Number.isFinite(dim) && dim > 0) {
    return dim;
  }
  if (is(dim, 'string')) {
    const trimmed = dim.trim().toLowerCase();
    const num = Number.parseFloat(trimmed);
    if (Number.isFinite(num) && num > 0) {
      if (trimmed.endsWith('vh') || trimmed.endsWith('vw') || trimmed.endsWith('%')) {
        return Math.round((num / 100) * viewportSpan);
      }
      if (trimmed.endsWith('px') || /^[0-9.]+$/.test(trimmed)) {
        return Math.round(num);
      }
    }
  }
  return fallbackPx;
}

/**
 * Clamps persisted modal geometry (`x`, `y`, `width`, `height`) to the active viewport
 * while preserving user-chosen coordinates on split-screen panes where default modal
 * width (e.g. 1160px) exceeds the current browser width.
 */
export function clampModalGeometryBox(
  box,
  {
    viewportWidth = 1280,
    viewportHeight = 800,
    minWidth = 320,
    minHeight = 200,
    fallbackWidth = 600,
    fallbackHeight = 460,
  } = {}
) {
  const vw = is(viewportWidth, 'number') && viewportWidth > 0 ? viewportWidth : 1280;
  const vh = is(viewportHeight, 'number') && viewportHeight > 0 ? viewportHeight : 800;
  const safeMinW = Math.min(minWidth, Math.max(240, vw - 16));
  const safeMinH = Math.min(minHeight, Math.max(160, vh - 16));

  let w = is(box?.width, 'number') && Number.isFinite(box.width) ? box.width : null;
  let h = is(box?.height, 'number') && Number.isFinite(box.height) ? box.height : null;

  if (w !== null) {
    w = Math.max(safeMinW, Math.min(w, Math.max(safeMinW, vw - 16)));
  }
  if (h !== null) {
    h = Math.max(safeMinH, Math.min(h, Math.max(safeMinH, vh - 16)));
  }

  let x = is(box?.x, 'number') && Number.isFinite(box.x) ? box.x : null;
  let y = is(box?.y, 'number') && Number.isFinite(box.y) ? box.y : null;

  if (x !== null && y !== null) {
    const resolvedFallbackW = Math.min(
      resolveCssViewportPixels(fallbackWidth, vw, 600),
      Math.max(safeMinW, vw - 16)
    );
    const resolvedFallbackH = Math.min(
      resolveCssViewportPixels(fallbackHeight, vh, 460),
      Math.max(safeMinH, vh - 16)
    );
    const effectiveW = w ?? resolvedFallbackW;
    const effectiveH = h ?? resolvedFallbackH;

    // Guarantee at least 160px of horizontal window & 48px of header remain reachable inside viewport
    const requiredVisibleW = Math.min(effectiveW, Math.max(160, Math.min(effectiveW, vw - 16)));
    const requiredVisibleH = Math.min(effectiveH, Math.max(48, Math.min(effectiveH, vh - 16)));

    const maxX = Math.max(0, vw - requiredVisibleW);
    const maxY = Math.max(0, vh - requiredVisibleH);

    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));
  }

  return { x, y, width: w, height: h };
}
