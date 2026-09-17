<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue';

const props = defineProps({
  visible: { type: Boolean, default: true },
  title: { type: String, default: '' },
  width: { type: [String, Number], default: 600 },
  height: { type: [String, Number], default: 'auto' },

  showHeader: { type: Boolean, default: true },
  showBody: { type: Boolean, default: true },
  showFooter: { type: Boolean, default: true },

  showOk: { type: Boolean, default: true },
  showCancel: { type: Boolean, default: true },
  okText: { type: String, default: 'OK' },
  cancelText: { type: String, default: 'Cancel' },
  okVariant: { type: String, default: 'primary' },

  closeOnBackdrop: { type: Boolean, default: true },
  glassmorphism: { type: Boolean, default: true },

  draggable: { type: Boolean, default: false },
  resizable: { type: Boolean, default: false },

  minWidth: { type: Number, default: 300 },
  minHeight: { type: Number, default: 200 }
});

const emit = defineEmits(['close', 'ok', 'cancel']);

const modalOverlay = ref(null);
const modalWindow = ref(null);

// State
const posX = ref(null);
const posY = ref(null);
const curWidth = ref(null);
const curHeight = ref(null);

const isDragging = ref(false);
const isResizing = ref(false);

let dragStartX = 0;
let dragStartY = 0;
let initialPosX = 0;
let initialPosY = 0;

let resizeStartX = 0;
let resizeStartY = 0;
let initialWidth = 0;
let initialHeight = 0;

const computedWindowStyle = computed(() => {
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
  if (!props.draggable) return;

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
};

// Resizing Logic
const startResize = (e) => {
  if (!props.resizable) return;
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
};

// Global ESC
const onGlobalKeyDown = (e) => {
  if (props.visible && e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    closeModal();
  }
};

watch(() => props.visible, async (newVal) => {
  if (newVal) {
    // Reset positions on re-open
    posX.value = null;
    posY.value = null;
    curWidth.value = null;
    curHeight.value = null;

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

const closeModal = () => emit('close');
const handleBackdropClick = () => { if (props.closeOnBackdrop) closeModal(); };
const handleOk = () => emit('ok');
const handleCancel = () => { emit('cancel'); closeModal(); };
</script>

<template>
  <Teleport to="body">
    <transition name="nano-modal-fade">
      <div v-if="visible" class="nano-modal-overlay" :class="{ 'nano-glass': glassmorphism }"
        @click.self="handleBackdropClick" @keydown.esc.stop="handleEsc" tabindex="-1" ref="modalOverlay">
        <div class="nano-modal-window" :class="{ 'is-dragging': isDragging, 'is-resizing': isResizing }"
          :style="computedWindowStyle" ref="modalWindow">

          <!-- HEADER -->
          <div v-if="showHeader" class="nano-modal-header" :class="{ 'is-draggable': draggable }"
            @mousedown="startDrag">
            <slot name="header">
              <h2 class="nano-modal-title">{{ title }}</h2>
            </slot>
            <button class="nano-modal-close-btn" @click.stop="closeModal" aria-label="Close" @mousedown.stop>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- BODY -->
          <div v-if="showBody" class="nano-modal-body">
            <slot name="body"></slot>
          </div>

          <!-- FOOTER -->
          <div v-if="showFooter" class="nano-modal-footer">
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
          <div v-if="resizable" class="nano-modal-resizer" @mousedown="startResize">
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
  background: var(--nano-modal-backdrop);
  padding: 20px;
  box-sizing: border-box;
  outline: none;
}

.nano-modal-overlay.nano-glass {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.nano-modal-window {
  background: var(--nano-modal-bg);
  border: 1px solid var(--nano-modal-border);
  border-radius: var(--nano-modal-radius);
  box-shadow: var(--nano-modal-shadow);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  color: var(--nano-modal-text);
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
  background: var(--nano-modal-glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.nano-modal-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--nano-modal-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--nano-modal-header-bg);
  user-select: none;
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
}

.nano-modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--nano-modal-border);
  background: var(--nano-modal-footer-bg);
  display: flex;
  justify-content: flex-end;
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
  transition: opacity var(--nano-transition-modal-backdrop);
}

.nano-modal-fade-enter-active .nano-modal-window {
  transition: transform var(--nano-transition-modal-enter);
}

.nano-modal-fade-leave-active .nano-modal-window {
  transition: transform var(--nano-transition-modal-leave);
}

.nano-modal-fade-enter-from,
.nano-modal-fade-leave-to {
  opacity: 0;
}

.nano-modal-fade-enter-from .nano-modal-window {
  transform: scale(0.9) translateY(10px);
}

.nano-modal-fade-leave-to .nano-modal-window {
  transform: scale(0.95) translateY(-10px);
}
</style>
