import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WORLD_COUNTRIES_LITE } from '../../src/data/worldCountriesLite.js'
import {
  DEG2RAD,
  easeInOutCubic,
  computeSphericalLabelOpacity,
  lonLatToCamVec3,
  lonLatToWorldUnitVec3,
  slerpWorldUnitVec3,
  TIMEZONE_SPINE_LAT_KNOTS,
  POLITICAL_TIMEZONE_SPINE_DELTAS,
  smoothTimezoneBoundarySpineLonLat,
  buildTimezoneBoundarySpineVec3,
  buildSphericalTimezoneBands,
  buildSphericalVariableWidthLinePolygon,
  clipSphericalRingToHorizon,
  camPolygonToSvgPath,
  camPolygonsToSvgPath,
  camPolylineToSvgPath,
  densifyRing,
  isSouthPolarRing,
  computeSolarCosZenith,
  computeSolarIrradiance,
  computeSolarTwilightOpacity,
  buildSolarTerminatorSvgPrimitives
} from '../../src/utils/globe-geometry.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')

function makeTrig(lon0Deg, lat0Deg) {
  const lon0 = lon0Deg * DEG2RAD
  const lat0 = lat0Deg * DEG2RAD
  return {
    lon0,
    lat0,
    sinLat0: Math.sin(lat0),
    cosLat0: Math.cos(lat0)
  }
}

