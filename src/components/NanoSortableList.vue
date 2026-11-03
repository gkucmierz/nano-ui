<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';
import {
  DEFAULT_INTERACTIVE_IGNORE_SELECTOR,
  reorderArray,
  resolveSortableSlot,
  resolvePlaceholderBeforeIndex,
} from '../utils/sortable.js';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
  itemKey: {
    type: [String, Function],
    default: 'id',
  },
  direction: {
    type: String,
    default: 'vertical', // 'vertical' | 'horizontal' | 'grid'
  },
  gap: {
    type: [Number, String],
    default: 10,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  handleOnly: {
    type: Boolean,
    default: false,
  },
  handleSelector: {
    type: String,
    default: '[data-drag-handle], .drag-handle',
  },
  ignoreSelector: {
    type: String,
    default: DEFAULT_INTERACTIVE_IGNORE_SELECTOR,
  },
  placeholderColor: {
    type: String,
    default: '#0ea5e9',
  },
  placeholderRadius: {
    type: String,
    default: '10px',
  },
  ghostScale: {
    type: Number,
    default: 1.015,
  },
  ghostOpacity: {
    type: Number,
    default: 0.88,
  },
  dragThreshold: {
    type: Number,
    default: 3,
  },
});

const emit = defineEmits(['update:modelValue', 'reorder', 'drag-start', 'drag-end']);

const containerRef = ref(null);
const isDragging = ref(false);
const draggedIndex = ref(null);
const targetSlot = ref(null);
const dragOffset = ref({ x: 0, y: 0 });
const dragGhostPos = ref({ x: 0, y: 0 });
const draggedElementRect = ref({ width: 'auto', height: '84px' });

let pendingDrag = null;

const getItemKey = (item, index) => {
  if (typeof props.itemKey === 'function') {
    return props.itemKey(item, index);
  }
  if (item && typeof item === 'object' && props.itemKey in item) {
    return item[props.itemKey];
  }
  return index;
};

const containerStyle = computed(() => {
  const gapVal = typeof props.gap === 'number' ? `${props.gap}px` : String(props.gap);
  return {
    '--nano-sortable-gap': gapVal,
    '--nano-sortable-color': props.placeholderColor,
    '--nano-sortable-radius': props.placeholderRadius,
  };
});

const draggedItem = computed(() => {
  if (draggedIndex.value === null) return null;
  return props.modelValue[draggedIndex.value] ?? null;
});

const placeholderBeforeIndex = computed(() => {
  if (!isDragging.value || draggedIndex.value === null || targetSlot.value === null) {
    return null;
  }
  return resolvePlaceholderBeforeIndex(
    targetSlot.value,
    draggedIndex.value,
    props.modelValue.length
  );
});

const placeholderStyle = computed(() => ({
  width: props.direction === 'vertical' ? '100%' : draggedElementRect.value.width,
  height: draggedElementRect.value.height,
  borderRadius: props.placeholderRadius,
}));

const ghostStyle = computed(() => ({
  position: 'fixed',
  top: `${dragGhostPos.value.y}px`,
  left: `${dragGhostPos.value.x}px`,
  width: draggedElementRect.value.width,
  height: draggedElementRect.value.height,
  pointerEvents: 'none',
  zIndex: 9999,
  opacity: props.ghostOpacity,
  transform: `scale(${props.ghostScale})`,
  transition: 'none',
  margin: 0,
  boxSizing: 'border-box',
}));

const shouldIgnorePointerDown = (event, itemEl) => {
  const target = event.target;
  if (!target || typeof target.closest !== 'function') return false;

  const isOnHandle = props.handleSelector ? Boolean(target.closest(props.handleSelector)) : false;
  if (props.handleOnly && !isOnHandle) {
    return true;
  }
  if (isOnHandle) {
    return false;
  }
  if (props.ignoreSelector) {
    const ignored = target.closest(props.ignoreSelector);
    if (ignored && itemEl.contains(ignored)) {
      return true;
    }
  }
  return false;
};

const extractClientCoords = (e) => {
  if (e.touches && e.touches.length > 0) {
    return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
  }
  if (e.changedTouches && e.changedTouches.length > 0) {
    return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
  }
  return { clientX: e.clientX, clientY: e.clientY };
};

