<script setup>
import { ref, computed } from 'vue';
import NanoKnob from '../../components/NanoKnob.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { useNanoUiSound } from '../../utils/sound-controller.js';
import { createDocTabs } from '../docSnippets.js';
import { t } from '../../locales.js';

const angle = ref(45);
const knobSize = ref(72);
const knobColor = ref('cyan');
const centerMode = ref('reset');
const showTicks = ref(true);
const wrap = ref(true);
const localSoundMode = ref('inherit'); // 'inherit' (undefined) | 'true' | 'false'
const disabled = ref(false);
const globalSound = useNanoUiSound();

const soundModes = [
  { id: 'inherit', label: 'inherit' },
  { id: 'true', label: ':sound="true"' },
  { id: 'false', label: ':sound="false"' },
];
const resolvedLocalSound = computed(() =>
  localSoundMode.value === 'true'
    ? true
    : localSoundMode.value === 'false'
      ? false
      : undefined
);

const sizes = [44, 56, 72, 96];
const colors = ['primary', 'cyan', 'purple', 'emerald', 'amber', 'rose'];
const centerModes = ['reset', 'value', 'none'];

// Studio console knobs
const camAzimuth = ref(-35);
const camElevation = ref(24);
const camRoll = ref(0);
const synthCutoff = ref(120);

const usageSnippet = `<script setup>
import { ref } from 'vue';
import { NanoKnob } from '@gkucmierz/nano-ui';

const rotationAngle = ref(45);
<\/script>

<template>
  <NanoKnob
    v-model="rotationAngle"
    :default-value="0"
    :min="-360"
    :max="360"
    :size="64"
    color="cyan"
    center-mode="reset"
    :show-ticks="true"
    :sound="true"
    reset-tooltip="Reset to 0°"
  />
</template>`;
const codeTabs = createDocTabs({
  componentName: 'NanoKnob',
  usageCode: usageSnippet,
  apiSections: [
    {
      title: 'Props',
      items: [
        'modelValue: Number (default: 0, v-model) - Current rotary angle or parameter value',
        'defaultValue: Number (default: 0) - Target value restored on reset or double-click',
        'min / max: Number (default: -360 / 360) - Minimum and maximum bounds',
        'step: Number (default: 1) - Quantization step',
        'wrap: Boolean (default: true) - Continuous 360° wrapping vs clamped range',
        'size: Number (default: 46) - Diameter in px',
        'color: String (default: "primary") - Accent preset ("primary" | "cyan" | "purple" | "emerald" | "amber" | "rose" or CSS color)',
        'centerMode: String (default: "reset") - Center hub mode ("reset" | "value" | "none")',
        'unit: String (default: "°") - Unit suffix for value readout',
        'showTicks: Boolean (default: false) - Render 12-hour cardinal rim ticks',
        'sound: Boolean | String | Object (default: undefined) - Optional .nsd stepper-motor micro-ticks & cardinal detents (inherits global configureNanoUiSound when undefined)',
        'disabled: Boolean (default: false) - Disable interaction',
      ],
    },
    {
      title: 'Events',
      items: [
        '@update:modelValue / @change: (val: number) => void - Emitted when knob value changes',
        '@reset: (defaultVal: number) => void - Emitted when reset hub or double-click is triggered',
        '@dragStart / @dragEnd: (event) => void - Emitted when rotary drag starts or ends',
      ],
    },
    {
      title: 'Exposed Methods & State (via template ref)',
      items: [
        'reset(): void - Reset knob to defaultValue',
        'setValue(val: number): void - Clamp/quantize and set knob value',
        'stepBy(steps = 1): void - Step knob value by N increments',
        'displayValueText: ComputedRef<string> - Formatted readout string with unit',
      ],
    },
  ],
});
</script>

