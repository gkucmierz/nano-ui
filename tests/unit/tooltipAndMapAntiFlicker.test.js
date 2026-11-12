import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTooltipBubbleGeometry, computeTightTooltipWidth } from '../../src/utils/tooltipGeometry.js';
import {
  DEFAULT_MAP_LAYERS,
  buildVisibleTileGrid,
  projectRetainedTilesToViewport,
} from '../../src/utils/map-engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

describe('GlobalTooltip unified C¹ speech-bubble geometry & NanoMap zero-flicker tile retention', () => {
  test('buildTooltipBubbleGeometry generates a single closed contour with ZERO horizontal base line under the arrow (above target / bottom arrow)', () => {
    const geom = buildTooltipBubbleGeometry({
      width: 200,
      height: 40,
      radius: 9,
      arrowX: 0,
      arrowHalfWidth: 6.5,
      arrowHeight: 6,
      isBottom: false,
      pad: 8,
    });

    assert.equal(geom.pad, 8);
    assert.equal(geom.svgWidth, 216);
    assert.equal(geom.svgHeight, 56);
    assert.equal(geom.viewBox, '-8 -8 216 56');
    assert.equal(geom.arrowCenterX, 100);
    assert.equal(geom.clampedArrowX, 0);

    // Must start with M and end with Z (single closed perimeter path)
    assert.match(geom.svgPathD, /^M\s+[\d.-]+\s+0\.5\b.*Z$/);
    assert.match(geom.clipPathD, /^M\s+[\d.-]+\s+8\.5\b.*Z$/);

    // Bottom edge is at y1 = 39.5; the arrow tip protrudes down to y = 39.5 + 6 = 45.5.
    // Verify the path visits the protruding arrow apex (y > 43) and NEVER draws a straight
    // uninterrupted horizontal line directly from x1-r (190.5) to x0+r (9.5) at y = 39.5!
    assert.ok(!geom.svgPathD.includes('A 9 9 0 0 1 190.5 39.5 L 9.5 39.5'));
    assert.match(geom.svgPathD, /Q 100 45\.5/);
  });

  test('buildTooltipBubbleGeometry integrates UP-pointing arrow seamlessly on top edge when isBottom = true and clamps extreme arrowX offsets', () => {
    const geom = buildTooltipBubbleGeometry({
      width: 180,
      height: 36,
      radius: 9,
      arrowX: 500, // extreme right offset -> must clamp inside flat horizontal edge before corner arc
      arrowHalfWidth: 6.5,
      arrowHeight: 6,
      isBottom: true,
      pad: 8,
    });

    // Max safe center: x1 (179.5) - r (9) - aw (6.5) - shoulderR (1) - 1 = 162
    assert.equal(geom.arrowCenterX, 162);
    assert.equal(geom.clampedArrowX, 72);
    // Top edge is at y0 = 0.5; UP-pointing arrow apex is at y = 0.5 - 6 = -5.5
    assert.match(geom.svgPathD, /Q 162 -5\.5/);
    // Bottom edge should remain a clean flat line at y = 35.5 with no second arrow
    assert.ok(geom.svgPathD.includes('A 9 9 0 0 1 170.5 35.5 L 9.5 35.5'));
  });

  test('GlobalTooltip.vue uses unified SVG speech-bubble + glass clip-path, post-wrap glyph shrink-fit, and inverted non-dazzling dark/light polarity', () => {
    const vueSrc = fs.readFileSync(path.join(ROOT, 'src/components/GlobalTooltip.vue'), 'utf8');
    const colorsSrc = fs.readFileSync(path.join(ROOT, 'src/assets/colors.css'), 'utf8');
    assert.ok(vueSrc.includes('buildTooltipBubbleGeometry'));
    assert.ok(vueSrc.includes('computeTightTooltipWidth'));
    assert.ok(vueSrc.includes('global-tooltip-bubble-svg'));
    assert.ok(vueSrc.includes('global-tooltip-glass'));
    assert.ok(!vueSrc.includes('.global-tooltip::after'), 'Legacy ::after seam square must be removed');
    assert.ok(!/\btypeof\b/.test(vueSrc), 'GlobalTooltip.vue must not use raw type operator');

    // Verify computeTightTooltipWidth eliminates dead side margins when text-wrap: balance splits text
    assert.equal(
      computeTightTooltipWidth({ naturalWidth: 260, glyphWidth: 168.2, padLeft: 10, padRight: 10 }),
      190
    );
    // When natural width already hugs glyphs tightly, return null (no redundant inline width)
    assert.equal(
      computeTightTooltipWidth({ naturalWidth: 190, glyphWidth: 168.2, padLeft: 10, padRight: 10 }),
      null
    );

    // Dark theme uses non-dazzling soft pearl-slate (#e2e8f0 / rgba(226, 232, 240, 0.96)) with dark #0f172a ink
    assert.ok(colorsSrc.includes('--nano-tooltip-bg: rgba(226, 232, 240, 0.96);'));
    assert.ok(colorsSrc.includes('--nano-tooltip-color: #0f172a;'));
    // Light theme uses deep slate (#0f172a / rgba(15, 23, 42, 0.96)) with crisp #f8fafc ink
    assert.ok(colorsSrc.includes('--nano-tooltip-bg: rgba(15, 23, 42, 0.96);'));
    assert.ok(colorsSrc.includes('--nano-tooltip-padding: 5px 10px;'));
    assert.ok(colorsSrc.includes('--nano-tooltip-max-width: 260px;'));
  });

  test('projectRetainedTilesToViewport re-projects decoded tiles across zoom/tab jumps without blank canvas flicker', () => {
    const silesiaGrid = buildVisibleTileGrid({
      centerLat: 50.2832,
      centerLon: 19.1041,
      zoom: 13.4,
      width: 640,
      height: 460,
      layer: DEFAULT_MAP_LAYERS[0],
    });
    assert.ok(silesiaGrid.tiles.length > 0);
    assert.equal(silesiaGrid.tiles[0].layerId, 'osm-dark');

    // Switch tab from z=13.4 (Silesia) to z=9.4 (Regional overview): previously loaded z=13 tiles project cleanly into the z=9.4 viewport
    const retainedAtRegional = projectRetainedTilesToViewport(silesiaGrid.tiles, {
      centerLat: 50.2832,
      centerLon: 19.1041,
      zoom: 9.4,
      width: 640,
      height: 460,
      layerId: 'osm-dark',
      activeTileZoom: 9,
    });
    assert.ok(retainedAtRegional.length > 0, 'Retained tiles should cover center of zoomed-out viewport');
    assert.ok(retainedAtRegional.every((t) => t.key.startsWith('retained-') && t.size > 0));

    // Switching to a different layerId should NOT bleed mismatched layer imagery
    const mismatchedLayer = projectRetainedTilesToViewport(silesiaGrid.tiles, {
      centerLat: 50.2832,
      centerLon: 19.1041,
      zoom: 9.4,
      width: 640,
      height: 460,
      layerId: 'esri-satellite',
      activeTileZoom: 9,
    });
    assert.equal(mismatchedLayer.length, 0);
  });

  test('fillHeight.js performs synchronous pre-paint measurement inside onMounted before nextTick', () => {
    const fillHeightSrc = fs.readFileSync(path.join(ROOT, 'src/utils/fillHeight.js'), 'utf8');
    assert.match(fillHeightSrc, /onMounted\(\(\)\s*=>\s*\{\s*updateHeight\(\);\s*nextTick/);
  });
});
