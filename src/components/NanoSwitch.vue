<script setup>
import { ref, computed, watch } from 'vue';

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
    default: 'default', // 'default' (44x24) | 'compact' (38x20) | 'mini' (30x16)
    validator: (v) => ['default', 'compact', 'mini'].includes(v)
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

const emit = defineEmits(['update:modelValue', 'update:indeterminate', 'change']);

const inputRef = ref(null);

const isIndeterminate = computed(() => props.indeterminate || props.modelValue === null);
const isChecked = computed(() => !isIndeterminate.value && Boolean(props.modelValue));

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
      `size-${size}`,
      `color-${color}`,
      {
        'is-checked': isChecked,
        'is-indeterminate': isIndeterminate,
        'is-disabled': disabled
      }
    ]"
    :for="id || undefined"
  >
    <input
      ref="inputRef"
      type="checkbox"
      class="nano-switch-input"
      :checked="isChecked"
      :disabled="disabled"
      :name="name || undefined"
      :id="id || undefined"
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

/* --- Checked Active Styles --- */
.color-primary.is-checked .nano-switch-slider,
.color-cyan.is-checked .nano-switch-slider {
  background: var(--nano-switch-active-bg, rgba(0, 242, 254, 0.2));
  border-color: var(--nano-switch-active-border, rgba(0, 242, 254, 0.6));
  box-shadow: 0 0 10px var(--nano-switch-active-shadow, rgba(0, 242, 254, 0.3));
}
.color-primary.is-checked .nano-switch-slider::before,
.color-cyan.is-checked .nano-switch-slider::before {
  background: var(--nano-switch-active-knob, #00f2fe);
  box-shadow: 0 0 8px var(--nano-switch-active-knob, rgba(0, 242, 254, 0.6));
}

.color-purple.is-checked .nano-switch-slider {
  background: rgba(168, 85, 247, 0.2);
  border-color: rgba(168, 85, 247, 0.6);
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.3);
}
.color-purple.is-checked .nano-switch-slider::before {
  background: #c084fc;
  box-shadow: 0 0 8px rgba(192, 132, 252, 0.6);
}

.color-emerald.is-checked .nano-switch-slider {
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.6);
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
}
.color-emerald.is-checked .nano-switch-slider::before {
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
}

.color-danger.is-checked .nano-switch-slider {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.6);
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
}
.color-danger.is-checked .nano-switch-slider::before {
  background: #ef4444;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
}

.color-gold.is-checked .nano-switch-slider {
  background: rgba(200, 155, 60, 0.2);
  border-color: rgba(200, 155, 60, 0.6);
  box-shadow: 0 0 10px rgba(200, 155, 60, 0.3);
}
.color-gold.is-checked .nano-switch-slider::before {
  background: #c89b3c;
  box-shadow: 0 0 8px rgba(200, 155, 60, 0.6);
}

/* --- Indeterminate State Styles --- */
.nano-switch.is-indeterminate .nano-switch-slider {
  background: rgba(148, 163, 184, 0.12);
  border-color: rgba(148, 163, 184, 0.35);
}

.color-primary.is-indeterminate .nano-switch-slider,
.color-cyan.is-indeterminate .nano-switch-slider {
  background: rgba(0, 242, 254, 0.08);
  border-color: rgba(0, 242, 254, 0.35);
}
.color-primary.is-indeterminate .nano-switch-slider::before,
.color-cyan.is-indeterminate .nano-switch-slider::before {
  background: #38bdf8;
  box-shadow: 0 0 6px rgba(56, 189, 248, 0.4);
}

.color-purple.is-indeterminate .nano-switch-slider {
  background: rgba(168, 85, 247, 0.08);
  border-color: rgba(168, 85, 247, 0.35);
}
.color-purple.is-indeterminate .nano-switch-slider::before {
  background: #c084fc;
  box-shadow: 0 0 6px rgba(192, 132, 252, 0.4);
}

.color-emerald.is-indeterminate .nano-switch-slider {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.35);
}
.color-emerald.is-indeterminate .nano-switch-slider::before {
  background: #34d399;
  box-shadow: 0 0 6px rgba(52, 211, 153, 0.4);
}

.color-danger.is-indeterminate .nano-switch-slider {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.35);
}
.color-danger.is-indeterminate .nano-switch-slider::before {
  background: #f87171;
  box-shadow: 0 0 6px rgba(248, 113, 113, 0.4);
}

