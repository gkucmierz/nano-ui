import { createAdaptiveFpsGovernor } from './adaptiveFpsGovernor.js';
import { is, isCallable } from './type.js';

export const NANO_MORPH_MODES = Object.freeze([
  'auto',
  'flip',
  'bezier',
  'freeze',
  'kinetic-worker',
]);

export const DEFAULT_MORPH_DURATION_MS = 340;
export const DEFAULT_MORPH_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

const KAPPA = 0.5522847498307936; // 4 * (sqrt(2) - 1) / 3

const clamp01 = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
};

const lerp = (a, b, t) => a + (b - a) * t;

const roundCoord = (n) => Number(Number(n || 0).toFixed(3));

export function parseCubicBezierEasing(easing = DEFAULT_MORPH_EASING) {
  if (!is(easing, 'string')) return [0.4, 0, 0.2, 1];
  const trimmed = easing.trim().toLowerCase();
  if (trimmed === 'linear') return [0, 0, 1, 1];
  if (trimmed === 'ease') return [0.25, 0.1, 0.25, 1];
  if (trimmed === 'ease-in') return [0.42, 0, 1, 1];
  if (trimmed === 'ease-out') return [0, 0, 0.58, 1];
  if (trimmed === 'ease-in-out') return [0.42, 0, 0.58, 1];
  const m = trimmed.match(
    /^cubic-bezier\(\s*([+-]?\d*\.?\d+)\s*,\s*([+-]?\d*\.?\d+)\s*,\s*([+-]?\d*\.?\d+)\s*,\s*([+-]?\d*\.?\d+)\s*\)$/
  );
  if (!m) return [0.4, 0, 0.2, 1];
  return [
    clamp01(Number(m[1])),
    Number(m[2]),
    clamp01(Number(m[3])),
    Number(m[4]),
  ];
}

export function evaluateCubicBezierEasing(progress, easing = DEFAULT_MORPH_EASING) {
  const x = clamp01(progress);
  if (x <= 0 || x >= 1) return x;
  const [p1x, p1y, p2x, p2y] = is(easing, 'array')
    ? easing
    : parseCubicBezierEasing(easing);
  if (p1x === p1y && p2x === p2y) return x;

  const sampleCurve = (a1, a2, u) =>
    (((1 - 3 * a2 + 3 * a1) * u + (3 * a2 - 6 * a1)) * u + 3 * a1) * u;
  const sampleDerivative = (a1, a2, u) =>
    (3 * (1 - 3 * a2 + 3 * a1) * u + 2 * (3 * a2 - 6 * a1)) * u + 3 * a1;

  let u = x;
  for (let i = 0; i < 6; i += 1) {
    const dx = sampleCurve(p1x, p2x, u) - x;
    if (Math.abs(dx) < 1e-6) break;
    const d = sampleDerivative(p1x, p2x, u);
    if (Math.abs(d) < 1e-6) break;
    u = clamp01(u - dx / d);
  }
  return sampleCurve(p1y, p2y, u);
}

/* ============================================================================
 * TIER 1: DOM / Box FLIP Morph
 * ========================================================================== */

function parsePixelRadius(rawRadius, width, height) {
  if (is(rawRadius, 'number') && Number.isFinite(rawRadius)) {
    return Math.max(0, rawRadius);
  }
  if (!is(rawRadius, 'string') || !rawRadius.trim()) return 0;
  const firstToken = rawRadius.trim().split(/\s+/)[0];
  if (firstToken.endsWith('%')) {
    const pct = Number.parseFloat(firstToken);
    if (!Number.isFinite(pct)) return 0;
    return (Math.min(width || 0, height || 0) * pct) / 100;
  }
  const px = Number.parseFloat(firstToken);
  return Number.isFinite(px) ? Math.max(0, px) : 0;
}

export function measureElementMorphRect(el, env = null) {
  if (!el || !isCallable(el.getBoundingClientRect)) {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      borderRadius: 0,
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      boxShadow: 'none',
    };
  }
  const rect = el.getBoundingClientRect();
  const win = env?.window ?? (is(globalThis.window, Object) ? globalThis.window : null);
  const cs = win && isCallable(win.getComputedStyle) ? win.getComputedStyle(el) : null;
  const width = Number(rect.width) || 0;
  const height = Number(rect.height) || 0;
  return {
    x: Number(rect.left ?? rect.x) || 0,
    y: Number(rect.top ?? rect.y) || 0,
    width,
    height,
    borderRadius: parsePixelRadius(cs?.borderRadius, width, height),
    backgroundColor: cs?.backgroundColor || 'transparent',
    borderColor: cs?.borderColor || 'transparent',
    boxShadow: cs?.boxShadow || 'none',
  };
}

export function computeFlipInvertTransform(firstRect, lastRect) {
  const wA = Math.max(1, Number(firstRect?.width) || 1);
  const hA = Math.max(1, Number(firstRect?.height) || 1);
  const wB = Math.max(1, Number(lastRect?.width) || 1);
  const hB = Math.max(1, Number(lastRect?.height) || 1);
  const dx = (Number(firstRect?.x) || 0) - (Number(lastRect?.x) || 0);
  const dy = (Number(firstRect?.y) || 0) - (Number(lastRect?.y) || 0);
  const scaleX = wA / wB;
  const scaleY = hA / hB;
  return {
    dx: roundCoord(dx),
    dy: roundCoord(dy),
    scaleX: Number(scaleX.toFixed(4)),
    scaleY: Number(scaleY.toFixed(4)),
    transform: `translate3d(${roundCoord(dx)}px, ${roundCoord(dy)}px, 0) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`,
  };
}

export function interpolateMorphBox(rectA, rectB, progress) {
  const t = clamp01(progress);
  const x = lerp(Number(rectA?.x) || 0, Number(rectB?.x) || 0, t);
  const y = lerp(Number(rectA?.y) || 0, Number(rectB?.y) || 0, t);
  const width = Math.max(1, lerp(Number(rectA?.width) || 1, Number(rectB?.width) || 1, t));
  const height = Math.max(1, lerp(Number(rectA?.height) || 1, Number(rectB?.height) || 1, t));
  const borderRadius = Math.max(
    0,
    lerp(Number(rectA?.borderRadius) || 0, Number(rectB?.borderRadius) || 0, t)
  );
  return {
    x: roundCoord(x),
    y: roundCoord(y),
    width: roundCoord(width),
    height: roundCoord(height),
    borderRadius: roundCoord(borderRadius),
    sourceOpacity: Number((1 - t).toFixed(3)),
    targetOpacity: Number(t.toFixed(3)),
    sourceScale: Number(lerp(1, 0.92, t).toFixed(3)),
    targetScale: Number(lerp(0.92, 1, t).toFixed(3)),
  };
}

