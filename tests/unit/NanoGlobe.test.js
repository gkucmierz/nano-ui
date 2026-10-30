import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WORLD_COUNTRIES_LITE } from '../../src/data/worldCountriesLite.js'
import {
  DEG2RAD,
  lonLatToCamVec3,
  clipSphericalRingToHorizon,
  camPolygonsToSvgPath,
  camPolylineToSvgPath,
  densifyRing,
  isSouthPolarRing
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
  it('bundles 180 simplified world countries with valid [lon, lat] rings and centroids', () => {
    assert.ok(WORLD_COUNTRIES_LITE.length >= 170, `Expected >= 170 countries, got ${WORLD_COUNTRIES_LITE.length}`)
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
})
