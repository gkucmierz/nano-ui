<script setup>
import { ref, computed, watch } from 'vue';
import { resolveNanoColor } from '../utils/colors.js';

const props = defineProps({
  modelValue: {
    type: [Boolean, null],
    default: false
  },
  indeterminate: {
    type: Boolean,
    default: false
  },
  label: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'default', // 'default'/'md'/'lg' (44x24) | 'compact'/'sm' (38x20) | 'mini'/'xs' (30x16)
    validator: (v) => ['default', 'compact', 'mini', 'lg', 'md', 'sm', 'xs'].includes(v)
  },
  color: {
    type: String,
    default: 'primary' // 'primary' | 'cyan' | 'purple' | 'emerald' | 'danger' | 'gold'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    default: ''
  },
  id: {
    type: String,
    default: ''
  }
});

let switchUidSeq = 0;

const emit = defineEmits(['update:modelValue', 'update:indeterminate', 'change']);

const autoId = `nano-switch-${++switchUidSeq}`;
const resolvedId = computed(() => props.id || autoId);
const resolvedName = computed(() => props.name || resolvedId.value);

const inputRef = ref(null);

const isIndeterminate = computed(() => props.indeterminate || props.modelValue === null);
const isChecked = computed(() => !isIndeterminate.value && Boolean(props.modelValue));
const normalizedSize = computed(() => {
  if (props.size === 'sm' || props.size === 'compact') return 'compact';
  if (props.size === 'xs' || props.size === 'mini') return 'mini';
  return 'default';
});
const resolvedSwitchColor = computed(() => {
  const c = (props.color || 'primary').trim();
  if (c === 'primary' || c === 'cyan') return undefined;
  return resolveNanoColor(c, 'cyan');
});

watch(isIndeterminate, (val) => {
  if (inputRef.value) {
    inputRef.value.indeterminate = val;
  }
}, { immediate: true });

const toggle = (event) => {
  if (props.disabled) return;
  if (isIndeterminate.value) {
    emit('update:indeterminate', false);
    emit('update:modelValue', true);
    emit('change', true, event);
  } else {
    const nextVal = !isChecked.value;
    emit('update:modelValue', nextVal);
    emit('change', nextVal, event);
  }
};
</script>

<template>
  <label
    class="nano-switch"
    :class="[
      `size-${normalizedSize}`,
      `color-${color}`,
      {
        'is-checked': isChecked,
        'is-indeterminate': isIndeterminate,
        'is-disabled': disabled
      }
    ]"
    :style="resolvedSwitchColor ? { '--nano-switch-accent': resolvedSwitchColor } : undefined"
    :for="resolvedId"
  >
    <input
      :id="resolvedId"
      ref="inputRef"
      :name="resolvedName"
      type="checkbox"
      switch
      class="nano-switch-input"
      :checked="isChecked"
      :disabled="disabled"
      :aria-label="label || 'Toggle switch'"
      @change="toggle"
      role="switch"
      :aria-checked="isIndeterminate ? 'mixed' : isChecked"
    />
    <div class="nano-switch-slider"></div>
    <span v-if="label || $slots.default" class="nano-switch-label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<style scoped>
.nano-switch,
.nano-switch *,
.nano-switch *::before,
.nano-switch *::after {
  box-sizing: border-box;
}

.nano-switch {
  --nano-switch-transition: var(--nano-transition-toggle);
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  position: relative;
  vertical-align: middle;
  font-size: 0.9rem;
  color: var(--nano-switch-text, var(--text-color, inherit));
}

.nano-switch.is-disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.nano-switch-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
  margin: 0;
  outline: 0;
  accent-color: var(--nano-switch-color, #00f2fe);
}

/* Base Slider Track */
.nano-switch-slider {
  position: relative;
  width: 44px;
  height: 24px;
  background: var(--nano-switch-bg, rgba(15, 23, 42, 0.6));
  border: 1px solid var(--nano-switch-border, rgba(255, 255, 255, 0.15));
  border-radius: 12px;
  cursor: pointer;
  flex-shrink: 0;
  transition: 
    background-color var(--nano-switch-transition), 
    border-color var(--nano-switch-transition), 
    box-shadow var(--nano-switch-transition);
  outline: 0;
}

