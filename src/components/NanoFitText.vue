<script setup>
import { computed } from 'vue';
import { fitTextDirective as vFitText } from '../utils/fitText.js';

const props = defineProps({
  tag: {
    type: String,
    default: 'span',
  },
  text: {
    type: String,
    default: '',
  },
  minSize: {
    type: Number,
    default: 10,
  },
  maxSize: {
    type: Number,
    default: 32,
  },
  step: {
    type: Number,
    default: 0.25,
  },
  maxWidth: {
    type: Number,
    default: undefined,
  },
  maxHeight: {
    type: Number,
    default: undefined,
  },
  mode: {
    type: String,
    default: 'single-line',
  },
  allowScaleBelowMin: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['fit']);

const fitOptions = computed(() => ({
  minSize: props.minSize,
  maxSize: props.maxSize,
  step: props.step,
  maxWidth: props.maxWidth,
  maxHeight: props.maxHeight,
  mode: props.mode,
  allowScaleBelowMin: props.allowScaleBelowMin,
  onFit: (px) => emit('fit', px),
}));
</script>

<template>
  <component :is="tag" v-fit-text="fitOptions" class="nano-fit-text">
    <slot>{{ text }}</slot>
  </component>
</template>

<style scoped>
.nano-fit-text {
  display: block;
  max-width: 100%;
  min-width: 0;
}
</style>
