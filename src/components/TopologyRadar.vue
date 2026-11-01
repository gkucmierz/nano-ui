<script setup>
import { computed, useId } from 'vue'

const props = defineProps({
  size: {
    type: Number,
    default: 200
  },
  history: {
    type: Array, // Array of arrays of numbers [0-100]
    required: true
  },
  labels: {
    type: Array,
    default: () => []
  },
  color: {
    type: String,
    default: '#00e5ff'
  }
})

const emit = defineEmits(['axis-click', 'point-hover'])

const uid = useId ? useId() : Math.random().toString(36).slice(2, 9)
const clipId = `nano-radar-clip-${uid}`

const numAxes = computed(() => {
  if (props.labels.length > 0) return props.labels.length
  if (props.history.length > 0 && Array.isArray(props.history[0])) return props.history[0].length
  return 5 // fallback
})

const radius = computed(() => props.size * 0.36)
const cx = computed(() => props.size / 2)
const cy = computed(() => props.size / 2)

/**
 * Computes polar coordinates for grid vertices (clamped to [0, 100] by default).
 */
const getPoint = (valuePct, index, clampToBounds = true) => {
  const safeVal = Number.isFinite(Number(valuePct)) ? Number(valuePct) : 0
  const pct = clampToBounds ? Math.max(0, Math.min(100, safeVal)) : safeVal
  const angle = (Math.PI * 2 * index / numAxes.value) - Math.PI / 2
  const dist = (pct / 100) * radius.value
  return {
    x: cx.value + Math.cos(angle) * dist,
    y: cy.value + Math.sin(angle) * dist
  }
}

/**
 * Computes coordinates for data polygon vertices and circles, inset by 3.5px at 100%
 * so the stroke (2.5px) and vertex circle (r=3) never protrude outside the outer polygon.
 */
const getDataPoint = (valuePct, index) => {
  const safeVal = Number.isFinite(Number(valuePct)) ? Number(valuePct) : 0
  const pct = Math.max(0, Math.min(100, safeVal))
  const angle = (Math.PI * 2 * index / numAxes.value) - Math.PI / 2
  const maxDataRadius = Math.max(4, radius.value - 3.5)
  const dist = (pct / 100) * maxDataRadius
  return {
    x: cx.value + Math.cos(angle) * dist,
    y: cy.value + Math.sin(angle) * dist
  }
}

/**
 * Computes external label position and quadrant-aware text-anchor so labels always
 * extend outward away from the polygon and never overlap its interior.
 */
const getLabelProps = (index) => {
  const angle = (Math.PI * 2 * index / numAxes.value) - Math.PI / 2
  const cosA = Math.cos(angle)
  const sinA = Math.sin(angle)
  const labelDist = radius.value + 11

  let textAnchor = 'middle'
  if (cosA > 0.18) textAnchor = 'start'
  else if (cosA < -0.18) textAnchor = 'end'

  const extraY = Math.abs(cosA) <= 0.18 ? (sinA < 0 ? -3 : 4) : 0

  return {
    x: cx.value + cosA * labelDist,
    y: cy.value + sinA * labelDist + extraY,
    textAnchor
  }
}

const getGridPolygon = (percent) => {
  const points = []
  for (let i = 0; i < numAxes.value; i++) {
    const pt = getPoint(percent * 100, i, false)
    points.push(`${pt.x},${pt.y}`)
  }
  return points.join(' ')
}

const getPolygonPoints = (values = []) => {
  const points = []
  for (let i = 0; i < numAxes.value; i++) {
    const val = Array.isArray(values) && i < values.length ? values[i] : 0
    const pt = getDataPoint(val, i)
    points.push(`${pt.x},${pt.y}`)
  }
  return points.join(' ')
}

const latestSnapshot = computed(() => {
  if (!Array.isArray(props.history) || props.history.length === 0) return null
  const last = props.history[props.history.length - 1]
  if (!Array.isArray(last)) return null
  return Array.from({ length: numAxes.value }, (_, i) => {
    const v = i < last.length ? Number(last[i]) : 0
    return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0
  })
})

const hexToRgba = (hex, alpha) => {
  let c
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split('')
    if (c.length === 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]]
    }
    c = '0x' + c.join('')
    return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')'
  }
  return `rgba(0, 229, 255, ${alpha})`
}

defineExpose({
  getPoint,
  getDataPoint,
  getGridPolygon,
  getPolygonPoints,
  numAxes,
  radius,
})
</script>

