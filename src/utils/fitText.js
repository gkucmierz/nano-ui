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
    minFontSize = 1.45,
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
 * Explicitly handles HTML's auto-wrapping behavior:
 * - `mode: 'single-line'` (default): Enforces `white-space: nowrap` so `scrollWidth` grows
 *   monotonically with `font-size` without wrapping onto a new line.
 * - `mode: 'box'`: Allows multi-line wrapping (`white-space: normal`) and checks both
 *   `scrollHeight > availableHeight` and `scrollWidth > availableWidth` (preventing horizontal
 *   single-word overflow and vertical multi-line overflow simultaneously).
 */
export const fitHtmlTextSize = (
  el,
  {
    mode = 'single-line',
    minPx = 10,
    maxPx = 32,
    stepPx = 0.5,
    maxWidth = null,
    maxHeight = null,
  } = {}
) => {
  if (!el || typeof window === 'undefined') return maxPx;
  const textContent = (el.textContent || '').trim();
  if (!textContent) return maxPx;

  const parent = el.parentElement;
  const availW =
    Number(maxWidth) > 0
      ? Number(maxWidth)
      : el.clientWidth > 0
        ? el.clientWidth
        : parent?.clientWidth || 0;
  const availH =
    Number(maxHeight) > 0
      ? Number(maxHeight)
      : el.clientHeight > 0
        ? el.clientHeight
        : parent?.clientHeight || 0;

  if (availW <= 0) return maxPx;

  const prevWhiteSpace = el.style.whiteSpace;
  if (mode === 'single-line') {
    el.style.whiteSpace = 'nowrap';
  }

  const qStep = Math.max(0.25, Number(stepPx) || 0.5);
  const maxSteps = Math.max(2, Math.round((maxPx - minPx) / qStep) + 1);

  const bestStep = naturalSearch(
    (n) => {
      if (n > maxSteps) return true;
      const candidatePx = minPx + (n - 1) * qStep;
      if (candidatePx > maxPx + 1e-6) return true;
      el.style.fontSize = `${candidatePx}px`;
      const overW = el.scrollWidth > availW + 1;
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

  if (mode !== 'single-line') {
    el.style.whiteSpace = prevWhiteSpace;
  }
  return finalPx;
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
    const runFit = () => {
      const opts =
        binding && typeof binding.value === 'object' && binding.value !== null
          ? binding.value
          : typeof binding?.value === 'number'
            ? { maxWidth: binding.value }
            : {};
      const isSvg =
        el.namespaceURI === 'http://www.w3.org/2000/svg' ||
        String(el.tagName || '').toLowerCase() === 'text';
      if (isSvg) {
        fitSvgTextSize(el, opts);
      } else {
        fitHtmlTextSize(el, opts);
      }
    };

    runFit();

    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && el.parentElement) {
      ro = new ResizeObserver(() => runFit());
      ro.observe(el.parentElement);
    }

    el[FIT_STATE_SYM] = { runFit, ro };
  },
  updated(el, binding) {
    const st = el[FIT_STATE_SYM];
    if (st && typeof st.runFit === 'function') {
      st.runFit();
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
