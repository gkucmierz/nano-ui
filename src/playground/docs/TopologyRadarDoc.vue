<template>
  <div class="doc-page">
    <h1>TopologyRadar</h1>
    <p>A multi-dimensional radar chart capable of rendering Z-axis historical contour lines, perfect for visualizing momentum and telemetry data.</p>
    
    <div class="demo-section">
      <div class="demo-preview dark-preview" style="background: #0f172a; padding: 40px; border-radius: 8px;">
        <TopologyRadar 
          :size="250"
          :labels="demoLabels"
          :history="demoHistory"
          color="#00e5ff"
        />
      </div>

      <div class="demo-controls" style="margin-top: 20px; padding: 20px; background: #1e293b; border-radius: 8px; color: #fff;">
        <h3 style="margin-top: 0;">Playground Controls</h3>
        
        <div style="display: flex; gap: 20px; margin-bottom: 20px;">
          <div>
            <label style="display: block; margin-bottom: 5px;">Axes Count: {{ axesCount }}</label>
            <input type="range" v-model.number="axesCount" min="3" max="15" step="1" />
          </div>
          <div>
            <label style="display: block; margin-bottom: 5px;">History Length: {{ historyLimit }}</label>
            <input type="range" v-model.number="historyLimit" min="1" max="30" />
          </div>
          <div>
            <label style="display: block; margin-bottom: 5px;">Auto Feed (ms): {{ feedRate }}</label>
            <input type="range" v-model.number="feedRate" min="100" max="2000" step="100" />
          </div>
        </div>
        
        <div style="display: flex; gap: 10px;">
          <button @click="feedRandom" style="padding: 8px 16px; cursor: pointer; background: #00e5ff; color: #000; border: none; font-weight: bold; border-radius: 4px;">Feed Random Point</button>
          <button @click="toggleAutoFeed" style="padding: 8px 16px; cursor: pointer; background: #3b82f6; color: #fff; border: none; font-weight: bold; border-radius: 4px;">{{ autoFeedTimer ? 'Stop' : 'Start' }} Auto Feed</button>
          <button @click="demoHistory = []" style="padding: 8px 16px; cursor: pointer; background: #ef4444; color: #fff; border: none; font-weight: bold; border-radius: 4px;">Clear</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import TopologyRadar from '../../components/TopologyRadar.vue'

const axesCount = ref(5)
const demoLabels = computed(() => {
  const names = ['STRENGTH', 'AGILITY', 'INTELLECT', 'STAMINA', 'DEFENSE', 'CHARISMA', 'LUCK', 'MAGIC', 'STEALTH', 'PERCEPTION', 'SPEED', 'WILLPOWER', 'VITALITY', 'REFLEX', 'ARMOR']
  return Array.from({ length: axesCount.value }, (_, i) => names[i] || `M${i+1}`)
})

const demoHistory = ref([
  Array(5).fill(50) // initial state
])

watch(axesCount, (newVal) => {
  demoHistory.value = [Array(newVal).fill(50)]
})

const historyLimit = ref(10)
const feedRate = ref(500)
const autoFeedTimer = ref(null)

const feedRandom = () => {
  const last = demoHistory.value.length > 0 
    ? demoHistory.value[demoHistory.value.length - 1] 
    : Array(axesCount.value).fill(50)

  // Random walk based on previous point to simulate momentum smoothly
  const next = last.map(val => {
    let diff = (Math.random() - 0.5) * 30; // +/- 15
    let newVal = Math.max(0, Math.min(100, val + diff))
    return Math.round(newVal)
  })

  demoHistory.value.push(next)
  
  if (demoHistory.value.length > historyLimit.value) {
    demoHistory.value = demoHistory.value.slice(-historyLimit.value)
  }
}

const toggleAutoFeed = () => {
  if (autoFeedTimer.value) {
    clearInterval(autoFeedTimer.value)
    autoFeedTimer.value = null
  } else {
    autoFeedTimer.value = setInterval(feedRandom, feedRate.value)
  }
}

onBeforeUnmount(() => {
  if (autoFeedTimer.value) clearInterval(autoFeedTimer.value)
})
</script>

<style scoped>
.doc-page {
  padding: 20px;
  max-width: 800px;
}
input[type=range] {
  width: 150px;
}
</style>
