<script setup>
import { ref, computed } from 'vue';
import NanoIcon from './NanoIcon.vue';

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  items: {
    type: Array,
    default: () => [],
  },
  variant: {
    type: String,
    default: 'docked', // 'docked' | 'segmented'
  },
  size: {
    type: String,
    default: 'md', // 'sm' | 'md' | 'lg'
  },
  fullWidth: {
    type: Boolean,
    default: undefined,
  },
  countFormat: {
    type: String,
    default: 'auto', // 'auto' | 'parens' | 'badge'
  },
  ariaLabel: {
    type: String,
    default: 'Navigation tabs',
  },
});

const emit = defineEmits(['update:modelValue', 'change']);

const tabButtonRefs = ref([]);

const normalizedItems = computed(() =>
  (props.items || []).map((raw, idx) => {
    if (raw && typeof raw === 'object') {
      const id = raw.id !== undefined ? raw.id : raw.value !== undefined ? raw.value : String(idx);
      return {
        ...raw,
        id,
        label: raw.label ?? String(id),
        count: raw.count,
        badge: raw.badge,
        icon: raw.icon || '',
        disabled: Boolean(raw.disabled),
        tooltip: raw.tooltip || '',
      };
    }
    return {
      id: String(raw),
      label: String(raw),
      count: undefined,
      badge: undefined,
      icon: '',
      disabled: false,
      tooltip: '',
    };
  })
);

const isFullWidth = computed(() =>
  props.fullWidth !== undefined ? props.fullWidth : props.variant === 'docked'
);

const resolvedCountFormat = computed(() => {
  if (props.countFormat === 'parens' || props.countFormat === 'badge') {
    return props.countFormat;
  }
  return props.variant === 'docked' ? 'parens' : 'badge';
});

const selectTab = (item) => {
  if (!item || item.disabled) return;
  if (item.id !== props.modelValue) {
    emit('update:modelValue', item.id);
    emit('change', item.id, item);
  }
};

const handleKeydown = (e, index) => {
  const list = normalizedItems.value;
  const enabledIndices = list
    .map((item, idx) => (item.disabled ? -1 : idx))
    .filter((idx) => idx >= 0);

  if (enabledIndices.length <= 1) return;

  const pos = enabledIndices.indexOf(index);
  if (pos === -1) return;

  let nextEnabledPos = -1;
  if (e.key === 'ArrowRight') {
    nextEnabledPos = (pos + 1) % enabledIndices.length;
  } else if (e.key === 'ArrowLeft') {
    nextEnabledPos = (pos - 1 + enabledIndices.length) % enabledIndices.length;
  } else if (e.key === 'Home') {
    nextEnabledPos = 0;
  } else if (e.key === 'End') {
    nextEnabledPos = enabledIndices.length - 1;
  }

  if (nextEnabledPos >= 0) {
    e.preventDefault();
    const targetIdx = enabledIndices[nextEnabledPos];
    const targetItem = list[targetIdx];
    selectTab(targetItem);
    const btn = tabButtonRefs.value[targetIdx];
    if (btn && typeof btn.focus === 'function') {
      btn.focus();
    }
  }
};
</script>

<template>
  <div
    class="nano-tabs"
    :class="[
      `nano-tabs--${variant}`,
      `nano-tabs--${size}`,
      { 'nano-tabs--full': isFullWidth }
    ]"
    role="tablist"
    :aria-label="ariaLabel"
  >
    <button
      v-for="(item, idx) in normalizedItems"
      :key="item.id"
      :ref="(el) => { if (el) tabButtonRefs[idx] = el }"
      type="button"
      role="tab"
      class="nano-tab-btn"
      :class="{
        'is-active': modelValue === item.id,
        'is-disabled': item.disabled
      }"
      :aria-selected="modelValue === item.id ? 'true' : 'false'"
      :aria-disabled="item.disabled ? 'true' : undefined"
      :tabindex="modelValue === item.id ? 0 : -1"
      :disabled="item.disabled"
      v-tooltip="item.tooltip || undefined"
      @click="selectTab(item)"
      @keydown="handleKeydown($event, idx)"
    >
      <slot name="tab" :item="item" :active="modelValue === item.id">
        <slot name="icon" :item="item" :active="modelValue === item.id">
          <NanoIcon
            v-if="item.icon"
            :name="item.icon"
            :size="size === 'sm' ? 13 : size === 'lg' ? 16 : 14"
            class="nano-tab-icon"
          />
        </slot>
        <span class="nano-tab-label">
          {{ item.label }}<template v-if="item.count !== undefined && resolvedCountFormat === 'parens'"> ({{ item.count }})</template>
        </span>
        <span
          v-if="item.count !== undefined && resolvedCountFormat === 'badge'"
          class="nano-tab-count"
        >
          {{ item.count }}
        </span>
        <span v-if="item.badge" class="nano-tab-badge">
          {{ item.badge }}
        </span>
      </slot>
    </button>
  </div>
</template>

<style scoped>
.nano-tabs {
  display: inline-flex;
  align-items: center;
  user-select: none;
  box-sizing: border-box;
}

.nano-tabs--full {
  display: flex;
  width: 100%;
}

/* ========================================================================== */
/* VARIANT 1: DOCKED TABS (md-viewer / KBE sidebar & panel headers)           */
/* ========================================================================== */
.nano-tabs--docked {
  background: var(--nano-bg-surface-secondary, rgba(15, 23, 42, 0.72));
  border-bottom: 1px solid var(--nano-border-subtle, rgba(148, 163, 184, 0.16));
}

