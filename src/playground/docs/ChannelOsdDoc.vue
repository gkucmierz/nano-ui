<script setup>
import { ref } from 'vue';
import NanoChannelOsd from '../../components/NanoChannelOsd.vue';
import NanoSlider from '../../components/NanoSlider.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { createDocTabs } from '../docSnippets.js';

const osdRef = ref(null);
const activeChannel = ref(12);
const maxChannel = ref(13);
const hudSize = ref(140);
const timeoutMs = ref(550);

const triggerDigit = (d) => {
  if (osdRef.value) {
    osdRef.value.pushDigit(String(d));
  }
};

const codeTabs = createDocTabs({
  componentName: 'NanoChannelOsd',
  stateRef: 'activeChannel',
  initialValue: '1',
  templateAttrs: [
    'v-model="activeChannel"',
    ':min="1"',
    ':max="13"',
    ':timeout="550"',
    ':size="140"',
  ],
  apiSections: [
    {
      title: 'Props',
      items: [
        'modelValue: Number (default: 1) - Currently selected 1-based channel number',
        'min: Number (default: 1) - Minimum valid channel number',
        'max: Number (default: 99) - Maximum valid channel number (e.g. 13 for 13 scenes)',
        'maxDigits: Number (default: 2) - Maximum digits buffered per sequence',
        'timeout: Number (default: 550) - Auto-dismiss & sequence reset timeout in milliseconds',
        'size: Number (default: 140) - Square HUD width and height in pixels',
        'listenKeyboard: Boolean (default: true) - Listen for global 0-9 keydown events',
      ],
    },
    {
      title: 'Events',
      items: [
        '@update:modelValue: (channel: number) => void - Emitted when a valid channel is parsed',
        '@select: ({ value: number, digits: string }) => void - Emitted with parsed value and raw digit string',
      ],
    },
    {
      title: 'Exposed Methods & State (via template ref)',
      items: [
        'pushDigit(digitChar): number | null - Programmatically push a digit 0-9 into the sequence buffer',
        'showOsd(valueOrText): void - Display custom HUD value and reset auto-hide timer',
        'osdDisplay / osdSequence: Ref<string | null>',
      ],
    },
  ],
});
</script>

<template>
  <div class="doc-page">
    <div class="header-section">
      <h2>NanoChannelOsd</h2>
      <p class="desc">
        TV-style multi-digit glassmorphic HUD overlay (inspired by geo-words.7u.pl). Listens for 0–9 digit sequences (e.g. typing <code>1</code> then <code>2</code> selects channel <code>12</code>) and renders a centered translucent badge that auto-dismisses after a configurable timeout.
      </p>
    </div>

    <div class="demo-section">
      <div class="osd-stage-card">
        <div class="osd-stage-hint">
          <div class="active-channel-pill">
            Active Channel: <strong>#{{ String(activeChannel).padStart(2, '0') }}</strong>
          </div>
          <p>Press digits <kbd>0</kbd>–<kbd>9</kbd> on your keyboard (e.g. <kbd>1</kbd> + <kbd>2</kbd> for <strong>12</strong>) or click the keypad below:</p>
          <div class="keypad-row">
            <button
              v-for="d in [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]"
              :key="d"
              type="button"
              class="keypad-btn"
              @click="triggerDigit(d)"
            >
              {{ d }}
            </button>
          </div>
        </div>

        <NanoChannelOsd
          ref="osdRef"
          v-model="activeChannel"
          :min="1"
          :max="maxChannel"
          :timeout="timeoutMs"
          :size="hudSize"
        />
      </div>

      <div class="osd-controls-card">
        <h3 class="controls-title">Playground Controls</h3>
        <div class="controls-grid">
          <div class="control-item">
            <div class="control-label">
              <span>Max Channel</span>
              <span class="control-value">{{ maxChannel }}</span>
            </div>
            <NanoSlider v-model="maxChannel" :min="9" :max="99" :step="1" size="sm" aria-label="Max Channel" />
          </div>

          <div class="control-item">
            <div class="control-label">
              <span>HUD Size (px)</span>
              <span class="control-value">{{ hudSize }}px</span>
            </div>
            <NanoSlider v-model="hudSize" :min="96" :max="200" :step="4" size="sm" aria-label="HUD Size" />
          </div>

          <div class="control-item">
            <div class="control-label">
              <span>Fade Timeout</span>
              <span class="control-value">{{ timeoutMs }}ms</span>
            </div>
            <NanoSlider v-model="timeoutMs" :min="250" :max="1500" :step="50" size="sm" aria-label="Fade Timeout" />
          </div>
        </div>
      </div>
    </div>

    <NanoCodeBlock :tabs="codeTabs" />
  </div>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: var(--nano-space-lg, 24px);
  max-width: 900px;
}

.header-section h2 {
  margin: 0 0 var(--nano-space-xs, 4px) 0;
  color: var(--nano-text-main);
  font-size: 1.5rem;
  font-weight: 700;
}

.desc {
  color: var(--nano-text-muted);
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
}

.demo-section {
  display: flex;
  flex-direction: column;
  gap: var(--nano-space-md, 16px);
}

.osd-stage-card {
  position: relative;
  min-height: 280px;
  border-radius: var(--nano-radius-lg, 12px);
  border: 1px solid var(--nano-border-card);
  background: radial-gradient(circle at 50% 40%, rgba(56, 189, 248, 0.14), rgba(15, 23, 42, 0.9));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: hidden;
}

.osd-stage-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  color: var(--nano-text-muted);
  font-size: 0.9rem;
}

.active-channel-pill {
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.35);
  color: var(--nano-text-main);
  font-size: 0.85rem;
}

.keypad-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 4px;
}

.keypad-btn {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-card);
  color: var(--nano-text-main);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
}

.osd-controls-card {
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-card);
  border-radius: var(--nano-radius-lg, 12px);
  padding: 24px;
}

.controls-title {
  margin: 0 0 16px 0;
  font-size: 1rem;
  font-weight: 600;
}

.controls-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.control-item {
  flex: 1 1 180px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.control-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--nano-text-muted);
}

.control-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 600;
  color: var(--nano-text-main);
}
</style>
