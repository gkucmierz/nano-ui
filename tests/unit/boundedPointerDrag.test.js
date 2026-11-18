import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BOUNDED_DRAG_BOUNDARY_ATTR,
  resolveHighestDragBoundary,
  projectPointerToBox,
  clipSegmentToUnitBox,
  createBoundedPointerDrag,
} from '../../src/utils/boundedPointerDrag.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

function createMockEventTarget(props = {}) {
  const listeners = new Map();
  const attrs = new Map(Object.entries(props.attrs || {}));
  const node = {
    nodeType: props.nodeType ?? 1,
    parentNode: props.parentNode ?? null,
    ownerDocument: props.ownerDocument ?? null,
    defaultView: props.defaultView ?? null,
    fullscreenElement: props.fullscreenElement ?? null,
    mode: props.mode ?? undefined,
    host: props.host ?? null,
    className: props.className ?? '',
    addEventListener(type, fn) {
      const list = listeners.get(type) || [];
      list.push(fn);
      listeners.set(type, list);
    },
    removeEventListener(type, fn) {
      const list = listeners.get(type) || [];
      listeners.set(
        type,
        list.filter((h) => h !== fn)
      );
    },
    dispatch(type, eventInit = {}) {
      const list = [...(listeners.get(type) || [])];
      const evt = {
        type,
        target: eventInit.target ?? node,
        currentTarget: node,
        pointerId: 7,
        button: 0,
        buttons: 1,
        pointerType: 'mouse',
        ...eventInit,
      };
      for (const fn of list) {
        fn(evt);
      }
      return evt;
    },
    listenerCount(type) {
      return (listeners.get(type) || []).length;
    },
    getAttribute(name) {
      return attrs.has(name) ? attrs.get(name) : null;
    },
    matches(selector) {
      if (selector.includes('.nano-sim-viewport') && node.className.includes('nano-sim-viewport')) {
        return true;
      }
      if (selector.includes(`[${BOUNDED_DRAG_BOUNDARY_ATTR}]`) && attrs.has(BOUNDED_DRAG_BOUNDARY_ATTR)) {
        return true;
      }
      return false;
    },
    contains(other) {
      let cur = other;
      while (cur) {
        if (cur === node) return true;
        cur = cur.parentNode;
      }
      return false;
    },
    getBoundingClientRect() {
      return props.rect || { left: 100, top: 50, width: 200, height: 100 };
    },
  };
  return node;
}

