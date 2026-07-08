<script setup>
import { ref, computed } from 'vue';
import PrecisionScrubber from '../../components/PrecisionScrubber.vue';

const sampleIndex = ref(500000);
const maxVal = ref(112320215956025);

const formattedValue = computed(() => {
  return String(sampleIndex.value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
});

const formatCustomValue = (val) => {
  return String(val).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};
</script>

<template>
  <div class="doc-page">
    <h2>PrecisionScrubber Component</h2>
    <p>A high-performance logarithmic/exponential scrubber control designed for picking integer values within massive ranges (e.g., trillions) with single-digit precision using vertical cursor offsets.</p>

    <div class="demo-section">
      <h3>Basic Playground</h3>
      <p style="margin-bottom: 1.5rem; color: #94a3b8;">Try holding and dragging horizontally on the track for coarse slider jumps. Drag vertically (up/down) by 15px to engage <strong>Fine-Tune</strong> mode, where dragging up increases the value, dragging down decreases it, and vertical distance controls precision.</p>
      
      <div class="preview-container">
        <div class="value-display mono">
          {{ formattedValue }}
        </div>
        
        <PrecisionScrubber 
          v-model="sampleIndex"
          :max="maxVal"
          :formatValue="formatCustomValue"
          label="↔ Hold & Drag to Scrub (Pull Down to Fine-Tune) ↕"
        />
      </div>
    </div>

    <div class="api-reference">
      <h3>API Reference</h3>
      <code>
        // Props<br>
        modelValue: Number (required, v-model)<br>
        min: Number (default: 0)<br>
        max: Number (required)<br>
        label: String (default: '↔ Hold & Drag to Scrub (Pull Down to Fine-Tune) ↕')<br>
        formatValue: Function (default: val => String(val))<br>
        <br>
        // Events<br>
        @update:modelValue - Emitted on drag or input change to update the model value
      </code>
    </div>
  </div>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.preview-container {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  max-width: 600px;
}

.value-display {
  font-size: 2rem;
  font-weight: 800;
  color: #00e5ff;
  font-family: monospace;
  letter-spacing: 0.05rem;
}

.demo-section {
  background: rgba(30, 41, 59, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: 1.5rem;
}

.api-reference {
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 1.5rem;
}

.api-reference h3 {
  margin-top: 0;
  margin-bottom: 1rem;
}

.api-reference code {
  font-family: monospace;
  font-size: 0.9rem;
  color: #cbd5e1;
  line-height: 1.6;
}

.mono {
  font-family: monospace;
}
</style>
