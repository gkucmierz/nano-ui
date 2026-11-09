<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { WORLD_COUNTRIES_LITE } from '../data/worldCountriesLite.js'
import { createKineticTransition } from '../utils/kinetics.js'
import { tooltipDirective as vTooltip } from '../directives/tooltip.js'
import { hideTooltip } from '../composables/useTooltip.js'
import {
  DEG2RAD,
  computeSphericalLabelOpacity,
  lonLatToCamVec3,
  worldVec3ToCamVec3,
  clipSphericalRingToHorizon,
  clipSphericalPolygonToHorizon,
  camPolygonToSvgPath,
  camPolygonsToSvgPath,
  camPolylineToSvgPath,
  densifyRing,
  isSouthPolarRing,
  buildSolarTerminatorSvgPrimitives,
  buildSphericalTimezoneBands,
  buildSphericalVariableWidthLinePolygon
} from '../utils/globe-geometry.js'

const props = defineProps({
  /** SVG width/height in px */
  size: { type: Number, default: 460 },
  /** Alias for size */
  width: { type: Number, default: undefined },
  /** Initial / controlled globe center [lon, lat] in degrees */
  center: { type: Array, default: () => [18, 22] },
  /** Optional controlled target latitude in degrees */
  targetLat: { type: Number, default: undefined },
  /** Optional controlled target longitude in degrees */
  targetLon: { type: Number, default: undefined },
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
  /** Outer atmosphere halo ring (Boolean or 'ring' | 'gradient' | 'off') */
  showAtmosphere: { type: [Boolean, String], default: true },
  /** Atmosphere halo style when showAtmosphere is true: 'ring' | 'gradient' */
  atmosphereMode: { type: String, default: 'ring' },
  /** Interactive drag rotation */
  interactive: { type: Boolean, default: true },
  /** Smooth C1 Hermite kinetic transitions when center / targetLon / targetLat change */
  kinetic: { type: Boolean, default: true },
  /** Kinetic transition duration in ms */
  kineticDuration: { type: Number, default: 620 },
  /** Boolean alias to enable default auto-rotation (14 deg/sec) */
  autoRotate: { type: Boolean, default: false },
  /** Auto-rotate speed in deg/sec (0 = off) */
  autoRotateSpeed: { type: Number, default: 0 },
  /** Auto-rotate angular velocity in full turns per second (1 turn/s = 360 deg/s) */
  autoRotateTurnsPerSec: { type: Number, default: undefined },
  /** Show built-in HUD controls (Graticule / HEALPix / Theme switcher) */
  showControls: { type: Boolean, default: false },
  /** Built-in color theme preset: 'teal-coral' | 'nano-dark' | 'nano-light' | 'cyber-amber' */
  preset: { type: String, default: 'teal-coral' },
  /** Custom style/color overrides */
  colors: { type: Object, default: () => ({}) },
  /** Optional direct ocean color override */
  oceanColor: { type: String, default: undefined },
  /** Optional direct land fill color override */
  landColor: { type: String, default: undefined },
  /** Optional direct country border color override */
  borderColor: { type: String, default: undefined },
  /** Great-circle geodesic arcs: [{ from: [lon, lat], to: [lon, lat], color?, dashed?, width? }] */
  arcs: { type: Array, default: () => [] },
  /** Spherical markers: [{ id?, lon, lat, type?: 'target' | 'dot', color?, size?, label? }] */
  markers: { type: Array, default: () => [] },
  /** Custom spherical overlay polygons (e.g. timezones, solar terminator, regions): [{ id, name?, rings?: [[[lon, lat], ...]], d?, fill?, hoverFill?, stroke?, strokeWidth?, dashed?, interactive? }] */
  polygons: { type: Array, default: () => [] },
  /** Generic spherical overlay layers: [{ id, visible?, opacity?, interactive?, polygons: [...] }] */
  layers: { type: Array, default: () => [] },
  /** Subsolar point [sunLon, sunLat] in degrees for physical Lambert cosine day/night terminator */
  subsolarPoint: { type: Array, default: null },
  /** Enable built-in solar terminator (false | true | 'gradient' | 'line' | 'both') */
  solarTerminator: { type: [Boolean, String], default: false },
  /** Terminator visual style when solarTerminator is true: 'gradient' | 'line' | 'both' */
  terminatorMode: { type: String, default: 'gradient' },
  /** Maximum night shadow opacity in [0, 1] for 'gradient' / 'both' modes */
  terminatorMaxOpacity: { type: Number, default: undefined },
  /** Night shadow base color */
  terminatorFillColor: { type: String, default: '#020617' },
  /** Thin terminator line stroke color */
  terminatorLineColor: { type: String, default: 'rgba(56, 189, 248, 0.72)' },
  /** Thin terminator line stroke width in px */
  terminatorLineWidth: { type: Number, default: 1.0 },
  /** Show built-in spherical timezone bands (UTC-11..+12) */
  showTimezones: { type: Boolean, default: false },
  /** Timezone geometry mode: 'clear' ('solar' 15-deg meridians) | 'complicated' ('political' IANA vector spines) */
  timezoneMode: { type: String, default: 'clear' },
  /** Optional explicit SLERP morph factor in [0, 1] between Clear (0) and Complicated (1) */
  timezoneMorph: { type: Number, default: undefined },
  /** Highlighted UTC offset in hours (-11..+12) */
  activeTimezoneOffset: { type: Number, default: 1 },
  /** Show UTC offset text labels on visible timezone bands */
  showTimezoneLabels: { type: Boolean, default: true },
  /** Smooth label emergence/hiding span in fraction of a full 360-deg turn (default 0.015 = 1.5% turn = 5.4 deg, ease-in-out) */
  labelFadeTurns: { type: Number, default: 0.015 },
  /** Peak opacity at Earth surface for atmosphere radial halo gradient */
  atmospherePeakOpacity: { type: Number, default: 0.44 },
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
  'update:showTimezones',
  'update:timezoneMode',
  'update:activeTimezoneOffset',
  'country-click',
  'country-hover',
  'polygon-click',
  'polygon-hover',
  'timezone-click',
  'pixel-click'
])

