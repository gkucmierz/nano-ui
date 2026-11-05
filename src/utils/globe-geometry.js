export const DEG2RAD = Math.PI / 180
export const RAD2DEG = 180 / Math.PI

/**
 * Projects geographic (lon, lat) in degrees to camera-space unit sphere (x, y, z),
 * where +z faces the viewer, +x is right, +y is up.
 */
export function lonLatToCamVec3(lon, lat, trig) {
  const phi = lat * DEG2RAD
  const dLam = lon * DEG2RAD - trig.lon0
  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)
  const cosLam = Math.cos(dLam)
  const sinLam = Math.sin(dLam)

  const x = cosPhi * sinLam
  const y = trig.cosLat0 * sinPhi - trig.sinLat0 * cosPhi * cosLam
  const z = trig.sinLat0 * sinPhi + trig.cosLat0 * cosPhi * cosLam
  return { x, y, z }
}

/**
 * Rotates a world unit-sphere vector (wx, wy, wz) where:
 * wx = cos(lat)*cos(lon), wy = cos(lat)*sin(lon), wz = sin(lat)
 * into camera-space (x, y, z) where +z faces the viewer.
 */
export function worldVec3ToCamVec3(wx, wy, wz, trig) {
  const sinLon0 = trig.sinLon0 !== undefined ? trig.sinLon0 : Math.sin(trig.lon0)
  const cosLon0 = trig.cosLon0 !== undefined ? trig.cosLon0 : Math.cos(trig.lon0)
  const rx = wx * cosLon0 + wy * sinLon0
  const ry = -wx * sinLon0 + wy * cosLon0
  const rz = wz

  const x = ry
  const y = trig.cosLat0 * rz - trig.sinLat0 * rx
  const z = trig.sinLat0 * rz + trig.cosLat0 * rx
  return { x, y, z }
}

function interpolateHorizonIntersection(prev, curr) {
  const denom = prev.z - curr.z
  const t = Math.abs(denom) > 1e-12 ? prev.z / denom : 0.5
  let ix = prev.x + t * (curr.x - prev.x)
  let iy = prev.y + t * (curr.y - prev.y)
  const len = Math.hypot(ix, iy)
  if (len > 1e-9) {
    ix /= len
    iy /= len
  }
  return { x: ix, y: iy, z: 0 }
}

/**
 * Clips a 3D spherical polygon ring against the orthographic horizon plane z >= 0.
 * Returns an array of closed polygon point-arrays (`Array<Array<{x, y, z}>>`).
 *
 * When a concave ring crosses the horizon multiple times (e.g. two peninsulas visible
 * while the bay between them is on the back hemisphere z < 0), each contiguous visible
 * segment [entry -> ... -> exit] is closed independently along its limb arc back to its
 * own entry point so that separate visible peninsulas never connect across the bay or
 * produce self-intersecting triangle artifacts.
 */
export function clipSphericalRingToHorizon(pts, options = {}) {
  if (!pts || pts.length < 3) return []

  const n = pts.length
  let anyVisible = false
  let allVisible = true
  let firstInvisibleIdx = -1

  for (let i = 0; i < n; i++) {
    if (pts[i].z >= 0) {
      anyVisible = true
    } else {
      allVisible = false
      if (firstInvisibleIdx === -1) firstInvisibleIdx = i
    }
  }

  if (!anyVisible) return []
  if (allVisible) return [pts]

  const isSouthPolar = Boolean(options.isSouthPolar)
  const interiorCam = options.interiorCam || null
  const polygons = []
  let currentSeg = null

  for (let step = 0; step < n; step++) {
    const prevIdx = (firstInvisibleIdx + step) % n
    const currIdx = (firstInvisibleIdx + step + 1) % n
    const prev = pts[prevIdx]
    const curr = pts[currIdx]
    const prevIn = prev.z >= 0
    const currIn = curr.z >= 0

    if (!prevIn && currIn) {
      const entryPt = interpolateHorizonIntersection(prev, curr)
      currentSeg = [entryPt, { x: curr.x, y: curr.y, z: curr.z }]
    } else if (prevIn && currIn) {
      if (currentSeg) {
        currentSeg.push({ x: curr.x, y: curr.y, z: curr.z })
      }
    } else if (prevIn && !currIn) {
      if (currentSeg) {
        const exitPt = interpolateHorizonIntersection(prev, curr)
        currentSeg.push(exitPt)

        const entryPt = currentSeg[0]
        const a1 = Math.atan2(exitPt.y, exitPt.x)
        const a2 = Math.atan2(entryPt.y, entryPt.x)
        let da = a2 - a1
        while (da > Math.PI) da -= 2 * Math.PI
        while (da < -Math.PI) da += 2 * Math.PI

        if (interiorCam) {
          const aMid = a1 + da * 0.5
          const dot = Math.cos(aMid) * interiorCam.x + Math.sin(aMid) * interiorCam.y
          if (dot < 0) {
            da = da > 0 ? da - 2 * Math.PI : da + 2 * Math.PI
          }
        } else if (isSouthPolar && Math.sin(a1 + da * 0.5) > 0) {
          da = da > 0 ? da - 2 * Math.PI : da + 2 * Math.PI
        }

        const arcSteps = Math.max(2, Math.ceil((Math.abs(da) * 28) / Math.PI))
        for (let s = 1; s < arcSteps; s++) {
          const a = a1 + (da * s) / arcSteps
          currentSeg.push({ x: Math.cos(a), y: Math.sin(a), z: 0 })
        }

        if (currentSeg.length >= 3) {
          polygons.push(currentSeg)
        }
        currentSeg = null
      }
    }
  }

  return polygons
}

/**
 * Backwards-compatible helper returning a flat single polygon array (or first segment)
 * while `clipSphericalRingToHorizon` returns all disjoint visible segments.
 */
export function clipSphericalPolygonToHorizon(pts, options = {}) {
  const polys = clipSphericalRingToHorizon(pts, options)
  if (polys.length === 0) return []
  if (polys.length === 1) return polys[0]
  return polys.flat()
}

