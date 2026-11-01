<script setup>
import { ref } from 'vue';
import NanoColorPickerOklch from '../../components/NanoColorPickerOklch.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { createDocTabs } from '../docSnippets.js';
import { t } from '../../locales.js';

const selectedColor = ref('oklch(0.65 0.18 250)');
const activeFormat = ref('oklch');

const codeTabs = createDocTabs({
  componentName: 'NanoColorPickerOklch',
  stateRef: 'brandColor',
  initialValue: "'oklch(0.65 0.18 250)'",
  templateAttrs: [
    'v-model="brandColor"',
    'format="oklch"',
    ':threshold="0.62"',
  ],
  headlessImports: [
    { symbols: ['parseColorToOklch', 'oklchToHex', 'getWcagContrastRatio'], path: 'dist/utils/color-contrast.js' },
  ],
  apiSections: [
    {
      title: 'Props',
      items: [
        'modelValue: String (default: "oklch(0.65 0.18 250)") - Reactive color string (v-model)',
        'format: String (default: "oklch") - Output format ("oklch" | "hex" | "rgb") (supports v-model:format)',
        'showPresets: Boolean (default: true) - Show curated perceptual swatch palette',
        'showContrast: Boolean (default: true) - Show live WCAG 2.1 contrast badges against dark & light surfaces',
        'threshold: Number (default: 0.62) - OKLCH perceived lightness threshold for auto text polarity',
      ],
    },
    {
      title: 'Events',
      items: [
        '@update:modelValue: (color: string) => void - Emitted on L/C/H slider or preset change',
        '@update:format: (fmt: "oklch"|"hex"|"rgb") => void - Emitted when output format changes',
        '@change: (payload: { value, hex, oklch: { l, c, h } }) => void - Emitted with full perceptual color state',
      ],
    },
    {
      title: 'Exposed Methods & State (via template ref)',
      items: [
        'copyValue(): Promise<string> - Copy formatted color string to clipboard',
        'setOklch(l, c, h): void - Programmatically set perceptual Lightness, Chroma, and Hue',
        'lightness / chroma / hue / hexString / formattedValue / wcagDarkRatio / wcagLightRatio: Ref/ComputedRef',
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
</style>
