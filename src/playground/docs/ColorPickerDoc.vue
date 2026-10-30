<script setup>
import { ref } from 'vue';
import NanoColorPickerOklch from '../../components/NanoColorPickerOklch.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { t } from '../../locales.js';

const selectedColor = ref('oklch(0.65 0.18 250)');
const activeFormat = ref('oklch');

const usageSnippet = `<script setup>
import { ref } from 'vue';
import { NanoColorPickerOklch, getContrastTextColor, getWcagContrastRatio } from '@gkucmierz/nano-ui';

const brandColor = ref('oklch(0.65 0.18 250)');
<\/script>

<template>
  <NanoColorPickerOklch
    v-model="brandColor"
    format="oklch"
    :threshold="0.62"
  />
</template>`;
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

    <NanoCodeBlock :code="usageSnippet" lang="vue" title="Usage & API Example" />
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
