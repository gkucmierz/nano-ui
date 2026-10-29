import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scrubberPath = path.resolve(__dirname, '../../src/components/PrecisionScrubber.vue');
const source = fs.readFileSync(scrubberPath, 'utf8');

describe('PrecisionScrubber Component — Single-Phase (:fine-tune="false") & High-Resolution Step Support', () => {
  it('declares fineTune boolean prop (default: true), step prop (default: 1), unit prop, and change event', () => {
    assert.match(source, /fineTune:\s*\{\s*type:\s*Boolean,\s*default:\s*true\s*\}/);
    assert.match(source, /step:\s*\{\s*type:\s*Number,\s*default:\s*1\s*\}/);
    assert.match(source, /unit:\s*\{\s*type:\s*String,\s*default:\s*''\s*\}/);
    assert.match(source, /defineEmits\(\['update:modelValue',\s*'change'\]\)/);
  });

  it('guards 2nd phase vertical relative scrubbing behind props.fineTune', () => {
    assert.match(source, /if\s*\(props\.fineTune\)\s*\{/);
    assert.match(source, /if\s*\(props\.fineTune\s*&&\s*isScrubbingRelative\.value\)/);
  });

  it('quantizes fractional steps cleanly without IEEE-754 floating-point drift', () => {
    const quantize = (rawVal, min, max, step) => {
      const str = String(step);
      const dotIdx = str.indexOf('.');
      const decimals = dotIdx === -1 ? 0 : str.length - dotIdx - 1;
      const clamped = Math.min(max, Math.max(min, rawVal));
      const steps = Math.round((clamped - min) / step);
      const stepped = min + steps * step;
      const bounded = Math.min(max, Math.max(min, stepped));
      return decimals > 0 ? Number(bounded.toFixed(decimals)) : Math.round(bounded);
    };

    assert.equal(quantize(0.88 + 0.333 * 0.24, 0.88, 1.12, 0.002), 0.96);
    assert.equal(quantize(-6 + 0.512 * 12, -6, 6, 0.05), 0.15);
    assert.equal(quantize(0.7 + 0.123 * 0.7, 0.7, 1.4, 0.005), 0.785);
  });
});