export function easeInOutCubic(t) {
  const x = Math.max(0, Math.min(1, Number(t) || 0))
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

/**
 * Computes smooth label opacity in [0, 1] as a point on the sphere rotates across
 * its minimum visibility threshold `minZ`, emerging and hiding over `fadeTurns`
 * (default 0.015 = 1.5% of a full 360-degree turn = 5.4 degrees) with an `ease-in-out` curve.
 */
export function computeSphericalLabelOpacity(camZ, options = {}) {
  const z = Number(camZ)
  if (!Number.isFinite(z)) return 0
  const minZ = Math.max(-0.99, Math.min(0.99, Number(options.minZ ?? 0.2)))
  if (z <= minZ) return 0
  const fadeTurns = Math.max(0.002, Math.min(0.15, Number(options.fadeTurns ?? 0.015)))
  const fadeSpanDeg = fadeTurns * 360
  const elevDeg = Math.asin(Math.max(-1, Math.min(1, z))) * RAD2DEG
  const minElevDeg = Math.asin(minZ) * RAD2DEG
  const progress = Math.max(0, Math.min(1, (elevDeg - minElevDeg) / fadeSpanDeg))
  return easeInOutCubic(progress)
}

/**
 * Converts a 3D camera-space polygon into an SVG path (`M...L...Z` or reversal-invariant
 * Midpoint Quadratic Bezier `M...Q...Z` when `options.smoothBezier` is enabled).
 * Because Midpoint Quadratic B-Spline (`Q V_i M_{i,i+1}`) depends symmetrically on
 * adjacent vertex pairs, shared boundaries traversed in opposite directions produce
 * the exact same locus of points without cracks or overlaps.
 */
export function camPolygonToSvgPath(pts, cx = 250, cy = 250, r = 212, options = {}) {
  if (!pts || pts.length < 3) return ''
  const n = pts.length
  if (!options.smoothBezier || n < 5) {
    let d = ''
    for (let i = 0; i < n; i++) {
      const sx = (cx + pts[i].x * r).toFixed(1)
      const sy = (cy - pts[i].y * r).toFixed(1)
      d += (i === 0 ? 'M' : 'L') + sx + ',' + sy
    }
    return d + 'Z'
  }

  // Screen coordinates and symmetric vertex smoothability predicate
  const sx = new Float64Array(n)
  const sy = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    sx[i] = cx + pts[i].x * r
    sy[i] = cy - pts[i].y * r
  }

  const maxCornerEdgePx = options.maxCornerEdgePx ?? r * 0.42
  const canSmooth = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const prev = (i - 1 + n) % n
    const next = (i + 1) % n
    // Keep horizon-clipped limb vertices (z <= 0.005) and Explicit corner pins sharp
    if (
      pts[i].cornerPin ||
      pts[prev].z <= 0.005 ||
      pts[i].z <= 0.005 ||
      pts[next].z <= 0.005
    ) {
      canSmooth[i] = 0
      continue
    }
    const d1 = Math.hypot(sx[i] - sx[prev], sy[i] - sy[prev])
    const d2 = Math.hypot(sx[next] - sx[i], sy[next] - sy[i])
    canSmooth[i] = d1 > 0.4 && d2 > 0.4 && d1 <= maxCornerEdgePx && d2 <= maxCornerEdgePx ? 1 : 0
  }

  // Reversal-invariant Midpoint Quadratic Bezier (`Q`) path builder
  const startX = canSmooth[0] ? 0.5 * (sx[n - 1] + sx[0]) : sx[0]
  const startY = canSmooth[0] ? 0.5 * (sy[n - 1] + sy[0]) : sy[0]
  let d = `M${startX.toFixed(1)},${startY.toFixed(1)}`

  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n
    if (canSmooth[i]) {
      const mx = 0.5 * (sx[i] + sx[next])
      const my = 0.5 * (sy[i] + sy[next])
      d += `Q${sx[i].toFixed(1)},${sy[i].toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`
      if (!canSmooth[next]) {
        d += `L${sx[next].toFixed(1)},${sy[next].toFixed(1)}`
      }
    } else {
      if (canSmooth[next]) {
        const mx = 0.5 * (sx[i] + sx[next])
        const my = 0.5 * (sy[i] + sy[next])
        d += `L${mx.toFixed(1)},${my.toFixed(1)}`
      } else {
        d += `L${sx[next].toFixed(1)},${sy[next].toFixed(1)}`
      }
    }
  }
  return d + 'Z'
}

export function camPolygonsToSvgPath(polygons, cx = 250, cy = 250, r = 212, options = {}) {
  if (!polygons || !polygons.length) return ''
  let d = ''
  for (let i = 0; i < polygons.length; i++) {
    d += camPolygonToSvgPath(polygons[i], cx, cy, r, options)
  }
  return d
}

/**
 * Clips a 3D camera-space polyline against the horizon z >= 0,
 * interpolating exact endpoints at z = 0 so lines terminate cleanly on the limb.
 */
export function camPolylineToSvgPath(pts, cx = 250, cy = 250, r = 212) {
  if (!pts || pts.length < 2) return ''
  let d = ''
  let open = false

  for (let i = 0; i < pts.length; i++) {
    const curr = pts[i]
    const prev = i > 0 ? pts[i - 1] : null
    const currIn = curr.z >= 0
    const prevIn = prev ? prev.z >= 0 : false

    if (prev && currIn !== prevIn) {
      const hit = interpolateHorizonIntersection(prev, curr)
      const hx = (cx + hit.x * r).toFixed(1)
      const hy = (cy - hit.y * r).toFixed(1)
      d += (open ? 'L' : 'M') + hx + ',' + hy
      open = currIn
    }

    if (currIn) {
      const sx = (cx + curr.x * r).toFixed(1)
      const sy = (cy - curr.y * r).toFixed(1)
      d += (open ? 'L' : 'M') + sx + ',' + sy
      open = true
    } else {
      open = false
    }
  }
  return d
}

/**
 * Subdivides long geographic polygon edges so large countries (Russia, Antarctica, Canada)
 * follow spherical curvature accurately along the horizon.
 */
export function densifyRing(ring, maxDegStep = 5) {
  const out = []
  const n = ring.length
  for (let i = 0; i < n; i++) {
    const [lon1, lat1] = ring[i]
    const [lon2, lat2] = ring[(i + 1) % n]
    out.push([lon1, lat1])
    let dLon = lon2 - lon1
    if (dLon > 180) dLon -= 360
    if (dLon < -180) dLon += 360
    const dLat = lat2 - lat1
    const dist = Math.hypot(dLon, dLat)
    if (dist > maxDegStep && Math.abs(dLon) < 170) {
      const steps = Math.min(32, Math.ceil(dist / maxDegStep))
      for (let s = 1; s < steps; s++) {
        const t = s / steps
        let lon = lon1 + dLon * t
        if (lon > 180) lon -= 360
        if (lon < -180) lon += 360
        out.push([lon, lat1 + dLat * t])
      }
    }
  }
  return out
}

