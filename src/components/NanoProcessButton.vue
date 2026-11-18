<script setup>
import { computed } from 'vue';
import vRipple from '../directives/ripple.js';
import { tooltipDirective as vTooltip } from '../directives/tooltip.js';
import { playNanoUiSound } from '../utils/sound-controller.js';
import { normalizeModalProcessState } from '../utils/modalProcess.js';
import NanoProcessBadge from './NanoProcessBadge.vue';

const props = defineProps({
  process: {
    type: [Object, String],
    default: null,
  },
  status: {
    type: String,
    default: undefined,
  },
  label: {
    type: String,
    default: undefined,
  },
  errorCode: {
    type: String,
    default: undefined,
  },
  tooltip: {
    type: String,
    default: undefined,
  },
  titleText: {
    type: String,
    default: '',
  },
  variant: {
    type: String,
    default: 'secondary',
  },
  size: {
    type: String,
    default: 'md',
  },
  showIdle: {
    type: Boolean,
    default: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  sound: {
    type: [Boolean, String, Object],
    default: undefined,
  },
});

const emit = defineEmits(['click']);

const normalized = computed(() =>
  normalizeModalProcessState(props.process, {
    processState: props.status,
    processLabel: props.label,
    processErrorCode: props.errorCode,
    processTooltip: props.tooltip,
  })
);

function handleClick(event) {
  if (props.disabled) return;
  playNanoUiSound('ui-tap-soft', {
    propSound: props.sound,
    size: props.size,
    minIntervalMs: 32,
    throttleKey: 'nano-process-btn',
  });
  emit('click', event);
}

defineExpose({
  normalized,
});
</script>

<template>
  <button
    v-ripple="{ sound: false }"
    v-tooltip="normalized.tooltip || ''"
    type="button"
    data-nano-sound-owner="true"
    class="nano-process-button"
    :class="[
      `nano-process-button--${variant}`,
      `nano-process-button--${size}`,
      `is-state-${normalized.status}`,
    ]"
    :disabled="disabled"
    @click="handleClick"
  >
    <span v-if="$slots.default || titleText" class="nano-process-button-title">
      <slot>{{ titleText }}</slot>
    </span>
    <NanoProcessBadge
      :process="normalized"
      :show-idle="showIdle"
      size="sm"
    />
  </button>
</template>

<style scoped>
.nano-process-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  box-sizing: border-box;
  line-height: 1;
  font-family: inherit;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  border: 1px solid var(--nano-border-card, rgba(148, 163, 184, 0.26));
  background: var(--nano-bg-muted, rgba(15, 23, 42, 0.65));
  color: var(--nano-text-main, #f1f5f9);
  transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.nano-process-button--sm {
  height: 32px;
  padding: 0 10px;
  font-size: 0.8rem;
}

.nano-process-button--lg {
  height: 40px;
  padding: 0 14px;
  font-size: 0.92rem;
}

.nano-process-button--primary {
  background: var(--nano-accent-primary, #6366f1);
  border-color: transparent;
  color: #ffffff;
}

.nano-process-button--ghost {
  background: transparent;
}

.nano-process-button:hover:not(:disabled) {
  border-color: var(--nano-accent-primary, #6366f1);
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.22);
}

.nano-process-button.is-state-failed:hover:not(:disabled) {
  border-color: rgba(239, 68, 68, 0.6);
  box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.24);
}

.nano-process-button:disabled {
  opacity: 0.52;
  cursor: not-allowed;
}

.nano-process-button-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
</style>