/* ============================================================================
 * TIER 2: Vector / SVG & Text Cubic Bézier Morphing
 * ========================================================================== */

function lineToCubic(x0, y0, x1, y1) {
  return {
    x0,
    y0,
    cx1: lerp(x0, x1, 1 / 3),
    cy1: lerp(y0, y1, 1 / 3),
    cx2: lerp(x0, x1, 2 / 3),
    cy2: lerp(y0, y1, 2 / 3),
    x: x1,
    y: y1,
  };
}

function quadToCubic(x0, y0, qx, qy, x1, y1) {
  return {
    x0,
    y0,
    cx1: x0 + (2 / 3) * (qx - x0),
    cy1: y0 + (2 / 3) * (qy - y0),
    cx2: x1 + (2 / 3) * (qx - x1),
    cy2: y1 + (2 / 3) * (qy - y1),
    x: x1,
    y: y1,
  };
}

export function arcToCubicBeziers(x1, y1, rxIn, ryIn, phiDeg, largeArcFlag, sweepFlag, x2, y2) {
  if (Math.abs(x1 - x2) < 1e-9 && Math.abs(y1 - y2) < 1e-9) {
    return [];
  }
  let rx = Math.abs(Number(rxIn) || 0);
  let ry = Math.abs(Number(ryIn) || 0);
  if (rx < 1e-9 || ry < 1e-9) {
    return [lineToCubic(x1, y1, x2, y2)];
  }

  const phi = ((Number(phiDeg) || 0) * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const dx2 = (x1 - x2) / 2;
  const dy2 = (y1 - y2) / 2;
  const x1p = cosPhi * dx2 + sinPhi * dy2;
  const y1p = -sinPhi * dx2 + cosPhi * dy2;

  let rxSq = rx * rx;
  let rySq = ry * ry;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;

  const radiiCheck = x1pSq / rxSq + y1pSq / rySq;
  if (radiiCheck > 1) {
    const scale = Math.sqrt(radiiCheck);
    rx *= scale;
    ry *= scale;
    rxSq = rx * rx;
    rySq = ry * ry;
  }

  const sign = Boolean(largeArcFlag) === Boolean(sweepFlag) ? -1 : 1;
  const num = Math.max(0, rxSq * rySq - rxSq * y1pSq - rySq * x1pSq);
  const den = rxSq * y1pSq + rySq * x1pSq;
  const coef = den > 1e-12 ? sign * Math.sqrt(num / den) : 0;
  const cxp = coef * ((rx * y1p) / ry);
  const cyp = coef * (-(ry * x1p) / rx);

  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

  const vecAngle = (ux, uy, vx, vy) => {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    const ratio = len > 1e-12 ? Math.max(-1, Math.min(1, dot / len)) : 1;
    const ang = Math.acos(ratio);
    return ux * vy - uy * vx < 0 ? -ang : ang;
  };

  const ux = (x1p - cxp) / rx;
  const uy = (y1p - cyp) / ry;
  const vx = (-x1p - cxp) / rx;
  const vy = (-y1p - cyp) / ry;

  const theta1 = vecAngle(1, 0, ux, uy);
  let deltaTheta = vecAngle(ux, uy, vx, vy);
  if (!sweepFlag && deltaTheta > 0) {
    deltaTheta -= Math.PI * 2;
  } else if (sweepFlag && deltaTheta < 0) {
    deltaTheta += Math.PI * 2;
  }

  const segCount = Math.max(1, Math.ceil(Math.abs(deltaTheta) / (Math.PI / 2)));
  const step = deltaTheta / segCount;
  const alpha = (4 / 3) * Math.tan(step / 4);

  const mapUnitToWorld = (px, py) => ({
    x: cosPhi * rx * px - sinPhi * ry * py + cx,
    y: sinPhi * rx * px + cosPhi * ry * py + cy,
  });

  const segments = [];
  let prevX = x1;
  let prevY = y1;

  for (let i = 0; i < segCount; i += 1) {
    const a1 = theta1 + i * step;
    const a2 = a1 + step;
    const cos1 = Math.cos(a1);
    const sin1 = Math.sin(a1);
    const cos2 = Math.cos(a2);
    const sin2 = Math.sin(a2);

    const c1 = mapUnitToWorld(cos1 - alpha * sin1, sin1 + alpha * cos1);
    const c2 = mapUnitToWorld(cos2 + alpha * sin2, sin2 - alpha * cos2);
    const end = i === segCount - 1 ? { x: x2, y: y2 } : mapUnitToWorld(cos2, sin2);

    segments.push({
      x0: prevX,
      y0: prevY,
      cx1: c1.x,
      cy1: c1.y,
      cx2: c2.x,
      cy2: c2.y,
      x: end.x,
      y: end.y,
    });
    prevX = end.x;
    prevY = end.y;
  }

  return segments;
}

function parsePointsList(points) {
  if (is(points, 'array')) {
    return points
      .map((pt) => {
        if (is(pt, 'array')) return { x: Number(pt[0]) || 0, y: Number(pt[1]) || 0 };
        if (is(pt, 'object')) return { x: Number(pt.x) || 0, y: Number(pt.y) || 0 };
        return null;
      })
      .filter(Boolean);
  }
  if (is(points, 'string')) {
    const nums = points.match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi) || [];
    const out = [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      out.push({ x: Number(nums[i]) || 0, y: Number(nums[i + 1]) || 0 });
    }
    return out;
  }
  return [];
}

function parseSvgTagToShape(svgMarkup) {
  const m = svgMarkup.trim().match(/^<\s*(path|rect|circle|ellipse|polygon|polyline)\b([^>]*)\/?\s*>/i);
  if (!m) return null;
  const tag = m[1].toLowerCase();
  const attrStr = m[2] || '';
  const attrs = {};
  const attrRe = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = attrRe.exec(attrStr)) !== null) {
    attrs[match[1]] = match[2] ?? match[3] ?? '';
  }
  if (tag === 'path') return attrs.d || '';
  return { type: tag, ...attrs };
}

