import { clamp } from './math.js';
import { is } from './type.js';

export const BOUNDED_DRAG_BOUNDARY_ATTR = 'data-nano-drag-boundary';

export const DEFAULT_ISOLATED_BOUNDARY_SELECTORS = Object.freeze([
  '[data-nano-drag-boundary]',
  '[data-drag-boundary]',
  '.nano-sim-viewport',
  '[data-sim-viewport]',
]);

export const OUT_OF_BOUNDS_MODES = Object.freeze([
  'clamp',
  'pause',
  'edge-pause',
  'free',
]);

const INTERACTIVE_CHILD_SELECTOR =
  'button, input, select, textarea, a, [contenteditable="true"], [data-no-drag]';

function unwrapMaybeRef(candidate) {
  if (is(candidate, Object) && 'value' in candidate && !is(candidate.addEventListener, 'function')) {
    return candidate.value;
  }
  return candidate;
}

function isIsolatedBoundaryElement(node, selectorString) {
  if (!is(node, Object)) return false;
  if (is(node.getAttribute, 'function')) {
    const attrVal = node.getAttribute(BOUNDED_DRAG_BOUNDARY_ATTR) ?? node.getAttribute('data-drag-boundary');
    if (is(attrVal, 'string')) {
      return attrVal.trim().toLowerCase() !== 'passthrough';
    }
  }
  if (selectorString && is(node.matches, 'function')) {
    try {
      if (node.matches(selectorString)) return true;
    } catch {
      // Ignore unsupported selector engines in minimal mock DOMs
    }
  }
  return false;
}

/**
 * Discovers the highest reachable event-target boundary above `originEl` without
 * blindly assuming a global top-level `window`.
 *
 * Traversal contract (`BOUNDED-DRAG-01`):
 * 1. Explicit `options.boundary` (Element / ShadowRoot / Document / Window / Ref / CSS selector / resolver fn).
 * 2. Nearest enclosing isolated/simulated viewport (`[data-nano-drag-boundary]`, `.nano-sim-viewport`, `[data-sim-viewport]`).
 * 3. Active Fullscreen host (`ownerDocument.fullscreenElement`) when containing `originEl`.
 * 4. Closed or non-pierceable `ShadowRoot` (`crossShadow: false` or `mode === 'closed'`).
 * 5. Enclosing `ownerDocument.defaultView` (or `ownerDocument` if windowless) — scoped strictly to `originEl`'s own document (iframe-safe).
 * 6. Highest reachable `parentNode` with `addEventListener` in detached/synthetic DOM trees.
 */
