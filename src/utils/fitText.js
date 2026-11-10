/**
 * Natural Search Font Auto-Fitting Engine (inspired by color-claim)
 * for both SVG (`getBBox()` / `getComputedTextLength()`) and HTML (`scrollWidth` / `scrollHeight`
 * with explicit handling of HTML auto-wrapping).
 *
 * Uses exponential galloping (`max *= 2`) followed by binary bisection (`mid = (min + max) >> 1`)
 * to find the exact transition boundary in O(log N) steps.
 */

/**
 * Exponential galloping + binary bisection search over natural numbers N >= 1.
 * Finds the boundary where monotone predicate `cond(n)` flips from `false` (fits) to `true` (overflows).
 *
 * @param {(n: number) => boolean} cond - Monotone predicate returning `true` when size `n` overflows.
 * @param {boolean} [retFirstTrue=true] - If `false`, returns the largest `n` where `cond(n) === false` (fits).
 * @param {number} [maxCap=2048] - Safety ceiling to prevent infinite galloping if `cond` never returns `true`.
 * @returns {number}
 */
export const naturalSearch = (cond, retFirstTrue = true, maxCap = 2048) => {
  let min = 1;
  let max = 1;
  const cap = Math.max(2, Number(maxCap) || 2048);

  while (max < cap) {
    const stop = Boolean(cond(max));
    if (stop) break;
    min = max;
    max *= 2;
  }

  if (max >= cap && !cond(cap)) {
    return cap;
  }

  let mid;
  while (1) {
    if (max - min <= 1) {
      if (min === 1 && !retFirstTrue && cond(1)) {
        return 1;
      }
      return retFirstTrue ? max : min;
    }
    mid = Math.floor((min + max) / 2);
    const stop = Boolean(cond(mid));
    if (stop) {
      max = mid;
    } else {
      min = mid;
    }
  }
};

/**
 * Computes the optimal single-line font-size for a monospace formula/label inside a fixed width
 * (e.g. inside an SVG viewBox card of width 52 units) using `naturalSearch` over quantized steps.
 */
export const computeMonospaceFittedFontSize = (
  text = '',
  {
    maxWidth = 51.5,
    maxFontSize = 2.7,
    minFontSize = 0.5,
    step = 0.05,
    charWidthRatio = 0.615,
  } = {}
) => {
  const str = String(text || '');
  if (!str) return maxFontSize;

  const qStep = Math.max(0.01, Number(step) || 0.05);
  const maxSteps = Math.max(2, Math.round((maxFontSize - minFontSize) / qStep) + 1);

  const bestStep = naturalSearch(
    (n) => {
      if (n > maxSteps) return true;
      const candidateSize = minFontSize + (n - 1) * qStep;
      if (candidateSize > maxFontSize + 1e-6) return true;
      const estimatedWidth = str.length * candidateSize * charWidthRatio;
      return estimatedWidth > maxWidth;
    },
    false,
    maxSteps + 2
  );

  const fitted = minFontSize + (Math.max(1, Math.min(maxSteps, bestStep)) - 1) * qStep;
  return Number(Math.max(minFontSize, Math.min(maxFontSize, fitted)).toFixed(2));
};

/**
 * Fits an SVG `<text>` element inside `maxWidth` (and optional `maxHeight`) using `naturalSearch`
 * and native SVG `getBBox()` / `getComputedTextLength()`.
 */
