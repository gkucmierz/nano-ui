<template>
  <div class="topology-radar-container" :style="{ width: size + 'px', height: size + 'px' }">
    <svg :viewBox="`0 0 ${size} ${size}`" :width="size" :height="size" style="overflow: visible;">
      <!-- Grid Lines -->
      <polygon :points="getGridPolygon(1.0)" fill="rgba(15,23,42,0.8)" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
      <polygon :points="getGridPolygon(0.75)" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
      <polygon :points="getGridPolygon(0.50)" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
      <polygon :points="getGridPolygon(0.25)" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1" />

      <!-- Axes -->
      <line 
        v-for="(label, i) in labels" 
        :key="'axis-'+i"
        :x1="size/2" :y1="size/2"
        :x2="getPoint(100, i).x" 
        :y2="getPoint(100, i).y"
        stroke="rgba(255,255,255,0.1)" 
        stroke-width="1"
      />

      <!-- Labels -->
      <text 
        v-for="(label, i) in labels" 
        :key="'label-'+i"
        :x="getPoint(115, i).x" 
        :y="getPoint(115, i).y"
        fill="rgba(255,255,255,0.5)"
        font-size="10"
        font-family="monospace"
        font-weight="bold"
        text-anchor="middle"
        dominant-baseline="middle"
      >
        {{ label }}
      </text>

      <!-- Historical Contour Lines -->
      <polygon 
        v-for="(snapshot, idx) in history" 
        :key="'hist-'+idx"
        :points="getPolygonPoints(snapshot)" 
        :fill="hexToRgba(color, 0.02)" 
        :stroke="color" 
        :stroke-width="1"
        :opacity="0.1 + (idx / Math.max(1, history.length)) * 0.4"
      />
      
      <!-- Live / Current Shape (Only if history is not empty) -->
      <polygon 
        v-if="history.length > 0"
        :points="getPolygonPoints(history[history.length - 1])" 
        :fill="hexToRgba(color, 0.15)" 
        :stroke="color" 
        stroke-width="2.5"
        style="filter: drop-shadow(0 0 8px rgba(0, 229, 255, 0.5));"
      />

      <!-- Data Points (Live) -->
      <circle
        v-if="history.length > 0"
        v-for="(val, i) in history[history.length - 1]"
        :key="'pt-'+i"
        :cx="getPoint(val, i).x"
        :cy="getPoint(val, i).y"
        r="3"
        :fill="color"
        style="filter: drop-shadow(0 0 5px rgba(0, 229, 255, 0.8));"
      />
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

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

const numAxes = computed(() => {
  if (props.labels.length > 0) return props.labels.length
  if (props.history.length > 0) return props.history[0].length
  return 5 // fallback
})

const radius = computed(() => props.size * 0.4)
const cx = computed(() => props.size / 2)
const cy = computed(() => props.size / 2)

const getPoint = (valuePct, index) => {
  const angle = (Math.PI * 2 * index / numAxes.value) - Math.PI / 2
  const dist = (valuePct / 100) * radius.value
  return {
    x: cx.value + Math.cos(angle) * dist,
    y: cy.value + Math.sin(angle) * dist
  }
}

const getGridPolygon = (percent) => {
  const points = []
  for (let i = 0; i < numAxes.value; i++) {
    const pt = getPoint(percent * 100, i)
    points.push(`${pt.x},${pt.y}`)
  }
  return points.join(' ')
}

const getPolygonPoints = (values) => {
  return values.map((val, i) => {
    const pt = getPoint(val, i)
    return `${pt.x},${pt.y}`
  }).join(' ')
}

const hexToRgba = (hex, alpha) => {
  let c;
  if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
    c = hex.substring(1).split('');
    if(c.length === 3){
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = '0x' + c.join('');
    return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
  }
  return `rgba(0, 229, 255, ${alpha})`; // fallback
}
</script>

<style scoped>
.topology-radar-container {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
