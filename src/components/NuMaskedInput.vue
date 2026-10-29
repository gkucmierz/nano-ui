<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { applyMask, parseMaskSteps } from '../utils/mask.js';

const toStringTag = (val) => Object.prototype.toString.call(val);
const isString = (val) => toStringTag(val) === '[object String]';

const props = defineProps({
  mask: {
    type: String,
    default: '###-###',
  },
  modelValue: {
    type: String,
    default: '',
  },
  unmasked: {
    type: String,
    default: '',
  },
  placeholderChar: {
    type: String,
    default: '-',
  },
  guide: {
    type: Boolean,
    default: true,
  },
  tokens: {
    type: Object,
    default: () => ({}),
  },
  regex: {
    type: [RegExp, String],
    default: null,
  },
  masked: {
    type: Boolean,
    default: false,
  },
  autoSubmit: {
    type: Boolean,
    default: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  autofocus: {
    type: Boolean,
    default: false,
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  status: {
    type: String,
    default: 'normal',
    validator: (v) => ['normal', 'error', 'success'].includes(v),
  },
  actionLabel: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue', 'update:unmasked', 'complete', 'submit']);

const inputRef = ref(null);
const rawState = ref(props.modelValue || props.unmasked || '');

watch(() => props.modelValue, (val) => {
  if (val !== undefined && val !== maskResult.value.formatted) {
    rawState.value = val;
  }
});

watch(() => props.unmasked, (val) => {
  if (val !== undefined && val !== maskResult.value.unmasked) {
    rawState.value = val;
  }
});

const steps = computed(() => parseMaskSteps(props.mask, props.tokens));

const maskResult = computed(() => applyMask(
  rawState.value,
  props.mask,
  props.tokens,
  props.placeholderChar
));

const displayFormatted = computed(() => {
  const formatted = maskResult.value.formatted;
  if (!props.masked || !formatted) return formatted;

  let out = '';
  for (let i = 0; i < formatted.length; i++) {
    const step = steps.value[i];
    out += step && step.type === 'slot' ? '•' : formatted[i];
  }
  return out;
});

const isValid = computed(() => {
  if (!maskResult.value.isComplete) return false;
  if (!props.regex) return true;
  const pattern = props.regex instanceof RegExp
    ? props.regex
    : (isString(props.regex) ? new RegExp(props.regex) : null);
  if (!pattern) return true;
  return pattern.test(maskResult.value.formatted) || pattern.test(maskResult.value.unmasked);
});

const updateValue = (inputVal) => {
  if (props.disabled) return;
  const prevComplete = maskResult.value.isComplete;
  const prevUnmasked = maskResult.value.unmasked;

  const next = applyMask(inputVal, props.mask, props.tokens, props.placeholderChar);
  rawState.value = next.formatted;

  if (inputRef.value && inputRef.value.value !== next.formatted) {
    inputRef.value.value = next.formatted;
  }

  emit('update:modelValue', next.formatted);
  emit('update:unmasked', next.unmasked);

  if (next.isComplete && (!prevComplete || next.unmasked !== prevUnmasked)) {
    const payload = {
      value: next.formatted,
      unmasked: next.unmasked,
      isValid: isValid.value,
    };
    emit('complete', payload);
    if (props.autoSubmit && isValid.value) {
      emit('submit', payload);
    }
  }
};

const onInput = (event) => {
  updateValue(event.target.value);
};

const onPaste = (event) => {
  if (props.disabled) return;
  if (event.clipboardData) {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text') || '';
    updateValue(pasted);
  }
};

const triggerSubmit = () => {
  if (props.disabled) return;
  emit('submit', {
    value: maskResult.value.formatted,
    unmasked: maskResult.value.unmasked,
    isValid: isValid.value,
  });
};

const onKeyDown = (event) => {
  if (props.disabled) return;
  if (event.key === 'Enter') {
    event.preventDefault();
    triggerSubmit();
  }
};

const focus = () => {
  if (inputRef.value && !props.disabled) {
    inputRef.value.focus();
  }
};

onMounted(() => {
  if (props.autofocus && !props.disabled && inputRef.value) {
    inputRef.value.focus();
  }
});

defineExpose({
  focus,
  inputRef,
  isValid,
});
</script>

<template>
  <div
    class="nu-masked-input"
    :class="[
      `size-${size}`,
      `status-${status}`,
      {
        'is-disabled': disabled,
        'is-complete': maskResult.isComplete,
        'has-action': Boolean(actionLabel || $slots.action),
      },
    ]"
    @click="focus"
  >
    <div class="nu-masked-field">
      <!-- Visual Overlay Layer (Entered Chars + Guide Mask) -->
      <div class="nu-masked-overlay" aria-hidden="true">
        <span class="nu-masked-filled">{{ displayFormatted }}</span><span
          v-if="guide"
          class="nu-masked-guide"
        >{{ maskResult.remainingGuide }}</span>
      </div>

      <!-- Single Native Input with Transparent Text & Visible Caret -->
      <input
        ref="inputRef"
        type="text"
        class="nu-masked-native"
        :value="maskResult.formatted"
        :maxlength="steps.length"
        :disabled="disabled"
        :autofocus="autofocus"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        @input="onInput"
        @paste="onPaste"
        @keydown="onKeyDown"
      />
    </div>

    <button
      v-if="actionLabel || $slots.action"
      type="button"
      class="nu-masked-action"
      :disabled="disabled || !maskResult.isComplete"
      @click.stop="triggerSubmit"
    >
      <slot name="action">{{ actionLabel }}</slot>
    </button>
  </div>
</template>

<style scoped>
.nu-masked-input,
.nu-masked-input *,
.nu-masked-input *::before,
.nu-masked-input *::after {
  box-sizing: border-box;
}

.nu-masked-input {
  display: inline-flex;
  align-items: stretch;
  border-radius: var(--nano-radius-md, 8px);
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.15));
  background: var(--nano-bg-code, #0f172a);
  color: var(--nano-text-main, #f8fafc);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  user-select: none;
  -webkit-user-select: none;
  transition: border-color 140ms ease, box-shadow 140ms ease;
  overflow: hidden;
}

.nu-masked-input:focus-within {
  border-color: var(--nano-state-active, #00f2fe);
  box-shadow: 0 0 0 1px rgba(0, 242, 254, 0.25);
}

.nu-masked-input.status-error {
  border-color: var(--nano-status-danger, #f87171);
}

.nu-masked-input.status-success {
  border-color: var(--nano-status-success, #4ade80);
}

.nu-masked-input.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.nu-masked-field {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 1 1 auto;
}

.nu-masked-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  pointer-events: none;
  white-space: pre;
  font-variant-numeric: tabular-nums;
}

.nu-masked-filled {
  color: var(--nano-text-main, #f8fafc);
  font-weight: 600;
}

.nu-masked-guide {
  color: var(--nano-text-muted, #94a3b8);
  opacity: 0.45;
}

.nu-masked-native {
  position: relative;
  width: 100%;
  height: 100%;
  margin: 0;
  border: none;
  background: transparent;
  color: transparent;
  caret-color: var(--nano-state-active, #00f2fe);
  font-family: inherit;
  font-size: inherit;
  font-weight: 600;
  letter-spacing: inherit;
  font-variant-numeric: tabular-nums;
  outline: none;
}

.nu-masked-native::selection {
  background: rgba(0, 242, 254, 0.2);
  color: transparent;
}

.nu-masked-action {
  border: none;
  border-left: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.15));
  background: var(--nano-bg-hover, rgba(255, 255, 255, 0.08));
  color: var(--nano-text-main, #f8fafc);
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0 0.85rem;
  cursor: pointer;
  outline: none;
  transition: background-color 120ms ease, color 120ms ease;
}

.nu-masked-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.nu-masked-action:not(:disabled):hover {
  background: var(--nano-nav-active-bg, rgba(99, 102, 241, 0.2));
}

/* Sizes */
.size-sm .nu-masked-field {
  height: 32px;
}

.size-sm .nu-masked-overlay,
.size-sm .nu-masked-native {
  padding: 0 0.65rem;
  font-size: 0.85rem;
  letter-spacing: 0.12em;
}

.size-md .nu-masked-field {
  height: 40px;
}

.size-md .nu-masked-overlay,
.size-md .nu-masked-native {
  padding: 0 0.85rem;
  font-size: 1rem;
  letter-spacing: 0.16em;
}

.size-lg .nu-masked-field {
  height: 48px;
}

.size-lg .nu-masked-overlay,
.size-lg .nu-masked-native {
  padding: 0 1.05rem;
  font-size: 1.15rem;
  letter-spacing: 0.2em;
}
</style>