.color-gold.is-indeterminate .nano-switch-slider {
  background: rgba(200, 155, 60, 0.08);
  border-color: rgba(200, 155, 60, 0.35);
}
.color-gold.is-indeterminate .nano-switch-slider::before {
  background: #fbbf24;
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.4);
}

/* Light Mode Indeterminate: Crisp, high-contrast borders & vivid knobs */
:root[data-theme="light"] .nano-switch.is-indeterminate .nano-switch-slider,
html[data-theme="light"] .nano-switch.is-indeterminate .nano-switch-slider {
  background: rgba(100, 116, 139, 0.08);
  border-color: rgba(100, 116, 139, 0.5);
}

:root[data-theme="light"] .color-primary.is-indeterminate .nano-switch-slider,
:root[data-theme="light"] .color-cyan.is-indeterminate .nano-switch-slider,
html[data-theme="light"] .color-primary.is-indeterminate .nano-switch-slider,
html[data-theme="light"] .color-cyan.is-indeterminate .nano-switch-slider {
  background: rgba(2, 132, 199, 0.08);
  border-color: rgba(2, 132, 199, 0.65);
}
:root[data-theme="light"] .color-primary.is-indeterminate .nano-switch-slider::before,
:root[data-theme="light"] .color-cyan.is-indeterminate .nano-switch-slider::before,
html[data-theme="light"] .color-primary.is-indeterminate .nano-switch-slider::before,
html[data-theme="light"] .color-cyan.is-indeterminate .nano-switch-slider::before {
  background: #0284c7;
  box-shadow: 0 0 6px rgba(2, 132, 199, 0.3);
}

:root[data-theme="light"] .color-purple.is-indeterminate .nano-switch-slider,
html[data-theme="light"] .color-purple.is-indeterminate .nano-switch-slider {
  background: rgba(124, 58, 237, 0.08);
  border-color: rgba(124, 58, 237, 0.65);
}
:root[data-theme="light"] .color-purple.is-indeterminate .nano-switch-slider::before,
html[data-theme="light"] .color-purple.is-indeterminate .nano-switch-slider::before {
  background: #7c3aed;
  box-shadow: 0 0 6px rgba(124, 58, 237, 0.3);
}

:root[data-theme="light"] .color-emerald.is-indeterminate .nano-switch-slider,
html[data-theme="light"] .color-emerald.is-indeterminate .nano-switch-slider {
  background: rgba(5, 150, 105, 0.08);
  border-color: rgba(5, 150, 105, 0.65);
}
:root[data-theme="light"] .color-emerald.is-indeterminate .nano-switch-slider::before,
html[data-theme="light"] .color-emerald.is-indeterminate .nano-switch-slider::before {
  background: #059669;
  box-shadow: 0 0 6px rgba(5, 150, 105, 0.3);
}

:root[data-theme="light"] .color-danger.is-indeterminate .nano-switch-slider,
html[data-theme="light"] .color-danger.is-indeterminate .nano-switch-slider {
  background: rgba(220, 38, 38, 0.08);
  border-color: rgba(220, 38, 38, 0.65);
}
:root[data-theme="light"] .color-danger.is-indeterminate .nano-switch-slider::before,
html[data-theme="light"] .color-danger.is-indeterminate .nano-switch-slider::before {
  background: #dc2626;
  box-shadow: 0 0 6px rgba(220, 38, 38, 0.3);
}

:root[data-theme="light"] .color-gold.is-indeterminate .nano-switch-slider,
html[data-theme="light"] .color-gold.is-indeterminate .nano-switch-slider {
  background: rgba(217, 119, 6, 0.08);
  border-color: rgba(217, 119, 6, 0.65);
}
:root[data-theme="light"] .color-gold.is-indeterminate .nano-switch-slider::before,
html[data-theme="light"] .color-gold.is-indeterminate .nano-switch-slider::before {
  background: #d97706;
  box-shadow: 0 0 6px rgba(217, 119, 6, 0.3);
}

/* --- Stationary Hover States --- */
.nano-switch:not(.is-disabled):not(.is-checked):not(.is-indeterminate):hover .nano-switch-slider {
  border-color: var(--nano-border-hover);
  background: var(--nano-bg-hover);
}

.nano-switch.is-checked:not(.is-disabled):hover .nano-switch-slider {
  box-shadow: 0 0 12px var(--nano-switch-active-shadow, rgba(0, 242, 254, 0.35));
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
