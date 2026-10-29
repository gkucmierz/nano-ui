import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sliderSfc = readFileSync(resolve(__dirname, '../../src/components/NanoSlider.vue'), 'utf8');
const indexJs = readFileSync(resolve(__dirname, '../../src/index.js'), 'utf8');
const routerJs = readFileSync(resolve(__dirname, '../../src/playground/router/index.js'), 'utf8');

describe('NanoSlider Component & Playground Integration', () => {
  it('should define modelValue, min, max, step, showTicks, size, and disabled props', () => {
    assert.ok(sliderSfc.includes('modelValue:'));
    assert.ok(sliderSfc.includes('min:'));
    assert.ok(sliderSfc.includes('max:'));
    assert.ok(sliderSfc.includes('step:'));
    assert.ok(sliderSfc.includes('showTicks:'));
    assert.ok(sliderSfc.includes('size:'));
    assert.ok(sliderSfc.includes('disabled:'));
  });

  it('should implement ARIA slider semantics, pointer capture, and keyboard navigation', () => {
    assert.ok(sliderSfc.includes('role="slider"'));
    assert.ok(sliderSfc.includes(':aria-valuemin="min"'));
    assert.ok(sliderSfc.includes(':aria-valuemax="max"'));
    assert.ok(sliderSfc.includes(':aria-valuenow="modelValue"'));
    assert.ok(sliderSfc.includes('setPointerCapture'));
    assert.ok(sliderSfc.includes('ArrowRight'));
    assert.ok(sliderSfc.includes('ArrowLeft'));
  });

  it('should be exported from index.js and registered in playground router (/docs/slider)', () => {
    assert.ok(indexJs.includes('NanoSlider'));
    assert.ok(routerJs.includes("path: '/docs/slider'"));
  });
});
