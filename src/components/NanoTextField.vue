<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted, useId } from 'vue';
import NanoIcon from './NanoIcon.vue';
import { tooltipDirective as vTooltip } from '../directives/tooltip.js';
import { playNanoUiSound } from '../utils/sound-controller.js';
import {
  insertDictationAtCursor,
  computeTextareaAutoResize,
  computeVoiceRmsBars,
  isImeSafeEnterEvent,
  createVoiceAdapterSession,
} from '../utils/textFieldVoice.js';
import { is, isCallable } from '../utils/type.js';

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  multiline: {
    type: Boolean,
    default: false,
  },
  rows: {
    type: Number,
    default: 3,
  },
  minRows: {
    type: Number,
    default: 2,
  },
  maxRows: {
    type: Number,
    default: 8,
  },
  autoResize: {
    type: Boolean,
    default: false,
  },
  placeholder: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
  required: {
    type: Boolean,
    default: false,
  },
  clearable: {
    type: Boolean,
    default: false,
  },
  voiceEnabled: {
    type: Boolean,
    default: false,
  },
  voiceDictation: {
    type: Boolean,
    default: false,
  },
  voiceAdapter: {
    type: Object,
    default: null,
  },
  voiceRms: {
    type: Number,
    default: 0,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  readonly: {
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
  type: {
    type: String,
    default: 'text',
  },
  id: {
    type: String,
    default: '',
  },
  name: {
    type: String,
    default: '',
  },
  maxlength: {
    type: Number,
    default: undefined,
  },
  submitOnEnter: {
    type: Boolean,
    default: false,
  },
  sound: {
    type: [Boolean, String, Object],
    default: undefined,
  },
});

const emit = defineEmits([
  'update:modelValue',
  'input',
  'change',
  'clear',
  'focus',
  'blur',
  'enter',
  'voice-start',
  'voice-stop',
  'voice-partial',
  'voice-final',
  'voice-error',
]);

const autoId = `nano-textfield-${useId()}`;
const resolvedInputId = computed(() => props.id || autoId);

const controlRef = ref(null);
const isFocused = ref(false);
const isRecording = ref(false);
const liveRms = ref(0);
const autoResizeStyle = ref({});

let lastCompositionEndTs = -Infinity;
let dictationAnchorStart = null;
let dictationSelectionEnd = null;
let dictationInterimLength = 0;
let activeSession = null;

const stringValue = computed(() => String(props.modelValue ?? ''));
const hasValue = computed(() => stringValue.value.length > 0);
const showVoiceControl = computed(
  () => Boolean(props.voiceEnabled || props.voiceDictation || props.voiceAdapter)
);
const showActionRail = computed(() => Boolean(props.clearable || showVoiceControl.value));

const effectiveRms = computed(() =>
  isRecording.value ? Math.max(Number(props.voiceRms) || 0, liveRms.value) : 0
);
const rmsBars = computed(() => computeVoiceRmsBars(effectiveRms.value, 4));

const lineHeightBySize = computed(() =>
  props.size === 'sm' ? 18 : props.size === 'lg' ? 24 : 21
);

const syncAutoResize = () => {
  if (!props.multiline || !props.autoResize) {
    autoResizeStyle.value = {};
    return;
  }
  const el = controlRef.value;
  const padPx = props.size === 'sm' ? 12 : props.size === 'lg' ? 20 : 16;
  if (!el) {
    const fallback = computeTextareaAutoResize({
      scrollHeight: 0,
      lineHeightPx: lineHeightBySize.value,
      verticalPaddingPx: padPx,
      minRows: props.minRows,
      maxRows: props.maxRows,
    });
    autoResizeStyle.value = {
      minBlockSize: `${fallback.minHeightPx}px`,
      maxBlockSize: `${fallback.maxHeightPx}px`,
    };
    return;
  }

  const prevHeight = el.style.height;
  el.style.height = 'auto';
  const measuredScrollH = Number(el.scrollHeight) || 0;
  el.style.height = prevHeight;

  const metrics = computeTextareaAutoResize({
    scrollHeight: measuredScrollH,
    lineHeightPx: lineHeightBySize.value,
    verticalPaddingPx: padPx,
    minRows: props.minRows,
    maxRows: props.maxRows,
  });

  autoResizeStyle.value = {
    height: `${metrics.heightPx}px`,
    minBlockSize: `${metrics.minHeightPx}px`,
    maxBlockSize: `${metrics.maxHeightPx}px`,
    overflowY: metrics.overflowY,
  };
};