const uid = `nano-globe-${Math.random().toString(36).slice(2, 9)}`

const PRESET_PALETTES = {
  'teal-coral': {
    atmosphereOuter: 'rgba(153, 246, 228, 0.28)',
    atmosphereGlow: 'rgba(45, 212, 191, 0.12)',
    atmosphereColor: '#5eead4',
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
    selectedGlow: 'rgba(224, 90, 63, 0.68)'
  },
  'nano-dark': {
    atmosphereOuter: 'rgba(125, 211, 252, 0.20)',
    atmosphereGlow: 'rgba(56, 189, 248, 0.10)',
    atmosphereColor: '#7dd3fc',
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
    selectedGlow: 'rgba(16, 185, 129, 0.65)'
  },
  'nano-light': {
    atmosphereOuter: 'rgba(186, 230, 253, 0.42)',
    atmosphereGlow: 'rgba(56, 189, 248, 0.12)',
    atmosphereColor: '#7dd3fc',
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
    selectedGlow: 'rgba(234, 88, 12, 0.5)'
  },
  'cyber-amber': {
    atmosphereOuter: 'rgba(251, 191, 36, 0.22)',
    atmosphereGlow: 'rgba(245, 158, 11, 0.10)',
    atmosphereColor: '#fbbf24',
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
    selectedGlow: 'rgba(245, 158, 11, 0.7)'
  }
}

const activePreset = ref(props.preset)
watch(() => props.preset, (v) => { activePreset.value = v })

const effectiveSize = computed(() => Number(props.width) || Number(props.size) || 460)
const effectiveAutoRotateSpeed = computed(() => {
  if (Number.isFinite(Number(props.autoRotateTurnsPerSec))) {
    return Number(props.autoRotateTurnsPerSec) * 360
  }
  return Number(props.autoRotateSpeed) || (props.autoRotate ? 14 : 0)
})
const currentAutoRotateSpeed = ref(effectiveAutoRotateSpeed.value)

const speedKinetic = createKineticTransition({
  initialValue: currentAutoRotateSpeed.value,
  duration: props.kineticDuration,
  modular: false,
  onUpdate: ({ value }) => {
    currentAutoRotateSpeed.value = value
  },
  onSettled: ({ value }) => {
    currentAutoRotateSpeed.value = value
  }
})

const currentTurnsPerSec = computed(() => currentAutoRotateSpeed.value / 360)

const effectiveAtmosphereMode = computed(() => {
  if (!props.showAtmosphere || props.showAtmosphere === 'off' || props.showAtmosphere === 'none') {
    return null
  }
  if (typeof props.showAtmosphere === 'string') {
    return props.showAtmosphere
  }
  return props.atmosphereMode || 'ring'
})

const palette = computed(() => ({
  ...(PRESET_PALETTES[activePreset.value] || PRESET_PALETTES['teal-coral']),
  ...(props.oceanColor
    ? {
        oceanHighlight: props.oceanColor,
        oceanMid: props.oceanColor,
        oceanDeep: props.oceanColor,
      }
    : {}),
  ...(props.landColor ? { landFill: props.landColor } : {}),
  ...(props.borderColor ? { landStroke: props.borderColor } : {}),
  ...props.colors
}))

const wrapLon180 = (lon) => {
  let v = ((Number(lon) || 0) % 360 + 540) % 360 - 180
  if (v === -180 && lon > 0) v = 180
  return v
}

const rotLon = ref(
  Number.isFinite(Number(props.targetLon))
    ? Number(props.targetLon)
    : (Number(props.center?.[0]) || 18)
)
const rotLat = ref(
  Number.isFinite(Number(props.targetLat))
    ? Number(props.targetLat)
    : (Number(props.center?.[1]) || 22)
)

const lonKinetic = createKineticTransition({
  initialValue: rotLon.value,
  duration: props.kineticDuration,
  modular: true,
  onUpdate: ({ value }) => {
    rotLon.value = wrapLon180(value)
  }
})

const latKinetic = createKineticTransition({
  initialValue: rotLat.value,
  duration: props.kineticDuration,
  modular: false,
  onUpdate: ({ value }) => {
    rotLat.value = Math.max(-85, Math.min(85, value))
  }
})

function transitionToLonLat(lon, lat, immediate = false) {
  const nextLon = wrapLon180(lon)
  const nextLat = Math.max(-85, Math.min(85, Number(lat) || 0))
  const useKinetic =
    !immediate &&
    props.kinetic &&
    typeof window !== 'undefined' &&
    typeof requestAnimationFrame === 'function'

  if (!useKinetic) {
    lonKinetic.setTarget(nextLon, { immediate: true })
    latKinetic.setTarget(nextLat, { immediate: true })
    rotLon.value = nextLon
    rotLat.value = nextLat
    return
  }

  lonKinetic.setConfig({ duration: props.kineticDuration })
  latKinetic.setConfig({ duration: props.kineticDuration })
  lonKinetic.setTarget(nextLon)
  latKinetic.setTarget(nextLat)
}

watch(
  () => props.center,
  (c) => {
    if (isDragging.value) return
    if (Array.isArray(c) && c.length >= 2) {
      const nextLon = wrapLon180(Number(c[0]) || 0)
      const nextLat = Math.max(-85, Math.min(85, Number(c[1]) || 0))
      if (
        Math.abs(wrapLon180(nextLon - rotLon.value)) < 0.03 &&
        Math.abs(nextLat - rotLat.value) < 0.03
      ) {
        return
      }
      transitionToLonLat(nextLon, nextLat)
    }
  }
)

watch(
  [() => props.targetLon, () => props.targetLat],
  ([lon, lat]) => {
    if (isDragging.value) return
    const nextLon = Number.isFinite(Number(lon)) ? wrapLon180(Number(lon)) : rotLon.value
    const nextLat = Number.isFinite(Number(lat))
      ? Math.max(-85, Math.min(85, Number(lat)))
      : rotLat.value
    if (
      Math.abs(wrapLon180(nextLon - rotLon.value)) < 0.03 &&
      Math.abs(nextLat - rotLat.value) < 0.03
    ) {
      return
    }
    transitionToLonLat(nextLon, nextLat)
  }
)

