import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractFeatureTitleSlug,
  resolveCssViewportPixels,
  clampModalGeometryBox,
} from '../../src/utils/modalGeometry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const modalSfc = readFileSync(resolve(__dirname, '../../src/components/NanoModal.vue'), 'utf8');

describe('NanoModal Per-Feature Geometry Persistence & Split-Screen Clamping', () => {
  it('strips dynamic repository, branch, and counter suffixes to produce a stable per-feature slug', () => {
    assert.equal(
      extractFeatureTitleSlug('Working Tree Diff — bitcoin-logo (±5 uncommitted on main)'),
      'working_tree_diff'
    );
    assert.equal(
      extractFeatureTitleSlug('Working Tree Diff — milowice-pl (±2 uncommitted on main)'),
      'working_tree_diff'
    );
    assert.equal(
      extractFeatureTitleSlug('Confirm Git Push — dashboard-app'),
      'confirm_git_push'
    );
    assert.equal(
      extractFeatureTitleSlug('🏗️ Gitea Live Build Stream — nano-ui'),
      'gitea_live_build_stream'
    );
    assert.equal(
      extractFeatureTitleSlug('CI/CD Build Diagnosis & AI Fix — algorithms-app'),
      'ci_cd_build_diagnosis_ai_fix'
    );
    assert.equal(extractFeatureTitleSlug(''), '');
  });

  it('resolves pixel numbers and CSS viewport units (vh/vw/px) deterministically', () => {
    assert.equal(resolveCssViewportPixels(1160, 1440, 600), 1160);
    assert.equal(resolveCssViewportPixels('80vh', 1000, 460), 800);
    assert.equal(resolveCssViewportPixels('94vw', 1000, 600), 940);
    assert.equal(resolveCssViewportPixels('680px', 1000, 600), 680);
    assert.equal(resolveCssViewportPixels('auto', 1000, 460), 460);
  });

  it('preserves saved non-zero (x, y) coordinates on split-screen viewports and keeps close/resize handles reachable', () => {
    // Regression guard: previously, fallbackWidth=1160 on a 1040px split-screen pane caused
    // Math.max(0, 1040 - Math.min(1160, 1040)) === 0, snapping saved x back to 0!
    // Now unresized modals keep their 16px safety gutter (x=16 so right-edge close/resize stays inside 1040px),
    // and modals narrower than the pane (e.g. 680px Settings or 820px resized Diff) preserve exact (x, y).
    const clampedUnresizedWide = clampModalGeometryBox(
      { x: 48, y: 64, width: null, height: null },
      {
        viewportWidth: 1040,
        viewportHeight: 900,
        minWidth: 680,
        minHeight: 460,
        fallbackWidth: 1160,
        fallbackHeight: '80vh',
      }
    );
    assert.equal(clampedUnresizedWide.x, 16);
    assert.equal(clampedUnresizedWide.y, 64);

    const clampedMedium = clampModalGeometryBox(
      { x: 48, y: 64, width: null, height: null },
      {
        viewportWidth: 1040,
        viewportHeight: 900,
        minWidth: 520,
        minHeight: 420,
        fallbackWidth: 680,
        fallbackHeight: '78vh',
      }
    );
    assert.equal(clampedMedium.x, 48);
    assert.equal(clampedMedium.y, 64);

    // Dragged + resized box fits cleanly inside split-screen viewport
    const resizedSplit = clampModalGeometryBox(
      { x: 110, y: 72, width: 820, height: 640 },
      {
        viewportWidth: 1040,
        viewportHeight: 900,
        minWidth: 680,
        minHeight: 460,
        fallbackWidth: 1160,
        fallbackHeight: '80vh',
      }
    );
    assert.equal(resizedSplit.x, 110);
    assert.equal(resizedSplit.y, 72);
    assert.equal(resizedSplit.width, 820);
    assert.equal(resizedSplit.height, 640);
  });

  it('clamps off-screen coordinates back into reachable viewport bounds', () => {
    const offscreen = clampModalGeometryBox(
      { x: 2400, y: 1800, width: 900, height: 700 },
      {
        viewportWidth: 1280,
        viewportHeight: 800,
        minWidth: 500,
        minHeight: 360,
        fallbackWidth: 900,
        fallbackHeight: 700,
      }
    );
    assert.ok(offscreen.x >= 0 && offscreen.x <= 1280 - 160);
    assert.ok(offscreen.y >= 0 && offscreen.y <= 800 - 48);
    assert.ok(offscreen.width <= 1264);
    assert.ok(offscreen.height <= 784);
  });

  it('wires reactive effectiveStorageKey watcher, featureTitleSlug fallback, real browser Window/HTMLDocument host checks, and zero raw typeof in NanoModal.vue', async () => {
    const { is } = await import('../../src/utils/type.js');
    const browserWindowLike = {
      [Symbol.toStringTag]: 'Window',
      innerWidth: 2560,
      innerHeight: 1440,
    };
    const browserDocumentLike = {
      [Symbol.toStringTag]: 'HTMLDocument',
    };

    // Real browser globals have [object Window] / [object HTMLDocument] (NOT [object Object])
    assert.equal(is(browserWindowLike, 'object'), false);
    assert.equal(is(browserWindowLike, Object), true);
    assert.equal(is(browserDocumentLike, Object), true);

    assert.ok(modalSfc.includes('extractFeatureTitleSlug'));
    assert.ok(modalSfc.includes('clampModalGeometryBox'));
    assert.ok(modalSfc.includes('watch(effectiveStorageKey'));
    assert.ok(modalSfc.includes('is(globalThis.window, Object)'));
    assert.equal(modalSfc.includes("is(globalThis.window, 'object')"), false);
    assert.equal(modalSfc.includes("is(globalThis.document, 'object')"), false);
    assert.equal(/\btypeof\b/.test(modalSfc), false, 'NanoModal.vue must not use raw typeof');
  });
});
