/**
 * Normalizes the `collapsible` prop of `<NanoSplitter>` into explicit directional flags.
 *
 * @param {boolean|string} collapsible - `false | true | 'both' | 'first' | 'second'`
 * @returns {{ enabled: boolean, allowFirst: boolean, allowSecond: boolean }}
 */
export function resolveCollapsibleConfig(collapsible) {
  if (collapsible === true || collapsible === 'both') {
    return { enabled: true, allowFirst: true, allowSecond: true };
  }
  if (collapsible === 'first') {
    return { enabled: true, allowFirst: true, allowSecond: false };
  }
  if (collapsible === 'second') {
    return { enabled: true, allowFirst: false, allowSecond: true };
  }
  return { enabled: false, allowFirst: false, allowSecond: false };
}

/**
 * Evaluates whether dragging a `<NanoSplitter>` handle should:
 * 1. Resize smoothly across the full range down to the compact pre-collapse zone,
 * 2. Signal an approaching collapse (`approachingPane: 'first' | 'second' | null`) when within the warning band,
 * 3. Snap-collapse into the virtual `collapsedSizePx` bar (`collapsedPane: 'first' | 'second'`)
 *    ONLY when pushed into the edge snap zone (`collapsedSizePx + collapseThresholdPx` from the container edge),
 *    preventing sudden premature jumps from wide (e.g. 220px) pane states.
 *
 * @param {object} params
 * @param {number} params.pointerOffsetPx - Pointer offset from top/left of container (excluding half gap)
 * @param {number} params.usableSpanPx - Total container width/height minus splitter gap
 * @param {number} params.minFirstPx - Minimum expanded size of the first pane in px
 * @param {number} params.maxFirstPx - Maximum expanded size of the first pane in px
 * @param {number} [params.collapseThresholdPx=24] - Edge snap zone distance (in px) added to `collapsedSizePx`
 * @param {number} [params.collapsedSizePx=38] - Virtual size of the collapsed header strip in px
 * @param {boolean} [params.allowFirst=true] - Whether the first pane is allowed to collapse
 * @param {boolean} [params.allowSecond=true] - Whether the second pane is allowed to collapse
 * @param {'first'|'second'|null} [params.currentCollapsedPane=null] - Currently collapsed pane state
 * @returns {{
 *   collapsedPane: 'first' | 'second' | null,
 *   approachingPane: 'first' | 'second' | null,
 *   clampedFirstPx: number,
 *   snapped: boolean,
 *   firstSnapTriggerPx: number,
 *   secondSnapTriggerPx: number
 * }}
 */
export function evaluateSplitterSnapCollapse(params = {}) {
  const usableSpanPx = Math.max(1, Number.isFinite(params.usableSpanPx) ? params.usableSpanPx : 0);
  const minFirstPx = Math.max(0, Number.isFinite(params.minFirstPx) ? params.minFirstPx : 0);
  const maxFirstPx = Math.max(
    minFirstPx,
    Number.isFinite(params.maxFirstPx) ? params.maxFirstPx : usableSpanPx
  );
  const collapseThresholdPx = Math.max(
    6,
    Number.isFinite(params.collapseThresholdPx) ? params.collapseThresholdPx : 24
  );
  const collapsedSizePx = Math.max(
    24,
    Number.isFinite(params.collapsedSizePx) ? params.collapsedSizePx : 38
  );
  const pointerOffsetPx = Number.isFinite(params.pointerOffsetPx)
    ? params.pointerOffsetPx
    : minFirstPx;
  const allowFirst = params.allowFirst !== undefined ? Boolean(params.allowFirst) : true;
  const allowSecond = params.allowSecond !== undefined ? Boolean(params.allowSecond) : true;
  const currentCollapsedPane =
    params.currentCollapsedPane === 'first' || params.currentCollapsedPane === 'second'
      ? params.currentCollapsedPane
      : null;

  // Edge-based snap trigger: only snap when pushed near the actual container edge
  // (collapsedSizePx + collapseThresholdPx, e.g. 38 + 24 = 62px from the wall),
  // never jumping suddenly from a wide 250px pane!
  const edgeSnapSpanPx = collapsedSizePx + collapseThresholdPx;
  const firstSnapTriggerPx = Math.min(Math.max(collapsedSizePx + 6, minFirstPx - collapseThresholdPx), edgeSnapSpanPx);

  const maxSecondRemainingPx = Math.max(0, usableSpanPx - maxFirstPx);
  const secondRemainingSnapPx = Math.min(
    Math.max(collapsedSizePx + 6, maxSecondRemainingPx - collapseThresholdPx),
    edgeSnapSpanPx
  );
  const secondSnapTriggerPx = usableSpanPx - secondRemainingSnapPx;

  // When collapsible is active on a side, allow smooth resizing all the way down to `edgeSnapSpanPx + 18`
  // so there is no artificial brick wall far from the edge before snapping.
  const effectiveMinFirstPx = allowFirst
    ? Math.min(minFirstPx, firstSnapTriggerPx + 18)
    : minFirstPx;
  const effectiveMaxFirstPx = allowSecond
    ? Math.max(maxFirstPx, secondSnapTriggerPx - 18)
    : maxFirstPx;

  const clampedFirstPx = Math.min(
    effectiveMaxFirstPx,
    Math.max(effectiveMinFirstPx, pointerOffsetPx)
  );

  // Warning / approaching zone (28px before the snap trigger)
  const warningBandPx = 28;
  let approachingPane = null;
  if (allowFirst && pointerOffsetPx <= firstSnapTriggerPx + warningBandPx && pointerOffsetPx > firstSnapTriggerPx) {
    approachingPane = 'first';
  } else if (
    allowSecond &&
    pointerOffsetPx >= secondSnapTriggerPx - warningBandPx &&
    pointerOffsetPx < secondSnapTriggerPx
  ) {
    approachingPane = 'second';
  }

  if (allowFirst && pointerOffsetPx <= firstSnapTriggerPx) {
    return {
      collapsedPane: 'first',
      approachingPane: null,
      clampedFirstPx: effectiveMinFirstPx,
      snapped: true,
      firstSnapTriggerPx,
      secondSnapTriggerPx,
    };
  }

  if (allowSecond && pointerOffsetPx >= secondSnapTriggerPx) {
    return {
      collapsedPane: 'second',
      approachingPane: null,
      clampedFirstPx: effectiveMaxFirstPx,
      snapped: true,
      firstSnapTriggerPx,
      secondSnapTriggerPx,
    };
  }

  // Uncollapse hysteresis: once collapsed, require dragging out at least 16px past the snap trigger
  if (currentCollapsedPane === 'first' && allowFirst && pointerOffsetPx < firstSnapTriggerPx + 16) {
    return {
      collapsedPane: 'first',
      approachingPane: null,
      clampedFirstPx: effectiveMinFirstPx,
      snapped: true,
      firstSnapTriggerPx,
      secondSnapTriggerPx,
    };
  }

  if (currentCollapsedPane === 'second' && allowSecond && pointerOffsetPx > secondSnapTriggerPx - 16) {
    return {
      collapsedPane: 'second',
      approachingPane: null,
      clampedFirstPx: effectiveMaxFirstPx,
      snapped: true,
      firstSnapTriggerPx,
      secondSnapTriggerPx,
    };
  }

  return {
    collapsedPane: null,
    approachingPane,
    clampedFirstPx,
    snapped: false,
    firstSnapTriggerPx,
    secondSnapTriggerPx,
  };
}