const syncCaretSelection = (caretPos) => {
  nextTick(() => {
    const el = controlRef.value;
    if (el && isCallable(el.setSelectionRange)) {
      try {
        el.setSelectionRange(caretPos, caretPos);
      } catch {
        // Ignore input types that do not support selectionRange (e.g. email/number)
      }
    }
    syncAutoResize();
  });
};

const captureCurrentSelection = () => {
  const el = controlRef.value;
  if (el && is(el.selectionStart, 'number')) {
    dictationAnchorStart = el.selectionStart;
    dictationSelectionEnd = is(el.selectionEnd, 'number') ? el.selectionEnd : el.selectionStart;
  } else {
    dictationAnchorStart = stringValue.value.length;
    dictationSelectionEnd = stringValue.value.length;
  }
  dictationInterimLength = 0;
};

const applyDictationChunk = (transcript, isFinal) => {
  if (dictationAnchorStart === null) {
    captureCurrentSelection();
  }
  const res = insertDictationAtCursor({
    text: stringValue.value,
    anchorStart: dictationAnchorStart,
    selectionEnd: dictationSelectionEnd,
    interimLength: dictationInterimLength,
    transcript,
    isFinal,
  });

  dictationAnchorStart = res.anchorStart;
  dictationSelectionEnd = res.anchorStart;
  dictationInterimLength = res.interimLength;

  if (!isFinal) {
    const energy = Math.min(0.95, 0.28 + ((transcript.length % 7) + 1) * 0.08);
    if (liveRms.value <= 0.05) {
      liveRms.value = energy;
    }
    emit('voice-partial', transcript);
  } else {
    emit('voice-final', transcript);
  }

  emit('update:modelValue', res.text);
  emit('input', res.text);
  if (isFinal) {
    emit('change', res.text);
  }
  syncCaretSelection(res.caret);
};

const createWebSpeechFallbackAdapter = () => {
  const win = globalThis.window;
  const SpeechRec = win && (win.SpeechRecognition || win.webkitSpeechRecognition);
  if (!isCallable(SpeechRec)) return null;

  let rec = null;
  return {
    start({ onPartial, onFinal, onError }) {
      rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (ev) => {
        for (let i = ev.resultIndex || 0; i < ev.results.length; i++) {
          const res = ev.results[i];
          const text = res?.[0]?.transcript || '';
          if (res.isFinal) onFinal(text.trim());
          else onPartial(text.trim());
        }
      };
      rec.onerror = (err) => onError(err);
      rec.start();
    },
    stop() {
      if (rec && isCallable(rec.stop)) {
        rec.stop();
        rec = null;
      }
    },
  };
};

const stopVoiceDictation = () => {
  if (activeSession) {
    activeSession.stop();
    activeSession = null;
  }
  const wasRec = isRecording.value;
  isRecording.value = false;
  liveRms.value = 0;
  dictationAnchorStart = null;
  dictationSelectionEnd = null;
  dictationInterimLength = 0;
  if (wasRec) {
    playNanoUiSound('switch-off', {
      propSound: props.sound,
      size: props.size,
      minIntervalMs: 24,
      throttleKey: 'nano-textfield-voice',
    });
    emit('voice-stop');
  }
};

