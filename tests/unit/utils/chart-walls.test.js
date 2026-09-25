import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  splitAngleIntervals,
  getNeighborSliceIds,
  resolvePartitionCutVisibility,
  getOptimalRotationAngle,
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

  describe('when resolving partition cut visibility', () => {
    test('should hide all partition cuts when all slices are at rest', () => {
      const result = resolvePartitionCutVisibility({
        sliceItemId: 'purple',
        isStartEdge: true,
        isEndEdge: true,
        effectiveActiveId: null,
        leftNeighborId: null,
        rightNeighborId: null,
        isHoverTransitioning: false,
        isAnimating: false,
      })

      assert.equal(result.renderStartCut, false)
      assert.equal(result.renderEndCut, false)
    })

    test('should render both start and end cuts for active slice when hovered', () => {
      const result = resolvePartitionCutVisibility({
        sliceItemId: 'purple',
        isStartEdge: true,
        isEndEdge: true,
        effectiveActiveId: 'purple',
        leftNeighborId: 'pink',
        rightNeighborId: 'yellow',
        isHoverTransitioning: true,
        isAnimating: false,
      })

      assert.equal(result.renderStartCut, true)
      assert.equal(result.renderEndCut, true)
    })

    test('should not render cuts on internal X-axis sub-slice of active item', () => {
      // Middle sub-slice (front half) of purple slice: isStartEdge = false, isEndEdge = false
      const result = resolvePartitionCutVisibility({
        sliceItemId: 'purple',
        isStartEdge: false,
        isEndEdge: false,
        effectiveActiveId: 'purple',
        leftNeighborId: 'pink',
        rightNeighborId: 'yellow',
        isHoverTransitioning: true,
        isAnimating: false,
      })

      assert.equal(result.renderStartCut, false)
      assert.equal(result.renderEndCut, false)
    })

    test('should expose left neighbor endCut and right neighbor startCut facing the gap while keeping internal cuts hidden', () => {
      // Left neighbor (pink): should render endCut facing purple, but NOT startCut (which touches yellow)
      const leftResult = resolvePartitionCutVisibility({
        sliceItemId: 'pink',
        isStartEdge: true,
        isEndEdge: true,
        effectiveActiveId: 'purple',
        leftNeighborId: 'pink',
        rightNeighborId: 'yellow',
        isHoverTransitioning: true,
        isAnimating: false,
      })
      assert.equal(leftResult.renderStartCut, false, 'Left neighbor startCut touches another resting slice and must stay hidden')
      assert.equal(leftResult.renderEndCut, true, 'Left neighbor endCut faces into the gap and must be rendered')

      // Right neighbor (yellow): should render startCut facing purple, but NOT endCut (which touches pink)
      const rightResult = resolvePartitionCutVisibility({
        sliceItemId: 'yellow',
        isStartEdge: true,
        isEndEdge: true,
        effectiveActiveId: 'purple',
        leftNeighborId: 'pink',
        rightNeighborId: 'yellow',
        isHoverTransitioning: true,
        isAnimating: false,
      })
      assert.equal(rightResult.renderStartCut, true, 'Right neighbor startCut faces into the gap and must be rendered')
      assert.equal(rightResult.renderEndCut, false, 'Right neighbor endCut touches another resting slice and must stay hidden')
    })

    test('should maintain partition wall visibility for returning slice and gap neighbors during hover return transition window', () => {
      // During return transition window, activeOrTransitioningId passes the returning slice ID:
      const returningSliceResult = resolvePartitionCutVisibility({
        sliceItemId: 'purple',
        isStartEdge: true,
        isEndEdge: true,
        effectiveActiveId: 'purple',
        leftNeighborId: 'pink',
        rightNeighborId: 'yellow',
        isHoverTransitioning: true,
        isAnimating: false,
      })

      assert.equal(returningSliceResult.renderStartCut, true, 'Returning slice startCut must remain visible during return animation')
      assert.equal(returningSliceResult.renderEndCut, true, 'Returning slice endCut must remain visible during return animation')

      // Left neighbor facing gap must also maintain endCut
      const leftNeighborResult = resolvePartitionCutVisibility({
        sliceItemId: 'pink',
        isStartEdge: true,
        isEndEdge: true,
        effectiveActiveId: 'purple',
        leftNeighborId: 'pink',
        rightNeighborId: 'yellow',
        isHoverTransitioning: true,
        isAnimating: false,
      })
      assert.equal(leftNeighborResult.renderStartCut, false)
      assert.equal(leftNeighborResult.renderEndCut, true, 'Left neighbor endCut facing returning slice must stay visible')

      // Unrelated slices not bordering the gap must NOT render cuts
      const unrelatedResult = resolvePartitionCutVisibility({
        sliceItemId: 'orange',
        isStartEdge: true,
        isEndEdge: true,
        effectiveActiveId: 'purple',
        leftNeighborId: 'pink',
        rightNeighborId: 'yellow',
        isHoverTransitioning: true,
        isAnimating: false,
      })
      assert.equal(unrelatedResult.renderStartCut, false, 'Unrelated resting slices must never show cuts during return transition')
      assert.equal(unrelatedResult.renderEndCut, false, 'Unrelated resting slices must never show cuts during return transition')

      // When transition ends completely (effectiveActiveId is null and isHoverTransitioning is false)
      const restingResult = resolvePartitionCutVisibility({
        sliceItemId: 'purple',
        isStartEdge: true,
        isEndEdge: true,
        effectiveActiveId: null,
        leftNeighborId: null,
        rightNeighborId: null,
        isHoverTransitioning: false,
        isAnimating: false,
      })
      assert.equal(restingResult.renderStartCut, false, 'At complete rest, startCut must be hidden')
      assert.equal(restingResult.renderEndCut, false, 'At complete rest, endCut must be hidden')
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
})