/**
 * Detects whether a geographic ring encircles the South Pole (e.g. Antarctica main ring).
 */
export function isSouthPolarRing(ring) {
  if (!ring || ring.length < 10) return false
  let totalDLon = 0
  let latSum = 0
  for (let i = 0; i < ring.length; i++) {
    const [lon1, lat1] = ring[i]
    const [lon2] = ring[(i + 1) % ring.length]
    let d = lon2 - lon1
    if (d > 180) d -= 360
    if (d < -180) d += 360
    totalDLon += d
    latSum += lat1
  }
  const avgLat = latSum / ring.length
  return Math.abs(totalDLon) > 300 && avgLat < -50
}

/**
 * Computes the cosine of the solar zenith angle (cos theta_z = sin h_sun)
 * at geographic coordinates (latDeg, lonDeg) for a given subsolar point (sunLatDeg, sunLonDeg)
 * using the spherical law of cosines:
 *   cos(theta_z) = sin(lat)*sin(sunLat) + cos(lat)*cos(sunLat)*cos(lon - sunLon)
 */
export function computeSolarCosZenith(latDeg, lonDeg, sunLatDeg, sunLonDeg) {
  const phi = Number(latDeg) * DEG2RAD
  const delta = Number(sunLatDeg) * DEG2RAD
  const dLam = (Number(lonDeg) - Number(sunLonDeg)) * DEG2RAD
  const cosZ = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(dLam)
  return Math.max(-1, Math.min(1, cosZ))
}

/**
 * Computes normalized solar irradiance I in [0, 1] at (latDeg, lonDeg) combining
 * Lambert's cosine law (max(0, cos theta_z)) with atmospheric twilight scattering
 * across civil (-6 deg), nautical (-12 deg), and astronomical (-18 deg) twilight.
 */
export function computeSolarIrradiance(latDeg, lonDeg, sunLatDeg, sunLonDeg) {
  const cosZ = computeSolarCosZenith(latDeg, lonDeg, sunLatDeg, sunLonDeg)
  const sinNeg18 = Math.sin(-18 * DEG2RAD)
  if (cosZ <= sinNeg18) return 0
  if (cosZ >= 0) {
    // Direct Lambertian cosine irradiance + subtle atmospheric airmass softening near horizon
    const twilightBoost = 0.06 * Math.exp(-cosZ * 6)
    return Math.min(1, cosZ + twilightBoost * (1 - cosZ))
  }
  // Smooth raised-cosine atmospheric scattering decay across twilight (0 deg down to -18 deg)
  const u = (cosZ - sinNeg18) / (0 - sinNeg18)
  const smooth = 0.5 * (1 - Math.cos(Math.PI * u))
  return 0.06 * smooth
}

/**
 * Computes the target shadow opacity sigma(h_sun) in [0, maxOpacity] from solar altitude angle h_sun (degrees)
 * using a C1-continuous trigonometric raised-cosine (Hann) profile over sin(h_sun) = cos(theta_z).
 */
export function computeSolarTwilightOpacity(
  solarAltitudeDeg,
  maxOpacity = 0.52,
  dayStartDeg = 12,
  nightEndDeg = -24
) {
  const cosZ = Math.sin(Number(solarAltitudeDeg) * DEG2RAD)
  const muDay = Math.sin(Number(dayStartDeg) * DEG2RAD)
  const muNight = Math.sin(Number(nightEndDeg) * DEG2RAD)
  if (cosZ >= muDay) return 0
  if (cosZ <= muNight) return maxOpacity
  const t = (muDay - cosZ) / (muDay - muNight)
  const s = Math.sin(0.5 * Math.PI * Math.max(0, Math.min(1, t)))
  return maxOpacity * s * s
}

const UNIT_CIRCLE_CACHE = new Map()

function getUnitCircleLut(steps) {
  let lut = UNIT_CIRCLE_CACHE.get(steps)
  if (!lut) {
    lut = new Array(steps)
    for (let i = 0; i < steps; i++) {
      const beta = (2 * Math.PI * i) / steps
      lut[i] = { cb: Math.cos(beta), sb: Math.sin(beta) }
    }
    UNIT_CIRCLE_CACHE.set(steps, lut)
  }
  return lut
}

function computeOrthonormalBasis(centerCam) {
  const ax = centerCam.x
  const ay = centerCam.y
  const az = centerCam.z
  const hx = Math.abs(az) < 0.9 ? 0 : 1
  const hy = 0
  const hz = Math.abs(az) < 0.9 ? 1 : 0
  let ux = hy * az - hz * ay
  let uy = hz * ax - hx * az
  let uz = hx * ay - hy * ax
  const uLen = Math.hypot(ux, uy, uz) || 1
  ux /= uLen
  uy /= uLen
  uz /= uLen
  const vx = ay * uz - az * uy
  const vy = az * ux - ax * uz
  const vz = ax * uy - ay * ux
  return { ax, ay, az, ux, uy, uz, vx, vy, vz }
}

/**
 * Generates 3D camera-space unit vectors along a small circle of angular radius `alphaDeg`
 * around unit camera vector `centerCam = { x, y, z }`.
 */
export function buildSphericalSmallCircleCamPts(centerCam, alphaDeg, steps = 72, precomputedBasis = null) {
  const basis = precomputedBasis || computeOrthonormalBasis(centerCam)
  const { ax, ay, az, ux, uy, uz, vx, vy, vz } = basis

  const alpha = Number(alphaDeg) * DEG2RAD
  const cosA = Math.cos(alpha)
  const sinA = Math.sin(alpha)
  const lut = getUnitCircleLut(steps)
  const pts = new Array(steps)

  for (let i = 0; i < steps; i++) {
    const { cb, sb } = lut[i]
    pts[i] = {
      x: cosA * ax + sinA * (cb * ux + sb * vx),
      y: cosA * ay + sinA * (cb * uy + sb * vy),
      z: cosA * az + sinA * (cb * uz + sb * vz)
    }
  }
  return pts
}

/**
 * Builds an exact orthographic SVG `<path d="...">` (and `fillRule`) for a spherical cap
 * centered at `(antiLonDeg, antiLatDeg)` with angular radius `alphaDeg` in (0, 180),
 * clipped against the visible hemisphere z >= 0.
 */
