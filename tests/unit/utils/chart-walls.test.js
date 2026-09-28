import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  splitAngleIntervals,
  getNeighborSliceIds,
  resolvePartitionCutVisibility,
  getOptimalRotationAngle,
  resolveChartAspectRatio,
  calculateTargetGeometry,
  aggregateThresholdData,
} from '../../../src/utils/chart-walls.js'

describe('3D Donut Chart Wall Geometry & Visibility', () => {
  describe('when splitting angles across X-axis', () => {
    test('should keep single sub-slice when slice stays entirely within front half', () => {
      // 30° to 150° (entirely in front half, sin >= 0)
      const start = (30 * Math.PI) / 180
      const sweep = (120 * Math.PI) / 180
      const intervals = splitAngleIntervals(start, sweep)

      assert.equal(intervals.length, 1)
      assert.equal(intervals[0].half, 'front')
      assert.equal(intervals[0].isStartEdge, true)
      assert.equal(intervals[0].isEndEdge, true)
    })

    test('should split into two sub-slices when slice crosses 180° boundary once', () => {
      // 120° to 240° (crosses 180°, front -> back)
      const start = (120 * Math.PI) / 180
      const sweep = (120 * Math.PI) / 180
      const intervals = splitAngleIntervals(start, sweep)

      assert.equal(intervals.length, 2)
      assert.equal(intervals[0].half, 'front')
      assert.equal(intervals[0].isStartEdge, true)
      assert.equal(intervals[0].isEndEdge, false)

      assert.equal(intervals[1].half, 'back')
      assert.equal(intervals[1].isStartEdge, false)
      assert.equal(intervals[1].isEndEdge, true)
    })

    test('should split purple slice spanning across both 0° and 180° into exactly 3 sub-slices (1 front and 2 back)', () => {
      // Purple slice spanning ~288° (1.6π) starting at 270° (1.5π):
      // 1.5π -> 2π (back)
      // 2π -> 3π (front)
      // 3π -> 3.1π (back)
      const start = 1.5 * Math.PI
      const sweep = 1.6 * Math.PI
      const intervals = splitAngleIntervals(start, sweep)

      assert.equal(intervals.length, 3, 'Should split into exactly 3 sub-intervals')

      // Interval 0: back half, has startCut, NO endCut
      assert.equal(intervals[0].half, 'back')
      assert.equal(intervals[0].subIndex, 0)
      assert.equal(intervals[0].isStartEdge, true)
      assert.equal(intervals[0].isEndEdge, false)

      // Interval 1: front half, NO startCut, NO endCut (internal X-axis pass)
      assert.equal(intervals[1].half, 'front')
      assert.equal(intervals[1].subIndex, 1)
      assert.equal(intervals[1].isStartEdge, false)
      assert.equal(intervals[1].isEndEdge, false)

      // Interval 2: back half, NO startCut, has endCut
      assert.equal(intervals[2].half, 'back')
      assert.equal(intervals[2].subIndex, 2)
      assert.equal(intervals[2].isStartEdge, false)
      assert.equal(intervals[2].isEndEdge, true)
    })
  })

  describe('when resolving circular neighbor IDs', () => {
    const items = [
      { id: 'pink' },
      { id: 'purple' },
      { id: 'yellow' },
    ]

    test('should return correct previous and next neighbors in circular order', () => {
      const neighbors = getNeighborSliceIds(items, 'purple')
      assert.equal(neighbors.leftNeighborId, 'pink')
      assert.equal(neighbors.rightNeighborId, 'yellow')
    })

    test('should wrap around correctly for first and last elements', () => {
      const firstNeighbors = getNeighborSliceIds(items, 'pink')
      assert.equal(firstNeighbors.leftNeighborId, 'yellow')
      assert.equal(firstNeighbors.rightNeighborId, 'purple')

      const lastNeighbors = getNeighborSliceIds(items, 'yellow')
      assert.equal(lastNeighbors.leftNeighborId, 'purple')
      assert.equal(lastNeighbors.rightNeighborId, 'pink')
    })

    test('should return null neighbors when activeId is null', () => {
      const neighbors = getNeighborSliceIds(items, null)
      assert.equal(neighbors.leftNeighborId, null)
      assert.equal(neighbors.rightNeighborId, null)
    })
  })

  describe('when resolving partition cut visibility (3d-chart-cutting-walls recipe)', () => {
    test('should hide all partition cuts only when opacity is 100% and all elements are completely at rest', () => {
      const result = resolvePartitionCutVisibility({
        sliceItemId: 'purple',
        isStartEdge: true,
        isEndEdge: true,
        effectiveActiveId: null,
        leftNeighborId: null,
        rightNeighborId: null,
        isHoverTransitioning: false,
        isAnimating: false,
        opacity: 1,
      })

      assert.equal(result.renderStartCut, false)
      assert.equal(result.renderEndCut, false)
    })

    test('should render cuts when all elements are at rest but opacity is less than 100%', () => {
      const dimmedResult = resolvePartitionCutVisibility({
        sliceItemId: 'purple',
        isStartEdge: true,
        isEndEdge: true,
        effectiveActiveId: null,
        isHoverTransitioning: false,
        isAnimating: false,
        opacity: 0.35,
      })

      assert.equal(dimmedResult.renderStartCut, true, 'Start cut must render when opacity < 1')
      assert.equal(dimmedResult.renderEndCut, true, 'End cut must render when opacity < 1')
    })

    test('should render cuts for true edges when an element is active / extruded', () => {
      const activeResult = resolvePartitionCutVisibility({
        sliceItemId: 'purple',
        isStartEdge: true,
        isEndEdge: true,
        effectiveActiveId: 'purple',
        isHoverTransitioning: false,
        isAnimating: false,
        opacity: 1,
      })

      assert.equal(activeResult.renderStartCut, true)
      assert.equal(activeResult.renderEndCut, true)

      // Other slices also render cut walls when an element is extruded
      const otherResult = resolvePartitionCutVisibility({
        sliceItemId: 'pink',
        isStartEdge: true,
        isEndEdge: true,
        effectiveActiveId: 'purple',
        isHoverTransitioning: false,
        isAnimating: false,
        opacity: 0.35,
      })
      assert.equal(otherResult.renderStartCut, true)
      assert.equal(otherResult.renderEndCut, true)
    })

    test('should not render cuts on internal X-axis sub-slice even when active or animating', () => {
      // Middle sub-slice (front half) of purple slice: isStartEdge = false, isEndEdge = false
      const result = resolvePartitionCutVisibility({
        sliceItemId: 'purple',
        isStartEdge: false,
        isEndEdge: false,
        effectiveActiveId: 'purple',
        isHoverTransitioning: true,
        isAnimating: true,
        opacity: 0.35,
      })

      assert.equal(result.renderStartCut, false)
      assert.equal(result.renderEndCut, false)
    })

    test('should render cuts during animations (intro or hover transition)', () => {
      const animResult = resolvePartitionCutVisibility({
        sliceItemId: 'purple',
        isStartEdge: true,
        isEndEdge: true,
        effectiveActiveId: null,
        isHoverTransitioning: false,
        isAnimating: true,
        opacity: 1,
      })
      assert.equal(animResult.renderStartCut, true)
      assert.equal(animResult.renderEndCut, true)

      const hoverTransResult = resolvePartitionCutVisibility({
        sliceItemId: 'purple',
        isStartEdge: true,
        isEndEdge: true,
        effectiveActiveId: null,
        isHoverTransitioning: true,
        isAnimating: false,
        opacity: 1,
      })
      assert.equal(hoverTransResult.renderStartCut, true)
      assert.equal(hoverTransResult.renderEndCut, true)
    })
  })

  describe('when sorting cut walls by depth (angle order / painter\'s algorithm)', () => {
    const drawCenterY = 160
    const ry = 80

    test('should sort back half cuts with -90° (12 o\'clock) painted first and 0°/180° painted last', () => {
      // Back half: sin is between -1 and 0.
      // -90° (top apex): furthest back, lowest Y, lowest painter priority (drawn first)
      // -30° and 210° (-150°): middle depth
      // 0° (3 o'clock) and 180° (9 o'clock): closest in back half, highest painter priority (drawn last)
      const cuts = [
        { id: 'cut-0deg', cutY: drawCenterY + ry * Math.sin(0) }, // sin=0 -> 160
        { id: 'cut-minus-90deg', cutY: drawCenterY + ry * Math.sin(-Math.PI / 2) }, // sin=-1 -> 80
        { id: 'cut-minus-30deg', cutY: drawCenterY + ry * Math.sin(-Math.PI / 6) }, // sin=-0.5 -> 120
        { id: 'cut-180deg', cutY: drawCenterY + ry * Math.sin(Math.PI) }, // sin=0 -> 160
      ]

      const sorted = cuts.sort((a, b) => a.cutY - b.cutY)

      assert.equal(sorted[0].id, 'cut-minus-90deg', '-90° (12 o\'clock) must be drawn first (furthest back)')
      assert.equal(sorted[1].id, 'cut-minus-30deg', '-30° must be drawn second')
      const lastIds = [sorted[2].id, sorted[3].id]
      assert.ok(lastIds.includes('cut-0deg') && lastIds.includes('cut-180deg'), '0° and 180° must be drawn last (highest priority on back half)')
    })

    test('should sort front half cuts with 0°/180° painted first and +90° (6 o\'clock) painted last', () => {
      // Front half: sin is between 0 and 1.
      // 0° and 180°: furthest back in front half, lowest painter priority (drawn first)
      // +30°: middle depth
      // +90° (bottom apex, 6 o'clock): closest to camera, highest painter priority (drawn last)
      const cuts = [
        { id: 'cut-plus-90deg', cutY: drawCenterY + ry * Math.sin(Math.PI / 2) }, // sin=1 -> 240
        { id: 'cut-0deg', cutY: drawCenterY + ry * Math.sin(0) }, // sin=0 -> 160
        { id: 'cut-plus-30deg', cutY: drawCenterY + ry * Math.sin(Math.PI / 6) }, // sin=0.5 -> 200
        { id: 'cut-180deg', cutY: drawCenterY + ry * Math.sin(Math.PI) }, // sin=0 -> 160
      ]

      const sorted = cuts.sort((a, b) => a.cutY - b.cutY)

      const firstIds = [sorted[0].id, sorted[1].id]
      assert.ok(firstIds.includes('cut-0deg') && firstIds.includes('cut-180deg'), '0° and 180° must be drawn first in front half')
      assert.equal(sorted[2].id, 'cut-plus-30deg')
      assert.equal(sorted[3].id, 'cut-plus-90deg', '+90° (6 o\'clock) must be drawn last (closest to camera)')
    })
  })

  describe('when computing optimal rotation angle (autoRotate)', () => {
    test('should return defaultAngle when items are empty or total is 0', () => {
      assert.equal(getOptimalRotationAngle([], -90), -90)
      assert.equal(getOptimalRotationAngle([{ value: 0 }, { value: 0 }], -90), -90)
      assert.equal(getOptimalRotationAngle(null, 45), 45)
    })

    test('should balance labels 5-on-left and 5-on-right for the 10-country dataset', () => {
      const testData = [
        { name: 'Russia', value: 17.1 },
        { name: 'Canada', value: 9.98 },
        { name: 'China', value: 9.59 },
        { name: 'United States', value: 9.52 },
        { name: 'Brazil', value: 8.51 },
        { name: 'Australia', value: 7.69 },
        { name: 'India', value: 3.29 },
        { name: 'Argentina', value: 2.78 },
        { name: 'Poland', value: 0.31 },
        { name: 'Iceland', value: 0.10 },
      ]

      const optimalAngle = getOptimalRotationAngle(testData, -90)
      assert.equal(optimalAngle, -88, 'Should find optimal angle -88° close to default -90°')

      // Verify label count balance at -88°
      const total = testData.reduce((s, it) => s + it.value, 0)
      let cur = 0
      let left = 0
      let right = 0
      testData.forEach((it) => {
        const sweep = (it.value / total) * Math.PI * 2
        const mid = cur + sweep / 2 + (-88 * Math.PI) / 180
        cur += sweep
        if (Math.cos(mid) < 0) left++
        else right++
      })
      assert.equal(left, 5, 'Left column must have exactly 5 labels')
      assert.equal(right, 5, 'Right column must have exactly 5 labels')
      assert.equal(Math.abs(left - right), 0, 'Label difference must be 0')
    })

    test('should rotate asymmetrical dataset to achieve perfect label balance', () => {
      // 1 dominant slice (50%) and 5 small slices (10% each)
      const data = [
        { name: 'A', value: 50 },
        { name: 'B', value: 10 },
        { name: 'C', value: 10 },
        { name: 'D', value: 10 },
        { name: 'E', value: 10 },
        { name: 'F', value: 10 },
      ]

      const optimalAngle = getOptimalRotationAngle(data, -90)

      // Verify that at optimalAngle, 3 items are on left and 3 items are on right
      const total = data.reduce((s, it) => s + it.value, 0)
      let cur = 0
      let left = 0
      let right = 0
      data.forEach((it) => {
        const sweep = (it.value / total) * Math.PI * 2
        const mid = cur + sweep / 2 + (optimalAngle * Math.PI) / 180
        cur += sweep
        if (Math.cos(mid) < 0) left++
        else right++
      })
      assert.equal(left, 3, 'Left column must have 3 labels')
      assert.equal(right, 3, 'Right column must have 3 labels')
      assert.equal(Math.abs(left - right), 0, 'Difference between left and right must be 0')
    })
  })

  describe('when resolving chart aspect-ratio', () => {
    test('should return 1 / 1 for compact mode when not expanded', () => {
      const ar = resolveChartAspectRatio({ isExpanded: false })
      assert.equal(ar, '1 / 1')
    })

    test('should return 760 / 320 when expanded with labels', () => {
      const ar = resolveChartAspectRatio({ isExpanded: true, showLabels: true, is3D: true })
      assert.equal(ar, '760 / 320')
    })

    test('should return 1 / 1 for 2D flat mode without labels', () => {
      const ar = resolveChartAspectRatio({ isExpanded: true, showLabels: false, is3D: false })
      assert.equal(ar, '1 / 1')
    })

    test('should return 560 / 320 for 3D tilted mode without labels', () => {
      const ar = resolveChartAspectRatio({ isExpanded: true, showLabels: false, is3D: true })
      assert.equal(ar, '560 / 320')
    })

    test('should respect custom user aspect-ratio prop when provided', () => {
      assert.equal(resolveChartAspectRatio({ aspectRatio: '16/9' }), '16 / 9')
      assert.equal(resolveChartAspectRatio({ aspectRatio: '4/3' }), '4 / 3')
      assert.equal(resolveChartAspectRatio({ aspectRatio: '1/1' }), '1 / 1')
      assert.equal(resolveChartAspectRatio({ aspectRatio: '2:1' }), '2 / 1')
      assert.equal(resolveChartAspectRatio({ aspectRatio: 1.77 }), '1.77')
    })

    test('should fall back to automatic ratios when aspectRatio is empty, null, or auto', () => {
      assert.equal(resolveChartAspectRatio({ aspectRatio: '', isExpanded: false }), '1 / 1')
      assert.equal(resolveChartAspectRatio({ aspectRatio: null, isExpanded: true, showLabels: true }), '760 / 320')
      assert.equal(resolveChartAspectRatio({ aspectRatio: 'auto', isExpanded: true, showLabels: false, is3D: false }), '1 / 1')
      assert.equal(resolveChartAspectRatio({ aspectRatio: 'auto', isExpanded: true, showLabels: false, is3D: true }), '560 / 320')
    })
  })

  describe('when calculating target geometry', () => {
    test('should return 120x120 mini badge geometry when collapsed', () => {
      const geom = calculateTargetGeometry({ isExpanded: false })
      assert.equal(geom.vbWidth, 120)
      assert.equal(geom.vbHeight, 120)
      assert.equal(geom.cx, 60)
      assert.equal(geom.cy, 60)
      assert.equal(geom.rx, 48)
      assert.equal(geom.opacity, 0)
    })

    test('should return 760x320 wide geometry with opacity 1 when expanded with labels', () => {
      const geom = calculateTargetGeometry({ isExpanded: true, showLabels: true, is3D: true, slopeRatio: 0.5 })
      assert.equal(geom.vbWidth, 760)
      assert.equal(geom.vbHeight, 320)
      assert.equal(geom.cx, 380)
      assert.equal(geom.cy, 160)
      assert.equal(geom.rx, 180)
      assert.equal(geom.ry, 90)
      assert.equal(geom.opacity, 1)
    })

    test('should return 320x320 square geometry for 2D flat mode without labels', () => {
      const geom = calculateTargetGeometry({ isExpanded: true, showLabels: false, is3D: false })
      assert.equal(geom.vbWidth, 320)
      assert.equal(geom.vbHeight, 320)
      assert.equal(geom.cx, 160)
      assert.equal(geom.cy, 160)
      assert.equal(geom.rx, 140)
      assert.equal(geom.ry, 140)
      assert.equal(geom.opacity, 0)
    })

    test('should return wider geometry and depth for 3D tilted mode without labels', () => {
      const geom = calculateTargetGeometry({ isExpanded: true, showLabels: false, is3D: true, slopeRatio: 0.5 })
      assert.equal(geom.vbHeight, 320)
      assert.ok(geom.vbWidth >= 550 && geom.vbWidth <= 560)
      assert.ok(geom.rx >= 250 && geom.rx <= 260)
      assert.equal(geom.opacity, 0)
    })

    test('should correctly scale inner radii irx and iry based on thickness', () => {
      // Full pie (thickness = 1.0) -> inner radii are 0
      const fullPie = calculateTargetGeometry({ isExpanded: true, showLabels: true, is3D: true, slopeRatio: 0.5, thickness: 1.0 })
      assert.equal(fullPie.irx, 0)
      assert.equal(fullPie.iry, 0)

      // Thin ring (thickness = 0.0) -> inner radii equal outer radii
      const thinRing = calculateTargetGeometry({ isExpanded: true, showLabels: true, is3D: true, slopeRatio: 0.5, thickness: 0.0 })
      assert.equal(thinRing.irx, thinRing.rx)
      assert.equal(thinRing.iry, thinRing.ry)

      // Standard donut (thickness = 0.5) -> inner radii are half outer radii
      const standard = calculateTargetGeometry({ isExpanded: true, showLabels: true, is3D: true, slopeRatio: 0.5, thickness: 0.5 })
      assert.equal(standard.irx, standard.rx * 0.5)
      assert.equal(standard.iry, standard.ry * 0.5)
    })

    test('should constrain rx vertically when slopeRatio is steep to prevent vertical clipping', () => {
      const geom = calculateTargetGeometry({ isExpanded: true, showLabels: false, is3D: true, slopeRatio: 1.0 })
      assert.equal(geom.vbHeight, 320)
      // When slopeRatio is 1.0 (vertical circle in 3D), rx must be <= 145 to fit in 320 height
      assert.ok(geom.rx <= 150)
      assert.ok(geom.vbWidth <= 340)
    })

    test('should maintain exact 1:1 circular aspect ratio without horizontal flattening when slopeRatio is 1.0 (3d-chart-aspect-ratio-error recipe)', () => {
      // Scenario 1: slopeRatio = 1.0 with labels
      const geom3D = calculateTargetGeometry({ isExpanded: true, showLabels: true, is3D: true, slopeRatio: 1.0 })
      assert.equal(geom3D.rx, 135, '3D mode rx must equal 135 to fit vertically without clipping')
      assert.equal(geom3D.ry, 135, '3D mode ry must equal 135')
      assert.equal(geom3D.ry / geom3D.rx, 1.0, '3D mode ry/rx must strictly equal 1.0 (no horizontal flattening to 0.75)')

      // Scenario 1b: 2D flat mode with labels
      const geom2D = calculateTargetGeometry({ isExpanded: true, showLabels: true, is3D: false })
      assert.equal(geom2D.rx, 135, '2D mode rx must equal 135')
      assert.equal(geom2D.ry, 135, '2D mode ry must equal 135')

      // Radii between 2D and 3D at slope 1.0 must be identical (no ballooning or shrinking)
      assert.equal(geom3D.rx, geom2D.rx, 'rx must not balloon when switching between 2D and 3D at slope 1.0')
      assert.equal(geom3D.ry, geom2D.ry, 'ry must not shrink when switching between 2D and 3D at slope 1.0')
    })

    test('should maintain proportional aspect ratio for steep slopes (slopeRatio > 0.75) in expanded labeled mode', () => {
      const slopes = [0.8, 0.85, 0.9, 0.95, 1.0]
      for (const s of slopes) {
        const geom = calculateTargetGeometry({ isExpanded: true, showLabels: true, is3D: true, slopeRatio: s })
        const actualRatio = geom.ry / geom.rx
        assert.ok(
          Math.abs(actualRatio - s) <= 0.015,
          `slopeRatio ${s} must maintain geometric proportion (actual: ${actualRatio.toFixed(3)})`
        )
      }
    })

    test('should clamp slopeRatio to safe minimum when calculating vertical constraints', () => {
      const geom = calculateTargetGeometry({ isExpanded: true, showLabels: false, is3D: true, slopeRatio: 0.05 })
      assert.equal(geom.rx, 260)
      assert.equal(geom.vbWidth, 560)
    })

    test('should calculate dynamic viewBox and center anchor for 1/1 square aspect ratio', () => {
      const geom = calculateTargetGeometry({ isExpanded: true, showLabels: true, is3D: true, aspectRatio: '1/1' })
      assert.equal(geom.vbWidth, 760)
      assert.equal(geom.vbHeight, 760)
      assert.equal(geom.cx, 380)
      assert.equal(geom.cy, 380)
    })

    test('should calculate dynamic viewBox and center anchor for 16/9 widescreen aspect ratio', () => {
      const geom = calculateTargetGeometry({ isExpanded: true, showLabels: true, is3D: true, aspectRatio: '16/9' })
      assert.equal(geom.vbWidth, 760)
      assert.equal(geom.vbHeight, 428)
      assert.equal(geom.cx, 380)
      assert.equal(geom.cy, 214)
    })

    test('should calculate dynamic viewBox and center anchor for 4/3 aspect ratio', () => {
      const geom = calculateTargetGeometry({ isExpanded: true, showLabels: true, is3D: true, aspectRatio: '4/3' })
      assert.equal(geom.vbWidth, 760)
      assert.equal(geom.vbHeight, 570)
      assert.equal(geom.cx, 380)
      assert.equal(geom.cy, 285)
    })

    test('should calculate baseDepth and effDepth based on depth and slopeRatio props', () => {
      const geom3D = calculateTargetGeometry({ isExpanded: true, showLabels: true, is3D: true, slopeRatio: 0.5, depth: 48 })
      assert.equal(geom3D.baseDepth, 48)
      assert.equal(geom3D.depth, 48)

      const geomSteep = calculateTargetGeometry({ isExpanded: true, showLabels: true, is3D: true, slopeRatio: 0.75, depth: 48 })
      assert.equal(geomSteep.baseDepth, 48)
      assert.equal(geomSteep.depth, 24)

      const geom2D = calculateTargetGeometry({ isExpanded: true, showLabels: true, is3D: false, depth: 48 })
      assert.equal(geom2D.baseDepth, 0)
      assert.equal(geom2D.depth, 0)
    })
  })

  describe('when aggregating threshold data (3d-chart-treshold-behaviour recipe)', () => {
    test('should place aggregated others slice at the end of the list with sorted descending main slices (e.g. D: 50, D: 42, D: 5, D: 3)', () => {
      const input = [
        { id: 'd1', name: 'D: 50', value: 50 },
        { id: 'd2', name: 'D: 42', value: 42 },
        { id: 'd3', name: 'D: 5', value: 5 },
        { id: 'd4', name: 'D: 3', value: 3 },
      ]

      // Threshold 0.1 (10% of 100 = 10): items 5 and 3 are < 10, consolidated into "Other" (value: 8)
      const result = aggregateThresholdData({
        data: input,
        aggregateOthers: true,
        othersThreshold: 0.1,
        othersLabel: 'Other',
        othersColor: '#64748b',
      })

      assert.equal(result.length, 3, 'Should have D: 50, D: 42, and Other at the end')
      assert.equal(result[0].id, 'd1')
      assert.equal(result[0].value, 50)
      assert.equal(result[0].percentage, 50)

      assert.equal(result[1].id, 'd2')
      assert.equal(result[1].value, 42)
      assert.equal(result[1].percentage, 42)

      // Other MUST be strictly at the end of the list
      assert.equal(result[2].id, 'other')
      assert.equal(result[2].name, 'Other')
      assert.equal(result[2].value, 8)
      assert.equal(result[2].percentage, 8)
      assert.equal(result[2].color, '#64748b')
    })

    test('should sort main slices descending even if raw input is in arbitrary order', () => {
      const input = [
        { id: 'd4', name: 'D: 3', value: 3 },
        { id: 'd1', name: 'D: 50', value: 50 },
        { id: 'd3', name: 'D: 5', value: 5 },
        { id: 'd2', name: 'D: 42', value: 42 },
      ]

      const result = aggregateThresholdData({
        data: input,
        aggregateOthers: true,
        othersThreshold: 0.1,
      })

      assert.equal(result.length, 3)
      assert.equal(result[0].value, 50)
      assert.equal(result[1].value, 42)
      assert.equal(result[2].id, 'other')
      assert.equal(result[2].value, 8)
    })

    test('should preserve original order and percentages when aggregateOthers is false', () => {
      const input = [
        { id: 'd4', name: 'D: 3', value: 3 },
        { id: 'd1', name: 'D: 50', value: 50 },
      ]

      const result = aggregateThresholdData({
        data: input,
        aggregateOthers: false,
      })

      assert.equal(result.length, 2)
      assert.equal(result[0].id, 'd4')
      assert.equal(result[1].id, 'd1')
    })

    test('should preserve at least 1 slice even if threshold is set to 100%', () => {
      const input = [
        { id: 'd1', name: 'D: 50', value: 50 },
        { id: 'd2', name: 'D: 42', value: 42 },
      ]

      const result = aggregateThresholdData({
        data: input,
        aggregateOthers: true,
        othersThreshold: 1.0,
      })

      assert.equal(result.length, 2)
      assert.equal(result[0].value, 50, 'Largest slice must remain')
      assert.equal(result[1].id, 'other')
      assert.equal(result[1].value, 42)
    })
  })
})
