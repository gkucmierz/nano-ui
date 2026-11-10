<script setup>
import { ref, computed, watch } from 'vue';
import {
  createDropzoneStateMachine,
  validateDroppedFiles,
  formatDropzoneBytes,
} from '../utils/dropzoneState.js';

const props = defineProps({
  mode: {
    type: String,
    default: 'box', // 'box' | 'overlay'
  },
  accept: {
    type: String,
    default: '',
  },
  multiple: {
    type: Boolean,
    default: false,
  },
  maxSizeBytes: {
    type: Number,
    default: 0,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  clickable: {
    type: Boolean,
    default: undefined,
  },
  title: {
    type: String,
    default: 'Drop file here or click to browse',
  },
  subtitle: {
    type: String,
    default: 'Drag & drop directly from Finder / Explorer or select from disk',
  },
  overlayTitle: {
    type: String,
    default: '',
  },
  overlaySubtitle: {
    type: String,
    default: '',
  },
  badgeText: {
    type: String,
    default: '',
  },
  shortcutHint: {
    type: String,
    default: '',
  },
  accent: {
    type: String,
    default: 'cyan', // 'cyan' | 'indigo' | 'emerald' | 'amber' | 'rose'
  },
  compact: {
    type: Boolean,
    default: false,
  },
  forceDragOver: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['files', 'drop-files', 'reject', 'drag-change']);

const fileInputRef = ref(null);
const machine = createDropzoneStateMachine({ disabled: props.disabled });
const internalDragOver = ref(false);
const lastAcceptedFiles = ref([]);
const lastError = ref('');

watch(
  () => props.disabled,
  (val) => {
    const st = machine.setDisabled(val);
    internalDragOver.value = st.isDragOver;
  }
);

const isDragOver = computed(() => !props.disabled && (internalDragOver.value || props.forceDragOver));

const isBoxClickable = computed(() => {
  if (props.disabled) return false;
  if (props.clickable !== undefined) return Boolean(props.clickable);
  return props.mode === 'box';
});

const resolvedBadgeText = computed(() => {
  if (props.badgeText) return props.badgeText;
  const parts = [];
  if (props.accept) parts.push(props.accept);
  if (props.maxSizeBytes > 0) parts.push(`max ${formatDropzoneBytes(props.maxSizeBytes)}`);
  return parts.join(' · ');
});

const resolvedOverlayTitle = computed(() => props.overlayTitle || props.title);
const resolvedOverlaySubtitle = computed(
  () => props.overlaySubtitle || resolvedBadgeText.value || props.subtitle
);

function syncState(st) {
  const prev = internalDragOver.value;
  internalDragOver.value = st.isDragOver;
  if (prev !== st.isDragOver) {
    emit('drag-change', st.isDragOver);
  }
}

function handleDragEnter(e) {
  e.preventDefault();
  syncState(machine.onDragEnter(e));
}

function handleDragOver(e) {
  e.preventDefault();
  syncState(machine.onDragOver(e));
}

function handleDragLeave(e) {
  e.preventDefault();
  syncState(machine.onDragLeave(e));
}

function processIncomingFiles(rawFileList, event) {
  lastError.value = '';
  const { accepted, rejected } = validateDroppedFiles(rawFileList, {
    accept: props.accept,
    maxSizeBytes: props.maxSizeBytes,
    multiple: props.multiple,
  });

  if (rejected.length > 0) {
    lastError.value = rejected[0].message;
    emit('reject', rejected);
  }

  if (accepted.length > 0) {
    lastAcceptedFiles.value = accepted;
    const payload = { accepted, rejected, event };
    emit('files', accepted, payload);
    emit('drop-files', accepted, payload);
  }
}

function handleDrop(e) {
  e.preventDefault();
  syncState(machine.onDrop(e));
  if (props.disabled) return;
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    processIncomingFiles(files, e);
  }
}

function handleFileInputChange(e) {
  if (props.disabled) return;
  const files = e.target?.files;
  if (files && files.length > 0) {
    processIncomingFiles(files, e);
  }
  if (e.target) {
    e.target.value = '';
  }
}

function openFileDialog() {
  if (props.disabled) return;
  fileInputRef.value?.click?.();
}

function handleRootClick() {
  if (isBoxClickable.value) {
    openFileDialog();
  }
}

function handleRootKeydown(e) {
  if (!isBoxClickable.value) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    openFileDialog();
  }
}

function reset() {
  syncState(machine.reset());
  lastAcceptedFiles.value = [];
  lastError.value = '';
}

defineExpose({
  openFileDialog,
  reset,
  isDragOver,
  lastAcceptedFiles,
  lastError,
});
</script>

