import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  shouldPreventModalBackgroundScroll,
  lockModalBackgroundScroll,
  unlockModalBackgroundScroll,
  getActiveModalScrollLockCount,
  resetModalScrollLocks,
} from '../../src/utils/modalScrollLock.js';
import {
  computeBoundedCenterScroll,
  computeCenteredScrollLeft,
  computeCenteredScrollTop,
  computeBoundedCenterScroll2D,
  scrollElementToBoundedCenter,
} from '../../src/utils/boundedCenterScroll.js';
import {
  computeAvailableFillHeight,
  resolveFillHeightBoundary,
  measureElementFillHeight,
} from '../../src/utils/fillHeight.js';
import {
  resolveCollapsibleConfig,
  evaluateSplitterSnapCollapse,
  computeVirtualCollapsedPaneStyles,
} from '../../src/utils/splitterCollapse.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const createMockElement = ({
  tagName = 'DIV',
  classes = [],
  scrollTop = 0,
  clientHeight = 100,
  scrollHeight = 100,
  scrollLeft = 0,
  clientWidth = 100,
  scrollWidth = 100,
  overflowY = 'visible',
  overflowX = 'visible',
  parentNode = null,
} = {}) => ({
  nodeType: 1,
  tagName,
  parentNode,
  scrollTop,
  clientHeight,
  scrollHeight,
  scrollLeft,
  clientWidth,
  scrollWidth,
  style: {
    overflowY,
    overflowX,
    overflow: overflowY,
  },
  classList: {
    contains: (cls) => classes.includes(cls),
  },
});

describe('Zero-CLS Modal Scroll Lock (modalScrollLock.js)', () => {
  beforeEach(() => {
    resetModalScrollLocks();
  });

  it('tracks reference-counted modal locks without setting document.body.style.overflow = hidden', () => {
    const tokenA = Symbol('modal-a');
    const tokenB = Symbol('modal-b');

    assert.equal(getActiveModalScrollLockCount(), 0);
    assert.equal(lockModalBackgroundScroll(tokenA), 1);
    assert.equal(lockModalBackgroundScroll(tokenB), 2);
    assert.equal(unlockModalBackgroundScroll(tokenA), 1);
    assert.equal(unlockModalBackgroundScroll(tokenB), 0);

    const modalVueSource = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/NanoModal.vue'),
      'utf8'
    );
    assert.equal(
      modalVueSource.includes("document.body.style.overflow = 'hidden'"),
      false,
      'NanoModal.vue must not hide body overflow (prevents ~15px scrollbar disappearance CLS jump)'
    );
    assert.equal(
      modalVueSource.includes('lockModalBackgroundScroll'),
      true,
      'NanoModal.vue must use lockModalBackgroundScroll'
    );
  });

  it('prevents wheel and touchmove events on the modal backdrop outside .nano-modal-window', () => {
    const overlayEl = createMockElement({ classes: ['nano-modal-overlay'] });
    assert.equal(
      shouldPreventModalBackgroundScroll({
        type: 'wheel',
        target: overlayEl,
        deltaY: 120,
      }),
      true
    );
    assert.equal(
      shouldPreventModalBackgroundScroll({
        type: 'touchmove',
        target: overlayEl,
        deltaY: 40,
      }),
      true
    );
  });

  it('allows wheel scrolling inside a scrollable .nano-modal-body when scroll room remains, and blocks overscroll at top/bottom boundaries', () => {
    const modalWindow = createMockElement({ classes: ['nano-modal-window'] });
    const modalBody = createMockElement({
      classes: ['nano-modal-body'],
      parentNode: modalWindow,
      overflowY: 'auto',
      scrollTop: 50,
      clientHeight: 200,
      scrollHeight: 600,
    });
    const innerParagraph = createMockElement({
      tagName: 'P',
      parentNode: modalBody,
    });

    // Scrolling down or up when in the middle (scrollTop = 50) is allowed
    assert.equal(
      shouldPreventModalBackgroundScroll({
        type: 'wheel',
        target: innerParagraph,
        deltaY: 80,
      }),
      false
    );
    assert.equal(
      shouldPreventModalBackgroundScroll({
        type: 'wheel',
        target: innerParagraph,
        deltaY: -80,
      }),
      false
    );

    // At top boundary (scrollTop = 0), scrolling up (-deltaY) is blocked to prevent background page scroll chaining
    modalBody.scrollTop = 0;
    assert.equal(
      shouldPreventModalBackgroundScroll({
        type: 'wheel',
        target: innerParagraph,
        deltaY: -60,
      }),
      true
    );
    assert.equal(
      shouldPreventModalBackgroundScroll({
        type: 'wheel',
        target: innerParagraph,
        deltaY: 60,
      }),
      false
    );

    // At bottom boundary (scrollTop = 400), scrolling down (+deltaY) is blocked
    modalBody.scrollTop = 400;
    assert.equal(
      shouldPreventModalBackgroundScroll({
        type: 'wheel',
        target: innerParagraph,
        deltaY: 60,
      }),
      true
    );
  });

  it('allows keyboard navigation inside form controls while blocking background page scroll keys on non-scrollable modals', () => {
    const modalWindow = createMockElement({ classes: ['nano-modal-window'] });
    const inputEl = createMockElement({
      tagName: 'INPUT',
      parentNode: modalWindow,
    });
    const plainDiv = createMockElement({
      tagName: 'DIV',
      parentNode: modalWindow,
    });

    assert.equal(
      shouldPreventModalBackgroundScroll({
        type: 'keydown',
        key: 'ArrowDown',
        target: inputEl,
      }),
      false
    );
    assert.equal(
      shouldPreventModalBackgroundScroll({
        type: 'keydown',
        key: 'PageDown',
        target: plainDiv,
      }),
      true
    );

    // Non-scroll global shortcut keys (e.g. 't', 'l', '?', 'Escape', 'ArrowLeft') on `.nano-modal-overlay`
    // or `document.body` must NEVER be marked defaultPrevented by the scroll guard so @gkucmierz/key-controller
    // can bubble them to the application root (e.g. toggling theme with 'T' while /ai-graph modal is open).
    const overlayBackdrop = createMockElement({ classes: ['nano-modal-overlay'] });
    assert.equal(
      shouldPreventModalBackgroundScroll({
        type: 'keydown',
        key: 't',
        target: overlayBackdrop,
      }),
      false
    );
    assert.equal(
      shouldPreventModalBackgroundScroll({
        type: 'keydown',
        key: 'T',
        target: overlayBackdrop,
      }),
      false
    );
    assert.equal(
      shouldPreventModalBackgroundScroll({
        type: 'keydown',
        key: '?',
        target: overlayBackdrop,
      }),
      false
    );
  });
});

