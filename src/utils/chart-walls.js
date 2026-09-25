/**
 * 3D Donut Chart Wall Geometry & Visibility Utilities
 * Pure mathematical functions for angle splitting, X-axis front/back classification,
 * and neighbor partition cut visibility.
 */

/**
 * Normalizes an angle in radians to [0, 2π).
 * @param {number} rad
 * @returns {number}
 */
export const normalizeRad = (rad) => {
  let a = rad % (Math.PI * 2)
  if (a < 0) a += Math.PI * 2
  return a
}

/**
 * Splits an angular slice [startAngle, startAngle + sliceAngle] along the X axis (multiples of π: 0, π, 2π, ...).
 * Categorizes each resulting sub-interval as 'front' (sin >= 0) or 'back' (sin < 0).
 * Identifies whether an interval contains the true start edge (start-cut) or true end edge (end-cut).
 *
 * @param {number} startAngle - Start angle in radians
 * @param {number} sliceAngle - Sweep angle in radians (> 0)
 * @returns {Array<{ start: number, end: number, midAngle: number, half: 'front'|'back', subIndex: number, isStartEdge: boolean, isEndEdge: boolean }>}
 */
export const splitAngleIntervals = (startAngle, sliceAngle) => {
  if (sliceAngle <= 0) return []

  const normStart = normalizeRad(startAngle)
  const normEnd = normStart + sliceAngle

  const splitPoints = []
  const startK = Math.ceil(normStart / Math.PI)
  const endK = Math.floor(normEnd / Math.PI)
  for (let k = startK; k <= endK; k++) {
    splitPoints.push(k * Math.PI)
  }

  let rawIntervals = [{ start: normStart, end: normEnd }]
  splitPoints.forEach((split) => {
    const next = []
    rawIntervals.forEach((interval) => {
      if (interval.start < split && interval.end > split) {
        next.push({ start: interval.start, end: split })
        next.push({ start: split, end: interval.end })
      } else {
        next.push(interval)
      }
    })
    rawIntervals = next
  })

  // Filter out any zero-width intervals
  const validIntervals = rawIntervals.filter((iv) => iv.end - iv.start > 0.0001)

  return validIntervals.map((interval, subIndex) => {
    const midAngle = (interval.start + interval.end) / 2
    const isBack = Math.sin(midAngle) < 0
    const isStartEdge = Math.abs(interval.start - normStart) < 0.001
    const isEndEdge = Math.abs(interval.end - normEnd) < 0.001

    return {
      start: interval.start,
      end: interval.end,
      midAngle,
      half: isBack ? 'back' : 'front',
      subIndex,
      isStartEdge,
      isEndEdge,
    }
  })
}

/**
 * Resolves the left (previous) and right (next) neighbor IDs for an active slice
 * in an ordered circular ring of data items.
 *
 * @param {Array<{ id: string|number }>} items - Filtered non-zero items in circular order
 * @param {string|number|null} activeId - ID of the currently active item
 * @returns {{ leftNeighborId: string|number|null, rightNeighborId: string|number|null }}
 */
export const getNeighborSliceIds = (items, activeId) => {
  if (!items || items.length <= 1 || activeId === null || activeId === undefined) {
    return { leftNeighborId: null, rightNeighborId: null }
  }

  const idx = items.findIndex((item) => item.id === activeId)
  if (idx === -1) {
    return { leftNeighborId: null, rightNeighborId: null }
  }

  const n = items.length
  const leftIdx = (idx - 1 + n) % n
  const rightIdx = (idx + 1) % n

  return {
    leftNeighborId: items[leftIdx].id,
    rightNeighborId: items[rightIdx].id,
  }
}

/**
 * Determines whether a sub-slice's startCut and endCut partition walls should be rendered.
 *
 * Rules:
 * 1. Internal partition walls between touching resting slices are NOT rendered (prevents seam bleed).
 * 2. When a slice is hovered (or transitioning), its own true startCut and true endCut are rendered.
 * 3. The immediate left neighbor renders its true endCut (facing the gap left by the hovered slice).
 * 4. The immediate right neighbor renders its true startCut (facing the gap left by the hovered slice).
 * 5. Cuts are NEVER rendered on internal X-axis split boundaries within the same slice.
 *
 * @param {Object} params
 * @param {string|number} params.sliceItemId
 * @param {boolean} params.isStartEdge
 * @param {boolean} params.isEndEdge
 * @param {string|number|null} params.effectiveActiveId
 * @param {string|number|null} params.leftNeighborId
 * @param {string|number|null} params.rightNeighborId
 * @param {boolean} params.isHoverTransitioning
 * @param {boolean} params.isAnimating
 * @returns {{ renderStartCut: boolean, renderEndCut: boolean }}
 */
export const resolvePartitionCutVisibility = ({
  sliceItemId,
  isStartEdge,
  isEndEdge,
  effectiveActiveId,
  leftNeighborId,
  rightNeighborId,
  isHoverTransitioning = false,
  isAnimating = false,
}) => {
  const isTargetActive = effectiveActiveId !== null && effectiveActiveId !== undefined
  const shouldRenderPartitions = isTargetActive || isHoverTransitioning || isAnimating

  if (!shouldRenderPartitions) {
    return { renderStartCut: false, renderEndCut: false }
  }

  // If general loading animation is running with no target active slice, render true edges
  if (!isTargetActive && isAnimating && !isHoverTransitioning) {
    return {
      renderStartCut: isStartEdge,
      renderEndCut: isEndEdge,
    }
  }

  // When a target slice is active (or transitioning back), only render for the target and gap-facing neighbors
  const isCurrentActive = isTargetActive && sliceItemId === effectiveActiveId
  const isLeftNeighbor = isTargetActive && sliceItemId === leftNeighborId
  const isRightNeighbor = isTargetActive && sliceItemId === rightNeighborId

  return {
    renderStartCut: isStartEdge && (isCurrentActive || isRightNeighbor),
    renderEndCut: isEndEdge && (isCurrentActive || isLeftNeighbor),
  }
}

/**
 * Calculates depth / vertical Y coordinate for a cut wall at a given angle.
 * In screen coordinates: y = drawCenterY + ry * sin(angle).
 *
 * @param {number} angle - Angle in radians
 * @param {number} drawCenterY - Chart center Y in SVG space
 * @param {number} ry - Chart outer Y radius
 * @returns {number}
 */
export const calculateCutY = (angle, drawCenterY = 0, ry = 1) => {
  return drawCenterY + ry * Math.sin(angle)
}

/**
 * Sorts cut walls by depth priority (ascending by cutY).
 * For back half: -90° (sin = -1, furthest) is painted first, 0°/180° (sin = 0) painted last.
 * For front half: 0°/180° (sin = 0) painted first, +90° (sin = 1, closest) painted last.
 *
 * @param {Array<{ cutY: number }>} cutWalls
 * @returns {Array<{ cutY: number }>}
 */
export const sortCutWallsByDepth = (cutWalls) => {
  if (!cutWalls || cutWalls.length === 0) return []
  return [...cutWalls].sort((a, b) => a.cutY - b.cutY)
}