const startVoiceDictation = () => {
  if (props.disabled || props.readonly || isRecording.value) return false;
  const adapter = props.voiceAdapter || createWebSpeechFallbackAdapter();
  if (!adapter) {
    emit('voice-error', new Error('VOICE_ADAPTER_UNAVAILABLE'));
    return false;
  }

  captureCurrentSelection();
  if (controlRef.value && isCallable(controlRef.value.focus)) {
    controlRef.value.focus();
  }

  activeSession = createVoiceAdapterSession(adapter, {
    onPartial: (txt) => applyDictationChunk(txt, false),
    onFinal: (txt) => applyDictationChunk(txt, true),
    onRms: (val) => {
      liveRms.value = Math.max(0, Math.min(1, Number(val) || 0));
    },
    onError: (err) => {
      isRecording.value = false;
      liveRms.value = 0;
      emit('voice-error', err);
    },
  });

  const started = activeSession.start();
  if (started) {
    isRecording.value = true;
    liveRms.value = 0.28;
    playNanoUiSound('switch-on', {
      propSound: props.sound,
      size: props.size,
      minIntervalMs: 24,
      throttleKey: 'nano-textfield-voice',
    });
    emit('voice-start');
  }
  return started;
};

const toggleVoiceDictation = () => {
  if (isRecording.value) {
    stopVoiceDictation();
    return false;
  }
  return startVoiceDictation();
};

const handleInput = (event) => {
  const val = event?.target?.value ?? '';
  if (isRecording.value && is(event?.target?.selectionStart, 'number')) {
    dictationAnchorStart = event.target.selectionStart;
    dictationSelectionEnd = event.target.selectionEnd;
    dictationInterimLength = 0;
  }
  emit('update:modelValue', val);
  emit('input', val);
  nextTick(syncAutoResize);
};

const handleChange = (event) => {
  emit('change', event?.target?.value ?? stringValue.value);
};

const handleCompositionEnd = (event) => {
  if (is(event?.timeStamp, 'number')) {
    lastCompositionEndTs = event.timeStamp;
  }
};

const handleKeydown = (event) => {
  if (!isImeSafeEnterEvent(event, lastCompositionEndTs)) return;
  if (!props.multiline || (props.submitOnEnter && !event.shiftKey)) {
    if (props.multiline && props.submitOnEnter) {
      event.preventDefault();
    }
    emit('enter', stringValue.value, event);
  }
};

const clear = () => {
  if (props.disabled || props.readonly) return;
  playNanoUiSound('ui-tap-soft', {
    propSound: props.sound,
    size: props.size,
    minIntervalMs: 24,
    throttleKey: 'nano-textfield-clear',
  });
  dictationAnchorStart = 0;
  dictationSelectionEnd = 0;
  dictationInterimLength = 0;
  emit('update:modelValue', '');
  emit('input', '');
  emit('change', '');
  emit('clear');
  nextTick(() => {
    syncAutoResize();
    if (controlRef.value && isCallable(controlRef.value.focus)) {
      controlRef.value.focus();
    }
  });
};

const focus = () => {
  if (controlRef.value && isCallable(controlRef.value.focus)) {
    controlRef.value.focus();
  }
};

const blur = () => {
  if (controlRef.value && isCallable(controlRef.value.blur)) {
    controlRef.value.blur();
  }
};

watch(
  () => [props.modelValue, props.multiline, props.autoResize, props.minRows, props.maxRows, props.size],
  () => {
    nextTick(syncAutoResize);
  }
);

onMounted(() => {
  syncAutoResize();
});

onUnmounted(() => {
  stopVoiceDictation();
});

defineExpose({
  focus,
  blur,
  clear,
  startVoiceDictation,
  stopVoiceDictation,
  toggleVoiceDictation,
  syncAutoResize,
  isRecording,
});
</script>

