import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  evaluateCubicBezierEasing,
  computeFlipInvertTransform,
  interpolateMorphBox,
  shapeToPathD,
  pathToCubicBeziers,
  splitCubicBezierAt,
  resampleCubicBeziers,
  computeBezierLoopTwistCost,
  alignCubicBezierLoops,
  normalizeBezierPairForMorph,
  interpolateCubicBeziers,
  cubicBeziersToPathD,
  textToContourBeziers,
  captureCanvasFreezeSnapshot,
  createDecimatedMorphStream,
  createMorphStrategyGovernor,
} from '../../src/utils/nanoMorph.js';
import { useElementMorph } from '../../src/composables/useElementMorph.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const morphSfc = readFileSync(resolve(__dirname, '../../src/components/NanoMorph.vue'), 'utf8');

describe('NanoMorph & 3-Tier Morphing Engine (nano-morph-engine.md)', () => {
  it('converts all SVG path commands (M, L, H, V, C, S, Q, T, A, Z) and shape primitives to cubic Beziers', () => {
    const allCommandsD =
      'M 10 10 L 30 10 H 50 V 30 C 55 40, 65 40, 70 30 S 85 20, 90 30 Q 100 50, 110 30 T 130 30 A 15 15 0 0 1 150 45 Z';
    const segs = pathToCubicBeziers(allCommandsD);
    assert.ok(segs.length >= 9, `Expected >= 9 cubic segments, got ${segs.length}`);
    for (const seg of segs) {
      for (const k of ['x0', 'y0', 'cx1', 'cy1', 'cx2', 'cy2', 'x', 'y']) {
        assert.ok(Number.isFinite(seg[k]), `Non-finite ${k} in segment`);
      }
    }
    // Closed loop ends back at initial M (10, 10)
    const last = segs[segs.length - 1];
    assert.ok(Math.hypot(last.x - 10, last.y - 10) < 1e-4);

    // Primitives: circle, ellipse, rounded rect, polygon, polyline
    assert.equal(pathToCubicBeziers({ type: 'circle', cx: 50, cy: 50, r: 25 }).length, 4);
    assert.equal(pathToCubicBeziers({ type: 'ellipse', cx: 50, cy: 50, rx: 30, ry: 15 }).length, 4);
    assert.equal(
      pathToCubicBeziers({ type: 'rect', x: 0, y: 0, width: 100, height: 60, rx: 10, ry: 10 }).length,
      8
    );
    assert.equal(
      pathToCubicBeziers('<polygon points="0,0 40,0 20,30" />').length,
      3
    );
    assert.equal(
      pathToCubicBeziers({ type: 'polyline', points: [[0, 0], [10, 10], [20, 0]] }).length,
      2
    );
  });

  it('subdivides via isoparametric De Casteljau to equal N segments while preserving curve endpoints and midpoint', () => {
    const single = { x0: 0, y0: 0, cx1: 0, cy1: 40, cx2: 100, cy2: 40, x: 100, y: 0 };
    const [left, right] = splitCubicBezierAt(single, 0.5);
    assert.equal(left.x0, 0);
    assert.equal(right.x, 100);
    assert.ok(Math.abs(left.x - 50) < 1e-6);
    assert.ok(Math.abs(left.y - 30) < 1e-6);

    const triangle = pathToCubicBeziers({ type: 'polygon', points: [[0, 0], [100, 0], [50, 80]] });
    const octagon = pathToCubicBeziers({
      type: 'polygon',
      points: [
        [50, 0], [85, 15], [100, 50], [85, 85],
        [50, 100], [15, 85], [0, 50], [15, 15],
      ],
    });
    assert.equal(triangle.length, 3);
    assert.equal(octagon.length, 8);

    const resampledTri = resampleCubicBeziers(triangle, 8);
    assert.equal(resampledTri.length, 8);

    const pair = normalizeBezierPairForMorph(triangle, octagon);
    assert.equal(pair.count, 8);
    assert.equal(pair.segmentsA.length, 8);
    assert.equal(pair.segmentsB.length, 8);
  });

  it('finds optimal cyclic shift and winding alignment minimizing total squared anchor chord twist', () => {
    const square = pathToCubicBeziers(shapeToPathD({ type: 'rect', x: 0, y: 0, width: 100, height: 100 }));
    // Cyclically rotate square segments by 2 positions
    const shiftedSquare = [...square.slice(2), ...square.slice(0, 2)];

    const unalignedCost = computeBezierLoopTwistCost(square, shiftedSquare, 0);
    assert.ok(unalignedCost > 1000);

    const aligned = alignCubicBezierLoops(square, shiftedSquare);
    assert.ok(aligned.cost < 1e-6, `Expected ~0 twist cost after cyclic shift, got ${aligned.cost}`);

    const mid = interpolateCubicBeziers(aligned.segmentsA, aligned.segmentsB, 0.5);
    const d = cubicBeziersToPathD(mid, true);
    assert.ok(d.startsWith('M '));
    assert.ok(d.endsWith('Z'));
  });

  it('generates deterministic closed cubic Bezier contours for text strings via textToContourBeziers', () => {
    const ai = textToContourBeziers('AI', { width: 200, height: 80, fontWeight: 500, targetFontWeight: 800, progress: 0.5 });
    const ok = textToContourBeziers('OK', { width: 200, height: 80 });
    assert.ok(ai.segments.length >= 6);
    assert.ok(ok.segments.length >= 6);
    assert.equal(ai.fontVariationSettings, "'wght' 650");

    const pair = normalizeBezierPairForMorph(ai.segments, ok.segments);
    assert.equal(pair.segmentsA.length, pair.segmentsB.length);
  });

  it('computes Tier 1 FLIP box interpolation and cubic-bezier easing accurately', () => {
    assert.equal(evaluateCubicBezierEasing(0), 0);
    assert.equal(evaluateCubicBezierEasing(1), 1);
    const half = evaluateCubicBezierEasing(0.5, 'cubic-bezier(0.4, 0, 0.2, 1)');
    assert.ok(half > 0.6 && half < 0.9);

    const flip = computeFlipInvertTransform(
      { x: 20, y: 10, width: 120, height: 36 },
      { x: 220, y: 110, width: 480, height: 288 }
    );
    assert.equal(flip.dx, -200);
    assert.equal(flip.dy, -100);
    assert.equal(flip.scaleX, 0.25);

    const midBox = interpolateMorphBox(
      { x: 0, y: 0, width: 100, height: 40, borderRadius: 20 },
      { x: 200, y: 100, width: 400, height: 240, borderRadius: 12 },
      0.5
    );
    assert.equal(midBox.x, 100);
    assert.equal(midBox.y, 50);
    assert.equal(midBox.width, 250);
    assert.equal(midBox.borderRadius, 16);
  });

  it('implements Strategy 3A (Snapshot Freeze) and Strategy 3B (Decimated OffscreenCanvas Worker + Fallback)', async () => {
    let closedCount = 0;
    const snapBitmap = await captureCanvasFreezeSnapshot(
      { width: 320, height: 180 },
      {
        createImageBitmap: async () => ({
          width: 320,
          height: 180,
          close() {
            closedCount += 1;
          },
        }),
      }
    );
    assert.equal(snapBitmap.kind, 'bitmap');
    snapBitmap.release();
    assert.equal(closedCount, 1);

    const snapDataUrl = await captureCanvasFreezeSnapshot(
      {
        width: 200,
        height: 100,
        toDataURL: () => 'data:image/png;base64,AAAA',
      },
      { createImageBitmap: null }
    );
    assert.equal(snapDataUrl.kind, 'data-url');
    assert.equal(snapDataUrl.dataUrl, 'data:image/png;base64,AAAA');

    // Strategy 3B Decimated OffscreenCanvas stream (k = 3, 0.5x DPR)
    const workerMessages = [];
    class FakeOffscreen {
      constructor(w, h) {
        this.width = w;
        this.height = h;
      }
      getContext() {
        return {};
      }
      transferToImageBitmap() {
        return { width: this.width, height: this.height, close() {} };
      }
    }

    const stream = createDecimatedMorphStream({
      width: 400,
      height: 200,
      devicePixelRatio: 2,
      dprScale: 0.5,
      frameStride: 3,
      OffscreenCanvas: FakeOffscreen,
      createWorker: () => ({
        postMessage: (msg) => workerMessages.push(msg),
        terminate() {},
      }),
    });

    const f0 = stream.stepFrame(0, 0);
    const f1 = stream.stepFrame(1, 0.33);
    const f2 = stream.stepFrame(2, 0.66);
    const f3 = stream.stepFrame(3, 1);

    assert.equal(f0.updated, true);
    assert.equal(f1.updated, false);
    assert.equal(f2.updated, false);
    assert.equal(f3.updated, true);
    assert.equal(workerMessages.length, 2);
    assert.equal(stream.getStats().scaledWidth, 400); // 400 * 2 * 0.5
    stream.stop();
  });

  it('selects live-60fps (<4ms), kinetic-worker (4–12ms), and freeze (>12ms or reduced-motion) via Adaptive Governor', async () => {
    const gov = createMorphStrategyGovernor({
      env: { navigator: { hardwareConcurrency: 8, deviceMemory: 16 } },
    });

    assert.equal(gov.evaluate(2.4).strategy, 'live-60fps');
    const mid = gov.evaluate(7.5);
    assert.equal(mid.strategy, 'kinetic-worker');
    assert.equal(mid.frameStride, 2);
    assert.equal(mid.dprScale, 0.5);

    const heavyMid = gov.evaluate(10.5);
    assert.equal(heavyMid.strategy, 'kinetic-worker');
    assert.equal(heavyMid.frameStride, 3);

    assert.equal(gov.evaluate(15.2).strategy, 'freeze');

    const reducedGov = createMorphStrategyGovernor({
      env: {
        matchMedia: () => ({ matches: true }),
      },
    });
    const reducedDecision = reducedGov.evaluate(1.5);
    assert.equal(reducedDecision.strategy, 'freeze');
    assert.equal(reducedDecision.instant, true);

    // Composable completes immediately in SSR / reduced-motion without hanging on transitionend
    const morph = useElementMorph({
      duration: 340,
      env: { matchMedia: () => ({ matches: true }) },
    });
    const res = await morph.runMorphTransition({
      vectorConfig: { fromText: 'AI', toText: 'OK', width: 160, height: 64 },
    });
    assert.equal(res.completed, true);
    assert.equal(res.instant, true);
    assert.ok(morph.currentPathD.value.startsWith('M '));

    assert.ok(morphSfc.includes('nano-morph-portal-ghost'));
    assert.ok(morphSfc.includes('position: fixed;'));
    assert.ok(morphSfc.includes('z-index: 9999;'));
    assert.ok(morphSfc.includes('pointer-events: none;'));
  });
});
