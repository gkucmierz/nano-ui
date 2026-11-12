/**
 * @file src/utils/tooltipGeometry.js
 * @description Pure deterministic C¹ speech-bubble contour generator for `<GlobalTooltip>`.
 *
 * Eliminates the classic CSS `::after` rotated-square defect where:
 *   1. The tooltip box's horizontal `border-top` / `border-bottom` remains visible underneath
 *      the arrow base (especially with translucent glassmorphic `--nano-tooltip-bg`), and
 *   2. Overlapping translucent fills double-composite along the seam.
 *
 * Produces a single unified closed SVG `<path>` (`svgPathD` aligned on `0.5px` pixel centers
 * for razor-sharp `1px` strokes) plus a matching `clipPathD` for `backdrop-filter: blur(...)`.
 */

const fmt = (n) => Number(Number(n).toFixed(2));

/**
 * Computes the unified speech-bubble SVG geometry and CSS `clip-path: path(...)` string.
 *
 * @param {Object} params
 * @param {number} params.width - Measured outer width of the tooltip box in px (`>= 24`)
 * @param {number} params.height - Measured outer height of the tooltip box in px (`>= 20`)
 * @param {number} [params.radius=9] - Corner border-radius in px
 * @param {number} [params.arrowX=0] - Horizontal offset of the arrow from `width / 2` in px
 * @param {number} [params.arrowHalfWidth=6.5] - Half-width of the arrow base along the box edge in px
 * @param {number} [params.arrowHeight=6] - Protrusion height of the arrow tip outside the box edge in px
 * @param {boolean} [params.isBottom=false] - `true` when tooltip is placed BELOW target (arrow on top edge pointing UP); `false` when placed ABOVE target (arrow on bottom edge pointing DOWN)
 * @param {number} [params.pad=8] - Extra SVG canvas padding around `[0..width, 0..height]` so the protruding arrow & 1px stroke are never clipped
 * @param {number} [params.tipRounding=1.5] - Quadratic fillet pullback distance at the arrow apex in px
 * @param {number} [params.shoulderRounding=1.0] - Quadratic fillet radius where the arrow legs join the horizontal border in px
 * @returns {{
 *   pad: number,
 *   svgWidth: number,
 *   svgHeight: number,
 *   viewBox: string,
 *   clampedArrowX: number,
 *   arrowCenterX: number,
 *   svgPathD: string,
 *   clipPathD: string
 * }}
 */
