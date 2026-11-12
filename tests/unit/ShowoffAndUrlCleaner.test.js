import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeUrl, cleanCurrentUrl, createUrlCleaner } from 'vue-url-cleaner';

import {
  computeFloating3DArtifacts,
  computeGoldenFlowAndCursorField,
  computeStagePointerField,
  computeBauhausPhiScene3D,
} from '../../src/utils/bauhausPhiLogo.js';
import {
  resolveRouteAllowedQueryKeys,
  buildInitialAllowedQueryKeys,
} from '../../src/playground/urlCleanerConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');

test('/showoff floating 3D cards stay strictly anchored inside dark preview stage across all 3D angles and cursor positions', () => {
  const backdropRect = { minX: -25.2, maxX: 57.2, minY: -10.2, maxY: 42.2 };
  const stageBounds = { minX: -24.2, maxX: 56.2, minY: -9.2, maxY: 41.2 };

  for (const yaw of [-65, -42, -20, 0, 13.9, 34, 65]) {
    for (const pitch of [-45, -22, 0, 4.9, 18, 27.4, 45]) {
      for (const phase of [0, 1.2, 2.8, 4.7]) {
        for (const cy of [-1, 0, 1]) {
          const cards = computeFloating3DArtifacts(yaw, pitch, phase, 0.25, 0, cy, stageBounds);
          assert.equal(cards.length, 4);

          for (const c of cards) {
            const topEdge = c.y - c.cardHalfH;
            const bottomEdge = c.y + c.cardHalfH;
            const leftEdge = c.x - c.cardHalfW;
            const rightEdge = c.x + c.cardHalfW;

            assert.ok(
              topEdge >= backdropRect.minY + 1.0,
              `Card ${c.tag} flew above preview backdrop at (yaw=${yaw}, pitch=${pitch}, cy=${cy}): topEdge=${topEdge}`
            );
            assert.ok(
              bottomEdge <= backdropRect.maxY - 1.0,
              `Card ${c.tag} overflowed bottom of preview backdrop at (yaw=${yaw}, pitch=${pitch}, cy=${cy}): bottomEdge=${bottomEdge}`
            );
            assert.ok(
              leftEdge >= backdropRect.minX + 1.0 && rightEdge <= backdropRect.maxX - 1.0,
              `Card ${c.tag} overflowed horizontal preview backdrop: [${leftEdge}, ${rightEdge}]`
            );

            if (c.wingSlot === 'top') {
              assert.ok(
                c.y < 16,
                `Top wing card ${c.tag} drifted out of upper wing half: y=${c.y}`
              );
            } else {
              assert.ok(
                c.y > 16,
                `Bottom wing card ${c.tag} flew upward into upper wing half at (yaw=${yaw}, pitch=${pitch}): y=${c.y}`
              );
            }
          }

          for (const wing of ['left', 'right']) {
            const topCard = cards.find((c) => c.wing === wing && c.wingSlot === 'top');
            const bottomCard = cards.find((c) => c.wing === wing && c.wingSlot === 'bottom');
            const gapY = (bottomCard.y - bottomCard.cardHalfH) - (topCard.y + topCard.cardHalfH);
            assert.ok(
              gapY >= 8.0,
              `Expected >= 8.0 vertical gap on ${wing} wing at (yaw=${yaw}, pitch=${pitch}), got ${gapY}`
            );
          }
        }
      }
    }
  }
});