const localShowGraticule = ref(props.showGraticule)
const localShowHealpix = ref(props.showHealpix)
const localHealpixOrder = ref(props.healpixOrder)
const localShowTimezones = ref(props.showTimezones)
const localTimezoneMode = ref(props.timezoneMode || 'clear')
const localActiveTimezoneOffset = ref(props.activeTimezoneOffset)

const resolveTargetMorph = (mode, explicitMorph) => {
  if (explicitMorph !== undefined && Number.isFinite(Number(explicitMorph))) {
    return Math.max(0, Math.min(1, Number(explicitMorph)))
  }
  const m = String(mode || 'clear').toLowerCase()
  return m === 'complicated' || m === 'political' || m === 'iana' ? 1 : 0
}

const currentTimezoneMorph = ref(resolveTargetMorph(props.timezoneMode, props.timezoneMorph))

const timezoneMorphKinetic = createKineticTransition({
  initialValue: currentTimezoneMorph.value,
  duration: 520,
  modular: false,
  onUpdate: ({ value }) => {
    currentTimezoneMorph.value = Math.max(0, Math.min(1, value))
  },
  onSettled: ({ value }) => {
    currentTimezoneMorph.value = Math.max(0, Math.min(1, value))
  }
})

function updateTimezoneMorphTarget(immediate = false) {
  const target = resolveTargetMorph(localTimezoneMode.value, props.timezoneMorph)
  const useKinetic =
    !immediate &&
    props.kinetic &&
    props.timezoneMorph === undefined &&
    typeof window !== 'undefined' &&
    typeof requestAnimationFrame === 'function'
  if (!useKinetic) {
    timezoneMorphKinetic.setTarget(target, { immediate: true })
    currentTimezoneMorph.value = target
  } else {
    timezoneMorphKinetic.setTarget(target)
  }
}

watch(() => props.showGraticule, (v) => { localShowGraticule.value = v })
watch(() => props.showHealpix, (v) => { localShowHealpix.value = v })
watch(() => props.healpixOrder, (v) => { localHealpixOrder.value = v })
watch(() => props.showTimezones, (v) => { localShowTimezones.value = v })
watch(() => props.activeTimezoneOffset, (v) => { localActiveTimezoneOffset.value = v })
watch(
  () => props.timezoneMode,
  (v) => {
    localTimezoneMode.value = v || 'clear'
    updateTimezoneMorphTarget(false)
  }
)
watch(
  () => props.timezoneMorph,
  () => {
    updateTimezoneMorphTarget(true)
  }
)

const hoveredCountryId = ref(null)
const hoveredPolygonId = ref(null)
const hoveredHealpixPix = ref(null)

// Geometry constants inside a fixed 500x500 SVG coordinate space
const VIEW_SIZE = 500
const CX = 250
const CY = 250
const R = 212
const ATMO_R = 236
const ATMO_GRAD_R = 249

function lonLatToWorldVec3(lon, lat) {
  const phi = lat * DEG2RAD
  const lam = lon * DEG2RAD
  const cosPhi = Math.cos(phi)
  return {
    wx: cosPhi * Math.cos(lam),
    wy: cosPhi * Math.sin(lam),
    wz: Math.sin(phi)
  }
}

const cameraTrig = computed(() => {
  const lon0 = rotLon.value * DEG2RAD
  const lat0 = rotLat.value * DEG2RAD
  return {
    lon0,
    lat0,
    sinLon0: Math.sin(lon0),
    cosLon0: Math.cos(lon0),
    sinLat0: Math.sin(lat0),
    cosLat0: Math.cos(lat0)
  }
})

