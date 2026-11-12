import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveCollapsibleConfig,
  evaluateSplitterSnapCollapse,
  computeVirtualCollapsedPaneStyles,
  resolveSplitterHitboxSizePx,
  computeSplitterProximityField,
} from '../../src/utils/splitterCollapse.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('NanoSplitter Ergonomic Hitbox & 1D Voronoi Proximity Field (splitterCollapse.js)', () => {
  it('enforces a minimum 28px ergonomic capture band (±14px around splitter axis) regardless of narrow visual gap', () => {
    assert.strictEqual(resolveSplitterHitboxSizePx(10, 28), 28);
    assert.strictEqual(resolveSplitterHitboxSizePx(6, 28), 28);
    assert.strictEqual(resolveSplitterHitboxSizePx(32, 28), 32);
  });

  it('computes 1D Voronoi distance field and proximity halo ratio around the splitter axis', () => {
    const center = computeSplitterProximityField({
      pointerCoordPx: 250,
      splitterCenterCoordPx: 250,
      hitboxSizePx: 28,
      proximityRadiusPx: 36,
    });
    assert.strictEqual(center.distancePx, 0);
    assert.strictEqual(center.inCaptureCell, true);
    assert.strictEqual(center.inProximityHalo, true);
    assert.strictEqual(center.proximityRatio, 1);

    const edgeOfCapture = computeSplitterProximityField({
      pointerCoordPx: 263,
      splitterCenterCoordPx: 250,
      hitboxSizePx: 28,
      proximityRadiusPx: 36,
    });
    assert.strictEqual(edgeOfCapture.distancePx, 13);
    assert.strictEqual(edgeOfCapture.inCaptureCell, true);
    assert.strictEqual(edgeOfCapture.inProximityHalo, true);
    assert.ok(edgeOfCapture.proximityRatio > 0.6);

    const inHaloOnly = computeSplitterProximityField({
      pointerCoordPx: 274,
      splitterCenterCoordPx: 250,
      hitboxSizePx: 28,
      proximityRadiusPx: 36,
    });
    assert.strictEqual(inHaloOnly.distancePx, 24);
    assert.strictEqual(inHaloOnly.inCaptureCell, false);
    assert.strictEqual(inHaloOnly.inProximityHalo, true);
    assert.ok(inHaloOnly.proximityRatio > 0.3);

    const outsideHalo = computeSplitterProximityField({
      pointerCoordPx: 310,
      splitterCenterCoordPx: 250,
      hitboxSizePx: 28,
      proximityRadiusPx: 36,
    });
    assert.strictEqual(outsideHalo.inCaptureCell, false);
    assert.strictEqual(outsideHalo.inProximityHalo, false);
    assert.strictEqual(outsideHalo.proximityRatio, 0);
  });

  it('evaluates snap-collapse and uncollapse hysteresis cleanly', () => {
    const cfg = resolveCollapsibleConfig(true);
    assert.deepEqual(cfg, { enabled: true, allowFirst: true, allowSecond: true });

    const styles = computeVirtualCollapsedPaneStyles({
      orientation: 'vertical',
      collapsedPane: 'second',
      collapsedSizePx: 38,
      expandedFirstBasis: '255px',
    });
    assert.strictEqual(styles.isSecondCollapsed, true);
    assert.strictEqual(styles.secondPaneStyle.height, '38px');

    const snappedSecond = evaluateSplitterSnapCollapse({
      pointerOffsetPx: 460,
      usableSpanPx: 500,
      minFirstPx: 90,
      maxFirstPx: 405,
      collapseThresholdPx: 28,
      collapsedSizePx: 38,
      allowFirst: true,
      allowSecond: true,
    });
    assert.strictEqual(snappedSecond.collapsedPane, 'second');
    assert.strictEqual(snappedSecond.snapped, true);
  });

  it('prevents synchronous v-model:collapsed-pane stale-prop persistence race in NanoSplitter.vue', () => {
    const sfcPath = path.resolve(__dirname, '../../src/components/NanoSplitter.vue');
    const sfc = fs.readFileSync(sfcPath, 'utf8');

    // activeCollapsedPane, currentSize, and isLocked must read synchronous internal refs
    // rather than stale pre-flush props so expandCollapsedPane() immediately persists `collapsedPane: null`
    assert.ok(
      !sfc.includes('props.collapsedPane !== undefined ? props.collapsedPane : internalCollapsedPane.value'),
      'activeCollapsedPane must not read stale pre-tick props.collapsedPane ahead of internalCollapsedPane'
    );
    assert.ok(sfc.includes('persistState({ size: restored, collapsedPane: null })'));
    assert.ok(sfc.includes('persistState({ collapsedPane: normalized })'));
    assert.ok(sfc.includes('expandPane: expandCollapsedPane'));
  });
});
