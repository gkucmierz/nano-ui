<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useElementMorph } from '../composables/useElementMorph.js';
import {
  DEFAULT_MORPH_DURATION_MS,
  DEFAULT_MORPH_EASING,
} from '../utils/nanoMorph.js';
import { playNanoUiSound } from '../utils/sound-controller.js';

const props = defineProps({
  expanded: {
    type: Boolean,
    default: undefined,
  },
  modelValue: {
    type: Boolean,
    default: undefined,
  },
  duration: {
    type: Number,
    default: DEFAULT_MORPH_DURATION_MS,
  },
  easing: {
    type: String,
    default: DEFAULT_MORPH_EASING,
  },
  mode: {
    type: String,
    default: 'auto',
  },
  fromPath: {
    type: [String, Object],
    default: '',
  },
  toPath: {
    type: [String, Object],
    default: '',
  },
  fromText: {
    type: String,
    default: '',
  },
  toText: {
    type: String,
    default: '',
  },
  viewBox: {
    type: String,
    default: '0 0 160 64',
  },
  vectorWidth: {
    type: Number,
    default: 160,
  },
  vectorHeight: {
    type: Number,
    default: 64,
  },
  transferFocus: {
    type: Boolean,
    default: true,
  },
  sound: {
    type: [Boolean, String, Object],
    default: undefined,
  },
});

const emit = defineEmits(['update:expanded', 'update:modelValue', 'morph-start', 'morph-end']);

const isMounted = ref(false);
const localExpanded = ref(Boolean(props.expanded ?? props.modelValue ?? false));
const compactWrapRef = ref(null);
const expandedWrapRef = ref(null);

const isControlled = computed(
  () => props.expanded !== undefined || props.modelValue !== undefined
);

const isExpanded = computed(() => {
  if (props.expanded !== undefined) return Boolean(props.expanded);
  if (props.modelValue !== undefined) return Boolean(props.modelValue);
  return localExpanded.value;
});

const hasVectorMorph = computed(() =>
  Boolean((props.fromPath && props.toPath) || (props.fromText && props.toText))
);

const morphDuration = computed(() => props.duration);
const morphEasing = computed(() => props.easing);
const morphMode = computed(() => props.mode);

const morphCtrl = useElementMorph({
  duration: morphDuration,
  easing: morphEasing,
  mode: morphMode,
  transferFocus: props.transferFocus,
});

const isMorphing = morphCtrl.isMorphing;
const progress = morphCtrl.progress;
const easedProgress = morphCtrl.easedProgress;
const activeStrategy = morphCtrl.activeStrategy;
const ghostBox = morphCtrl.ghostBox;
const currentPathD = morphCtrl.currentPathD;
const freezeDataUrl = morphCtrl.freezeDataUrl;
const evaluateVectorAt = morphCtrl.evaluateVectorAt;
const runMorphTransition = morphCtrl.runMorphTransition;
const cancelMorph = morphCtrl.cancelMorph;

const refreshStaticVector = () => {
  if (!hasVectorMorph.value) return;
  evaluateVectorAt(isExpanded.value ? 1 : 0, {
    fromPath: props.fromPath,
    toPath: props.toPath,
    fromText: props.fromText,
    toText: props.toText,
    width: props.vectorWidth,
    height: props.vectorHeight,
  });
};

onMounted(() => {
  isMounted.value = true;
  refreshStaticVector();
});

onUnmounted(() => {
  cancelMorph();
});

const ghostInlineStyle = computed(() => {
  const b = ghostBox.value;
  if (!b) return {};
  return {
    left: `${b.x}px`,
    top: `${b.y}px`,
    width: `${b.width}px`,
    height: `${b.height}px`,
    borderRadius: `${b.borderRadius}px`,
  };
});

async function setExpanded(nextVal) {
  const target = Boolean(nextVal);
  if (target === isExpanded.value && !isMorphing.value) return;

  const fromEl = isExpanded.value ? expandedWrapRef.value : compactWrapRef.value;
  const direction = target ? 'expand' : 'collapse';

  playNanoUiSound(target ? 'modal-open' : 'modal-close', {
    propSound: props.sound,
    minIntervalMs: 45,
    throttleKey: 'nano-morph',
  });

  emit('morph-start', { expanded: target, direction });

  const result = await runMorphTransition({
    fromEl,
    toEl: () => (target ? expandedWrapRef.value : compactWrapRef.value),
    direction,
    vectorConfig: hasVectorMorph.value
      ? {
          fromPath: props.fromPath,
          toPath: props.toPath,
          fromText: props.fromText,
          toText: props.toText,
          width: props.vectorWidth,
          height: props.vectorHeight,
        }
      : null,
    applyStateChange: () => {
      localExpanded.value = target;
      emit('update:expanded', target);
      emit('update:modelValue', target);
    },
  });

  emit('morph-end', { expanded: target, direction, ...result });
}

