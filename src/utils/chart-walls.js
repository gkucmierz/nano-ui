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
 * Rule:
 * Cut walls are ALWAYS rendered. The ONLY condition when they are NOT rendered is:
 * - opacity is 100% (max visibility, >= 0.999) AND
 * - all pie elements are completely retracted / tucked in (steady state t = 0/1, no animation).
 *
 * @param {Object} params
 * @param {string|number} [params.sliceItemId]
 * @param {boolean} [params.isStartEdge=false]
 * @param {boolean} [params.isEndEdge=false]
 * @param {string|number|null} [params.effectiveActiveId=null]
 * @param {string|number|null} [params.leftNeighborId=null]
 * @param {string|number|null} [params.rightNeighborId=null]
 * @param {boolean} [params.isHoverTransitioning=false]
 * @param {boolean} [params.isAnimating=false]
 * @param {number} [params.opacity=1]
 * @returns {{ renderStartCut: boolean, renderEndCut: boolean }}
 */
export const resolvePartitionCutVisibility = ({
  isStartEdge = false,
  isEndEdge = false,
  effectiveActiveId = null,
  isHoverTransitioning = false,
  isAnimating = false,
  opacity = 1,
} = {}) => {
  const isFullOpacity = opacity >= 0.999
  const allElementsRetracted =
    (effectiveActiveId === null || effectiveActiveId === undefined) &&
    !isHoverTransitioning &&
    !isAnimating

  if (isFullOpacity && allElementsRetracted) {
    return { renderStartCut: false, renderEndCut: false }
  }

  return {
    renderStartCut: Boolean(isStartEdge),
    renderEndCut: Boolean(isEndEdge),
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
 * Parses an aspect ratio string or number into a numeric width/height ratio.
 *
 * @param {string|number} [ratioInput]
 * @returns {number|null}
 */
export const parseAspectRatioNumeric = (ratioInput) => {
  if (!ratioInput || ratioInput === 'auto') return null
  if (typeof ratioInput === 'number') {
    return ratioInput > 0 ? ratioInput : null
  }
  const str = String(ratioInput).trim()
  const parts = str.split(/[\/:]/).map(p => parseFloat(p.trim()))
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[1] > 0) {
    return parts[0] / parts[1]
  }
  const val = parseFloat(str)
  return (!isNaN(val) && val > 0) ? val : null
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
 * @param {string|number} [params.aspectRatio='auto'] - Custom aspect ratio constraint
 * @returns {{ cx: number, cy: number, rx: number, ry: number, irx: number, iry: number, baseDepth: number, depth: number, vbWidth: number, vbHeight: number, opacity: number }}
 */
export const calculateTargetGeometry = ({
  isExpanded = false,
  showLabels = true,
  is3D = true,
  slopeRatio = 0.5,
  thickness = 0.5,
  aspectRatio = 'auto',
} = {}) => {
  const is3DMode = is3D
  const hasLabels = isExpanded && showLabels
  const numRatio = parseAspectRatioNumeric(aspectRatio)

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
    const vbWidth = 760
    const vbHeight = numRatio ? Math.round(vbWidth / numRatio) : 320
    const cx = vbWidth / 2
    const cy = vbHeight / 2

    const clearance = Math.max(30, cy - 45)
    let rx = 180
    let ry = is3DMode ? 180 * slopeRatio : Math.min(180, clearance)
    if (is3DMode) {
      const max3DRy = (vbHeight - depth - 50) / 2
      if (ry > max3DRy && max3DRy > 30) {
        ry = max3DRy
      }
    } else {
      rx = ry
    }

    return {
      cx,
      cy,
      rx,
      ry,
      irx: rx * (1 - thickness),
      iry: is3DMode ? ry * (1 - thickness) : rx * (1 - thickness),
      baseDepth,
      depth,
      vbWidth,
      vbHeight,
      opacity: 1,
    }
  }

  // Expanded without labels (compact / headless / dashboard mode):
  if (!is3DMode) {
    // 2D flat mode without labels is a circle (rx = ry)
    const baseW = 320
    const vbWidth = baseW
    const vbHeight = numRatio ? Math.round(baseW / numRatio) : baseW
    const maxRadius = Math.round(Math.min(vbWidth, vbHeight) / 2 - 20)
    const rx = Math.max(40, maxRadius)
    return {
      cx: vbWidth / 2,
      cy: vbHeight / 2,
      rx,
      ry: rx,
      irx: rx * (1 - thickness),
      iry: rx * (1 - thickness),
      baseDepth: 0,
      depth: 0,
      vbWidth,
      vbHeight,
      opacity: 0,
    }
  }

  // 3D without labels:
  const effSlope = Math.max(0.15, slopeRatio)
  const availableVertical = Math.max(40, 320 - depth - 30)
  const maxRxVertical = availableVertical / (2 * effSlope)
  const rx = Math.min(260, maxRxVertical)
  const vbWidth = numRatio ? (numRatio >= 1 ? Math.round(320 * numRatio) : 320) : Math.round(rx * 2 + 40)
  const vbHeight = numRatio ? (numRatio >= 1 ? 320 : Math.round(320 / numRatio)) : 320
  const cx = vbWidth / 2
  const cy = vbHeight / 2

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

/**
 * Normalizes and aggregates chart dataset based on threshold options.
 *
 * Rules:
 * 1. When aggregateOthers is false, preserves data as-is with recalculated percentages.
 * 2. When aggregateOthers is true:
 *    - Micro-slices below fraction threshold (val / total < othersThreshold) are consolidated into a single "Other" slice.
 *    - Slices above threshold are sorted descending by value (e.g. 50, 42...), ensuring predictable angular positions.
 *    - The consolidated "Other" slice is ALWAYS placed at the end of the list.
 *    - At least 1 slice is preserved.
 *
 * @param {Object} params
 * @param {Array<{ value?: number, name?: string, id?: string|number, color?: string, unit?: string }>} params.data
 * @param {boolean} [params.aggregateOthers=false]
 * @param {number} [params.othersThreshold=0.01]
 * @param {string} [params.othersLabel='Other']
 * @param {string} [params.othersColor='#64748b']
 * @returns {Array<Object>}
 */
export const aggregateThresholdData = ({
  data = [],
  aggregateOthers = false,
  othersThreshold = 0.01,
  othersLabel = 'Other',
  othersColor = '#64748b',
} = {}) => {
  const rawData = data || []
  if (rawData.length === 0) return []

  const total = rawData.reduce((sum, item) => sum + (item.value || 0), 0)

  if (!aggregateOthers) {
    return rawData.map(item => {
      const val = item.value || 0
      const pct = total > 0 ? Math.round((val / total) * 100) : 0
      return {
        ...item,
        percentage: pct,
      }
    })
  }

  if (total === 0) {
    return rawData.map(item => ({
      ...item,
      percentage: 0,
    }))
  }

  const thresholdVal = total * othersThreshold
  const aboveThreshold = []
  let othersValue = 0

  // Sort rawData descending so largest elements are always first
  const sortedRaw = [...rawData].sort((a, b) => (b.value || 0) - (a.value || 0))

  sortedRaw.forEach((item) => {
    const val = item.value || 0
    const isOtherItem = item.id === 'other' || (item.name && item.name.toLowerCase() === othersLabel.toLowerCase())
    if (isOtherItem) {
      othersValue += val
    } else if (val < thresholdVal && aboveThreshold.length > 0) {
      // Below threshold: accumulate into others
      othersValue += val
    } else {
      aboveThreshold.push({ ...item })
    }
  })

  if (aboveThreshold.length === 0 && sortedRaw.length > 0) {
    aboveThreshold.push({ ...sortedRaw[0] })
    othersValue = Math.max(0, total - (sortedRaw[0].value || 0))
  }

  const result = [...aboveThreshold]

  if (othersValue > 0) {
    result.push({
      id: 'other',
      name: othersLabel,
      value: othersValue,
      color: othersColor,
      unit: rawData[0]?.unit || 'x',
    })
  }

  const newTotal = result.reduce((sum, item) => sum + (item.value || 0), 0)
  return result.map(item => {
    const val = item.value || 0
    const pct = newTotal > 0 ? Math.round((val / newTotal) * 100) : 0
    return {
      ...item,
      percentage: pct,
    }
  })
}