export const fitSvgTextSize = (
  svgTextEl,
  {
    maxWidth = 51.5,
    maxHeight = Infinity,
    minSize = 1.4,
    maxSize = 2.7,
    step = 0.05,
  } = {}
) => {
  if (!svgTextEl) return maxSize;
  const textContent = (svgTextEl.textContent || '').trim();
  if (!textContent) return maxSize;

  const qStep = Math.max(0.01, Number(step) || 0.05);
  const maxSteps = Math.max(2, Math.round((maxSize - minSize) / qStep) + 1);

  const measureWidth = () => {
    try {
      if (typeof svgTextEl.getComputedTextLength === 'function') {
        const len = svgTextEl.getComputedTextLength();
        if (Number.isFinite(len) && len > 0) return len;
      }
      if (typeof svgTextEl.getBBox === 'function') {
        const bbox = svgTextEl.getBBox();
        if (bbox && bbox.width > 0) return bbox.width;
      }
    } catch {}
    const currentFs = parseFloat(svgTextEl.getAttribute('font-size')) || maxSize;
    return textContent.length * currentFs * 0.615;
  };

  const measureHeight = () => {
    try {
      if (typeof svgTextEl.getBBox === 'function') {
        const bbox = svgTextEl.getBBox();
        if (bbox && bbox.height > 0) return bbox.height;
      }
    } catch {}
    return parseFloat(svgTextEl.getAttribute('font-size')) || maxSize;
  };

  const bestStep = naturalSearch(
    (n) => {
      if (n > maxSteps) return true;
      const candidateSize = Number((minSize + (n - 1) * qStep).toFixed(3));
      if (candidateSize > maxSize + 1e-6) return true;
      svgTextEl.setAttribute('font-size', String(candidateSize));
      const w = measureWidth();
      const h = Number.isFinite(maxHeight) ? measureHeight() : 0;
      return w > maxWidth || h > maxHeight;
    },
    false,
    maxSteps + 2
  );

  const finalSize = Number(
    Math.max(minSize, Math.min(maxSize, minSize + (Math.max(1, bestStep) - 1) * qStep)).toFixed(2)
  );
  svgTextEl.setAttribute('font-size', String(finalSize));
  return finalSize;
};

/**
 * Fits an HTML element's `font-size` inside its available container space using `naturalSearch`.
 * Explicitly handles HTML's auto-wrapping and browser minimum font-size floors:
 * - `mode: 'single-line'` (or `singleLine: true`, default): Enforces `white-space: nowrap` so
 *   `scrollWidth` grows monotonically with `font-size` without wrapping onto a new line, shrinking
 *   down to fractional pixels (`minPx = 0.5`, `stepPx = 0.05`). If the browser enforces a minimum
 *   font-size floor (or the text still exceeds `availW` at `minPx`), seamlessly applies sub-pixel
 *   CSS `transform: scale(availW / scrollWidth)` from `left center` so the text never clips.
 * - `mode: 'box'`: Allows multi-line wrapping (`white-space: normal`) and checks both
 *   `scrollHeight > availableHeight` and `scrollWidth > availableWidth` (preventing horizontal
 *   single-word overflow and vertical multi-line overflow simultaneously).
 */
export const fitHtmlTextSize = (el, opts = {}) => {
  const mode = opts.singleLine ? 'single-line' : opts.mode || 'single-line';
  const minPx = Math.max(0.05, Number(opts.minPx ?? opts.minSize ?? 0.5));
  const maxPx = Math.max(minPx, Number(opts.maxPx ?? opts.maxSize ?? 32));
  const stepPx = Math.max(0.01, Number(opts.stepPx ?? opts.step ?? 0.05));
  const maxWidth = opts.maxWidth ?? null;
  const maxHeight = opts.maxHeight ?? null;
  const allowScaleBelowMin = opts.allowScaleBelowMin !== false;
  const onFit = typeof opts.onFit === 'function' ? opts.onFit : null;

  if (!el || typeof window === 'undefined') return maxPx;
  const textContent = (el.textContent || '').trim();
  if (!textContent) return maxPx;

  // Reset any previous sub-pixel scale before measuring natural layout widths
  if (el.style) {
    el.style.transform = '';
    el.style.transformOrigin = '';
    el.style.width = '';
    el.style.webkitTextSizeAdjust = 'none';
    el.style.textSizeAdjust = 'none';
  }

  const parent = el.parentElement;
  let parentInnerW = parent?.clientWidth || 0;
  if (parentInnerW > 0 && typeof window.getComputedStyle === 'function') {
    const cs = window.getComputedStyle(parent);
    const padL = parseFloat(cs?.paddingLeft) || 0;
    const padR = parseFloat(cs?.paddingRight) || 0;
    parentInnerW = Math.max(0, parentInnerW - padL - padR);
  }

  const availW =
    Number(maxWidth) > 0
      ? Number(maxWidth)
      : parentInnerW > 0 && el.clientWidth > 0
        ? Math.min(el.clientWidth, parentInnerW)
        : el.clientWidth > 0
          ? el.clientWidth
          : parentInnerW;
  const availH =
    Number(maxHeight) > 0
      ? Number(maxHeight)
      : el.clientHeight > 0
        ? el.clientHeight
        : parent?.clientHeight || 0;

  if (availW <= 0) return maxPx;

  const prevWhiteSpace = el.style.whiteSpace;
  const prevJustifyContent = el.style.justifyContent;
  if (mode === 'single-line') {
    el.style.whiteSpace = 'nowrap';
  } else if (mode === 'box') {
    el.style.justifyContent = 'flex-start';
  }

  const qStep = stepPx;
  const maxSteps = Math.max(2, Math.round((maxPx - minPx) / qStep) + 1);

  const bestStep = naturalSearch(
    (n) => {
      if (n > maxSteps) return true;
      const candidatePx = Number((minPx + (n - 1) * qStep).toFixed(3));
      if (candidatePx > maxPx + 1e-6) return true;
      el.style.fontSize = `${candidatePx}px`;
      const overW = el.scrollWidth > availW;
      const overH = mode === 'box' && availH > 0 ? el.scrollHeight > availH + 1 : false;
      return overW || overH;
    },
    false,
    maxSteps + 2
  );

  const finalPx = Number(
    Math.max(minPx, Math.min(maxPx, minPx + (Math.max(1, bestStep) - 1) * qStep)).toFixed(2)
  );
  el.style.fontSize = `${finalPx}px`;

  let scale = 1;
  if (mode === 'single-line' && allowScaleBelowMin && el.scrollWidth > availW) {
    scale = availW / el.scrollWidth;
    el.style.transformOrigin = 'left center';
    el.style.transform = `scale(${scale.toFixed(4)})`;
    el.style.width = `${(100 / scale).toFixed(2)}%`;
  }

  const renderedPx =
    typeof window.getComputedStyle === 'function'
      ? parseFloat(window.getComputedStyle(el)?.fontSize) || finalPx
      : finalPx;
  const effectivePx = Number((renderedPx * scale).toFixed(2));
  if (el.dataset) {
    el.dataset.fittedFontPx = String(effectivePx);
  }

  if (mode !== 'single-line') {
    el.style.whiteSpace = prevWhiteSpace;
  }
  if (mode === 'box') {
    el.style.justifyContent = prevJustifyContent;
  }
  if (onFit) {
    onFit(effectivePx);
  }
  return effectivePx;
};