export function shapeToPathD(shape) {
  if (is(shape, 'string')) {
    const trimmed = shape.trim();
    if (trimmed.startsWith('<')) {
      const parsed = parseSvgTagToShape(trimmed);
      if (is(parsed, 'string')) return parsed;
      if (parsed) return shapeToPathD(parsed);
      return '';
    }
    return trimmed;
  }
  if (!is(shape, 'object')) return '';

  const type = String(shape.type || shape.tag || '').toLowerCase();
  if (type === 'path' && is(shape.d, 'string')) {
    return shape.d;
  }

  if (type === 'circle') {
    const cx = Number(shape.cx) || 0;
    const cy = Number(shape.cy) || 0;
    const r = Math.max(0, Number(shape.r) || 0);
    const k = r * KAPPA;
    return [
      `M ${cx} ${cy - r}`,
      `C ${cx + k} ${cy - r}, ${cx + r} ${cy - k}, ${cx + r} ${cy}`,
      `C ${cx + r} ${cy + k}, ${cx + k} ${cy + r}, ${cx} ${cy + r}`,
      `C ${cx - k} ${cy + r}, ${cx - r} ${cy + k}, ${cx - r} ${cy}`,
      `C ${cx - r} ${cy - k}, ${cx - k} ${cy - r}, ${cx} ${cy - r}`,
      'Z',
    ].join(' ');
  }

  if (type === 'ellipse') {
    const cx = Number(shape.cx) || 0;
    const cy = Number(shape.cy) || 0;
    const rx = Math.max(0, Number(shape.rx) || 0);
    const ry = Math.max(0, Number(shape.ry) || 0);
    const kx = rx * KAPPA;
    const ky = ry * KAPPA;
    return [
      `M ${cx} ${cy - ry}`,
      `C ${cx + kx} ${cy - ry}, ${cx + rx} ${cy - ky}, ${cx + rx} ${cy}`,
      `C ${cx + rx} ${cy + ky}, ${cx + kx} ${cy + ry}, ${cx} ${cy + ry}`,
      `C ${cx - kx} ${cy + ry}, ${cx - rx} ${cy + ky}, ${cx - rx} ${cy}`,
      `C ${cx - rx} ${cy - ky}, ${cx - kx} ${cy - ry}, ${cx} ${cy - ry}`,
      'Z',
    ].join(' ');
  }

  if (type === 'rect') {
    const x = Number(shape.x) || 0;
    const y = Number(shape.y) || 0;
    const w = Math.max(0, Number(shape.width ?? shape.w) || 0);
    const h = Math.max(0, Number(shape.height ?? shape.h) || 0);
    const rawRx = shape.rx !== undefined ? Number(shape.rx) : Number(shape.ry || 0);
    const rawRy = shape.ry !== undefined ? Number(shape.ry) : rawRx;
    const rx = Math.min(w / 2, Math.max(0, Number.isFinite(rawRx) ? rawRx : 0));
    const ry = Math.min(h / 2, Math.max(0, Number.isFinite(rawRy) ? rawRy : 0));
    if (rx <= 0 || ry <= 0) {
      return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
    }
    const kx = rx * KAPPA;
    const ky = ry * KAPPA;
    return [
      `M ${x + rx} ${y}`,
      `L ${x + w - rx} ${y}`,
      `C ${x + w - rx + kx} ${y}, ${x + w} ${y + ry - ky}, ${x + w} ${y + ry}`,
      `L ${x + w} ${y + h - ry}`,
      `C ${x + w} ${y + h - ry + ky}, ${x + w - rx + kx} ${y + h}, ${x + w - rx} ${y + h}`,
      `L ${x + rx} ${y + h}`,
      `C ${x + rx - kx} ${y + h}, ${x} ${y + h - ry + ky}, ${x} ${y + h - ry}`,
      `L ${x} ${y + ry}`,
      `C ${x} ${y + ry - ky}, ${x + rx - kx} ${y}, ${x + rx} ${y}`,
      'Z',
    ].join(' ');
  }

  if (type === 'polygon' || type === 'polyline') {
    const pts = parsePointsList(shape.points);
    if (pts.length === 0) return '';
    const head = `M ${pts[0].x} ${pts[0].y}`;
    const tail = pts
      .slice(1)
      .map((p) => `L ${p.x} ${p.y}`)
      .join(' ');
    return `${head}${tail ? ` ${tail}` : ''}${type === 'polygon' ? ' Z' : ''}`;
  }

  return '';
}

const PARAM_COUNTS = Object.freeze({
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  A: 7,
  Z: 0,
});

