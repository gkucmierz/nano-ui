<template>
  <div 
    class="nano-scrub-track"
    @mousedown="startScrubbing"
    ref="trackRef"
    v-bind="$attrs"
  >
    <!-- Visual progress bar inside the track -->
    <div 
      class="nano-scrub-progress"
      :style="{ width: progressPercent + '%' }"
    ></div>
    
    <span class="nano-scrub-label">{{ resolvedLabel }}</span>
  </div>

  <!-- HUD Overlay for high-precision scrubbing -->
  <Teleport v-if="isMounted" to="body">
    <div v-if="isScrubbing" class="nano-scrub-overlay">
      <!-- Start location anchor dot -->
      <div v-if="isScrubbingRelative" class="nano-scrub-anchor" :style="{ left: scrubStartX + 'px', top: scrubStartY + 'px' }"></div>
      <!-- Dotted indicator line -->
      <svg v-if="isScrubbingRelative" class="nano-scrub-svg-line">
        <line 
          :x1="scrubStartX" 
          :y1="scrubStartY" 
          :x2="scrubCurrentX" 
          :y2="scrubCurrentY" 
          stroke="#00e5ff" 
          stroke-dasharray="4,4" 
          stroke-width="1.5"
          opacity="0.6"
        />
      </svg>
      <!-- Floating HUD panel -->
      <div class="nano-scrub-popup" :style="{ left: (scrubCurrentX + 15) + 'px', top: (scrubCurrentY + 15) + 'px' }">
        <div class="nano-scrub-popup-title">Scrubbing Mode</div>
        <div class="nano-scrub-popup-val">{{ formattedValue }}</div>
        <div class="nano-scrub-popup-res">{{ scrubResolutionText }}</div>
      </div>
    </div>
  </Teleport>
</template>

<script>
export default {
  inheritAttrs: false
}
</script>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const isMounted = ref(false);

onMounted(() => {
  isMounted.value = true;
});

onUnmounted(() => {
  isScrubbing.value = false;
  if (typeof document !== 'undefined') {
    document.removeEventListener('mousemove', handleScrubMove);
    document.removeEventListener('mouseup', stopScrubbing);
  }
});