/**
 * Fits a multi-element card container (`cardSurfaceEl`) into a bounded vertical height (`targetHeight`)
 * without vertical scrollbars using `naturalSearch` and CSS `transform: scale(s)` (with compensated
 * `width: (100 / s)%` and `height: (availH / s)px` from `transform-origin: top left` so the card
 * fills 100% of its surface box while scaling overflowing inner content cleanly).
 */
export const fitCardContentToHeight = (
  cardSurfaceEl,
  {
    targetHeight = 0,
    minScale = 0.65,
    maxScale = 1.0,
    step = 0.01,
  } = {}
) => {
  if (!cardSurfaceEl || typeof window === 'undefined') return 1;
  const availH = Number(targetHeight) > 0 ? Number(targetHeight) : cardSurfaceEl.clientHeight || 0;
  if (availH <= 0) return 1;

  const contentRoot = cardSurfaceEl.firstElementChild || cardSurfaceEl;

  const applyCssScale = (s) => {
    const isIdentity = Math.abs(s - 1) < 1e-4;
    if (cardSurfaceEl.style) {
      cardSurfaceEl.style.setProperty('--nano-fit-scale', String(s));
    }
    if (!contentRoot || !contentRoot.style) return;
    if (isIdentity) {
      contentRoot.style.transformOrigin = '';
      contentRoot.style.transform = '';
      contentRoot.style.width = '100%';
      contentRoot.style.height = '100%';
    } else {
      contentRoot.style.transformOrigin = 'top left';
      contentRoot.style.transform = `scale(${s})`;
      contentRoot.style.width = `${(100 / s).toFixed(2)}%`;
      contentRoot.style.height = `${(availH / s).toFixed(1)}px`;
    }
  };

  // Measure unscaled natural content height at width = 100%
  const measureNaturalScrollHeight = (candidateScale = 1) => {
    if (!contentRoot || !contentRoot.style) return cardSurfaceEl.scrollHeight || 0;
    const prevTransform = contentRoot.style.transform;
    const prevWidth = contentRoot.style.width;
    const prevHeight = contentRoot.style.height;
    const prevMinH = contentRoot.style.minHeight;
    const prevOverflow = contentRoot.style.overflow;

    contentRoot.style.transform = 'none';
    contentRoot.style.width =
      candidateScale < 1 ? `${(100 / candidateScale).toFixed(2)}%` : '100%';
    contentRoot.style.height = 'auto';
    contentRoot.style.minHeight = '0px';
    contentRoot.style.overflow = 'visible';

    const naturalH = contentRoot.scrollHeight || cardSurfaceEl.scrollHeight || 0;

    contentRoot.style.transform = prevTransform;
    contentRoot.style.width = prevWidth;
    contentRoot.style.height = prevHeight;
    contentRoot.style.minHeight = prevMinH;
    contentRoot.style.overflow = prevOverflow;

    return naturalH * candidateScale;
  };

  // Fast path: check if natural scale (1.0) already fits within targetHeight
  applyCssScale(1);
  if (measureNaturalScrollHeight(1) <= availH + 1) {
    return 1;
  }

  const qStep = Math.max(0.005, Number(step) || 0.01);
  const maxSteps = Math.max(2, Math.round((maxScale - minScale) / qStep) + 1);

  const bestStep = naturalSearch(
    (n) => {
      if (n > maxSteps) return true;
      const candidateScale = Number((minScale + (n - 1) * qStep).toFixed(3));
      if (candidateScale > maxScale + 1e-6) return true;
      const scaledHeight = measureNaturalScrollHeight(candidateScale);
      return scaledHeight > availH + 1;
    },
    false,
    maxSteps + 2
  );

  const finalScale = Number(
    Math.max(minScale, Math.min(maxScale, minScale + (Math.max(1, bestStep) - 1) * qStep)).toFixed(2)
  );
  applyCssScale(finalScale);
  return finalScale;
};