export function pathToCubicBeziers(pathOrShape) {
  const d = shapeToPathD(pathOrShape);
  if (!d) return [];

  const tokens = d.match(/[a-zA-Z]|[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/g);
  if (!tokens || tokens.length === 0) return [];

  const segments = [];
  let idx = 0;
  let cmd = '';
  let curX = 0;
  let curY = 0;
  let startX = 0;
  let startY = 0;
  let prevCubicCtrlX = null;
  let prevCubicCtrlY = null;
  let prevQuadCtrlX = null;
  let prevQuadCtrlY = null;

  const isCommandToken = (tok) => is(tok, 'string') && /^[a-zA-Z]$/.test(tok);

  while (idx < tokens.length) {
    if (isCommandToken(tokens[idx])) {
      cmd = tokens[idx];
      idx += 1;
    } else if (!cmd) {
      break;
    }

    const upper = cmd.toUpperCase();
    const isRel = cmd !== upper;
    const arity = PARAM_COUNTS[upper];
    if (arity === undefined) break;

    if (upper === 'Z') {
      if (Math.hypot(startX - curX, startY - curY) > 1e-6) {
        segments.push(lineToCubic(curX, curY, startX, startY));
      }
      curX = startX;
      curY = startY;
      prevCubicCtrlX = null;
      prevCubicCtrlY = null;
      prevQuadCtrlX = null;
      prevQuadCtrlY = null;
      cmd = '';
      continue;
    }

    if (idx + arity > tokens.length) break;
    const args = [];
    let validArgs = true;
    for (let k = 0; k < arity; k += 1) {
      if (isCommandToken(tokens[idx + k])) {
        validArgs = false;
        break;
      }
      args.push(Number(tokens[idx + k]) || 0);
    }
    if (!validArgs) break;
    idx += arity;

    if (upper === 'M') {
      const nx = isRel ? curX + args[0] : args[0];
      const ny = isRel ? curY + args[1] : args[1];
      curX = nx;
      curY = ny;
      startX = nx;
      startY = ny;
      prevCubicCtrlX = null;
      prevCubicCtrlY = null;
      prevQuadCtrlX = null;
      prevQuadCtrlY = null;
      // Subsequent coordinate pairs after M/m are implicit L/l
      cmd = isRel ? 'l' : 'L';
    } else if (upper === 'L') {
      const nx = isRel ? curX + args[0] : args[0];
      const ny = isRel ? curY + args[1] : args[1];
      segments.push(lineToCubic(curX, curY, nx, ny));
      curX = nx;
      curY = ny;
      prevCubicCtrlX = null;
      prevCubicCtrlY = null;
      prevQuadCtrlX = null;
      prevQuadCtrlY = null;
    } else if (upper === 'H') {
      const nx = isRel ? curX + args[0] : args[0];
      segments.push(lineToCubic(curX, curY, nx, curY));
      curX = nx;
      prevCubicCtrlX = null;
      prevCubicCtrlY = null;
      prevQuadCtrlX = null;
      prevQuadCtrlY = null;
    } else if (upper === 'V') {
      const ny = isRel ? curY + args[0] : args[0];
      segments.push(lineToCubic(curX, curY, curX, ny));
      curY = ny;
      prevCubicCtrlX = null;
      prevCubicCtrlY = null;
      prevQuadCtrlX = null;
      prevQuadCtrlY = null;
    } else if (upper === 'C') {
      const cx1 = isRel ? curX + args[0] : args[0];
      const cy1 = isRel ? curY + args[1] : args[1];
      const cx2 = isRel ? curX + args[2] : args[2];
      const cy2 = isRel ? curY + args[3] : args[3];
      const nx = isRel ? curX + args[4] : args[4];
      const ny = isRel ? curY + args[5] : args[5];
      segments.push({ x0: curX, y0: curY, cx1, cy1, cx2, cy2, x: nx, y: ny });
      prevCubicCtrlX = cx2;
      prevCubicCtrlY = cy2;
      prevQuadCtrlX = null;
      prevQuadCtrlY = null;
      curX = nx;
      curY = ny;
    } else if (upper === 'S') {
      const cx1 = prevCubicCtrlX !== null ? 2 * curX - prevCubicCtrlX : curX;
      const cy1 = prevCubicCtrlY !== null ? 2 * curY - prevCubicCtrlY : curY;
      const cx2 = isRel ? curX + args[0] : args[0];
      const cy2 = isRel ? curY + args[1] : args[1];
      const nx = isRel ? curX + args[2] : args[2];
      const ny = isRel ? curY + args[3] : args[3];
      segments.push({ x0: curX, y0: curY, cx1, cy1, cx2, cy2, x: nx, y: ny });
      prevCubicCtrlX = cx2;
      prevCubicCtrlY = cy2;
      prevQuadCtrlX = null;
      prevQuadCtrlY = null;
      curX = nx;
      curY = ny;
    } else if (upper === 'Q') {
      const qx = isRel ? curX + args[0] : args[0];
      const qy = isRel ? curY + args[1] : args[1];
      const nx = isRel ? curX + args[2] : args[2];
      const ny = isRel ? curY + args[3] : args[3];
      segments.push(quadToCubic(curX, curY, qx, qy, nx, ny));
      prevQuadCtrlX = qx;
      prevQuadCtrlY = qy;
      prevCubicCtrlX = null;
      prevCubicCtrlY = null;
      curX = nx;
      curY = ny;
    } else if (upper === 'T') {
      const qx = prevQuadCtrlX !== null ? 2 * curX - prevQuadCtrlX : curX;
      const qy = prevQuadCtrlY !== null ? 2 * curY - prevQuadCtrlY : curY;
      const nx = isRel ? curX + args[0] : args[0];
      const ny = isRel ? curY + args[1] : args[1];
      segments.push(quadToCubic(curX, curY, qx, qy, nx, ny));
      prevQuadCtrlX = qx;
      prevQuadCtrlY = qy;
      prevCubicCtrlX = null;
      prevCubicCtrlY = null;
      curX = nx;
      curY = ny;
    } else if (upper === 'A') {
      const rx = args[0];
      const ry = args[1];
      const rot = args[2];
      const largeArc = Boolean(args[3]);
      const sweep = Boolean(args[4]);
      const nx = isRel ? curX + args[5] : args[5];
      const ny = isRel ? curY + args[6] : args[6];
      const arcSegs = arcToCubicBeziers(curX, curY, rx, ry, rot, largeArc, sweep, nx, ny);
      for (const seg of arcSegs) segments.push(seg);
      prevCubicCtrlX = null;
      prevCubicCtrlY = null;
      prevQuadCtrlX = null;
      prevQuadCtrlY = null;
      curX = nx;
      curY = ny;
    }
  }

  return segments;
}

export function splitCubicBezierAt(seg, t = 0.5) {
  const u = clamp01(t);
  const x01 = lerp(seg.x0, seg.cx1, u);
  const y01 = lerp(seg.y0, seg.cy1, u);
  const x12 = lerp(seg.cx1, seg.cx2, u);
  const y12 = lerp(seg.cy1, seg.cy2, u);
  const x23 = lerp(seg.cx2, seg.x, u);
  const y23 = lerp(seg.cy2, seg.y, u);

  const x012 = lerp(x01, x12, u);
  const y012 = lerp(y01, y12, u);
  const x123 = lerp(x12, x23, u);
  const y123 = lerp(y12, y23, u);

  const mx = lerp(x012, x123, u);
  const my = lerp(y012, y123, u);

  return [
    {
      x0: seg.x0,
      y0: seg.y0,
      cx1: x01,
      cy1: y01,
      cx2: x012,
      cy2: y012,
      x: mx,
      y: my,
    },
    {
      x0: mx,
      y0: my,
      cx1: x123,
      cy1: y123,
      cx2: x23,
      cy2: y23,
      x: seg.x,
      y: seg.y,
    },
  ];
}

export function estimateCubicBezierLength(seg) {
  const chord = Math.hypot(seg.x - seg.x0, seg.y - seg.y0);
  const net =
    Math.hypot(seg.cx1 - seg.x0, seg.cy1 - seg.y0) +
    Math.hypot(seg.cx2 - seg.cx1, seg.cy2 - seg.cy1) +
    Math.hypot(seg.x - seg.cx2, seg.y - seg.cy2);
  return 0.5 * (chord + net);
}

export function resampleCubicBeziers(segments, targetCount) {
  if (!is(segments, 'array') || segments.length === 0) return [];
  const target = Math.max(segments.length, Math.trunc(Number(targetCount) || segments.length));
  const work = segments.map((s) => ({ ...s }));
  const lengths = work.map((s) => estimateCubicBezierLength(s));

  while (work.length < target) {
    let maxIdx = 0;
    let maxLen = -1;
    for (let i = 0; i < lengths.length; i += 1) {
      if (lengths[i] > maxLen) {
        maxLen = lengths[i];
        maxIdx = i;
      }
    }
    const [left, right] = splitCubicBezierAt(work[maxIdx], 0.5);
    work.splice(maxIdx, 1, left, right);
    lengths.splice(
      maxIdx,
      1,
      estimateCubicBezierLength(left),
      estimateCubicBezierLength(right)
    );
  }

  return work;
}

export function reverseCubicBezierLoop(segments) {
  if (!is(segments, 'array')) return [];
  return segments
    .slice()
    .reverse()
    .map((s) => ({
      x0: s.x,
      y0: s.y,
      cx1: s.cx2,
      cy1: s.cy2,
      cx2: s.cx1,
      cy2: s.cy1,
      x: s.x0,
      y: s.y0,
    }));
}

export function computeBezierLoopTwistCost(segsA, segsB, shift = 0) {
  const n = Math.min(segsA.length, segsB.length);
  if (n === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < n; i += 1) {
    const a = segsA[i];
    const b = segsB[(i + shift) % n];
    const dx = a.x0 - b.x0;
    const dy = a.y0 - b.y0;
    sumSq += dx * dx + dy * dy;
  }
  return sumSq;
}

export function alignCubicBezierLoops(segsA, segsB, { checkReverse = true } = {}) {
  const n = Math.min(segsA?.length || 0, segsB?.length || 0);
  if (n === 0) {
    return {
      segmentsA: [],
      segmentsB: [],
      shift: 0,
      reversed: false,
      cost: 0,
    };
  }

  const candidates = [{ list: segsB, reversed: false }];
  if (checkReverse) {
    candidates.push({ list: reverseCubicBezierLoop(segsB), reversed: true });
  }

  let bestShift = 0;
  let bestReversed = false;
  let bestCost = Number.POSITIVE_INFINITY;
  let bestCandidateList = segsB;

  for (const cand of candidates) {
    for (let k = 0; k < n; k += 1) {
      const cost = computeBezierLoopTwistCost(segsA, cand.list, k);
      if (cost < bestCost - 1e-9) {
        bestCost = cost;
        bestShift = k;
        bestReversed = cand.reversed;
        bestCandidateList = cand.list;
      }
    }
  }

  const alignedB = [];
  for (let i = 0; i < n; i += 1) {
    alignedB.push({ ...bestCandidateList[(i + bestShift) % n] });
  }

  return {
    segmentsA: segsA.slice(0, n).map((s) => ({ ...s })),
    segmentsB: alignedB,
    shift: bestShift,
    reversed: bestReversed,
    cost: Number(bestCost.toFixed(4)),
  };
}

export function normalizeBezierPairForMorph(sourceA, sourceB, options = {}) {
  const rawA = is(sourceA, 'array') ? sourceA : pathToCubicBeziers(sourceA);
  const rawB = is(sourceB, 'array') ? sourceB : pathToCubicBeziers(sourceB);
  if (rawA.length === 0 || rawB.length === 0) {
    return {
      segmentsA: rawA,
      segmentsB: rawB,
      count: 0,
      shift: 0,
      reversed: false,
      cost: 0,
    };
  }
  const minSegments = Math.max(1, Math.trunc(Number(options.minSegments) || 0));
  const targetCount = Math.max(rawA.length, rawB.length, minSegments);
  const resampledA = resampleCubicBeziers(rawA, targetCount);
  const resampledB = resampleCubicBeziers(rawB, targetCount);
  const aligned = alignCubicBezierLoops(resampledA, resampledB, {
    checkReverse: options.checkReverse !== false,
  });
  return {
    ...aligned,
    count: targetCount,
  };
}

export function interpolateCubicBeziers(segsA, segsB, progress) {
  const t = clamp01(progress);
  const n = Math.min(segsA?.length || 0, segsB?.length || 0);
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const a = segsA[i];
    const b = segsB[i];
    out.push({
      x0: lerp(a.x0, b.x0, t),
      y0: lerp(a.y0, b.y0, t),
      cx1: lerp(a.cx1, b.cx1, t),
      cy1: lerp(a.cy1, b.cy1, t),
      cx2: lerp(a.cx2, b.cx2, t),
      cy2: lerp(a.cy2, b.cy2, t),
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
    });
  }
  return out;
}