:root[data-theme='light'] .nano-tabs--docked,
.light .nano-tabs--docked {
  background: var(--nano-bg-surface-secondary, #f8fafc);
  border-bottom-color: var(--nano-border-subtle, #e2e8f0);
}

.nano-tabs--docked .nano-tab-btn {
  flex: 1;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--nano-text-muted, #94a3b8);
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  outline: none;
  transition:
    color var(--nano-duration-fast, 150ms) ease,
    background-color var(--nano-duration-fast, 150ms) ease,
    border-color var(--nano-duration-fast, 150ms) ease;
}

:root[data-theme='light'] .nano-tabs--docked .nano-tab-btn,
.light .nano-tabs--docked .nano-tab-btn {
  color: var(--nano-text-muted, #64748b);
}

.nano-tabs--docked .nano-tab-btn:hover:not(.is-disabled) {
  color: var(--nano-text-primary, #f8fafc);
  background: rgba(148, 163, 184, 0.06);
}

:root[data-theme='light'] .nano-tabs--docked .nano-tab-btn:hover:not(.is-disabled),
.light .nano-tabs--docked .nano-tab-btn:hover:not(.is-disabled) {
  color: var(--nano-text-primary, #0f172a);
  background: rgba(15, 23, 42, 0.04);
}

.nano-tabs--docked .nano-tab-btn.is-active {
  color: var(--nano-accent-primary, #6366f1);
  border-bottom-color: var(--nano-accent-primary, #6366f1);
  background: rgba(99, 102, 241, 0.08);
}

:root[data-theme='light'] .nano-tabs--docked .nano-tab-btn.is-active,
.light .nano-tabs--docked .nano-tab-btn.is-active {
  color: var(--nano-accent-primary, #4f46e5);
  border-bottom-color: var(--nano-accent-primary, #4f46e5);
  background: rgba(79, 70, 229, 0.06);
}

/* ========================================================================== */
/* VARIANT 2: SEGMENTED PILL TABS (mem-index / nano-sound switcher)           */
/* ========================================================================== */
.nano-tabs--segmented {
  padding: 3px;
  gap: 3px;
  border-radius: 10px;
  background: var(--nano-bg-surface-secondary, rgba(30, 41, 59, 0.72));
  border: 1px solid var(--nano-border-subtle, rgba(148, 163, 184, 0.22));
}

:root[data-theme='light'] .nano-tabs--segmented,
.light .nano-tabs--segmented {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.nano-tabs--segmented .nano-tab-btn {
  flex: 0 1 auto;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--nano-text-muted, #94a3b8);
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  outline: none;
  white-space: nowrap;
  transition:
    color var(--nano-duration-fast, 150ms) ease,
    background-color var(--nano-duration-fast, 150ms) ease,
    box-shadow var(--nano-duration-fast, 150ms) ease;
}

.nano-tabs--segmented.nano-tabs--full .nano-tab-btn {
  flex: 1;
}

:root[data-theme='light'] .nano-tabs--segmented .nano-tab-btn,
.light .nano-tabs--segmented .nano-tab-btn {
  color: #475569;
}

.nano-tabs--segmented .nano-tab-btn:hover:not(.is-disabled):not(.is-active) {
  color: var(--nano-text-primary, #f8fafc);
  background: rgba(148, 163, 184, 0.08);
}

:root[data-theme='light'] .nano-tabs--segmented .nano-tab-btn:hover:not(.is-disabled):not(.is-active),
.light .nano-tabs--segmented .nano-tab-btn:hover:not(.is-disabled):not(.is-active) {
  color: #0f172a;
  background: rgba(15, 23, 42, 0.05);
}

.nano-tabs--segmented .nano-tab-btn.is-active {
  background: var(--nano-accent-primary, #4f46e5);
  color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.22);
}

:root[data-theme='light'] .nano-tabs--segmented .nano-tab-btn.is-active,
.light .nano-tabs--segmented .nano-tab-btn.is-active {
  background: var(--nano-accent-primary, #4f46e5);
  color: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
}

/* ========================================================================== */
/* SIZES & BADGES                                                             */
/* ========================================================================== */
.nano-tabs--sm.nano-tabs--docked .nano-tab-btn {
  height: 30px;
  padding: 0 10px;
  font-size: 11px;
}

.nano-tabs--md.nano-tabs--docked .nano-tab-btn {
  height: 38px;
  padding: 0 14px;
  font-size: 13px;
}

.nano-tabs--lg.nano-tabs--docked .nano-tab-btn {
  height: 46px;
  padding: 0 20px;
  font-size: 15px;
}

.nano-tabs--sm.nano-tabs--segmented {
  padding: 2px;
  gap: 2px;
  border-radius: 8px;
}

.nano-tabs--sm.nano-tabs--segmented .nano-tab-btn {
  height: 22px;
  padding: 0 8px;
  font-size: 11px;
  border-radius: 6px;
}

.nano-tabs--md.nano-tabs--segmented {
  padding: 3px;
  gap: 3px;
  border-radius: 10px;
}

.nano-tabs--md.nano-tabs--segmented .nano-tab-btn {
  height: 32px;
  padding: 0 14px;
  font-size: 13px;
  border-radius: 7px;
}

.nano-tabs--lg.nano-tabs--segmented {
  padding: 4px;
  gap: 4px;
  border-radius: 12px;
}

.nano-tabs--lg.nano-tabs--segmented .nano-tab-btn {
  height: 42px;
  padding: 0 20px;
  font-size: 15px;
  border-radius: 9px;
}

.nano-tab-btn.is-disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.nano-tab-icon {
  flex-shrink: 0;
}

.nano-tab-count {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85em;
  padding: 1px 5px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  opacity: 0.9;
}

.nano-tab-btn.is-active .nano-tab-count {
  background: rgba(255, 255, 255, 0.22);
}

.nano-tab-badge {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.78em;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.18);
  color: #38bdf8;
}
</style>
