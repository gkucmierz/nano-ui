<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import vRipple from '../directives/ripple.js';
import { computeLightboxStageGeometry } from '../utils/lightboxGeometry.js';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  items: {
    type: Array,
    default: () => [],
  },
  src: {
    type: String,
    default: '',
  },
  alt: {
    type: String,
    default: '',
  },
  caption: {
    type: String,
    default: '',
  },
  badge: {
    type: String,
    default: '',
  },
  aspectRatio: {
    type: [Number, String],
    default: undefined,
  },
  activeIndex: {
    type: Number,
    default: 0,
  },
  ariaLabel: {
    type: String,
    default: 'Podgląd zdjęcia',
  },
  closeLabel: {
    type: String,
    default: 'Zamknij podgląd',
  },
  prevLabel: {
    type: String,
    default: 'Poprzednie zdjęcie',
  },
  nextLabel: {
    type: String,
    default: 'Następne zdjęcie',
  },
  zoomInLabel: {
    type: String,
    default: 'Powiększ na dostępny ekran',
  },
  zoomOutLabel: {
    type: String,
    default: 'Przywróć rozmiar kompaktowy',
  },
});

const emit = defineEmits(['update:modelValue', 'update:activeIndex', 'close']);

const dialogRef = ref(null);
const frameRef = ref(null);
const imgRef = ref(null);
const currentIndex = ref(0);
const isZoomed = ref(false);
const viewportSize = ref({
  width: Number(globalThis.window?.innerWidth) || 1440,
  height: Number(globalThis.window?.innerHeight) || 900,
});
const measuredMedia = ref({
  src: '',
  width: 0,
  height: 0,
});

let pressedOutside = false;
let isClosing = false;
let supportsDisplayTransition;

const syncViewportMetrics = () => {
  const win = globalThis.window;
  if (!win) return;
  const vw = Number(win.visualViewport?.width || win.innerWidth) || 1440;
  const vh = Number(win.visualViewport?.height || win.innerHeight) || 900;
  viewportSize.value = { width: Math.round(vw), height: Math.round(vh) };
};

const syncImageIntrinsicDimensions = () => {
  const el = imgRef.value;
  const itemSrc = activeItem.value?.src || '';
  if (el && el.complete && Number(el.naturalWidth) > 0 && Number(el.naturalHeight) > 0) {
    measuredMedia.value = {
      src: itemSrc,
      width: Number(el.naturalWidth),
      height: Number(el.naturalHeight),
    };
  }
};

const handleImageLoad = (event) => {
  const target = event?.currentTarget || imgRef.value;
  const nw = Number(target?.naturalWidth) || 0;
  const nh = Number(target?.naturalHeight) || 0;
  if (nw > 0 && nh > 0) {
    measuredMedia.value = {
      src: activeItem.value?.src || '',
      width: nw,
      height: nh,
    };
  }
};

const normalizedItems = computed(() => {
  if (Array.isArray(props.items) && props.items.length > 0) {
    return props.items;
  }
  if (props.src) {
    return [
      {
        src: props.src,
        alt: props.alt || props.caption || props.ariaLabel,
        caption: props.caption,
        badge: props.badge,
        aspectRatio: props.aspectRatio,
      },
    ];
  }
  return [];
});

const activeItem = computed(
  () => normalizedItems.value[currentIndex.value] || normalizedItems.value[0] || null
);

const resolvedAriaLabel = computed(
  () => activeItem.value?.alt || activeItem.value?.caption || props.ariaLabel
);

const hasMultiple = computed(() => normalizedItems.value.length > 1);
const hasFooter = computed(() => Boolean(activeItem.value?.caption || hasMultiple.value));

const resolvedNaturalDimensions = computed(() => {
  const item = activeItem.value;
  if (!item) return { width: 0, height: 0 };
  if (measuredMedia.value.src === item.src && measuredMedia.value.width > 0 && measuredMedia.value.height > 0) {
    return {
      width: measuredMedia.value.width,
      height: measuredMedia.value.height,
    };
  }
  return {
    width: Number(item.width) || 0,
    height: Number(item.height) || 0,
  };
});

