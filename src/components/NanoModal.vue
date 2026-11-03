<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick, computed, useSlots, getCurrentInstance } from 'vue';
import NanoIcon from './NanoIcon.vue';
import vRipple from '../directives/ripple.js';

const isMounted = ref(false);
const slots = useSlots();
const instance = getCurrentInstance();

onMounted(() => {
  isMounted.value = true;
});

const props = defineProps({
  visible: { type: Boolean, default: undefined },
  modelValue: { type: Boolean, default: undefined },
  show: { type: Boolean, default: undefined },
  title: { type: String, default: '' },
  width: { type: [String, Number], default: 600 },
  height: { type: [String, Number], default: 'auto' },

  showHeader: { type: Boolean, default: true },
  showBody: { type: Boolean, default: true },
  showFooter: { type: Boolean, default: undefined },

  showOk: { type: Boolean, default: true },
  showCancel: { type: Boolean, default: true },
  okText: { type: String, default: 'OK' },
  cancelText: { type: String, default: 'Cancel' },
  okVariant: { type: String, default: 'primary' },

  closeOnBackdrop: { type: Boolean, default: true },
  glassmorphism: { type: Boolean, default: false },

  draggable: { type: Boolean, default: false },
  resizable: { type: Boolean, default: false },
  storageKey: { type: String, default: '' },

  minWidth: { type: Number, default: 300 },
  minHeight: { type: Number, default: 200 }
});

const emit = defineEmits(['close', 'ok', 'cancel', 'update:modelValue', 'update:visible', 'update:show']);

const isVisible = computed(() => {
  if (props.modelValue !== undefined) return props.modelValue;
  if (props.visible !== undefined) return props.visible;
  if (props.show !== undefined) return props.show;
  return false;
});

const computedShowFooter = computed(() => {
  if (props.showFooter !== undefined) return props.showFooter;
  const vnodeProps = instance?.vnode?.props || {};
  return Boolean(slots.footer || vnodeProps.onOk);
});

const modalOverlay = ref(null);
const modalWindow = ref(null);

// State
const posX = ref(null);
const posY = ref(null);
const curWidth = ref(null);
const curHeight = ref(null);
const isMaximized = ref(false);
const restoreSnapshot = ref(null);

const isDragging = ref(false);
const isResizing = ref(false);

const parentComponentName =
  instance?.parent?.type?.__name ||
  instance?.parent?.type?.name ||
  'app';

