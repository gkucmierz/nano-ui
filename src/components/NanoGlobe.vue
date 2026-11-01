<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { WORLD_COUNTRIES_LITE } from '../data/worldCountriesLite.js'
import {
  DEG2RAD,
  lonLatToCamVec3,
  worldVec3ToCamVec3,
  clipSphericalRingToHorizon,
  clipSphericalPolygonToHorizon,
  camPolygonToSvgPath,
  camPolygonsToSvgPath,
  camPolylineToSvgPath,
  densifyRing,
  isSouthPolarRing
} from '../utils/globe-geometry.js'

const props = defineProps({
  /** SVG width/height in px */
  size: { type: Number, default: 460 },
  /** Initial / controlled globe center [lon, lat] in degrees */
  center: { type: Array, default: () => [18, 22] },
  /** Selected country IDs (ISO-3 or country name) */
  selectedCountries: { type: Array, default: () => [] },
  /** Per-country custom fill color map: { [id]: '#hex' } */
  countryColors: { type: Object, default: () => ({}) },
  /** Selected HEALPix NESTED pixel indices (Numbers or BigInts or strings) */
  selectedHealpixPixels: { type: Array, default: () => [] },
  /** Cartographic meridian/parallel graticule visibility */
  showGraticule: { type: Boolean, default: true },
  /** Graticule step [lonStepDeg, latStepDeg] */
  graticuleStep: { type: Array, default: () => [10, 10] },
  /** HEALPix equal-area grid visibility */
  showHealpix: { type: Boolean, default: false },
  /** HEALPix order (0 -> Nside=1 [12 cells], 1 -> Nside=2 [48], 2 -> Nside=4 [192], 3 -> Nside=8 [768]) */
  healpixOrder: { type: Number, default: 1 },
  /** Show HEALPix base/nested pixel index labels */
  showHealpixLabels: { type: Boolean, default: false },
  /** Show country polygons */
  showCountries: { type: Boolean, default: true },
  /** Outer atmosphere halo ring */
  showAtmosphere: { type: Boolean, default: true },
  /** Interactive drag rotation */
  interactive: { type: Boolean, default: true },
  /** Auto-rotate speed in deg/sec (0 = off) */
  autoRotateSpeed: { type: Number, default: 0 },
  /** Show built-in HUD controls (Graticule / HEALPix / Theme switcher) */
  showControls: { type: Boolean, default: false },
  /** Built-in color theme preset: 'teal-coral' | 'nano-dark' | 'nano-light' | 'cyber-amber' */
  preset: { type: String, default: 'teal-coral' },
  /** Custom style/color overrides */
  colors: { type: Object, default: () => ({}) },
  /** Great-circle geodesic arcs: [{ from: [lon, lat], to: [lon, lat], color?, dashed?, width? }] */
  arcs: { type: Array, default: () => [] },
  /** Spherical markers: [{ id?, lon, lat, type?: 'target' | 'dot', color?, size?, label? }] */
  markers: { type: Array, default: () => [] },
  /** Optional custom countries array (defaults to WORLD_COUNTRIES_LITE) */
  countriesData: { type: Array, default: null }
})

const emit = defineEmits([
  'update:center',
  'update:selectedCountries',
  'update:selectedHealpixPixels',
  'update:showGraticule',
  'update:showHealpix',
  'update:healpixOrder',
  'country-click',
  'country-hover',
  'pixel-click'
])

const uid = `nano-globe-${Math.random().toString(36).slice(2, 9)}`

