<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { createSecretByteBuffer } from '../utils/secretPipe.js';

defineOptions({
  name: 'NanoSecretPipe',
});

const props = defineProps({
  prompt: {
    type: String,
    default: 'Enter SSH / Sudo passphrase:',
  },
  placeholder: {
    type: String,
    default: 'Type secret directly in Zero-Cache Pipe and press Enter…',
  },
  submitLabel: {
    type: String,
    default: 'Send to Pipe',
  },
  clearLabel: {
    type: String,
    default: 'Wipe RAM',
  },
  maxBytes: {
    type: Number,
    default: 512,
  },
  defaultStealth: {
    type: Boolean,
    default: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  autoFocus: {
    type: Boolean,
    default: true,
  },
  logs: {
    type: Array,
    default: () => [],
  },
  onSubmitBytes: {
    type: Function,
    default: null,
  },
});

const emit = defineEmits(['submit-bytes', 'cancel', 'wipe']);

const pipeBuffer = createSecretByteBuffer(props.maxBytes);
const captureBoxRef = ref(null);
const isFocused = ref(false);
const stealthMode = ref(props.defaultStealth);
const charCount = ref(0);
const byteCount = ref(0);
const isSubmitting = ref(false);

const syncCounts = () => {
  charCount.value = pipeBuffer.getCharCount();
  byteCount.value = pipeBuffer.getByteLength();
};

const wipeBuffer = () => {
  pipeBuffer.wipe();
  syncCounts();
  emit('wipe');
};

const maskedBullets = computed(() => {
  const count = Math.min(charCount.value, 64);
  return '•'.repeat(count);
});

const focusPipe = () => {
  nextTick(() => {
    captureBoxRef.value?.focus();
  });
};

const submitSecret = async () => {
  if (props.disabled || props.loading || isSubmitting.value || byteCount.value === 0) return;
  isSubmitting.value = true;

  const payload = pipeBuffer.extractAndWipe();
  syncCounts();

  try {
    if (typeof props.onSubmitBytes === 'function') {
      await props.onSubmitBytes(payload);
    } else {
      emit('submit-bytes', payload);
    }
  } finally {
    if (typeof props.onSubmitBytes === 'function') {
      payload.fill(0);
    }
    isSubmitting.value = false;
  }
};

const handleKeydown = (e) => {
  if (props.disabled || props.loading || isSubmitting.value) return;

  if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    submitSecret();
    return;
  }

  if (e.key === 'Backspace') {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    pipeBuffer.popChar();
    syncCounts();
    return;
  }

  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    if (charCount.value > 0) {
      wipeBuffer();
    } else {
      emit('cancel');
    }
    return;
  }

  if ((e.ctrlKey && e.key.toLowerCase() === 'u') || (e.metaKey && e.key === 'Backspace')) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    wipeBuffer();
    return;
  }

  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
    return;
  }

  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    pipeBuffer.appendText(e.key);
    syncCounts();
  }
};

const handlePaste = (e) => {
  if (props.disabled || props.loading || isSubmitting.value) return;
  e.preventDefault();
  e.stopPropagation();
  if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
  const pasted = e.clipboardData?.getData('text') || '';
  if (pasted) {
    pipeBuffer.appendText(pasted);
    syncCounts();
  }
};

watch(
  () => props.prompt,
  (val) => {
    if (val && props.autoFocus) {
      focusPipe();
    }
  }
);

onMounted(() => {
  if (props.autoFocus) {
    focusPipe();
  }
});

onUnmounted(() => {
  pipeBuffer.wipe();
});

defineExpose({
  wipeBuffer,
  focusPipe,
});
</script>