export function buildSphericalCapSvgPath(
  antiLonDeg,
  antiLatDeg,
  alphaDeg,
  trig,
  cx = 250,
  cy = 250,
  r = 212,
  steps = 72,
  precomputedCenterCam = null,
  precomputedBasis = null
) {
  const centerCam = precomputedCenterCam || lonLatToCamVec3(antiLonDeg, antiLatDeg, trig)
  const pts = buildSphericalSmallCircleCamPts(centerCam, alphaDeg, steps, precomputedBasis)

  let anyVisible = false
  let allVisible = true
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].z >= 0) anyVisible = true
    else allVisible = false
  }

  const fullDiscD = `M${(cx + r).toFixed(1)},${cy.toFixed(1)}A${r},${r} 0 1,0 ${(cx - r).toFixed(1)},${cy.toFixed(1)}A${r},${r} 0 1,0 ${(cx + r).toFixed(1)},${cy.toFixed(1)}Z`

  if (!anyVisible) {
    // Boundary circle is completely behind the horizon (z < 0).
    // If the cap center is facing the viewer (z > 0) and alpha > 90 deg, the cap covers 100% of the visible disc.
    if (centerCam.z > 0 && alphaDeg > 90) {
      return { d: fullDiscD, fillRule: 'nonzero' }
    }
    return { d: '', fillRule: 'nonzero' }
  }

  if (allVisible) {
    // Boundary circle is completely on the front hemisphere (z >= 0).
    const ringD = camPolygonToSvgPath(pts, cx, cy, r)
    if (centerCam.z >= 0 && alphaDeg <= 90) {
      // Closed night oval on the front hemisphere
      return { d: ringD, fillRule: 'nonzero' }
    }
    if (centerCam.z < 0 && alphaDeg > 90) {
      // Closed daylight hole on the front hemisphere; night cap is the surrounding annulus
      return { d: `${fullDiscD} ${ringD}`, fillRule: 'evenodd' }
    }
    return { d: ringD, fillRule: 'nonzero' }
  }

  const clipped = clipSphericalRingToHorizon(pts, { interiorCam: centerCam })
  return {
    d: clipped.length > 0 ? camPolygonsToSvgPath(clipped, cx, cy, r) : '',
    fillRule: 'nonzero'
  }
}

/**
 * Generates SVG primitives for the solar day/night terminator on NanoGlobe:
 * - `bands`: multi-step spherical iso-zenith caps with Porter-Duff differential alpha derived from
 *   Lambert's cosine law `cos(theta_z)` + twilight scattering
 * - `lineD`: horizon-clipped polyline along the geometric solar terminator (`cos(theta_z) = 0`, `alpha = 90 deg`)
 */
export function buildSolarTerminatorSvgPrimitives(subsolarPoint, trig, options = {}) {
  if (!Array.isArray(subsolarPoint) || subsolarPoint.length < 2) {
    return { bands: [], lineD: '' }
  }
  const sunLon = Number(subsolarPoint[0]) || 0
  const sunLat = Number(subsolarPoint[1]) || 0
  const antiLon = sunLon >= 0 ? sunLon - 180 : sunLon + 180
  const antiLat = -sunLat

  const mode = options.mode || 'gradient' // 'gradient' | 'line' | 'both'
  const cx = options.cx ?? 250
  const cy = options.cy ?? 250
  const r = options.r ?? 212
  const maxOpacity = options.maxOpacity ?? 0.5
  const bandCount = Math.max(4, Math.min(48, Number(options.bandCount) || 28))
  const dayStartDeg = options.dayStartDeg ?? 12
  const nightEndDeg = options.nightEndDeg ?? -24

  const centerCam = lonLatToCamVec3(antiLon, antiLat, trig)
  const basis = computeOrthonormalBasis(centerCam)

  const bands = []
  if (mode === 'gradient' || mode === 'both') {
    let prevCumulativeAlpha = 0
    for (let i = 1; i <= bandCount; i++) {
      const frac = i / bandCount
      const solarAltDeg = dayStartDeg + frac * (nightEndDeg - dayStartDeg)
      const alphaDeg = 90 + solarAltDeg // angular radius from antisolar pole
      const targetCumulativeAlpha = computeSolarTwilightOpacity(
        solarAltDeg,
        maxOpacity,
        dayStartDeg,
        nightEndDeg
      )
      // Exact Porter-Duff source-over incremental alpha so stacked caps composite to targetCumulativeAlpha
      const stepAlpha =
        prevCumulativeAlpha < 0.999
          ? Math.max(0, (targetCumulativeAlpha - prevCumulativeAlpha) / (1 - prevCumulativeAlpha))
          : 0
      prevCumulativeAlpha = targetCumulativeAlpha

      if (stepAlpha <= 0.0005) continue
      const { d, fillRule } = buildSphericalCapSvgPath(
        antiLon,
        antiLat,
        alphaDeg,
        trig,
        cx,
        cy,
        r,
        72,
        centerCam,
        basis
      )
      if (d) {
        bands.push({
          id: `twilight-band-${i}`,
          solarAltDeg: Number(solarAltDeg.toFixed(2)),
          alphaDeg: Number(alphaDeg.toFixed(2)),
          opacity: Number(stepAlpha.toFixed(4)),
          cumulativeOpacity: Number(targetCumulativeAlpha.toFixed(4)),
          d,
          fillRule
        })
      }
    }
  }

  let lineD = ''
  if (mode === 'line' || mode === 'both') {
    const circlePts = buildSphericalSmallCircleCamPts(centerCam, 90, 96, basis)
    circlePts.push(circlePts[0])
    lineD = camPolylineToSvgPath(circlePts, cx, cy, r)
  }

  return { bands, lineD }
}

/**
 * Converts geographic (lonDeg, latDeg) into a unit-sphere direction vector (wx, wy, wz)
 * originating from the center of the Earth (0, 0, 0).
 */
export function lonLatToWorldUnitVec3(lonDeg, latDeg) {
  const phi = Number(latDeg) * DEG2RAD
  const lam = Number(lonDeg) * DEG2RAD
  const cosPhi = Math.cos(phi)
  return {
    wx: cosPhi * Math.cos(lam),
    wy: cosPhi * Math.sin(lam),
    wz: Math.sin(phi)
  }
}

