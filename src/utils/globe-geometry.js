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

export function camPolygonToSvgPath(pts, cx = 250, cy = 250, r = 212) {
  if (!pts || pts.length < 3) return ''
  let d = ''
  for (let i = 0; i < pts.length; i++) {
    const sx = (cx + pts[i].x * r).toFixed(1)
    const sy = (cy - pts[i].y * r).toFixed(1)
    d += (i === 0 ? 'M' : 'L') + sx + ',' + sy
  }
  return d + 'Z'
}

export function camPolygonsToSvgPath(polygons, cx = 250, cy = 250, r = 212) {
  if (!polygons || !polygons.length) return ''
  let d = ''
  for (let i = 0; i < polygons.length; i++) {
    d += camPolygonToSvgPath(polygons[i], cx, cy, r)
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
