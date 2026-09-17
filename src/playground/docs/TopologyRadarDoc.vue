<template>
  <div class="doc-page">
    <div class="header-section">
      <h2>TopologyRadar</h2>
      <p class="desc">
        A multi-dimensional radar chart capable of rendering Z-axis historical contour lines, perfect for visualizing momentum and telemetry data.
      </p>
    </div>

    <div class="demo-section">
      <div class="radar-preview-card">
        <TopologyRadar
          :size="260"
          :labels="demoLabels"
          :history="demoHistory"
          :color="radarColor"
        />
      </div>

      <div class="radar-controls-card">
        <h3 class="controls-title">Playground Controls</h3>

        <div class="controls-grid">
          <div class="control-item">
            <label class="control-label">
              <span>Axes Count</span>
              <span class="control-value">{{ axesCount }}</span>
            </label>
            <input type="range" v-model.number="axesCount" min="3" max="15" step="1" />
          </div>

          <div class="control-item">
            <label class="control-label">
              <span>History Length</span>
              <span class="control-value">{{ historyLimit }}</span>
            </label>
            <input type="range" v-model.number="historyLimit" min="1" max="30" />
          </div>

          <div class="control-item">
            <label class="control-label">
              <span>Auto Feed</span>
              <span class="control-value">{{ feedRate }}ms</span>
            </label>
            <input type="range" v-model.number="feedRate" min="100" max="2000" step="100" />
          </div>
        </div>

        <div class="actions-row">
          <button type="button" class="btn btn-primary" v-ripple @click="feedRandom">
            Feed Random Point
          </button>
          <button type="button" class="btn btn-secondary" v-ripple @click="toggleAutoFeed">
            {{ autoFeedTimer ? 'Stop Auto Feed' : 'Start Auto Feed' }}
          </button>
          <button type="button" class="btn btn-danger" v-ripple @click="demoHistory = []">
            Clear History
          </button>
        </div>
      </div>
    </div>

    <!-- API Reference -->
    <NanoCodeBlock title="API Reference" lang="api">
// Props
size: Number (default: 200) - Chart width/height in px
history: Array (required) - Array of history snapshot arrays [0-100]
labels: Array (default: []) - Array of string axis names
color: String (default: '#00e5ff') - Accent stroke and contour color
    </NanoCodeBlock>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import TopologyRadar from '../../components/TopologyRadar.vue';

const axesCount = ref(5);
const demoLabels = computed(() => {
  const names = ['STRENGTH', 'AGILITY', 'INTELLECT', 'STAMINA', 'DEFENSE', 'CHARISMA', 'LUCK', 'MAGIC', 'STEALTH', 'PERCEPTION', 'SPEED', 'WILLPOWER', 'VITALITY', 'REFLEX', 'ARMOR'];
  return Array.from({ length: axesCount.value }, (_, i) => names[i] || `M${i + 1}`);
});

const demoHistory = ref([
  Array(5).fill(50)
]);

const radarColor = computed(() => {
  return '#00f2fe';
});

watch(axesCount, (newVal) => {
  demoHistory.value = [Array(newVal).fill(50)];
});

const historyLimit = ref(10);
const feedRate = ref(500);
const autoFeedTimer = ref(null);

const feedRandom = () => {
  const last = demoHistory.value.length > 0
    ? demoHistory.value[demoHistory.value.length - 1]
    : Array(axesCount.value).fill(50);

  const next = last.map((val) => {
    const diff = (Math.random() - 0.5) * 30;
    const newVal = Math.max(0, Math.min(100, val + diff));
    return Math.round(newVal);
  });

  demoHistory.value.push(next);

  if (demoHistory.value.length > historyLimit.value) {
    demoHistory.value = demoHistory.value.slice(-historyLimit.value);
  }
};

const toggleAutoFeed = () => {
  if (autoFeedTimer.value) {
    clearInterval(autoFeedTimer.value);
    autoFeedTimer.value = null;
  } else {
    autoFeedTimer.value = setInterval(feedRandom, feedRate.value);
  }
};