const PRESET_PALETTES = {
  'teal-coral': {
    atmosphereOuter: 'rgba(255, 255, 255, 0.92)',
    atmosphereGlow: 'rgba(13, 104, 115, 0.16)',
    oceanHighlight: '#167885',
    oceanMid: '#0c5e69',
    oceanDeep: '#05343c',
    graticule: 'rgba(175, 232, 230, 0.22)',
    healpixStroke: 'rgba(253, 224, 71, 0.62)',
    healpixFillHover: 'rgba(253, 224, 71, 0.18)',
    healpixFillSelected: 'rgba(245, 158, 11, 0.34)',
    landFill: '#d9ece9',
    landStroke: '#4c8e94',
    landHoverFill: '#f28b73',
    selectedFill: '#e05a3f',
    selectedStroke: '#ffffff',
    selectedGlow: 'rgba(224, 90, 63, 0.68)',
    arcStroke: '#ffffff',
    markerTarget: '#ffffff',
    markerDotFill: '#b8be62',
    markerDotStroke: 'rgba(255, 255, 255, 0.82)'
  },
  'nano-dark': {
    atmosphereOuter: 'rgba(56, 189, 248, 0.22)',
    atmosphereGlow: 'rgba(16, 185, 129, 0.14)',
    oceanHighlight: '#112236',
    oceanMid: '#091321',
    oceanDeep: '#040811',
    graticule: 'rgba(148, 163, 184, 0.18)',
    healpixStroke: 'rgba(45, 212, 191, 0.58)',
    healpixFillHover: 'rgba(45, 212, 191, 0.16)',
    healpixFillSelected: 'rgba(16, 185, 129, 0.34)',
    landFill: '#1e293b',
    landStroke: '#334155',
    landHoverFill: '#0ea5e9',
    selectedFill: '#10b981',
    selectedStroke: '#ecfdf5',
    selectedGlow: 'rgba(16, 185, 129, 0.65)',
    arcStroke: '#38bdf8',
    markerTarget: '#ffffff',
    markerDotFill: '#f59e0b',
    markerDotStroke: '#ffffff'
  },
  'nano-light': {
    atmosphereOuter: 'rgba(226, 232, 240, 0.95)',
    atmosphereGlow: 'rgba(14, 165, 233, 0.12)',
    oceanHighlight: '#e0f2fe',
    oceanMid: '#bae6fd',
    oceanDeep: '#7dd3fc',
    graticule: 'rgba(3, 105, 161, 0.16)',
    healpixStroke: 'rgba(124, 58, 237, 0.5)',
    healpixFillHover: 'rgba(124, 58, 237, 0.14)',
    healpixFillSelected: 'rgba(124, 58, 237, 0.28)',
    landFill: '#f8fafc',
    landStroke: '#94a3b8',
    landHoverFill: '#fb923c',
    selectedFill: '#ea580c',
    selectedStroke: '#ffffff',
    selectedGlow: 'rgba(234, 88, 12, 0.5)',
    arcStroke: '#0f172a',
    markerTarget: '#ffffff',
    markerDotFill: '#10b981',
    markerDotStroke: '#ffffff'
  },
  'cyber-amber': {
    atmosphereOuter: 'rgba(245, 158, 11, 0.26)',
    atmosphereGlow: 'rgba(245, 158, 11, 0.14)',
    oceanHighlight: '#1c1917',
    oceanMid: '#0f0e0d',
    oceanDeep: '#050504',
    graticule: 'rgba(245, 158, 11, 0.18)',
    healpixStroke: 'rgba(56, 189, 248, 0.62)',
    healpixFillHover: 'rgba(56, 189, 248, 0.18)',
    healpixFillSelected: 'rgba(56, 189, 248, 0.35)',
    landFill: '#292524',
    landStroke: '#57534e',
    landHoverFill: '#fbbf24',
    selectedFill: '#f59e0b',
    selectedStroke: '#fffbeb',
    selectedGlow: 'rgba(245, 158, 11, 0.7)',
    arcStroke: '#fde68a',
    markerTarget: '#ffffff',
    markerDotFill: '#38bdf8',
    markerDotStroke: '#ffffff'
  }
}

const activePreset = ref(props.preset)
watch(() => props.preset, (v) => { activePreset.value = v })

const palette = computed(() => ({
  ...(PRESET_PALETTES[activePreset.value] || PRESET_PALETTES['teal-coral']),
  ...props.colors
}))

const rotLon = ref(Number(props.center?.[0]) || 18)
const rotLat = ref(Number(props.center?.[1]) || 22)

watch(
  () => props.center,
  (c) => {
    if (Array.isArray(c) && c.length >= 2) {
      rotLon.value = Number(c[0]) || 0
      rotLat.value = Math.max(-85, Math.min(85, Number(c[1]) || 0))
    }
  }
)

const localShowGraticule = ref(props.showGraticule)
const localShowHealpix = ref(props.showHealpix)
const localHealpixOrder = ref(props.healpixOrder)

watch(() => props.showGraticule, (v) => { localShowGraticule.value = v })
watch(() => props.showHealpix, (v) => { localShowHealpix.value = v })
watch(() => props.healpixOrder, (v) => { localHealpixOrder.value = v })