<template>
  <div
    class="nano-textfield"
    :class="[
      `nano-textfield--${size}`,
      `nano-textfield--${status}`,
      {
        'is-multiline': multiline,
        'is-auto-resize': multiline && autoResize,
        'is-focused': isFocused,
        'is-disabled': disabled,
        'is-recording': isRecording,
        'has-actions': showActionRail,
      },
    ]"
  >
    <label
      v-if="label || $slots.label"
      :for="resolvedInputId"
      class="nano-textfield-label"
    >
      <slot name="label">{{ label }}</slot><span v-if="required" class="nano-textfield-required" aria-hidden="true">{{ '\u00A0*' }}</span>
    </label>

    <div class="nano-textfield-shell">
      <textarea
        v-if="multiline"
        :id="resolvedInputId"
        ref="controlRef"
        class="nano-input nano-textfield-control nano-textfield-textarea"
        :class="{
          'nano-input-sm': size === 'sm',
          'nano-input-lg': size === 'lg',
          'nano-input-error': status === 'error',
          'nano-input-success': status === 'success',
        }"
        :style="autoResizeStyle"
        :value="stringValue"
        :rows="autoResize ? minRows : rows"
        :name="name || undefined"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :aria-required="required ? 'true' : undefined"
        :aria-invalid="status === 'error' ? 'true' : undefined"
        :maxlength="maxlength"
        @input="handleInput"
        @change="handleChange"
        @compositionend="handleCompositionEnd"
        @keydown="handleKeydown"
        @focus="(e) => { isFocused = true; emit('focus', e); }"
        @blur="(e) => { isFocused = false; emit('blur', e); }"
      />

      <input
        v-else
        :id="resolvedInputId"
        ref="controlRef"
        :type="type"
        class="nano-input nano-textfield-control nano-textfield-input"
        :class="{
          'nano-input-sm': size === 'sm',
          'nano-input-lg': size === 'lg',
          'nano-input-error': status === 'error',
          'nano-input-success': status === 'success',
        }"
        :value="stringValue"
        :name="name || undefined"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :aria-required="required ? 'true' : undefined"
        :aria-invalid="status === 'error' ? 'true' : undefined"
        :maxlength="maxlength"
        @input="handleInput"
        @change="handleChange"
        @compositionend="handleCompositionEnd"
        @keydown="handleKeydown"
        @focus="(e) => { isFocused = true; emit('focus', e); }"
        @blur="(e) => { isFocused = false; emit('blur', e); }"
      />

      <div v-if="showActionRail" class="nano-textfield-actions">
        <button
          v-if="clearable && hasValue && !disabled && !readonly"
          type="button"
          class="nano-textfield-action-btn nano-textfield-clear-btn"
          aria-label="Clear field"
          v-tooltip="'Clear'"
          data-nano-sound-owner="true"
          @click="clear"
        >
          <NanoIcon name="close" :size="14" />
        </button>

        <div v-if="showVoiceControl" class="nano-textfield-voice-cluster">
          <span
            class="nano-textfield-rms"
            :class="{ 'is-active': isRecording }"
            aria-hidden="true"
          >
            <span class="nano-textfield-led" />
            <span
              v-for="(barScale, idx) in rmsBars"
              :key="idx"
              class="nano-textfield-rms-bar"
              :style="{ transform: `scaleY(${isRecording ? barScale : 0.22})` }"
            />
          </span>

          <button
            type="button"
            class="nano-textfield-action-btn nano-textfield-mic-btn"
            :class="{ 'is-recording': isRecording }"
            :disabled="disabled || readonly"
            :aria-pressed="isRecording ? 'true' : 'false'"
            :aria-label="isRecording ? 'Stop voice dictation' : 'Start voice dictation'"
            v-tooltip="isRecording ? 'Stop voice dictation' : 'Voice dictation (STT)'"
            data-nano-sound-owner="true"
            @click="toggleVoiceDictation"
          >
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="9" y="2" width="6" height="11" rx="3" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nano-textfield {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.nano-textfield-label {
  display: inline-block;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--nano-text-secondary, #cbd5e1);
  cursor: pointer;
  user-select: none;
}

.nano-textfield-required {
  color: var(--nano-accent-danger, #f43f5e);
  font-weight: 700;
}

.nano-textfield-shell {
  position: relative;
  display: flex;
  align-items: stretch;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.nano-textfield-control {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.nano-textfield-textarea {
  resize: vertical;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  line-height: 1.5;
  font-family: inherit;
}

.nano-textfield.is-auto-resize .nano-textfield-textarea {
  field-sizing: content;
  width: 100%;
  max-width: 100%;
}

.nano-textfield.has-actions .nano-textfield-input {
  padding-right: 92px;
}

.nano-textfield.has-actions .nano-textfield-textarea {
  padding-right: 96px;
}

.nano-textfield-actions {
  position: absolute;
  right: 6px;
  top: 6px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  pointer-events: auto;
}

.nano-textfield:not(.is-multiline) .nano-textfield-actions {
  top: 50%;
  transform: translateY(-50%);
}

.nano-textfield-voice-cluster {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
}

.nano-textfield-rms {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--nano-bg-muted, rgba(148, 163, 184, 0.12)) 80%, transparent);
  border: 1px solid transparent;
  opacity: 0.48;
  transition: opacity 0.16s ease, border-color 0.16s ease, background-color 0.16s ease;
  box-sizing: border-box;
}

.nano-textfield-rms.is-active {
  opacity: 1;
  border-color: color-mix(in srgb, var(--nano-accent-danger, #f43f5e) 42%, transparent);
  background: color-mix(in srgb, var(--nano-accent-danger, #f43f5e) 12%, transparent);
}

.nano-textfield-led {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--nano-text-muted, #64748b);
  flex-shrink: 0;
  margin-right: 2px;
}

.nano-textfield-rms.is-active .nano-textfield-led {
  background: var(--nano-accent-danger, #f43f5e);
  box-shadow: 0 0 6px var(--nano-accent-danger, #f43f5e);
  animation: nano-voice-led-pulse 1.1s ease-in-out infinite;
}

.nano-textfield-rms-bar {
  width: 2px;
  height: 11px;
  border-radius: 999px;
  background: currentColor;
  color: var(--nano-text-muted, #94a3b8);
  transform-origin: center center;
  transition: transform 90ms linear, color 140ms ease;
  will-change: transform;
}

.nano-textfield-rms.is-active .nano-textfield-rms-bar {
  color: var(--nano-accent-danger, #f43f5e);
}

.nano-textfield-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border-radius: var(--nano-radius-sm, 6px);
  border: 1px solid var(--nano-border-subtle, rgba(148, 163, 184, 0.22));
  background: var(--nano-bg-card, rgba(15, 23, 42, 0.65));
  color: var(--nano-text-muted, #94a3b8);
  cursor: pointer;
  box-sizing: border-box;
  line-height: 1;
  transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.nano-textfield-action-btn:hover:not(:disabled) {
  color: var(--nano-text-main, #f8fafc);
  border-color: var(--nano-border-hover, rgba(148, 163, 184, 0.45));
  background: var(--nano-bg-hover, rgba(255, 255, 255, 0.08));
}

.nano-textfield-action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.nano-textfield-mic-btn.is-recording {
  color: var(--nano-accent-danger, #f43f5e);
  border-color: color-mix(in srgb, var(--nano-accent-danger, #f43f5e) 55%, transparent);
  background: color-mix(in srgb, var(--nano-accent-danger, #f43f5e) 14%, var(--nano-bg-card, transparent));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--nano-accent-danger, #f43f5e) 18%, transparent);
}

@keyframes nano-voice-led-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

@media (prefers-reduced-motion: reduce) {
  .nano-textfield-rms.is-active .nano-textfield-led {
    animation: none;
  }
  .nano-textfield-rms-bar {
    transition: none;
  }
}
</style>