describe('NanoGlobe Component & WORLD_COUNTRIES_LITE Dataset', () => {
  it('bundles 180 simplified world countries with strictly unique IDs (no duplicate -99 keys) and valid [lon, lat] rings', () => {
    assert.ok(WORLD_COUNTRIES_LITE.length >= 170, `Expected >= 170 countries, got ${WORLD_COUNTRIES_LITE.length}`)
    const ids = WORLD_COUNTRIES_LITE.map((c) => c.id)
    const uniqueIds = new Set(ids)
    assert.equal(uniqueIds.size, ids.length, 'Every country in WORLD_COUNTRIES_LITE must have a strictly unique id to prevent Vue v-for duplicate key DOM leaks')
    assert.equal(ids.includes('-99'), false, 'WORLD_COUNTRIES_LITE must not contain Natural Earth placeholder id "-99"')

    const poland = WORLD_COUNTRIES_LITE.find((c) => c.id === 'POL' || c.name === 'Poland')
    const chad = WORLD_COUNTRIES_LITE.find((c) => c.id === 'TCD' || c.name === 'Chad')
    const russia = WORLD_COUNTRIES_LITE.find((c) => c.id === 'RUS' || c.name === 'Russia')
    assert.ok(poland, 'Expected Poland in WORLD_COUNTRIES_LITE')
    assert.ok(chad, 'Expected Chad in WORLD_COUNTRIES_LITE')
    assert.ok(russia, 'Expected Russia in WORLD_COUNTRIES_LITE')
    assert.ok(poland.rings.length >= 1 && poland.rings[0].length >= 4)
  })

  it('NanoGlobe.vue implements orthographic projection, horizon clipping, cartographic graticule, and HEALPix tessellation', () => {
    const src = readFileSync(resolve(ROOT, 'src/components/NanoGlobe.vue'), 'utf8')
    assert.ok(src.includes('clipSphericalRingToHorizon'), 'Must clip spherical rings against orthographic horizon z >= 0')
    assert.ok(src.includes('graticulePathD'), 'Must render cartographic graticule')
    assert.ok(src.includes('healpixCells'), 'Must render HEALPix equal-area spherical grid')
    assert.ok(src.includes('teal-coral'), 'Must provide teal-coral preset matching reference screenshot')
    assert.equal(src.includes(':global('), false, 'Must not use :global() prefix inside <style scoped>')
  })

  it('prevents Chromium SVG dirty-rect ghost triangles during pointer drag', () => {
    const src = readFileSync(resolve(ROOT, 'src/components/NanoGlobe.vue'), 'utf8')
    assert.equal(
      src.includes('<feDropShadow'),
      false,
      'Must not use SVG feDropShadow filter on moving country paths (causes Blink partial dirty-rect ghosting)'
    )
    assert.ok(
      src.includes('nano-globe-country-glow'),
      'Must render pure vector glow underlay for selected countries'
    )
    assert.ok(
      src.includes('flushPendingDrag') && src.includes('requestAnimationFrame'),
      'Must coalesce pointermove updates via requestAnimationFrame'
    )
    assert.ok(
      src.includes(':data-view='),
      'Must include full-viewport SVG paint invalidator bound to rotation and preset'
    )
  })

  it('splits multi-crossing concave rings into separate closed sub-polygons without false bay chords', () => {
    // Synthetic U-shaped concave polygon with two peninsulas in front of horizon (z > 0)
    // and the bay + mainland bridge behind the horizon (z < 0).
    const concavePts = [
      // Mainland behind horizon (z < 0)
      { x: -0.7, y: 0.7, z: -0.2 },
      // Peninsula 1 enters visible hemisphere (z > 0)
      { x: -0.6, y: 0.6, z: 0.25 },
      { x: -0.5, y: 0.5, z: 0.35 },
      // Dips back into bay behind horizon (z < 0)
      { x: 0.0, y: 0.98, z: -0.18 },
      // Peninsula 2 enters visible hemisphere (z > 0)
      { x: 0.5, y: 0.5, z: 0.35 },
      { x: 0.6, y: 0.6, z: 0.25 },
      // Returns to mainland behind horizon (z < 0)
      { x: 0.7, y: 0.7, z: -0.2 }
    ]

    const polys = clipSphericalRingToHorizon(concavePts)
    assert.equal(polys.length, 2, 'Two visible peninsulas separated by an invisible bay must produce 2 disjoint polygons')

    const svgD = camPolygonsToSvgPath(polys, 250, 250, 212)
    const subpathCount = (svgD.match(/M/g) || []).length
    assert.equal(subpathCount, 2, 'Must emit 2 independent M...Z subpaths')

    // Peninsula 1 must stay entirely on x < 0, Peninsula 2 must stay entirely on x > 0 (never bridging across x = 0)
    assert.ok(polys[0].every((p) => p.x < -0.1), 'Peninsula 1 polygon must remain on left side without crossing bay')
    assert.ok(polys[1].every((p) => p.x > 0.1), 'Peninsula 2 polygon must remain on right side without crossing bay')
  })

  it('correctly detects Antarctica south-polar ring and closes its limb along the southern hemisphere', () => {
    const ata = WORLD_COUNTRIES_LITE.find((c) => c.id === 'ATA')
    assert.ok(ata, 'Antarctica must exist in dataset')
    const mainRing = ata.rings[7]
    assert.equal(isSouthPolarRing(mainRing), true, 'Antarctica main ring must be detected as a South Polar ring')

    const dense = densifyRing(mainRing, 5)
    for (const lat0 of [-50, -25, 0, 20]) {
      const trig = makeTrig(0, lat0)
      const camPts = dense.map(([lon, lat]) => lonLatToCamVec3(lon, lat, trig))
      const polys = clipSphericalRingToHorizon(camPts, { isSouthPolar: true })
      for (const poly of polys) {
        for (const pt of poly) {
          assert.ok(pt.y <= 0.05, `Antarctica limb/interior point y=${pt.y} must remain in southern half at lat0=${lat0}`)
        }
      }
    }
  })

  it('clips all 180 countries across a 3D drag rotation sweep with zero out-of-bounds or NaN vertices', () => {
    const CX = 250
    const CY = 250
    const R = 212
    const prepared = WORLD_COUNTRIES_LITE.map((c) => ({
      id: c.id,
      rings: c.rings.map((r) => ({
        pts: densifyRing(r, 5),
        isSouthPolar: isSouthPolarRing(r)
      }))
    }))

    for (const lon0 of [-150, -75, 0, 75, 150]) {
      for (const lat0 of [-45, 0, 22, 55]) {
        const trig = makeTrig(lon0, lat0)
        for (const c of prepared) {
          for (const rObj of c.rings) {
            const camPts = rObj.pts.map(([lon, lat]) => lonLatToCamVec3(lon, lat, trig))
            const polys = clipSphericalRingToHorizon(camPts, { isSouthPolar: rObj.isSouthPolar })
            for (const poly of polys) {
              assert.ok(poly.length >= 3, `${c.id} clipped polygon must have >= 3 vertices`)
              for (const p of poly) {
                assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `${c.id} vertex must be finite`)
                const rad = Math.hypot(p.x, p.y)
                assert.ok(rad <= 1.0001, `${c.id} vertex radius ${rad} must lie within unit sphere disc`)
              }
            }
            const d = camPolygonsToSvgPath(polys, CX, CY, R)
            assert.equal(d.includes('NaN'), false, `${c.id} SVG path must never contain NaN`)
          }
        }
      }
    }
  })

  it('clips polylines cleanly at the z = 0 horizon limb via camPolylineToSvgPath', () => {
    const pts = [
      { x: -0.8, y: 0.0, z: -0.6 },
      { x: 0.0, y: 0.0, z: 1.0 },
      { x: 0.8, y: 0.0, z: -0.6 }
    ]
    const d = camPolylineToSvgPath(pts, 250, 250, 212)
    assert.ok(d.startsWith('M38.0,250.0L250.0,250.0L462.0,250.0'), `Unexpected polyline path: ${d}`)
  })

  it('supports injecting custom spherical overlay polygons (:polygons) and #svg-overlay slot for timezones and terminators', () => {
    const src = readFileSync(resolve(ROOT, 'src/components/NanoGlobe.vue'), 'utf8')
    assert.ok(src.includes('polygons: { type: Array'), 'NanoGlobe must accept :polygons prop')
    assert.ok(src.includes('renderedCustomPolygons'), 'NanoGlobe must compute horizon-clipped custom polygons')
    assert.ok(src.includes('name="svg-overlay"'), 'NanoGlobe must expose #svg-overlay scoped slot with projection helpers')
    assert.ok(src.includes('clipRingToSvgPath'), 'NanoGlobe must expose clipRingToSvgPath helper')
  })

  it('computes solar incidence cos(theta_z) via spherical law of cosines and builds gradient / line terminator primitives', () => {
    // At subsolar point (lat=20, lon=30), cos(theta_z) === 1
    assert.ok(Math.abs(computeSolarCosZenith(20, 30, 20, 30) - 1) < 1e-12)
    // At antisolar point (lat=-20, lon=-150), cos(theta_z) === -1
    assert.ok(Math.abs(computeSolarCosZenith(-20, -150, 20, 30) + 1) < 1e-12)
    // At 90 deg away on equator when sun is at (0, 0), cos(theta_z) === 0
    assert.ok(Math.abs(computeSolarCosZenith(0, 90, 0, 0)) < 1e-12)

    assert.equal(computeSolarIrradiance(0, 0, 0, 0), 1)
    assert.equal(computeSolarIrradiance(0, 180, 0, 0), 0)
    assert.equal(computeSolarTwilightOpacity(20, 0.5), 0)
    assert.equal(computeSolarTwilightOpacity(-30, 0.5), 0.5)
    const midOpacity = computeSolarTwilightOpacity(0, 0.5, 12, -24)
    assert.ok(midOpacity > 0.05 && midOpacity < 0.45)

    const trig = makeTrig(15, 25)
    const grad = buildSolarTerminatorSvgPrimitives([-25, 18], trig, { mode: 'gradient', bandCount: 16 })
    assert.ok(grad.bands.length >= 10)
    assert.equal(grad.lineD, '')

    const lineOnly = buildSolarTerminatorSvgPrimitives([-25, 18], trig, { mode: 'line' })
    assert.equal(lineOnly.bands.length, 0)
    assert.ok(lineOnly.lineD.startsWith('M'))

    const both = buildSolarTerminatorSvgPrimitives([-25, 18], trig, { mode: 'both', bandCount: 12 })
    assert.ok(both.bands.length >= 8)
    assert.ok(both.lineD.startsWith('M'))
  })

  it('supports radial atmosphere halo gradient (100% at surface to 0% outward), autoRotateTurnsPerSec, and drag kinetic feedback guard', () => {
    const src = readFileSync(resolve(ROOT, 'src/components/NanoGlobe.vue'), 'utf8')
    assert.ok(
      src.includes('atmosphereMode') && src.includes('atmo-grad'),
      'NanoGlobe must support atmosphereMode ("ring" | "gradient") with radial gradient'
    )
    assert.ok(
      src.includes('offset="85.1%"') && src.includes('atmospherePeakOpacity') && src.includes('stop-opacity="0"'),
      'Atmosphere gradient must use Cubic ease-out Rayleigh decay from Earth surface (r=212/249 ≈ 85.1%) fading to 0% at outer edge'
    )
    assert.ok(
      src.includes('autoRotateTurnsPerSec') && src.includes('* 360'),
      'NanoGlobe must support autoRotateTurnsPerSec converting turns/sec to 360 deg/sec'
    )
    assert.ok(
      src.includes('if (isDragging.value) return') && src.includes('preparedHealpixWorldCells'),
      'NanoGlobe must guard props.center watcher during drag and precompute world-space HEALPix & country vectors'
    )
    assert.ok(
      src.includes('speedKinetic = createKineticTransition') && src.includes('ensureAutoRotateLoop'),
      'NanoGlobe must interpolate angular velocity via C1 Hermite speedKinetic without resetting RAF dt on slider updates'
    )
    assert.ok(
      src.includes('var(--nano-bg-card') && src.includes('var(--nano-text-secondary'),
      'NanoGlobe HUD pills must use Nano UI SSoT light/dark theme variables instead of hardcoded dark slate'
    )
  })

  it('builds 24 Spherical Vector-Spine timezone bands (Clear 15° vs Complicated IANA) with unit vectors and SLERP morphing', () => {
    assert.equal(TIMEZONE_SPINE_LAT_KNOTS.length, 19)
    assert.ok(Array.isArray(POLITICAL_TIMEZONE_SPINE_DELTAS[8]))

    const u = lonLatToWorldUnitVec3(0, 0)
    const v = lonLatToWorldUnitVec3(90, 0)
    const mid = slerpWorldUnitVec3(u, v, 0.5)
    const midNorm = Math.hypot(mid.wx, mid.wy, mid.wz)
    assert.ok(Math.abs(midNorm - 1) < 1e-12, 'SLERP midpoint must lie strictly on unit sphere S^2')

    const clearSpine7 = buildTimezoneBoundarySpineVec3(7, 0)
    const complicatedSpine7 = buildTimezoneBoundarySpineVec3(7, 1)
    assert.equal(clearSpine7.length, 19)
    assert.equal(complicatedSpine7.length, 19)
    // Western China knot (index 5 -> 43 deg N, delta -38.7 deg) shifts west in complicated mode
    assert.notDeepEqual(clearSpine7[5], complicatedSpine7[5])

    const clearBands = buildSphericalTimezoneBands({ mode: 'clear', activeOffsetHours: 1 })
    const compBands = buildSphericalTimezoneBands({ mode: 'complicated', activeOffsetHours: 8 })
    assert.equal(clearBands.length, 24)
    assert.equal(compBands.length, 24)
    // With 2 Chaikin corner-cutting passes on 19 knots -> 76 points per spine -> 152 per closed band ring
    assert.ok(clearBands[0].worldRings && clearBands[0].worldRings[0].length === 152)
    assert.equal(clearBands[0].smoothBezier, true)
    assert.equal(clearBands[0].dashed, false)

    const src = readFileSync(resolve(ROOT, 'src/components/NanoGlobe.vue'), 'utf8')
    assert.ok(src.includes('showTimezones') && src.includes('timezoneMode'), 'NanoGlobe must expose showTimezones and timezoneMode props')
    assert.ok(src.includes('buildSphericalTimezoneBands'), 'NanoGlobe must use Spherical Vector-Spine timezone generator')
  })

  it('guarantees zero topological self-intersections (strictly monotonic westLon < eastLon) across all 24 timezone bands and Chaikin-smoothed spines', () => {
    for (let i = 0; i < TIMEZONE_SPINE_LAT_KNOTS.length; i++) {
      const lat = TIMEZONE_SPINE_LAT_KNOTS[i]
      let prevLon = -12 * 15 + 7.5
      for (let b = -11; b <= 12; b++) {
        const base = b * 15 + 7.5
        const d = (POLITICAL_TIMEZONE_SPINE_DELTAS[String(b)] || [])[i] || 0
        const lon = base + d
        assert.ok(
          lon > prevLon + 1.0,
          `Band UTC${b >= 0 ? '+' + b : b} must have strictly positive width (> 1 deg) at lat=${lat}, got west=${prevLon.toFixed(2)} >= east=${lon.toFixed(2)}`
        )
        prevLon = lon
      }
    }

    // Verify Chaikin subdivision preserves polar endpoints and increases resolution 19 -> 38 -> 76
    const rawPts = TIMEZONE_SPINE_LAT_KNOTS.map((lat, idx) => [-52.5 + (POLITICAL_TIMEZONE_SPINE_DELTAS['-4'][idx] || 0), lat])
    const sub2 = smoothTimezoneBoundarySpineLonLat(rawPts, 2)
    assert.equal(sub2.length, 76)
    assert.deepEqual(sub2[0], rawPts[0])
    assert.deepEqual(sub2[sub2.length - 1], rawPts[rawPts.length - 1])
  })

  it('fades labels smoothly over 1-2% of a full turn via easeInOutCubic and renders Quadratic Bezier (Q) & variable-width spherical ribbons', () => {
    assert.equal(easeInOutCubic(0), 0)
    assert.equal(easeInOutCubic(0.5), 0.5)
    assert.equal(easeInOutCubic(1), 1)

    const minZ = Math.sin(10 * DEG2RAD)
    // Below threshold -> 0
    assert.equal(computeSphericalLabelOpacity(Math.sin(9.9 * DEG2RAD), { minZ, fadeTurns: 0.015 }), 0)
    // At +0.75% of a turn (+2.7 deg above 10 deg -> 12.7 deg), progress is 0.5 -> easeInOutCubic(0.5) === 0.5
    const midOp = computeSphericalLabelOpacity(Math.sin(12.7 * DEG2RAD), { minZ, fadeTurns: 0.015 })
    assert.ok(Math.abs(midOp - 0.5) < 1e-6, `Expected 0.5 opacity at midpoint of 1.5% turn window, got ${midOp}`)
    // At +1.5% of a turn (+5.4 deg above 10 deg -> 15.4 deg), opacity reaches 1
    const fullOp = computeSphericalLabelOpacity(Math.sin(15.5 * DEG2RAD), { minZ, fadeTurns: 0.015 })
    assert.equal(fullOp, 1)

    // Quadratic Bezier (Q) path generation on visible interior vertices
    const samplePoly = [
      { x: -0.2, y: -0.2, z: 0.8, cornerPin: true },
      { x: -0.15, y: 0.0, z: 0.85 },
      { x: -0.18, y: 0.2, z: 0.8 },
      { x: 0.2, y: 0.2, z: 0.8, cornerPin: true },
      { x: 0.15, y: 0.0, z: 0.85 },
      { x: 0.18, y: -0.2, z: 0.8 }
    ]
    const bezierD = camPolygonToSvgPath(samplePoly, 250, 250, 212, { smoothBezier: true })
    assert.ok(bezierD.includes('Q'), `Expected Quadratic Bezier Q commands in path: ${bezierD}`)

    // Variable-width spherical ribbon polygon
    const ribbon = buildSphericalVariableWidthLinePolygon(
      [
        [-80, 25, 0.5],
        [-50, 42, 3.2],
        [-10, 54, 1.0]
      ],
      { id: 'test-gulf-stream', label: 'GULF STREAM' }
    )
    assert.equal(ribbon.id, 'test-gulf-stream')
    assert.ok(Array.isArray(ribbon.worldRings) && ribbon.worldRings[0].length >= 20)
    assert.equal(ribbon.smoothBezier, true)
  })
})
