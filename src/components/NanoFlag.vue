<script setup>
import { computed, useId } from 'vue';
import { resolveLangMeta } from '../utils/langFlags.js';

const props = defineProps({
  /**
   * ISO 639-1 language code ('pl', 'en', 'es', 'pt', 'de', 'fr', 'uk', 'ja', ...)
   * or country alias ('gb', 'ua', 'jp', 'cz', ...).
   */
  lang: {
    type: [String, Object],
    default: 'en',
  },
  /**
   * Flag width in CSS pixels (`height` scales automatically at 4:3 aspect ratio `24x18`).
   */
  size: {
    type: Number,
    default: 18,
  },
  /**
   * Corner radius in `24x18` viewBox units.
   */
  radius: {
    type: Number,
    default: 3.2,
  },
  /**
   * Optional accessible label when used standalone; defaults to decorative `aria-hidden="true"`
   * inside labeled buttons/options so screen readers do not double-announce the language.
   */
  ariaLabel: {
    type: String,
    default: '',
  },
});

const clipId = `nano-flag-${useId()}`;
const meta = computed(() => resolveLangMeta(props.lang));
const widthPx = computed(() => Math.max(10, Math.round(Number(props.size) || 18)));
const heightPx = computed(() => Math.max(8, Math.round((widthPx.value * 3) / 4)));
</script>

<template>
  <svg
    class="nano-flag-svg"
    viewBox="0 0 24 18"
    :width="widthPx"
    :height="heightPx"
    :role="ariaLabel ? 'img' : undefined"
    :aria-label="ariaLabel || undefined"
    :aria-hidden="ariaLabel ? undefined : 'true'"
    focusable="false"
  >
    <defs>
      <clipPath :id="clipId">
        <rect x="0" y="0" width="24" height="18" :rx="radius" />
      </clipPath>
    </defs>
    <g :clip-path="`url(#${clipId})`">
      <component
        :is="shape.tag"
        v-for="(shape, idx) in meta.shapes"
        :key="idx"
        v-bind="shape.attrs"
      />
    </g>
    <rect
      x="0.5"
      y="0.5"
      width="23"
      height="17"
      :rx="Math.max(0, radius - 0.4)"
      fill="none"
      class="nano-flag-frame"
      stroke-width="1"
    />
  </svg>
</template>

<style scoped>
.nano-flag-svg {
  display: block;
  flex-shrink: 0;
  user-select: none;
  -webkit-user-select: none;
}

.nano-flag-frame {
  stroke: rgba(148, 163, 184, 0.42);
}
</style>