const stageGeometry = computed(() =>
  computeLightboxStageGeometry({
    viewportWidth: viewportSize.value.width,
    viewportHeight: viewportSize.value.height,
    zoomed: isZoomed.value,
    aspectRatio: activeItem.value?.aspectRatio ?? props.aspectRatio,
    naturalWidth: resolvedNaturalDimensions.value.width,
    naturalHeight: resolvedNaturalDimensions.value.height,
    hasFooter: hasFooter.value,
  })
);

const dialogCssVars = computed(() => ({
  '--nano-lightbox-margin-x': `${stageGeometry.value.marginX}px`,
  '--nano-lightbox-margin-y': `${stageGeometry.value.marginY}px`,
}));

const frameDynamicStyle = computed(() => {
  const g = stageGeometry.value;
  if (!isZoomed.value) {
    return undefined;
  }
  return {
    maxWidth: `${g.frameMaxWidth}px`,
  };
});

const viewportDynamicStyle = computed(() => {
  const g = stageGeometry.value;
  if (!isZoomed.value) {
    return {
      maxHeight: `${g.availHeight}px`,
    };
  }
  if (g.mediaWidth && g.mediaHeight) {
    return {
      width: `${g.mediaWidth}px`,
      height: `${g.mediaHeight}px`,
      maxHeight: `${g.availHeight}px`,
      aspectRatio: g.aspectRatio ? `${g.aspectRatio}` : undefined,
    };
  }
  return {
    width: `${g.availWidth}px`,
    maxHeight: `${g.availHeight}px`,
  };
});

const imgDynamicStyle = computed(() => {
  const g = stageGeometry.value;
  if (!isZoomed.value) {
    return {
      maxWidth: `${g.availWidth}px`,
      maxHeight: `${g.availHeight}px`,
    };
  }
  if (g.mediaWidth && g.mediaHeight) {
    return {
      width: `${g.mediaWidth}px`,
      height: `${g.mediaHeight}px`,
      aspectRatio: g.aspectRatio ? `${g.aspectRatio}` : undefined,
    };
  }
  return {
    maxWidth: `${g.availWidth}px`,
    maxHeight: `${g.availHeight}px`,
  };
});

function canTransitionDisplay() {
  if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
  const win = globalThis.window;
  const doc = globalThis.document;
  if (!win?.CSS?.supports?.('transition-behavior', 'allow-discrete') || !doc?.body) {
    return false;
  }
  const probe = doc.createElement('div');
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
  doc.body.appendChild(probe);
  win.getComputedStyle(probe).display;
  probe.style.display = 'none';
  supportsDisplayTransition = win.getComputedStyle(probe).display === 'block';
  probe.remove();
  return supportsDisplayTransition;
}

function supportsTopLayerExit() {
  const win = globalThis.window;
  return Boolean(win?.CSS?.supports?.('overlay', 'auto')) && canTransitionDisplay();
}

const selectIndex = (idx) => {
  const count = normalizedItems.value.length;
  if (count <= 0) return;
  const wrapped = ((idx % count) + count) % count;
  currentIndex.value = wrapped;
  emit('update:activeIndex', wrapped);
};

const stepPrev = () => selectIndex(currentIndex.value - 1);
const stepNext = () => selectIndex(currentIndex.value + 1);
const toggleZoom = () => {
  syncViewportMetrics();
  isZoomed.value = !isZoomed.value;
};

async function closeTopLayer() {
  const dlg = dialogRef.value;
  if (!dlg || !dlg.open) {
    emit('update:modelValue', false);
    return;
  }
  if (isClosing) return;
  isClosing = true;

  try {
    if (!supportsTopLayerExit() && dlg.getAnimations instanceof Function) {
      dlg.setAttribute('data-closing', '');
      const animations = dlg.getAnimations({ subtree: true });
      if (animations.length > 0) {
        await Promise.race([
          Promise.allSettled(animations.map((a) => a.finished)),
          new Promise((resolve) => setTimeout(resolve, 280)),
        ]);
      }
      if (!dlg.hasAttribute('data-closing')) return;
      dlg.removeAttribute('data-closing');
    }
    if (dlg.open) {
      dlg.close();
    }
  } finally {
    isClosing = false;
  }
}

