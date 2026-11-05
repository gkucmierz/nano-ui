<script setup>
import { computed } from 'vue';
import { resolveNanoColor } from '../utils/colors.js';

let nanoCheckboxSeq = 0;

const props = defineProps({
  id: {
    type: String,
    default: '',
  },
  name: {
    type: String,
    default: '',
  },
  modelValue: {
    type: [Boolean, null],
    default: false,
  },
  indeterminate: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  size: {
    type: String,
    default: 'md', // 'sm' | 'md' | 'lg'
  },
  color: {
    type: String,
    default: 'primary', // SSoT preset ('primary' | 'cyan' | 'purple' | 'emerald' | 'danger' | 'gold' | ...) or custom CSS color
  },
  label: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue', 'update:indeterminate', 'change']);

const CHECKBOX_FILL_PRESETS = Object.freeze({
  primary: '#0284c7',
  cyan: '#0284c7',
  active: '#0284c7',
  info: '#0284c7',
  indigo: '#4f46e5',
  purple: '#7c3aed',
  emerald: '#059669',
  success: '#16a34a',
  danger: '#dc2626',
  rose: '#e11d48',
  gold: '#d97706',
  amber: '#d97706',
  orange: '#ea580c',
  warn: '#ca8a04',
});

const resolvedColor = computed(() => {
  const key = typeof props.color === 'string' ? props.color.trim() : '';
  if (key && CHECKBOX_FILL_PRESETS[key]) {
    return CHECKBOX_FILL_PRESETS[key];
  }
  return resolveNanoColor(props.color, 'primary');
});

const isIndeterminate = computed(() => props.indeterminate || props.modelValue === null);
const isChecked = computed(() => !isIndeterminate.value && Boolean(props.modelValue));
const fallbackId = `nano-checkbox-${++nanoCheckboxSeq}`;
const resolvedId = computed(() => props.id || fallbackId);
const resolvedName = computed(() => props.name || resolvedId.value);

const toggle = (event) => {
  if (props.disabled) return;
  if (isIndeterminate.value) {
    emit('update:indeterminate', false);
    emit('update:modelValue', true);
    emit('change', true, event);
  } else {
    const next = !isChecked.value;
    emit('update:modelValue', next);
    emit('change', next, event);
  }
};
</script>

<template>
  <label
    :for="resolvedId"
    class="nano-checkbox"
    :class="[
      `nano-checkbox--${size}`,
      {
        'is-checked': isChecked,
        'is-indeterminate': isIndeterminate,
        'is-disabled': disabled,
      },
    ]"
    :style="{ '--nano-checkbox-color': resolvedColor }"
    data-no-drag
    @mousedown.stop
    @click.stop.prevent="toggle"
  >
    <button
      :id="resolvedId"
      :name="resolvedName"
      type="button"
      role="checkbox"
      class="nano-checkbox-box"
      :aria-checked="isIndeterminate ? 'mixed' : isChecked ? 'true' : 'false'"
      :aria-label="label || 'Checkbox'"
      :disabled="disabled"
      @keydown.space.prevent="toggle"
      @keydown.enter.prevent="toggle"
    >
      <svg
        class="nano-checkbox-svg"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <line
          v-if="isIndeterminate"
          x1="2.5"
          y1="6"
          x2="9.5"
          y2="6"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
        <polyline
          v-else-if="isChecked"
          points="2.2 6.2 4.8 8.8 9.8 3.2"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
    <span v-if="label || $slots.default" class="nano-checkbox-label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<style scoped>
.nano-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  color: var(--nano-text-main, var(--text-color, #e2e8f0));
  font-size: 12px;
  line-height: 1;
}

[data-theme="light"] .nano-checkbox,
.light .nano-checkbox {
  color: var(--nano-text-main, #0f172a);
}

.nano-checkbox.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.nano-checkbox-box {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  margin: 0;
  border-radius: 5px;
  border: 1.5px solid var(--nano-border-card, var(--border-color, #475569));
  background: var(--nano-bg-card, var(--panel-bg, #1e293b));
  color: #ffffff;
  cursor: inherit;
  outline: none;
  flex-shrink: 0;
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.12);
  transition:
    background-color 0.14s ease,
    border-color 0.14s ease,
    box-shadow 0.14s ease;
}

[data-theme="light"] .nano-checkbox-box,
.light .nano-checkbox-box {
  background: #ffffff;
  border-color: #94a3b8;
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.06);
}

.nano-checkbox:hover:not(.is-disabled) .nano-checkbox-box {
  border-color: var(--nano-checkbox-color, #0284c7);
}

.nano-checkbox.is-checked .nano-checkbox-box,
.nano-checkbox.is-indeterminate .nano-checkbox-box {
  background: var(--nano-checkbox-color, #0284c7);
  border-color: var(--nano-checkbox-color, #0284c7);
  box-shadow: 0 1px 3px rgba(2, 132, 199, 0.28);
}

.nano-checkbox--sm .nano-checkbox-box {
  width: 14px;
  height: 14px;
  border-radius: 4px;
}

.nano-checkbox--sm {
  font-size: 11px;
  gap: 5px;
}

.nano-checkbox--lg .nano-checkbox-box {
  width: 19px;
  height: 19px;
  border-radius: 6px;
}

.nano-checkbox--lg {
  font-size: 13px;
  gap: 8px;
}

.nano-checkbox-svg {
  width: 76%;
  height: 76%;
  display: block;
  pointer-events: none;
}

.nano-checkbox-label {
  color: inherit;
  font-weight: 600;
}
</style>
