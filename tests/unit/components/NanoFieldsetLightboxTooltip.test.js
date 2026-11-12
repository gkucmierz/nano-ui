import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

describe('GlobalTooltip, NanoFieldset, NanoLightbox & Callout Primitives (v1.8.24)', () => {
  it('guards GlobalTooltip SVG speech-bubble width/height against consumer svg { max-width: 100% } resets', () => {
    const src = fs.readFileSync(path.join(rootDir, 'src/components/GlobalTooltip.vue'), 'utf8');
    assert.ok(src.includes('max-width: none;'), 'GlobalTooltip bubble SVG must set max-width: none');
    assert.ok(src.includes('max-height: none;'), 'GlobalTooltip bubble SVG must set max-height: none');
    assert.ok(
      src.includes('width: `${bubbleGeometry.svgWidth}px`'),
      'GlobalTooltip bubble SVG should bind explicit pixel width in style'
    );
  });

  it('provides semantic NanoFieldset with first-child <legend> and inset card float layout', () => {
    const vueSrc = fs.readFileSync(path.join(rootDir, 'src/components/NanoFieldset.vue'), 'utf8');
    const cssSrc = fs.readFileSync(path.join(rootDir, 'src/assets/primitives.css'), 'utf8');
    const indexSrc = fs.readFileSync(path.join(rootDir, 'src/index.js'), 'utf8');

    assert.ok(vueSrc.includes('<fieldset'), 'NanoFieldset must render native <fieldset>');
    assert.ok(vueSrc.includes('<legend v-if="legend || $slots.legend" class="nano-legend">'), 'NanoFieldset must render <legend> first');
    assert.ok(cssSrc.includes('.nano-fieldset.nano-fieldset-inset > legend'), 'primitives.css must style inset legend');
    assert.ok(cssSrc.includes('overflow-wrap: anywhere;'), 'legend must wrap long uppercase titles cleanly');
    assert.ok(indexSrc.includes('NanoFieldset'), 'src/index.js must export NanoFieldset');
  });

  it('implements NanoLightbox with native <dialog closedby="any">, showModal(), blurred ::backdrop, and zero raw typeof', () => {
    const vueSrc = fs.readFileSync(path.join(rootDir, 'src/components/NanoLightbox.vue'), 'utf8');
    const cssSrc = fs.readFileSync(path.join(rootDir, 'src/assets/primitives.css'), 'utf8');
    const indexSrc = fs.readFileSync(path.join(rootDir, 'src/index.js'), 'utf8');

    assert.ok(vueSrc.includes('<dialog'), 'NanoLightbox must use native <dialog>');
    assert.ok(vueSrc.includes('closedby="any"'), 'NanoLightbox must declare closedby="any"');
    assert.ok(vueSrc.includes('dlg.showModal()'), 'NanoLightbox must open modal via showModal()');
    assert.ok(!vueSrc.includes('role="dialog"'), 'Native modal <dialog> must not duplicate role="dialog"');
    assert.ok(!vueSrc.includes('aria-modal'), 'Native modal <dialog> must not duplicate aria-modal');
    assert.ok(!/\btypeof\b/.test(vueSrc), 'NanoLightbox must not use raw typeof');
    assert.ok(cssSrc.includes('dialog.nano-lightbox-dialog::backdrop'), 'primitives.css must style ::backdrop');
    assert.ok(cssSrc.includes('backdrop-filter: blur(var(--nano-lightbox-blur, 20px))'), '::backdrop must apply blur');
    assert.ok(cssSrc.includes('overscroll-behavior: contain;'), 'dialog and ::backdrop must contain overscroll');
    assert.ok(indexSrc.includes('NanoLightbox'), 'src/index.js must export NanoLightbox');
  });

  it('defines Dark and Light mode .nano-callout tokens for tip, note, important, warning, and caution', () => {
    const colorsSrc = fs.readFileSync(path.join(rootDir, 'src/assets/colors.css'), 'utf8');
    const primitivesSrc = fs.readFileSync(path.join(rootDir, 'src/assets/primitives.css'), 'utf8');

    for (const variant of ['tip', 'note', 'important', 'warning', 'caution']) {
      assert.ok(colorsSrc.includes(`--nano-callout-${variant}-bg:`), `Missing --nano-callout-${variant}-bg token`);
      assert.ok(primitivesSrc.includes(`.nano-callout-${variant}`), `Missing .nano-callout-${variant} class`);
    }
  });
});
