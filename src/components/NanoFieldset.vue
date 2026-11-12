<script setup>
defineProps({
  legend: {
    type: String,
    default: '',
  },
  variant: {
    type: String,
    default: 'inset',
    validator: (v) => ['inset', 'outlined'].includes(v),
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <fieldset
    class="nano-fieldset"
    :class="{
      'nano-fieldset-inset': variant === 'inset',
      'nano-fieldset-outlined': variant === 'outlined',
    }"
    :disabled="disabled"
  >
    <legend v-if="legend || $slots.legend" class="nano-legend">
      <slot name="legend">{{ legend }}</slot>
    </legend>
    <div class="nano-fieldset-body">
      <slot />
    </div>
  </fieldset>
</template>