<template>
  <div
    class="nano-dropzone"
    :class="[
      `nano-dropzone--${mode}`,
      `nano-dropzone--accent-${accent}`,
      {
        'is-drag-over': isDragOver,
        'is-disabled': disabled,
        'is-clickable': isBoxClickable,
        'is-compact': compact,
      },
    ]"
    :role="isBoxClickable ? 'button' : undefined"
    :tabindex="isBoxClickable ? 0 : undefined"
    :aria-disabled="disabled ? 'true' : undefined"
    @dragenter="handleDragEnter"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @click="handleRootClick"
    @keydown="handleRootKeydown"
  >
    <input
      id="nano-dropzone-file-input"
      ref="fileInputRef"
      name="nano-dropzone-file"
      type="file"
      class="nano-dropzone__input"
      :accept="accept || undefined"
      :multiple="multiple"
      :disabled="disabled"
      tabindex="-1"
      aria-hidden="true"
      @change="handleFileInputChange"
    />

    <!-- MODE 1: Standalone Upload Box (like drop-box & tools-app) -->
    <template v-if="mode === 'box'">
      <slot
        :is-drag-over="isDragOver"
        :open-file-dialog="openFileDialog"
        :last-accepted-files="lastAcceptedFiles"
        :last-error="lastError"
      >
        <div class="nano-dropzone__icon-wrap" aria-hidden="true">
          <svg
            class="nano-dropzone__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <div class="nano-dropzone__copy">
          <h3 class="nano-dropzone__title">{{ title }}</h3>
          <p v-if="subtitle" class="nano-dropzone__subtitle">{{ subtitle }}</p>

          <div v-if="resolvedBadgeText || shortcutHint" class="nano-dropzone__meta">
            <span v-if="resolvedBadgeText" class="nano-dropzone__badge">
              {{ resolvedBadgeText }}
            </span>
            <span v-if="shortcutHint" class="nano-dropzone__shortcut">
              <kbd>{{ shortcutHint }}</kbd>
            </span>
          </div>

          <div v-if="lastAcceptedFiles.length" class="nano-dropzone__selected-pill">
            ✓ {{ lastAcceptedFiles[0].name }}
            <small>({{ formatDropzoneBytes(lastAcceptedFiles[0].size) }})</small>
            <span v-if="lastAcceptedFiles.length > 1">
              +{{ lastAcceptedFiles.length - 1 }}
            </span>
          </div>

          <div v-if="lastError" class="nano-dropzone__error" role="alert">
            ⚠️ {{ lastError }}
          </div>
        </div>
      </slot>
    </template>

    <!-- MODE 2: Container Overlay Wrapper (like /dev/video-lab & QrCode studio) -->
    <template v-else>
      <slot
        :is-drag-over="isDragOver"
        :open-file-dialog="openFileDialog"
        :last-accepted-files="lastAcceptedFiles"
        :last-error="lastError"
      />

      <transition name="nano-dropzone-fade">
        <div
          v-if="isDragOver"
          class="nano-dropzone__overlay"
          aria-live="polite"
        >
          <div class="nano-dropzone__overlay-card">
            <slot name="overlay" :is-drag-over="isDragOver">
              <div class="nano-dropzone__icon-wrap is-bouncing" aria-hidden="true">
                <svg
                  class="nano-dropzone__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div class="nano-dropzone__overlay-title">{{ resolvedOverlayTitle }}</div>
              <div v-if="resolvedOverlaySubtitle" class="nano-dropzone__overlay-subtitle">
                {{ resolvedOverlaySubtitle }}
              </div>
            </slot>
          </div>
        </div>
      </transition>
    </template>
  </div>
</template>

<style scoped>
.nano-dropzone {
  --dz-accent: #38bdf8;
  --dz-accent-rgb: 56, 189, 248;
  position: relative;
  box-sizing: border-box;
}

.nano-dropzone--accent-cyan {
  --dz-accent: #38bdf8;
  --dz-accent-rgb: 56, 189, 248;
}

.nano-dropzone--accent-indigo {
  --dz-accent: #6366f1;
  --dz-accent-rgb: 99, 102, 241;
}

.nano-dropzone--accent-emerald {
  --dz-accent: #10b981;
  --dz-accent-rgb: 16, 185, 129;
}

.nano-dropzone--accent-amber {
  --dz-accent: #f59e0b;
  --dz-accent-rgb: 245, 158, 11;
}

.nano-dropzone--accent-rose {
  --dz-accent: #f43f5e;
  --dz-accent-rgb: 244, 63, 94;
}

.nano-dropzone__input {
  display: none;
}