export function cubicBeziersToPathD(segments, closed = true) {
  if (!is(segments, 'array') || segments.length === 0) return '';
  const parts = [];
  for (let i = 0; i < segments.length; i += 1) {
    const s = segments[i];
    if (i === 0) {
      parts.push(`M ${roundCoord(s.x0)} ${roundCoord(s.y0)}`);
    } else {
      const prev = segments[i - 1];
      if (Math.hypot(s.x0 - prev.x, s.y0 - prev.y) > 1e-3) {
        parts.push(`M ${roundCoord(s.x0)} ${roundCoord(s.y0)}`);
      }
    }
    parts.push(
      `C ${roundCoord(s.cx1)} ${roundCoord(s.cy1)}, ${roundCoord(s.cx2)} ${roundCoord(s.cy2)}, ${roundCoord(s.x)} ${roundCoord(s.y)}`
    );
  }
  if (closed) parts.push('Z');
  return parts.join(' ');
}

/* ============================================================================
 * TIER 2B: Deterministic Vector Text / Glyph-to-Contour Generator
 * ========================================================================== */

const GLYPH_POLYGONS = Object.freeze({
  A: [[0.5, 0.05], [0.92, 0.95], [0.72, 0.95], [0.62, 0.7], [0.38, 0.7], [0.28, 0.95], [0.08, 0.95]],
  B: [[0.14, 0.06], [0.72, 0.06], [0.88, 0.24], [0.74, 0.48], [0.9, 0.72], [0.74, 0.94], [0.14, 0.94]],
  C: [[0.86, 0.24], [0.62, 0.06], [0.24, 0.14], [0.1, 0.5], [0.24, 0.86], [0.62, 0.94], [0.86, 0.76], [0.72, 0.66], [0.48, 0.76], [0.3, 0.5], [0.48, 0.24], [0.72, 0.34]],
  D: [[0.14, 0.06], [0.64, 0.06], [0.9, 0.28], [0.9, 0.72], [0.64, 0.94], [0.14, 0.94]],
  E: [[0.14, 0.06], [0.86, 0.06], [0.86, 0.24], [0.34, 0.24], [0.34, 0.42], [0.78, 0.42], [0.78, 0.58], [0.34, 0.58], [0.34, 0.76], [0.86, 0.76], [0.86, 0.94], [0.14, 0.94]],
  F: [[0.14, 0.06], [0.86, 0.06], [0.86, 0.24], [0.36, 0.24], [0.36, 0.44], [0.76, 0.44], [0.76, 0.62], [0.36, 0.62], [0.36, 0.94], [0.14, 0.94]],
  G: [[0.84, 0.24], [0.58, 0.06], [0.2, 0.18], [0.1, 0.5], [0.22, 0.84], [0.62, 0.94], [0.88, 0.78], [0.88, 0.48], [0.52, 0.48], [0.52, 0.64], [0.7, 0.64], [0.7, 0.76], [0.38, 0.76], [0.3, 0.5], [0.4, 0.24]],
  H: [[0.12, 0.06], [0.32, 0.06], [0.32, 0.41], [0.68, 0.41], [0.68, 0.06], [0.88, 0.06], [0.88, 0.94], [0.68, 0.94], [0.68, 0.59], [0.32, 0.59], [0.32, 0.94], [0.12, 0.94]],
  I: [[0.24, 0.06], [0.76, 0.06], [0.76, 0.24], [0.6, 0.24], [0.6, 0.76], [0.76, 0.76], [0.76, 0.94], [0.24, 0.94], [0.24, 0.76], [0.4, 0.76], [0.4, 0.24], [0.24, 0.24]],
  K: [[0.14, 0.06], [0.34, 0.06], [0.34, 0.44], [0.72, 0.06], [0.92, 0.06], [0.52, 0.48], [0.92, 0.94], [0.7, 0.94], [0.34, 0.54], [0.34, 0.94], [0.14, 0.94]],
  L: [[0.16, 0.06], [0.38, 0.06], [0.38, 0.76], [0.86, 0.76], [0.86, 0.94], [0.16, 0.94]],
  M: [[0.08, 0.94], [0.08, 0.06], [0.3, 0.06], [0.5, 0.48], [0.7, 0.06], [0.92, 0.06], [0.92, 0.94], [0.74, 0.94], [0.74, 0.38], [0.5, 0.76], [0.26, 0.38], [0.26, 0.94]],
  N: [[0.12, 0.94], [0.12, 0.06], [0.32, 0.06], [0.68, 0.64], [0.68, 0.06], [0.88, 0.06], [0.88, 0.94], [0.68, 0.94], [0.32, 0.36], [0.32, 0.94]],
  O: [[0.5, 0.06], [0.84, 0.22], [0.92, 0.5], [0.84, 0.78], [0.5, 0.94], [0.16, 0.78], [0.08, 0.5], [0.16, 0.22]],
  P: [[0.14, 0.06], [0.72, 0.06], [0.88, 0.24], [0.88, 0.44], [0.72, 0.6], [0.36, 0.6], [0.36, 0.94], [0.14, 0.94]],
  R: [[0.14, 0.06], [0.72, 0.06], [0.88, 0.24], [0.88, 0.44], [0.66, 0.58], [0.9, 0.94], [0.68, 0.94], [0.46, 0.6], [0.34, 0.6], [0.34, 0.94], [0.14, 0.94]],
  S: [[0.84, 0.2], [0.56, 0.06], [0.18, 0.16], [0.14, 0.38], [0.36, 0.52], [0.68, 0.6], [0.64, 0.78], [0.36, 0.78], [0.14, 0.7], [0.18, 0.88], [0.56, 0.94], [0.86, 0.8], [0.86, 0.54], [0.42, 0.4], [0.38, 0.24], [0.72, 0.28]],
  T: [[0.08, 0.06], [0.92, 0.06], [0.92, 0.24], [0.61, 0.24], [0.61, 0.94], [0.39, 0.94], [0.39, 0.24], [0.08, 0.24]],
  U: [[0.12, 0.06], [0.34, 0.06], [0.34, 0.68], [0.5, 0.78], [0.66, 0.68], [0.66, 0.06], [0.88, 0.06], [0.88, 0.74], [0.68, 0.94], [0.32, 0.94], [0.12, 0.74]],
  V: [[0.08, 0.06], [0.3, 0.06], [0.5, 0.68], [0.7, 0.06], [0.92, 0.06], [0.6, 0.94], [0.4, 0.94]],
  W: [[0.04, 0.06], [0.22, 0.06], [0.34, 0.66], [0.5, 0.3], [0.66, 0.66], [0.78, 0.06], [0.96, 0.06], [0.76, 0.94], [0.6, 0.94], [0.5, 0.62], [0.4, 0.94], [0.24, 0.94]],
  X: [[0.1, 0.06], [0.32, 0.06], [0.5, 0.36], [0.68, 0.06], [0.9, 0.06], [0.62, 0.5], [0.9, 0.94], [0.68, 0.94], [0.5, 0.64], [0.32, 0.94], [0.1, 0.94], [0.38, 0.5]],
  Y: [[0.08, 0.06], [0.3, 0.06], [0.5, 0.42], [0.7, 0.06], [0.92, 0.06], [0.6, 0.58], [0.6, 0.94], [0.4, 0.94], [0.4, 0.58]],
  Z: [[0.12, 0.06], [0.88, 0.06], [0.88, 0.24], [0.38, 0.76], [0.88, 0.76], [0.88, 0.94], [0.12, 0.94], [0.12, 0.76], [0.62, 0.24], [0.12, 0.24]],
  '0': [[0.5, 0.06], [0.82, 0.2], [0.88, 0.5], [0.82, 0.8], [0.5, 0.94], [0.18, 0.8], [0.12, 0.5], [0.18, 0.2]],
  '1': [[0.36, 0.16], [0.56, 0.06], [0.64, 0.06], [0.64, 0.94], [0.42, 0.94], [0.42, 0.3], [0.28, 0.36]],
  '2': [[0.16, 0.24], [0.48, 0.06], [0.84, 0.18], [0.84, 0.44], [0.42, 0.76], [0.86, 0.76], [0.86, 0.94], [0.14, 0.94], [0.14, 0.76], [0.62, 0.38], [0.48, 0.22]],
  '3': [[0.18, 0.14], [0.68, 0.06], [0.86, 0.26], [0.68, 0.48], [0.88, 0.72], [0.66, 0.94], [0.18, 0.86], [0.24, 0.7], [0.64, 0.74], [0.64, 0.56], [0.38, 0.54], [0.38, 0.4], [0.62, 0.36], [0.6, 0.22]],
  '+': [[0.4, 0.14], [0.6, 0.14], [0.6, 0.4], [0.86, 0.4], [0.86, 0.6], [0.6, 0.6], [0.6, 0.86], [0.4, 0.86], [0.4, 0.6], [0.14, 0.6], [0.14, 0.4], [0.4, 0.4]],
  '♥': [[0.5, 0.26], [0.72, 0.08], [0.92, 0.24], [0.9, 0.52], [0.5, 0.92], [0.1, 0.52], [0.08, 0.24], [0.28, 0.08]],
  '★': [[0.5, 0.05], [0.62, 0.36], [0.95, 0.38], [0.69, 0.59], [0.78, 0.92], [0.5, 0.73], [0.22, 0.92], [0.31, 0.59], [0.05, 0.38], [0.38, 0.36]],
});