const hoveredCountryId = ref(null)
const hoveredHealpixPix = ref(null)

// Geometry constants inside a fixed 500x500 SVG coordinate space
const VIEW_SIZE = 500
const CX = 250
const CY = 250
const R = 212
const ATMO_R = 232

const cameraTrig = computed(() => {
  const lon0 = rotLon.value * DEG2RAD
  const lat0 = rotLat.value * DEG2RAD
  return {
    lon0,
    lat0,
    sinLat0: Math.sin(lat0),
    cosLat0: Math.cos(lat0)
  }
})

const preparedCountries = computed(() => {
  const raw = props.countriesData || WORLD_COUNTRIES_LITE
  return raw.map((c, idx) => ({
    ...c,
    uidKey: `${c.id}-${c.name || idx}`,
    denseRings: c.rings.map((r) => ({
      pts: densifyRing(r, 5),
      isSouthPolar: isSouthPolarRing(r)
    }))
  }))
})

const selectedSet = computed(() => new Set(props.selectedCountries.map((x) => String(x).toLowerCase())))

function isCountrySelected(c) {
  return (
    selectedSet.value.has(String(c.id).toLowerCase()) ||
    selectedSet.value.has(String(c.name).toLowerCase())
  )
}

const renderedCountries = computed(() => {
  if (!props.showCountries) return []
  const trig = cameraTrig.value
  const list = []

  for (const c of preparedCountries.value) {
    let pathD = ''
    for (const ringObj of c.denseRings) {
      const camPts = ringObj.pts.map(([lon, lat]) => lonLatToCamVec3(lon, lat, trig))
      const clippedPolygons = clipSphericalRingToHorizon(camPts, {
        isSouthPolar: ringObj.isSouthPolar
      })
      if (clippedPolygons.length > 0) {
        pathD += camPolygonsToSvgPath(clippedPolygons, CX, CY, R)
      }
    }
    if (!pathD) continue

    const selected = isCountrySelected(c)
    const hovered = !isDragging.value && hoveredCountryId.value === c.id
    const customFill = props.countryColors?.[c.id] || props.countryColors?.[c.name]

    list.push({
      id: c.id,
      uidKey: c.uidKey,
      name: c.name,
      center: c.center,
      d: pathD,
      selected,
      hovered,
      customFill
    })
  }

  // Render selected countries on top so their white/glowing borders are never occluded
  list.sort((a, b) => Number(a.selected) - Number(b.selected))
  return list
})

/**
 * Generates visible cartographic graticule lines (meridians & parallels).
 */
const graticulePathD = computed(() => {
  if (!localShowGraticule.value) return ''
  const trig = cameraTrig.value
  const lonStep = Math.max(5, Number(props.graticuleStep?.[0]) || 10)
  const latStep = Math.max(5, Number(props.graticuleStep?.[1]) || 10)
  let d = ''

  // Meridians
  for (let lon = -180; lon < 180; lon += lonStep) {
    const pts = []
    for (let lat = -85; lat <= 85; lat += 4) {
      pts.push(lonLatToCamVec3(lon, lat, trig))
    }
    d += camPolylineToSvgPath(pts, CX, CY, R)
  }

  // Parallels
  for (let lat = -80; lat <= 80; lat += latStep) {
    const pts = []
    for (let lon = -180; lon <= 180; lon += 4) {
      pts.push(lonLatToCamVec3(lon, lat, trig))
    }
    d += camPolylineToSvgPath(pts, CX, CY, R)
  }

  return d
})

/**
 * Pure mathematical HEALPix Fxyf -> unit sphere Vec3 boundary generator
 * (compatible with @gkucmierz/healpixjs-bigint Fxyf & NESTED indexing).
 */
const JRLL = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4]
const JPLL = [1, 3, 5, 7, 0, 2, 4, 6, 1, 3, 5, 7]

function fxyfToWorldVec3(fx, fy, face) {
  const jr = JRLL[face] - fx - fy
  let nr
  let z
  if (jr < 1) {
    nr = jr
    z = 1 - (nr * nr) / 3.0
  } else if (jr > 3) {
    nr = 4 - jr
    z = (nr * nr) / 3.0 - 1
  } else {
    nr = 1
    z = ((2 - jr) * 2.0) / 3.0
  }
  let tmp = JPLL[face] * nr + fx - fy
  if (tmp < 0) tmp += 8
  if (tmp >= 8) tmp -= 8
  const phi = nr < 1e-15 ? 0 : (0.25 * Math.PI * tmp) / nr
  const sth = Math.sqrt(Math.max(0, (1 - z) * (1 + z)))
  return {
    wx: sth * Math.cos(phi),
    wy: sth * Math.sin(phi),
    wz: z
  }
}