/* Standalone Box Mode */
.nano-dropzone--box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 36px 24px;
  border: 2px dashed var(--nano-border-card, rgba(148, 163, 184, 0.35));
  border-radius: var(--nano-radius-lg, 14px);
  background: var(--nano-bg-card, rgba(15, 23, 42, 0.55));
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  text-align: center;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
  user-select: none;
}

.nano-dropzone--box.is-compact {
  flex-direction: row;
  justify-content: flex-start;
  text-align: left;
  padding: 14px 18px;
  gap: 14px;
}

.nano-dropzone.is-clickable {
  cursor: pointer;
}

.nano-dropzone.is-disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.nano-dropzone--box:hover:not(.is-disabled),
.nano-dropzone--box.is-drag-over {
  border-color: var(--dz-accent);
  background: rgba(var(--dz-accent-rgb), 0.1);
  box-shadow:
    0 0 0 1px rgba(var(--dz-accent-rgb), 0.25),
    0 0 28px rgba(var(--dz-accent-rgb), 0.22);
}

.nano-dropzone__icon-wrap {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--dz-accent-rgb), 0.14);
  border: 1px solid rgba(var(--dz-accent-rgb), 0.38);
  color: var(--dz-accent);
  flex-shrink: 0;
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.nano-dropzone--box.is-compact .nano-dropzone__icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
}

.nano-dropzone--box:hover:not(.is-disabled) .nano-dropzone__icon-wrap,
.nano-dropzone.is-drag-over .nano-dropzone__icon-wrap,
.nano-dropzone__icon-wrap.is-bouncing {
  animation: nano-dz-bounce 1s ease-in-out infinite;
  background: rgba(var(--dz-accent-rgb), 0.22);
}

.nano-dropzone__icon {
  width: 26px;
  height: 26px;
}

.nano-dropzone--box.is-compact .nano-dropzone__icon {
  width: 20px;
  height: 20px;
}

.nano-dropzone__copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.nano-dropzone--box.is-compact .nano-dropzone__copy {
  align-items: flex-start;
  gap: 3px;
}

.nano-dropzone__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--nano-text-main, #f8fafc);
}

.nano-dropzone--box.is-compact .nano-dropzone__title {
  font-size: 0.92rem;
}

.nano-dropzone__subtitle {
  margin: 0;
  font-size: 0.84rem;
  color: var(--nano-text-muted, #94a3b8);
  max-width: 460px;
}

.nano-dropzone__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
}

.nano-dropzone__badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--dz-accent);
  background: rgba(var(--dz-accent-rgb), 0.14);
  border: 1px solid rgba(var(--dz-accent-rgb), 0.35);
}

.nano-dropzone__shortcut kbd {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.74rem;
  padding: 2px 7px;
  border-radius: 5px;
  background: rgba(148, 163, 184, 0.16);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: var(--nano-text-main, #f8fafc);
}

.nano-dropzone__selected-pill {
  margin-top: 6px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #10b981;
  background: rgba(16, 185, 129, 0.14);
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.nano-dropzone__error {
  margin-top: 6px;
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #f43f5e;
  background: rgba(244, 63, 94, 0.14);
  border: 1px solid rgba(244, 63, 94, 0.4);
}

/* Container Overlay Wrapper Mode */
.nano-dropzone--overlay {
  position: relative;
}

.nano-dropzone__overlay {
  position: absolute;
  inset: 0;
  z-index: 60;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  border-radius: inherit;
  border: 2px dashed var(--dz-accent);
  background: color-mix(in srgb, var(--nano-bg-surface, #0f172a) 78%, transparent);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  box-shadow: inset 0 0 36px rgba(var(--dz-accent-rgb), 0.24);
}

.nano-dropzone__overlay-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px 32px;
  border-radius: 16px;
  background: var(--nano-bg-surface, #0f172a);
  border: 1px solid rgba(var(--dz-accent-rgb), 0.55);
  box-shadow:
    0 18px 40px rgba(15, 23, 42, 0.22),
    0 0 28px rgba(var(--dz-accent-rgb), 0.28);
  text-align: center;
  max-width: 440px;
}

.nano-dropzone__overlay-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--nano-text-main, #f8fafc);
}

.nano-dropzone__overlay-subtitle {
  font-size: 0.82rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--dz-accent);
}

.nano-dropzone-fade-enter-active,
.nano-dropzone-fade-leave-active {
  transition: opacity 0.16s ease;
}

.nano-dropzone-fade-enter-from,
.nano-dropzone-fade-leave-to {
  opacity: 0;
}

@keyframes nano-dz-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}
</style>
