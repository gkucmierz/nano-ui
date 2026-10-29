<script setup>
import { ref, computed } from 'vue';
import PrecisionScrubber from '../../components/PrecisionScrubber.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';

const sampleIndex = ref(500000);
const maxVal = ref(112320215956025);
const fineTuneEnabled = ref(true);

const dspPitchSt = ref(0);

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
    <p>A high-performance logarithmic/exponential scrubber control designed for picking integer values within massive ranges (e.g., trillions) with single-digit precision using vertical cursor offsets, or direct high-resolution linear scrubbing for compact DSP parameters via <code>:fine-tune="false"</code>.</p>

    <div class="demo-section">
      <h3>Basic Playground (Two-Phase Scrubbing)</h3>
      <p class="demo-desc">Try holding and dragging horizontally on the track for coarse slider jumps. Drag vertically (up/down) outside the track to engage <strong>Fine-Tune</strong> mode (Phase 2), or toggle <code>:fine-tune="false"</code> below to lock the control to single-phase horizontal scrubbing.</p>
      
      <div class="controls-bar">
        <label class="switch-row">
          <NanoSwitch v-model="fineTuneEnabled" />
          <span>Enable 2nd Phase Vertical Fine-Tune (<code>:fine-tune="{{ fineTuneEnabled }}"</code>)</span>
        </label>
      </div>

      <div class="preview-container">
        <div class="value-display mono">{{ formattedValue }}</div>
        
        <PrecisionScrubber 
          v-model="sampleIndex"
          :max="maxVal"
          :fine-tune="fineTuneEnabled"
          :formatValue="formatCustomValue"
        />
      </div>
    </div>

    <div class="demo-section">
      <h3>Single-Phase High-Resolution DSP Mode (<code>:fine-tune="false"</code>)</h3>
      <p class="demo-desc">For compact parameter ranges (such as VoiceSynth DSP pitch shift, VITS duration rate, or formant scaling), setting <code>:fine-tune="false"</code> disables the 2nd vertical dragging phase and locks the scrubber to smooth, high-resolution horizontal stepping (e.g., <code>:step="0.05"</code>).</p>

      <div class="preview-container">
        <div class="value-display mono">{{ dspPitchSt > 0 ? `+${dspPitchSt.toFixed(2)}` : dspPitchSt.toFixed(2) }} ST</div>

        <PrecisionScrubber
          v-model="dspPitchSt"
          :min="-6"
          :max="6"
          :step="0.05"
          unit=" ST"
          :fine-tune="false"
        />
      </div>
    </div>

    <NanoCodeBlock title="API Reference" lang="api">
// Props
modelValue: Number (required, v-model)
min: Number (default: 0)
max: Number (required)
step: Number (default: 1) - Quantization step (supports fractional steps like 0.05, 0.005, 0.002)
unit: String (default: '') - Optional unit suffix displayed in the HUD (e.g. ' ST', 'x', ' Hz')
fineTune: Boolean (default: true) - Set to false to disable the 2nd vertical Fine-Tune drag phase
label: String (default: auto-adapts based on fineTune)
formatValue: Function (default: formats with step decimals + unit)

// Events
@update:modelValue - Emitted continuously on drag to update the model value
@change - Emitted once on mouseup when scrubbing finishes
    </NanoCodeBlock>
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

.controls-bar {
  margin-bottom: 1.25rem;
}

.switch-row {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--nano-text-main);
  font-size: 0.92rem;
  cursor: pointer;
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