describe('1D & 2D Bounded-Center Scroll Engine (boundedCenterScroll.js)', () => {
  it('centers items along X (trip-hub filmstrip) and Y (dashboard-app thought stream) while respecting [0, maxScroll] boundaries', () => {
    // 1. Item near top/start boundary -> clamped to 0
    assert.equal(
      computeCenteredScrollTop({
        containerHeight: 400,
        scrollHeight: 1200,
        itemOffsetTop: 30,
        itemHeight: 60,
      }),
      0
    );

    // 2. Item in the middle -> centered at itemTop - containerHeight/2 + itemHeight/2 = 500 - 200 + 30 = 330
    assert.equal(
      computeCenteredScrollTop({
        containerHeight: 400,
        scrollHeight: 1200,
        itemOffsetTop: 500,
        itemHeight: 60,
      }),
      330
    );

    // 3. Item near bottom/end boundary -> clamped to maxScroll = 1200 - 400 = 800
    assert.equal(
      computeCenteredScrollTop({
        containerHeight: 400,
        scrollHeight: 1200,
        itemOffsetTop: 1120,
        itemHeight: 60,
      }),
      800
    );

    // 4. Horizontal filmstrip centering with containerOffsetLeft
    assert.equal(
      computeCenteredScrollLeft({
        containerWidth: 600,
        scrollWidth: 2000,
        itemOffsetLeft: 950,
        itemWidth: 100,
        containerOffsetLeft: 50,
      }),
      650
    );

    // 5. 2D simultaneous centering
    const pos2d = computeBoundedCenterScroll2D({
      containerWidth: 500,
      containerHeight: 300,
      scrollWidth: 1500,
      scrollHeight: 1000,
      itemOffsetLeft: 700,
      itemOffsetTop: 450,
      itemWidth: 100,
      itemHeight: 50,
    });
    assert.deepEqual(pos2d, { left: 500, top: 325 });
  });

  it('scrolls a DOM container to bounded center using getBoundingClientRect geometry without calling scrollIntoView', () => {
    let scrollIntoViewCalled = false;
    const containerEl = {
      clientWidth: 360,
      clientHeight: 400,
      scrollWidth: 360,
      scrollHeight: 1000,
      scrollLeft: 0,
      scrollTop: 100,
      getBoundingClientRect: () => ({ left: 20, top: 80, width: 360, height: 400 }),
    };
    const targetEl = {
      offsetWidth: 340,
      offsetHeight: 80,
      // Currently 420px below container viewport top -> absolute scroll offset = 420 + 100 = 520
      getBoundingClientRect: () => ({ left: 20, top: 500, width: 340, height: 80 }),
      scrollIntoView: () => {
        scrollIntoViewCalled = true;
      },
    };

    const res = scrollElementToBoundedCenter(containerEl, targetEl, {
      axis: 'y',
      behavior: 'instant',
    });

    assert.equal(scrollIntoViewCalled, false);
    // Expected: 520 - 400/2 + 80/2 = 360
    assert.deepEqual(res, { left: 0, top: 360 });
    assert.equal(containerEl.scrollTop, 360);
    assert.equal(
      computeBoundedCenterScroll({
        viewportSize: 400,
        scrollSize: 1000,
        itemOffset: 520,
        itemSize: 80,
      }),
      360
    );
  });
});