function spreadBitsSimple(v) {
  let s = 0
  let i = 0
  while (v > 0) {
    if (v & 1) s |= 1 << (2 * i)
    v >>= 1
    i++
  }
  return s
}

const healpixCells = computed(() => {
  if (!localShowHealpix.value) return []
  const order = Math.max(0, Math.min(3, Math.floor(Number(localHealpixOrder.value) || 0)))
  const nside = 1 << order
  const step = order === 0 ? 10 : order === 1 ? 6 : 4
  const d = 1.0 / (nside * step)
  const dc = 0.5 / nside
  const trig = cameraTrig.value
  const selectedPixSet = new Set(props.selectedHealpixPixels.map((p) => String(p)))
  const cells = []

  for (let face = 0; face < 12; face++) {
    for (let ix = 0; ix < nside; ix++) {
      for (let iy = 0; iy < nside; iy++) {
        const ipix = (face << (2 * order)) + spreadBitsSimple(ix) + (spreadBitsSimple(iy) << 1)
        const xc = (ix + 0.5) / nside
        const yc = (iy + 0.5) / nside

        const centerW = fxyfToWorldVec3(xc, yc, face)
        const centerCam = worldVec3ToCamVec3(centerW.wx, centerW.wy, centerW.wz, trig)

        const boundaryCam = []
        for (let i = 0; i < step; i++) {
          const w = fxyfToWorldVec3(xc + dc - i * d, yc + dc, face)
          boundaryCam.push(worldVec3ToCamVec3(w.wx, w.wy, w.wz, trig))
        }
        for (let i = 0; i < step; i++) {
          const w = fxyfToWorldVec3(xc - dc, yc + dc - i * d, face)
          boundaryCam.push(worldVec3ToCamVec3(w.wx, w.wy, w.wz, trig))
        }
        for (let i = 0; i < step; i++) {
          const w = fxyfToWorldVec3(xc - dc + i * d, yc - dc, face)
          boundaryCam.push(worldVec3ToCamVec3(w.wx, w.wy, w.wz, trig))
        }
        for (let i = 0; i < step; i++) {
          const w = fxyfToWorldVec3(xc + dc, yc - dc + i * d, face)
          boundaryCam.push(worldVec3ToCamVec3(w.wx, w.wy, w.wz, trig))
        }

        const clippedPolys = clipSphericalRingToHorizon(boundaryCam)
        if (!clippedPolys.length) continue
        const pathD = camPolygonsToSvgPath(clippedPolys, CX, CY, R)
        if (!pathD) continue

        cells.push({
          ipix,
          face,
          d: pathD,
          selected: selectedPixSet.has(String(ipix)),
          hovered: !isDragging.value && hoveredHealpixPix.value === ipix,
          labelVisible: props.showHealpixLabels && centerCam.z > 0.15,
          labelX: CX + centerCam.x * R,
          labelY: CY - centerCam.y * R
        })
      }
    }
  }
  return cells
})

/**
 * Great-circle geodesic arcs (SLERP interpolation between two [lon, lat] points).
 */
const renderedArcs = computed(() => {
  if (!props.arcs || !props.arcs.length) return []
  const trig = cameraTrig.value
  const out = []

  const toUnit3 = (lon, lat) => {
    const phi = lat * DEG2RAD
    const lam = lon * DEG2RAD
    return [Math.cos(phi) * Math.cos(lam), Math.cos(phi) * Math.sin(lam), Math.sin(phi)]
  }

  for (let idx = 0; idx < props.arcs.length; idx++) {
    const arc = props.arcs[idx]
    if (!Array.isArray(arc.from) || !Array.isArray(arc.to)) continue
    const v1 = toUnit3(arc.from[0], arc.from[1])
    const v2 = toUnit3(arc.to[0], arc.to[1])
    const dot = Math.max(-1, Math.min(1, v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]))
    const omega = Math.acos(dot)
    const sinOmega = Math.sin(omega)
    const steps = 40
    const camPts = []

    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      let wx, wy, wz
      if (sinOmega < 1e-6) {
        wx = v1[0]
        wy = v1[1]
        wz = v1[2]
      } else {
        const a = Math.sin((1 - t) * omega) / sinOmega
        const b = Math.sin(t * omega) / sinOmega
        wx = a * v1[0] + b * v2[0]
        wy = a * v1[1] + b * v2[1]
        wz = a * v1[2] + b * v2[2]
      }
      camPts.push(worldVec3ToCamVec3(wx, wy, wz, trig))
    }

    const d = camPolylineToSvgPath(camPts, CX, CY, R)

    if (d) {
      out.push({
        id: arc.id || `arc-${idx}`,
        d,
        color: arc.color || palette.value.arcStroke,
        width: arc.width || 2.2,
        dashed: arc.dashed !== false
      })
    }
  }
  return out
})