const handleCancel = (event) => {
  event.preventDefault();
  closeTopLayer();
};

const handleNativeClose = () => {
  const dlg = dialogRef.value;
  if (dlg) {
    dlg.returnValue = '';
    dlg.removeAttribute('data-closing');
  }
  isZoomed.value = false;
  isClosing = false;
  if (props.modelValue) {
    emit('update:modelValue', false);
  }
  emit('close');
};

const isPointerOutsideFrame = (event) => {
  const frame = frameRef.value || dialogRef.value;
  if (!frame) return false;
  const r = frame.getBoundingClientRect();
  return (
    event.clientX < r.left ||
    event.clientX > r.right ||
    event.clientY < r.top ||
    event.clientY > r.bottom
  );
};

const supportsNativeClosedBy = () =>
  Boolean(globalThis.HTMLDialogElement) && 'closedBy' in globalThis.HTMLDialogElement.prototype;

const onDialogPointerDown = (event) => {
  if (supportsNativeClosedBy()) return;
  pressedOutside = event.target === dialogRef.value && isPointerOutsideFrame(event);
};

const onDialogPointerUp = (event) => {
  if (supportsNativeClosedBy()) return;
  if (pressedOutside && event.target === dialogRef.value && isPointerOutsideFrame(event)) {
    closeTopLayer();
  }
  pressedOutside = false;
};

const onDialogKeydown = (event) => {
  if (event.key === 'ArrowLeft' && hasMultiple.value) {
    event.preventDefault();
    stepPrev();
  } else if (event.key === 'ArrowRight' && hasMultiple.value) {
    event.preventDefault();
    stepNext();
  } else if (event.key === '+' || event.key === '=') {
    event.preventDefault();
    syncViewportMetrics();
    isZoomed.value = true;
  } else if (event.key === '-') {
    event.preventDefault();
    isZoomed.value = false;
  }
};

const syncOpenState = async (shouldOpen) => {
  await nextTick();
  const dlg = dialogRef.value;
  if (!dlg) return;
  if (shouldOpen) {
    syncViewportMetrics();
    syncImageIntrinsicDimensions();
    dlg.removeAttribute('data-closing');
    isClosing = false;
    if (!dlg.open && dlg.showModal instanceof Function) {
      dlg.showModal();
    }
  } else if (dlg.open) {
    await closeTopLayer();
  }
};

watch(
  () => props.activeIndex,
  (val) => {
    if (Number.isFinite(val) && val >= 0) {
      currentIndex.value = val;
    }
  },
  { immediate: true }
);

watch(
  () => activeItem.value?.src,
  async () => {
    await nextTick();
    syncImageIntrinsicDimensions();
  }
);

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      currentIndex.value = Math.max(
        0,
        Math.min(Number(props.activeIndex) || 0, Math.max(0, normalizedItems.value.length - 1))
      );
      isZoomed.value = false;
    }
    syncOpenState(open);
  }
);

onMounted(() => {
  syncViewportMetrics();
  const win = globalThis.window;
  if (win) {
    win.addEventListener('resize', syncViewportMetrics, { passive: true });
    win.visualViewport?.addEventListener('resize', syncViewportMetrics, { passive: true });
  }
  if (props.modelValue) {
    syncOpenState(true);
  }
});

onBeforeUnmount(() => {
  const win = globalThis.window;
  if (win) {
    win.removeEventListener('resize', syncViewportMetrics);
    win.visualViewport?.removeEventListener('resize', syncViewportMetrics);
  }
  const dlg = dialogRef.value;
  if (dlg?.open) {
    dlg.close();
  }
});
</script>