const activateDragSession = (session, clientX, clientY) => {
  draggedIndex.value = session.index;
  targetSlot.value = session.index;
  draggedElementRect.value = {
    width: `${session.rect.width}px`,
    height: `${session.rect.height}px`,
  };
  dragOffset.value = {
    x: session.startX - session.rect.left,
    y: session.startY - session.rect.top,
  };
  dragGhostPos.value = {
    x: clientX - dragOffset.value.x,
    y: clientY - dragOffset.value.y,
  };
  isDragging.value = true;
  if (typeof document !== 'undefined') {
    document.body.classList.add('is-nano-sortable-dragging');
  }
  emit('drag-start', {
    index: session.index,
    item: props.modelValue[session.index],
  });
};

const updateTargetSlotFromCursor = (clientX, clientY) => {
  const container = containerRef.value;
  if (!container) return;
  const visibleEls = Array.from(
    container.querySelectorAll(':scope > .nano-sortable-item:not(.hide-during-drag)')
  );
  const visibleRects = visibleEls.map((el) => el.getBoundingClientRect());
  targetSlot.value = resolveSortableSlot(
    visibleRects,
    clientX,
    clientY,
    props.direction
  );
};

const onGlobalPointerMove = (e) => {
  const { clientX, clientY } = extractClientCoords(e);

  if (!isDragging.value && pendingDrag) {
    const dx = clientX - pendingDrag.startX;
    const dy = clientY - pendingDrag.startY;
    if (Math.hypot(dx, dy) < pendingDrag.threshold) {
      return;
    }
    activateDragSession(pendingDrag, clientX, clientY);
    pendingDrag = null;
  }

  if (!isDragging.value) return;

  if (e.cancelable) {
    e.preventDefault();
  }

  dragGhostPos.value = {
    x: clientX - dragOffset.value.x,
    y: clientY - dragOffset.value.y,
  };

  updateTargetSlotFromCursor(clientX, clientY);
};

const commitDrop = () => {
  const fromIndex = draggedIndex.value;
  const toIndex = targetSlot.value;
  if (
    fromIndex === null ||
    toIndex === null ||
    fromIndex < 0 ||
    fromIndex >= props.modelValue.length
  ) {
    return;
  }
  const item = props.modelValue[fromIndex];
  if (fromIndex !== toIndex) {
    const nextItems = reorderArray(props.modelValue, fromIndex, toIndex);
    emit('update:modelValue', nextItems);
    emit('reorder', { fromIndex, toIndex, item, items: nextItems });
  }
  emit('drag-end', { fromIndex, toIndex, item });
};

const cleanupGlobalListeners = () => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('mousemove', onGlobalPointerMove);
    window.removeEventListener('mouseup', onGlobalPointerUp);
    window.removeEventListener('touchmove', onGlobalPointerMove);
    window.removeEventListener('touchend', onGlobalPointerUp);
    window.removeEventListener('touchcancel', onGlobalPointerUp);
  }
  if (typeof document !== 'undefined') {
    document.body.classList.remove('is-nano-sortable-dragging');
  }
};

const onGlobalPointerUp = () => {
  if (isDragging.value) {
    commitDrop();
  }
  pendingDrag = null;
  isDragging.value = false;
  draggedIndex.value = null;
  targetSlot.value = null;
  cleanupGlobalListeners();
};

const onItemMouseDown = (e, index) => {
  if (props.disabled || props.modelValue.length <= 1) return;
  if (e.button !== undefined && e.button !== 0) return;

  const itemEl = e.currentTarget;
  if (!itemEl || shouldIgnorePointerDown(e, itemEl)) return;

  const isOnHandle =
    props.handleSelector &&
    e.target &&
    typeof e.target.closest === 'function' &&
    Boolean(e.target.closest(props.handleSelector));

  const { clientX, clientY } = extractClientCoords(e);
  const rect = itemEl.getBoundingClientRect();

  // Prevent accidental text selection while grabbing card/handle
  e.preventDefault();

  const session = {
    index,
    startX: clientX,
    startY: clientY,
    rect,
    threshold: isOnHandle ? 0 : props.dragThreshold,
  };

  if (session.threshold <= 0) {
    activateDragSession(session, clientX, clientY);
  } else {
    pendingDrag = session;
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', onGlobalPointerMove);
    window.addEventListener('mouseup', onGlobalPointerUp);
    window.addEventListener('touchmove', onGlobalPointerMove, { passive: false });
    window.addEventListener('touchend', onGlobalPointerUp);
    window.addEventListener('touchcancel', onGlobalPointerUp);
  }
};