const renderedMarkers = computed(() => {
  if (!props.markers || !props.markers.length) return []
  const trig = cameraTrig.value
  const out = []

  for (let i = 0; i < props.markers.length; i++) {
    const m = props.markers[i]
    const lon = Number(m.lon ?? m.coordinates?.[0] ?? 0)
    const lat = Number(m.lat ?? m.coordinates?.[1] ?? 0)
    const cam = lonLatToCamVec3(lon, lat, trig)
    if (cam.z < 0.02) continue
    out.push({
      id: m.id || `marker-${i}`,
      x: CX + cam.x * R,
      y: CY - cam.y * R,
      type: m.type || 'dot',
      color: m.color,
      size: m.size || (m.type === 'target' ? 11 : 6.5),
      label: m.label || ''
    })
  }
  return out
})

// Drag interaction state (coalesced via requestAnimationFrame to prevent mid-frame SVG dirty-rect artifacts)
const isDragging = ref(false)
let dragStartX = 0
let dragStartY = 0
let startLon = 0
let startLat = 0
let dragMovedDistance = 0
let pendingLon = null
let pendingLat = null
let dragRafId = null
let animFrameId = null
let lastAnimTime = 0

function flushPendingDrag() {
  dragRafId = null
  if (pendingLon === null || pendingLat === null) return
  rotLon.value = pendingLon
  rotLat.value = pendingLat
  emit('update:center', [Number(pendingLon.toFixed(2)), Number(pendingLat.toFixed(2))])
}

function onPointerDown(e) {
  if (!props.interactive) return
  isDragging.value = true
  hoveredCountryId.value = null
  hoveredHealpixPix.value = null
  dragStartX = e.clientX
  dragStartY = e.clientY
  startLon = rotLon.value
  startLat = rotLat.value
  dragMovedDistance = 0
  e.currentTarget?.setPointerCapture?.(e.pointerId)
}

function onPointerMove(e) {
  if (!isDragging.value) return
  const dx = e.clientX - dragStartX
  const dy = e.clientY - dragStartY
  dragMovedDistance = Math.hypot(dx, dy)

  const sensitivity = 180 / (props.size * 0.85)
  let nextLon = startLon - dx * sensitivity
  while (nextLon > 180) nextLon -= 360
  while (nextLon < -180) nextLon += 360
  const nextLat = Math.max(-85, Math.min(85, startLat + dy * sensitivity))

  pendingLon = nextLon
  pendingLat = nextLat
  if (!dragRafId && typeof requestAnimationFrame === 'function') {
    dragRafId = requestAnimationFrame(flushPendingDrag)
  } else if (typeof requestAnimationFrame !== 'function') {
    flushPendingDrag()
  }
}

function onPointerUp(e) {
  if (!isDragging.value) return
  if (dragRafId) {
    cancelAnimationFrame(dragRafId)
    flushPendingDrag()
  }
  isDragging.value = false
  pendingLon = null
  pendingLat = null
  e.currentTarget?.releasePointerCapture?.(e.pointerId)
}

function onCountryClick(country) {
  if (dragMovedDistance > 5) return
  const current = [...props.selectedCountries]
  const idx = current.findIndex(
    (x) =>
      String(x).toLowerCase() === String(country.id).toLowerCase() ||
      String(x).toLowerCase() === String(country.name).toLowerCase()
  )
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(country.id)
  }
  emit('update:selectedCountries', current)
  emit('country-click', {
    id: country.id,
    name: country.name,
    center: country.center,
    selected: idx < 0
  })
}

