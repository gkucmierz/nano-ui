import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, compileScript, compileTemplate, compileStyle } from '@vue/compiler-sfc';
import {
  LANG_CODE_ALIASES,
  LANG_FLAG_REGISTRY,
  normalizeLangCode,
  resolveLangMeta,
  normalizeLangOptions,
  renderLangFlagSvg,
} from '../../src/utils/langFlags.js';
import {
  navigateGrid,
  detectGridColumns,
  resolveAdaptiveMatrixColumns,
} from '../../src/utils/grid.js';
import {
  clampFloatingBox2D,
  computeAnchoredOverlayPosition,
} from '../../src/utils/selectPositioning.js';
import { tooltipDirective } from '../../src/directives/tooltip.js';
import {
  tooltipState,
  hideTooltip,
  recordTooltipPointerDown,
  recordTooltipKeyActivity,
} from '../../src/composables/useTooltip.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

describe('NanoFlag & langFlags — 32-language vector SVG flag registry', () => {
  it('resolves all 8 viral serce.app languages and 32 ISO 639-1 codes with crisp vector shapes and native endonyms', () => {
    const viralLangs = ['pl', 'en', 'es', 'pt', 'de', 'fr', 'uk', 'ja'];
    for (const code of viralLangs) {
      assert.ok(LANG_FLAG_REGISTRY[code], `Registry must include ${code}`);
      const meta = resolveLangMeta(code);
      assert.equal(meta.code, code);
      assert.equal(meta.short, code.toUpperCase());
      assert.equal(meta.isFallback, false);
      assert.ok(meta.nativeLabel.length >= 2);
      assert.ok(Array.isArray(meta.shapes) && meta.shapes.length >= 2);

      const svg = renderLangFlagSvg(code, { width: 20, height: 15 });
      assert.ok(svg.startsWith('<svg ') && svg.endsWith('</svg>'));
      assert.ok(svg.includes('viewBox="0 0 24 18"'));
      assert.ok(!svg.includes('<title>'), 'Must never inject native SVG <title> browser tooltips');
    }

    assert.ok(Object.keys(LANG_FLAG_REGISTRY).length >= 32);
    assert.equal(normalizeLangCode('pl-PL'), 'pl');
    assert.equal(normalizeLangCode('UA'), 'uk');
    assert.equal(normalizeLangCode('jp'), 'ja');
    assert.equal(normalizeLangCode('gb'), 'en');
    assert.equal(LANG_CODE_ALIASES.cz, 'cs');

    const unknown = resolveLangMeta('xx');
    assert.equal(unknown.isFallback, true);
    assert.equal(unknown.short, 'XX');
    assert.ok(unknown.shapes.length >= 2);

    const deduped = normalizeLangOptions(['pl', 'en', 'PL', 'ja']);
    assert.deepEqual(
      deduped.map((d) => d.code),
      ['pl', 'en', 'ja']
    );
  });
});