export function resolveHighestDragBoundary(originEl, options = {}) {
  const el = unwrapMaybeRef(originEl);
  if (!is(el, Object)) {
    return { target: null, kind: 'none' };
  }

  if (options.boundary !== undefined && options.boundary !== null) {
    let explicit = unwrapMaybeRef(options.boundary);
    if (is(explicit, 'function')) {
      explicit = unwrapMaybeRef(explicit(el));
    } else if (is(explicit, 'string') && is(el.closest, 'function')) {
      try {
        explicit = el.closest(explicit);
      } catch {
        explicit = null;
      }
    }
    if (is(explicit, Object) && is(explicit.addEventListener, 'function')) {
      return { target: explicit, kind: 'explicit' };
    }
  }

  const customSelectors = Array.isArray(options.boundarySelectors)
    ? options.boundarySelectors.filter((s) => is(s, 'string') && s.trim().length > 0)
    : DEFAULT_ISOLATED_BOUNDARY_SELECTORS;
  const selectorString = customSelectors.join(', ');

  const ownerDoc = is(el.ownerDocument, Object) ? el.ownerDocument : null;
  const fsHost =
    ownerDoc &&
    is(ownerDoc.fullscreenElement, Object) &&
    is(ownerDoc.fullscreenElement.contains, 'function') &&
    ownerDoc.fullscreenElement.contains(el)
      ? ownerDoc.fullscreenElement
      : null;

  const visited = new Set();
  let cur = el;
  let highestTarget = is(el.addEventListener, 'function') ? el : null;
  let highestKind = highestTarget ? 'origin' : 'none';

  while (is(cur, Object) && !visited.has(cur)) {
    visited.add(cur);

    if (is(cur.addEventListener, 'function')) {
      highestTarget = cur;
      if (cur !== el) {
        highestKind = 'subtree-root';
      }
    }

    if (isIsolatedBoundaryElement(cur, selectorString) && is(cur.addEventListener, 'function')) {
      return { target: cur, kind: 'isolated-boundary' };
    }

    if (fsHost && cur === fsHost && is(cur.addEventListener, 'function')) {
      return { target: cur, kind: 'fullscreen-host' };
    }

    if (is(cur.parentNode, Object)) {
      cur = cur.parentNode;
      continue;
    }

    // ShadowRoot boundary (nodeType === 11)
    if (cur.nodeType === 11) {
      const canCross = options.crossShadow !== false && cur.mode !== 'closed' && is(cur.host, Object);
      if (!canCross) {
        return {
          target: highestTarget,
          kind: highestTarget ? 'shadow-root' : 'none',
        };
      }
      cur = cur.host;
      continue;
    }

    // Document root (nodeType === 9)
    if (cur.nodeType === 9) {
      if (options.preferWindow !== false && is(cur.defaultView, Object) && is(cur.defaultView.addEventListener, 'function')) {
        return { target: cur.defaultView, kind: 'owner-window' };
      }
      if (is(cur.addEventListener, 'function')) {
        return { target: cur, kind: 'owner-document' };
      }
      break;
    }

    break;
  }

  return { target: highestTarget, kind: highestKind };
}

/**
 * Projects viewport pointer coordinates `(clientX, clientY)` into normalized `[0..1]`
 * coordinates relative to `rect`, preserving raw signed coordinates alongside clamped ones.
 */
export function projectPointerToBox(clientX, clientY, rect) {
  const cx = Number(clientX);
  const cy = Number(clientY);
  const left = Number(rect?.left) || 0;
  const top = Number(rect?.top) || 0;
  const width = Number(rect?.width) || 0;
  const height = Number(rect?.height) || 0;

  if (!Number.isFinite(cx) || !Number.isFinite(cy) || width <= 0 || height <= 0) {
    return null;
  }

  const rawX = (cx - left) / width;
  const rawY = (cy - top) / height;
  const isInside = rawX >= 0 && rawX <= 1 && rawY >= 0 && rawY <= 1;

  return {
    clientX: cx,
    clientY: cy,
    rawX,
    rawY,
    clampedX: clamp(rawX, 0, 1),
    clampedY: clamp(rawY, 0, 1),
    isInside,
    rect: { left, top, width, height },
  };
}

/**
 * Parametric Liang-Barsky line-segment clipper against the unit square `[0, 1] x [0, 1]`.
 * Computes exact entry/exit intersections when a fast drag sweeps across or out of a canvas border.
 */
export function clipSegmentToUnitBox(x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  let t0 = 0;
  let t1 = 1;

  const p = [-dx, dx, -dy, dy];
  const q = [x0, 1 - x0, y0, 1 - y0];

  for (let i = 0; i < 4; i++) {
    const pk = p[i];
    const qk = q[i];
    if (pk === 0) {
      if (qk < 0) return null;
    } else {
      const r = qk / pk;
      if (pk < 0) {
        if (r > t1) return null;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return null;
        if (r < t1) t1 = r;
      }
    }
  }

  return {
    t0,
    t1,
    entryX: clamp(x0 + t0 * dx, 0, 1),
    entryY: clamp(y0 + t0 * dy, 0, 1),
    exitX: clamp(x0 + t1 * dx, 0, 1),
    exitY: clamp(y0 + t1 * dy, 0, 1),
  };
}