function buildProceduralGlyphPolygon(charCode) {
  const seed = Number(charCode) || 63;
  const sides = 6 + (seed % 5);
  const pts = [];
  for (let i = 0; i < sides; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / sides;
    const radialMod = 0.34 + 0.08 * Math.cos((seed + i) * 1.7);
    pts.push([
      0.5 + Math.cos(angle) * radialMod,
      0.5 + Math.sin(angle) * (radialMod * 1.1),
    ]);
  }
  return pts;
}

export function textToContourBeziers(text, options = {}) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim() || '•';
  const width = Math.max(16, Number(options.width) || 160);
  const height = Math.max(16, Number(options.height) || 64);
  const padding = Math.max(2, Number(options.padding) ?? 8);
  const weight = Math.max(100, Math.min(900, Number(options.fontWeight) || 600));
  const targetWeight = Math.max(100, Math.min(900, Number(options.targetFontWeight) || weight));
  const progress = clamp01(options.progress ?? 0);

  const chars = Array.from(clean).slice(0, 16);
  const innerW = Math.max(8, width - padding * 2);
  const innerH = Math.max(8, height - padding * 2);
  const cellW = innerW / chars.length;

  // Build unified contour across glyph cells so multi-character labels stay a single closed loop
  const topChain = [];
  const bottomChain = [];

  chars.forEach((ch, idx) => {
    const key = ch.toUpperCase();
    const poly = GLYPH_POLYGONS[key] || buildProceduralGlyphPolygon(ch.codePointAt(0));
    const offsetX = padding + idx * cellW;
    const glyphPadX = cellW * 0.08;
    const usableW = Math.max(4, cellW - glyphPadX * 2);

    const mapped = poly.map(([nx, ny]) => ({
      x: offsetX + glyphPadX + nx * usableW,
      y: padding + ny * innerH,
    }));

    const half = Math.max(1, Math.ceil(mapped.length / 2));
    for (let i = 0; i < half; i += 1) topChain.push(mapped[i]);
    for (let i = mapped.length - 1; i >= half; i -= 1) bottomChain.unshift(mapped[i]);
  });

  const mergedPoints = [...topChain, ...bottomChain];
  const segments = pathToCubicBeziers({ type: 'polygon', points: mergedPoints });
  const interpolatedWeight = Math.round(lerp(weight, targetWeight, progress));

  return {
    text: clean,
    width,
    height,
    segments,
    pathD: cubicBeziersToPathD(segments, true),
    fontVariationSettings: `'wght' ${interpolatedWeight}`,
    affineScale3d: `scale3d(${lerp(1, Number(options.targetScaleX) || 1, progress).toFixed(4)}, ${lerp(1, Number(options.targetScaleY) || 1, progress).toFixed(4)}, 1)`,
  };
}