describe('NanoLangPicker & navigateGrid — Desktop 2D Matrix + Mobile Vertical List', () => {
  it('navigates 2D language matrices (4x2 for 8 langs) and 1D mobile lists accurately via navigateGrid', () => {
    assert.equal(resolveAdaptiveMatrixColumns(2), 2);
    assert.equal(resolveAdaptiveMatrixColumns(4), 2);
    assert.equal(resolveAdaptiveMatrixColumns(6), 3);
    assert.equal(resolveAdaptiveMatrixColumns(8), 4);
    assert.equal(resolveAdaptiveMatrixColumns(9), 3);

    // 8 languages in a 4x2 matrix: [0,1,2,3] / [4,5,6,7]
    assert.equal(navigateGrid(0, 8, 'ArrowRight', 4), 1);
    assert.equal(navigateGrid(3, 8, 'ArrowRight', 4), 4);
    assert.equal(navigateGrid(7, 8, 'ArrowRight', 4), 0);
    assert.equal(navigateGrid(0, 8, 'ArrowLeft', 4), 7);
    assert.equal(navigateGrid(1, 8, 'ArrowDown', 4), 5);
    assert.equal(navigateGrid(5, 8, 'ArrowDown', 4), 1);
    assert.equal(navigateGrid(2, 8, 'ArrowUp', 4), 6);

    // Incomplete trailing row (7 items in 4 cols: [0,1,2,3] / [4,5,6])
    assert.equal(navigateGrid(3, 7, 'ArrowDown', 4), 3);
    assert.equal(navigateGrid(2, 7, 'ArrowDown', 4), 6);

    // 1-column mobile vertical list: ArrowRight/ArrowDown step +1, ArrowLeft/ArrowUp step -1
    assert.equal(navigateGrid(0, 8, 'ArrowDown', 1), 1);
    assert.equal(navigateGrid(0, 8, 'ArrowRight', 1), 1);
    assert.equal(navigateGrid(0, 8, 'ArrowUp', 1), 7);
    assert.equal(navigateGrid(0, 8, 'ArrowLeft', 1), 7);

    assert.equal(detectGridColumns([10, 10, 10, 10, 68, 68, 68, 68], (y) => y, 2), 4);
  });

  it('compiles NanoFlag.vue & NanoLangPicker.vue SFCs cleanly without :global(), native title, or hover translateY', () => {
    for (const rel of ['src/components/NanoFlag.vue', 'src/components/NanoLangPicker.vue']) {
      const fullPath = path.join(rootDir, rel);
      const src = fs.readFileSync(fullPath, 'utf8');
      assert.ok(!src.includes(':global('), `${rel} must not contain :global() leaks`);
      assert.ok(!/\btitle=/.test(src), `${rel} must not use native HTML title tooltips`);
      assert.ok(
        !src.includes('translateY('),
        `${rel} must obey CSS-HOVER-01 stationary hover invariant`
      );

      const { descriptor, errors } = parse(src, { filename: rel });
      assert.equal(errors.length, 0, `${rel} parse errors: ${errors.join(', ')}`);

      const script = compileScript(descriptor, { id: rel });
      assert.ok(script.content.length > 0);

      const tpl = compileTemplate({
        id: rel,
        filename: rel,
        source: descriptor.template.content,
        compilerOptions: { bindingMetadata: script.bindings },
      });
      assert.equal(tpl.errors.length, 0, `${rel} template errors: ${tpl.errors.join(', ')}`);

      for (const styleBlock of descriptor.styles) {
        const css = compileStyle({
          id: `data-v-test`,
          filename: rel,
          source: styleBlock.content,
          scoped: Boolean(styleBlock.scoped),
        });
        assert.equal(css.errors.length, 0, `${rel} style errors: ${css.errors.join(', ')}`);
      }
    }

    const pickerSrc = fs.readFileSync(
      path.join(rootDir, 'src/components/NanoLangPicker.vue'),
      'utf8'
    );
    assert.ok(pickerSrc.includes(':lang="opt.code"'), 'Must apply BCP-47 :lang attribute to native endonyms');
    assert.ok(pickerSrc.includes('overscroll-behavior: contain'), 'Mobile list must contain scroll chaining');
    assert.ok(pickerSrc.includes('navigateGrid('), 'Must wire navigateGrid for 2D keyboard navigation');
  });

  it('computes finite non-NaN viewport coordinates for NanoLangPicker dropdowns and DOM-rect clampFloatingBox2D', () => {
    const topRightPos = computeAnchoredOverlayPosition({
      triggerRect: { left: 1080, right: 1168, top: 14, bottom: 50, width: 88, height: 36 },
      panelWidth: 488,
      panelHeight: 148,
      viewportWidth: 1280,
      viewportHeight: 800,
      gapPx: 6,
      paddingPx: 8,
      align: 'end',
    });
    assert.ok(Number.isFinite(topRightPos.left), 'panelPosition.left must never be NaN');
    assert.ok(Number.isFinite(topRightPos.top), 'panelPosition.top must never be NaN');
    assert.equal(topRightPos.placement, 'bottom');
    assert.equal(topRightPos.left, 1168 - 488);
    assert.equal(topRightPos.top, 56);

    // Near bottom of viewport: flips cleanly above trigger
    const flippedPos = computeAnchoredOverlayPosition({
      triggerRect: { left: 300, right: 388, top: 740, bottom: 776, width: 88, height: 36 },
      panelWidth: 268,
      panelHeight: 240,
      viewportWidth: 390,
      viewportHeight: 800,
      gapPx: 6,
      paddingPx: 8,
      align: 'end',
    });
    assert.equal(flippedPos.placement, 'top');
    assert.equal(flippedPos.top, 740 - 6 - 240);
    assert.ok(flippedPos.left >= 8 && flippedPos.left + 268 <= 390 - 8);

    // DOM-rect overload of clampFloatingBox2D returns finite { left, top } while preserving SVG { x, y } mode
    const domClamped = clampFloatingBox2D(
      { left: -24, top: 760, width: 200, height: 120 },
      { left: 0, top: 0, right: 360, bottom: 800 },
      8
    );
    assert.equal(domClamped.left, 8);
    assert.equal(domClamped.top, 672);
    assert.equal(domClamped.clampedLeft, true);
    assert.equal(domClamped.clampedTop, true);

    const svgClamped = clampFloatingBox2D({
      x: 10,
      y: 12,
      halfWidth: 4,
      halfHeight: 3,
      bounds: { minX: -21, maxX: 53, minY: -6, maxY: 38 },
      padding: 0.65,
    });
    assert.equal(svgClamped.x, 10);
    assert.equal(svgClamped.y, 12);
  });

  it('never pops up a phantom tooltip on NanoLangPicker trigger when focus transfers after clicking a dropdown option', () => {
    hideTooltip();
    const handlers = {};
    const triggerEl = {
      isConnected: true,
      nodeType: 1,
      addEventListener(type, fn) {
        handlers[type] = fn;
      },
      removeEventListener() {},
      hasAttribute: () => true,
      setAttribute() {},
      matches: (sel) => sel === ':focus-visible',
      getBoundingClientRect: () => ({ top: 12, left: 900, width: 88, height: 36, bottom: 48, right: 988 }),
    };

    tooltipDirective.mounted(triggerEl, { value: 'Cambiar idioma (L) · Español' });

    // Simulate clicking an option inside the dropdown (global pointer activity, NOT on triggerEl)
    recordTooltipPointerDown(Date.now());
    handlers.focus();
    assert.equal(
      tooltipState.isVisible,
      false,
      'Programmatic focus after clicking a separate dropdown option must never pop up trigger tooltip'
    );

    // Simulate subsequent keyboard Tab navigation -> clears pointer suppression and shows focus tooltip
    recordTooltipKeyActivity('Tab', Date.now());
    handlers.focus();
    assert.equal(tooltipState.isVisible, true);

    tooltipDirective.unmounted(triggerEl);
    hideTooltip();
  });
});
