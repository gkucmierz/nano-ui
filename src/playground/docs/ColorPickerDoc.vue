<script setup>
import { ref } from 'vue';
import NanoColorPickerOklch from '../../components/NanoColorPickerOklch.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { createDocTabs } from '../docSnippets.js';
import { t } from '../../locales.js';

const selectedColor = ref('oklch(0.65 0.18 250)');
const activeFormat = ref('oklch');

// Independent demo states for Section 2 (Popover Swatch Mode)
const swatchSmColor = ref('#6366f1');
const swatchPillColor = ref('oklch(0.72 0.16 198)');
const swatchDisabledColor = ref('#64748b');

const codeTabs = createDocTabs({
  componentName: 'NanoColorPickerOklch',
  stateRef: 'brandColor',
  initialValue: "'oklch(0.65 0.18 250)'",
  templateAttrs: [
    'v-model="brandColor"',
    'format="oklch"',
    ':threshold="0.62"',
    'popover',
    'show-value',
  ],
  headlessImports: [
    { symbols: ['parseColor', 'formatHex', 'formatOklch', 'getWcagContrastRatio'], path: 'dist/utils/colors.js' },
  ],
  apiSections: [
    {
      title: 'Props',
      items: [
        'modelValue: String (default: "oklch(0.65 0.18 250)") - Reactive color string (v-model)',
        'format: "oklch" | "hex" | "rgb" (default: "oklch") - Output format (supports v-model:format)',
        'popover: Boolean (default: false) - Compact swatch trigger opening a Teleported OKLCH popover (replaces native input[type=color])',
        'mode: "inline" | "popover" (default: "inline") - Explicit display mode alias for popover',
        'size: "sm" | "md" | "lg" (default: "md") - Swatch trigger height (32px / 36px / 40px) in popover mode',
        'showValue: Boolean (default: false) - Renders formatted color string + chevron inside popover trigger pill',
        'showPresets: Boolean (default: true) - Show curated 10-swatch perceptual OKLCH palette',
        'showContrast: Boolean (default: true) - Show live WCAG 2.1 AA/AAA contrast badges against dark & light surfaces',
        'threshold: Number (default: 0.62) - OKLCH perceived lightness threshold for auto text polarity',
        'disabled: Boolean (default: false) - Disables interaction and popover trigger',
      ],
    },
    {
      title: 'Events',
      items: [
        '@update:modelValue: (color: string) => void - Emitted on L/C/H disc, slider, preset, or text input change',
        '@update:format: (fmt: "oklch"|"hex"|"rgb") => void - Emitted when output format changes',
        '@change: (payload: { value, hex, oklch, rgb, lightness, chroma, hue, wcagLight, wcagDark }) => void',
      ],
    },
    {
      title: 'Exposed Methods & Aliases',
      items: [
        'Component Alias: <NanoColorPicker> is registered identically alongside <NanoColorPickerOklch>',
        'openPopover() / closePopover() / togglePopover(): Programmatic popover control',
        'copyValue(): Promise<void> - Copy formatted color string to clipboard',
        'setOklch(l, c, h): void - Programmatically set perceptual Lightness, Chroma, and Hue',
      ],
    },
  ],
});
</script>

<template>
  <div class="doc-page">
    <h2>{{ t('colorPicker.title') }}</h2>
    <p>{{ t('colorPicker.desc') }}</p>

    <div class="demo-section">
      <h3>{{ t('colorPicker.sec1Title') }}</h3>
      <p class="demo-desc">{{ t('colorPicker.sec1Desc') }}</p>

      <div class="picker-stage">
        <NanoColorPickerOklch
          v-model="selectedColor"
          v-model:format="activeFormat"
        />
      </div>
    </div>

    <div class="demo-section">
      <h3>{{ t('colorPicker.sec2Title') }}</h3>
      <p class="demo-desc">{{ t('colorPicker.sec2Desc') }}</p>

      <div class="popover-demo-grid">
        <div class="popover-demo-card">
          <span class="popover-demo-label">{{ t('colorPicker.swatchSmLabel') }}</span>
          <div class="popover-demo-row">
            <input
              id="cp-demo-other-label"
              name="cp-demo-other-label"
              type="text"
              value="Other"
              readonly
              aria-label="Slice label preview"
              class="demo-readonly-input"
            />
            <NanoColorPickerOklch
              id="cp-demo-sm"
              v-model="swatchSmColor"
              format="hex"
              popover
              size="sm"
              aria-label="Compact HEX color picker"
            />
          </div>
          <code class="popover-demo-code">{{ swatchSmColor }}</code>
        </div>

        <div class="popover-demo-card">
          <span class="popover-demo-label">{{ t('colorPicker.swatchPillLabel') }}</span>
          <div class="popover-demo-row">
            <NanoColorPickerOklch
              id="cp-demo-pill"
              v-model="swatchPillColor"
              format="oklch"
              popover
              show-value
              size="md"
              aria-label="Labeled OKLCH color picker"
            />
          </div>
          <code class="popover-demo-code">{{ swatchPillColor }}</code>
        </div>

        <div class="popover-demo-card">
          <span class="popover-demo-label">{{ t('colorPicker.swatchDisabledLabel') }}</span>
          <div class="popover-demo-row">
            <NanoColorPickerOklch
              id="cp-demo-disabled"
              v-model="swatchDisabledColor"
              format="hex"
              popover
              show-value
              size="md"
              disabled
              aria-label="Disabled color picker"
            />
          </div>
          <code class="popover-demo-code">disabled</code>
        </div>
      </div>
    </div>

    <NanoCodeBlock :tabs="codeTabs" />
  </div>
</template>

<style scoped>
.picker-stage {
  display: flex;
  justify-content: center;
  padding: 24px;
  border-radius: 10px;
  background: var(--nano-bg-app);
  border: 1px dashed var(--nano-border-card);
}

.popover-demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.popover-demo-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 10px;
  background: var(--nano-bg-app);
  border: 1px solid var(--nano-border-card);
}

.popover-demo-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--nano-text-secondary);
}

.popover-demo-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 36px;
}

.demo-readonly-input {
  height: 32px;
  width: 100%;
  max-width: 140px;
  padding: 0 0.65rem;
  border-radius: 7px;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-card);
  color: var(--nano-text-main);
  font-size: 0.84rem;
  outline: none;
}

.popover-demo-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.76rem;
  color: var(--nano-text-muted);
}
</style>