<template>
  <div class="nano-secret-pipe" :class="{ 'is-disabled': disabled }">
    <div class="nano-secret-pipe__header">
      <div class="nano-secret-pipe__title-group">
        <span class="nano-secret-pipe__icon" aria-hidden="true">🛡️</span>
        <span class="nano-secret-pipe__title">Zero-Cache Cryptographic Secret Pipe</span>
        <span class="nano-secret-pipe__badge">
          RAM Uint8Array • ZERO DOM VALUE • .fill(0)
        </span>
      </div>

      <button
        type="button"
        class="nano-secret-pipe__mode-btn"
        @click="stealthMode = !stealthMode; focusPipe()"
      >
        <span>{{ stealthMode ? '🕵️ Stealth UNIX (No Echo)' : '••• Masked Dots' }}</span>
      </button>
    </div>

    <div v-if="logs && logs.length > 0" class="nano-secret-pipe__logs">
      <div
        v-for="(entry, idx) in logs.slice(-6)"
        :key="idx"
        class="nano-secret-pipe__log-line"
        :class="entry.type ? `is-${entry.type}` : ''"
      >
        {{ typeof entry === 'string' ? entry : entry.text }}
      </div>
    </div>

    <div class="nano-secret-pipe__prompt-zone">
      <div v-if="prompt" class="nano-secret-pipe__prompt-label">
        <span class="nano-secret-pipe__chevron">❯</span>
        <span class="nano-secret-pipe__prompt-text">{{ prompt }}</span>
      </div>

      <div class="nano-secret-pipe__row">
        <!-- Zero <input>, Zero <textarea>, Zero <form>: immune to DOM value scrapers & autofill -->
        <div
          ref="captureBoxRef"
          tabindex="0"
          role="textbox"
          :aria-label="prompt || 'Encrypted Secret Console Pipe'"
          aria-autocomplete="none"
          data-lpignore="true"
          data-1p-ignore="true"
          data-bwignore="true"
          data-form-type="other"
          spellcheck="false"
          autocapitalize="off"
          translate="no"
          class="nano-secret-pipe__capture"
          :class="{ 'is-focused': isFocused }"
          @focus="isFocused = true"
          @blur="isFocused = false"
          @keydown="handleKeydown"
          @paste="handlePaste"
          @contextmenu.prevent
        >
          <span class="nano-secret-pipe__key" aria-hidden="true">🔑</span>
          <span v-if="charCount === 0" class="nano-secret-pipe__placeholder">
            {{ placeholder }}
          </span>
          <span v-else-if="stealthMode" class="nano-secret-pipe__stealth">
            [UNIX STEALTH BUFFER: {{ byteCount }} {{ byteCount === 1 ? 'byte' : 'bytes' }} ready]
          </span>
          <span v-else class="nano-secret-pipe__bullets">{{ maskedBullets }}</span>
          <span class="nano-secret-pipe__cursor" :class="{ 'is-blinking': isFocused }">█</span>
        </div>

        <button
          type="button"
          class="nano-secret-pipe__submit-btn"
          :disabled="disabled || loading || isSubmitting || byteCount === 0"
          @click="submitSecret"
        >
          <span>↵ {{ submitLabel }}</span>
        </button>

        <button
          v-if="charCount > 0"
          type="button"
          class="nano-secret-pipe__clear-btn"
          @click="wipeBuffer(); focusPipe()"
        >
          {{ clearLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nano-secret-pipe {
  border-radius: 12px;
  border: 1px solid var(--nano-secret-border, rgba(16, 185, 129, 0.35));
  background: var(--nano-secret-bg, var(--nano-bg-card-elevated, #090e17));
  color: var(--nano-secret-fg, var(--nano-text-main, #e2e8f0));
  padding: 12px 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  box-shadow: var(--nano-shadow-card, 0 10px 28px rgba(0, 0, 0, 0.14));
}

.nano-secret-pipe__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  padding-bottom: 8px;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--nano-border-subtle, rgba(148, 163, 184, 0.16));
}

.nano-secret-pipe__title-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.nano-secret-pipe__title {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--nano-secret-fg, var(--nano-text-main, #f8fafc));
}

.nano-secret-pipe__badge {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--nano-secret-badge-bg, rgba(16, 185, 129, 0.15));
  color: var(--nano-secret-badge-fg, #10b981);
  border: 1px solid var(--nano-secret-border, rgba(16, 185, 129, 0.35));
}

.nano-secret-pipe__mode-btn {
  background: var(--nano-secret-input-bg, var(--nano-bg-muted, rgba(30, 41, 59, 0.85)));
  color: var(--nano-secret-fg, var(--nano-text-secondary, #cbd5e1));
  border: 1px solid var(--nano-secret-input-border, var(--nano-border-card, rgba(148, 163, 184, 0.28)));
  border-radius: 6px;
  padding: 4px 9px;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}

.nano-secret-pipe__mode-btn:hover {
  border-color: var(--nano-state-active, #0284c7);
  color: var(--nano-secret-fg, var(--nano-text-main, #f8fafc));
}

.nano-secret-pipe__logs {
  background: var(--nano-secret-input-bg, var(--nano-bg-code, rgba(2, 6, 23, 0.75)));
  border: 1px solid var(--nano-secret-input-border, var(--nano-border-card, rgba(51, 65, 85, 0.6)));
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 10px;
  max-height: 120px;
  overflow-y: auto;
  font-size: 0.74rem;
  line-height: 1.45;
}

.nano-secret-pipe__log-line {
  color: var(--nano-secret-muted, var(--nano-text-muted, #94a3b8));
  white-space: pre-wrap;
  word-break: break-all;
}

.nano-secret-pipe__log-line.is-prompt {
  color: var(--nano-status-warn, #d97706);
  font-weight: 700;
}

.nano-secret-pipe__log-line.is-stderr {
  color: var(--nano-status-danger, #ef4444);
}

.nano-secret-pipe__prompt-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--nano-secret-prompt-fg, #10b981);
  margin-bottom: 6px;
}

.nano-secret-pipe__chevron {
  color: #10b981;
}

.nano-secret-pipe__row {
  display: flex;
  align-items: stretch;
  gap: 8px;
  flex-wrap: wrap;
}

.nano-secret-pipe__capture {
  flex: 1;
  min-width: 240px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 8px;
  background: var(--nano-secret-input-bg, var(--nano-bg-code, #020617));
  border: 1px solid var(--nano-secret-input-border, var(--nano-border-card, rgba(148, 163, 184, 0.32)));
  color: var(--nano-secret-fg, var(--nano-text-main, #f8fafc));
  font-size: 0.82rem;
  cursor: text;
  user-select: none;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.nano-secret-pipe__capture.is-focused {
  border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.22);
}

.nano-secret-pipe__placeholder {
  color: var(--nano-secret-muted, var(--nano-text-muted, #64748b));
  font-size: 0.78rem;
}

.nano-secret-pipe__stealth {
  color: var(--nano-secret-badge-fg, #10b981);
  font-weight: 700;
  font-size: 0.78rem;
}

.nano-secret-pipe__bullets {
  color: var(--nano-state-active, #0284c7);
  letter-spacing: 0.12em;
  font-weight: 700;
}

.nano-secret-pipe__cursor {
  color: #10b981;
  font-size: 0.8rem;
  opacity: 0.25;
}

.nano-secret-pipe__cursor.is-blinking {
  opacity: 1;
  animation: nano-secret-blink 1s step-end infinite;
}

@keyframes nano-secret-blink {
  50% {
    opacity: 0;
  }
}

.nano-secret-pipe__submit-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(16, 185, 129, 0.5);
  background: linear-gradient(135deg, #059669, #047857);
  color: #ecfdf5;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.nano-secret-pipe__submit-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.nano-secret-pipe__clear-btn {
  padding: 8px 11px;
  border-radius: 8px;
  border: 1px solid var(--nano-status-danger-border, rgba(248, 113, 113, 0.4));
  background: var(--nano-status-danger-bg, rgba(127, 29, 29, 0.35));
  color: var(--nano-status-danger-text, #fecaca);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}
</style>
