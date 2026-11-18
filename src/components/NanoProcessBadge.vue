<script setup>
import { computed } from 'vue';
import { tooltipDirective as vTooltip } from '../directives/tooltip.js';
import {
  MAX_PROCESS_ERROR_CODE_LENGTH,
  normalizeModalProcessState,
} from '../utils/modalProcess.js';

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
  maxErrorLength: {
    type: Number,
    default: MAX_PROCESS_ERROR_CODE_LENGTH,
  },
  showIdle: {
    type: Boolean,
    default: false,
  },
  size: {
    type: String,
    default: 'md',
  },
});

const normalized = computed(() =>
  normalizeModalProcessState(props.process, {
    processState: props.status,
    processLabel: props.label,
    processErrorCode: props.errorCode,
    processTooltip: props.tooltip,
    maxErrorLength: props.maxErrorLength,
  })
);

const shouldRender = computed(
  () => normalized.value.isActive || (props.showIdle && Boolean(normalized.value.label))
);

const tooltipText = computed(() => normalized.value.tooltip || '');

defineExpose({
  normalized,
});
</script>

<template>
  <span
    v-if="shouldRender"
    v-tooltip="tooltipText"
    class="nano-process-badge"
    :class="[
      `is-${normalized.status}`,
      `nano-process-badge--${size}`,
    ]"
    role="status"
    aria-live="polite"
    :aria-label="tooltipText || normalized.displayText"
  >
    <svg
      v-if="normalized.status === 'pending'"
      class="nano-process-spinner"
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle
        class="nano-process-spinner-track"
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        stroke-width="2"
      />
      <path
        class="nano-process-spinner-arc"
        d="M8 2 A6 6 0 0 1 14 8"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>

    <svg
      v-else-if="normalized.status === 'success'"
      class="nano-process-glyph"
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.2 8.4L6.5 11.7L12.8 4.6"
        stroke="currentColor"
        stroke-width="2.1"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>

    <svg
      v-else-if="normalized.status === 'failed'"
      class="nano-process-glyph"
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4.2 4.2L11.8 11.8M11.8 4.2L4.2 11.8"
        stroke="currentColor"
        stroke-width="2.1"
        stroke-linecap="round"
      />
    </svg>

    <span v-else class="nano-process-idle-dot" aria-hidden="true"></span>

    <code
      v-if="normalized.status === 'failed'"
      class="nano-process-error-code"
    >{{ normalized.displayText }}</code>
    <span v-else class="nano-process-label">{{ normalized.displayText }}</span>
  </span>
</template>

<style scoped>
.nano-process-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  box-sizing: border-box;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  flex-shrink: 0;
  border: 1px solid var(--nano-status-neutral-border, rgba(148, 163, 184, 0.28));
  background: var(--nano-status-neutral-bg, rgba(148, 163, 184, 0.12));
  color: var(--nano-status-neutral-text, #cbd5e1);
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}

.nano-process-badge--sm {
  height: 22px;
  padding: 0 8px;
  font-size: 0.7rem;
  gap: 5px;
}

.nano-process-badge.is-pending {
  border-color: var(--nano-status-info-border, rgba(56, 189, 248, 0.42));
  background: var(--nano-status-info-bg, rgba(14, 165, 233, 0.14));
  color: var(--nano-status-info-text, #38bdf8);
}

.nano-process-badge.is-success {
  border-color: var(--nano-status-success-border, rgba(16, 185, 129, 0.42));
  background: var(--nano-status-success-bg, rgba(16, 185, 129, 0.14));
  color: var(--nano-status-success-text, #34d399);
}

.nano-process-badge.is-failed {
  border-color: rgba(239, 68, 68, 0.48);
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.nano-process-spinner {
  flex-shrink: 0;
  animation: nano-process-spin 0.85s linear infinite;
}

.nano-process-spinner-track {
  opacity: 0.26;
}

.nano-process-glyph {
  flex-shrink: 0;
}

.nano-process-idle-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.65;
  flex-shrink: 0;
}

.nano-process-label {
  letter-spacing: 0.01em;
}

.nano-process-error-code {
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.73rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  background: transparent;
  padding: 0;
  color: inherit;
}

@keyframes nano-process-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .nano-process-spinner {
    animation-duration: 2.4s;
  }
}
</style>