const initialTitleSlug = String(props.title || '')
  .split(/\s+[—–-]\s+|\s*\(/)[0]
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const effectiveStorageKey = computed(() => {
  if (props.storageKey) return props.storageKey;
  if (!props.draggable && !props.resizable) return '';
  const slug = initialTitleSlug || 'modal';
  return `nano_modal_geom_${parentComponentName}_${props.width}x${props.height}_${slug}`;
});

const preFullscreenStorageKey = computed(() =>
  effectiveStorageKey.value ? `${effectiveStorageKey.value}__pre_fullscreen` : ''
);

let dragStartX = 0;
let dragStartY = 0;
let initialPosX = 0;
let initialPosY = 0;

let resizeStartX = 0;
let resizeStartY = 0;
let initialWidth = 0;
let initialHeight = 0;

const computedWindowStyle = computed(() => {
  if (isMaximized.value) {
    return {
      position: 'fixed',
      left: '0px',
      top: '0px',
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw',
      maxHeight: '100vh',
      borderRadius: '0px',
      transform: 'none',
      margin: '0'
    };
  }

  const styles = {};

  // Apply explicit width/height if resizing or passed as Number
  if (curWidth.value !== null) {
    styles.width = `${curWidth.value}px`;
    styles.maxWidth = 'none';
  } else {
    styles.maxWidth = typeof props.width === 'number' ? `${props.width}px` : props.width;
    styles.width = '100%';
  }

  if (curHeight.value !== null) {
    styles.height = `${curHeight.value}px`;
    styles.maxHeight = 'none';
  } else if (props.height !== 'auto') {
    styles.height = typeof props.height === 'number' ? `${props.height}px` : props.height;
  }

  // Apply position if dragging
  if (posX.value !== null && posY.value !== null) {
    styles.position = 'absolute';
    styles.left = `${posX.value}px`;
    styles.top = `${posY.value}px`;
    styles.transform = 'none'; // Disable centered transform when absolute
    styles.margin = '0';
  }

  return styles;
});

// Dragging Logic
const startDrag = (e) => {
  if (!props.draggable || isMaximized.value) return;

  // Don't drag if clicking buttons inside header
  if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

  isDragging.value = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;

  // If not dragged yet, get exact current position
  if (posX.value === null) {
    const rect = modalWindow.value.getBoundingClientRect();
    posX.value = rect.left;
    posY.value = rect.top;

    // Also lock dimensions so it doesn't jump
    if (curWidth.value === null) curWidth.value = rect.width;
    if (curHeight.value === null) curHeight.value = rect.height;
  }

  initialPosX = posX.value;
  initialPosY = posY.value;

  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
};

const onDrag = (e) => {
  if (!isDragging.value) return;

  let newX = initialPosX + (e.clientX - dragStartX);
  let newY = initialPosY + (e.clientY - dragStartY);

  // Bounds checking
  const maxW = window.innerWidth;
  const maxH = window.innerHeight;
  const rect = modalWindow.value.getBoundingClientRect();

  if (newX < 0) newX = 0;
  if (newY < 0) newY = 0;
  if (newX + rect.width > maxW) newX = maxW - rect.width;
  if (newY + rect.height > maxH) newY = maxH - rect.height;

  posX.value = newX;
  posY.value = newY;
};

const stopDrag = () => {
  isDragging.value = false;
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
  persistGeometry();
};

// Resizing Logic
const startResize = (e) => {
  if (!props.resizable || isMaximized.value) return;
  e.preventDefault();
  e.stopPropagation();

  isResizing.value = true;
  resizeStartX = e.clientX;
  resizeStartY = e.clientY;

  const rect = modalWindow.value.getBoundingClientRect();

  // Lock position if not locked
  if (posX.value === null) {
    posX.value = rect.left;
    posY.value = rect.top;
  }

  initialWidth = rect.width;
  initialHeight = rect.height;

  window.addEventListener('mousemove', onResize);
  window.addEventListener('mouseup', stopResize);
};

const onResize = (e) => {
  if (!isResizing.value) return;

  let newW = initialWidth + (e.clientX - resizeStartX);
  let newH = initialHeight + (e.clientY - resizeStartY);

  // Min bounds
  if (newW < props.minWidth) newW = props.minWidth;
  if (newH < props.minHeight) newH = props.minHeight;

  // Max bounds
  const maxW = window.innerWidth - posX.value;
  const maxH = window.innerHeight - posY.value;

  if (newW > maxW) newW = maxW;
  if (newH > maxH) newH = maxH;

  curWidth.value = newW;
  curHeight.value = newH;
};

const stopResize = () => {
  isResizing.value = false;
  window.removeEventListener('mousemove', onResize);
  window.removeEventListener('mouseup', stopResize);
  persistGeometry();
};

function clampScalarBox(box) {
  const vw = (typeof window !== 'undefined' && window.innerWidth) || 1280;
  const vh = (typeof window !== 'undefined' && window.innerHeight) || 800;

  let w = typeof box?.width === 'number' && Number.isFinite(box.width) ? box.width : null;
  let h = typeof box?.height === 'number' && Number.isFinite(box.height) ? box.height : null;

  if (w !== null) {
    w = Math.max(props.minWidth, Math.min(w, Math.max(props.minWidth, vw - 16)));
  }
  if (h !== null) {
    h = Math.max(props.minHeight, Math.min(h, Math.max(props.minHeight, vh - 16)));
  }

  let x = typeof box?.x === 'number' && Number.isFinite(box.x) ? box.x : null;
  let y = typeof box?.y === 'number' && Number.isFinite(box.y) ? box.y : null;

  if (x !== null && y !== null) {
    const effectiveW = w || (typeof props.width === 'number' ? props.width : 600);
    const effectiveH = h || (typeof props.height === 'number' ? props.height : 460);
    x = Math.max(0, Math.min(x, Math.max(0, vw - Math.min(effectiveW, vw))));
    y = Math.max(0, Math.min(y, Math.max(0, vh - Math.min(effectiveH, vh))));
  }

  return { x, y, width: w, height: h };
}

function persistGeometry() {
  const key = effectiveStorageKey.value;
  if (!key || typeof window === 'undefined') return;
  try {
    const payload = {
      x: posX.value !== null ? Math.round(posX.value) : null,
      y: posY.value !== null ? Math.round(posY.value) : null,
      width: curWidth.value !== null ? Math.round(curWidth.value) : null,
      height: curHeight.value !== null ? Math.round(curHeight.value) : null,
      isMaximized: Boolean(isMaximized.value)
    };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {}
}

function restoreGeometry() {
  const key = effectiveStorageKey.value;
  if (!key || typeof window === 'undefined') {
    posX.value = null;
    posY.value = null;
    curWidth.value = null;
    curHeight.value = null;
    isMaximized.value = false;
    return;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      posX.value = null;
      posY.value = null;
      curWidth.value = null;
      curHeight.value = null;
      isMaximized.value = false;
      return;
    }
    const parsed = JSON.parse(raw);
    const clamped = clampScalarBox(parsed);
    curWidth.value = clamped.width;
    curHeight.value = clamped.height;
    posX.value = clamped.x;
    posY.value = clamped.y;
    isMaximized.value = Boolean(parsed?.isMaximized && props.resizable);
  } catch {
    posX.value = null;
    posY.value = null;
    curWidth.value = null;
    curHeight.value = null;
    isMaximized.value = false;
  }
}

function handleHeaderDblClick(e) {
  if (!props.draggable && !props.resizable) return;
  if (e?.target?.tagName === 'BUTTON' || e?.target?.closest?.('button')) return;

  // For resizable windows: toggle between Fullscreen and saved localStorage geometry
  if (props.resizable) {
    const preKey = preFullscreenStorageKey.value;

    if (!isMaximized.value) {
      // 1. Not fullscreen -> dump current position & size scalars to localStorage, then enter fullscreen
      const rect = modalWindow.value?.getBoundingClientRect?.();
      const snapshot = {
        x: posX.value !== null ? Math.round(posX.value) : (rect ? Math.round(rect.left) : null),
        y: posY.value !== null ? Math.round(posY.value) : (rect ? Math.round(rect.top) : null),
        width: curWidth.value !== null ? Math.round(curWidth.value) : (rect ? Math.round(rect.width) : null),
        height: curHeight.value !== null ? Math.round(curHeight.value) : (rect ? Math.round(rect.height) : null)
      };
      restoreSnapshot.value = snapshot;
      if (preKey && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(preKey, JSON.stringify(snapshot));
        } catch {}
      }
      isMaximized.value = true;
      persistGeometry();
    } else {
      // 2. Fullscreen -> restore size & position from localStorage, then remove pre-fullscreen key
      let saved = restoreSnapshot.value;
      if (preKey && typeof window !== 'undefined') {
        try {
          const rawPre = window.localStorage.getItem(preKey);
          if (rawPre) {
            saved = JSON.parse(rawPre);
          }
          window.localStorage.removeItem(preKey);
        } catch {}
      }
      isMaximized.value = false;
      if (saved) {
        const clamped = clampScalarBox(saved);
        posX.value = clamped.x;
        posY.value = clamped.y;
        curWidth.value = clamped.width;
        curHeight.value = clamped.height;
      } else {
        posX.value = null;
        posY.value = null;
        curWidth.value = null;
        curHeight.value = null;
      }
      restoreSnapshot.value = null;
      persistGeometry();
    }
    return;
  }

  // Fallback for draggable-only (non-resizable) modals: recenter window
  posX.value = null;
  posY.value = null;
  curWidth.value = null;
  curHeight.value = null;
  if (effectiveStorageKey.value && typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(effectiveStorageKey.value);
    } catch {}
  }
}

