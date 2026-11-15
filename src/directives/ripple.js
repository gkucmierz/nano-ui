const MAX_CONCURRENT_RIPPLES = 4;
const DEFAULT_RIPPLE_DURATION_MS = 540;
const RIPPLE_EVENT = globalThis.PointerEvent ? 'pointerdown' : 'click';
const isStr = (val) => Object.prototype.toString.call(val) === '[object String]';
const isNum = (val) => Object.prototype.toString.call(val) === '[object Number]' && Number.isFinite(val);
const isFn = (val) => Object.prototype.toString.call(val) === '[object Function]';
const isPlainObj = (val) => Object.prototype.toString.call(val) === '[object Object]';

const clampNum = (val, min, max) => Math.min(max, Math.max(min, val));

/**
 * Normalizes any `v-ripple` binding value (`undefined`, `boolean`, color `string`, or config `object`)
 * into a deterministic descriptor.
 *
 * Supported forms:
 * - `v-ripple` -> `{ enabled: true, color: '', centered: false, duration: 540, opacity: null, onRipple: null }`
 * - `v-ripple="false"` -> `{ enabled: false, ... }`
 * - `v-ripple="'oklch(0.72 0.16 230)'"` -> `{ enabled: true, color: 'oklch(0.72 0.16 230)', ... }`
 * - `v-ripple="{ color, centered, duration, opacity, disabled, onRipple }"`
 *
 * @param {unknown} rawValue
 */
export const resolveRippleOptions = (rawValue) => {
  if (rawValue === false) {
    return {
      enabled: false,
      color: '',
      centered: false,
      duration: DEFAULT_RIPPLE_DURATION_MS,
      opacity: null,
      onRipple: null,
    };
  }

  if (isStr(rawValue)) {
    return {
      enabled: true,
      color: rawValue.trim(),
      centered: false,
      duration: DEFAULT_RIPPLE_DURATION_MS,
      opacity: null,
      onRipple: null,
    };
  }

  if (isPlainObj(rawValue)) {
    const disabled = rawValue.disabled === true || rawValue.enabled === false;
    const color = isStr(rawValue.color) ? rawValue.color.trim() : '';
    const centered = rawValue.centered === true;
    const duration = isNum(rawValue.duration)
      ? Math.round(clampNum(rawValue.duration, 160, 2000))
      : DEFAULT_RIPPLE_DURATION_MS;
    const opacity = isNum(rawValue.opacity)
      ? Number(clampNum(rawValue.opacity, 0.05, 1).toFixed(3))
      : null;
    const onRipple = isFn(rawValue.onRipple) ? rawValue.onRipple : null;

    return {
      enabled: !disabled,
      color,
      centered,
      duration,
      opacity,
      onRipple,
    };
  }

  return {
    enabled: true,
    color: '',
    centered: false,
    duration: DEFAULT_RIPPLE_DURATION_MS,
    opacity: null,
    onRipple: null,
  };
};

/**
 * Computes exact Euclidean farthest-corner ripple geometry inside a bounding box `(width, height)`
 * so the expanding `scale(0 -> 1)` wave reaches the farthest corner right at the end of the ease-out
 * curve instead of overshooting `4x` offscreen in the first 100ms.
 *
 * @param {{ left?: number, top?: number, width?: number, height?: number }} rect
 * @param {number} [clientX]
 * @param {number} [clientY]
 */
export const computeRippleGeometry = (rect = {}, clientX = undefined, clientY = undefined) => {
  const w = Math.max(1, Number(rect.width) || 0);
  const h = Math.max(1, Number(rect.height) || 0);
  const left = Number(rect.left) || 0;
  const top = Number(rect.top) || 0;

  const hasPointerCoords =
    Number.isFinite(clientX) &&
    Number.isFinite(clientY) &&
    !(clientX === 0 && clientY === 0);

  const localX = hasPointerCoords ? clientX - left : w * 0.5;
  const localY = hasPointerCoords ? clientY - top : h * 0.5;

  const rTL = Math.hypot(localX, localY);
  const rTR = Math.hypot(w - localX, localY);
  const rBL = Math.hypot(localX, h - localY);
  const rBR = Math.hypot(w - localX, h - localY);
  const radius = Math.ceil(Math.max(rTL, rTR, rBL, rBR, 12));
  const diameter = radius * 2;

  return {
    x: Math.round(localX * 10) / 10,
    y: Math.round(localY * 10) / 10,
    width: Math.round(w * 10) / 10,
    height: Math.round(h * 10) / 10,
    centered: !hasPointerCoords,
    radius,
    diameter,
    left: Math.round((localX - radius) * 10) / 10,
    top: Math.round((localY - radius) * 10) / 10,
  };
};

