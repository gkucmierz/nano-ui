<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import NanoIcon from './NanoIcon.vue';
import {
  getScopedStorageController,
  normalizeStorageMode,
  STORAGE_MODES,
} from '../utils/storage-controller.js';

const tabsStorageCtrl = getScopedStorageController('nano-ui');

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  items: {
    type: Array,
    default: () => [],
  },
  tabs: {
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
  /**
   * Storage backend mode when `storageKey` is provided:
   * - `'ss'` (default for tabs): sessionStorage (`window.sessionStorage`)
   * - `'ls'`: localStorage (`window.localStorage`)
   * - `'none'` | `false`: disable persistence
   */
  storage: {
    type: [String, Boolean],
    default: 'ss',
  },
  /**
   * Optional application-level prefix override (e.g. `'dashboard-app'` -> `'DA_NU_<storageKey>'`).
   */
  appPrefix: {
    type: String,
    default: '',
  },
  /**
   * Optional storage key for persisting the active tab across reloads.
   */
  storageKey: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue', 'change']);

const tabButtonRefs = ref([]);

const resolvedStorageMode = computed(() => {
  if (!props.storageKey) return STORAGE_MODES.NONE;
  return normalizeStorageMode(props.storage, STORAGE_MODES.SS);
});

const isStorageEnabled = computed(
  () => Boolean(props.storageKey) && resolvedStorageMode.value !== STORAGE_MODES.NONE
);

const resolvedStorageKey = computed(() => {
  if (!props.storageKey) return '';
  return tabsStorageCtrl.resolveKey(props.storageKey, {
    appPrefix: props.appPrefix || undefined,
  });
});

const normalizedItems = computed(() => {
  const source = Array.isArray(props.items) && props.items.length > 0 ? props.items : (props.tabs || []);
  return source.map((raw, idx) => {
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
  });
});

const isFullWidth = computed(() =>
  props.fullWidth !== undefined ? props.fullWidth : resolvedVariant.value === 'docked'
);

const resolvedVariant = computed(() => {
  if (props.variant === 'pills' || props.variant === 'segmented') {
    return 'segmented';
  }
  return 'docked';
});

const resolvedCountFormat = computed(() => {
  if (props.countFormat === 'parens' || props.countFormat === 'badge') {
    return props.countFormat;
  }
  return resolvedVariant.value === 'docked' ? 'parens' : 'badge';
});

const saveActiveTab = (tabId) => {
  if (!isStorageEnabled.value) return;
  tabsStorageCtrl.set(
    props.storageKey,
    { activeTab: tabId },
    {
      mode: resolvedStorageMode.value,
      appPrefix: props.appPrefix || undefined,
    }
  );
};

const loadSavedTab = () => {
  if (!isStorageEnabled.value) return;
  const saved = tabsStorageCtrl.get(props.storageKey, null, {
    mode: resolvedStorageMode.value,
    appPrefix: props.appPrefix || undefined,
  });
  const candidateId =
    saved && typeof saved === 'object' && saved.activeTab !== undefined
      ? saved.activeTab
      : typeof saved === 'string' || typeof saved === 'number'
        ? saved
        : null;

  if (candidateId === null || candidateId === undefined) return;
  const matched = normalizedItems.value.find(
    (item) => !item.disabled && String(item.id) === String(candidateId)
  );
  if (matched && matched.id !== props.modelValue) {
    emit('update:modelValue', matched.id);
  }
};

const selectTab = (item) => {
  if (!item || item.disabled) return;
  saveActiveTab(item.id);
  if (item.id !== props.modelValue) {
    emit('update:modelValue', item.id);
    emit('change', item.id, item);
  }
};

onMounted(() => {
  loadSavedTab();
});

onUnmounted(() => {
  tabButtonRefs.value = [];
});

watch(
  () => [props.storageKey, props.storage, props.appPrefix],
  () => {
    loadSavedTab();
  }
);

defineExpose({
  resolvedStorageKey,
  resolvedStorageMode,
  loadSavedTab,
  saveActiveTab,
});

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
      `nano-tabs--${resolvedVariant}`,
      `nano-tabs--${size}`,
      { 'nano-tabs--full': isFullWidth }
    ]"
    role="tablist"
    :aria-label="ariaLabel"
  >
    <button
      v-for="(item, idx) in normalizedItems"
      :key="item.id"
      :ref="(el) => { if (el) tabButtonRefs[idx] = el; else delete tabButtonRefs[idx]; }"
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
  flex-wrap: wrap;
  align-items: center;
  max-width: 100%;
  user-select: none;
  box-sizing: border-box;
}

.nano-tabs--full {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  max-width: 100%;
}

/* ========================================================================== */
/* VARIANT 1: DOCKED TABS (md-viewer / KBE sidebar & panel headers)           */
/* ========================================================================== */
.nano-tabs--docked {
  background: var(--nano-tabs-docked-bg, rgba(15, 23, 42, 0.72));
  border-bottom: 1px solid var(--nano-tabs-docked-border, var(--nano-border-subtle, rgba(148, 163, 184, 0.16)));
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

.nano-tabs--docked .nano-tab-btn:hover:not(.is-disabled) {
  color: var(--nano-text-main, #f8fafc);
  background: var(--nano-tabs-docked-hover-bg, rgba(148, 163, 184, 0.06));
}

.nano-tabs--docked .nano-tab-btn.is-active {
  color: var(--nano-accent-primary, #6366f1);
  border-bottom-color: var(--nano-accent-primary, #6366f1);
  background: var(--nano-tabs-docked-active-bg, rgba(99, 102, 241, 0.08));
}

/* ========================================================================== */
/* VARIANT 2: SEGMENTED PILL TABS (mem-index / nano-sound switcher)           */
/* ========================================================================== */
.nano-tabs--segmented {
  padding: 3px;
  gap: 3px;
  border-radius: 10px;
  background: var(--nano-tabs-segmented-bg, rgba(30, 41, 59, 0.72));
  border: 1px solid var(--nano-tabs-segmented-border, rgba(148, 163, 184, 0.22));
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
  flex: 1 1 auto;
  min-width: max-content;
}

.nano-tabs--segmented .nano-tab-btn:hover:not(.is-disabled):not(.is-active) {
  color: var(--nano-text-main, #f8fafc);
  background: var(--nano-tabs-segmented-hover-bg, rgba(148, 163, 184, 0.08));
}

.nano-tabs--segmented .nano-tab-btn.is-active {
  background: var(--nano-accent-primary, #4f46e5);
  color: #ffffff;
  box-shadow: var(--nano-tabs-segmented-active-shadow, 0 1px 3px rgba(0, 0, 0, 0.22));
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
  background: var(--nano-tab-badge-bg, rgba(56, 189, 248, 0.18));
  color: var(--nano-tab-badge-color, #38bdf8);
  border: 1px solid var(--nano-tab-badge-border, rgba(56, 189, 248, 0.28));
}

.nano-tab-btn.is-active .nano-tab-badge {
  background: rgba(255, 255, 255, 0.22);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.35);
}
</style>
