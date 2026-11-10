/**
 * Pure 3D CoverFlow / Bookshelf Curtain geometry engine (`@gkucmierz/nano-ui`).
 * Computes deterministic 3D transforms (`translate3d`, `rotateY` / `rotateX`, `scale`, `zIndex`, `opacity`)
 * for macOS Finder / iTunes style CoverFlow and library-shelf curtain carousels in both
 * horizontal (1 row) and vertical (1 column) orientations.
 */

export const COVERFLOW_ORIENTATIONS = Object.freeze(['horizontal', 'vertical']);
export const COVERFLOW_FADE_MODES = Object.freeze(['color', 'opacity']);

export function clampCoverFlowIndex(index, length) {
  const count = Math.max(0, Number(length) || 0);
  if (count === 0) return 0;
  const raw = Math.round(Number(index) || 0);
  return Math.max(0, Math.min(count - 1, raw));
}

export function stepCoverFlowIndex(currentIndex, delta, length, loop = false) {
  const count = Math.max(0, Number(length) || 0);
  if (count <= 1) return 0;
  const cur = clampCoverFlowIndex(currentIndex, count);
  const step = Math.trunc(Number(delta) || 0);
  const next = cur + step;
  if (loop) {
    return ((next % count) + count) % count;
  }
  return clampCoverFlowIndex(next, count);
}

/**
 * Computes the 3D transform and visual state for an item at `index` relative to `activeIndex`.
 *
 * @param {number} index - Item index in the list (`0 .. length - 1`)
 * @param {number} activeIndex - Currently focused center item index (`can be fractional during drag`)
 * @param {object} [options]
 * @param {'horizontal'|'vertical'} [options.orientation='horizontal'] - 1-row (`horizontal`) or 1-column (`vertical`)
 * @param {number} [options.sideAngleDeg=72] - Bookshelf / curtain rotation angle in degrees (`0..88`, default `72°`)
 * @param {number} [options.centerGapPx=170] - Distance from center card to the first folded side card
 * @param {number} [options.stackSpacingPx=54] - Tight spacing between consecutive folded side cards on the shelf
 * @param {number} [options.depthOffsetPx=140] - Z-axis recession of folded side cards (`translateZ(-depth)`)
 * @param {number} [options.stackDepthStepPx=28] - Additional Z-axis recession per step away from center
 * @param {number} [options.maxVisibleSide=6] - Maximum visible cards on each side before fading out
 */