/**
 * Framework-agnostic continuous pointer-drag session controller (`BOUNDED-DRAG-01`).
 *
 * Guarantees that dragging outside the origin element's bounding box NEVER breaks the active
 * drag loop (`pointerleave` is ignored), binding capture-phase `pointermove`/`pointerup`/`pointercancel`
 * listeners on the highest reachable abstraction boundary (`resolveHighestDragBoundary`) paired with
 * W3C `setPointerCapture` when available.
 *
 * Out-of-bounds projection modes (`outOfBoundsMode`):
 * - `'edge-pause'` (default for 2D paint/heatmap surfaces): emits exact Liang-Barsky boundary exit point
 *   on leaving, pauses duplicate emissions while wandering outside without breaking the drag loop,
 *   and resumes immediately upon re-entering (or sweeping across) `[0, 1]^2`.
 * - `'pause'`: emits samples strictly when `isInside === true`, keeping the session alive while outside.
 * - `'clamp'`: emits every move clamped to `[0, 1]^2` (ideal for sliders, scrubbers, 2D color pickers).
 * - `'free'`: emits every move with unclamped `x = rawX, y = rawY` (ideal for floating window/pan deltas).
 */
export function createBoundedPointerDrag(options = {}) {
  const mode = OUT_OF_BOUNDS_MODES.includes(options.outOfBoundsMode)
    ? options.outOfBoundsMode
    : 'clamp';
  const ignoreInteractiveChildren = options.ignoreInteractiveChildren !== false;

  let active = false;
  let activePointerId = null;
  let originEl = null;
  let boundaryTarget = null;
  let boundaryKind = 'none';
  let hasPointerCapture = false;
  let prevRawX = null;
  let prevRawY = null;
  let wasInside = false;

  let removeBoundaryListeners = null;

  function readOriginRect() {
    if (is(options.getRect, 'function')) {
      return options.getRect(originEl);
    }
    if (is(originEl?.getBoundingClientRect, 'function')) {
      return originEl.getBoundingClientRect();
    }
    return null;
  }

  function buildPayload(projection, x, y, extra = {}) {
    return {
      x,
      y,
      rawX: projection.rawX,
      rawY: projection.rawY,
      clampedX: projection.clampedX,
      clampedY: projection.clampedY,
      clientX: projection.clientX,
      clientY: projection.clientY,
      isInside: projection.isInside,
      rect: projection.rect,
      pointerId: activePointerId,
      boundaryTarget,
      boundaryKind,
      ...extra,
    };
  }

  function detachListeners() {
    if (is(removeBoundaryListeners, 'function')) {
      removeBoundaryListeners();
      removeBoundaryListeners = null;
    }
    if (hasPointerCapture && activePointerId !== null && is(originEl?.releasePointerCapture, 'function')) {
      try {
        originEl.releasePointerCapture(activePointerId);
      } catch {
        // Ignore already-released capture handles
      }
    }
    hasPointerCapture = false;
  }

  function finishDrag(event, reason = 'pointerup') {
    if (!active) return;
    active = false;

    const finalRect = readOriginRect();
    const finalProj =
      event && finalRect ? projectPointerToBox(event.clientX, event.clientY, finalRect) : null;

    detachListeners();

    if (is(options.onStateChange, 'function')) {
      options.onStateChange({
        isDragging: false,
        isInside: false,
        boundaryTarget: null,
        boundaryKind: 'none',
      });
    }

    if (is(options.onEnd, 'function')) {
      options.onEnd({
        reason,
        event: event || null,
        pointerId: activePointerId,
        isInside: finalProj ? finalProj.isInside : false,
        clampedX: finalProj ? finalProj.clampedX : null,
        clampedY: finalProj ? finalProj.clampedY : null,
        boundaryTarget,
        boundaryKind,
      });
    }

    activePointerId = null;
    originEl = null;
    boundaryTarget = null;
    boundaryKind = 'none';
    prevRawX = null;
    prevRawY = null;
    wasInside = false;
  }

  function matchesPointer(event) {
    if (!active) return false;
    if (activePointerId === null || event?.pointerId === undefined || event?.pointerId === null) {
      return true;
    }
    return event.pointerId === activePointerId;
  }

  function handlePointerMove(event) {
    if (!matchesPointer(event)) return;

    // Zombie-drag guard: if a primary mouse button was released outside an uncaptured frame, terminate cleanly
    if (
      event?.pointerType === 'mouse' &&
      is(event.buttons, 'number') &&
      (event.buttons & 1) === 0
    ) {
      finishDrag(event, 'buttons-released');
      return;
    }

    const rect = readOriginRect();
    const proj = projectPointerToBox(event?.clientX, event?.clientY, rect);
    if (!proj) return;

    const enteredBounds = !wasInside && proj.isInside;
    const exitedBounds = wasInside && !proj.isInside;

    if (is(options.onStateChange, 'function') && (enteredBounds || exitedBounds)) {
      options.onStateChange({
        isDragging: true,
        isInside: proj.isInside,
        boundaryTarget,
        boundaryKind,
      });
    }

    if (mode === 'free') {
      options.onMove?.(
        buildPayload(proj, proj.rawX, proj.rawY, {
          enteredBounds,
          exitedBounds,
          clippedEdge: false,
          event,
        })
      );
    } else if (mode === 'clamp') {
      options.onMove?.(
        buildPayload(proj, proj.clampedX, proj.clampedY, {
          enteredBounds,
          exitedBounds,
          clippedEdge: !proj.isInside,
          event,
        })
      );
    } else if (mode === 'pause') {
      if (proj.isInside) {
        options.onMove?.(
          buildPayload(proj, proj.clampedX, proj.clampedY, {
            enteredBounds,
            exitedBounds: false,
            clippedEdge: false,
            event,
          })
        );
      } else {
        options.onOutOfBoundsMove?.(buildPayload(proj, proj.clampedX, proj.clampedY, { exitedBounds, event }));
      }
    } else if (mode === 'edge-pause') {
      if (proj.isInside) {
        if (enteredBounds && prevRawX !== null && prevRawY !== null) {
          const clipped = clipSegmentToUnitBox(prevRawX, prevRawY, proj.rawX, proj.rawY);
          if (
            clipped &&
            (Math.abs(clipped.entryX - proj.clampedX) > 1e-3 ||
              Math.abs(clipped.entryY - proj.clampedY) > 1e-3)
          ) {
            options.onMove?.(
              buildPayload(proj, clipped.entryX, clipped.entryY, {
                enteredBounds: true,
                exitedBounds: false,
                clippedEdge: true,
                event,
              })
            );
          }
        }
        options.onMove?.(
          buildPayload(proj, proj.clampedX, proj.clampedY, {
            enteredBounds,
            exitedBounds: false,
            clippedEdge: false,
            event,
          })
        );
      } else {
        // Pointer is outside [0..1]^2: emit exact Liang-Barsky edge crossing if the segment touched the box, then pause
        if (prevRawX !== null && prevRawY !== null) {
          const clipped = clipSegmentToUnitBox(prevRawX, prevRawY, proj.rawX, proj.rawY);
          if (clipped) {
            if (!wasInside) {
              // Fast sweep crossed right across the box from outside to outside in one frame
              options.onMove?.(
                buildPayload(proj, clipped.entryX, clipped.entryY, {
                  enteredBounds: true,
                  exitedBounds: false,
                  clippedEdge: true,
                  event,
                })
              );
            }
            options.onMove?.(
              buildPayload(proj, clipped.exitX, clipped.exitY, {
                enteredBounds: false,
                exitedBounds: true,
                clippedEdge: true,
                event,
              })
            );
          }
        }
        options.onOutOfBoundsMove?.(buildPayload(proj, proj.clampedX, proj.clampedY, { exitedBounds, event }));
      }
    }

    prevRawX = proj.rawX;
    prevRawY = proj.rawY;
    wasInside = proj.isInside;
  }

  function handlePointerUp(event) {
    if (!matchesPointer(event)) return;
    finishDrag(event, 'pointerup');
  }

  function handlePointerCancel(event) {
    if (!matchesPointer(event)) return;
    finishDrag(event, 'pointercancel');
  }

  function handleWindowBlur(event) {
    if (!active) return;
    finishDrag(event, 'blur');
  }

  function handleLostPointerCapture(event) {
    if (!matchesPointer(event)) return;
    hasPointerCapture = false;
    // Only terminate on lostpointercapture if there is no higher boundary target above originEl
    if (!boundaryTarget || boundaryTarget === originEl) {
      finishDrag(event, 'lostpointercapture');
    }
  }

  function onPointerDown(event) {
    if (options.disabled) return false;
    if (!is(event, Object)) return false;

    if (event.pointerType !== 'touch' && is(event.button, 'number') && event.button !== 0) {
      return false;
    }

    const resolvedEl = unwrapMaybeRef(
      is(options.getElement, 'function')
        ? options.getElement(event)
        : event.currentTarget || event.target
    );
    if (!is(resolvedEl, Object)) return false;

    if (ignoreInteractiveChildren && is(event.target?.closest, 'function')) {
      const hitControl = event.target.closest(INTERACTIVE_CHILD_SELECTOR);
      if (hitControl && hitControl !== resolvedEl) {
        return false;
      }
    }

    if (active) {
      finishDrag(null, 'restart');
    }

    originEl = resolvedEl;
    const resolvedBoundary = resolveHighestDragBoundary(originEl, options);
    boundaryTarget = resolvedBoundary.target || originEl;
    boundaryKind = resolvedBoundary.kind;
    activePointerId = is(event.pointerId, 'number') ? event.pointerId : null;

    const rect = readOriginRect();
    const proj = projectPointerToBox(event.clientX, event.clientY, rect);
    if (!proj) return false;

    if (options.requireInitialInside !== false && !proj.isInside) {
      return false;
    }

    active = true;
    prevRawX = proj.rawX;
    prevRawY = proj.rawY;
    wasInside = proj.isInside;

    if (activePointerId !== null && is(originEl.setPointerCapture, 'function')) {
      try {
        originEl.setPointerCapture(activePointerId);
        hasPointerCapture = true;
      } catch {
        hasPointerCapture = false;
      }
    }

    const cleanups = [];
    if (is(boundaryTarget?.addEventListener, 'function') && is(boundaryTarget?.removeEventListener, 'function')) {
      const captureOpts = { capture: true };
      boundaryTarget.addEventListener('pointermove', handlePointerMove, captureOpts);
      boundaryTarget.addEventListener('pointerup', handlePointerUp, captureOpts);
      boundaryTarget.addEventListener('pointercancel', handlePointerCancel, captureOpts);
      cleanups.push(() => {
        boundaryTarget.removeEventListener('pointermove', handlePointerMove, captureOpts);
        boundaryTarget.removeEventListener('pointerup', handlePointerUp, captureOpts);
        boundaryTarget.removeEventListener('pointercancel', handlePointerCancel, captureOpts);
      });

      if (boundaryKind === 'owner-window') {
        boundaryTarget.addEventListener('blur', handleWindowBlur);
        cleanups.push(() => boundaryTarget.removeEventListener('blur', handleWindowBlur));
      }
    }

    if (is(originEl.addEventListener, 'function') && is(originEl.removeEventListener, 'function')) {
      originEl.addEventListener('lostpointercapture', handleLostPointerCapture);
      cleanups.push(() => originEl.removeEventListener('lostpointercapture', handleLostPointerCapture));
    }

    removeBoundaryListeners = () => {
      for (const fn of cleanups) fn();
    };

    if (is(options.onStateChange, 'function')) {
      options.onStateChange({
        isDragging: true,
        isInside: proj.isInside,
        boundaryTarget,
        boundaryKind,
      });
    }

    const startPayload = buildPayload(
      proj,
      mode === 'free' ? proj.rawX : proj.clampedX,
      mode === 'free' ? proj.rawY : proj.clampedY,
      {
        enteredBounds: proj.isInside,
        exitedBounds: false,
        clippedEdge: false,
        event,
      }
    );

    options.onStart?.(startPayload);
    if (options.emitSampleOnDown !== false) {
      options.onMove?.(startPayload);
    }

    return true;
  }

  return {
    onPointerDown,
    cancel: (reason = 'cancel') => finishDrag(null, reason),
    destroy: () => finishDrag(null, 'destroy'),
    isDragging: () => active,
    getBoundaryKind: () => boundaryKind,
    getBoundaryTarget: () => boundaryTarget,
  };
}