test('computeStagePointerField remains scroll-invariant across scrollY=0, 500, 1500+ and ignores header hover outside 3D SVG', () => {
  // Stationary pointer in viewport at clientX=580, clientY=460
  const clientX = 580;
  const clientY = 460;

  // 1. At scrollY = 0: 3D SVG is below the cursor (svgTop = 1008..1218), stage header is at 935..993
  const rectAtScroll0 = { left: 422, right: 749, top: 1008, bottom: 1218, width: 327, height: 210 };
  const fieldScroll0 = computeStagePointerField({ clientX, clientY, stageRect: rectAtScroll0 });
  assert.equal(fieldScroll0.inside, false);
  assert.equal(fieldScroll0.presence, 0);
  assert.equal(fieldScroll0.normY, 0);

  // Hovering the .stage-box-head title bar 35px above the 3D SVG must NOT pin normY = -1
  const fieldOnHeader = computeStagePointerField({
    clientX,
    clientY: 470,
    stageRect: { left: 422, right: 749, top: 508, bottom: 718, width: 327, height: 210 },
  });
  assert.equal(fieldOnHeader.inside, false);
  assert.equal(fieldOnHeader.presence, 0);
  assert.equal(fieldOnHeader.normY, 0);

  // 2. At scrollY = 500: 3D SVG scrolls directly under stationary cursor (svgTop = 355..565, center = 460)
  const rectAtScroll500 = { left: 422, right: 749, top: 355, bottom: 565, width: 327, height: 210 };
  const fieldScroll500 = computeStagePointerField({ clientX, clientY, stageRect: rectAtScroll500 });
  assert.equal(fieldScroll500.inside, true);
  assert.equal(fieldScroll500.presence, 1);
  assert.ok(Math.abs(fieldScroll500.normY) < 0.01);

  const flow500 = computeGoldenFlowAndCursorField({
    timeSec: 4.0,
    cursorNormX: fieldScroll500.normX,
    cursorNormY: fieldScroll500.normY,
    cursorEnergy: 0.2,
    cursorPresence: fieldScroll500.presence,
  });
  const scene500 = computeBauhausPhiScene3D(
    flow500.yawDeg,
    flow500.pitchDeg,
    flow500.calibrationPerturbation,
    flow500.holoPhaseRad,
    { normX: fieldScroll500.normX, normY: fieldScroll500.normY, presence: fieldScroll500.presence }
  );
  for (const card of scene500.floatingArtifacts) {
    assert.ok(card.y - card.cardHalfH >= -9.2);
    assert.ok(card.y + card.cardHalfH <= 41.2);
  }

  // 3. At scrollY = 1500: 3D SVG has scrolled well above viewport (svgTop = -645..-435)
  const rectAtScroll1500 = { left: 422, right: 749, top: -645, bottom: -435, width: 327, height: 210 };
  const fieldScroll1500 = computeStagePointerField({ clientX, clientY, stageRect: rectAtScroll1500 });
  assert.equal(fieldScroll1500.inside, false);
  assert.equal(fieldScroll1500.presence, 0);
  assert.equal(fieldScroll1500.normY, 0);

  // 4. Verify LogoConceptsLab.vue wires scroll listener, touch-action: pan-y, and harmonized stage rect
  const labSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/playground/LogoConceptsLab.vue'), 'utf8');
  assert.ok(labSrc.includes("addEventListener('scroll', syncPointerFieldOnScroll"));
  assert.ok(labSrc.includes("removeEventListener('scroll', syncPointerFieldOnScroll"));
  assert.ok(labSrc.includes('touch-action: pan-y;'));
  assert.ok(labSrc.includes(":y=\"deviceViewport === 'mobile' ? -1.2 : -10.2\""));
});