function onHealpixClick(cell) {
  if (dragMovedDistance > 5) return
  const current = [...props.selectedHealpixPixels]
  const idx = current.findIndex((x) => String(x) === String(cell.ipix))
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(cell.ipix)
  }
  emit('update:selectedHealpixPixels', current)
  emit('pixel-click', {
    ipix: cell.ipix,
    face: cell.face,
    order: localHealpixOrder.value,
    selected: idx < 0
  })
}

function toggleGraticuleBtn() {
  localShowGraticule.value = !localShowGraticule.value
  emit('update:showGraticule', localShowGraticule.value)
}

function toggleHealpixBtn() {
  localShowHealpix.value = !localShowHealpix.value
  emit('update:showHealpix', localShowHealpix.value)
}

function setOrderBtn(o) {
  localHealpixOrder.value = o
  localShowHealpix.value = true
  emit('update:healpixOrder', o)
  emit('update:showHealpix', true)
}

function stepAutoRotate(ts) {
  if (!lastAnimTime) lastAnimTime = ts
  const dt = (ts - lastAnimTime) / 1000
  lastAnimTime = ts
  if (props.autoRotateSpeed && !isDragging.value) {
    let nextLon = rotLon.value + props.autoRotateSpeed * dt
    while (nextLon > 180) nextLon -= 360
    while (nextLon < -180) nextLon += 360
    rotLon.value = nextLon
  }
  if (props.autoRotateSpeed) {
    animFrameId = requestAnimationFrame(stepAutoRotate)
  }
}

function rotateTo(lon, lat) {
  const nextLon = Number(lon)
  const nextLat = Math.max(-85, Math.min(85, Number(lat)))
  if (!Number.isFinite(nextLon) || !Number.isFinite(nextLat)) return
  rotLon.value = nextLon
  rotLat.value = nextLat
  emit('update:center', [Number(nextLon.toFixed(2)), Number(nextLat.toFixed(2))])
}

function resetView() {
  rotateTo(props.center?.[0] ?? 19.0, props.center?.[1] ?? 50.0)
}

defineExpose({
  rotateTo,
  resetView,
  toggleGraticule: toggleGraticuleBtn,
  toggleHealpix: toggleHealpixBtn,
  setHealpixOrder: setOrderBtn,
  rotLon,
  rotLat,
  isDragging,
})

onMounted(() => {
  if (props.autoRotateSpeed) {
    animFrameId = requestAnimationFrame(stepAutoRotate)
  }
})

onUnmounted(() => {
  if (animFrameId) cancelAnimationFrame(animFrameId)
  if (dragRafId) cancelAnimationFrame(dragRafId)
})
</script>

