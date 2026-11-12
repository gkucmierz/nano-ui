<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  resolveChannelOsdBox,
  resolveChannelOsdMaxDigits,
} from '../utils/channelOsdLayout.js';

const props = defineProps({
  modelValue: {
    type: Number,
    default: 1,
  },
  min: {
    type: Number,
    default: 1,
  },
  max: {
    type: Number,
    default: 99,
  },
  maxDigits: {
    type: Number,
    default: 0,
  },
  timeout: {
    type: Number,
    default: 550,
  },
  size: {
    type: Number,
    default: 140,
  },
  shape: {
    type: String,
    default: 'rect',
    validator: (v) => v === 'rect' || v === 'square',
  },
  stabilizeCapacity: {
    type: Boolean,
    default: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
  listenKeyboard: {
    type: Boolean,
    default: true,
  },
  fixed: {
    type: Boolean,
    default: false,
  },
  theme: {
    type: String,
    default: 'auto',
    validator: (v) => v === 'auto' || v === 'light' || v === 'dark',
  },
});

const emit = defineEmits(['update:modelValue', 'select']);

const osdDisplay = ref(null);
const osdSequence = ref('');
let osdTimer = null;

const effectiveMaxDigits = computed(() =>
  resolveChannelOsdMaxDigits({
    max: props.max,
    maxDigits: props.maxDigits,
  })
);

const osdMetrics = computed(() =>
  resolveChannelOsdBox({
    size: props.size,
    displayText: osdDisplay.value ?? '',
    max: props.max,
    maxDigits: effectiveMaxDigits.value,
    subtitle: props.subtitle,
    shape: props.shape,
    stabilizeCapacity: props.stabilizeCapacity,
  })
);

const themeClass = computed(() =>
  props.theme === 'light'
    ? 'theme-light'
    : props.theme === 'dark'
      ? 'theme-dark'
      : ''
);

const osdStyle = computed(() => {
  const m = osdMetrics.value;
  return {
    width: `${m.widthPx}px`,
    height: `${m.heightPx}px`,
    borderRadius: `${m.borderRadiusPx}px`,
    '--nano-osd-font-size': `${m.fontSizePx}px`,
  };
});

const clearOsdTimer = () => {
  if (osdTimer) {
    clearTimeout(osdTimer);
    osdTimer = null;
  }
};

const scheduleHide = () => {
  clearOsdTimer();
  osdTimer = setTimeout(() => {
    osdSequence.value = '';
    osdDisplay.value = null;
  }, Math.max(150, Number(props.timeout) || 550));
};

const showOsd = (valueOrText) => {
  osdDisplay.value = String(valueOrText);
  scheduleHide();
};

const pushDigit = (digitChar) => {
  const d = String(digitChar).trim();
  if (!/^[0-9]$/.test(d)) return null;

  let nextSeq = osdSequence.value;
  if (nextSeq.length >= effectiveMaxDigits.value) {
    nextSeq = '';
  }

  let candidate = nextSeq + d;
  let parsed = parseInt(candidate, 10);

  // If appending to an existing digit exceeds max (e.g. '1' + '5' = 15 when max is 13),
  // start a fresh sequence with the newly pressed digit so fast switching works seamlessly.
  if (nextSeq.length > 0 && parsed > props.max) {
    candidate = d;
    parsed = parseInt(candidate, 10);
  }

  osdSequence.value = candidate;
  osdDisplay.value = candidate;
  scheduleHide();

  if (!Number.isNaN(parsed) && parsed >= props.min && parsed <= props.max) {
    emit('update:modelValue', parsed);
    emit('select', { value: parsed, digits: candidate });
    return parsed;
  }
  return null;
};

const handleKeyDown = (e) => {
  if (!props.listenKeyboard) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target) {
    if (e.target.isContentEditable) return;
    const tag = e.target.tagName;
    if (tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (tag === 'INPUT') {
      const type = (e.target.type || '').toLowerCase();
      const nonTextTypes = ['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'color', 'file'];
      if (!nonTextTypes.includes(type)) return;
    }
  }

  if (/^[0-9]$/.test(e.key)) {
    pushDigit(e.key);
  }
};

onMounted(() => {
  globalThis.window?.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  clearOsdTimer();
  globalThis.window?.removeEventListener('keydown', handleKeyDown);
});

defineExpose({
  osdDisplay,
  osdSequence,
  osdMetrics,
  effectiveMaxDigits,
  pushDigit,
  showOsd,
  clearOsdTimer,
});
</script>

<template>
  <transition name="nano-osd-fade">
    <div
      v-if="osdDisplay !== null"
      class="nano-channel-osd"
      :class="[
        { 'is-fixed': fixed },
        osdMetrics.shape === 'square' ? 'is-shape-square' : 'is-shape-rect',
        themeClass,
      ]"
      :style="osdStyle"
      role="status"
      aria-live="polite"
    >
      <span class="nano-channel-osd-digits">{{ osdDisplay }}</span>
      <span v-if="subtitle" class="nano-channel-osd-subtitle">{{ subtitle }}</span>
    </div>
  </transition>
</template>

<style scoped>
.nano-channel-osd {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--nano-osd-bg, rgba(10, 14, 24, 0.46));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--nano-osd-border, rgba(255, 255, 255, 0.14));
  color: var(--nano-osd-fg, #ffffff);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 0 12px;
  pointer-events: none;
  z-index: 5000;
  box-shadow: var(--nano-osd-shadow, 0 8px 32px rgba(0, 0, 0, 0.28));
  text-shadow: var(--nano-osd-text-shadow, 0 2px 8px rgba(0, 0, 0, 0.35));
  user-select: none;
}

.nano-channel-osd.theme-light {
  color-scheme: light;
  --nano-osd-bg: rgba(255, 255, 255, 0.88);
  --nano-osd-border: #cbd5e1;
  --nano-osd-fg: #0f172a;
  --nano-osd-subtitle-fg: #475569;
  --nano-osd-shadow: 0 10px 32px rgba(15, 23, 42, 0.12), 0 1px 3px rgba(15, 23, 42, 0.08);
  --nano-osd-text-shadow: none;
}

.nano-channel-osd.theme-dark {
  color-scheme: dark;
  --nano-osd-bg: rgba(10, 14, 24, 0.46);
  --nano-osd-border: rgba(255, 255, 255, 0.14);
  --nano-osd-fg: #ffffff;
  --nano-osd-subtitle-fg: rgba(255, 255, 255, 0.84);
  --nano-osd-shadow: 0 8px 32px rgba(0, 0, 0, 0.28);
  --nano-osd-text-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

.nano-channel-osd.is-fixed {
  position: fixed;
}

.nano-channel-osd-digits {
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: var(--nano-osd-font-size, 84px);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: -0.03em;
  white-space: nowrap;
}

.nano-channel-osd-subtitle {
  margin-top: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--nano-osd-subtitle-fg, rgba(255, 255, 255, 0.84));
  max-width: calc(100% - 8px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nano-osd-fade-enter-active,
.nano-osd-fade-leave-active {
  transition:
    opacity var(--nano-duration-fast, 150ms) ease-out,
    transform var(--nano-duration-fast, 150ms) ease-out;
}

.nano-osd-fade-enter-from,
.nano-osd-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.88);
}
</style>