/* ============================================================================
 * TIER 3: Complex Canvas / WebGL Kinetic Morphing & Adaptive Governor
 * ========================================================================== */

export async function captureCanvasFreezeSnapshot(canvasEl, env = null) {
  const width = Number(canvasEl?.width || canvasEl?.clientWidth) || 0;
  const height = Number(canvasEl?.height || canvasEl?.clientHeight) || 0;
  if (!canvasEl || width <= 0 || height <= 0) {
    return {
      kind: 'empty',
      bitmap: null,
      dataUrl: '',
      width: 0,
      height: 0,
      release() {},
    };
  }

  const bitmapFn =
    env?.createImageBitmap ??
    (isCallable(globalThis.createImageBitmap) ? globalThis.createImageBitmap : null);

  if (bitmapFn) {
    try {
      const bitmap = await bitmapFn(canvasEl);
      if (bitmap) {
        let released = false;
        return {
          kind: 'bitmap',
          bitmap,
          dataUrl: '',
          width: Number(bitmap.width) || width,
          height: Number(bitmap.height) || height,
          release() {
            if (!released && isCallable(bitmap.close)) {
              released = true;
              bitmap.close();
            }
          },
        };
      }
    } catch {
      // Fallback to dataURL below
    }
  }

  if (isCallable(canvasEl.toDataURL)) {
    try {
      const dataUrl = canvasEl.toDataURL('image/png');
      return {
        kind: 'data-url',
        bitmap: null,
        dataUrl: is(dataUrl, 'string') ? dataUrl : '',
        width,
        height,
        release() {},
      };
    } catch {
      // SecurityError / tainted canvas fallback
    }
  }

  return {
    kind: 'empty',
    bitmap: null,
    dataUrl: '',
    width,
    height,
    release() {},
  };
}