<template>
  <div class="nano-globe-wrap" :style="{ '--globe-size': size + 'px' }">
    <svg
      class="nano-globe-svg"
      :class="{ 'is-dragging': isDragging, 'is-interactive': interactive }"
      :width="size"
      :height="size"
      :viewBox="`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`"
      role="img"
      aria-label="Interactive 3D Orthographic Globe"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <defs>
        <!-- 3D Spherical Ocean Radial Gradient -->
        <radialGradient :id="`${uid}-ocean`" cx="36%" cy="32%" r="68%" fx="32%" fy="28%">
          <stop offset="0%" :stop-color="palette.oceanHighlight" />
          <stop offset="58%" :stop-color="palette.oceanMid" />
          <stop offset="100%" :stop-color="palette.oceanDeep" />
        </radialGradient>

        <!-- Inner Spherical Limb Vignette -->
        <radialGradient :id="`${uid}-limb`" cx="50%" cy="50%" r="50%">
          <stop offset="76%" stop-color="rgba(0,0,0,0)" />
          <stop offset="94%" stop-color="rgba(0,12,18,0.22)" />
          <stop offset="100%" stop-color="rgba(0,8,14,0.48)" />
        </radialGradient>
      </defs>

      <!-- Outer Soft Atmosphere Halo Ring -->
      <template v-if="showAtmosphere">
        <circle
          :cx="CX"
          :cy="CY"
          :r="ATMO_R + 6"
          :fill="palette.atmosphereGlow"
        />
        <circle
          :cx="CX"
          :cy="CY"
          :r="ATMO_R"
          :fill="palette.atmosphereOuter"
        />
      </template>

      <!-- Spherical Layers (mathematically horizon-clipped to r <= R without offscreen SVG SaveLayer artifacts) -->
      <g class="nano-globe-sphere-layers">
        <!-- Ocean Sphere Base -->
        <circle
          :cx="CX"
          :cy="CY"
          :r="R"
          :fill="`url(#${uid}-ocean)`"
        />

        <!-- 1. Cartographic Graticule Grid (Meridians & Parallels) -->
        <path
          v-if="localShowGraticule && graticulePathD"
          :d="graticulePathD"
          fill="none"
          :stroke="palette.graticule"
          stroke-width="0.85"
          pointer-events="none"
        />

        <!-- 2. Simplified SVG Country Polygons -->
        <g v-if="showCountries" class="nano-globe-countries">
          <template v-for="country in renderedCountries" :key="country.uidKey">
            <!-- Vector Glow Underlay for Selected Countries (replaces SVG feDropShadow to prevent Blink dirty-rect ghosting) -->
            <path
              v-if="country.selected"
              :d="country.d"
              class="nano-globe-country-glow"
              fill="none"
              :stroke="palette.selectedGlow"
              stroke-width="6.5"
              stroke-linejoin="round"
              stroke-linecap="round"
              pointer-events="none"
            />
            <path
              :d="country.d"
              class="nano-globe-country"
              :class="{
                'is-selected': country.selected,
                'is-hovered': country.hovered
              }"
              :fill="
                country.customFill ||
                (country.selected
                  ? palette.selectedFill
                  : country.hovered
                    ? palette.landHoverFill
                    : palette.landFill)
              "
              :stroke="country.selected ? palette.selectedStroke : palette.landStroke"
              :stroke-width="country.selected ? 1.55 : 0.65"
              stroke-linejoin="round"
              @mouseenter="
                !isDragging &&
                  ((hoveredCountryId = country.id),
                  emit('country-hover', { id: country.id, name: country.name }))
              "
              @mouseleave="!isDragging && (hoveredCountryId = null)"
              @click.stop="onCountryClick(country)"
            >
              <title>{{ country.name }} ({{ country.id }})</title>
            </path>
          </template>
        </g>

        <!-- 3. HEALPix Equal-Area Spherical Grid Overlay -->
        <g v-if="localShowHealpix" class="nano-globe-healpix">
          <path
            v-for="cell in healpixCells"
            :key="cell.ipix"
            :d="cell.d"
            class="nano-globe-healpix-cell"
            :fill="
              cell.selected
                ? palette.healpixFillSelected
                : cell.hovered
                  ? palette.healpixFillHover
                  : 'transparent'
            "
            :stroke="palette.healpixStroke"
            :stroke-width="cell.selected ? 1.5 : 0.9"
            stroke-linejoin="round"
            @mouseenter="!isDragging && (hoveredHealpixPix = cell.ipix)"
            @mouseleave="!isDragging && (hoveredHealpixPix = null)"
            @click.stop="onHealpixClick(cell)"
          >
            <title>HEALPix #{{ cell.ipix }} (face {{ cell.face }}, Nside={{ 1 << localHealpixOrder }})</title>
          </path>
          <text
            v-for="cell in healpixCells.filter((c) => c.labelVisible)"
            :key="`lbl-${cell.ipix}`"
            :x="cell.labelX"
            :y="cell.labelY"
            text-anchor="middle"
            dominant-baseline="central"
            class="nano-globe-healpix-label"
          >
            {{ cell.ipix }}
          </text>
        </g>

        <!-- 4. Great-Circle Geodesic Arcs (e.g. dashed route lines) -->
        <g v-if="renderedArcs.length" class="nano-globe-arcs" pointer-events="none">
          <path
            v-for="arc in renderedArcs"
            :key="arc.id"
            :d="arc.d"
            fill="none"
            :stroke="arc.color"
            :stroke-width="arc.width"
            :stroke-dasharray="arc.dashed ? '6 6' : undefined"
            stroke-linecap="round"
          />
        </g>

        <!-- 5. Spherical Markers (Bullseye Target & Waypoint Dots) -->
        <g v-if="renderedMarkers.length" class="nano-globe-markers" pointer-events="none">
          <g
            v-for="m in renderedMarkers"
            :key="m.id"
            :transform="`translate(${m.x.toFixed(1)}, ${m.y.toFixed(1)})`"
          >
            <template v-if="m.type === 'target'">
              <circle
                r="11"
                fill="none"
                :stroke="m.color || palette.markerTarget"
                stroke-width="2.4"
              />
              <circle
                r="4.5"
                :fill="m.color || palette.markerTarget"
              />
              <!-- Subtle NE target tick matching screenshot -->
              <polygon
                points="6,-11 12,-12 11,-6"
                :fill="m.color || palette.markerTarget"
              />
            </template>
            <template v-else>
              <circle
                :r="m.size + 2.5"
                fill="rgba(255,255,255,0.22)"
              />
              <circle
                :r="m.size"
                :fill="m.color || palette.markerDotFill"
                :stroke="palette.markerDotStroke"
                stroke-width="2"
              />
            </template>
          </g>
        </g>

        <!-- 6. Spherical 3D Limb Shading Overlay & Crisp Horizon Bezel -->
        <circle
          :cx="CX"
          :cy="CY"
          :r="R"
          :fill="`url(#${uid}-limb)`"
          :stroke="palette.oceanDeep"
          stroke-width="1.2"
          pointer-events="none"
        />

        <!-- Full-viewport SVG paint invalidator to prevent Blink partial dirty-rect ghost artifacts -->
        <rect
          x="0"
          y="0"
          :width="VIEW_SIZE"
          :height="VIEW_SIZE"
          fill="rgba(0,0,0,0)"
          pointer-events="none"
          :data-view="`${rotLon.toFixed(2)},${rotLat.toFixed(2)},${activePreset}`"
        />
      </g>
    </svg>

    <!-- Optional Interactive Controls Bar -->
    <div v-if="showControls" class="nano-globe-controls">
      <button
        type="button"
        class="nano-globe-btn"
        :class="{ active: localShowGraticule }"
        @click="toggleGraticuleBtn"
      >
        🌐 Siatka (Graticule)
      </button>
      <button
        type="button"
        class="nano-globe-btn"
        :class="{ active: localShowHealpix }"
        @click="toggleHealpixBtn"
      >
        ❖ HEALPix ({{ 12 * (1 << (2 * localHealpixOrder)) }} px)
      </button>
      <div v-if="localShowHealpix" class="nano-globe-order-pills">
        <button
          v-for="o in [0, 1, 2]"
          :key="o"
          type="button"
          class="nano-globe-pill"
          :class="{ active: localHealpixOrder === o }"
          @click="setOrderBtn(o)"
        >
          Nside={{ 1 << o }}
        </button>
      </div>
      <div class="nano-globe-order-pills">
        <button
          v-for="pKey in ['teal-coral', 'nano-dark', 'nano-light', 'cyber-amber']"
          :key="pKey"
          type="button"
          class="nano-globe-pill"
          :class="{ active: activePreset === pKey }"
          @click="activePreset = pKey"
        >
          {{ pKey }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nano-globe-wrap {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
  user-select: none;
  -webkit-user-select: none;
}

.nano-globe-svg {
  display: block;
  max-width: 100%;
  height: auto;
  overflow: visible;
  touch-action: none;
}

.nano-globe-svg.is-interactive {
  cursor: grab;
}

.nano-globe-svg.is-dragging {
  cursor: grabbing;
}

.nano-globe-country {
  cursor: pointer;
}

.nano-globe-svg.is-dragging .nano-globe-country,
.nano-globe-svg.is-dragging .nano-globe-healpix-cell {
  cursor: grabbing;
}

.nano-globe-healpix-cell {
  cursor: pointer;
}

.nano-globe-healpix-label {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 9px;
  font-weight: 700;
  fill: rgba(255, 255, 255, 0.85);
  pointer-events: none;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
}

.nano-globe-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  font-size: 0.75rem;
}

.nano-globe-btn,
.nano-globe-pill {
  height: 28px;
  padding: 0 0.65rem;
  border-radius: 7px;
  border: 1px solid var(--border, rgba(148, 163, 184, 0.3));
  background: var(--surface, rgba(15, 23, 42, 0.75));
  color: var(--text, #e2e8f0);
  font-size: 0.73rem;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease, color 140ms ease;
}

.nano-globe-btn.active,
.nano-globe-pill.active {
  border-color: #2dd4bf;
  color: #2dd4bf;
  background: rgba(45, 212, 191, 0.14);
}

.nano-globe-order-pills {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
</style>