const FIT_STATE_SYM = Symbol('nanoFitTextState');

/**
 * Vue Directive `v-fit-text`:
 * Automatically fits font size on both SVG `<text>` and HTML elements using `naturalSearch`.
 *
 * Usage:
 * - `<text v-fit-text="{ maxWidth: 51.5, minSize: 1.5, maxSize: 2.7 }">{{ expr }}</text>`
 * - `<div v-fit-text="{ minPx: 11, maxPx: 24, mode: 'single-line' }">{{ label }}</div>`
 */
export const fitTextDirective = {
  mounted(el, binding) {
    const runFit = (force = false, activeBinding = el[FIT_STATE_SYM]?.binding || binding) => {
      const currentText = (el.textContent || '').trim();
      const opts =
        activeBinding && typeof activeBinding.value === 'object' && activeBinding.value !== null
          ? activeBinding.value
          : typeof activeBinding?.value === 'number'
            ? { maxWidth: activeBinding.value }
            : {};
      const containerW = el.parentElement?.clientWidth || el.clientWidth || 0;
      const optsKey = `${containerW}:${opts.maxWidth ?? ''}:${opts.maxHeight ?? ''}:${opts.minSize ?? opts.minPx ?? ''}:${opts.maxSize ?? opts.maxPx ?? ''}:${opts.step ?? opts.stepPx ?? ''}:${opts.mode ?? opts.singleLine ?? ''}`;
      const st = el[FIT_STATE_SYM];
      if (!force && st && st.lastText === currentText && st.lastOptsKey === optsKey) {
        return;
      }
      const isSvg =
        el.namespaceURI === 'http://www.w3.org/2000/svg' ||
        String(el.tagName || '').toLowerCase() === 'text';
      if (isSvg) {
        fitSvgTextSize(el, opts);
      } else {
        fitHtmlTextSize(el, opts);
      }
      if (st) {
        st.lastText = currentText;
        st.lastOptsKey = optsKey;
      }
    };

    el[FIT_STATE_SYM] = { runFit, ro: null, binding, lastText: '', lastOptsKey: '' };
    runFit(true, binding);

    if (typeof ResizeObserver !== 'undefined' && el.parentElement) {
      const ro = new ResizeObserver(() => runFit(true));
      ro.observe(el.parentElement);
      if (el !== el.parentElement) {
        ro.observe(el);
      }
      el[FIT_STATE_SYM].ro = ro;
    }
  },
  updated(el, binding) {
    const st = el[FIT_STATE_SYM];
    if (st && typeof st.runFit === 'function') {
      st.binding = binding;
      st.runFit(false, binding);
    } else {
      fitTextDirective.mounted(el, binding);
    }
  },
  unmounted(el) {
    const st = el[FIT_STATE_SYM];
    if (st?.ro) {
      st.ro.disconnect();
    }
    delete el[FIT_STATE_SYM];
  },
};