test('vue-url-cleaner integration strips fbclid, utm_*, and gclid on /showoff while preserving hashes and route meta.allowedQuery', () => {
  // 1. Pure URL sanitization check on exact user-reported /showoff?fbclid=... URL
  const dirtyShowoffUrl =
    'https://nano-ui.7u.pl/showoff?fbclid=IwZXh0bgNhZW0CMTAAcGRvZgVicmlk&utm_source=facebook&gclid=EAIaIQob#stage';
  const cleaned = sanitizeUrl(dirtyShowoffUrl);
  assert.equal(cleaned.cleanUrl, 'https://nano-ui.7u.pl/showoff#stage');
  assert.equal(cleaned.hasModifications, true);
  assert.ok('fbclid' in cleaned.stripped);
  assert.ok('utm_source' in cleaned.stripped);
  assert.ok('gclid' in cleaned.stripped);

  // 2. Simulated browser window.location + history.replaceState + Vue Router afterEach lifecycle
  const prevWindow = globalThis.window;
  const replacedUrls = [];
  let afterEachHook = null;

  const mockWindow = {
    location: {
      href: 'https://nano-ui.7u.pl/showoff?fbclid=IwZXh0bgNhZW0CMTAAcGRvZgVicmlk&igshid=xyz987#lab',
      pathname: '/showoff',
      search: '?fbclid=IwZXh0bgNhZW0CMTAAcGRvZgVicmlk&igshid=xyz987',
      hash: '#lab',
    },
    history: {
      state: { idx: 0 },
      replaceState(_state, _title, nextUrl) {
        replacedUrls.push(nextUrl);
        const parsed = new URL(nextUrl, 'https://nano-ui.7u.pl');
        mockWindow.location.href = parsed.toString();
        mockWindow.location.pathname = parsed.pathname;
        mockWindow.location.search = parsed.search;
        mockWindow.location.hash = parsed.hash;
      },
    },
    addEventListener() {},
    removeEventListener() {},
  };

  globalThis.window = mockWindow;
  try {
    const didInitialClean = cleanCurrentUrl();
    assert.equal(didInitialClean, true);
    assert.equal(mockWindow.location.href, 'https://nano-ui.7u.pl/showoff#lab');
    assert.equal(mockWindow.location.search, '');

    const mockRouter = {
      afterEach(cb) {
        afterEachHook = cb;
      },
    };
    const mockApp = {
      config: { globalProperties: {} },
      use(plugin) {
        plugin.install(mockApp);
      },
    };

    mockApp.use(createUrlCleaner({ router: mockRouter, autoFromRouteMeta: true }));
    assert.ok(afterEachHook instanceof Function);

    // Simulate SPA route transition to a route with meta.allowedQuery + tracking noise
    mockWindow.location.href =
      'https://nano-ui.7u.pl/docs/tabs?tab=api&fbclid=IwZXh0bgNhZW0&mc_eid=track1';
    mockWindow.location.pathname = '/docs/tabs';
    mockWindow.location.search = '?tab=api&fbclid=IwZXh0bgNhZW0&mc_eid=track1';
    mockWindow.location.hash = '';

    afterEachHook({ path: '/docs/tabs', meta: { allowedQuery: ['tab'] } });
    assert.equal(mockWindow.location.search, '?tab=api');
    assert.equal(mockWindow.location.href, 'https://nano-ui.7u.pl/docs/tabs?tab=api');
  } finally {
    if (prevWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = prevWindow;
    }
  }

  // 3. Verify resolveRouteAllowedQueryKeys and app-factory + package.json wiring
  assert.deepEqual(
    resolveRouteAllowedQueryKeys('/docs/tabs/', [
      { path: '/docs/tabs', meta: { allowedQuery: ['tab', 'section'] } },
    ]),
    ['tab', 'section']
  );
  assert.deepEqual(
    resolveRouteAllowedQueryKeys('/showoff', [{ path: '/showoff', meta: { allowedQuery: false } }]),
    []
  );
  assert.deepEqual(
    buildInitialAllowedQueryKeys(
      '/docs/tabs/',
      [{ path: '/docs/tabs', meta: { allowedQuery: ['tab'] } }],
      { allowedKeys: ['ref'] }
    ),
    ['ref', 'tab']
  );

  const appFactorySrc = fs.readFileSync(
    path.join(ROOT_DIR, 'src/playground/app-factory.js'),
    'utf8'
  );
  assert.ok(appFactorySrc.includes("from 'vue-url-cleaner'"));
  assert.ok(appFactorySrc.includes('createUrlCleaner('));

  const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  assert.equal(pkgJson.version, '1.8.21');
  assert.equal(pkgJson.devDependencies['vue-url-cleaner'], '^1.0.0');
  assert.equal(pkgJson.dependencies, undefined);
});