const expand = () => setExpanded(true);
const collapse = () => setExpanded(false);
const toggle = () => setExpanded(!isExpanded.value);

watch(
  () => [props.expanded, props.modelValue],
  ([exp, mv]) => {
    const resolved = exp !== undefined ? Boolean(exp) : Boolean(mv);
    if (isControlled.value && resolved !== localExpanded.value && !isMorphing.value) {
      const fromEl = localExpanded.value ? expandedWrapRef.value : compactWrapRef.value;
      const direction = resolved ? 'expand' : 'collapse';
      localExpanded.value = resolved;
      runMorphTransition({
        fromEl,
        toEl: () => (resolved ? expandedWrapRef.value : compactWrapRef.value),
        direction,
        vectorConfig: hasVectorMorph.value
          ? {
              fromPath: props.fromPath,
              toPath: props.toPath,
              fromText: props.fromText,
              toText: props.toText,
              width: props.vectorWidth,
              height: props.vectorHeight,
            }
          : null,
      });
    }
  }
);

watch(
  () => [props.fromPath, props.toPath, props.fromText, props.toText],
  () => {
    if (!isMorphing.value) refreshStaticVector();
  }
);

// Sync initial vector path cleanly even during SSR / non-mounted unit inspection
refreshStaticVector();

defineExpose({
  isExpanded,
  isMorphing,
  progress,
  easedProgress,
  activeStrategy,
  currentPathD,
  expand,
  collapse,
  toggle,
  cancelMorph,
});
</script>

<template>
  <div
    class="nano-morph-root"
    :class="{
      'is-expanded': isExpanded,
      'is-compact': !isExpanded,
      'is-morphing': isMorphing,
    }"
    :data-morph-strategy="activeStrategy"
  >
    <div
      v-if="!isExpanded"
      ref="compactWrapRef"
      class="nano-morph-surface nano-morph-compact"
      :class="{ 'is-ghosted': isMorphing }"
    >
      <slot
        name="compact"
        :expand="expand"
        :collapse="collapse"
        :toggle="toggle"
        :is-morphing="isMorphing"
        :progress="progress"
      />
    </div>

    <div
      v-else
      ref="expandedWrapRef"
      class="nano-morph-surface nano-morph-expanded"
      :class="{ 'is-ghosted': isMorphing }"
    >
      <slot
        name="expanded"
        :expand="expand"
        :collapse="collapse"
        :toggle="toggle"
        :is-morphing="isMorphing"
        :progress="progress"
      />
    </div>

    <div v-if="hasVectorMorph" class="nano-morph-vector-stage">
      <slot
        name="vector"
        :path-d="currentPathD"
        :progress="progress"
        :eased-progress="easedProgress"
        :is-expanded="isExpanded"
        :toggle="toggle"
      >
        <svg
          class="nano-morph-svg"
          :viewBox="viewBox"
          fill="none"
          aria-hidden="true"
          @click="toggle"
        >
          <path :d="currentPathD" class="nano-morph-svg-path" />
        </svg>
      </slot>
    </div>

    <Teleport v-if="isMounted" to="body">
      <div
        v-if="isMorphing && ghostBox"
        class="nano-morph-portal-ghost"
        :style="ghostInlineStyle"
        aria-hidden="true"
      >
        <img
          v-if="freezeDataUrl"
          :src="freezeDataUrl"
          alt=""
          class="nano-morph-freeze-layer"
          :style="{ opacity: ghostBox.sourceOpacity }"
        />
        <div
          class="nano-morph-ghost-shimmer"
          :style="{ opacity: Math.max(0.18, 1 - Math.abs(easedProgress - 0.5) * 1.4) }"
        ></div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.nano-morph-root {
  position: relative;
  display: inline-block;
  max-width: 100%;
}

.nano-morph-root.is-expanded {
  display: block;
}

.nano-morph-surface {
  transition: opacity 0.14s ease;
}

.nano-morph-surface.is-ghosted {
  opacity: 0.18;
}

.nano-morph-vector-stage {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.nano-morph-svg {
  width: 100%;
  max-width: 240px;
  height: auto;
  cursor: pointer;
}

.nano-morph-svg-path {
  fill: rgba(99, 102, 241, 0.22);
  stroke: var(--nano-accent-primary, #6366f1);
  stroke-width: 2;
  stroke-linejoin: round;
}

.nano-morph-portal-ghost {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  overflow: hidden;
  box-sizing: border-box;
  border: 1px solid var(--nano-accent-primary, rgba(99, 102, 241, 0.55));
  background: var(--nano-bg-card, rgba(15, 23, 42, 0.86));
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.36);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  will-change: left, top, width, height, border-radius, opacity;
}

.nano-morph-freeze-layer {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.nano-morph-ghost-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.2) 0%,
    rgba(16, 185, 129, 0.12) 100%
  );
}
</style>
