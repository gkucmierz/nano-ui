<script setup>
import { computed } from 'vue';
import Ripple from '../directives/ripple.js';
import { playNanoUiSound } from '../utils/sound-controller.js';

const vRipple = Ripple;

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
  },
  size: {
    type: String,
    default: 'md',
  },
  outline: {
    type: Boolean,
    default: false,
  },
  solid: {
    type: Boolean,
    default: false,
  },
  icon: {
    type: Boolean,
    default: false,
  },
  ripple: {
    type: [Boolean, String, Object],
    default: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    default: 'button',
  },
  sound: {
    type: [Boolean, String, Object],
    default: undefined,
  },
});

const emit = defineEmits(['click']);

const resolvedClasses = computed(() => {
  const classes = ['nano-btn'];
  if (props.variant) {
    classes.push(`nano-btn-${props.variant}`);
  }
  if (props.size === 'sm') {
    classes.push('nano-btn-sm');
  } else if (props.size === 'lg') {
    classes.push('nano-btn-lg');
  }
  if (props.outline && props.variant !== 'ghost') {
    classes.push('nano-btn-outline');
  }
  if (props.solid) {
    classes.push('nano-btn-solid');
  }
  if (props.icon) {
    classes.push('nano-btn-icon');
  }
  return classes;
});

const soundPreset = computed(() =>
  props.variant === 'ghost' || props.variant === 'secondary'
    ? 'ui-tap-soft'
    : 'ui-click-glass'
);

const handleClick = (event) => {
  if (props.disabled) {
    event?.preventDefault?.();
    return;
  }
  playNanoUiSound(soundPreset.value, {
    propSound: props.sound,
    size: props.size,
    minIntervalMs: 24,
    throttleKey: `nano-btn-${props.variant}`,
  });
  emit('click', event);
};
</script>

<template>
  <button
    :type="type"
    :class="resolvedClasses"
    :disabled="disabled"
    data-nano-sound-owner="true"
    v-ripple="ripple"
    @click="handleClick"
  >
    <slot name="icon" />
    <slot />
  </button>
</template>
