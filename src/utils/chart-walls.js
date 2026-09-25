/**
 * 3D Donut Chart Wall Geometry & Visibility Utilities
 * Pure mathematical functions for angle splitting, X-axis front/back classification,
 * and neighbor partition cut visibility.
 */

import { shortestAngleDiff } from './math.js'

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
 * Calculates the optimal chart rotation angle in degrees to balance leader line labels
 * evenly across left and right sides of the 3D donut chart.
 *
 * @param {Array<{ value?: number }>} items - List of items with values
 * @param {number} [defaultAngle=-90] - Preferred default rotation angle
 * @returns {number} Optimal rotation angle in degrees
 */
export const getOptimalRotationAngle = (items, defaultAngle = -90) => {
  if (!items || items.length === 0) return defaultAngle

  const total = items.reduce((sum, item) => sum + (item.value || 0), 0)
  if (total === 0) return defaultAngle

  let currentAngle = 0
  const slices = items.map((item) => {
    const sliceAngle = ((item.value || 0) / total) * Math.PI * 2
    const originalMidAngleNoRot = currentAngle + sliceAngle / 2
    currentAngle += sliceAngle
    return { originalMidAngleNoRot }
  })

  let bestAngle = defaultAngle
  let minDiff = Infinity
  let bestClutterScore = Infinity

  for (let deg = -180; deg <= 180; deg += 2) {
    const rad = (deg * Math.PI) / 180
    let leftCount = 0
    let rightCount = 0

    slices.forEach((slice) => {
      const midAngle = slice.originalMidAngleNoRot + rad
      const isLeft = Math.cos(midAngle) < 0
      if (isLeft) {
        leftCount++
      } else {
        rightCount++
      }
    })

    const diff = Math.abs(leftCount - rightCount)
    const distanceToDefault = Math.abs(shortestAngleDiff(defaultAngle, deg))

    if (diff < minDiff) {
      minDiff = diff
      bestAngle = deg
      bestClutterScore = distanceToDefault
    } else if (diff === minDiff) {
      if (distanceToDefault < bestClutterScore) {
        bestAngle = deg
        bestClutterScore = distanceToDefault
      }
    }
  }

  return defaultAngle + shortestAngleDiff(defaultAngle, bestAngle)
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

/**
 * Resolves the CSS aspect-ratio string for the chart wrapper container.
 *
 * @param {Object} [params={}]
 * @param {string|number} [params.aspectRatio='auto'] - Custom user aspect-ratio or 'auto'
 * @param {boolean} [params.isExpanded=false] - Whether chart is in expanded mode
 * @param {boolean} [params.showLabels=true] - Whether labels & callouts are visible
 * @param {boolean} [params.is3D=true] - Whether 3D mode is active
 * @returns {string} CSS aspect-ratio value (e.g. '1 / 1', '760 / 320', '560 / 320')
 */
export const resolveChartAspectRatio = ({
  aspectRatio = 'auto',
  isExpanded = false,
  showLabels = true,
  is3D = true,
} = {}) => {
  if (aspectRatio && aspectRatio !== 'auto') {
    return String(aspectRatio).trim().replace(/\s*[/:]\s*/g, ' / ')
  }
  if (!isExpanded) {
    return '1 / 1'
  }
  if (!showLabels) {
    // 2D flat mode without labels is a pure circle -> 1:1!
    if (!is3D) {
      return '1 / 1'
    }
    // 3D tilted mode without labels: wide ellipse
    return '560 / 320'
  }
  // Expanded with side labels
  return '760 / 320'
}

/**
 * Calculates responsive SVG viewBox dimensions, radii, and center coordinates.
 *
 * @param {Object} [params={}]
 * @param {boolean} [params.isExpanded=false] - Expanded layout vs mini badge
 * @param {boolean} [params.showLabels=true] - Side labels and callout lines visible
 * @param {boolean} [params.is3D=true] - 3D tilt/depth perspective enabled
 * @param {number} [params.slopeRatio=0.5] - Tilt ratio (0.2 to 1.0)
 * @param {number} [params.thickness=0.5] - Thickness ratio (0.0 to 1.0)
 * @returns {{ cx: number, cy: number, rx: number, ry: number, irx: number, iry: number, baseDepth: number, depth: number, vbWidth: number, vbHeight: number, opacity: number }}
 */
export const calculateTargetGeometry = ({
  isExpanded = false,
  showLabels = true,
  is3D = true,
  slopeRatio = 0.5,
  thickness = 0.5,
} = {}) => {
  const is3DMode = is3D
  const hasLabels = isExpanded && showLabels

  if (!isExpanded) {
    return {
      cx: 60,
      cy: 60,
      rx: 48,
      ry: is3DMode ? 48 * slopeRatio : 48,
      irx: 48 * (1 - thickness),
      iry: is3DMode ? 48 * (1 - thickness) * slopeRatio : 48 * (1 - thickness),
      baseDepth: 0,
      depth: 0,
      vbWidth: 120,
      vbHeight: 120,
      opacity: 0,
    }
  }

  const baseDepth = is3DMode ? 32 : 0
  const depth = (is3DMode && slopeRatio > 0.5)
    ? baseDepth * (2 - 2 * slopeRatio)
    : baseDepth

  if (hasLabels) {
    return {
      cx: 380,
      cy: 160,
      rx: 180,
      ry: is3DMode ? 180 * slopeRatio : 180,
      irx: 180 * (1 - thickness),
      iry: is3DMode ? 180 * (1 - thickness) * slopeRatio : 180 * (1 - thickness),
      baseDepth,
      depth,
      vbWidth: 760,
      vbHeight: 320,
      opacity: 1,
    }
  }

  // Expanded without labels (compact / headless / dashboard mode):
  if (!is3DMode) {
    // 2D flat mode without labels is a circle (rx = ry)
    const rx = 140
    const vbSize = 320
    return {
      cx: vbSize / 2,
      cy: vbSize / 2,
      rx,
      ry: rx,
      irx: rx * (1 - thickness),
      iry: rx * (1 - thickness),
      baseDepth: 0,
      depth: 0,
      vbWidth: vbSize,
      vbHeight: vbSize,
      opacity: 0,
    }
  }

  // 3D without labels:
  const effSlope = Math.max(0.15, slopeRatio)
  const maxRxVertical = (290 - depth) / (2 * effSlope)
  const rx = Math.min(260, maxRxVertical)
  const vbWidth = Math.round(rx * 2 + 40)
  const cx = vbWidth / 2
  const cy = 160
  const vbHeight = 320

  return {
    cx,
    cy,
    rx,
    ry: rx * slopeRatio,
    irx: rx * (1 - thickness),
    iry: rx * (1 - thickness) * slopeRatio,
    baseDepth,
    depth,
    vbWidth,
    vbHeight,
    opacity: 0,
  }
}
