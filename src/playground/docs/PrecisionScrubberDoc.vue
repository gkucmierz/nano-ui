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
      <p class="demo-desc">Try holding and dragging horizontally on the track for coarse slider jumps. Drag vertically (up/down) by 15px to engage <strong>Fine-Tune</strong> mode, where dragging up increases the value, dragging down decreases it, and vertical distance controls precision.</p>
      
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

.doc-page h2 {
  color: var(--nano-text-main);
  margin: 0;
}

.doc-page > p {
  color: var(--nano-text-muted);
  margin: 0;
}

.demo-section {
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-card);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--nano-shadow-card);
}

.demo-section h3 {
  color: var(--nano-text-main);
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.demo-desc {
  color: var(--nano-text-muted);
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.preview-container {
  background: var(--nano-bg-card-elevated);
  border: 1px solid var(--nano-border-card);
  border-radius: 12px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  max-width: 600px;
  box-shadow: var(--nano-shadow-elevated);
}

.value-display {
  font-size: 2rem;
  font-weight: 800;
  color: var(--nano-state-active);
  font-family: ui-monospace, SFMono-Regular, monospace;
  letter-spacing: 0.05rem;
}

.api-reference {
  background: var(--nano-bg-code);
  border: 1px solid var(--nano-border-card);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: var(--nano-shadow-card);
}

.api-reference h3 {
  color: var(--nano-text-main);
  margin-top: 0;
  margin-bottom: 1rem;
}

.api-reference code {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.9rem;
  color: var(--nano-text-code);
  line-height: 1.6;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, monospace;
}
</style>