describe('Dynamic Bottom-Boundary Fill Height Engine (fillHeight.js)', () => {
  it('computes available height down to window or NanoModal bottom boundary and respects minHeight floor', () => {
    assert.equal(
      computeAvailableFillHeight({
        elementTop: 220,
        boundaryBottom: 820,
        bottomOffset: 20,
        minHeight: 140,
      }),
      580
    );

    // Clamps to minHeight when viewport is very short
    assert.equal(
      computeAvailableFillHeight({
        elementTop: 760,
        boundaryBottom: 800,
        bottomOffset: 20,
        minHeight: 160,
      }),
      160
    );
  });

  it('automatically resolves .nano-modal-body as the enclosing fill boundary when inside a NanoModal', () => {
    const modalBody = {
      nodeType: 1,
      classList: { contains: (c) => c === 'nano-modal-body' },
      getBoundingClientRect: () => ({ top: 60, bottom: 760, width: 900, height: 700 }),
    };
    const innerScroll = {
      nodeType: 1,
      parentNode: modalBody,
      classList: { contains: () => false },
      getBoundingClientRect: () => ({ top: 240, bottom: 500, width: 420, height: 260 }),
    };

    assert.equal(resolveFillHeightBoundary(innerScroll), modalBody);
    // Expected: 760 - 240 - 18 = 502
    assert.equal(measureElementFillHeight(innerScroll), 502);
  });
});