/**
 * Computes the virtual collapsed & expanded flex dimensions for `<NanoSplitter>` panes:
 * - `orientation === 'vertical'` -> virtual collapsed `height` (`collapsedSizePx` px)
 * - `orientation === 'horizontal'` -> virtual collapsed `width` (`collapsedSizePx` px)
 *
 * @param {object} params
 * @param {'horizontal'|'vertical'} [params.orientation='horizontal']
 * @param {'first'|'second'|null} [params.collapsedPane=null]
 * @param {number} [params.collapsedSizePx=38]
 * @param {string} params.expandedFirstBasis - CSS basis string when expanded (e.g. `'calc(64% - 6px)'` or `'300px'`)
 * @returns {{
 *   virtualDimensionAxis: 'height' | 'width',
 *   virtualCollapsedPx: number,
 *   isFirstCollapsed: boolean,
 *   isSecondCollapsed: boolean,
 *   firstPaneStyle: Record<string, string>,
 *   secondPaneStyle: Record<string, string>
 * }}
 */
export function computeVirtualCollapsedPaneStyles(params = {}) {
  const isVertical = params.orientation === 'vertical';
  const axis = isVertical ? 'height' : 'width';
  const collapsedSizePx = Math.max(
    24,
    Number.isFinite(params.collapsedSizePx) ? params.collapsedSizePx : 38
  );
  const collapsedBasis = `${Math.round(collapsedSizePx)}px`;
  const expandedFirstBasis = params.expandedFirstBasis
    ? String(params.expandedFirstBasis)
    : '50%';

  if (params.collapsedPane === 'first') {
    return {
      virtualDimensionAxis: axis,
      virtualCollapsedPx: collapsedSizePx,
      isFirstCollapsed: true,
      isSecondCollapsed: false,
      firstPaneStyle: {
        flex: `0 0 ${collapsedBasis}`,
        [axis]: collapsedBasis,
      },
      secondPaneStyle: {
        flex: '1 1 0%',
      },
    };
  }

  if (params.collapsedPane === 'second') {
    return {
      virtualDimensionAxis: axis,
      virtualCollapsedPx: collapsedSizePx,
      isFirstCollapsed: false,
      isSecondCollapsed: true,
      firstPaneStyle: {
        flex: '1 1 0%',
      },
      secondPaneStyle: {
        flex: `0 0 ${collapsedBasis}`,
        [axis]: collapsedBasis,
      },
    };
  }

  return {
    virtualDimensionAxis: axis,
    virtualCollapsedPx: collapsedSizePx,
    isFirstCollapsed: false,
    isSecondCollapsed: false,
    firstPaneStyle: {
      flex: `0 0 ${expandedFirstBasis}`,
      [axis]: expandedFirstBasis,
    },
    secondPaneStyle: {
      flex: '1 1 0%',
    },
  };
}