/* Base Knob / Pill */
.nano-switch-slider::before {
  content: "";
  position: absolute;
  width: 16px;
  height: 16px;
  left: 3px;
  top: 3px;
  background: var(--nano-switch-knob, #94a3b8);
  border-radius: 50%;
  transition: 
    transform var(--nano-switch-transition), 
    width var(--nano-switch-transition), 
    height var(--nano-switch-transition), 
    top var(--nano-switch-transition),
    border-radius var(--nano-switch-transition), 
    background-color var(--nano-switch-transition), 
    box-shadow var(--nano-switch-transition),
    filter var(--nano-switch-transition);
}

/* --- Size: Default (44x24, Inner: 42x22, Gap: 3px) --- */
.size-default .nano-switch-slider {
  width: 44px;
  height: 24px;
  border-radius: 12px;
}
.size-default .nano-switch-slider::before {
  width: 16px;
  height: 16px;
  left: 3px;
  top: 3px;
}
.size-default.is-checked .nano-switch-slider::before {
  transform: translateX(20px);
}

.size-default.is-indeterminate .nano-switch-slider::before {
  width: 24px;
  height: 12px;
  top: 5px;
  border-radius: 6px;
  transform: translateX(6px);
}

/* --- Size: Compact (38x20, Inner: 36x18, Gap: 2px) --- */
.size-compact .nano-switch-slider {
  width: 38px;
  height: 20px;
  border-radius: 10px;
}
.size-compact .nano-switch-slider::before {
  width: 14px;
  height: 14px;
  left: 2px;
  top: 2px;
}
.size-compact.is-checked .nano-switch-slider::before {
  transform: translateX(18px);
}
.size-compact.is-indeterminate .nano-switch-slider::before {
  width: 20px;
  height: 10px;
  top: 4px;
  border-radius: 5px;
  transform: translateX(6px);
}

/* --- Size: Mini (30x16, Inner: 28x14, Gap: 2px) --- */
.size-mini .nano-switch-slider {
  width: 30px;
  height: 16px;
  border-radius: 8px;
}
.size-mini .nano-switch-slider::before {
  width: 10px;
  height: 10px;
  left: 2px;
  top: 2px;
}
.size-mini.is-checked .nano-switch-slider::before {
  transform: translateX(14px);
}
.size-mini.is-indeterminate .nano-switch-slider::before {
  width: 16px;
  height: 8px;
  top: 3px;
  border-radius: 4px;
  transform: translateX(4px);
}

/* --- Color Variants (SSoT via --nano-switch-accent / resolveNanoColor) --- */
.nano-switch {
  --nano-switch-color: var(--nano-switch-accent, var(--nano-switch-active-knob, #00f2fe));
  --nano-switch-color-bg: color-mix(in srgb, var(--nano-switch-color) 20%, transparent);
  --nano-switch-color-border: color-mix(in srgb, var(--nano-switch-color) 60%, transparent);
  --nano-switch-color-shadow: color-mix(in srgb, var(--nano-switch-color) 30%, transparent);
}

.color-primary,
.color-cyan {
  --nano-switch-color: var(--nano-switch-active-knob, #00f2fe);
  --nano-switch-color-bg: var(--nano-switch-active-bg, rgba(0, 242, 254, 0.2));
  --nano-switch-color-border: var(--nano-switch-active-border, rgba(0, 242, 254, 0.6));
  --nano-switch-color-shadow: var(--nano-switch-active-shadow, rgba(0, 242, 254, 0.3));
}

/* --- Checked Active Styles --- */
.nano-switch.is-checked .nano-switch-slider {
  background: var(--nano-switch-color-bg);
  border-color: var(--nano-switch-color-border);
  box-shadow: 0 0 10px var(--nano-switch-color-shadow);
}

.nano-switch.is-checked .nano-switch-slider::before {
  background: var(--nano-switch-color);
  box-shadow: 0 0 8px var(--nano-switch-color-shadow);
}

/* --- Indeterminate State Styles --- */
.nano-switch.is-indeterminate .nano-switch-slider {
  background: color-mix(in srgb, var(--nano-switch-color, #94a3b8) 8%, transparent);
  border-color: color-mix(in srgb, var(--nano-switch-color, #94a3b8) 45%, transparent);
}

.nano-switch.is-indeterminate .nano-switch-slider::before {
  background: var(--nano-switch-color, #94a3b8);
  box-shadow: 0 0 6px color-mix(in srgb, var(--nano-switch-color, #94a3b8) 35%, transparent);
}

/* --- Stationary Hover States --- */
.nano-switch:not(.is-disabled):not(.is-checked):not(.is-indeterminate):hover .nano-switch-slider {
  border-color: var(--nano-border-hover);
  background: var(--nano-bg-hover);
}

.nano-switch.is-checked:not(.is-disabled):hover .nano-switch-slider {
  box-shadow: 0 0 12px var(--nano-switch-color-shadow, var(--nano-switch-active-shadow, rgba(0, 242, 254, 0.35)));
}

.nano-switch.is-indeterminate:not(.is-disabled):hover .nano-switch-slider::before {
  opacity: 0.9;
}

/* Text Label */
.nano-switch-label {
  display: inline-flex;
  align-items: center;
  line-height: 1.3;
}
</style>
