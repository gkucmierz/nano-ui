import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import * as Vue from 'vue';
import { renderToString } from 'vue/server-renderer';
import { parse, compileScript, compileTemplate } from 'vue/compiler-sfc';
import vRipple from '../../src/directives/ripple.js';
import * as storageControllerMod from '../../src/utils/storage-controller.js';
import * as lightboxGeometryMod from '../../src/utils/lightboxGeometry.js';
import {
  parseSvgViewBoxDimensions,
  normalizeLightboxSvgMarkup,
  computeLightboxStageGeometry,
} from '../../src/utils/lightboxGeometry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

function loadCompiledNanoLightbox() {
  const sfcPath = path.join(rootDir, 'src/components/NanoLightbox.vue');
  const source = fs.readFileSync(sfcPath, 'utf8');
  const { descriptor } = parse(source, { filename: 'NanoLightbox.vue' });
  const id = 'nano-lightbox-test';
  const compiledScript = compileScript(descriptor, {
    id,
    inlineTemplate: false,
  });
  const compiledTpl = compileTemplate({
    id,
    filename: 'NanoLightbox.vue',
    source: descriptor.template.content,
    compilerOptions: {
      bindingMetadata: compiledScript.bindings,
    },
  });

  const rewriteImports = (code) =>
    code
      .replace(/import\s+\{([^}]+)\}\s+from\s+['"]vue['"];?/g, (_m, spec) => `const {${spec.replace(/\s+as\s+/g, ': ')}} = __vue;`)
      .replace(/import\s+(\w+)\s+from\s+['"]\.\.\/directives\/ripple\.js['"];?/g, 'const $1 = __vRipple;')
      .replace(
        /import\s+\{([^}]+)\}\s+from\s+['"]\.\.\/utils\/storage-controller\.js['"];?/g,
        (_m, spec) => `const {${spec.replace(/\s+as\s+/g, ': ')}} = __storageController;`
      )
      .replace(
        /import\s+\{([^}]+)\}\s+from\s+['"]\.\.\/utils\/lightboxGeometry\.js['"];?/g,
        (_m, spec) => `const {${spec.replace(/\s+as\s+/g, ': ')}} = __lightboxGeometry;`
      )
      .replace(/export\s+default\s+/, 'const __sfc = ')
      .replace(/export\s+function\s+render/, 'function render');

  const bundleCode = `
    ${rewriteImports(compiledScript.content)}
    ${rewriteImports(compiledTpl.code)}
    __sfc.render = render;
    __result.component = __sfc;
  `;

  const result = {};
  vm.runInNewContext(bundleCode, {
    __vue: Vue,
    __vRipple: vRipple,
    __storageController: storageControllerMod,
    __lightboxGeometry: lightboxGeometryMod,
    __result: result,
    globalThis,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Math,
    JSON,
    Promise,
    setTimeout,
  });
  return result.component;
}

describe('NanoLightbox Universal Flat-Asset Vector & Raster Support (v1.8.31)', () => {
  it('parseSvgViewBoxDimensions parses viewBox with whitespace/commas, negatives, decimals, and ignores nested <marker>', () => {
    const mermaidLike = `
      <svg id="m1" width="100%" style="max-width: 694px;" viewBox="-8.5, -12.25  694.5 347.25" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10"><path d="M0,0 L10,5 L0,10 z" /></marker>
        </defs>
      </svg>
    `;
    const dims = parseSvgViewBoxDimensions(mermaidLike);
    assert.ok(dims);
    assert.equal(dims.width, 694.5);
    assert.equal(dims.height, 347.25);
    assert.equal(dims.aspectRatio, 2);
  });

  it('parseSvgViewBoxDimensions falls back to numeric width/height and ignores percentage dimensions', () => {
    const numericSvg = '<svg stroke-width="2" width="520px" height="260"><rect width="520" height="260"/></svg>';
    const dims = parseSvgViewBoxDimensions(numericSvg);
    assert.deepEqual(dims, {
      width: 520,
      height: 260,
      aspectRatio: 2,
    });

    const percentOnlySvg = '<svg width="100%" height="100%"><circle cx="10" cy="10" r="5"/></svg>';
    assert.equal(parseSvgViewBoxDimensions(percentOnlySvg), null);
    assert.equal(parseSvgViewBoxDimensions('<div>not svg</div>'), null);
    assert.equal(parseSvgViewBoxDimensions(''), null);
  });

  it('normalizeLightboxSvgMarkup strips root max-width, injects 100% + preserveAspectRatio + synthesized viewBox, and suffixes internal IDs', () => {
    const rawMermaidSvg = [
      '<svg id="mermaid-chart-0" width="640" height="320" style="font-family: Inter; max-width: 640px;">',
      '<style>#mermaid-chart-0{fill:#0f172a;}#mermaid-chart-0 .node rect{stroke:#6366f1;}</style>',
      '<defs>',
      '<marker id="mermaid-chart-0_pointEnd" viewBox="0 0 10 10"><path d="M 0 0 L 10 5 L 0 10 z"/></marker>',
      '<linearGradient id="grad-a"><stop offset="0%" stop-color="#38bdf8"/></linearGradient>',
      '<symbol id="sym-node"><rect width="20" height="20"/></symbol>',
      '</defs>',
      '<g>',
      '<use href="#sym-node" xlink:href="#sym-node" fill="url(#grad-a)"/>',
      '<path d="M 10 20 L 120 20" marker-end="url(#mermaid-chart-0_pointEnd)" filter="url(#external-keep)"/>',
      '<foreignObject width="180" height="40"><div xmlns="http://www.w3.org/1999/xhtml" style="max-width: 200px;"><p>USAG-1</p></div></foreignObject>',
      '</g>',
      '</svg>',
    ].join('');

    const out = normalizeLightboxSvgMarkup(rawMermaidSvg, 'lb7');

    assert.match(out, /^<svg\b[^>]*\bviewBox="0 0 640 320"/);
    assert.match(out, /^<svg\b[^>]*\bwidth="100%"/);
    assert.match(out, /^<svg\b[^>]*\bheight="100%"/);
    assert.match(out, /^<svg\b[^>]*\bpreserveAspectRatio="xMidYMid meet"/);
    assert.ok(!/^<svg\b[^>]*max-width/i.test(out), 'Root <svg> inline max-width must be stripped');
    assert.ok(out.includes('font-family: Inter;'), 'Non-size root inline styles should be preserved');
    assert.ok(out.includes('style="max-width: 200px;"'), 'Nested foreignObject label max-width must remain untouched');

    assert.ok(out.includes('id="mermaid-chart-0-lb7"'));
    assert.ok(out.includes('id="mermaid-chart-0_pointEnd-lb7"'));
    assert.ok(out.includes('marker-end="url(#mermaid-chart-0_pointEnd-lb7)"'));
    assert.ok(out.includes('fill="url(#grad-a-lb7)"'));
    assert.ok(out.includes('href="#sym-node-lb7"'));
    assert.ok(out.includes('xlink:href="#sym-node-lb7"'));
    assert.ok(out.includes('filter="url(#external-keep)"'), 'Undeclared external url(#...) must not be mutated');
    assert.ok(out.includes('#mermaid-chart-0-lb7{fill:#0f172a;}'), 'Internal <style> #id selector must match suffixed root ID while keeping hex colors intact');
    assert.ok(out.includes('#mermaid-chart-0-lb7 .node rect{stroke:#6366f1;}'));
  });

  it('computeLightboxStageGeometry skips raster down-clamping when isVector is true', () => {
    const rasterSmall = computeLightboxStageGeometry({
      viewportWidth: 1440,
      viewportHeight: 900,
      zoomed: false,
      naturalWidth: 520,
      naturalHeight: 340,
      hasFooter: true,
      isVector: false,
    });
    assert.equal(rasterSmall.mediaWidth, 520);
    assert.equal(rasterSmall.mediaHeight, 340);

    const vectorSameViewBox = computeLightboxStageGeometry({
      viewportWidth: 1440,
      viewportHeight: 900,
      zoomed: false,
      naturalWidth: 520,
      naturalHeight: 340,
      hasFooter: true,
      isVector: true,
    });
    assert.ok(
      vectorSameViewBox.mediaWidth > 950,
      `Expected vector stage width > 950px in compact mode, got ${vectorSameViewBox.mediaWidth}`
    );
    assert.ok(Math.abs(vectorSameViewBox.mediaWidth / vectorSameViewBox.mediaHeight - 520 / 340) < 0.01);

    const vectorZoomed = computeLightboxStageGeometry({
      viewportWidth: 1440,
      viewportHeight: 900,
      zoomed: true,
      naturalWidth: 520,
      naturalHeight: 340,
      hasFooter: true,
      isVector: true,
    });
    assert.ok(vectorZoomed.mediaWidth > vectorSameViewBox.mediaWidth);
  });

  it('exports parseSvgViewBoxDimensions and normalizeLightboxSvgMarkup from src/index.js and defines light/dark SVG tokens', () => {
    const indexSrc = fs.readFileSync(path.join(rootDir, 'src/index.js'), 'utf8');
    const colorsSrc = fs.readFileSync(path.join(rootDir, 'src/assets/colors.css'), 'utf8');
    const vueSrc = fs.readFileSync(path.join(rootDir, 'src/components/NanoLightbox.vue'), 'utf8');
    const geomSrc = fs.readFileSync(path.join(rootDir, 'src/utils/lightboxGeometry.js'), 'utf8');

    assert.ok(indexSrc.includes('parseSvgViewBoxDimensions'));
    assert.ok(indexSrc.includes('normalizeLightboxSvgMarkup'));
    assert.ok(colorsSrc.includes('--nano-lightbox-svg-bg:'));
    assert.ok(colorsSrc.includes('--nano-lightbox-viewport-bg:'));
    assert.ok(!/\btypeof\b/.test(vueSrc), 'NanoLightbox.vue must contain zero raw typeof');
    assert.ok(!/\btypeof\b/.test(geomSrc), 'lightboxGeometry.js must contain zero raw typeof');
    assert.ok(!vueSrc.includes(':global('), 'NanoLightbox.vue must not use :global(...) in scoped CSS');
  });

  it('renders NanoLightbox vector svg prop, mixed gallery items, defaultZoomed, and custom #media slot via SSR', async () => {
    const NanoLightbox = loadCompiledNanoLightbox();
    const sampleSvg = '<svg id="g1" style="max-width: 420px;" viewBox="0 0 420 210"><defs><marker id="m-end" viewBox="0 0 10 10"><path d="M0,0L10,5L0,10z"/></marker></defs><path d="M10,10L200,10" marker-end="url(#m-end)"/></svg>';

    // 1. Single-prop svg + defaultZoomed
    const singleSvgHtml = await renderToString(
      Vue.createSSRApp({
        render: () =>
          Vue.h(NanoLightbox, {
            modelValue: true,
            svg: sampleSvg,
            caption: 'Mermaid Flowchart',
            badge: 'MERMAID',
            defaultZoomed: true,
          }),
      })
    );
    assert.ok(singleSvgHtml.includes('nano-lightbox-dialog is-zoomed'));
    assert.ok(singleSvgHtml.includes('class="nano-lightbox-svg is-zoomed"'));
    assert.ok(singleSvgHtml.includes('role="img"'));
    assert.ok(singleSvgHtml.includes('MERMAID'));
    assert.ok(!singleSvgHtml.includes('max-width: 420px'));
    assert.match(singleSvgHtml, /marker-end="url\(#m-end-[^")]+\)"/);

    // 2. Mixed raster + vector items with per-item defaultZoomed
    const mixedHtml = await renderToString(
      Vue.createSSRApp({
        render: () =>
          Vue.h(NanoLightbox, {
            modelValue: true,
            activeIndex: 1,
            items: [
              { src: '/img/hero.webp', alt: 'Hero', badge: 'IMG' },
              { svg: sampleSvg, alt: 'Pathway', caption: 'BMP/Wnt Pathway', badge: 'MERMAID', defaultZoomed: true },
            ],
          }),
      })
    );
    assert.ok(mixedHtml.includes('2 / 2'));
    assert.ok(mixedHtml.includes('BMP/Wnt Pathway'));
    assert.ok(mixedHtml.includes('nano-lightbox-svg is-zoomed'));

    // 3. Universal #media slot fallback
    const slotHtml = await renderToString(
      Vue.createSSRApp({
        render: () =>
          Vue.h(
            NanoLightbox,
            {
              modelValue: true,
              caption: 'Custom 2D Canvas Plot',
              defaultZoomed: true,
            },
            {
              media: ({ zoomed }) =>
                Vue.h('div', {
                  class: 'custom-flat-asset',
                  'data-zoomed': String(zoomed),
                }),
            }
          ),
      })
    );
    assert.ok(slotHtml.includes('class="custom-flat-asset"'));
    assert.ok(slotHtml.includes('data-zoomed="true"'));
  });

  it('persists and restores NanoLightbox zoom + optional activeIndex via getScopedStorageController("nano-ui") (ls / ss / none)', async () => {
    const NanoLightbox = loadCompiledNanoLightbox();
    const nanoStorage = storageControllerMod.getScopedStorageController('nano-ui');
    const testKey = 'unit_lightbox_state';
    const testPrefix = 'science-blog';

    nanoStorage.remove(testKey, { mode: 'ls', appPrefix: testPrefix });
    nanoStorage.remove(testKey, { mode: 'ss', appPrefix: testPrefix });

    // 1. Pre-seed savedzoom + slide index in ls and verify SSR restoration
    nanoStorage.set(
      testKey,
      { isZoomed: true, activeIndex: 1 },
      { mode: 'ls', appPrefix: testPrefix }
    );

    const inspected = nanoStorage.inspect(testKey, { mode: 'ls', appPrefix: testPrefix });
    assert.equal(inspected.resolvedKey, 'SB_NU_unit_lightbox_state');
    assert.equal(inspected.exists, true);

    const restoredHtml = await renderToString(
      Vue.createSSRApp({
        render: () =>
          Vue.h(NanoLightbox, {
            modelValue: true,
            activeIndex: 0,
            storage: 'ls',
            appPrefix: testPrefix,
            storageKey: testKey,
            persistIndex: true,
            items: [
              { src: '/img/a.webp', alt: 'Slide A', caption: 'First Slide' },
              { src: '/img/b.webp', alt: 'Slide B', caption: 'Restored Second Slide' },
            ],
          }),
      })
    );
    assert.ok(restoredHtml.includes('nano-lightbox-dialog is-zoomed'), 'Saved isZoomed:true should restore zoomed class');
    assert.ok(restoredHtml.includes('2 / 2'), 'Saved activeIndex:1 with persistIndex:true should restore slide 2');
    assert.ok(restoredHtml.includes('Restored Second Slide'));

    // 2. With storage="none", saved ls state is ignored and defaultZoomed (false) applies
    const disabledHtml = await renderToString(
      Vue.createSSRApp({
        render: () =>
          Vue.h(NanoLightbox, {
            modelValue: true,
            activeIndex: 0,
            storage: 'none',
            appPrefix: testPrefix,
            storageKey: testKey,
            persistIndex: true,
            items: [
              { src: '/img/a.webp', alt: 'Slide A', caption: 'First Slide' },
              { src: '/img/b.webp', alt: 'Slide B', caption: 'Restored Second Slide' },
            ],
          }),
      })
    );
    assert.ok(!disabledHtml.includes('nano-lightbox-dialog is-zoomed'), 'storage="none" must ignore persisted zoom');
    assert.ok(disabledHtml.includes('1 / 2'), 'storage="none" must ignore persisted activeIndex');

    // 3. Exposed toggleZoom() and resetState() mutate & clear storage cleanly
    const emitted = [];
    let vnode = null;
    await renderToString(
      Vue.createSSRApp({
        render: () => {
          vnode = Vue.h(NanoLightbox, {
            modelValue: true,
            storage: 'ss',
            appPrefix: testPrefix,
            storageKey: testKey,
            src: '/img/a.webp',
            'onState-change': (payload) => {
              emitted.push({ event: 'state-change', payload });
            },
          });
          return vnode;
        },
      })
    );
    const exposedApi = vnode?.component?.exposed;
    assert.ok(exposedApi);
    assert.equal(exposedApi.effectiveStorageKey.value, 'SB_NU_unit_lightbox_state');
    assert.equal(exposedApi.resolvedStorageMode.value, 'ss');
    assert.equal(exposedApi.isZoomed.value, false);

    exposedApi.toggleZoom();
    assert.equal(exposedApi.isZoomed.value, true);
    assert.deepEqual(
      nanoStorage.get(testKey, null, { mode: 'ss', appPrefix: testPrefix }),
      { isZoomed: true }
    );
    assert.ok(emitted.some((e) => e.event === 'state-change' && e.payload?.isZoomed === true));

    exposedApi.resetState();
    assert.equal(exposedApi.isZoomed.value, false);
    assert.equal(nanoStorage.get(testKey, null, { mode: 'ss', appPrefix: testPrefix }), null);

    nanoStorage.remove(testKey, { mode: 'ls', appPrefix: testPrefix });
  });
});
