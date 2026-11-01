<script setup>
import { ref } from 'vue';
import NanoNumberStepper from '../../components/NanoNumberStepper.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { createDocTabs } from '../docSnippets.js';

const codeTabs = createDocTabs({
  componentName: 'NanoNumberStepper',
  stateRef: 'seedVal',
  initialValue: '27',
  templateAttrs: [
    'v-model="seedVal"',
    'variant="stacked"',
    'color="primary"',
    ':min="1"',
    ':max="100000"',
    ':step="1"',
    'size="md"',
    'width="120px"',
    'aria-label="Seed value"',
  ],
  apiSections: [
    {
      title: 'Props (all optional except v-model)',
      items: [
        'modelValue: Number (default: 0, v-model) - Current numeric value',
        'variant: String (default: "stacked") - Layout mode: "stacked" (right-side 50%/50% Up/Down chevrons) | "split" (glued left − and right + buttons)',
        'color: String (optional, default: "secondary") - Semantic color matching Nano UI buttons ("primary" | "success" | "danger" | "active" | "secondary" | "ghost" | "warn" | "info" | "purple") or any raw CSS color/variable',
        'min: Number (optional, default: -Infinity) - Lower bound; omit for unbounded negative numbers',
        'max: Number (optional, default: Infinity) - Upper bound; omit for unbounded positive numbers',
        'step: Number (optional, default: 1) - Increment/decrement delta (supports integers and decimals like 0.05, Shift+Arrow steps 10×)',
        'size: String (optional, default: "md") - Geometry preset ("sm" = 26px | "md" = 32px | "lg" = 40px)',
        'width: String | Number (optional, default: auto) - Explicit CSS width (e.g. "110px" or 140)',
        'align: String (optional, default: "left" for stacked, "center" for split) - Input text alignment ("left" | "center" | "right")',
        'prefix / suffix: String (optional, default: "") - Inline unit or currency affix inside the input frame',
        'decrementLabel / incrementLabel: String (optional, default: "") - Custom text labels on split buttons (e.g. "-100" / "+100")',
        'wheelStep: Boolean (optional, default: true) - Step value with mouse wheel while input is focused',
        'disabled: Boolean (optional, default: false) - Disable input and stepper buttons',
      ],
    },
    {
      title: 'Single-Variable CSS Theming (SSoT)',
      items: [
        '--nano-stepper-color: <color> - Set 1 CSS variable (or pass color="primary" | "success" | "danger" | "active" | "secondary" | "ghost") to automatically theme outer border, button tint, dividers, icon color, hover glow, and focus ring',
      ],
    },
    {
      title: 'Events',
      items: [
        '@update:modelValue: (val: number) => void - Emitted immediately on input, button click, press-and-hold repeat, or wheel',
        '@change: (val: number) => void - Emitted when stepping or when input blurs after clamping/snapping',
      ],
    },
    {
      title: 'Exposed Methods (via template ref)',
      items: [
        'stepBy(multiplier = 1): void - Programmatically increment (+1) or decrement (-1) by step * multiplier',
        'clampAndSnap(raw: number): number - Clamp to [min, max] and round to step precision',
        'focus(): void - Focus the underlying numeric input element',
      ],
    },
  ],
});

const selectedColor = ref('primary');
const colorVariants = ['primary', 'success', 'danger', 'active', 'secondary', 'ghost'];

const rangeMin = ref(2);
const rangeMax = ref(500);
const seedVal = ref(27);
const freqVal = ref(5190);

// Color showcase state
const colorVals = ref({
  primary: 42,
  success: 100,
  danger: 3,
  active: 27,
  secondary: 16,
  ghost: 8,
  customAmber: 64,
  customPurple: 128,
});

// Optional min / max / step playground states
const unboundedVal = ref(0);
const clampedVal = ref(5);
const decimalVal = ref(1.25);

// Sizes
const smVal = ref(12);
const mdVal = ref(27);
const lgVal = ref(64);
const isDisabled = ref(false);
</script>