// Global ESC
const onGlobalKeyDown = (e) => {
  if (isVisible.value && e.key === 'Escape') {
    if (typeof document !== 'undefined' && modalOverlay.value) {
      const overlays = document.querySelectorAll('.nano-modal-overlay');
      const topOverlay = overlays.length > 0 ? overlays[overlays.length - 1] : null;
      if (topOverlay && topOverlay !== modalOverlay.value) {
        return;
      }
      if (modalOverlay.value.querySelector('.nano-select-dropdown')) {
        return;
      }
    }
    e.preventDefault();
    e.stopPropagation();
    closeModal();
  }
};

watch(isVisible, async (newVal) => {
  if (newVal) {
    // Restore saved geometry from localStorage (if storageKey provided) or reset to centered default
    restoreGeometry();

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onGlobalKeyDown, { capture: true });
    await nextTick();
    if (modalOverlay.value) {
      modalOverlay.value.focus();
    }
  } else {
    document.body.style.overflow = '';
    window.removeEventListener('keydown', onGlobalKeyDown, { capture: true });
    stopDrag();
    stopResize();
  }
});

onUnmounted(() => {
  document.body.style.overflow = '';
  window.removeEventListener('keydown', onGlobalKeyDown, { capture: true });
  stopDrag();
  stopResize();
});

