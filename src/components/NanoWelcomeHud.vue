<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  storageKey: {
    type: String,
    default: 'nano_ui_welcome_hud_visited',
  },
  onlyFirstVisit: {
    type: Boolean,
    default: true,
  },
  forceShow: {
    type: Boolean,
    default: false,
  },
  autoDismiss: {
    type: Boolean,
    default: false,
  },
  duration: {
    type: Number,
    default: 0,
  },
  icon: {
    type: String,
    default: '💓',
  },
  title: {
    type: String,
    default: 'Włącz dźwięk',
  },
  subtitle: {
    type: String,
    default: 'Kliknij tutaj lub naciśnij [M], aby odblokować syntezę WebAudio',
  },
  shortcutKey: {
    type: String,
    default: 'M',
  },
  fixed: {
    type: Boolean,
    default: false,
  },
  width: {
    type: Number,
    default: 320,
  },
});

const emit = defineEmits(['activate', 'dismiss', 'shown']);

const isVisible = ref(false);
let hideTimer = null;

const hudStyle = computed(() => {
  const w = Math.max(220, Number(props.width) || 320);
  return {
    width: `${w}px`,
    maxWidth: 'calc(100vw - 32px)',
  };
});

function hasVisitedBefore() {
  if (!props.onlyFirstVisit || props.forceShow) return false;
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    return window.localStorage.getItem(props.storageKey) === '1';
  } catch {
    return false;
  }
}

function markVisited() {
  if (typeof window === 'undefined' || !window.localStorage || !props.storageKey) return;
  try {
    window.localStorage.setItem(props.storageKey, '1');
  } catch {}
}

function clearHideTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function scheduleAutoDismiss() {
  clearHideTimer();
  const ms = Number(props.duration) || 0;
  if (!props.autoDismiss || ms <= 0) return;
  hideTimer = setTimeout(() => {
    dismissHud('timeout');
  }, Math.max(800, ms));
}

function showHud() {
  isVisible.value = true;
  emit('shown');
  scheduleAutoDismiss();
}

function dismissHud(reason = 'manual') {
  clearHideTimer();
  if (!isVisible.value) return;
  isVisible.value = false;
  markVisited();
  emit('dismiss', { reason });
}

function handleActivate(event) {
  clearHideTimer();
  markVisited();
  emit('activate', event);
  isVisible.value = false;
}

watch(
  () => props.forceShow,
  (val) => {
    if (val) {
      showHud();
    }
  }
);

function onGlobalKeyDown(e) {
  if (!isVisible.value || !props.shortcutKey) return;
  const tag = e?.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e?.target?.isContentEditable) {
    return;
  }
  if (String(e.key || '').toLowerCase() === String(props.shortcutKey).toLowerCase()) {
    handleActivate(e);
  }
}

onMounted(() => {
  if (!hasVisitedBefore()) {
    showHud();
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onGlobalKeyDown);
  }
});

onUnmounted(() => {
  clearHideTimer();
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onGlobalKeyDown);
  }
});

defineExpose({
  isVisible,
  showHud,
  dismissHud,
  handleActivate,
  hasVisitedBefore,
});
</script>

<template>
  <transition name="nano-welcome-hud-dissolve">
    <button
      v-if="isVisible"
      type="button"
      class="nano-welcome-hud"
      :class="{ 'is-fixed': fixed }"
      :style="hudStyle"
      role="status"
      aria-live="polite"
      @click="handleActivate"
    >
      <span class="nano-welcome-hud-icon" aria-hidden="true">{{ icon }}</span>
      <span class="nano-welcome-hud-title">{{ title }}</span>
      <span v-if="subtitle" class="nano-welcome-hud-subtitle">{{ subtitle }}</span>
      <span v-if="shortcutKey" class="nano-welcome-hud-kbd-row">
        <kbd class="nano-welcome-hud-kbd">{{ shortcutKey }}</kbd>
      </span>
    </button>
  </transition>
</template>

<style scoped>
.nano-welcome-hud {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(1);
  padding: 24px 26px 20px;
  border-radius: 24px;
  background: rgba(10, 14, 24, 0.56);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(251, 113, 133, 0.38);
  color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  z-index: 5000;
  box-shadow:
    0 16px 48px rgba(0, 0, 0, 0.42),
    0 0 32px rgba(225, 29, 72, 0.18);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.38);
  user-select: none;
  box-sizing: border-box;
  text-align: center;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.nano-welcome-hud:hover {
  border-color: rgba(56, 189, 248, 0.65);
  background: rgba(13, 20, 36, 0.68);
  box-shadow:
    0 18px 52px rgba(0, 0, 0, 0.48),
    0 0 36px rgba(56, 189, 248, 0.25);
}

.nano-welcome-hud.is-fixed {
  position: fixed;
}

.nano-welcome-hud-icon {
  font-size: 46px;
  line-height: 1;
  filter: drop-shadow(0 4px 12px rgba(251, 113, 133, 0.45));
  animation: nano-hud-pulse 1.15s ease-in-out infinite;
}

.nano-welcome-hud-title {
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 1.28rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #f8fafc;
}

.nano-welcome-hud-subtitle {
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.45;
  color: rgba(226, 232, 240, 0.88);
  max-width: 96%;
}

.nano-welcome-hud-kbd-row {
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.nano-welcome-hud-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 22px;
  padding: 0 7px;
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.72rem;
  font-weight: 800;
  background: rgba(56, 189, 248, 0.18);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.45);
}

@keyframes nano-hud-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  22% {
    transform: scale(1.14);
  }
  40% {
    transform: scale(0.98);
  }
  58% {
    transform: scale(1.08);
  }
}

.nano-welcome-hud-dissolve-enter-active {
  transition:
    opacity 0.36s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.36s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.36s cubic-bezier(0.22, 1, 0.36, 1);
}

.nano-welcome-hud-dissolve-leave-active {
  transition:
    opacity 0.68s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.68s cubic-bezier(0.4, 0, 0.2, 1),
    filter 0.68s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.nano-welcome-hud-dissolve-enter-from {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.88);
  filter: blur(10px);
}

.nano-welcome-hud-dissolve-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(1.18);
  filter: blur(16px);
}
</style>