const props = defineProps({
  modelValue: {
    type: Number,
    required: true
  },
  min: {
    type: Number,
    default: 0
  },
  max: {
    type: Number,
    required: true
  },
  step: {
    type: Number,
    default: 1
  },
  unit: {
    type: String,
    default: ''
  },
  fineTune: {
    type: Boolean,
    default: true
  },
  label: {
    type: String,
    default: undefined
  },
  formatValue: {
    type: Function,
    default: undefined
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const trackRef = ref(null)

const isScrubbing = ref(false)
const isScrubbingRelative = ref(false)
const mousedownClientX = ref(0)
const originalValue = ref(0)
const scrubStartX = ref(0)
const scrubStartY = ref(0)
const scrubStartIndex = ref(0)
const scrubCurrentX = ref(0)
const scrubCurrentY = ref(0)
const scrubResolutionText = ref('')
const scrubTrackRect = ref({ left: 0, width: 0 })

const stepDecimals = computed(() => {
  const stepVal = Number(props.step)
  if (!Number.isFinite(stepVal) || stepVal <= 0) return 0
  const str = String(stepVal)
  if (str.includes('e-')) {
    return parseInt(str.split('e-')[1], 10) || 0
  }
  const dotIdx = str.indexOf('.')
  return dotIdx === -1 ? 0 : str.length - dotIdx - 1
})

const quantizeValue = (rawVal) => {
  const stepVal = Number(props.step) > 0 ? Number(props.step) : 1
  const clamped = Math.min(props.max, Math.max(props.min, rawVal))
  const steps = Math.round((clamped - props.min) / stepVal)
  const stepped = props.min + steps * stepVal
  const bounded = Math.min(props.max, Math.max(props.min, stepped))
  const decimals = stepDecimals.value
  return decimals > 0 ? Number(bounded.toFixed(decimals)) : Math.round(bounded)
}

const resolvedLabel = computed(() => {
  if (props.label !== undefined) return props.label
  return props.fineTune
    ? '↔ Hold & Drag to Scrub (Pull Down to Fine-Tune) ↕'
    : '↔ Hold & Drag Horizontally to Scrub ↔'
})

const progressPercent = computed(() => {
  const range = props.max - props.min
  if (range <= 0) return 0
  const pct = ((props.modelValue - props.min) / range) * 100
  return Math.min(100, Math.max(0, pct))
})

const formatNum = (num, decimals = stepDecimals.value) => {
  const fixed = decimals > 0 ? Number(num).toFixed(decimals) : String(Math.round(num))
  const [intPart, decPart] = fixed.split('.')
  const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return decPart !== undefined ? `${groupedInt}.${decPart}` : groupedInt
}

const formattedValue = computed(() => {
  if (typeof props.formatValue === 'function') {
    return props.formatValue(props.modelValue)
  }
  return `${formatNum(props.modelValue)}${props.unit || ''}`
})

const getCoarseResolutionLabel = () => {
  if (!props.fineTune) {
    return `Linear (step ±${props.step}${props.unit || ''})`
  }
  return 'Coarse (Full range)'
}

const startScrubbing = (e) => {
  if (e.button !== 0) return
  const range = props.max - props.min
  if (range <= 0) return
  
  isScrubbing.value = true
  isScrubbingRelative.value = false
  
  const rect = e.currentTarget.getBoundingClientRect()
  scrubTrackRect.value = { 
    left: rect.left, 
    width: rect.width, 
    top: rect.top, 
    bottom: rect.bottom, 
    height: rect.height 
  }
  
  const clickX = e.clientX
  mousedownClientX.value = clickX
  
  // Save original value to restore/use if they transition straight to fine-tuning
  originalValue.value = props.modelValue
  scrubStartIndex.value = props.modelValue
  
  scrubStartX.value = clickX
  scrubStartY.value = e.clientY
  scrubCurrentX.value = clickX
  scrubCurrentY.value = e.clientY
  scrubResolutionText.value = getCoarseResolutionLabel()
  
  document.addEventListener('mousemove', handleScrubMove)
  document.addEventListener('mouseup', stopScrubbing)
  
  e.preventDefault()
}

const handleScrubMove = (e) => {
  if (!isScrubbing.value) return
  
  scrubCurrentX.value = e.clientX
  scrubCurrentY.value = e.clientY
  
  const range = props.max - props.min
  if (range <= 0) return
  
  const rect = scrubTrackRect.value
  let yOffset = 0
  let isOutside = false
  
  if (props.fineTune) {
    if (e.clientY < rect.top) {
      isOutside = true
      yOffset = rect.top - e.clientY
    } else if (e.clientY > rect.bottom) {
      isOutside = true
      yOffset = e.clientY - rect.bottom
    }
    
    if (!isScrubbingRelative.value && isOutside) {
      isScrubbingRelative.value = true
      scrubStartX.value = e.clientX
      // Set the anchor dot visually exactly on the border of the track
      scrubStartY.value = (e.clientY > rect.bottom) ? rect.bottom : rect.top
      
      // If the horizontal drag is small, use originalValue to avoid accidental coarse drift.
      // Otherwise, lock to the current modelValue (the coarse value they dragged to).
      const horizontalDrag = Math.abs(e.clientX - mousedownClientX.value)
      if (horizontalDrag < 8) {
        scrubStartIndex.value = originalValue.value
      } else {
        scrubStartIndex.value = props.modelValue
      }
    }
  }
  
  if (props.fineTune && isScrubbingRelative.value) {
    // Relative fine-tuning mode: vertical drag outside track adjusts value, horizontal is locked
    const activeDeltaY = yOffset
    const stepVal = Number(props.step) > 0 ? Number(props.step) : 1
    
    const baseStep = 0.25
    const b = 1.08
    const multiplier = activeDeltaY + (Math.pow(b, activeDeltaY) - 1)
    
    // Dragging UP (negative deltaY) increases the value, dragging DOWN decreases it
    const sign = (e.clientY < rect.top) ? -1 : 1
    const stepChange = Math.round(-sign * baseStep * multiplier)
    
    const nextVal = quantizeValue(scrubStartIndex.value + stepChange * stepVal)
    emit('update:modelValue', nextVal)
    
    const instStep = baseStep * (1 + Math.pow(b, activeDeltaY) * Math.log(b)) * stepVal
    if (instStep >= 1e9) {
      scrubResolutionText.value = `Coarse (±${formatNum(Math.round(instStep), 0)} / px)`
    } else if (instStep >= 1e6) {
      scrubResolutionText.value = `Medium (±${formatNum(Math.round(instStep), 0)} / px)`
    } else if (instStep >= stepVal) {
      scrubResolutionText.value = `Fine (±${formatNum(instStep)} / px)`
    } else {
      scrubResolutionText.value = `Ultra-Fine (±${formatNum(stepVal)} per ${Math.max(1, Math.round(stepVal / instStep))}px)`
    }
  } else {
    // Coarse / direct linear absolute mode (min to max mapped to borders with 8px deadzone snapping)
    const padding = 8
    const trackWidth = Math.max(1, rect.width - 2 * padding)
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left - padding) / trackWidth))
    const nextVal = quantizeValue(props.min + ratio * range)
    emit('update:modelValue', nextVal)
    scrubResolutionText.value = getCoarseResolutionLabel()
  }
}

