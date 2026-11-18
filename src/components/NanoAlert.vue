<script setup>
import { computed, watch, onMounted } from 'vue';
import NanoIcon from './NanoIcon.vue';
import { playNanoUiSound } from '../utils/sound-controller.js';
import { is } from '../utils/type.js';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: true,
  },
  variant: {
    type: String,
    default: 'info',
  },
  title: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  icon: {
    type: [Boolean, String],
    default: true,
  },
  dismissible: {
    type: Boolean,
    default: false,
  },
  accentLeft: {
    type: Boolean,
    default: false,
  },
  banner: {
    type: Boolean,
    default: false,
  },
  playOnMount: {
    type: Boolean,
    default: true,
  },
  sound: {
    type: [Boolean, String, Object],
    default: undefined,
  },
});

const emit = defineEmits(['update:modelValue', 'close', 'dismiss']);

const normalizedVariant = computed(() => {
  const v = String(props.variant || 'info').trim().toLowerCase();
  return v || 'info';
});

const resolvedIconName = computed(() => {
  if (props.icon === false) return '';
  if (is(props.icon, 'string') && props.icon.trim()) return props.icon.trim();
  const v = normalizedVariant.value;
  if (v === 'ok' || v === 'success') return 'success';
  if (v === 'warn' || v === 'warning') return 'warn';
  if (v === 'danger' || v === 'error') return 'danger';
  return 'info';
});

const resolvedSoundPreset = computed(() => {
  const v = normalizedVariant.value;
  if (v === 'ok' || v === 'success') return 'alert-success';
  if (v === 'warn' || v === 'warning') return 'alert-warn';
  if (v === 'danger' || v === 'error') return 'alert-danger';
  return 'alert-info';
});

const triggerSound = () =>
  playNanoUiSound(resolvedSoundPreset.value, {
    propSound: props.sound,
    minIntervalMs: 80,
    throttleKey: `nano-alert-${resolvedSoundPreset.value}`,
  });

const dismiss = () => {
  emit('update:modelValue', false);
  emit('dismiss');
  emit('close');
};

onMounted(() => {
  if (props.modelValue && props.playOnMount) {
    triggerSound();
  }
});

watch(
  () => props.modelValue,
  (next, prev) => {
    if (next && !prev) {
      triggerSound();
    }
  }
);

defineExpose({
  dismiss,
  triggerSound,
});
</script>

<template>
  <div
    v-if="modelValue"
    role="alert"
    :class="[
      'nano-alert',
      `nano-alert-${normalizedVariant}`,
      accentLeft ? 'nano-alert-accent-left' : '',
      banner ? 'nano-alert-banner' : '',
    ]"
  >
    <div v-if="resolvedIconName || $slots.icon" class="nano-alert-icon">
      <slot name="icon">
        <NanoIcon :name="resolvedIconName" :size="18" />
      </slot>
    </div>

    <div class="nano-alert-content">
      <strong v-if="title || $slots.title" class="nano-alert-title">
        <slot name="title">{{ title }}</slot>
      </strong>
      <div v-if="description || $slots.default" class="nano-alert-desc">
        <slot>{{ description }}</slot>
      </div>
    </div>

    <button
      v-if="dismissible"
      type="button"
      class="nano-alert-close"
      aria-label="Dismiss alert"
      v-tooltip="'Dismiss'"
      @click="dismiss"
    >
      <NanoIcon name="close" :size="16" />
    </button>
  </div>
</template>