const cleanupCircleNode = (node) => {
  if (!node) return;
  if (node._rippleTimer) {
    clearTimeout(node._rippleTimer);
    delete node._rippleTimer;
  }
  if (isFn(node.remove)) {
    node.remove();
  }
};

const handleRippleTrigger = (e, el, binding) => {
  const opts = resolveRippleOptions(binding?.value);
  if (!opts.enabled) return;
  if (e && isNum(e.button) && e.button > 0) return;
  if (el.disabled || el.getAttribute?.('aria-disabled') === 'true') return;

  const win = globalThis.window;
  if (win?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
    return;
  }

  const doc = globalThis.document;
  if (!doc || !isFn(el.getBoundingClientRect) || !isFn(el.appendChild)) {
    return;
  }

  // Cap concurrent active waves to prevent DOM accumulation during rapid bursts
  if (isFn(el.querySelectorAll)) {
    const activeNodes = el.querySelectorAll(':scope > span.ripple, .ripple');
    if (activeNodes.length >= MAX_CONCURRENT_RIPPLES) {
      cleanupCircleNode(activeNodes[0]);
    }
  }

  const rect = el.getBoundingClientRect();
  const geom = opts.centered
    ? computeRippleGeometry(rect)
    : computeRippleGeometry(rect, e?.clientX, e?.clientY);

  const circle = doc.createElement('span');
  circle.style.width = `${geom.diameter}px`;
  circle.style.height = `${geom.diameter}px`;
  circle.style.left = `${geom.left}px`;
  circle.style.top = `${geom.top}px`;
  circle.className = 'ripple';
  circle.setAttribute('aria-hidden', 'true');

  if (opts.duration !== DEFAULT_RIPPLE_DURATION_MS) {
    circle.style.animationDuration = `${opts.duration}ms`;
  }

  // Custom color & peak opacity override (supports OKLCH, HEX, RGB, or CSS vars)
  if (opts.color || opts.opacity !== null) {
    const baseTint = opts.color || 'currentColor';
    const peakPct = opts.opacity !== null ? Math.round(opts.opacity * 100) : (opts.color ? 100 : 28);
    const midPct = Math.max(4, Math.round(peakPct * 0.55));
    if (opts.color) {
      circle.style.setProperty('--nano-ripple-custom', opts.color);
    }
    circle.style.background = `radial-gradient(circle, color-mix(in srgb, ${baseTint} ${peakPct}%, transparent) 0%, color-mix(in srgb, ${baseTint} ${midPct}%, transparent) 66%, transparent 100%)`;
  }

  const cleanupCircle = () => cleanupCircleNode(circle);

  circle.addEventListener('animationend', cleanupCircle, { once: true });
  circle._rippleTimer = setTimeout(cleanupCircle, opts.duration + 140);

  el.appendChild(circle);

  if (opts.onRipple) {
    opts.onRipple({
      ...geom,
      duration: opts.duration,
      color: opts.color || 'currentColor',
      opacity: opts.opacity,
    });
  }
};

const ensureRippleHostStyles = (el) => {
  if (!el || !el.style) return;
  const win = globalThis.window;
  const computed =
    win && isFn(win.getComputedStyle) && el.nodeType === 1
      ? win.getComputedStyle(el)
      : null;

  if (!computed || !computed.position || computed.position === 'static') {
    if (!el.style.position) {
      el.style.position = 'relative';
    }
  }
  if (!computed || computed.overflow === 'visible' || !computed.overflow) {
    if (!el.style.overflow) {
      el.style.overflow = 'hidden';
    }
  }
};

const Ripple = {
  mounted(el, binding) {
    ensureRippleHostStyles(el);
    el._rippleBinding = binding;
    el._rippleHandler = (e) => handleRippleTrigger(e, el, el._rippleBinding);
    el.addEventListener(RIPPLE_EVENT, el._rippleHandler, { passive: true });
  },
  updated(el, binding) {
    el._rippleBinding = binding;
  },
  unmounted(el) {
    if (el._rippleHandler) {
      el.removeEventListener(RIPPLE_EVENT, el._rippleHandler);
      delete el._rippleHandler;
      delete el._rippleBinding;
    }
    el.querySelectorAll('.ripple').forEach((node) => {
      cleanupCircleNode(node);
    });
  },
};

export default Ripple;