describe('BOUNDED-DRAG-01 — resolveHighestDragBoundary & createBoundedPointerDrag', () => {
  it('resolves highest reachable abstraction boundary across simulated viewports, fullscreen hosts, shadow roots, iframes, and detached trees', () => {
    // 1. Standard document -> climbs to ownerDocument.defaultView (iframe-safe, never global window)
    const mockWin = createMockEventTarget({ nodeType: 0 });
    const mockDoc = createMockEventTarget({ nodeType: 9, defaultView: mockWin });
    const card = createMockEventTarget({ parentNode: mockDoc, ownerDocument: mockDoc });
    const canvas = createMockEventTarget({ parentNode: card, ownerDocument: mockDoc });

    const resWin = resolveHighestDragBoundary(canvas);
    assert.equal(resWin.target, mockWin);
    assert.equal(resWin.kind, 'owner-window');

    // 2. Emulated container above element (.nano-sim-viewport / data-nano-drag-boundary) stops at simulated host!
    const simViewport = createMockEventTarget({
      parentNode: mockDoc,
      ownerDocument: mockDoc,
      className: 'nano-sim-viewport',
    });
    const innerStage = createMockEventTarget({ parentNode: simViewport, ownerDocument: mockDoc });
    const resSim = resolveHighestDragBoundary(innerStage);
    assert.equal(resSim.target, simViewport);
    assert.equal(resSim.kind, 'isolated-boundary');

    // 3. Explicit data-nano-drag-boundary attribute stops at boundary unless set to "passthrough"
    const attrBoundary = createMockEventTarget({
      parentNode: mockDoc,
      ownerDocument: mockDoc,
      attrs: { [BOUNDED_DRAG_BOUNDARY_ATTR]: 'contain' },
    });
    const childInAttr = createMockEventTarget({ parentNode: attrBoundary, ownerDocument: mockDoc });
    assert.equal(resolveHighestDragBoundary(childInAttr).target, attrBoundary);
    assert.equal(resolveHighestDragBoundary(childInAttr).kind, 'isolated-boundary');

    // 4. Fullscreen host containing originEl stops at fullscreenElement
    const fsStage = createMockEventTarget({ parentNode: mockDoc, ownerDocument: mockDoc });
    mockDoc.fullscreenElement = fsStage;
    const fsCanvas = createMockEventTarget({ parentNode: fsStage, ownerDocument: mockDoc });
    const resFs = resolveHighestDragBoundary(fsCanvas);
    assert.equal(resFs.target, fsStage);
    assert.equal(resFs.kind, 'fullscreen-host');
    mockDoc.fullscreenElement = null;

    // 5. Detached / synthetic DOM tree without Document climbs to highest parentNode with addEventListener
    const detachedRoot = createMockEventTarget();
    const detachedMid = createMockEventTarget({ parentNode: detachedRoot });
    const detachedLeaf = createMockEventTarget({ parentNode: detachedMid });
    const resDetached = resolveHighestDragBoundary(detachedLeaf);
    assert.equal(resDetached.target, detachedRoot);
    assert.equal(resDetached.kind, 'subtree-root');

    // 6. Closed ShadowRoot stops at ShadowRoot boundary
    const closedShadow = createMockEventTarget({ nodeType: 11, mode: 'closed', host: card });
    const shadowLeaf = createMockEventTarget({ parentNode: closedShadow });
    const resShadow = resolveHighestDragBoundary(shadowLeaf);
    assert.equal(resShadow.target, closedShadow);
    assert.equal(resShadow.kind, 'shadow-root');
  });

  it('computes exact Liang-Barsky unit-box intersections and normalized projections', () => {
    const projInside = projectPointerToBox(200, 100, { left: 100, top: 50, width: 200, height: 100 });
    assert.equal(projInside.isInside, true);
    assert.equal(projInside.rawX, 0.5);
    assert.equal(projInside.rawY, 0.5);

    const projOutside = projectPointerToBox(350, 20, { left: 100, top: 50, width: 200, height: 100 });
    assert.equal(projOutside.isInside, false);
    assert.equal(projOutside.rawX, 1.25);
    assert.equal(projOutside.rawY, -0.3);
    assert.equal(projOutside.clampedX, 1);
    assert.equal(projOutside.clampedY, 0);

    // Segment from center (0.5, 0.5) exiting right border at (1.5, 0.5) -> exit must be (1.0, 0.5)
    const clipRight = clipSegmentToUnitBox(0.5, 0.5, 1.5, 0.5);
    assert.ok(clipRight);
    assert.ok(Math.abs(clipRight.exitX - 1.0) < 1e-9);
    assert.ok(Math.abs(clipRight.exitY - 0.5) < 1e-9);

    // Segment completely outside above top border (-0.5, -0.4) -> (1.5, -0.4) -> null
    assert.equal(clipSegmentToUnitBox(-0.5, -0.4, 1.5, -0.4), null);
  });

  it('keeps painting loop unbroken when cursor leaves heatmap bounds and seamlessly resumes on re-entry (edge-pause)', () => {
    const simStage = createMockEventTarget({ className: 'nano-sim-viewport' });
    const heatmapBox = createMockEventTarget({
      parentNode: simStage,
      rect: { left: 100, top: 100, width: 200, height: 100 },
    });

    const samples = [];
    let endCount = 0;

    const drag = createBoundedPointerDrag({
      outOfBoundsMode: 'edge-pause',
      getElement: () => heatmapBox,
      onMove(sample) {
        samples.push({
          x: Number(sample.x.toFixed(3)),
          y: Number(sample.y.toFixed(3)),
          clippedEdge: sample.clippedEdge,
        });
      },
      onEnd() {
        endCount += 1;
      },
    });

    // 1. Pointerdown inside heatmap at (200, 150) -> normalized (0.5, 0.5)
    const started = drag.onPointerDown({
      target: heatmapBox,
      currentTarget: heatmapBox,
      pointerId: 11,
      button: 0,
      buttons: 1,
      pointerType: 'mouse',
      clientX: 200,
      clientY: 150,
    });
    assert.equal(started, true);
    assert.equal(drag.isDragging(), true);
    assert.equal(drag.getBoundaryTarget(), simStage);
    assert.equal(samples.length, 1);
    assert.deepEqual(samples[0], { x: 0.5, y: 0.5, clippedEdge: false });

    // 2. Drag exits right border to (350, 150) -> rawX = 1.25; emits 1 clipped exit point (1.0, 0.5) & stays active!
    simStage.dispatch('pointermove', { pointerId: 11, buttons: 1, clientX: 350, clientY: 150 });
    assert.equal(drag.isDragging(), true, 'Leaving heatmap box must NOT break the drag loop');
    assert.equal(samples.length, 2);
    assert.deepEqual(samples[1], { x: 1, y: 0.5, clippedEdge: true });

    // 3. Wander around outside box (360, 40) -> (180, 40): zero border-smear samples emitted, loop STILL alive!
    simStage.dispatch('pointermove', { pointerId: 11, buttons: 1, clientX: 360, clientY: 40 });
    simStage.dispatch('pointermove', { pointerId: 11, buttons: 1, clientX: 180, clientY: 40 });
    assert.equal(drag.isDragging(), true);
    assert.equal(samples.length, 2, 'Wandering outside must pause point emission without ending session');

    // 4. Re-enter box from top (180, 40) -> (180, 140) [norm (0.4, 0.4)] with button still pressed: resumes immediately!
    simStage.dispatch('pointermove', { pointerId: 11, buttons: 1, clientX: 180, clientY: 140 });
    assert.equal(drag.isDragging(), true);
    assert.equal(samples.length, 4); // clipped top-border entry (0.4, 0) + interior sample (0.4, 0.4)
    assert.deepEqual(samples[2], { x: 0.4, y: 0, clippedEdge: true });
    assert.deepEqual(samples[3], { x: 0.4, y: 0.4, clippedEdge: false });

    // 5. Release pointer outside box -> cleanly tears down boundary listeners
    simStage.dispatch('pointerup', { pointerId: 11, buttons: 0, clientX: 50, clientY: 50 });
    assert.equal(drag.isDragging(), false);
    assert.equal(endCount, 1);
    assert.equal(simStage.listenerCount('pointermove'), 0);
    assert.equal(simStage.listenerCount('pointerup'), 0);
  });

  it('wires NanoHeatmap interactive mode & HeatmapDoc without @pointerleave loop-breaking handlers', () => {
    const heatmapSrc = fs.readFileSync(path.join(rootDir, 'src/components/NanoHeatmap.vue'), 'utf8');
    const docSrc = fs.readFileSync(path.join(rootDir, 'src/playground/docs/HeatmapDoc.vue'), 'utf8');

    assert.ok(heatmapSrc.includes('useBoundedPointerDrag'), 'NanoHeatmap must use useBoundedPointerDrag');
    assert.ok(heatmapSrc.includes("outOfBoundsMode: 'edge-pause'"), 'NanoHeatmap must use edge-pause out-of-bounds mode');
    assert.equal(docSrc.includes('@pointerleave'), false, 'HeatmapDoc must never terminate drag on @pointerleave');
    assert.ok(docSrc.includes('v-model:points="densityPoints"'), 'HeatmapDoc must bind v-model:points on interactive NanoHeatmap');
  });
});