export function computeCoverFlowItemTransform(
  index,
  activeIndex,
  {
    orientation = 'horizontal',
    sideAngleDeg = 72,
    centerGapPx = 170,
    stackSpacingPx = 54,
    depthOffsetPx = 140,
    stackDepthStepPx = 68,
    maxVisibleSide = 6,
    fadeMode = 'color',
  } = {}
) {
  const offset = Number(index) - Number(activeIndex);
  const absOffset = Math.abs(offset);
  const sign = offset === 0 ? 0 : offset > 0 ? 1 : -1;
  const isVertical = orientation === 'vertical';

  const clampedAngle = Math.max(15, Math.min(88, Number(sideAngleDeg) || 72));
  const gap = Number(centerGapPx) || 170;
  const spacing = Number(stackSpacingPx) || 54;
  const baseDepth = Number(depthOffsetPx) || 140;
  const depthStep = Number(stackDepthStepPx) || 68;
  const maxVis = Math.max(1, Number(maxVisibleSide) || 6);

  // Smooth interpolation within [-1, 1] around the center stage
  const centralBlend = Math.min(1, absOffset);
  const shelfSteps = Math.max(0, absOffset - 1);

  const primaryShiftPx =
    sign * (centralBlend * gap + shelfSteps * spacing);
  const translateZPx =
    -(centralBlend * baseDepth + shelfSteps * depthStep);

  // Left cards turn right (+angle around Y) so their front faces inward toward center;
  // Right cards turn left (-angle around Y) like books on a shelf / stage curtains.
  const angleDeg = -sign * centralBlend * clampedAngle;

  const translateX = isVertical ? 0 : Number(primaryShiftPx.toFixed(2));
  const translateY = isVertical ? Number(primaryShiftPx.toFixed(2)) : 0;
  const translateZ = Number(translateZPx.toFixed(2));

  const rotateX = isVertical ? Number((-angleDeg).toFixed(2)) : 0;
  const rotateY = isVertical ? 0 : Number(angleDeg.toFixed(2));

  const scale = Number(Math.max(0.72, 1 - centralBlend * 0.08 - shelfSteps * 0.03).toFixed(3));
  const zIndex = Math.max(1, 200 - Math.round(absOffset * 20));
  // In 'color' fadeMode (default): keep side cards on the shelf opaque (opacity = 1) so rear cards
  // never bleed through front cards and the GPU avoids per-card offscreen alpha group compositing;
  // depth dimming is handled by the theme-aware .nano-cf-shade overlay.
  // In 'opacity' fadeMode (for mixed/animated backdrops like @gkucmierz/trianglify): fade cards via alpha.
  const opacity =
    absOffset > maxVis
      ? 0
      : fadeMode === 'opacity'
        ? absOffset < 0.05
          ? 1
          : Number(
            Math.max(
              0,
              Math.min(1, Math.pow(Math.max(0, 1 - absOffset / (maxVis + 0.4)), 1.35))
            ).toFixed(3)
          )
        : absOffset > maxVis - 0.75
          ? Number(Math.max(0, (maxVis - absOffset) / 0.75).toFixed(3))
          : 1;

  const transform = isVertical
    ? `translate3d(0px, ${translateY}px, ${translateZ}px) rotateX(${rotateX}deg) scale(${scale})`
    : `translate3d(${translateX}px, 0px, ${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`;

  return {
    index,
    offset: Number(offset.toFixed(3)),
    absOffset: Number(absOffset.toFixed(3)),
    isActive: absOffset < 0.45,
    isLeftOrTop: offset < -0.05,
    isRightOrBottom: offset > 0.05,
    translateX,
    translateY,
    translateZ,
    rotateX,
    rotateY,
    scale,
    zIndex,
    opacity,
    pointerEvents: absOffset > maxVis ? 'none' : 'auto',
    transform,
  };
}

/**
 * Steps a 1D critically-damped kinetic spring (`position`, `velocity`) toward `target`.
 * Supports rapid multi-click impulse accumulation (`2, 3, 5+` rapid arrow clicks or card jumps)
 * without resetting transitions or snapping.
 */
export function stepCoverFlowKineticSpring(
  state,
  target,
  dtSec = 1 / 60,
  { stiffness = 280, damping = 30, restDelta = 0.002, restSpeed = 0.015 } = {}
) {
  const dt = Math.min(0.05, Math.max(0.001, Number(dtSec) || 1 / 60));
  const pos = Number(state?.position) || 0;
  const vel = Number(state?.velocity) || 0;
  const tgt = Number(target) || 0;

  const displacement = pos - tgt;
  const springForce = -stiffness * displacement;
  const dampingForce = -damping * vel;
  const acceleration = springForce + dampingForce;

  const nextVel = vel + acceleration * dt;
  const nextPos = pos + nextVel * dt;

  // Prevent overshooting past target if we crossed it at low speed or critically damped
  const crossedTarget = (pos - tgt) * (nextPos - tgt) < 0 && Math.abs(nextVel) < 1.2;
  if (
    crossedTarget ||
    (Math.abs(nextPos - tgt) <= restDelta && Math.abs(nextVel) <= restSpeed)
  ) {
    return {
      position: tgt,
      velocity: 0,
      settled: true,
    };
  }

  return {
    position: nextPos,
    velocity: nextVel,
    settled: false,
  };
}