export function buildTooltipBubbleGeometry({
  width = 160,
  height = 36,
  radius = 9,
  arrowX = 0,
  arrowHalfWidth = 6.5,
  arrowHeight = 6,
  isBottom = false,
  pad = 8,
  tipRounding = 1.5,
  shoulderRounding = 1.0,
} = {}) {
  const W = Math.max(28, Number(width) || 160);
  const H = Math.max(20, Number(height) || 36);
  const P = Math.max(6, Math.ceil(Number(pad) || 8));

  // Align horizontal & vertical box strokes on 0.5px centers for crisp 1px rendering
  const x0 = 0.5;
  const y0 = 0.5;
  const x1 = W - 0.5;
  const y1 = H - 0.5;

  const r = Math.max(0, Math.min(Number(radius) || 9, (W - 2) / 2, (H - 2) / 2));
  const aw = Math.max(3, Math.min(Number(arrowHalfWidth) || 6.5, (W - 2 * r - 4) / 2));
  const ah = Math.max(0, Math.min(P - 1.5, Number(arrowHeight) ?? 6));
  const shoulderR = ah > 0 ? Math.max(0, Math.min(Number(shoulderRounding) ?? 1.0, 2.5)) : 0;

  // Clamp arrow center safely inside flat horizontal segment between rounded corners
  const minCx = x0 + r + aw + shoulderR + 1;
  const maxCx = x1 - r - aw - shoulderR - 1;
  const rawCx = W / 2 + (Number(arrowX) || 0);
  const cx = minCx <= maxCx ? Math.max(minCx, Math.min(maxCx, rawCx)) : W / 2;
  const clampedArrowX = fmt(cx - W / 2);

  const legLen = Math.hypot(aw, ah) || 1;
  const tipOff = ah > 0 ? Math.max(0, Math.min(Number(tipRounding) ?? 1.5, legLen * 0.42)) : 0;
  const shoulderFrac = legLen > 0 ? Math.min(0.35, shoulderR / legLen) : 0;
  const tipFrac = legLen > 0 ? tipOff / legLen : 0;

  /**
   * Builds closed contour shifted by `(ox, oy)`:
   * - `(0, 0)` for `<svg viewBox="-pad -pad W+2*pad H+2*pad">`
   * - `(pad, pad)` for CSS `clip-path: path(...)` on a `(W+2*pad) × (H+2*pad)` glass layer
   */
  const buildPath = (ox, oy) => {
    const X0 = fmt(x0 + ox);
    const Y0 = fmt(y0 + oy);
    const X1 = fmt(x1 + ox);
    const Y1 = fmt(y1 + oy);
    const R = fmt(r);
    const CX = cx + ox;

    const segs = [`M ${fmt(x0 + r + ox)} ${Y0}`];

    // 1. Top edge (left -> right), with integrated UP-pointing arrow when `isBottom === true`
    if (isBottom && ah > 0 && minCx <= maxCx) {
      const baseLeftX = CX - aw;
      const baseRightX = CX + aw;
      const tipY = y0 + oy - ah;

      const sLeftStartX = fmt(baseLeftX - shoulderR);
      const sLeftEndX = fmt(baseLeftX + aw * shoulderFrac);
      const sLeftEndY = fmt(y0 + oy - ah * shoulderFrac);

      const tLeftX = fmt(CX - aw * tipFrac);
      const tLeftY = fmt(tipY + ah * tipFrac);
      const tRightX = fmt(CX + aw * tipFrac);
      const tRightY = tLeftY;

      const sRightStartX = fmt(baseRightX - aw * shoulderFrac);
      const sRightStartY = sLeftEndY;
      const sRightEndX = fmt(baseRightX + shoulderR);

      segs.push(`L ${sLeftStartX} ${Y0}`);
      if (shoulderR > 0) {
        segs.push(`Q ${fmt(baseLeftX)} ${Y0} ${sLeftEndX} ${sLeftEndY}`);
      }
      segs.push(`L ${tLeftX} ${tLeftY}`);
      if (tipOff > 0) {
        segs.push(`Q ${fmt(CX)} ${fmt(tipY)} ${tRightX} ${tRightY}`);
      } else {
        segs.push(`L ${fmt(CX)} ${fmt(tipY)}`);
      }
      segs.push(`L ${sRightStartX} ${sRightStartY}`);
      if (shoulderR > 0) {
        segs.push(`Q ${fmt(baseRightX)} ${Y0} ${sRightEndX} ${Y0}`);
      }
    }

    segs.push(`L ${fmt(x1 - r + ox)} ${Y0}`);

    // 2. Top-right corner & right edge
    if (r > 0) {
      segs.push(`A ${R} ${R} 0 0 1 ${X1} ${fmt(y0 + r + oy)}`);
    }
    segs.push(`L ${X1} ${fmt(y1 - r + oy)}`);

    // 3. Bottom-right corner
    if (r > 0) {
      segs.push(`A ${R} ${R} 0 0 1 ${fmt(x1 - r + ox)} ${Y1}`);
    }

    // 4. Bottom edge (right -> left), with integrated DOWN-pointing arrow when `isBottom === false`
    if (!isBottom && ah > 0 && minCx <= maxCx) {
      const baseRightX = CX + aw;
      const baseLeftX = CX - aw;
      const tipY = y1 + oy + ah;

      const sRightStartX = fmt(baseRightX + shoulderR);
      const sRightEndX = fmt(baseRightX - aw * shoulderFrac);
      const sRightEndY = fmt(y1 + oy + ah * shoulderFrac);

      const tRightX = fmt(CX + aw * tipFrac);
      const tRightY = fmt(tipY - ah * tipFrac);
      const tLeftX = fmt(CX - aw * tipFrac);
      const tLeftY = tRightY;

      const sLeftStartX = fmt(baseLeftX + aw * shoulderFrac);
      const sLeftStartY = sRightEndY;
      const sLeftEndX = fmt(baseLeftX - shoulderR);

      segs.push(`L ${sRightStartX} ${Y1}`);
      if (shoulderR > 0) {
        segs.push(`Q ${fmt(baseRightX)} ${Y1} ${sRightEndX} ${sRightEndY}`);
      }
      segs.push(`L ${tRightX} ${tRightY}`);
      if (tipOff > 0) {
        segs.push(`Q ${fmt(CX)} ${fmt(tipY)} ${tLeftX} ${tLeftY}`);
      } else {
        segs.push(`L ${fmt(CX)} ${fmt(tipY)}`);
      }
      segs.push(`L ${sLeftStartX} ${sLeftStartY}`);
      if (shoulderR > 0) {
        segs.push(`Q ${fmt(baseLeftX)} ${Y1} ${sLeftEndX} ${Y1}`);
      }
    }

    segs.push(`L ${fmt(x0 + r + ox)} ${Y1}`);

    // 5. Bottom-left corner, left edge, and top-left corner closing the contour
    if (r > 0) {
      segs.push(`A ${R} ${R} 0 0 1 ${X0} ${fmt(y1 - r + oy)}`);
    }
    segs.push(`L ${X0} ${fmt(y0 + r + oy)}`);
    if (r > 0) {
      segs.push(`A ${R} ${R} 0 0 1 ${fmt(x0 + r + ox)} ${Y0}`);
    }
    segs.push('Z');

    return segs.join(' ');
  };

  const svgWidth = fmt(W + 2 * P);
  const svgHeight = fmt(H + 2 * P);

  return {
    pad: P,
    svgWidth,
    svgHeight,
    viewBox: `${-P} ${-P} ${svgWidth} ${svgHeight}`,
    clampedArrowX,
    arrowCenterX: fmt(cx),
    svgPathD: buildPath(0, 0),
    clipPathD: buildPath(P, P),
  };
}
