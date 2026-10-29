<script setup>
import { ref } from 'vue';
import NanoSlider from '../../components/NanoSlider.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';

const mainValue = ref(72);
const volumeValue = ref(0.95);
const smValue = ref(35);
const mdValue = ref(65);
const lgValue = ref(85);
const showTicks = ref(true);
const isDisabled = ref(false);
</script>

<template>
  <div class="doc-page">
    <h2>NanoSlider Component</h2>
    <p>
      Tactile gradient range slider with dual-core thumb handle, subtle quartile scale ticks (25% / 50% / 75%),
      pointer-capture dragging, fractional step precision, and full keyboard accessibility.
    </p>

    <!-- CARD 1: Interactive Playground -->
    <div class="demo-section">
      <h3>Interactive Playground</h3>
      <p class="demo-desc">
        Drag the thumb or click anywhere along the track. Use <kbd class="nano-kbd">←</kbd> / <kbd class="nano-kbd">→</kbd>
        (or hold <kbd class="nano-kbd">Shift</kbd> for 10× steps) and <kbd class="nano-kbd">Home</kbd> / <kbd class="nano-kbd">End</kbd>.
      </p>

      <div class="controls-bar">
        <label class="ctrl-item">
          <NanoSwitch v-model="showTicks" />
          <span>Show quartile ticks (25% / 50% / 75%)</span>
        </label>
        <label class="ctrl-item">
          <NanoSwitch v-model="isDisabled" />
          <span>Disabled state</span>
        </label>
      </div>

      <div class="preview-grid">
        <div class="preview-card">
          <div class="preview-head">
            <span class="preview-label">Telemetry Intensity (0 – 100, step: 1)</span>
            <span class="value-badge mono">{{ mainValue }}%</span>
          </div>
          <NanoSlider
            v-model="mainValue"
            :min="0"
            :max="100"
            :step="1"
            :show-ticks="showTicks"
            :disabled="isDisabled"
            aria-label="Telemetry intensity"
          />
        </div>

        <div class="preview-card">
          <div class="preview-head">
            <span class="preview-label">Audio Master Volume (0.00 – 1.00, step: 0.01)</span>
            <span class="value-badge mono">{{ Math.round(volumeValue * 100) }}% ({{ volumeValue.toFixed(2) }})</span>
          </div>
          <NanoSlider
            v-model="volumeValue"
            :min="0"
            :max="1"
            :step="0.01"
            :show-ticks="showTicks"
            :disabled="isDisabled"
            aria-label="Audio master volume"
          />
        </div>
      </div>
    </div>

    <!-- CARD 2: Size Variants -->
    <div class="demo-section">
      <h3>Size Variants (sm / md / lg)</h3>
      <p class="demo-desc">
        Three ergonomic track and thumb geometries for compact toolbar controls, standard forms, or prominent studio decks.
      </p>

      <div class="sizes-stack">
        <div class="size-row">
          <span class="size-tag mono">size="sm"</span>
          <div class="size-slider-wrap">
            <NanoSlider v-model="smValue" size="sm" :show-ticks="showTicks" />
          </div>
          <span class="value-badge mono">{{ smValue }}%</span>
        </div>

        <div class="size-row">
          <span class="size-tag mono">size="md"</span>
          <div class="size-slider-wrap">
            <NanoSlider v-model="mdValue" size="md" :show-ticks="showTicks" />
          </div>
          <span class="value-badge mono">{{ mdValue }}%</span>
        </div>

        <div class="size-row">
          <span class="size-tag mono">size="lg"</span>
          <div class="size-slider-wrap">
            <NanoSlider v-model="lgValue" size="lg" :show-ticks="showTicks" />
          </div>
          <span class="value-badge mono">{{ lgValue }}%</span>
        </div>
      </div>
    </div>

    <NanoCodeBlock title="API Reference & Usage" lang="vue">
&lt;script setup&gt;
import { ref } from 'vue';
import { NanoSlider } from '@gkucmierz/nano-ui';

const volume = ref(0.95);
&lt;/script&gt;

&lt;template&gt;
  &lt;NanoSlider
    v-model="volume"
    :min="0"
    :max="1"
    :step="0.01"
    :show-ticks="true"
    size="md"
    aria-label="Master Volume"
  /&gt;
&lt;/template&gt;

/*
Props:
- modelValue: Number (default: 50, v-model)
- min: Number (default: 0)
- max: Number (default: 100)
- step: Number (default: 1, supports decimals like 0.01)
- showTicks: Boolean (default: true)
- size: 'sm' | 'md' | 'lg' (default: 'md')
- disabled: Boolean (default: false)
- ariaLabel: String (default: 'Slider')

CSS Custom Properties:
- --nano-slider-primary
- --nano-slider-secondary
- --nano-slider-track-bg
- --nano-slider-border
- --nano-slider-thumb-bg
*/
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
  line-height: 1.6;
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
  margin-bottom: 1.25rem;
  line-height: 1.5;
}

.controls-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  padding: 0.85rem 1.1rem;
  border-radius: 10px;
  background: var(--nano-bg-card-elevated);
  border: 1px solid var(--nano-border-card);
}

.ctrl-item {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: var(--nano-text-main);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
}

.preview-card {
  background: var(--nano-bg-card-elevated);
  border: 1px solid var(--nano-border-card);
  border-radius: 12px;
  padding: 1.25rem 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.preview-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.preview-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--nano-text-main);
}

.value-badge {
  font-size: 0.82rem;
  font-weight: 800;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-card);
  color: var(--nano-state-active, #4cc2e6);
}

.sizes-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.size-row {
  display: grid;
  grid-template-columns: 95px 1fr 64px;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.1rem;
  border-radius: 10px;
  background: var(--nano-bg-card-elevated);
  border: 1px solid var(--nano-border-card);
}

.size-tag {
  font-size: 0.8rem;
  color: var(--nano-text-muted);
}

.mono {
  font-family: ui-monospace, SFMono-Regular, monospace;
}
</style>