const preparedCountries = computed(() => {
  const raw = props.countriesData || WORLD_COUNTRIES_LITE
  return raw.map((c, idx) => ({
    ...c,
    uidKey: `${c.id}-${c.name || idx}`,
    denseRings: c.rings.map((r) => {
      const pts = densifyRing(r, 5)
      return {
        pts,
        worldPts: pts.map(([lon, lat]) => lonLatToWorldVec3(lon, lat)),
        isSouthPolar: isSouthPolarRing(r)
      }
    })
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
      const worldPts = ringObj.worldPts
      const n = worldPts.length
      const camPts = new Array(n)
      for (let i = 0; i < n; i++) {
        const w = worldPts[i]
        camPts[i] = worldVec3ToCamVec3(w.wx, w.wy, w.wz, trig)
      }
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

const preparedGraticuleWorld = computed(() => {
  const lonStep = Math.max(5, Number(props.graticuleStep?.[0]) || 10)
  const latStep = Math.max(5, Number(props.graticuleStep?.[1]) || 10)
  const lines = []

  // Meridians
  for (let lon = -180; lon < 180; lon += lonStep) {
    const pts = []
    for (let lat = -85; lat <= 85; lat += 4) {
      pts.push(lonLatToWorldVec3(lon, lat))
    }
    lines.push(pts)
  }

  // Parallels
  for (let lat = -80; lat <= 80; lat += latStep) {
    const pts = []
    for (let lon = -180; lon <= 180; lon += 4) {
      pts.push(lonLatToWorldVec3(lon, lat))
    }
    lines.push(pts)
  }

  return lines
})

/**
 * Generates visible cartographic graticule lines (meridians & parallels).
 */
const graticulePathD = computed(() => {
  if (!localShowGraticule.value) return ''
  const trig = cameraTrig.value
  const lines = preparedGraticuleWorld.value
  let d = ''

  for (let l = 0; l < lines.length; l++) {
    const wPts = lines[l]
    const n = wPts.length
    const camPts = new Array(n)
    for (let i = 0; i < n; i++) {
      const w = wPts[i]
      camPts[i] = worldVec3ToCamVec3(w.wx, w.wy, w.wz, trig)
    }
    d += camPolylineToSvgPath(camPts, CX, CY, R)
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

const preparedHealpixWorldCells = computed(() => {
  const order = Math.max(0, Math.min(3, Math.floor(Number(localHealpixOrder.value) || 0)))
  const nside = 1 << order
  const step = order === 0 ? 10 : order === 1 ? 6 : 4
  const d = 1.0 / (nside * step)
  const dc = 0.5 / nside
  const worldCells = []

  for (let face = 0; face < 12; face++) {
    for (let ix = 0; ix < nside; ix++) {
      for (let iy = 0; iy < nside; iy++) {
        const ipix = (face << (2 * order)) + spreadBitsSimple(ix) + (spreadBitsSimple(iy) << 1)
        const xc = (ix + 0.5) / nside
        const yc = (iy + 0.5) / nside
        const centerW = fxyfToWorldVec3(xc, yc, face)
        const boundaryW = []

        for (let i = 0; i < step; i++) {
          boundaryW.push(fxyfToWorldVec3(xc + dc - i * d, yc + dc, face))
        }
        for (let i = 0; i < step; i++) {
          boundaryW.push(fxyfToWorldVec3(xc - dc, yc + dc - i * d, face))
        }
        for (let i = 0; i < step; i++) {
          boundaryW.push(fxyfToWorldVec3(xc - dc + i * d, yc - dc, face))
        }
        for (let i = 0; i < step; i++) {
          boundaryW.push(fxyfToWorldVec3(xc + dc, yc - dc + i * d, face))
        }

        worldCells.push({
          ipix,
          face,
          centerW,
          boundaryW
        })
      }
    }
  }
  return worldCells
})

const healpixCells = computed(() => {
  if (!localShowHealpix.value) return []
  const trig = cameraTrig.value
  const selectedPixSet = new Set(props.selectedHealpixPixels.map((p) => String(p)))
  const worldCells = preparedHealpixWorldCells.value
  const cells = []

  for (let cIdx = 0; cIdx < worldCells.length; cIdx++) {
    const wc = worldCells[cIdx]
    const centerCam = worldVec3ToCamVec3(wc.centerW.wx, wc.centerW.wy, wc.centerW.wz, trig)
    const bW = wc.boundaryW
    const bLen = bW.length
    const boundaryCam = new Array(bLen)
    for (let i = 0; i < bLen; i++) {
      const w = bW[i]
      boundaryCam[i] = worldVec3ToCamVec3(w.wx, w.wy, w.wz, trig)
    }

    const clippedPolys = clipSphericalRingToHorizon(boundaryCam)
    if (!clippedPolys.length) continue
    const pathD = camPolygonsToSvgPath(clippedPolys, CX, CY, R)
    if (!pathD) continue

    const cellLabelOpacity = props.showHealpixLabels
      ? computeSphericalLabelOpacity(centerCam.z, {
          minZ: 0.14,
          fadeTurns: props.labelFadeTurns
        })
      : 0

    cells.push({
      ipix: wc.ipix,
      face: wc.face,
      d: pathD,
      selected: selectedPixSet.has(String(wc.ipix)),
      hovered: !isDragging.value && hoveredHealpixPix.value === wc.ipix,
      labelVisible: cellLabelOpacity > 0.005,
      labelOpacity: Number(cellLabelOpacity.toFixed(3)),
      labelX: CX + centerCam.x * R,
      labelY: CY - centerCam.y * R
    })
  }
  return cells
})

function projectLonLat(lon, lat) {
  const cam = lonLatToCamVec3(Number(lon) || 0, Number(lat) || 0, cameraTrig.value)
  return {
    x: CX + cam.x * R,
    y: CY - cam.y * R,
    z: cam.z,
    visible: cam.z >= 0
  }
}

function clipRingToSvgPath(ring, stepDeg = 4) {
  if (!Array.isArray(ring) || ring.length < 3) return ''
  const dense = densifyRing(ring, stepDeg)
  const camPts = dense.map(([lon, lat]) => lonLatToCamVec3(lon, lat, cameraTrig.value))
  const clipped = clipSphericalRingToHorizon(camPts, {
    isSouthPolar: isSouthPolarRing(ring)
  })
  return clipped.length > 0 ? camPolygonsToSvgPath(clipped, CX, CY, R, { smoothBezier: true }) : ''
}

function projectPolygonItems(polyList, trig, layerId = 'default', layerInteractive = undefined) {
  if (!Array.isArray(polyList) || !polyList.length) return []
  const out = []

  for (let i = 0; i < polyList.length; i++) {
    let poly = polyList[i]
    if (!poly || poly.visible === false) continue
    const id = poly.id ?? `${layerId}-poly-${i}`
    let pathD = typeof poly.d === 'string' ? poly.d : ''

    // Generic support for variable-width spherical lines/ribbons passed via poly.line or poly.waypoints
    if (
      !pathD &&
      !Array.isArray(poly.worldRings) &&
      !Array.isArray(poly.rings) &&
      (Array.isArray(poly.line) || Array.isArray(poly.waypoints))
    ) {
      const builtRibbon = buildSphericalVariableWidthLinePolygon(poly.line || poly.waypoints, poly)
      poly = {
        ...builtRibbon,
        ...poly,
        worldRings: builtRibbon.worldRings,
        labelCoords: poly.labelCoords || builtRibbon.labelCoords
      }
    }

    const rings = Array.isArray(poly.rings)
      ? poly.rings
      : (Array.isArray(poly.coordinates) ? poly.coordinates : null)
    const interiorCam =
      Array.isArray(poly.interiorCenter) && poly.interiorCenter.length >= 2
        ? lonLatToCamVec3(Number(poly.interiorCenter[0]), Number(poly.interiorCenter[1]), trig)
        : null
    const useSmoothBezier = poly.smoothBezier !== false

    if (!pathD && Array.isArray(poly.worldRings) && poly.worldRings.length > 0) {
      for (const wRing of poly.worldRings) {
        if (!Array.isArray(wRing) || wRing.length < 3) continue
        const camPts = new Array(wRing.length)
        for (let k = 0; k < wRing.length; k++) {
          const w = wRing[k]
          const cPt = worldVec3ToCamVec3(w.wx, w.wy, w.wz, trig)
          if (w.cornerPin) cPt.cornerPin = true
          camPts[k] = cPt
        }
        const clipped = clipSphericalRingToHorizon(camPts, {
          isSouthPolar: Boolean(poly.isSouthPolar),
          interiorCam
        })
        if (clipped.length > 0) {
          pathD += camPolygonsToSvgPath(clipped, CX, CY, R, { smoothBezier: useSmoothBezier })
        }
      }
    } else if (!pathD && rings) {
      for (const ring of rings) {
        if (!Array.isArray(ring) || ring.length < 3) continue
        const dense = densifyRing(ring, poly.stepDeg || 4)
        const camPts = dense.map(([lon, lat]) => lonLatToCamVec3(lon, lat, trig))
        const clipped = clipSphericalRingToHorizon(camPts, {
          isSouthPolar: Boolean(poly.isSouthPolar ?? isSouthPolarRing(ring)),
          interiorCam
        })
        if (clipped.length > 0) {
          pathD += camPolygonsToSvgPath(clipped, CX, CY, R, { smoothBezier: useSmoothBezier })
        }
      }
    }

    if (!pathD) continue
    const hovered = hoveredPolygonId.value === id
    const interactive =
      poly.interactive !== undefined
        ? Boolean(poly.interactive)
        : (layerInteractive !== undefined ? Boolean(layerInteractive) : true)

    const isActive = Boolean(poly.isActive)
    let labelPos = null
    if (poly.label && Array.isArray(poly.labelCoords) && poly.labelCoords.length >= 2) {
      const lCam = lonLatToCamVec3(Number(poly.labelCoords[0]), Number(poly.labelCoords[1]), trig)
      const minZ = isActive ? 0.14 : 0.24
      const labelOpacity = computeSphericalLabelOpacity(lCam.z, {
        minZ,
        fadeTurns: props.labelFadeTurns
      })
      if (labelOpacity > 0.005) {
        const textStr = String(poly.label)
        const pillW = Math.max(34, textStr.length * 6.2 + 10)
        labelPos = {
          x: CX + lCam.x * R,
          y: CY - lCam.y * R,
          text: textStr,
          pillW,
          pillH: isActive ? 16 : 14,
          isActive,
          opacity: Number(labelOpacity.toFixed(3)),
          color: poly.labelColor || '#ffffff'
        }
      }
    }

    out.push({
      id,
      layerId,
      name: poly.name || String(id),
      d: pathD,
      fill: hovered && poly.hoverFill ? poly.hoverFill : (poly.fill || 'rgba(56, 189, 248, 0.22)'),
      stroke: poly.stroke || 'rgba(56, 189, 248, 0.72)',
      strokeWidth: poly.strokeWidth ?? 1.1,
      dashed: Boolean(poly.dashed),
      interactive,
      hovered,
      isActive,
      labelPos,
      raw: poly
    })
  }
  return out
}

const renderedCustomPolygons = computed(() =>
  projectPolygonItems(props.polygons || [], cameraTrig.value, 'polygons')
)

const builtInTimezonePolygons = computed(() => {
  if (!localShowTimezones.value) return []
  return buildSphericalTimezoneBands({
    mode: localTimezoneMode.value,
    morph: currentTimezoneMorph.value,
    activeOffsetHours: localActiveTimezoneOffset.value,
    showLabels: props.showTimezoneLabels
  })
})

const renderedLayers = computed(() => {
  const trig = cameraTrig.value
  const result = []

  if (localShowTimezones.value && builtInTimezonePolygons.value.length > 0) {
    const tzPolys = projectPolygonItems(
      builtInTimezonePolygons.value,
      trig,
      '__builtin_timezones__',
      true
    )
    if (tzPolys.length > 0) {
      result.push({
        id: '__builtin_timezones__',
        opacity: 1,
        polygons: tzPolys
      })
    }
  }

  if (Array.isArray(props.layers) && props.layers.length > 0) {
    for (let lIdx = 0; lIdx < props.layers.length; lIdx++) {
      const layer = props.layers[lIdx]
      if (!layer || layer.visible === false) continue
      const layerId = layer.id || `layer-${lIdx}`
      const polys = projectPolygonItems(layer.polygons || [], trig, layerId, layer.interactive)
      if (polys.length > 0) {
        result.push({
          id: layerId,
          opacity: layer.opacity ?? 1,
          polygons: polys
        })
      }
    }
  }

  if (renderedCustomPolygons.value.length > 0) {
    result.push({
      id: '__default_polygons__',
      opacity: 1,
      polygons: renderedCustomPolygons.value
    })
  }

  return result
})

const effectiveTerminatorMode = computed(() => {
  if (!props.solarTerminator || props.solarTerminator === 'off' || props.solarTerminator === 'none') {
    return null
  }
  if (typeof props.solarTerminator === 'string') {
    return props.solarTerminator
  }
  return props.terminatorMode || 'gradient'
})

const renderedSolarTerminator = computed(() => {
  const mode = effectiveTerminatorMode.value
  if (!mode || !Array.isArray(props.subsolarPoint) || props.subsolarPoint.length < 2) {
    return { bands: [], lineD: '' }
  }
  const defaultMaxOpacity = props.preset === 'nano-light' ? 0.38 : 0.52
  return buildSolarTerminatorSvgPrimitives(props.subsolarPoint, cameraTrig.value, {
    mode,
    cx: CX,
    cy: CY,
    r: R,
    maxOpacity: props.terminatorMaxOpacity ?? defaultMaxOpacity,
    bandCount: isDragging.value ? 20 : 32
  })
})

function onPolygonClick(poly) {
  if (dragMovedDistance > 5 || !poly.interactive) return
  if (poly.raw && typeof poly.raw.offsetHours === 'number') {
    localActiveTimezoneOffset.value = poly.raw.offsetHours
    emit('update:activeTimezoneOffset', poly.raw.offsetHours)
    emit('timezone-click', {
      offsetHours: poly.raw.offsetHours,
      name: poly.name,
      centerLon: poly.raw.centerLon,
      polygon: poly.raw
    })
  }
  emit('polygon-click', {
    id: poly.id,
    name: poly.name,
    polygon: poly.raw
  })
}

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
let isUnmounted = false

function flushPendingDrag() {
  dragRafId = null
  if (pendingLon === null || pendingLat === null) return
  rotLon.value = pendingLon
  rotLat.value = pendingLat
  lonKinetic.setTarget(pendingLon, { immediate: true })
  latKinetic.setTarget(pendingLat, { immediate: true })
  emit('update:center', [Number(pendingLon.toFixed(2)), Number(pendingLat.toFixed(2))])
}

function onPointerDown(e) {
  if (!props.interactive) return
  if (e.button !== undefined && e.button !== 0) return
  hideTooltip()
  lonKinetic.stop()
  latKinetic.stop()
  isDragging.value = true
  hoveredCountryId.value = null
  hoveredHealpixPix.value = null
  hoveredPolygonId.value = null
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

  const sensitivity = 180 / (effectiveSize.value * 0.85)
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
  lonKinetic.setTarget(rotLon.value, { immediate: true })
  latKinetic.setTarget(rotLat.value, { immediate: true })
  if (e?.pointerId !== undefined) {
    e.currentTarget?.releasePointerCapture?.(e.pointerId)
  }
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

function toggleTimezonesBtn() {
  localShowTimezones.value = !localShowTimezones.value
  emit('update:showTimezones', localShowTimezones.value)
}

function setTimezoneModeBtn(nextMode) {
  localTimezoneMode.value = nextMode
  localShowTimezones.value = true
  updateTimezoneMorphTarget(false)
  emit('update:timezoneMode', nextMode)
  emit('update:showTimezones', true)
}

function stepAutoRotate(ts) {
  animFrameId = null
  if (isUnmounted) return
  if (!lastAnimTime) lastAnimTime = ts
  const dt = Math.min(0.1, Math.max(0, (ts - lastAnimTime) / 1000))
  lastAnimTime = ts

  const omega = currentAutoRotateSpeed.value
  if (!isDragging.value && !lonKinetic.isMoving() && Math.abs(omega) > 1e-3 && dt > 0) {
    let nextLon = rotLon.value + omega * dt
    while (nextLon > 180) nextLon -= 360
    while (nextLon < -180) nextLon += 360
    rotLon.value = nextLon
    lonKinetic.setTarget(nextLon, { immediate: true })
    emit('update:center', [Number(nextLon.toFixed(2)), Number(rotLat.value.toFixed(2))])
  }

  const stillActive =
    Math.abs(currentAutoRotateSpeed.value) > 0.02 ||
    Math.abs(effectiveAutoRotateSpeed.value) > 0.02 ||
    speedKinetic.isMoving()

  if (stillActive && typeof requestAnimationFrame === 'function') {
    animFrameId = requestAnimationFrame(stepAutoRotate)
  } else {
    lastAnimTime = 0
  }
}

function ensureAutoRotateLoop() {
  if (isUnmounted || typeof requestAnimationFrame !== 'function') return
  const shouldRun =
    Math.abs(currentAutoRotateSpeed.value) > 0.02 ||
    Math.abs(effectiveAutoRotateSpeed.value) > 0.02 ||
    speedKinetic.isMoving()
  if (shouldRun && !animFrameId) {
    lastAnimTime = 0
    animFrameId = requestAnimationFrame(stepAutoRotate)
  }
}

function startOrStopAutoRotate() {
  const nextSpeed = effectiveAutoRotateSpeed.value
  const useKinetic =
    props.kinetic &&
    typeof window !== 'undefined' &&
    typeof requestAnimationFrame === 'function'

  if (!useKinetic) {
    speedKinetic.setTarget(nextSpeed, { immediate: true })
    currentAutoRotateSpeed.value = nextSpeed
  } else {
    speedKinetic.setConfig({ duration: props.kineticDuration })
    speedKinetic.setTarget(nextSpeed)
  }
  ensureAutoRotateLoop()
}

watch(() => props.autoRotateSpeed, startOrStopAutoRotate)
watch(() => props.autoRotateTurnsPerSec, startOrStopAutoRotate)
watch(() => props.autoRotate, startOrStopAutoRotate)

function rotateTo(lon, lat, options = {}) {
  const nextLon = Number(lon)
  const nextLat = Math.max(-85, Math.min(85, Number(lat)))
  if (!Number.isFinite(nextLon) || !Number.isFinite(nextLat)) return
  transitionToLonLat(nextLon, nextLat, Boolean(options.immediate))
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
  toggleTimezones: toggleTimezonesBtn,
  setTimezoneMode: setTimezoneModeBtn,
  projectLonLat,
  clipRingToSvgPath,
  rotLon,
  rotLat,
  currentAutoRotateSpeed,
  currentTurnsPerSec,
  currentTimezoneMorph,
  isDragging,
})

onMounted(() => {
  isUnmounted = false
  startOrStopAutoRotate()
})

onUnmounted(() => {
  isUnmounted = true
  lonKinetic.destroy()
  latKinetic.destroy()
  speedKinetic.destroy()
  timezoneMorphKinetic.destroy()
  if (animFrameId) {
    cancelAnimationFrame(animFrameId)
    animFrameId = null
  }
  if (dragRafId) {
    cancelAnimationFrame(dragRafId)
    dragRafId = null
  }
})
</script>

<template>
  <div class="nano-globe-wrap" :style="{ '--globe-size': effectiveSize + 'px' }">
    <svg
      class="nano-globe-svg"
      :class="{ 'is-dragging': isDragging, 'is-interactive': interactive }"
      :width="effectiveSize"
      :height="effectiveSize"
      :viewBox="`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`"
      role="img"
      aria-label="Interactive 3D Orthographic Globe"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @lostpointercapture="onPointerUp"
    >
      <defs>
        <!-- 3D Spherical Ocean Radial Gradient -->
        <radialGradient :id="`${uid}-ocean`" cx="36%" cy="32%" r="68%" fx="32%" fy="28%">
          <stop offset="0%" :stop-color="palette.oceanHighlight" />
          <stop offset="58%" :stop-color="palette.oceanMid" />
          <stop offset="100%" :stop-color="palette.oceanDeep" />
        </radialGradient>

        <!-- Outer Atmosphere Radial Gradient (Cubic ease-out Rayleigh decay from Earth's surface r=212 -> 85.1% of r=249 to 0% at 100%) -->
        <radialGradient :id="`${uid}-atmo-grad`" cx="50%" cy="50%" r="50%">
          <stop offset="0%" :stop-color="palette.atmosphereColor" :stop-opacity="atmospherePeakOpacity" />
          <stop offset="85.1%" :stop-color="palette.atmosphereColor" :stop-opacity="atmospherePeakOpacity" />
          <stop offset="87.6%" :stop-color="palette.atmosphereColor" :stop-opacity="(atmospherePeakOpacity * 0.66).toFixed(3)" />
          <stop offset="90.1%" :stop-color="palette.atmosphereColor" :stop-opacity="(atmospherePeakOpacity * 0.38).toFixed(3)" />
          <stop offset="92.6%" :stop-color="palette.atmosphereColor" :stop-opacity="(atmospherePeakOpacity * 0.19).toFixed(3)" />
          <stop offset="95.1%" :stop-color="palette.atmosphereColor" :stop-opacity="(atmospherePeakOpacity * 0.08).toFixed(3)" />
          <stop offset="97.6%" :stop-color="palette.atmosphereColor" :stop-opacity="(atmospherePeakOpacity * 0.02).toFixed(3)" />
          <stop offset="100%" :stop-color="palette.atmosphereColor" stop-opacity="0" />
        </radialGradient>

        <!-- Inner Spherical Limb Vignette -->
        <radialGradient :id="`${uid}-limb`" cx="50%" cy="50%" r="50%">
          <stop offset="76%" stop-color="rgba(0,0,0,0)" />
          <stop offset="94%" stop-color="rgba(0,12,18,0.22)" />
          <stop offset="100%" stop-color="rgba(0,8,14,0.48)" />
        </radialGradient>
      </defs>

      <!-- Outer Soft Atmosphere Halo (Ring or Radial 100% -> 0% Gradient) -->
      <template v-if="effectiveAtmosphereMode === 'gradient'">
        <circle
          :cx="CX"
          :cy="CY"
          :r="ATMO_GRAD_R"
          class="nano-globe-atmosphere-gradient"
          :fill="`url(#${uid}-atmo-grad)`"
          pointer-events="none"
        />
      </template>
      <template v-else-if="effectiveAtmosphereMode === 'ring'">
        <circle
          :cx="CX"
          :cy="CY"
          :r="ATMO_R + 6"
          class="nano-globe-atmosphere-glow"
          :fill="palette.atmosphereGlow"
          pointer-events="none"
        />
        <circle
          :cx="CX"
          :cy="CY"
          :r="ATMO_R"
          class="nano-globe-atmosphere-ring"
          :fill="palette.atmosphereOuter"
          pointer-events="none"
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
              v-tooltip="!isDragging ? `${country.name} (${country.id})` : undefined"
              :aria-label="`${country.name} (${country.id})`"
              @mouseenter="
                !isDragging &&
                  ((hoveredCountryId = country.id),
                  emit('country-hover', { id: country.id, name: country.name }))
              "
              @mouseleave="!isDragging && (hoveredCountryId = null)"
              @click.stop="onCountryClick(country)"
            />
          </template>
        </g>

        <!-- 2b. Physical Solar Terminator (Lambert Cosine Twilight Gradient & Thin Line) -->
        <g
          v-if="renderedSolarTerminator.bands.length || renderedSolarTerminator.lineD"
          class="nano-globe-solar-terminator"
          pointer-events="none"
        >
          <path
            v-for="band in renderedSolarTerminator.bands"
            :key="band.id"
            :d="band.d"
            :fill-rule="band.fillRule"
            :fill="terminatorFillColor"
            :fill-opacity="band.opacity"
          />
          <path
            v-if="renderedSolarTerminator.lineD"
            :d="renderedSolarTerminator.lineD"
            fill="none"
            :stroke="terminatorLineColor"
            :stroke-width="terminatorLineWidth"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
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
            v-tooltip="
              !isDragging
                ? `HEALPix #${cell.ipix} (face ${cell.face}, Nside=${1 << localHealpixOrder})`
                : undefined
            "
            :aria-label="`HEALPix #${cell.ipix} (face ${cell.face}, Nside=${1 << localHealpixOrder})`"
            @mouseenter="!isDragging && (hoveredHealpixPix = cell.ipix)"
            @mouseleave="!isDragging && (hoveredHealpixPix = null)"
            @click.stop="onHealpixClick(cell)"
          />
          <text
            v-for="cell in healpixCells.filter((c) => c.labelVisible)"
            :key="`lbl-${cell.ipix}`"
            :x="cell.labelX"
            :y="cell.labelY"
            :opacity="cell.labelOpacity"
            text-anchor="middle"
            dominant-baseline="central"
            class="nano-globe-healpix-label"
          >
            {{ cell.ipix }}
          </text>
        </g>

        <!-- 3b. Generic Spherical Overlay Layers & Polygons (e.g. Timezones, Variable-Width Ribbons, Custom Regions) -->
        <template v-for="layer in renderedLayers" :key="layer.id">
          <g
            class="nano-globe-custom-polygons"
            :data-layer-id="layer.id"
            :opacity="layer.opacity"
          >
            <template v-for="poly in layer.polygons" :key="poly.id">
              <path
                v-if="poly.isActive || poly.hovered"
                :d="poly.d"
                class="nano-globe-custom-polygon-glow"
                fill="none"
                stroke="rgba(0, 242, 254, 0.45)"
                :stroke-width="poly.isActive ? 6.5 : 4.5"
                stroke-linejoin="round"
                stroke-linecap="round"
                pointer-events="none"
              />
              <path
                :d="poly.d"
                class="nano-globe-custom-polygon"
                :class="{
                  'is-hovered': poly.hovered,
                  'is-active': poly.isActive,
                  'is-interactive': poly.interactive
                }"
                :fill="poly.fill"
                :stroke="poly.stroke"
                :stroke-width="poly.strokeWidth"
                :stroke-dasharray="poly.dashed ? '5 3' : undefined"
                stroke-linejoin="round"
                stroke-linecap="round"
                :pointer-events="poly.interactive ? 'auto' : 'none'"
                v-tooltip="!isDragging && poly.interactive && poly.name ? poly.name : undefined"
                :aria-label="poly.name || undefined"
                @mouseenter="
                  !isDragging &&
                    poly.interactive &&
                    ((hoveredPolygonId = poly.id),
                    emit('polygon-hover', { id: poly.id, layerId: layer.id, name: poly.name, polygon: poly.raw }))
                "
                @mouseleave="!isDragging && (hoveredPolygonId = null)"
                @click.stop="onPolygonClick(poly)"
              />
            </template>
            <g
              v-for="poly in layer.polygons.filter((p) => p.labelPos)"
              :key="`lbl-${poly.id}`"
              :opacity="poly.labelPos.opacity"
              pointer-events="none"
            >
              <rect
                :x="poly.labelPos.x - poly.labelPos.pillW / 2"
                :y="poly.labelPos.y - poly.labelPos.pillH / 2"
                :width="poly.labelPos.pillW"
                :height="poly.labelPos.pillH"
                rx="4"
                :fill="poly.labelPos.isActive ? 'rgba(2, 6, 23, 0.92)' : 'rgba(2, 6, 23, 0.76)'"
                :stroke="poly.labelPos.isActive ? '#00f2fe' : 'rgba(255, 255, 255, 0.36)'"
                :stroke-width="poly.labelPos.isActive ? 1.4 : 0.8"
              />
              <text
                :x="poly.labelPos.x"
                :y="poly.labelPos.y"
                text-anchor="middle"
                dominant-baseline="central"
                class="nano-globe-layer-label"
                :class="{ 'is-active': poly.labelPos.isActive }"
                :fill="poly.labelPos.color"
              >
                {{ poly.labelPos.text }}
              </text>
            </g>
          </g>
        </template>

        <!-- 3c. Scoped SVG Overlay Slot for Arbitrary Custom SVG Elements on the Sphere -->
        <slot
          name="svg-overlay"
          :project="projectLonLat"
          :clip-ring="clipRingToSvgPath"
          :cx="CX"
          :cy="CY"
          :r="R"
          :rot-lon="rotLon"
          :rot-lat="rotLat"
        />

        <!-- 4. Spherical 3D Limb Shading Overlay & Crisp Horizon Bezel -->
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
      <div class="nano-globe-order-pills" role="group" aria-label="Spherical Layers">
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
        <button
          type="button"
          class="nano-globe-btn"
          :class="{ active: localShowTimezones }"
          @click="toggleTimezonesBtn"
        >
          🕒 Strefy (UTC)
        </button>
      </div>
      <div v-if="localShowHealpix" class="nano-globe-order-pills" role="group" aria-label="HEALPix Resolution">
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
      <div v-if="localShowTimezones" class="nano-globe-order-pills" role="group" aria-label="Timezone Vector Mode">
        <button
          type="button"
          class="nano-globe-pill"
          :class="{ active: localTimezoneMode === 'clear' || localTimezoneMode === 'solar' }"
          @click="setTimezoneModeBtn('clear')"
        >
          📐 Clear (15°)
        </button>
        <button
          type="button"
          class="nano-globe-pill"
          :class="{ active: localTimezoneMode === 'complicated' || localTimezoneMode === 'political' }"
          @click="setTimezoneModeBtn('complicated')"
        >
          🧩 Complicated (IANA)
        </button>
      </div>
      <div class="nano-globe-order-pills" role="group" aria-label="Globe Color Preset">
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
  -webkit-user-select: none;
  user-select: none;
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

.nano-globe-healpix-cell,
.nano-globe-custom-polygon.is-interactive {
  cursor: pointer;
}

.nano-globe-svg.is-dragging .nano-globe-custom-polygon.is-interactive {
  cursor: grabbing;
}

.nano-globe-healpix-label,
.nano-globe-layer-label {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 9px;
  font-weight: 700;
  fill: rgba(255, 255, 255, 0.94);
  pointer-events: none;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

.nano-globe-layer-label.is-active {
  font-size: 10px;
  font-weight: 800;
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
  position: relative;
  height: 28px;
  padding: 0 0.68rem;
  border-radius: 0;
  border: 1px solid var(--nano-border-card, rgba(148, 163, 184, 0.3));
  background: var(--nano-bg-card, rgba(15, 23, 42, 0.75));
  color: var(--nano-text-secondary, #cbd5e1);
  font-size: 0.73rem;
  font-weight: 700;
  cursor: pointer;
  background-clip: padding-box;
  transition: border-color 140ms ease, background 140ms ease, color 140ms ease;
}

.nano-globe-btn:hover,
.nano-globe-pill:hover {
  z-index: 1;
  border-color: var(--nano-border-hover, rgba(148, 163, 184, 0.5));
  background: var(--nano-bg-hover, rgba(255, 255, 255, 0.08));
  color: var(--nano-text-main, #f8fafc);
}

.nano-globe-btn.active,
.nano-globe-pill.active {
  z-index: 2;
  border-color: var(--nano-preset-emerald, #10b981);
  color: var(--nano-preset-emerald, #10b981);
  background: color-mix(in srgb, var(--nano-preset-emerald, #10b981) 14%, var(--nano-bg-card, transparent));
}

.nano-globe-order-pills {
  display: inline-flex;
  align-items: stretch;
  gap: 0;
  isolation: isolate;
}

.nano-globe-order-pills > :first-child {
  border-top-left-radius: 7px;
  border-bottom-left-radius: 7px;
}

.nano-globe-order-pills > :last-child {
  border-top-right-radius: 7px;
  border-bottom-right-radius: 7px;
}

.nano-globe-order-pills > :not(:first-child) {
  margin-left: -1px;
}
</style>