const closeModal = () => {
  emit('update:modelValue', false);
  emit('update:visible', false);
  emit('update:show', false);
  emit('close');
};
const openModal = () => {
  emit('update:modelValue', true);
  emit('update:visible', true);
  emit('update:show', true);
};
const resetGeometry = () => {
  posX.value = null;
  posY.value = null;
  curWidth.value = null;
  curHeight.value = null;
  isMaximized.value = false;
  if (effectiveStorageKey.value && typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(effectiveStorageKey.value);
    } catch {}
  }
};
const handleBackdropClick = () => { if (props.closeOnBackdrop) closeModal(); };
const handleOk = () => emit('ok');
const handleCancel = () => { emit('cancel'); closeModal(); };

defineExpose({
  open: openModal,
  close: closeModal,
  toggleMaximize: () => handleHeaderDblClick({}),
  resetGeometry,
  isVisible,
  isMaximized,
  isDragging,
  isResizing,
});
</script>

<template>
  <Teleport v-if="isMounted" to="body">
    <transition name="nano-modal-fade">
      <div v-if="isVisible" class="nano-modal-overlay" :class="{ 'nano-glass': glassmorphism }"
        @click.self="handleBackdropClick" @keydown.esc.stop="closeModal" tabindex="-1" ref="modalOverlay">
        <div class="nano-modal-window" :class="{ 'is-dragging': isDragging, 'is-resizing': isResizing, 'is-maximized': isMaximized }"
          :style="computedWindowStyle" ref="modalWindow">

          <!-- HEADER -->
          <div v-if="showHeader" class="nano-modal-header" :class="{ 'is-draggable': draggable && !isMaximized }"
            @mousedown="startDrag" @dblclick="handleHeaderDblClick">
            <slot name="header">
              <h2 class="nano-modal-title">{{ title }}</h2>
            </slot>
            <button class="nano-modal-close-btn" @click.stop="closeModal" aria-label="Close" @mousedown.stop>
              <NanoIcon name="close" :size="20" />
            </button>
          </div>

          <!-- BODY -->
          <div v-if="showBody" class="nano-modal-body">
            <slot name="body">
              <slot></slot>
            </slot>
          </div>

          <!-- FOOTER -->
          <div v-if="computedShowFooter" class="nano-modal-footer">
            <slot name="footer">
              <div class="nano-modal-actions">
                <button v-if="showCancel" class="nano-btn nano-btn-secondary" @click="handleCancel" v-ripple>
                  {{ cancelText }}
                </button>
                <button v-if="showOk" class="nano-btn" :class="'nano-btn-' + okVariant" @click="handleOk" v-ripple>
                  {{ okText }}
                </button>
              </div>
            </slot>
          </div>

          <!-- RESIZER -->
          <div v-if="resizable && !isMaximized" class="nano-modal-resizer" @mousedown="startResize">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 1V9H1" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
          </div>

        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>


