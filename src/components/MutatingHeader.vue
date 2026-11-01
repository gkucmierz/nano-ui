<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  /**
   * Scroll distance in pixels after which the header docks edge-to-edge
   */
  threshold: {
    type: Number,
    default: 24
  },
  /**
   * Scroll distance in pixels below which the header un-docks back into floating card
   */
  hysteresis: {
    type: Number,
    default: 8
  },
  /**
   * Optional custom scroll container selector (e.g. '.content-scroll') or HTMLElement.
   * If null, window scroll is monitored.
   */
  scrollContainer: {
    type: [String, Object],
    default: null
  },
  /**
   * Height of the header bar
   */
  height: {
    type: String,
    default: '60px'
  },
  /**
   * Floating margins when at the top
   */
  floatingMargin: {
    type: String,
    default: '12px 24px 0 24px'
  },
  /**
   * Floating border radius when at the top
   */
  floatingRadius: {
    type: String,
    default: '16px'
  },
  /**
   * Border radius when stuck/docked. Default: undefined (falls back to CSS var --stuck-radius or '11px 11px 0 0').
   * Accepts e.g. 11, '11px' (auto-expanded to '11px 11px 0 0'), 0, '0px', or full 4-corner CSS string.
   * Can also be set/overridden via CSS variable `--stuck-radius`.
   */
  stuckRadius: {
    type: [String, Number],
    default: undefined
  },
  /**
   * Whether to enable backdrop blur glassmorphism
   */
  glassmorphism: {
    type: Boolean,
    default: true
  },
  /**
   * Controlled stuck state via v-model:stuck
   */
  stuck: {
    type: Boolean,
    default: undefined
  }
});

const emit = defineEmits(['update:stuck', 'stuck', 'unstick']);

const internalIsStuck = ref(false);

const isStuck = computed({
  get: () => (props.stuck !== undefined ? props.stuck : internalIsStuck.value),
  set: (val) => {
    internalIsStuck.value = val;
    emit('update:stuck', val);
    if (val) {
      emit('stuck');
    } else {
      emit('unstick');
    }
  }
});

const resolvedStuckRadius = computed(() => {
  if (props.stuckRadius === undefined || props.stuckRadius === null || props.stuckRadius === '') {
    return undefined;
  }
  if (props.stuckRadius === 0 || props.stuckRadius === '0' || props.stuckRadius === '0px') {
    return '0px';
  }
  if (typeof props.stuckRadius === 'number') {
    return `${props.stuckRadius}px ${props.stuckRadius}px 0 0`;
  }
  const str = String(props.stuckRadius).trim();
  const parts = str.split(/\s+/);
  if (parts.length === 1) {
    const num = parseFloat(parts[0]);
    if (!isNaN(num)) {
      if (num === 0) return '0px';
      const unit = parts[0].replace(/^[0-9.-]+/, '') || 'px';
      return `${num}${unit} ${num}${unit} 0 0`;
    }
  }
  return str;
});

let targetContainer = null;

const getScrollY = () => {
  if (targetContainer && targetContainer !== window) {
    return targetContainer.scrollTop || 0;
  }
  return window.scrollY || document.documentElement.scrollTop || 0;
};

const handleScroll = () => {
  const y = getScrollY();
  const stickThresh = props.threshold;
  const unstickThresh = props.hysteresis;

  if (!isStuck.value && y > stickThresh) {
    isStuck.value = true;
  } else if (isStuck.value && y < unstickThresh) {
    isStuck.value = false;
  }
};

const setupScrollListener = () => {
  cleanupScrollListener();

  if (typeof window === 'undefined') return;

  if (props.scrollContainer) {
    if (typeof props.scrollContainer === 'string') {
      targetContainer = document.querySelector(props.scrollContainer);
    } else if (props.scrollContainer instanceof HTMLElement) {
      targetContainer = props.scrollContainer;
    }
  }

  if (!targetContainer) {
    targetContainer = window;
  }

  targetContainer.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
};

const cleanupScrollListener = () => {
  if (targetContainer) {
    targetContainer.removeEventListener('scroll', handleScroll);
    targetContainer = null;
  }
};

watch(() => props.scrollContainer, () => {
  setupScrollListener();
});

onMounted(() => {
  setupScrollListener();
});

onUnmounted(() => {
  cleanupScrollListener();
});
</script>

<template>
  <header
    class="nano-mutating-header"
    :class="{
      'is-stuck': isStuck,
      'has-glassmorphism': glassmorphism
    }"
    :style="{
      '--header-height': height,
      '--floating-margin': floatingMargin,
      '--floating-radius': floatingRadius,
      '--stuck-radius': resolvedStuckRadius
    }"
  >
    <div class="header-inner">
      <!-- Left Slot (Brand, Logo, Back Action) -->
      <div v-if="$slots.left" class="header-left">
        <slot name="left" :is-stuck="isStuck" />
      </div>

      <!-- Center Slot (Metrics, Search, Navigation Tabs) -->
      <div v-if="$slots.center" class="header-center">
        <slot name="center" :is-stuck="isStuck" />
      </div>

      <!-- Right Slot (User profile, Actions, Theme Toggle) -->
      <div v-if="$slots.right" class="header-right">
        <slot name="right" :is-stuck="isStuck" />
      </div>

      <!-- Default Slot (Fallback for custom inner markup) -->
      <slot v-if="!$slots.left && !$slots.center && !$slots.right" :is-stuck="isStuck" />
    </div>
  </header>
</template>

<style scoped>
.nano-mutating-header {
  position: sticky;
  top: 0;
  z-index: 1000;
  height: var(--header-height, 60px);
  margin: var(--floating-margin, 12px 24px 0 24px);
  padding: 0 20px;
  border-radius: var(--floating-radius, 16px);
  border: 1px solid var(--nano-border-subtle, rgba(255, 255, 255, 0.1));
  display: flex;
  align-items: center;
  flex-shrink: 0;
  box-sizing: border-box;
  -webkit-user-select: none;
  user-select: none;
  box-shadow: var(--nano-shadow-card, 0 8px 24px -6px rgba(0, 0, 0, 0.45));
  background: var(--nano-bg-card, rgba(16, 22, 34, 0.85));
  color: var(--nano-text-main);
  will-change: margin, border-radius, border-color, padding, box-shadow;
  transition: margin var(--nano-transition-header),
              border-radius var(--nano-transition-header),
              border-color var(--nano-transition-interactive),
              padding var(--nano-transition-header),
              box-shadow var(--nano-transition-header),
              background-color var(--nano-transition-interactive);
}

.nano-mutating-header.has-glassmorphism {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.nano-mutating-header.is-stuck {
  margin: var(--stuck-margin, 0);
  border-radius: var(--stuck-radius, 11px 11px 0 0);
  border-color: transparent transparent var(--nano-border-subtle, rgba(255, 255, 255, 0.1)) transparent;
  padding: 0 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}

.header-inner {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex-shrink: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.header-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}
</style>
