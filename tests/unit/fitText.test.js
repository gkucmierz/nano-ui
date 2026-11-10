import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeMonospaceFittedFontSize,
  fitHtmlTextSize,
} from '../../src/utils/fitText.js';

describe('fitHtmlTextSize & computeMonospaceFittedFontSize — Fractional & Sub-Pixel Scaling', () => {
  it('shrinks monospace formula font-size down into fractional pixels (< 5px) without artificial 10px floor', () => {
    const formula = 'E = mc² · ∮ B·dl = μ₀I · Φ = (1+√5)/2 ≈ 1.6180339887';
    const fittedAt142 = computeMonospaceFittedFontSize(formula, {
      maxWidth: 142,
      maxFontSize: 24,
      minFontSize: 0.5,
      step: 0.05,
    });
    assert.ok(fittedAt142 < 5 && fittedAt142 > 3.5, `Expected ~4.4px at 142px width, got ${fittedAt142}`);
    assert.ok(formula.length * fittedAt142 * 0.615 <= 142);
  });

  it('fitHtmlTextSize supports minSize/maxSize/step/singleLine aliases and scales fractionally until scrollWidth <= availW', () => {
    const prevWindow = globalThis.window;
    try {
      globalThis.window = {
        getComputedStyle: () => ({ paddingLeft: '18px', paddingRight: '18px', fontSize: '' }),
      };

      const formula = 'E = mc² · ∮ B·dl = μ₀I · Φ = (1+√5)/2 ≈ 1.6180339887';
      const el = {
        textContent: formula,
        clientWidth: 144,
        parentElement: { clientWidth: 180 },
        dataset: {},
        style: {},
        get scrollWidth() {
          const px = parseFloat(this.style.fontSize) || 16;
          return Math.ceil(this.textContent.length * px * 0.615);
        },
      };

      const effectivePx = fitHtmlTextSize(el, {
        minSize: 0.5,
        maxSize: 24,
        step: 0.05,
        singleLine: true,
      });

      assert.ok(effectivePx < 5 && effectivePx > 3.5, `Expected fractional font < 5px, got ${effectivePx}`);
      assert.ok(el.scrollWidth <= 144, `Expected scrollWidth (${el.scrollWidth}) <= 144`);
      assert.equal(el.style.transform, '');
    } finally {
      globalThis.window = prevWindow;
    }
  });

  it('fitHtmlTextSize seamlessly applies sub-pixel transform: scale(...) when browser enforces a minimum font-size floor', () => {
    const prevWindow = globalThis.window;
    try {
      // Simulate a browser with Minimum Font Size = 9px in user settings
      globalThis.window = {
        getComputedStyle: () => ({ paddingLeft: '18px', paddingRight: '18px', fontSize: '9px' }),
      };

      const formula = 'E = mc² · ∮ B·dl = μ₀I · Φ = (1+√5)/2 ≈ 1.6180339887';
      const el = {
        textContent: formula,
        clientWidth: 144,
        parentElement: { clientWidth: 180 },
        dataset: {},
        style: {},
        get scrollWidth() {
          const requestedPx = parseFloat(this.style.fontSize) || 16;
          const clampedByBrowserPx = Math.max(9, requestedPx);
          return Math.ceil(this.textContent.length * clampedByBrowserPx * 0.615);
        },
      };

      const effectivePx = fitHtmlTextSize(el, {
        minSize: 0.5,
        maxSize: 24,
        step: 0.05,
        singleLine: true,
      });

      assert.ok(el.style.transform.startsWith('scale('), `Expected sub-pixel scale transform, got "${el.style.transform}"`);
      assert.equal(el.style.transformOrigin, 'left center');
      assert.ok(effectivePx < 5 && effectivePx > 4, `Expected effective scaled font ~4.5px, got ${effectivePx}`);
    } finally {
      globalThis.window = prevWindow;
    }
  });
});
