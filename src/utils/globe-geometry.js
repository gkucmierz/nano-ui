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
  const sinLon0 = Math.sin(trig.lon0)
  const cosLon0 = Math.cos(trig.lon0)
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

        if (isSouthPolar && Math.sin(a1 + da * 0.5) > 0) {
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