<template>
  <div class="topology-radar-container" :style="{ width: size + 'px', height: size + 'px' }">
    <svg :viewBox="`0 0 ${size} ${size}`" :width="size" :height="size" style="overflow: visible;">
      <defs>
        <!-- Strict geometric boundary clipPath so data polygons/dots never exceed the outer figure -->
        <clipPath :id="clipId">
          <polygon :points="getGridPolygon(1.0)" />
        </clipPath>
      </defs>

      <!-- 1. Concentric Grid Polygons -->
      <polygon
        :points="getGridPolygon(1.0)"
        fill="var(--nano-radar-grid-bg, rgba(15,23,42,0.8))"
        stroke="var(--nano-radar-grid-stroke, rgba(255,255,255,0.14))"
        stroke-width="1"
        stroke-linejoin="round"
      />
      <polygon
        :points="getGridPolygon(0.75)"
        fill="none"
        stroke="var(--nano-radar-grid-subtle, rgba(255,255,255,0.06))"
        stroke-width="1"
        stroke-linejoin="round"
      />
      <polygon
        :points="getGridPolygon(0.50)"
        fill="none"
        stroke="var(--nano-radar-grid-subtle, rgba(255,255,255,0.06))"
        stroke-width="1"
        stroke-linejoin="round"
      />
      <polygon
        :points="getGridPolygon(0.25)"
        fill="none"
        stroke="var(--nano-radar-grid-subtle, rgba(255,255,255,0.06))"
        stroke-width="1"
        stroke-linejoin="round"
      />

      <!-- 2. Radial Axis Spokes -->
      <line
        v-for="(_, i) in numAxes"
        :key="'axis-' + i"
        :x1="cx"
        :y1="cy"
        :x2="getPoint(100, i).x"
        :y2="getPoint(100, i).y"
        stroke="var(--nano-radar-grid-stroke, rgba(255,255,255,0.1))"
        stroke-width="1"
      />

      <!-- 3. Clipped Data Layer (Historical Contours + Live Polygon + Vertex Dots) -->
      <g class="radar-data-layer" :clip-path="`url(#${clipId})`">
        <!-- Historical Contour Lines -->
        <polygon
          v-for="(snapshot, idx) in history"
          :key="'hist-' + idx"
          :points="getPolygonPoints(snapshot)"
          :fill="hexToRgba(color, 0.02)"
          :stroke="color"
          stroke-width="1"
          stroke-linejoin="round"
          stroke-linecap="round"
          :opacity="0.1 + (idx / Math.max(1, history.length)) * 0.4"
        />

        <!-- Live / Current Shape -->
        <polygon
          v-if="latestSnapshot"
          :points="getPolygonPoints(latestSnapshot)"
          :fill="hexToRgba(color, 0.16)"
          :stroke="color"
          stroke-width="2.2"
          stroke-linejoin="round"
          stroke-linecap="round"
          style="filter: drop-shadow(0 0 6px rgba(0, 229, 255, 0.45));"
        />

        <!-- Data Points (Live) -->
        <template v-if="latestSnapshot">
          <circle
            v-for="(val, i) in latestSnapshot"
            :key="'pt-' + i"
            :cx="getDataPoint(val, i).x"
            :cy="getDataPoint(val, i).y"
            r="3"
            :fill="color"
            style="filter: drop-shadow(0 0 4px rgba(0, 229, 255, 0.75));"
            @mouseenter="emit('point-hover', { index: i, label: labels[i] || '', value: val })"
          />
        </template>
      </g>

      <!-- 4. Topmost Layer: Axis Labels (Always rendered ON TOP of polygons and dots) -->
      <g class="radar-labels-layer">
        <text
          v-for="(label, i) in labels"
          :key="'label-' + i"
          :x="getLabelProps(i).x"
          :y="getLabelProps(i).y"
          :text-anchor="getLabelProps(i).textAnchor"
          dominant-baseline="middle"
          fill="var(--nano-radar-text, rgba(241, 245, 249, 0.88))"
          font-size="10"
          font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
          font-weight="700"
          class="radar-axis-label"
          @click="emit('axis-click', { index: i, label })"
        >
          {{ label }}
        </text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.topology-radar-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.radar-axis-label {
  cursor: pointer;
  paint-order: stroke fill;
  stroke: var(--nano-bg-card, rgba(9, 13, 22, 0.92));
  stroke-width: 3.5px;
  stroke-linejoin: round;
  stroke-linecap: round;
  user-select: none;
}
</style>