describe('Magnetic Snap-to-Collapse & Virtual Collapsed Geometry for NanoSplitter (splitterCollapse.js)', () => {
  it('normalizes collapsible prop modes (true, both, first, second, false)', () => {
    assert.deepEqual(resolveCollapsibleConfig(true), {
      enabled: true,
      allowFirst: true,
      allowSecond: true,
    });
    assert.deepEqual(resolveCollapsibleConfig('first'), {
      enabled: true,
      allowFirst: true,
      allowSecond: false,
    });
    assert.deepEqual(resolveCollapsibleConfig('second'), {
      enabled: true,
      allowFirst: false,
      allowSecond: true,
    });
    assert.deepEqual(resolveCollapsibleConfig(false), {
      enabled: false,
      allowFirst: false,
      allowSecond: false,
    });
  });

  it('computes virtual collapsed height (38px) for vertical splitter and virtual collapsed width (38px) for horizontal splitter', () => {
    const vertFirstCollapsed = computeVirtualCollapsedPaneStyles({
      orientation: 'vertical',
      collapsedPane: 'first',
      collapsedSizePx: 38,
      expandedFirstBasis: '255px',
    });
    assert.equal(vertFirstCollapsed.virtualDimensionAxis, 'height');
    assert.equal(vertFirstCollapsed.isFirstCollapsed, true);
    assert.equal(vertFirstCollapsed.isSecondCollapsed, false);
    assert.deepEqual(vertFirstCollapsed.firstPaneStyle, {
      flex: '0 0 38px',
      height: '38px',
    });
    assert.deepEqual(vertFirstCollapsed.secondPaneStyle, {
      flex: '1 1 0%',
    });

    const horizSecondCollapsed = computeVirtualCollapsedPaneStyles({
      orientation: 'horizontal',
      collapsedPane: 'second',
      collapsedSizePx: 38,
      expandedFirstBasis: 'calc(58% - 6px)',
    });
    assert.equal(horizSecondCollapsed.virtualDimensionAxis, 'width');
    assert.equal(horizSecondCollapsed.isFirstCollapsed, false);
    assert.equal(horizSecondCollapsed.isSecondCollapsed, true);
    assert.deepEqual(horizSecondCollapsed.firstPaneStyle, {
      flex: '1 1 0%',
    });
    assert.deepEqual(horizSecondCollapsed.secondPaneStyle, {
      flex: '0 0 38px',
      width: '38px',
    });
  });

  it('evaluates magnetic snap-to-collapse near the container edge (collapsedSizePx + collapseThresholdPx) without premature wide-pane jumps', () => {
    // Usable span = 1000px, minFirstPx = 180px (18%), maxFirstPx = 820px (82%), collapsedSizePx = 38px, threshold = 24px -> edgeSnap = 62px
    // 1. Normal resize inside [180, 820]
    const normal = evaluateSplitterSnapCollapse({
      pointerOffsetPx: 420,
      usableSpanPx: 1000,
      minFirstPx: 180,
      maxFirstPx: 820,
      collapseThresholdPx: 24,
      collapsedSizePx: 38,
    });
    assert.equal(normal.collapsedPane, null);
    assert.equal(normal.approachingPane, null);
    assert.equal(normal.snapped, false);
    assert.equal(normal.clampedFirstPx, 420);

    // 2. Dragging below 180px (e.g. 135px) continues smoothly without premature collapse!
    const smoothCompact = evaluateSplitterSnapCollapse({
      pointerOffsetPx: 135,
      usableSpanPx: 1000,
      minFirstPx: 180,
      maxFirstPx: 820,
      collapseThresholdPx: 24,
      collapsedSizePx: 38,
    });
    assert.equal(smoothCompact.collapsedPane, null);
    assert.equal(smoothCompact.approachingPane, null);
    assert.equal(smoothCompact.clampedFirstPx, 135);

    // 3. Approaching warning band (62px < pointerOffsetPx <= 90px) signals approachingPane = 'first'
    const warningZone = evaluateSplitterSnapCollapse({
      pointerOffsetPx: 82,
      usableSpanPx: 1000,
      minFirstPx: 180,
      maxFirstPx: 820,
      collapseThresholdPx: 24,
      collapsedSizePx: 38,
    });
    assert.equal(warningZone.collapsedPane, null);
    assert.equal(warningZone.approachingPane, 'first');

    // 4. Dragged into the edge snap zone (<= 62px) -> snaps first pane shut!
    const snapFirst = evaluateSplitterSnapCollapse({
      pointerOffsetPx: 54,
      usableSpanPx: 1000,
      minFirstPx: 180,
      maxFirstPx: 820,
      collapseThresholdPx: 24,
      collapsedSizePx: 38,
    });
    assert.equal(snapFirst.collapsedPane, 'first');
    assert.equal(snapFirst.snapped, true);

    // 5. Dragged into the right/bottom edge snap zone (>= 938px) -> snaps second pane shut!
    const snapSecond = evaluateSplitterSnapCollapse({
      pointerOffsetPx: 948,
      usableSpanPx: 1000,
      minFirstPx: 180,
      maxFirstPx: 820,
      collapseThresholdPx: 24,
      collapsedSizePx: 38,
    });
    assert.equal(snapSecond.collapsedPane, 'second');
    assert.equal(snapSecond.snapped, true);
  });
});
