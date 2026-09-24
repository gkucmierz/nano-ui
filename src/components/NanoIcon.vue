<script setup>
import { computed } from 'vue';
import { BUILTIN_ICONS, customIconsRegistry } from '../icons/index.js';

const props = defineProps({
  name: {
    type: String,
    default: null
  },
  icon: {
    type: [Object, Function],
    default: null
  },
  size: {
    type: [Number, String],
    default: 18
  },
  strokeWidth: {
    type: [Number, String],
    default: 2
  },
  viewBox: {
    type: String,
    default: '0 0 24 24'
  }
});

const resolvedComponent = computed(() => {
  if (props.icon) {
    return props.icon;
  }
  if (!props.name) {
    return null;
  }
  return customIconsRegistry[props.name] || BUILTIN_ICONS[props.name] || null;
});
</script>

<template>
  <component
    v-if="resolvedComponent"
    :is="resolvedComponent"
    :size="size"
    :stroke-width="strokeWidth"
    class="nano-icon"
    aria-hidden="true"
  />
  <svg
    v-else-if="$slots.default"
    :viewBox="viewBox"
    :width="size"
    :height="size"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="nano-icon"
    aria-hidden="true"
  >
    <slot />
  </svg>
  <span v-else class="nano-icon-missing" aria-hidden="true">?</span>
</template>

<style scoped>
.nano-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
  user-select: none;
}

.nano-icon-missing {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
  font-size: 0.75em;
  font-weight: 700;
  border: 1px dashed var(--nano-border, currentColor);
  border-radius: 3px;
  color: var(--nano-text-muted, currentColor);
  user-select: none;
}
</style>