.nano-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--nano-modal-backdrop, rgba(15, 23, 42, 0.6));
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  padding: 20px;
  box-sizing: border-box;
  outline: none;
}

.nano-modal-overlay.nano-glass {
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.nano-modal-window {
  background: var(--nano-modal-bg, #0d1522);
  border: 1px solid var(--nano-modal-border, #1e2d45);
  border-radius: var(--nano-modal-radius, 14px);
  box-shadow: var(--nano-modal-shadow, 0 24px 60px rgba(0, 0, 0, 0.55));
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  color: var(--nano-modal-text, #f1f5f9);
  position: relative;
  overflow: hidden;
}

.nano-modal-window h1,
.nano-modal-window h2,
.nano-modal-window h3,
.nano-modal-window h4,
.nano-modal-window h5,
.nano-modal-window h6 {
  color: var(--nano-modal-text);
}

/* Important for draggable absolute positioning */
.nano-modal-window:not([style*="position: absolute"]) {
  margin: auto;
}

.nano-glass .nano-modal-window {
  background: var(--nano-modal-bg);
}

.nano-modal-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--nano-modal-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--nano-modal-header-bg);
  user-select: none;
  flex-shrink: 0;
}

.nano-modal-header.is-draggable {
  cursor: grab;
}

.nano-modal-header.is-draggable:active {
  cursor: grabbing;
}

.nano-modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.4;
}

.nano-modal-close-btn {
  background: transparent;
  border: none;
  color: var(--nano-modal-text-muted);
  cursor: pointer;
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  outline: none;
  transition: color var(--nano-transition-interactive), background-color var(--nano-transition-interactive);
}

.nano-modal-close-btn:hover {
  color: var(--nano-modal-close-color, var(--nano-modal-text));
  background: var(--nano-modal-close-hover);
}

.nano-modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.nano-modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--nano-modal-border);
  background: var(--nano-modal-footer-bg);
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.nano-modal-actions {
  display: flex;
  gap: 12px;
}

.nano-btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  color: white;
  transition: background-color var(--nano-transition-interactive), transform var(--nano-transition-interactive), box-shadow var(--nano-transition-interactive);
}

.nano-btn-primary {
  background: var(--nano-modal-btn-primary, var(--nano-accent-primary));
}

.nano-btn-primary:hover {
  filter: brightness(1.1);
}

.nano-btn-secondary {
  background: var(--nano-modal-btn-secondary, rgba(255, 255, 255, 0.1));
  color: var(--nano-modal-text);
}

.nano-btn-secondary:hover {
  filter: brightness(1.1);
}

.nano-btn-danger {
  background: var(--nano-state-danger, #ef4444);
}

.nano-btn-danger:hover {
  filter: brightness(1.1);
}

/* Resizer Handle */
.nano-modal-resizer {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 14px;
  height: 14px;
  cursor: se-resize;
  color: var(--nano-modal-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--nano-transition-interactive);
  z-index: 10;
}

.nano-modal-resizer:hover {
  color: var(--nano-modal-text);
}

.nano-modal-fade-enter-active,
.nano-modal-fade-leave-active {
  transition:
    opacity var(--nano-transition-modal-leave, 150ms ease-out),
    backdrop-filter var(--nano-transition-modal-leave, 150ms ease-out),
    -webkit-backdrop-filter var(--nano-transition-modal-leave, 150ms ease-out);
}

.nano-modal-fade-enter-active .nano-modal-window {
  transition: transform var(--nano-transition-modal-leave, 150ms ease-out);
}

.nano-modal-fade-leave-active .nano-modal-window {
  transition: none;
}

.nano-modal-fade-enter-from,
.nano-modal-fade-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
}

.nano-modal-fade-enter-from .nano-modal-window {
  transform: scale(0.96) translateY(4px);
}

.nano-modal-fade-leave-to .nano-modal-window {
  transform: none;
}
</style>