<template>
  <div class="doc-page">
    <div class="doc-header">
      <div class="doc-badge-row">
        <span class="nano-badge nano-badge-primary">Component</span>
        <span class="nano-badge nano-badge-secondary">2 Variants: stacked &amp; split</span>
        <span class="nano-badge nano-badge-info">6 Button Colors + 1 CSS Variable</span>
        <span class="nano-badge nano-badge-success">Optional min / max / step</span>
      </div>
      <h2>NanoNumberStepper Component</h2>
      <p>
        Precision glassmorphic numeric stepper replacing native browser <code>&lt;input type="number"&gt;</code> spin-buttons with two ergonomic architectures:
        <strong><code>variant="stacked"</code></strong> (both Up/Down chevrons stacked on the right at 50% height each) and
        <strong><code>variant="split"</code></strong> (glued Decrement <code>−</code> and Increment <code>+</code> buttons on both sides of the input).
        Supports the exact 6 semantic button colors (<code>primary</code>, <code>success</code>, <code>danger</code>, <code>active</code>, <code>secondary</code>, <code>ghost</code>) or a single CSS variable <code>--nano-stepper-color</code>.
      </p>
    </div>

    <!-- CARD 1: Two Layout Variants (stacked vs split) + Interactive Color Selector -->
    <div class="demo-section">
      <h3>1. Dual Layout Variants (<code>stacked</code> vs <code>split</code>)</h3>
      <p class="demo-desc">
        Choose <code>variant="stacked"</code> for compact side-by-side range inputs or <code>variant="split"</code> for centered counters and custom step labels. Switch the <strong>Color Variant</strong> below to preview all 6 Nano UI button tones live:
      </p>

      <div class="controls-bar">
        <div class="ctrl-color-group">
          <span class="ctrl-group-label">VARIANT COLOR</span>
          <div class="nano-cluster">
            <button
              v-for="c in colorVariants"
              :key="c"
              type="button"
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': selectedColor === c }"
              @click="selectedColor = c"
            >
              {{ c }}
            </button>
          </div>
        </div>

        <label class="ctrl-item">
          <NanoSwitch v-model="isDisabled" />
          <span>Disabled state</span>
        </label>
      </div>

      <div class="preview-grid">
        <!-- Variant 1: Stacked Right-Side 50%/50% -->
        <div class="preview-card">
          <div class="preview-head">
            <span class="preview-label">Right-Side 50% / 50% Stack</span>
            <span class="value-badge mono">variant="stacked" color="{{ selectedColor }}"</span>
          </div>
          <p class="card-note">
            Both Up/Down buttons sit on the right side of the input, each taking 50% of the input height:
          </p>
          <div class="stepper-row">
            <div class="stepper-field">
              <label>Range Min (Od)</label>
              <NanoNumberStepper
                v-model="rangeMin"
                variant="stacked"
                :color="selectedColor"
                :min="2"
                :max="10000"
                :step="1"
                :disabled="isDisabled"
                width="116px"
              />
            </div>
            <span class="range-dash">–</span>
            <div class="stepper-field">
              <label>Range Max (Do)</label>
              <NanoNumberStepper
                v-model="rangeMax"
                variant="stacked"
                :color="selectedColor"
                :min="3"
                :max="10000"
                :step="10"
                :disabled="isDisabled"
                width="116px"
              />
            </div>
          </div>
        </div>

        <!-- Variant 2: Split Left & Right Glued -->
        <div class="preview-card">
          <div class="preview-head">
            <span class="preview-label">Glued Left (−) &amp; Right (+)</span>
            <span class="value-badge mono">variant="split" color="{{ selectedColor }}"</span>
          </div>
          <p class="card-note">
            Decrement and Increment buttons are glued to both sides of the centered input (with optional custom labels):
          </p>
          <div class="stepper-row">
            <div class="stepper-field">
              <label>Single Seed n</label>
              <NanoNumberStepper
                v-model="seedVal"
                variant="split"
                :color="selectedColor"
                :min="1"
                :max="1000000"
                :step="1"
                :disabled="isDisabled"
                width="138px"
              />
            </div>
            <div class="stepper-field">
              <label>Custom Step (±100 Hz)</label>
              <NanoNumberStepper
                v-model="freqVal"
                variant="split"
                :color="selectedColor"
                :min="0"
                :max="20000"
                :step="100"
                decrement-label="-100"
                increment-label="+100"
                :disabled="isDisabled"
                width="176px"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CARD 2: Semantic Colors & 1-Variable CSS Theming -->
    <div class="demo-section">
      <h3>2. Semantic Button Colors &amp; Single-Variable Theming (<code>--nano-stepper-color</code>)</h3>
      <p class="demo-desc">
        <code>NanoNumberStepper</code> uses the exact same 6 color names as Nano UI buttons:
        <code>primary</code>, <code>success</code>, <code>danger</code>, <code>active</code>, <code>secondary</code> (default), and <code>ghost</code>.
        Under the hood, the entire component (outer border, button background tint, dividers, icon color, hover glow, and focus ring) is driven by a <strong>single CSS custom property <code>--nano-stepper-color</code></strong>.
      </p>

      <div class="preview-grid three-cols">
        <div v-for="c in colorVariants" :key="c" class="preview-card">
          <div class="preview-head">
            <span class="preview-label" style="text-transform: capitalize">{{ c }}</span>
            <span class="value-badge mono">color="{{ c }}"</span>
          </div>
          <div class="stepper-row">
            <NanoNumberStepper
              v-model="colorVals[c]"
              variant="stacked"
              :color="c"
              :disabled="isDisabled"
              width="104px"
            />
            <NanoNumberStepper
              v-model="colorVals[c]"
              variant="split"
              :color="c"
              :disabled="isDisabled"
              width="124px"
            />
          </div>
        </div>
      </div>

      <div class="custom-var-banner">
        <div class="custom-var-info">
          <span class="preview-label">Custom 1-Variable Override (<code>--nano-stepper-color</code>)</span>
          <p class="card-note">
            Pass any CSS color/token via <code>style="--nano-stepper-color: #f59e0b"</code> or <code>color="#a855f7"</code>:
          </p>
        </div>
        <div class="stepper-row">
          <div class="stepper-field">
            <label class="mono">--nano-stepper-color: #f59e0b</label>
            <NanoNumberStepper
              v-model="colorVals.customAmber"
              variant="split"
              style="--nano-stepper-color: #f59e0b"
              width="136px"
            />
          </div>
          <div class="stepper-field">
            <label class="mono">color="#a855f7"</label>
            <NanoNumberStepper
              v-model="colorVals.customPurple"
              variant="stacked"
              color="#a855f7"
              width="120px"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- CARD 3: Optional min, max & step -->
    <div class="demo-section">
      <h3>3. Optional <code>min</code>, <code>max</code> &amp; <code>step</code> Parameters</h3>
      <p class="demo-desc">
        <code>min</code> (default <code>-Infinity</code>), <code>max</code> (default <code>+Infinity</code>), and <code>step</code> (default <code>1</code>) are completely optional.
        When <code>min</code> or <code>max</code> is provided, the corresponding stepper button automatically disables at the boundary.
      </p>

      <div class="preview-grid three-cols">
        <div class="preview-card">
          <div class="preview-head">
            <span class="preview-label">Unbounded (Zero Config)</span>
            <span class="value-badge mono">{{ unboundedVal }}</span>
          </div>
          <p class="card-note">
            Omit <code>min</code>, <code>max</code>, and <code>step</code> to allow free stepping across negative and positive integers (<code>-∞ .. +∞</code>):
          </p>
          <NanoNumberStepper
            v-model="unboundedVal"
            variant="split"
            :disabled="isDisabled"
            width="148px"
          />
        </div>

        <div class="preview-card">
          <div class="preview-head">
            <span class="preview-label">Clamped Bounds [0 .. 10]</span>
            <span class="value-badge mono">{{ clampedVal }} / 10</span>
          </div>
          <p class="card-note">
            With <code>:min="0" :max="10"</code>, buttons automatically lock at <code>0</code> and <code>10</code> and manual input clamps on blur:
          </p>
          <NanoNumberStepper
            v-model="clampedVal"
            variant="split"
            :min="0"
            :max="10"
            :step="1"
            :disabled="isDisabled"
            width="148px"
          />
        </div>

        <div class="preview-card">
          <div class="preview-head">
            <span class="preview-label">Fractional Step &amp; Affixes</span>
            <span class="value-badge mono">${{ decimalVal.toFixed(2) }}</span>
          </div>
          <p class="card-note">
            Decimal <code>:step="0.25"</code> with IEEE-754 rounding protection and optional <code>prefix="$"</code> / <code>suffix="s"</code>:
          </p>
          <NanoNumberStepper
            v-model="decimalVal"
            variant="stacked"
            :min="0"
            :max="100"
            :step="0.25"
            prefix="$"
            :disabled="isDisabled"
            width="136px"
          />
        </div>
      </div>
    </div>

    <!-- CARD 4: Size Variants -->
    <div class="demo-section">
      <h3>4. Size Variants (<code>sm</code> / <code>md</code> / <code>lg</code>)</h3>
      <p class="demo-desc">
        Three height presets matching Nano UI buttons and inputs: <code>sm</code> (28px), <code>md</code> (34px), and <code>lg</code> (40px).
      </p>

      <div class="sizes-stack">
        <div class="size-row">
          <span class="size-tag mono">size="sm" (28px)</span>
          <div class="size-control-wrap">
            <NanoNumberStepper v-model="smVal" variant="stacked" size="sm" :min="0" :max="999" width="104px" />
            <NanoNumberStepper v-model="smVal" variant="split" size="sm" :min="0" :max="999" width="124px" />
          </div>
          <span class="value-badge mono">{{ smVal }}</span>
        </div>

        <div class="size-row">
          <span class="size-tag mono">size="md" (34px)</span>
          <div class="size-control-wrap">
            <NanoNumberStepper v-model="mdVal" variant="stacked" size="md" :min="0" :max="999" width="116px" />
            <NanoNumberStepper v-model="mdVal" variant="split" size="md" :min="0" :max="999" width="138px" />
          </div>
          <span class="value-badge mono">{{ mdVal }}</span>
        </div>

        <div class="size-row">
          <span class="size-tag mono">size="lg" (40px)</span>
          <div class="size-control-wrap">
            <NanoNumberStepper v-model="lgVal" variant="stacked" size="lg" :min="0" :max="999" width="132px" />
            <NanoNumberStepper v-model="lgVal" variant="split" size="lg" :min="0" :max="999" width="156px" />
          </div>
          <span class="value-badge mono">{{ lgVal }}</span>
        </div>
      </div>
    </div>

    <!-- CARD 4: Standard 4-Tab Code & API Reference -->
    <NanoCodeBlock :tabs="codeTabs" />
  </div>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.doc-header {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.doc-badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.doc-page h2 {
  color: var(--nano-text-main);
  margin: 0;
}

.doc-header p {
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
  margin-top: 0;
  margin-bottom: 1.25rem;
  line-height: 1.5;
}

.controls-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 1.25rem;
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

.ctrl-color-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.ctrl-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--nano-text-muted);
}