export function createDecimatedMorphStream(options = {}) {
  const frameStride = Math.max(2, Math.min(6, Math.trunc(Number(options.frameStride) || 2)));
  const dprScale = Math.max(0.25, Math.min(1, Number(options.dprScale) || 0.5));
  const baseWidth = Math.max(16, Math.trunc(Number(options.width) || 320));
  const baseHeight = Math.max(16, Math.trunc(Number(options.height) || 180));
  const nativeDpr = Math.max(1, Number(options.devicePixelRatio) || 1);
  const scaledWidth = Math.max(8, Math.round(baseWidth * nativeDpr * dprScale));
  const scaledHeight = Math.max(8, Math.round(baseHeight * nativeDpr * dprScale));

  const OffscreenCtor =
    options.OffscreenCanvas ??
    (isCallable(globalThis.OffscreenCanvas) ? globalThis.OffscreenCanvas : null);

  let offscreen = null;
  let ctx = null;
  if (OffscreenCtor) {
    try {
      offscreen = new OffscreenCtor(scaledWidth, scaledHeight);
      ctx = isCallable(offscreen.getContext) ? offscreen.getContext('2d') : null;
    } catch {
      offscreen = null;
      ctx = null;
    }
  }

  let worker = null;
  if (isCallable(options.createWorker)) {
    try {
      worker = options.createWorker({ width: scaledWidth, height: scaledHeight, frameStride });
    } catch {
      worker = null;
    }
  }

  let latestBitmap = null;
  let totalFrames = 0;
  let renderedFrames = 0;
  let skippedFrames = 0;
  let stopped = false;

  const getCrossFadeState = (progress) => {
    const u = clamp01(progress);
    const eased = evaluateCubicBezierEasing(u);
    return {
      progress: u,
      kineticOpacity: Number((1 - eased * 0.85).toFixed(3)),
      targetIconOpacity: Number(eased.toFixed(3)),
      dprScale,
      frameStride,
      scaledWidth,
      scaledHeight,
    };
  };

  const stepFrame = (frameIndex, progress, renderFn = null) => {
    if (stopped) {
      return {
        updated: false,
        bitmap: latestBitmap,
        ...getCrossFadeState(progress),
      };
    }

    totalFrames += 1;
    const idx = Math.max(0, Math.trunc(Number(frameIndex) ?? totalFrames - 1));
    const shouldRender = idx % frameStride === 0;

    if (!shouldRender) {
      skippedFrames += 1;
      return {
        updated: false,
        bitmap: latestBitmap,
        ...getCrossFadeState(progress),
      };
    }

    renderedFrames += 1;
    if (worker && isCallable(worker.postMessage)) {
      worker.postMessage({
        type: 'render-decimated-frame',
        frameIndex: idx,
        progress: clamp01(progress),
        width: scaledWidth,
        height: scaledHeight,
      });
    }

    if (isCallable(renderFn)) {
      renderFn(ctx, {
        frameIndex: idx,
        progress: clamp01(progress),
        width: scaledWidth,
        height: scaledHeight,
      });
    }

    if (offscreen && isCallable(offscreen.transferToImageBitmap)) {
      if (latestBitmap && isCallable(latestBitmap.close)) {
        latestBitmap.close();
      }
      latestBitmap = offscreen.transferToImageBitmap();
    }

    return {
      updated: true,
      bitmap: latestBitmap,
      ...getCrossFadeState(progress),
    };
  };

  const stop = () => {
    stopped = true;
    if (latestBitmap && isCallable(latestBitmap.close)) {
      latestBitmap.close();
      latestBitmap = null;
    }
    if (worker && isCallable(worker.terminate)) {
      worker.terminate();
      worker = null;
    }
  };

  return {
    stepFrame,
    getCrossFadeState,
    getLatestBitmap: () => latestBitmap,
    stop,
    getStats: () => ({
      frameStride,
      dprScale,
      scaledWidth,
      scaledHeight,
      usingOffscreenCanvas: Boolean(offscreen),
      usingWorker: Boolean(worker),
      totalFrames,
      renderedFrames,
      skippedFrames,
      stopped,
    }),
  };
}

export function createMorphStrategyGovernor(options = {}) {
  const liveCeilingMs = Number(options.liveCeilingMs ?? 4);
  const workerCeilingMs = Number(options.workerCeilingMs ?? 12);
  const env = options.env || null;

  const fpsGovernor = createAdaptiveFpsGovernor({
    targetFps: 60,
    minScale: 0.25,
    maxScale: 1.0,
    maxWorkMs: workerCeilingMs,
    env,
    ...(is(options.fpsGovernorOptions, 'object') ? options.fpsGovernorOptions : {}),
  });

  let lastWorkMs = Number(options.initialWorkMs ?? 2.5);

  const isReducedMotionPreferred = () => {
    const matchMediaFn =
      env?.matchMedia ??
      (is(globalThis.window, Object) && isCallable(globalThis.window.matchMedia)
        ? globalThis.window.matchMedia.bind(globalThis.window)
        : null);
    if (!matchMediaFn) return false;
    try {
      return Boolean(matchMediaFn('(prefers-reduced-motion: reduce)')?.matches);
    } catch {
      return false;
    }
  };

  const isLowPowerDevice = () => {
    if (options.lowPower === true || env?.lowPower === true) return true;
    const nav = env?.navigator ?? (is(globalThis.navigator, Object) ? globalThis.navigator : null);
    if (nav?.scheduling && isCallable(nav.scheduling.isInputPending)) {
      // Non-invasive hint check
    }
    const cores = Number(nav?.hardwareConcurrency) || 0;
    const mem = Number(nav?.deviceMemory) || 0;
    return (cores > 0 && cores <= 2) || (mem > 0 && mem <= 2);
  };

  const evaluate = (workMsSample = lastWorkMs) => {
    const w = Number.isFinite(Number(workMsSample)) ? Math.max(0, Number(workMsSample)) : lastWorkMs;
    lastWorkMs = w;

    if (isReducedMotionPreferred()) {
      return {
        strategy: 'freeze',
        instant: true,
        frameStride: 0,
        dprScale: 1,
        workMs: w,
        fpsSnapshot: fpsGovernor.getSnapshot(),
      };
    }

    if (isLowPowerDevice() || w > workerCeilingMs || fpsGovernor.getTier() === 'eco') {
      return {
        strategy: 'freeze',
        instant: false,
        frameStride: 0,
        dprScale: 1,
        workMs: w,
        fpsSnapshot: fpsGovernor.getSnapshot(),
      };
    }

    if (w >= liveCeilingMs) {
      return {
        strategy: 'kinetic-worker',
        instant: false,
        frameStride: w > 8 ? 3 : 2,
        dprScale: 0.5,
        workMs: w,
        fpsSnapshot: fpsGovernor.getSnapshot(),
      };
    }

    return {
      strategy: 'live-60fps',
      instant: false,
      frameStride: 1,
      dprScale: 1,
      workMs: w,
      fpsSnapshot: fpsGovernor.getSnapshot(),
    };
  };

  const sampleFrame = (frameDeltaMs, workMs = 0) => {
    fpsGovernor.sampleFrame(frameDeltaMs, workMs);
    if (Number.isFinite(Number(workMs)) && Number(workMs) > 0) {
      lastWorkMs = Number(workMs);
    }
    return evaluate(lastWorkMs);
  };

  const resolveMode = (requestedMode = 'auto', { hasCanvas = false, hasVector = false } = {}) => {
    const mode = is(requestedMode, 'string') ? requestedMode.trim().toLowerCase() : 'auto';
    if (mode && mode !== 'auto' && NANO_MORPH_MODES.includes(mode)) {
      return mode;
    }
    if (hasCanvas) {
      const decision = evaluate(lastWorkMs);
      if (decision.strategy === 'kinetic-worker') return 'kinetic-worker';
      if (decision.strategy === 'freeze') return 'freeze';
      return 'flip';
    }
    if (hasVector) return 'bezier';
    return 'flip';
  };

  return {
    evaluate,
    sampleFrame,
    resolveMode,
    getSnapshot: () => ({
      lastWorkMs,
      ...evaluate(lastWorkMs),
    }),
    reset: (nextWorkMs = 2.5) => {
      lastWorkMs = Number(nextWorkMs) || 2.5;
      fpsGovernor.reset();
    },
  };
}