onBeforeUnmount(() => {
  if (autoFeedTimer.value) clearInterval(autoFeedTimer.value);
});
</script>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: var(--nano-space-lg, 24px);
  max-width: 900px;
}

.header-section h2 {
  margin: 0 0 var(--nano-space-xs, 4px) 0;
  color: var(--nano-text-main);
  font-size: 1.5rem;
  font-weight: 700;
}

.desc {
  color: var(--nano-text-muted);
  margin: 0;
  font-size: 0.95rem;
  line-height: var(--nano-line-height-base, 1.5);
}

.demo-section {
  display: flex;
  flex-direction: column;
  gap: var(--nano-space-md, 16px);
}

.radar-preview-card {
  background: var(--nano-bg-card);
  border: var(--nano-border-width, 1px) solid var(--nano-border-card);
  border-radius: var(--nano-radius-lg, 12px);
  box-shadow: var(--nano-shadow-card);
  padding: var(--nano-space-xl, 32px);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  backdrop-filter: blur(var(--nano-blur-md, 8px));
  -webkit-backdrop-filter: blur(var(--nano-blur-md, 8px));
}

.radar-controls-card {
  background: var(--nano-bg-card);
  border: var(--nano-border-width, 1px) solid var(--nano-border-card);
  border-radius: var(--nano-radius-lg, 12px);
  box-shadow: var(--nano-shadow-card);
  padding: var(--nano-space-lg, 24px);
  color: var(--nano-text-main);
}

.controls-title {
  margin: 0 0 var(--nano-space-md, 16px) 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--nano-text-main);
}

.controls-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nano-space-md, 16px);
  margin-bottom: var(--nano-space-lg, 24px);
}

.control-item {
  flex: 1 1 180px;
  min-width: 140px;
  display: flex;
  flex-direction: column;
  gap: var(--nano-space-xs, 4px);
}

.control-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: var(--nano-text-muted);
}

.control-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 600;
  color: var(--nano-text-main);
}

.control-item input[type="range"] {
  width: 100%;
  accent-color: var(--nano-accent-primary);
  cursor: pointer;
}

.actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nano-space-sm, 8px);
}

.btn {
  padding: var(--nano-space-sm, 8px) var(--nano-space-md, 16px);
  border-radius: var(--nano-radius-sm, 4px);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  outline: none;
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background var(--nano-transition-interactive), border-color var(--nano-transition-interactive), opacity var(--nano-transition-interactive);
}

.btn-primary {
  background: var(--nano-accent-primary);
  color: #ffffff;
}

.btn-primary:hover {
  background: var(--nano-accent-primary-hover);
}

.btn-secondary {
  background: color-mix(in srgb, var(--nano-accent-primary) 15%, transparent);
  color: var(--nano-accent-primary);
  border: var(--nano-border-width, 1px) solid color-mix(in srgb, var(--nano-accent-primary) 30%, transparent);
}

.btn-secondary:hover {
  background: color-mix(in srgb, var(--nano-accent-primary) 25%, transparent);
}

.btn-danger {
  background: color-mix(in srgb, #ef4444 15%, transparent);
  color: #ef4444;
  border: var(--nano-border-width, 1px) solid color-mix(in srgb, #ef4444 30%, transparent);
}

.btn-danger:hover {
  background: color-mix(in srgb, #ef4444 25%, transparent);
}

.section-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--nano-text-main);
  margin: var(--nano-space-md, 16px) 0 0 0;
}

.api-reference {
  background: var(--nano-bg-card);
  border: var(--nano-border-width, 1px) solid var(--nano-border-card);
  border-radius: var(--nano-radius-lg, 12px);
  box-shadow: var(--nano-shadow-card);
  padding: var(--nano-space-md, 16px);
}

.api-reference pre {
  margin: 0;
  white-space: pre;
}

.api-reference code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.85rem;
  line-height: var(--nano-line-height-base, 1.5);
  color: var(--nano-text-main);
}
</style>