/**
 * Spherical Linear Interpolation (SLERP) between two unit-sphere vectors u, v in S^2
 * originating from the center of the sphere (0, 0, 0).
 */
export function slerpWorldUnitVec3(u, v, tau = 0) {
  const t = Math.max(0, Math.min(1, Number(tau) || 0))
  if (t <= 1e-6) return u
  if (t >= 1 - 1e-6) return v

  const dot = Math.max(-1, Math.min(1, u.wx * v.wx + u.wy * v.wy + u.wz * v.wz))
  const omega = Math.acos(dot)
  const sinOmega = Math.sin(omega)
  if (sinOmega < 1e-6) {
    return t < 0.5 ? u : v
  }
  const a = Math.sin((1 - t) * omega) / sinOmega
  const b = Math.sin(t * omega) / sinOmega
  return {
    wx: a * u.wx + b * v.wx,
    wy: a * u.wy + b * v.wy,
    wz: a * u.wz + b * v.wz
  }
}

/**
 * Shared latitude control knots (North -> South, 19 points) for spherical timezone boundary spines.
 * Adjacent timezone bands share the exact same boundary spine in reverse order, guaranteeing
 * zero topological gaps/slivers and cutting vertex storage by >95% compared to planar polygons.
 */
export const TIMEZONE_SPINE_LAT_KNOTS = Object.freeze([
  84, 74, 66, 58, 50, 43, 36, 28, 20, 12, 4, -4, -12, -22, -34, -46, -58, -72, -84
])

/**
 * Compact longitude deviation vectors (deltaLon in degrees relative to ideal nautical meridian
 * lambda_0 = offsetWest * 15 + 7.5) along TIMEZONE_SPINE_LAT_KNOTS for political IANA boundaries.
 * Zero entries correspond to oceans where legal boundaries follow nautical meridians.
 */