const stopScrubbing = (e) => {
  let finalVal = props.modelValue
  if (isScrubbing.value && (!props.fineTune || !isScrubbingRelative.value)) {
    // Single absolute click jump on mouseup if they didn't fine-tune
    const range = props.max - props.min
    if (range > 0 && scrubTrackRect.value.width > 0) {
      const rect = scrubTrackRect.value
      const padding = 8
      const trackWidth = Math.max(1, rect.width - 2 * padding)
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left - padding) / trackWidth))
      finalVal = quantizeValue(props.min + ratio * range)
      emit('update:modelValue', finalVal)
    }
  }
  
  isScrubbing.value = false
  document.removeEventListener('mousemove', handleScrubMove)
  document.removeEventListener('mouseup', stopScrubbing)
  emit('change', finalVal)
}

function setValue(val) {
  const next = quantizeValue(val)
  emit('update:modelValue', next)
  emit('change', next)
}

function stepBy(steps = 1) {
  const stepVal = Number(props.step) > 0 ? Number(props.step) : 1
  setValue(Number(props.modelValue || 0) + steps * stepVal)
}

defineExpose({
  setValue,
  stepBy,
  quantizeValue,
  isScrubbing,
  isScrubbingRelative,
  scrubResolutionText,
  progressPercent,
  progressPercentage: progressPercent,
})
</script>

<style scoped>
.nano-scrub-track {
  width: 100%;
  height: 44px;
  background: var(--nano-scrub-bg, rgba(0, 229, 255, 0.02));
  border: var(--nano-border-width, 1px) dashed var(--nano-scrub-border, rgba(0, 229, 255, 0.25));
  border-radius: var(--nano-radius-md, 8px);
  cursor: ew-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  user-select: none;
  transition: border-color var(--nano-transition-interactive), background-color var(--nano-transition-interactive);
}

.nano-scrub-track:hover {
  background: var(--nano-scrub-hover-bg, rgba(0, 229, 255, 0.04));
  border-color: var(--nano-scrub-hover-border, rgba(0, 229, 255, 0.4));
}

.nano-scrub-progress {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: var(--nano-scrub-progress-bg, rgba(0, 229, 255, 0.06));
  pointer-events: none;
}

.nano-scrub-label {
  font-size: 10px;
  font-weight: bold;
  color: var(--nano-scrub-color, #00e5ff);
  letter-spacing: 0.03rem;
  z-index: 1;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* HUD Overlay Styles */
.nano-scrub-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 99999;
  pointer-events: none;
  user-select: none;
}

.nano-scrub-anchor {
  position: fixed;
  width: 10px;
  height: 10px;
  background: #00e5ff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 12px #00e5ff, 0 0 24px rgba(0, 229, 255, 0.4);
}

.nano-scrub-svg-line {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
}

.nano-scrub-popup {
  position: fixed;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(0, 229, 255, 0.35);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 229, 255, 0.15);
  padding: 12px 16px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  pointer-events: none;
  min-width: 200px;
  backdrop-filter: blur(8px);
}

.nano-scrub-popup-title {
  font-size: 10px;
  text-transform: uppercase;
  color: #64748b;
  font-weight: bold;
  letter-spacing: 0.06rem;
}

.nano-scrub-popup-val {
  font-size: 1.25rem;
  color: #fff;
  font-weight: 800;
  letter-spacing: 0.05rem;
  font-family: monospace;
}

.nano-scrub-popup-res {
  font-size: 11px;
  color: #00e5ff;
  font-weight: 700;
}
</style>