const moveItemByDelta = (fromIndex, delta) => {
  if (props.disabled || props.modelValue.length <= 1) return;
  const toIndex = fromIndex + delta;
  if (toIndex < 0 || toIndex >= props.modelValue.length) return;
  const item = props.modelValue[fromIndex];
  const nextItems = reorderArray(props.modelValue, fromIndex, toIndex);
  emit('update:modelValue', nextItems);
  emit('reorder', { fromIndex, toIndex, item, items: nextItems });
};

onBeforeUnmount(() => {
  cleanupGlobalListeners();
});

defineExpose({
  isDragging,
  draggedIndex,
  targetSlot,
  moveItemByDelta,
});
</script>

<template>
  <div
    ref="containerRef"
    class="nano-sortable-list"
    :class="[
      `nano-sortable-list--${direction}`,
      {
        'is-dragging': isDragging,
        'is-disabled': disabled,
        'is-card-draggable': !disabled && !handleOnly && modelValue.length > 1,
      },
    ]"
    :style="containerStyle"
  >
    <template v-for="(item, index) in modelValue" :key="getItemKey(item, index)">
      <div
        v-if="isDragging && placeholderBeforeIndex === index"
        class="nano-sortable-placeholder"
        :style="placeholderStyle"
        aria-hidden="true"
      />

      <div
        class="nano-sortable-item"
        :class="{
          'hide-during-drag': isDragging && draggedIndex === index,
        }"
        :data-sortable-index="index"
        @mousedown="onItemMouseDown($event, index)"
        @touchstart="onItemMouseDown($event, index)"
      >
        <slot
          :item="item"
          :index="index"
          :is-dragging="isDragging && draggedIndex === index"
          :is-ghost="false"
          :move-up="() => moveItemByDelta(index, -1)"
          :move-down="() => moveItemByDelta(index, 1)"
        />
      </div>
    </template>

    <div
      v-if="isDragging && placeholderBeforeIndex === modelValue.length"
      class="nano-sortable-placeholder"
      :style="placeholderStyle"
      aria-hidden="true"
    />

    <slot v-if="modelValue.length === 0" name="empty" />
  </div>

  <Teleport to="body">
    <div
      v-if="isDragging && draggedItem !== null"
      class="nano-sortable-ghost"
      :style="ghostStyle"
      aria-hidden="true"
    >
      <slot
        name="ghost"
        :item="draggedItem"
        :index="draggedIndex"
      >
        <slot
          :item="draggedItem"
          :index="draggedIndex"
          :is-dragging="true"
          :is-ghost="true"
          :move-up="() => {}"
          :move-down="() => {}"
        />
      </slot>
    </div>
  </Teleport>
</template>

<style scoped>
.nano-sortable-list {
  display: flex;
  flex-direction: column;
  gap: var(--nano-sortable-gap, 10px);
  width: 100%;
  box-sizing: border-box;
}

.nano-sortable-list--horizontal {
  flex-direction: row;
  flex-wrap: nowrap;
}

.nano-sortable-list--grid {
  flex-direction: row;
  flex-wrap: wrap;
}

.nano-sortable-list.is-dragging,
.nano-sortable-list.is-dragging * {
  user-select: none !important;
  -webkit-user-select: none !important;
}

.nano-sortable-item {
  width: 100%;
  box-sizing: border-box;
}

.nano-sortable-list--horizontal > .nano-sortable-item,
.nano-sortable-list--grid > .nano-sortable-item {
  width: auto;
}

.nano-sortable-list.is-card-draggable > .nano-sortable-item {
  cursor: grab;
}

.nano-sortable-list.is-card-draggable > .nano-sortable-item:active {
  cursor: grabbing;
}

.hide-during-drag {
  display: none !important;
}

.nano-sortable-placeholder {
  border: 2px dashed var(--nano-sortable-color, #0ea5e9);
  border-radius: var(--nano-sortable-radius, 10px);
  background-color: rgba(14, 165, 233, 0.08);
  box-sizing: border-box;
  pointer-events: none;
  transition: height 0.1s ease, width 0.1s ease;
}

.nano-sortable-ghost {
  pointer-events: none !important;
  filter: drop-shadow(0 16px 32px rgba(15, 23, 42, 0.24));
  user-select: none;
}
</style>