<template>
  <dialog
    ref="dialogRef"
    class="nano-lightbox-dialog"
    :class="{ 'is-zoomed': isZoomed }"
    :style="dialogCssVars"
    closedby="any"
    :aria-label="resolvedAriaLabel"
    @cancel="handleCancel"
    @close="handleNativeClose"
    @keydown="onDialogKeydown"
    @pointerdown="onDialogPointerDown"
    @pointerup="onDialogPointerUp"
  >
    <div
      v-if="activeItem"
      ref="frameRef"
      class="nano-lightbox-frame"
      :class="{ 'is-zoomed': isZoomed }"
      :style="frameDynamicStyle"
    >
      <div class="nano-lightbox-toolbar">
        <div class="nano-lightbox-meta">
          <span v-if="hasMultiple" class="nano-lightbox-counter">
            {{ currentIndex + 1 }} / {{ normalizedItems.length }}
          </span>
          <span v-if="activeItem.badge" class="nano-lightbox-badge">
            {{ activeItem.badge }}
          </span>
        </div>

        <div class="nano-lightbox-actions">
          <button
            v-ripple
            type="button"
            class="nano-lightbox-icon-btn"
            :class="{ 'is-active': isZoomed }"
            :aria-label="isZoomed ? zoomOutLabel : zoomInLabel"
            :aria-pressed="isZoomed"
            @click="toggleZoom"
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="5.5" stroke="currentColor" stroke-width="1.7" />
              <path d="m13.2 13.2 3.8 3.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              <path
                v-if="!isZoomed"
                d="M9 6.6v4.8M6.6 9h4.8"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
              />
              <path
                v-else
                d="M6.6 9h4.8"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
              />
            </svg>
          </button>

          <button
            v-ripple
            type="button"
            class="nano-lightbox-icon-btn nano-lightbox-close-btn"
            autofocus
            :aria-label="closeLabel"
            @click="closeTopLayer"
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5 5 15"
                stroke="currentColor"
                stroke-width="1.9"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div
        class="nano-lightbox-viewport"
        :class="{ 'is-zoomed': isZoomed }"
        :style="viewportDynamicStyle"
      >
        <button
          v-if="hasMultiple"
          v-ripple
          type="button"
          class="nano-lightbox-nav nano-lightbox-prev"
          :aria-label="prevLabel"
          @click="stepPrev"
        >
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M12.5 4.5 7 10l5.5 5.5"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <img
          ref="imgRef"
          class="nano-lightbox-img"
          :class="{ 'is-zoomed': isZoomed }"
          :style="imgDynamicStyle"
          :src="activeItem.src"
          :alt="activeItem.alt || activeItem.caption || ariaLabel"
          :width="activeItem.width || undefined"
          :height="activeItem.height || undefined"
          @load="handleImageLoad"
          @click="toggleZoom"
        />

        <button
          v-if="hasMultiple"
          v-ripple
          type="button"
          class="nano-lightbox-nav nano-lightbox-next"
          :aria-label="nextLabel"
          @click="stepNext"
        >
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M7.5 4.5 13 10l-5.5 5.5"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>

      <div v-if="hasFooter" class="nano-lightbox-footer">
        <p v-if="activeItem.caption" class="nano-lightbox-caption">
          {{ activeItem.caption }}
        </p>
        <div v-if="hasMultiple" class="nano-lightbox-pills" role="group">
          <button
            v-for="(item, idx) in normalizedItems"
            :key="item.src || idx"
            v-ripple
            type="button"
            class="nano-lightbox-pill"
            :class="{ 'is-active': idx === currentIndex }"
            :aria-pressed="idx === currentIndex"
            @click="selectIndex(idx)"
          >
            {{ item.label || item.badge || `${idx + 1}` }}
          </button>
        </div>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.nano-lightbox-frame {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 22px;
  background: var(--nano-lightbox-surface, rgba(18, 22, 34, 0.88));
  border: 1px solid var(--nano-lightbox-border, rgba(255, 255, 255, 0.16));
  box-shadow: 0 28px 72px rgba(0, 0, 0, 0.52);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-sizing: border-box;
  max-width: min(94dvw, 1200px);
  transition: max-width 0.22s cubic-bezier(0.2, 0, 0, 1);
}