.color-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.custom-var-banner {
  margin-top: 1.25rem;
  padding: 1.15rem 1.35rem;
  border-radius: 12px;
  background: var(--nano-bg-card-elevated);
  border: 1px dashed var(--nano-border-card);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
}

.custom-var-info {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
  gap: 1.25rem;
}

.preview-grid.three-cols {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.preview-card {
  background: var(--nano-bg-card-elevated);
  border: 1px solid var(--nano-border-card);
  border-radius: 12px;
  padding: 1.25rem 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.preview-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.preview-label {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--nano-text-main);
}

.card-note {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.5;
  color: var(--nano-text-muted);
}

.value-badge {
  font-size: 0.78rem;
  font-weight: 800;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-card);
  color: var(--nano-state-active, #4cc2e6);
  white-space: nowrap;
}

.stepper-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.stepper-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stepper-field label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--nano-text-muted);
  text-transform: uppercase;
}

.range-dash {
  padding-bottom: 6px;
  color: var(--nano-text-muted);
  font-weight: 700;
}

.sizes-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.size-row {
  display: grid;
  grid-template-columns: 140px 1fr auto;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1.15rem;
  border-radius: 10px;
  background: var(--nano-bg-card-elevated);
  border: 1px solid var(--nano-border-card);
}

.size-control-wrap {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.size-tag {
  font-size: 0.8rem;
  color: var(--nano-text-muted);
}

.mono {
  font-family: ui-monospace, SFMono-Regular, monospace;
}

@media (max-width: 640px) {
  .size-row {
    grid-template-columns: 1fr;
  }
}
</style>
