<script setup>
import { ref, computed, watch, onMounted } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: undefined,
  },
  defaultOpen: {
    type: Boolean,
    default: true,
  },
  title: {
    type: String,
    default: '',
  },
  subtitle: {
    type: String,
    default: '',
  },
  badge: {
    type: [String, Number],
    default: '',
  },
  storageKey: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  compact: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'toggle']);

const readInitialOpenState = () => {
  if (props.modelValue !== undefined) {
    return Boolean(props.modelValue);
  }
  const win = globalThis.window;
  if (props.storageKey && win && win.localStorage) {
    try {
      const raw = win.localStorage.getItem(props.storageKey);
      if (raw === 'true' || raw === '1') return true;
      if (raw === 'false' || raw === '0') return false;
    } catch {}
  }
  return Boolean(props.defaultOpen);
};

const internalOpen = ref(readInitialOpenState());

watch(
  () => props.modelValue,
  (val) => {
    if (val !== undefined) {
      internalOpen.value = Boolean(val);
    }
  }
);

const isOpen = computed(() =>
  props.modelValue !== undefined ? Boolean(props.modelValue) : internalOpen.value
);

const persistState = (nextVal) => {
  const win = globalThis.window;
  if (props.storageKey && win && win.localStorage) {
    try {
      win.localStorage.setItem(props.storageKey, nextVal ? 'true' : 'false');
    } catch {}
  }
};

const setOpen = (nextVal) => {
  if (props.disabled) return;
  const normalized = Boolean(nextVal);
  internalOpen.value = normalized;
  persistState(normalized);
  emit('update:modelValue', normalized);
  emit('toggle', normalized);
};

const toggle = () => {
  setOpen(!isOpen.value);
};

onMounted(() => {
  if (props.modelValue === undefined && props.storageKey) {
    internalOpen.value = readInitialOpenState();
  }
});

defineExpose({
  isOpen,
  toggle,
  setOpen,
});
</script>

<template>
  <section
    class="nano-collapsible"
    :class="{
      'is-open': isOpen,
      'is-collapsed': !isOpen,
      'is-compact': compact,
      'is-disabled': disabled,
    }"
  >
    <div class="nano-collapsible-header-bar">
      <button
        type="button"
        class="nano-collapsible-trigger"
        :aria-expanded="isOpen ? 'true' : 'false'"
        :disabled="disabled"
        @click="toggle"
      >
        <span class="nano-collapsible-chevron" aria-hidden="true">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>

        <span class="nano-collapsible-title-group">
          <slot name="title">
            <span class="nano-collapsible-title">{{ title }}</span>
          </slot>
          <span v-if="subtitle" class="nano-collapsible-subtitle">{{ subtitle }}</span>
          <span
            v-if="badge !== '' && badge !== null && badge !== undefined"
            class="nano-collapsible-badge"
          >
            {{ badge }}
          </span>
        </span>

        <span
          v-if="!isOpen && $slots['summary-collapsed']"
          class="nano-collapsible-inline-preview"
          @click.stop
        >
          <slot name="summary-collapsed" />
        </span>
      </button>

      <div v-if="$slots.meta" class="nano-collapsible-meta">
        <slot name="meta" :is-open="isOpen" :toggle="toggle" />
      </div>
    </div>

    <div v-show="isOpen" class="nano-collapsible-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.nano-collapsible {
  flex-shrink: 0;
  border: 1px solid var(--nano-border-card, var(--color-border, rgba(148, 163, 184, 0.22)));
  border-radius: 10px;
  background: var(--nano-bg-muted, var(--nano-bg-card, rgba(15, 23, 42, 0.55)));
  overflow: hidden;
  transition: border-color 0.16s ease, background-color 0.16s ease;
}

.nano-collapsible.is-open {
  border-color: var(--nano-border-hover, var(--nano-border-card, rgba(148, 163, 184, 0.32)));
}

.nano-collapsible-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 38px;
  padding: 6px 12px;
  background: var(--nano-bg-card, rgba(148, 163, 184, 0.04));
}

.nano-collapsible.is-compact .nano-collapsible-header-bar {
  min-height: 34px;
  padding: 4px 10px;
}

.nano-collapsible-trigger {
  flex: 1;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
  border: none;
  background: transparent;
  color: var(--nano-text-main, var(--color-text-heading, #e2e8f0));
  font: inherit;
  text-align: left;
  cursor: pointer;
  user-select: none;
}

.nano-collapsible-trigger:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.nano-collapsible-chevron {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--nano-text-muted, var(--color-text-secondary, #94a3b8));
  background: var(--nano-status-neutral-bg, rgba(148, 163, 184, 0.1));
  transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), color 0.15s ease, background 0.15s ease;
  transform: rotate(-90deg);
}

.nano-collapsible.is-open .nano-collapsible-chevron {
  transform: rotate(0deg);
  color: var(--nano-status-info-text, #38bdf8);
  background: var(--nano-status-info-bg, rgba(56, 189, 248, 0.14));
}

.nano-collapsible-trigger:hover:not(:disabled) .nano-collapsible-chevron {
  color: var(--nano-status-info-text, #38bdf8);
}

.nano-collapsible-title-group {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  min-width: 0;
}

.nano-collapsible-title {
  font-size: 0.76rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--nano-text-main, #e2e8f0);
}

.nano-collapsible-subtitle {
  font-size: 0.7rem;
  color: var(--nano-text-muted, var(--color-text-secondary, #94a3b8));
}

.nano-collapsible-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 999px;
  font-family: var(--font-family-mono, monospace);
  font-size: 0.65rem;
  font-weight: 700;
  background: var(--nano-status-info-bg, rgba(56, 189, 248, 0.14));
  color: var(--nano-status-info-text, #38bdf8);
  border: 1px solid var(--nano-status-info-border, rgba(56, 189, 248, 0.3));
}

.nano-collapsible-inline-preview {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  margin-left: 4px;
}

.nano-collapsible-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  font-size: 0.7rem;
  color: var(--nano-text-muted, var(--color-text-secondary, #94a3b8));
}

.nano-collapsible-body {
  padding: 10px 12px;
  border-top: 1px solid var(--nano-border-subtle, var(--nano-border-card, rgba(148, 163, 184, 0.16)));
}

.nano-collapsible.is-compact .nano-collapsible-body {
  padding: 8px 10px;
}
</style>