.nano-lightbox-frame.is-zoomed {
  max-width: calc(100dvw - var(--nano-lightbox-margin-x, 32px) * 2);
}

.nano-lightbox-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 4px;
}

.nano-lightbox-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.nano-lightbox-counter {
  font-size: 0.78rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--nano-lightbox-muted, #cbd5e1);
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.14);
}

.nano-lightbox-badge {
  font-size: 0.78rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  color: var(--nano-accent-primary, #f59e0b);
  background: color-mix(in srgb, var(--nano-accent-primary, #f59e0b) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--nano-accent-primary, #f59e0b) 35%, transparent);
}

.nano-lightbox-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nano-lightbox-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border-radius: 11px;
  border: 1px solid var(--nano-lightbox-border, rgba(255, 255, 255, 0.16));
  background: rgba(148, 163, 184, 0.12);
  color: var(--nano-lightbox-fg, #f8fafc);
  cursor: pointer;
  box-sizing: border-box;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.nano-lightbox-icon-btn:hover {
  background: rgba(148, 163, 184, 0.22);
  border-color: var(--nano-accent-primary, #6366f1);
}

.nano-lightbox-icon-btn.is-active {
  background: color-mix(in srgb, var(--nano-accent-primary, #6366f1) 18%, transparent);
  border-color: var(--nano-accent-primary, #6366f1);
  color: var(--nano-accent-primary, #6366f1);
}

.nano-lightbox-icon-btn > svg {
  width: 18px;
  height: 18px;
  max-width: none;
}

.nano-lightbox-viewport {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  border-radius: 14px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.22);
  max-height: min(74dvh, 820px);
  transition:
    width 0.22s cubic-bezier(0.2, 0, 0, 1),
    height 0.22s cubic-bezier(0.2, 0, 0, 1),
    max-height 0.22s cubic-bezier(0.2, 0, 0, 1);
}

.nano-lightbox-viewport.is-zoomed {
  max-height: calc(100dvh - var(--nano-lightbox-margin-y, 28px) * 2 - 124px);
}

.nano-lightbox-img {
  display: block;
  max-width: min(88dvw, 1140px);
  max-height: min(74dvh, 820px);
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 12px;
  cursor: zoom-in;
  user-select: none;
  transition:
    width 0.22s cubic-bezier(0.2, 0, 0, 1),
    height 0.22s cubic-bezier(0.2, 0, 0, 1),
    max-width 0.22s cubic-bezier(0.2, 0, 0, 1),
    max-height 0.22s cubic-bezier(0.2, 0, 0, 1);
}

.nano-lightbox-img.is-zoomed {
  max-width: 100%;
  max-height: 100%;
  cursor: zoom-out;
}

.nano-lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  padding: 0;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: rgba(15, 23, 42, 0.68);
  color: #ffffff;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.nano-lightbox-nav:hover {
  background: rgba(15, 23, 42, 0.88);
  border-color: rgba(255, 255, 255, 0.48);
}

.nano-lightbox-nav > svg {
  width: 20px;
  height: 20px;
  max-width: none;
}

.nano-lightbox-prev {
  left: 12px;
}

.nano-lightbox-next {
  right: 12px;
}

.nano-lightbox-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 2px 4px 0;
}

.nano-lightbox-caption {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.45;
  color: var(--nano-lightbox-fg, #f8fafc);
  text-wrap: pretty;
  flex: 1 1 260px;
}

.nano-lightbox-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.nano-lightbox-pill {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--nano-lightbox-border, rgba(255, 255, 255, 0.16));
  background: rgba(148, 163, 184, 0.10);
  color: var(--nano-lightbox-muted, #cbd5e1);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  box-sizing: border-box;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.nano-lightbox-pill:hover {
  color: var(--nano-lightbox-fg, #f8fafc);
  border-color: var(--nano-accent-primary, #6366f1);
}

.nano-lightbox-pill.is-active {
  background: color-mix(in srgb, var(--nano-accent-primary, #f59e0b) 18%, transparent);
  border-color: var(--nano-accent-primary, #f59e0b);
  color: var(--nano-lightbox-fg, #f8fafc);
}
</style>