<template>
  <div class="doc-page">
    <h2>{{ t('knob.title') }}</h2>
    <p>{{ t('knob.desc') }}</p>

    <!-- SECTION 1: Interactive Configurator -->
    <div class="demo-section">
      <h3>{{ t('knob.sec1Title') }}</h3>
      <p class="demo-desc">{{ t('knob.sec1Desc') }}</p>

      <div class="knob-sandbox-grid">
        <div class="knob-stage">
          <NanoKnob
            v-model="angle"
            :default-value="0"
            :size="knobSize"
            :color="knobColor"
            :center-mode="centerMode"
            :show-ticks="showTicks"
            :wrap="wrap"
            :sound="resolvedLocalSound"
            :disabled="disabled"
            reset-tooltip="Reset (0°)"
          />

          <div class="knob-telemetry">
            <span class="telemetry-val">{{ Math.round(angle) }}°</span>
            <div class="step-row">
              <button type="button" class="nano-btn nano-btn-secondary nano-btn-sm" @click="angle -= 90">-90°</button>
              <button type="button" class="nano-btn nano-btn-secondary nano-btn-sm" @click="angle -= 45">-45°</button>
              <button type="button" class="nano-btn nano-btn-primary nano-btn-sm" @click="angle = 0">0°</button>
              <button type="button" class="nano-btn nano-btn-secondary nano-btn-sm" @click="angle += 45">+45°</button>
              <button type="button" class="nano-btn nano-btn-secondary nano-btn-sm" @click="angle += 90">+90°</button>
            </div>
          </div>
        </div>

        <div class="knob-controls">
          <div class="ctrl-group">
            <span class="ctrl-label">{{ t('knob.size') }} ({{ knobSize }}px)</span>
            <div class="nano-btn-group">
              <button
                v-for="s in sizes"
                :key="s"
                type="button"
                class="nano-btn nano-btn-secondary nano-btn-sm"
                :class="{ 'nano-btn-active': knobSize === s }"
                @click="knobSize = s"
              >
                {{ s }}px
              </button>
            </div>
          </div>

          <div class="ctrl-group">
            <span class="ctrl-label">{{ t('knob.color') }}</span>
            <div class="nano-cluster">
              <button
                v-for="c in colors"
                :key="c"
                type="button"
                class="nano-btn nano-btn-secondary nano-btn-sm"
                :class="{ 'nano-btn-active': knobColor === c }"
                @click="knobColor = c"
              >
                {{ c }}
              </button>
            </div>
          </div>

          <div class="ctrl-group">
            <span class="ctrl-label">{{ t('knob.centerMode') }}</span>
            <div class="nano-btn-group">
              <button
                v-for="m in centerModes"
                :key="m"
                type="button"
                class="nano-btn nano-btn-secondary nano-btn-sm"
                :class="{ 'nano-btn-active': centerMode === m }"
                @click="centerMode = m"
              >
                {{ m }}
              </button>
            </div>
          </div>

          <div class="ctrl-group">
            <span class="ctrl-label">LOCAL :SOUND PROP (OVERRIDES GLOBAL)</span>
            <div class="nano-btn-group">
              <button
                v-for="sm in soundModes"
                :key="sm.id"
                type="button"
                class="nano-btn nano-btn-secondary nano-btn-sm"
                :class="{ 'nano-btn-active': localSoundMode === sm.id }"
                @click="localSoundMode = sm.id"
              >
                {{ sm.label }}
              </button>
            </div>
          </div>

          <div class="toggle-grid">
            <label class="toggle-item">
              <NanoSwitch v-model="showTicks" size="compact" />
              <span>{{ t('knob.showTicks') }}</span>
            </label>
            <label class="toggle-item">
              <NanoSwitch v-model="wrap" size="compact" />
              <span>{{ t('knob.wrap') }}</span>
            </label>
            <label class="toggle-item">
              <NanoSwitch
                :model-value="globalSound.enabled.value"
                size="compact"
                @update:model-value="globalSound.setEnabled"
              />
              <span>Global NanoUI <code>.nsd</code> audio</span>
            </label>
            <label class="toggle-item">
              <NanoSwitch v-model="disabled" size="compact" />
              <span>{{ t('knob.disabled') }}</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- SECTION 2: Studio Console Multi-Knob Rack -->
    <div class="demo-section">
      <h3>{{ t('knob.sec2Title') }}</h3>
      <p class="demo-desc">{{ t('knob.sec2Desc') }}</p>

      <div class="studio-rack">
        <div class="rack-channel">
          <span class="rack-title">AZIMUTH (θ)</span>
          <NanoKnob v-model="camAzimuth" :size="68" color="cyan" center-mode="value" :show-ticks="true" :sound="resolvedLocalSound" />
        </div>
        <div class="rack-channel">
          <span class="rack-title">ELEVATION (φ)</span>
          <NanoKnob v-model="camElevation" :min="-90" :max="90" :wrap="false" :size="68" color="purple" center-mode="value" :show-ticks="true" :sound="resolvedLocalSound" />
        </div>
        <div class="rack-channel">
          <span class="rack-title">HORIZON ROLL</span>
          <NanoKnob v-model="camRoll" :size="68" color="emerald" center-mode="reset" :show-ticks="true" :sound="resolvedLocalSound" />
        </div>
        <div class="rack-channel">
          <span class="rack-title">FILTER CUTOFF</span>
          <NanoKnob v-model="synthCutoff" :min="0" :max="300" :wrap="false" :size="68" color="amber" center-mode="value" unit="Hz" :show-ticks="true" :sound="resolvedLocalSound" />
        </div>
      </div>
    </div>

    <NanoCodeBlock :tabs="codeTabs" />
  </div>
</template>

<style scoped>
.knob-sandbox-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 20px;
  align-items: center;
}

@media (max-width: 860px) {
  .knob-sandbox-grid {
    grid-template-columns: 1fr;
  }
}

.knob-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  min-height: 240px;
  padding: 28px;
  border-radius: 10px;
  background: var(--nano-bg-app);
  border: 1px dashed var(--nano-border-card);
}

.knob-telemetry {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.telemetry-val {
  font-family: var(--nano-font-mono, monospace);
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--nano-text-main);
}

.step-row {
  display: flex;
  gap: 6px;
}

.knob-controls {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 8px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-card);
}

.ctrl-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ctrl-label {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--nano-text-muted);
}

.toggle-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 6px;
}

.toggle-item {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 0.84rem;
  cursor: pointer;
  user-select: none;
}

.studio-rack {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
}

.rack-channel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 20px;
  border-radius: 10px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-card);
}

.rack-title {
  font-family: var(--nano-font-mono, monospace);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--nano-text-muted);
}
</style>
