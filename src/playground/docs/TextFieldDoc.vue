<script setup>
import { ref, onUnmounted } from 'vue';
import NanoTextField from '../../components/NanoTextField.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoSelect from '../../components/NanoSelect.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { createDocTabs } from '../docSnippets.js';

const singleValue = ref('https://algorithms.7u.pl');
const requiredTitle = ref('');
const notesValue = ref(
  'Place the cursor anywhere inside this note and toggle the microphone to stream simulated speech-to-text partials right at selectionStart.'
);

const autoResizeEnabled = ref(true);
const voiceEnabled = ref(true);
const clearableEnabled = ref(true);
const fieldSize = ref('md');
const validationStatus = ref('');

const sizeOptions = [
  { value: 'sm', label: 'Small (sm)' },
  { value: 'md', label: 'Medium (md)' },
  { value: 'lg', label: 'Large (lg)' },
];

const statusOptions = [
  { value: '', label: 'Neutral (default)' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
];

let dictationInterval = null;

function stopDemoStream() {
  if (dictationInterval) {
    clearInterval(dictationInterval);
    dictationInterval = null;
  }
}

const demoPhrases = [
  [' [listening…', ' [deterministic', ' [deterministic cursor', 'deterministic cursor dictation] '],
  [' [capturing', ' [capturing voice', 'voice memo verified] '],
];
let phraseCursor = 0;

const simulatedVoiceAdapter = {
  start(callbacks) {
    stopDemoStream();
    const steps = demoPhrases[phraseCursor % demoPhrases.length];
    phraseCursor += 1;
    let idx = 0;

    dictationInterval = setInterval(() => {
      const rms = 0.28 + 0.55 * Math.abs(Math.sin((idx + 1) * 1.3));
      callbacks.onRms?.(rms);
      if (idx < steps.length - 1) {
        callbacks.onPartial?.(steps[idx]);
        idx += 1;
      } else {
        callbacks.onFinal?.(steps[steps.length - 1]);
        callbacks.onRms?.(0);
        stopDemoStream();
        callbacks.onStateChange?.(false);
      }
    }, 360);
  },
  stop() {
    stopDemoStream();
  },
};

onUnmounted(() => {
  stopDemoStream();
});

const codeTabs = createDocTabs({
  componentName: 'NanoTextField',
  stateRef: 'noteText',
  initialValue: "''",
  templateAttrs: [
    'v-model="noteText"',
    'label="Engineering Summary"',
    ':multiline="true"',
    ':required="true"',
    ':auto-resize="true"',
    ':min-rows="3"',
    ':max-rows="8"',
    ':clearable="true"',
    ':voice-enabled="true"',
    ':voice-adapter="voiceAdapter"',
  ],
  apiSections: [
    {
      title: 'Props',
      items: [
        'modelValue: String (default: "") - Bound input or textarea string value (v-model)',
        'multiline: Boolean (default: false) - Render locked-width <textarea> (resize: vertical; width: 100%; max-width: 100%; box-sizing: border-box)',
        'rows / minRows / maxRows: Number (default: 3 / 2 / 8) - Row height bounds when multiline is enabled',
        'autoResize: Boolean (default: false) - Progressive CSS field-sizing: content + deterministic scrollHeight clamping between [minRows, maxRows]',
        'label: String (default: "") - Semantic clickable <label> text',
        'required: Boolean (default: false) - Appends non-breaking asterisk (\\u00A0*) so * never wraps onto an orphan line',
        'clearable: Boolean (default: false) - Stationary clear button inside suffix cluster (CLS = 0)',
        'voiceEnabled / voiceDictation: Boolean (default: false) - Render stationary mic toggle + 3-bar RMS meter + recording LED',
        'voiceAdapter: { start(callbacks), stop() } - Pluggable STT engine (Web Speech API, Whisper Worker, or custom stream) inserting at selectionStart..selectionEnd',
        'size: "sm" | "md" | "lg" (default: "md") - Uniform height & acoustic mass profile',
        'status: "" | "success" | "warning" | "error" - Semantic border & focus ring state',
      ],
    },
    {
      title: 'Events',
      items: [
        '@update:modelValue: (val: string) => void - Emitted on typing, clear, or voice dictation insertion',
        '@enter: (event: KeyboardEvent) => void - IME-safe Enter handler (suppressed during CJK isComposing / keyCode 229)',
        '@clear: () => void - Emitted when clear button resets value',
        '@voice-start / @voice-stop / @voice-partial / @voice-final / @voice-error - Lifecycle events from voiceAdapter',
      ],
    },
  ],
});
</script>

<template>
  <div class="doc-page">
    <h2>NanoTextField &amp; Voice Dictation</h2>
    <p class="lead-text">
      Unified single-line <code>&lt;input&gt;</code> and locked-width multiline <code>&lt;textarea&gt;</code> control with
      non-breaking required labels (<code>\u00A0*</code>), progressive <code>autoResize</code>, IME-safe Enter submission,
      and stationary cursor-aware voice dictation (<code>CLS = 0</code>).
    </p>

    <div class="demo-section">
      <h3>1. Interactive Single-Line &amp; Multiline Voice Dictation Sandbox</h3>
      <div class="controls-row">
        <label class="toggle-item">
          <NanoSwitch v-model="autoResizeEnabled" size="sm" />
          <span><code>autoResize</code> (multiline)</span>
        </label>
        <label class="toggle-item">
          <NanoSwitch v-model="voiceEnabled" size="sm" />
          <span><code>voiceEnabled</code></span>
        </label>
        <label class="toggle-item">
          <NanoSwitch v-model="clearableEnabled" size="sm" />
          <span><code>clearable</code></span>
        </label>
        <div class="select-cell">
          <NanoSelect v-model="fieldSize" :options="sizeOptions" size="sm" />
        </div>
        <div class="select-cell">
          <NanoSelect v-model="validationStatus" :options="statusOptions" size="sm" />
        </div>
      </div>

      <form class="fields-grid" novalidate @submit.prevent>
        <NanoTextField
          v-model="singleValue"
          label="Canonical Portal URL"
          placeholder="https://..."
          :size="fieldSize"
          :status="validationStatus"
          :clearable="clearableEnabled"
          :voice-enabled="voiceEnabled"
          :voice-adapter="simulatedVoiceAdapter"
        />

        <NanoTextField
          v-model="requiredTitle"
          label="Release Commit Title with Non-Breaking Required Asterisk"
          placeholder="feat(nano-ui): add voice dictation field"
          :required="true"
          :size="fieldSize"
          :status="validationStatus"
          :clearable="clearableEnabled"
        />

        <div class="full-span">
          <NanoTextField
            v-model="notesValue"
            label="Multiline Architecture Notes (Cursor-Aware STT Stream)"
            placeholder="Type or click the microphone button to stream partials at cursor..."
            :multiline="true"
            :auto-resize="autoResizeEnabled"
            :min-rows="3"
            :max-rows="8"
            :required="true"
            :size="fieldSize"
            :status="validationStatus"
            :clearable="clearableEnabled"
            :voice-enabled="voiceEnabled"
            :voice-adapter="simulatedVoiceAdapter"
            helper-text="Horizontal width is strictly locked (resize: vertical; width: 100%; max-width: 100%; box-sizing: border-box;) and the RMS meter occupies a fixed footprint (CLS = 0)."
          />
        </div>
      </form>
    </div>

    <NanoCodeBlock :tabs="codeTabs" />
  </div>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

h2 {
  margin: 0;
  color: var(--nano-text-main);
}

.lead-text {
  margin: 0;
  color: var(--nano-text-muted);
  line-height: 1.55;
}

.demo-section {
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-card);
  border-radius: 10px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.demo-section h3 {
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--nano-border-subtle);
  color: var(--nano-text-main);
}

.controls-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}

.toggle-item {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  font-size: 0.86rem;
  color: var(--nano-text-main);
}

.select-cell {
  min-width: 168px;
}

.fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.15rem;
  align-items: end;
}

.full-span {
  grid-column: 1 / -1;
}
</style>