export const POLITICAL_TIMEZONE_SPINE_DELTAS = Object.freeze({
  // UTC-11 / UTC-10 (Bering Strait -169W / Aleutians / Hawaii / Polynesia bend)
  '-11': [0, 0, -11.5, -12, -8, 0, 0, 0, -3, -2, 0, -4, -5, -3, 0, 0, 0, 0, 0],
  // UTC-10 / UTC-9 (Alaska west coast -163W..-160.5W)
  '-10': [0, 0, -20.5, -18, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // UTC-9 / UTC-8 (Alaska / Yukon border at -141W vs ideal -127.5W)
  '-9': [0, -13.5, -13.5, -10.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // UTC-8 / UTC-7 (US/Canada Pacific vs Mountain)
  '-8': [0, -10, -12, -7.5, -2.5, -4.5, -2.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // UTC-7 / UTC-6 (US/Canada Mountain vs Central + Mexico)
  '-7': [0, -5, -7, -6, -1.5, -2.0, -0.5, -3.5, -6.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // UTC-6 / UTC-5 (US/Canada Central vs Eastern + Peru/Ecuador Pacific coast)
  '-6': [0, -3, -6, -4.5, -3.5, -3.0, -2.5, 0, -4.0, -2.0, -1.5, -2.0, -1.0, 0, 0, 0, 0, 0, 0],
  // UTC-5 / UTC-4 (US Eastern / Atlantic + Colombia/Venezuela + Chilean Pacific coast in UTC-4)
  '-5': [0, +6, +5, +4.5, 0, 0, 0, 0, +2.0, -2.5, -1.5, -2.5, -2.5, -4.0, -6.0, -7.5, -5.0, 0, 0],
  // UTC-4 / UTC-3 (Greenland / Guyana-Suriname / Brazil Amazon vs East / Chile-Argentina Andes border)
  '-4': [0, +6.0, +6.0, 0, 0, 0, 0, 0, -2.0, -5.0, -4.6, -5.5, -6.5, -12.0, -17.3, -18.5, -14.0, 0, 0],
  // UTC-3 / UTC-2 (Greenland / Mid-Atlantic)
  '-3': [0, +6.0, +5.5, +4.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // UTC-2 / UTC-1 (East Greenland / Scoresbysund / Azores West)
  '-2': [0, -3.5, -6.0, -1.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // UTC-1 / UTC+0 (West of Iceland -25W, West of Ireland/Portugal/Madeira/Canaries & West Africa coast -18W)
  '-1': [0, -12.5, -17.5, -5.0, -5.0, -7.0, -10.0, -11.0, -10.5, -10.5, -5.0, 0, 0, 0, 0, 0, 0, 0, 0],
  // UTC+0 / UTC+1 (Norwegian/North Sea, English Channel, Portugal/Spain -6.8W, Canary/Morocco -13.2W, Mali +3.5E, Togo/Benin +1.8E)
  '0': [0, -9.5, -9.5, -5.5, -9.0, -14.3, -14.0, -20.7, -8.5, -5.7, -4.5, 0, 0, 0, 0, 0, 0, 0, 0],
  // UTC+1 / UTC+2 (Sweden/Finland, Poland/Ukraine +23.8E, Balkans/Greece, Libya/Egypt, DRC/Namibia)
  '1': [0, +6.5, -1.5, -2.0, +1.4, -1.8, -2.5, +2.5, +2.5, +2.5, +5.5, +6.5, +1.5, -8.5, -6.0, 0, 0, 0, 0],
  // UTC+2 / UTC+3 (Finland/Baltics/Ukraine +38E vs Russia/Turkey permanent UTC+3, Red Sea)
  '2': [0, -4.5, -7.0, -9.3, +0.5, -6.0, -10.0, -3.0, -0.5, +4.5, +4.5, +2.0, +3.0, +10.0, 0, 0, 0, 0, 0],
  // UTC+3 / UTC+4 (European Russia vs Samara/Caucasus, Iran/Oman)
  '3': [0, 0, +4.5, +2.5, -4.5, -6.5, -5.0, -3.5, +4.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // UTC+4 / UTC+5 (Ural Russia / West Kazakhstan +51E / Pakistan)
  '4': [0, +4.0, +5.5, +4.0, -16.5, -11.5, -6.5, +0.5, +6.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // UTC+5 / UTC+6 (East Kazakhstan +84E / Kyrgyzstan +70E / Bangladesh +88E)
  '5': [0, +6.0, +6.5, +8.5, +1.5, -12.5, -8.5, +5.5, +4.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // UTC+6 / UTC+7 (Altai/Mongolia +90E / Tian Shan corridor / Myanmar)
  '6': [0, +3.5, +2.5, -3.5, -7.5, -23.0, -21.0, -3.5, +1.0, +1.5, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // UTC+7 / UTC+8 (Irkutsk, Unified China UTC+8 western surge to Xinjiang/Tibet +78E, Vietnam/SCS)
  '7': [0, -2.5, -6.5, -8.5, -14.5, -34.5, -33.5, -14.5, -5.5, -3.5, -7.5, -5.5, 0, +2.5, 0, 0, 0, 0, 0],
  // UTC+8 / UTC+9 (Yakutsk, China East border +134.5E vs Japan/Korea UTC+9, Indonesia Central/East, WA/NT Australia)
  '8': [0, -3.5, -5.5, -6.5, +7.0, +4.5, -1.5, -2.0, -2.5, +1.0, +1.5, +1.5, +1.5, +1.5, +1.5, 0, 0, 0, 0],
  // UTC+9 / UTC+10 (Vladivostok, Japan East, PNG/Queensland Australia)
  '9': [0, -4.5, -6.5, -3.5, -2.5, +3.5, +4.5, 0, 0, -1.5, -1.5, -1.5, -4.5, -4.5, -4.5, 0, 0, 0, 0],
  // UTC+10 / UTC+11 (Magadan/Sakhalin, Eastern Australia)
  '10': [0, -5.5, -7.5, -10.5, -12.5, -4.5, 0, 0, 0, 0, 0, 0, +2.5, +1.5, 0, 0, 0, 0, 0],
  // UTC+11 / UTC+12 (Kamchatka/Chukotka, New Zealand / Fiji)
  '11': [0, -12.5, -14.5, -12.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, +2.5, -6.5, -8.5, 0, 0, 0]
})

/**
 * Curated list of human political timezone anomalies for interactive educational telemetry.
 */
export const TIMEZONE_ANOMALY_HOTSPOTS = Object.freeze([
  {
    id: 'china-unified-utc8',
    titlePl: 'Chiny (1 strefa UTC+8 zamiast 5 słonecznych)',
    titleEn: 'China (Single UTC+8 across 5 solar zones)',
    lon: 86.0,
    lat: 38.0,
    offsetHours: 8,
    solarOffsetHours: 6,
    notePl: 'Na granicy z Afganistanem (UTC+4:30) zegarek przeskakuje o 3h 30m jednym krokiem.'
  },
  {
    id: 'spain-france-utc1',
    titlePl: 'Hiszpania & Francja (UTC+1 na południku Londynu)',
    titleEn: 'Spain & France (UTC+1 on Greenwich meridian)',
    lon: -3.7,
    lat: 40.4,
    offsetHours: 1,
    solarOffsetHours: 0,
    notePl: 'Vigo w Galicji (-8.7°W) leży słonecznie w UTC-1, a używa czasu środkowoeuropejskiego UTC+1.'
  },
  {
    id: 'argentina-utc-3',
    titlePl: 'Argentyna (UTC-3 mimo południka UTC-4/-5)',
    titleEn: 'Argentina (UTC-3 on UTC-4/-5 meridians)',
    lon: -64.0,
    lat: -34.0,
    offsetHours: -3,
    solarOffsetHours: -4,
    notePl: 'Zachodnia Argentyna pod Andami (-70°W) ma słoneczne południe dopiero około 13:40.'
  },
  {
    id: 'iceland-utc0',
    titlePl: 'Islandia (całoroczne UTC+0 na południku -22°W)',
    titleEn: 'Iceland (Year-round UTC+0 at -22°W)',
    lon: -19.0,
    lat: 64.9,
    offsetHours: 0,
    solarOffsetHours: -1,
    notePl: 'Geograficznie leży w UTC-1 / UTC-2, ale używa UTC+0 bez zmiany czasu.'
  }
])

/**
 * Subdivides a `[lon, lat]` meridian spine using Chaikin's corner-cutting B-spline algorithm
 * (`[0.75 * P_i + 0.25 * P_{i+1}, 0.25 * P_i + 0.75 * P_{i+1}]`) while preserving exact polar endpoints.
 * Because Chaikin subdivision is a positive convex operator with identical weights across all 24 spines,
 * adjacent timezone bands remain 100% watertight and strictly non-crossing (`westLon < eastLon`).
 */
export function smoothTimezoneBoundarySpineLonLat(lonLatPts, subdivisions = 2) {
  if (!Array.isArray(lonLatPts) || lonLatPts.length < 3 || subdivisions <= 0) {
    return lonLatPts || []
  }
  let curr = lonLatPts
  const passes = Math.min(4, Math.max(0, Math.floor(subdivisions)))
  for (let p = 0; p < passes; p++) {
    const n = curr.length
    const next = [curr[0]]
    for (let i = 0; i < n - 1; i++) {
      const a = curr[i]
      const b = curr[i + 1]
      next.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]])
      next.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]])
    }
    next.push(curr[n - 1])
    curr = next
  }
  return curr
}

const SPINE_VECTOR_CACHE = new Map()

function getPrecomputedBoundarySpinePair(westOffsetInt, subdivisions = 0) {
  const key = `${Number(westOffsetInt)}:${subdivisions}`
  let cached = SPINE_VECTOR_CACHE.get(key)
  if (cached) return cached

  const baseLon = Number(westOffsetInt) * 15 + 7.5
  const deltas = POLITICAL_TIMEZONE_SPINE_DELTAS[String(westOffsetInt)] || null
  const n0 = TIMEZONE_SPINE_LAT_KNOTS.length
  const rawSolarLonLat = new Array(n0)
  const rawPolitLonLat = new Array(n0)

  for (let i = 0; i < n0; i++) {
    const lat = TIMEZONE_SPINE_LAT_KNOTS[i]
    const dLon = deltas ? (Number(deltas[i]) || 0) : 0
    rawSolarLonLat[i] = [baseLon, lat]
    rawPolitLonLat[i] = [baseLon + dLon, lat]
  }

  const smoothSolar = smoothTimezoneBoundarySpineLonLat(rawSolarLonLat, subdivisions)
  const smoothPolit = smoothTimezoneBoundarySpineLonLat(rawPolitLonLat, subdivisions)
  const n = smoothSolar.length
  const solarVecs = new Array(n)
  const politicalVecs = new Array(n)

  for (let i = 0; i < n; i++) {
    const [sLon, sLat] = smoothSolar[i]
    const [pLon, pLat] = smoothPolit[i]
    const sVec = lonLatToWorldUnitVec3(sLon, sLat)
    const pVec = Math.abs(pLon - sLon) < 1e-6 ? sVec : lonLatToWorldUnitVec3(pLon, pLat)
    if (i === 0 || i === n - 1) {
      sVec.cornerPin = true
      if (pVec !== sVec) pVec.cornerPin = true
    }
    solarVecs[i] = sVec
    politicalVecs[i] = pVec
  }

  cached = { baseLon, solarVecs, politicalVecs }
  SPINE_VECTOR_CACHE.set(key, cached)
  return cached
}

/**
 * Computes the 3D unit-sphere boundary spine from North (+84 deg) to South (-84 deg)
 * between `UTC+(westOffsetInt)` and `UTC+(westOffsetInt + 1)` at morph factor `tau` in [0, 1]:
 * - `tau = 0`: pure Nautical / Solar 15-degree meridian (`Clear`)
 * - `tau = 1`: political IANA administrative boundary (`Complicated`)
 * - `0 < tau < 1`: smooth Spherical Linear Interpolation (SLERP) on unit sphere S^2
 */
export function buildTimezoneBoundarySpineVec3(westOffsetInt, tau = 0, options = {}) {
  const subdivisions = Math.max(0, Math.min(4, Math.floor(Number(options.subdivisions) || 0)))
  const { solarVecs, politicalVecs } = getPrecomputedBoundarySpinePair(westOffsetInt, subdivisions)
  const t = Math.max(0, Math.min(1, Number(tau) || 0))
  if (t <= 1e-6) return solarVecs
  if (t >= 1 - 1e-6) return politicalVecs

  const n = solarVecs.length
  const out = new Array(n)
  for (let i = 0; i < n; i++) {
    const v = slerpWorldUnitVec3(solarVecs[i], politicalVecs[i], t)
    if (solarVecs[i].cornerPin) v.cornerPin = true
    out[i] = v
  }
  return out
}

/**
 * Builds all 24 spherical timezone band polygons (`UTC-11` .. `UTC+12`) directly from
 * shared central unit-sphere vector spines (`worldRings`), avoiding redundant polygon vertices.
 */
export function buildSphericalTimezoneBands(options = {}) {
  const mode = String(options.mode || 'clear').toLowerCase()
  const morphTau =
    options.morph !== undefined && Number.isFinite(Number(options.morph))
      ? Math.max(0, Math.min(1, Number(options.morph)))
      : mode === 'complicated' || mode === 'political' || mode === 'iana'
        ? 1
        : 0

  const rawActive = Number.isFinite(Number(options.activeOffsetHours))
    ? Math.round(Number(options.activeOffsetHours))
    : 1
  const normalizedActive = rawActive === -12 ? 12 : rawActive
  const showLabels = options.showLabels !== false
  const subdivisions = options.subdivisions !== undefined ? Number(options.subdivisions) : 2

  // Pre-evaluate the 25 shared Chaikin-subdivided boundary spines for offset boundaries -12 .. +12
  const spines = new Map()
  for (let b = -12; b <= 12; b++) {
    spines.set(b, buildTimezoneBoundarySpineVec3(b, morphTau, { subdivisions }))
  }

  const bands = []
  for (let offset = -11; offset <= 12; offset++) {
    const isActive = offset === normalizedActive
    const westSpine = spines.get(offset - 1)
    const eastSpine = spines.get(offset)

    // Construct closed spherical ring from shared North->South westSpine and South->North eastSpine
    const worldRing = []
    for (let i = 0; i < westSpine.length; i++) {
      worldRing.push(westSpine[i])
    }
    for (let i = eastSpine.length - 1; i >= 0; i--) {
      worldRing.push(eastSpine[i])
    }

    const centerLon = offset * 15 > 180 ? offset * 15 - 360 : offset * 15
    const hue = ((offset + 12) * 15) % 360
    const isEven = ((offset + 12) & 1) === 0
    const fill = isActive
      ? `hsla(${hue}, 96%, 56%, 0.46)`
      : `hsla(${hue}, 88%, ${isEven ? 56 : 48}%, ${isEven ? 0.28 : 0.18})`
    const hoverFill = isActive
      ? `hsla(${hue}, 98%, 62%, 0.56)`
      : `hsla(${hue}, 94%, 60%, 0.42)`
    const stroke = isActive ? '#00f2fe' : `hsla(${hue}, 92%, 72%, 0.82)`
    const strokeWidth = isActive ? 2.6 : (morphTau > 0.3 ? 1.45 : 1.25)
    const label = `UTC${offset >= 0 ? '+' : ''}${offset}`
    const labelLat = isActive ? 14 : (isEven ? 9 : -9)

    bands.push({
      id: `tz-band-${offset}`,
      name:
        morphTau > 0.5
          ? `${label} (Polityczna IANA)`
          : `${label} (Słoneczna 15° · ${offset * 15}°)`,
      offsetHours: offset,
      isActive,
      centerLon,
      fill,
      hoverFill,
      stroke,
      strokeWidth,
      dashed: false,
      smoothBezier: true,
      interactive: options.interactive !== false,
      label: showLabels ? label : undefined,
      labelCoords: [centerLon, labelLat],
      labelColor: isActive ? '#00f2fe' : '#f8fafc',
      worldRings: [worldRing]
    })
  }

  bands.sort(
    (a, b) => Number(a.offsetHours === normalizedActive) - Number(b.offsetHours === normalizedActive)
  )
  return bands
}

/**
 * Builds a closed 3D spherical ribbon polygon on S^2 representing a line or flow
 * of variable width (`[[lon, lat, widthDeg?], ...]`) so generic `:polygons` and `:layers`
 * can render tapered routes, jet streams, ocean currents, and variable-thickness geodesics.
 */
export function buildSphericalVariableWidthLinePolygon(waypoints = [], options = {}) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    return {
      id: options.id || 'spherical-ribbon-empty',
      worldRings: [],
      rings: []
    }
  }

  const baseWidthDeg = Number(options.widthDeg ?? 1.6)
  const startWidthDeg = Number(options.startWidthDeg ?? baseWidthDeg)
  const endWidthDeg = Number(options.endWidthDeg ?? baseWidthDeg)
  const midWidthDeg = Number(options.midWidthDeg ?? Math.max(startWidthDeg, endWidthDeg) * 1.45)
  const profile = String(options.profile || 'constant').toLowerCase()
  const samplesPerSegment = Math.max(4, Math.min(32, Number(options.samplesPerSegment) || 12))

  // Smooth the control waypoints on the sphere if >= 3 waypoints
  const controlVecs = waypoints.map((pt) => {
    const lon = Number(pt[0]) || 0
    const lat = Number(pt[1]) || 0
    const explicitW = pt.length >= 3 && Number.isFinite(Number(pt[2])) ? Number(pt[2]) : null
    return {
      ...lonLatToWorldUnitVec3(lon, lat),
      lon,
      lat,
      explicitW
    }
  })

  // Sample dense spine along great-circle segments
  const rawSamples = []
  const segCount = controlVecs.length - 1
  for (let s = 0; s < segCount; s++) {
    const u = controlVecs[s]
    const v = controlVecs[s + 1]
    const steps = samplesPerSegment
    for (let k = 0; k <= steps; k++) {
      if (s > 0 && k === 0) continue
      const localT = k / steps
      const globalT = (s + localT) / segCount
      const p = slerpWorldUnitVec3(u, v, localT)
      let wDeg
      if (typeof options.widthFn === 'function') {
        wDeg = Number(options.widthFn(globalT))
      } else if (u.explicitW !== null && v.explicitW !== null) {
        wDeg = u.explicitW + (v.explicitW - u.explicitW) * easeInOutCubic(localT)
      } else if (profile === 'taper' || profile === 'lens') {
        const bell = Math.sin(Math.PI * globalT)
        const baseEnds = startWidthDeg + (endWidthDeg - startWidthDeg) * globalT
        wDeg = baseEnds * (1 - bell) + midWidthDeg * bell
      } else if (profile === 'teardrop') {
        const env = Math.pow(Math.sin(Math.PI * globalT), 0.75) * (1 - 0.55 * globalT)
        wDeg = Math.max(0.2, startWidthDeg * 0.35 + midWidthDeg * env)
      } else if (profile === 'pulse') {
        const wave = 0.55 + 0.45 * Math.sin(globalT * Math.PI * 3)
        wDeg = midWidthDeg * wave
      } else {
        wDeg = startWidthDeg + (endWidthDeg - startWidthDeg) * globalT
      }
      rawSamples.push({ ...p, wDeg: Math.max(0.12, wDeg), globalT })
    }
  }

  // Smooth the sampled spine positions on S^2 (1 pass of 3-point spherical averaging on interior points)
  const m = rawSamples.length
  const spine = new Array(m)
  for (let i = 0; i < m; i++) {
    if (i === 0 || i === m - 1) {
      spine[i] = rawSamples[i]
    } else {
      const a = rawSamples[i - 1]
      const b = rawSamples[i]
      const c = rawSamples[i + 1]
      let wx = 0.25 * a.wx + 0.5 * b.wx + 0.25 * c.wx
      let wy = 0.25 * a.wy + 0.5 * b.wy + 0.25 * c.wy
      let wz = 0.25 * a.wz + 0.5 * b.wz + 0.25 * c.wz
      const norm = Math.hypot(wx, wy, wz) || 1
      spine[i] = {
        wx: wx / norm,
        wy: wy / norm,
        wz: wz / norm,
        wDeg: 0.25 * a.wDeg + 0.5 * b.wDeg + 0.25 * c.wDeg,
        globalT: b.globalT
      }
    }
  }

  const leftSide = new Array(m)
  const rightSide = new Array(m)

  for (let i = 0; i < m; i++) {
    const curr = spine[i]
    const prev = spine[Math.max(0, i - 1)]
    const next = spine[Math.min(m - 1, i + 1)]
    let tx = next.wx - prev.wx
    let ty = next.wy - prev.wy
    let tz = next.wz - prev.wz
    const tNorm = Math.hypot(tx, ty, tz) || 1
    tx /= tNorm
    ty /= tNorm
    tz /= tNorm

    // Unit surface normal n = normalize(p x t) on S^2
    let nx = curr.wy * tz - curr.wz * ty
    let ny = curr.wz * tx - curr.wx * tz
    let nz = curr.wx * ty - curr.wy * tx
    const nNorm = Math.hypot(nx, ny, nz) || 1
    nx /= nNorm
    ny /= nNorm
    nz /= nNorm

    const halfRad = 0.5 * curr.wDeg * DEG2RAD
    const cosD = Math.cos(halfRad)
    const sinD = Math.sin(halfRad)

    leftSide[i] = {
      wx: cosD * curr.wx + sinD * nx,
      wy: cosD * curr.wy + sinD * ny,
      wz: cosD * curr.wz + sinD * nz
    }
    rightSide[i] = {
      wx: cosD * curr.wx - sinD * nx,
      wy: cosD * curr.wy - sinD * ny,
      wz: cosD * curr.wz - sinD * nz
    }
  }

  const worldRing = []
  for (let i = 0; i < m; i++) {
    worldRing.push(leftSide[i])
  }
  for (let i = m - 1; i >= 0; i--) {
    worldRing.push(rightSide[i])
  }

  // Convert worldRing back to [lon, lat] for callers that inspect .rings
  const ring = worldRing.map((v) => [
    Math.atan2(v.wy, v.wx) * RAD2DEG,
    Math.asin(Math.max(-1, Math.min(1, v.wz))) * RAD2DEG
  ])

  const midIdx = Math.floor(m / 2)
  const midPt = spine[midIdx] || spine[0]
  const midLon = Math.atan2(midPt.wy, midPt.wx) * RAD2DEG
  const midLat = Math.asin(Math.max(-1, Math.min(1, midPt.wz))) * RAD2DEG

  return {
    id: options.id || 'spherical-ribbon',
    name: options.name || options.label || undefined,
    fill: options.fill || 'rgba(56, 189, 248, 0.45)',
    hoverFill: options.hoverFill || 'rgba(56, 189, 248, 0.68)',
    stroke: options.stroke || '#38bdf8',
    strokeWidth: options.strokeWidth ?? 1.15,
    dashed: Boolean(options.dashed),
    smoothBezier: options.smoothBezier !== false,
    interactive: options.interactive !== false,
    label: options.label,
    labelCoords: options.labelCoords || [midLon, midLat],
    labelColor: options.labelColor || '#f8fafc',
    worldRings: [worldRing],
    rings: [ring]
  }
}
