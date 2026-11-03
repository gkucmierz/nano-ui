<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import NanoIcon from './NanoIcon.vue';
import { currentLang } from '../locales.js';
import {
  findSafeSelectMount,
  computeSelectDropdownLayout,
  getPositionedReferenceEl,
} from '../utils/selectPositioning.js';

const normalizeSearchText = (str) => {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const props = defineProps({
  /**
   * Selected value (String | Number | null) or Array of values when `multiple` is true
   */
  modelValue: {
    type: [String, Number, Array],
    default: null,
  },
  /**
   * Options array: strings/numbers or objects `{ value, label, labelPl?, labelEn?, description?, icon?, badge?, color?, group?, disabled? }`
   */
  options: {
    type: Array,
    default: () => [],
  },
  /**
   * Enable multi-selection mode (v-model as Array)
   */
  multiple: {
    type: Boolean,
    default: false,
  },
  /**
   * Show search/filter input inside the dropdown
   */
  searchable: {
    type: Boolean,
    default: true,
  },
  /**
   * Show clear (×) button when a selection is active
   */
  clearable: {
    type: Boolean,
    default: false,
  },
  /**
   * Disable the select control
   */
  disabled: {
    type: Boolean,
    default: false,
  },
  /**
   * Size preset matching Nano inputs: 'sm' | 'md' | 'lg'
   */
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  /**
   * Validation status: 'normal' | 'error' | 'success'
   */
  status: {
    type: String,
    default: 'normal',
    validator: (v) => ['normal', 'error', 'success'].includes(v),
  },
  /**
   * Ecosystem color theme preset:
   * 'indigo' (default) | 'emerald' (Governance/Health) | 'cyan' (Telemetry/Dashboard) |
   * 'amber' (Finance/Gold) | 'rose' (Crimson/Alert) | 'violet' | 'slate'
   */
  color: {
    type: String,
    default: 'indigo',
    validator: (v) => ['indigo', 'emerald', 'cyan', 'amber', 'rose', 'violet', 'slate'].includes(v),
  },
  /**
   * Placeholder when nothing is selected
   */
  placeholder: {
    type: String,
    default: '',
  },
  /**
   * Placeholder inside the search input
   */
  searchPlaceholder: {
    type: String,
    default: '',
  },
  /**
   * Empty state message when no options match the filter query
   */
  emptyText: {
    type: String,
    default: '',
  },
  /**
   * Optional custom filter predicate: (optionObj, rawQuery) => boolean
   */
  filterFn: {
    type: Function,
    default: null,
  },
  /**
   * Optional explicit language override ('en' | 'pl')
   */
  lang: {
    type: String,
    default: '',
  },
  /**
   * Maximum height of the scrollable options list in px
   */
  maxDropdownHeight: {
    type: Number,
    default: 260,
  },
  /**
   * Enable Smart DOM Ancestor Traversal (Option 2) & Adaptive 4-Mode Screen Clamping (Option 3)
   */
  smartPositioning: {
    type: Boolean,
    default: true,
  },
  /**
   * Configurable margin (px) between the open dropdown and the top/bottom/side edges
   * of the visible screen (aligns with Nano UI 8px quantum scale: 8, 16, 24, 32)
   */
  viewportMargin: {
    type: Number,
    default: 8,
  },
});

const emit = defineEmits(['update:modelValue', 'change', 'open', 'close', 'search', 'clear']);

const isOpen = ref(false);
const filterText = ref('');
const focusedIndex = ref(0);
const rootRef = ref(null);
const dropdownRef = ref(null);
const optionsListRef = ref(null);
const searchInputRef = ref(null);
const mountTarget = ref(null);
const dropdownLayout = ref({
  placement: 'bottom',
  optionsMaxHeight: 260,
  top: null,
  left: 0,
  minWidth: null,
  maxWidth: 360,
  spaceBelow: 300,
  spaceAbove: 300,
  screenHeight: 768,
  edgeMargin: 8,
  topMarginPx: 8,
  bottomMarginPx: 8,
  escapedScrollers: 0,
});

const activeLang = computed(() => props.lang || currentLang.value || 'en');

const resolvedPlaceholder = computed(() => {
  if (props.placeholder) return props.placeholder;
  return activeLang.value === 'pl' ? 'Wybierz opcję...' : 'Select option...';
});

const resolvedSearchPlaceholder = computed(() => {
  if (props.searchPlaceholder) return props.searchPlaceholder;
  return activeLang.value === 'pl' ? 'Filtruj opcje...' : 'Filter options...';
});

const resolvedEmptyText = computed(() => {
  if (props.emptyText) return props.emptyText;
  return activeLang.value === 'pl' ? 'Brak pasujących wyników.' : 'No matching options.';
});

const normalizedOptions = computed(() => {
  return (props.options || []).map((item) => {
    if (item !== null && typeof item === 'object') {
      const val = item.value !== undefined ? item.value : item.id;
      const lbl = activeLang.value === 'pl'
        ? (item.labelPl || item.label || String(val ?? ''))
        : (item.labelEn || item.label || String(val ?? ''));
      return {
        ...item,
        value: val,
        resolvedLabel: lbl,
      };
    }
    return {
      value: item,
      label: String(item ?? ''),
      resolvedLabel: String(item ?? ''),
    };
  });
});

const isOptionSelected = (val) => {
  if (props.multiple) {
    return Array.isArray(props.modelValue) && props.modelValue.includes(val);
  }
  return props.modelValue === val;
};

const selectedOptionsList = computed(() => {
  if (props.multiple) {
    const arr = Array.isArray(props.modelValue) ? props.modelValue : [];
    return normalizedOptions.value.filter((o) => arr.includes(o.value));
  }
  const found = normalizedOptions.value.find((o) => o.value === props.modelValue);
  return found ? [found] : [];
});

const hasSelection = computed(() => {
  if (props.multiple) {
    return Array.isArray(props.modelValue) && props.modelValue.length > 0;
  }
  return props.modelValue !== null && props.modelValue !== undefined && props.modelValue !== '';
});

const filteredOptions = computed(() => {
  const rawQuery = filterText.value.trim();
  if (!rawQuery) return normalizedOptions.value;

  if (typeof props.filterFn === 'function') {
    return normalizedOptions.value.filter((opt) => props.filterFn(opt, rawQuery));
  }

  const normQuery = normalizeSearchText(rawQuery);
  return normalizedOptions.value.filter((opt) => {
    const haystack = normalizeSearchText(
      `${opt.resolvedLabel || ''} ${opt.label || ''} ${opt.labelPl || ''} ${opt.labelEn || ''} ${opt.description || ''} ${opt.badge || ''} ${opt.group || ''} ${opt.value ?? ''}`
    );
    return haystack.includes(normQuery);
  });
});

function updateDropdownPosition(measureActual = false) {
  if (!isOpen.value || !rootRef.value || typeof window === 'undefined') return;

  if (!props.smartPositioning) {
    mountTarget.value = null;
    dropdownLayout.value = {
      placement: 'bottom',
      optionsMaxHeight: props.maxDropdownHeight,
      top: null,
      left: 0,
      minWidth: null,
      maxWidth: 360,
      spaceBelow: 0,
      spaceAbove: 0,
      screenHeight: window.innerHeight || 768,
      escapedScrollers: 0,
    };
    return;
  }

  const desiredHeight =
    (props.searchable ? 41 : 0) +
    Math.min(props.maxDropdownHeight, Math.max(46, filteredOptions.value.length * 42 + 12));

  const { mountEl, viewportEl, escapedScrollers } = findSafeSelectMount(rootRef.value, desiredHeight);
  mountTarget.value = mountEl || null;

  const triggerRect = rootRef.value.getBoundingClientRect();
  const screenRect = viewportEl
    ? viewportEl.getBoundingClientRect()
    : {
        top: 0,
        left: 0,
        right: window.innerWidth || 1024,
        bottom: window.innerHeight || 768,
      };

  let mountRect = null;
  let mountScrollLeft = 0;
  let mountScrollTop = 0;

  if (mountEl) {
    const refEl = getPositionedReferenceEl(mountEl) || mountEl;
    const rawRefRect = refEl.getBoundingClientRect();
    mountRect = {
      top: rawRefRect.top + (refEl.clientTop || 0),
      left: rawRefRect.left + (refEl.clientLeft || 0),
    };
    const isDocRoot = typeof document !== 'undefined' && refEl === document.documentElement;
    mountScrollLeft = isDocRoot ? 0 : (refEl.scrollLeft || 0);
    mountScrollTop = isDocRoot ? 0 : (refEl.scrollTop || 0);
  }

  const actualDropdownHeight =
    measureActual && dropdownRef.value && dropdownRef.value.offsetHeight > 0
      ? dropdownRef.value.offsetHeight
      : null;

  const actualChromeHeight =
    measureActual &&
    dropdownRef.value &&
    optionsListRef.value &&
    dropdownRef.value.offsetHeight > 0 &&
    optionsListRef.value.offsetHeight >= 0
      ? Math.max(2, dropdownRef.value.offsetHeight - optionsListRef.value.offsetHeight)
      : null;

  const optionsScrollHeight =
    measureActual && optionsListRef.value && optionsListRef.value.scrollHeight > 0
      ? optionsListRef.value.scrollHeight
      : null;

  const layout = computeSelectDropdownLayout({
    triggerRect,
    screenRect,
    mountRect,
    mountScrollLeft,
    mountScrollTop,
    searchable: props.searchable,
    optionsCount: Math.max(1, filteredOptions.value.length),
    maxDropdownHeight: props.maxDropdownHeight,
    actualDropdownHeight,
    actualChromeHeight,
    optionsScrollHeight,
    edgeMargin: props.viewportMargin,
  });

  dropdownLayout.value = {
    ...layout,
    escapedScrollers,
  };
}

const dropdownInlineStyle = computed(() => {
  if (!props.smartPositioning || dropdownLayout.value.top === null) {
    return {};
  }
  return {
    top: `${dropdownLayout.value.top}px`,
    left: `${dropdownLayout.value.left}px`,
    minWidth: dropdownLayout.value.minWidth ? `${dropdownLayout.value.minWidth}px` : undefined,
    maxWidth: dropdownLayout.value.maxWidth ? `${dropdownLayout.value.maxWidth}px` : undefined,
  };
});

function onWindowScrollOrResize(e) {
  if (!isOpen.value) return;
  if (e && e.type === 'scroll' && dropdownRef.value && dropdownRef.value.contains(e.target)) {
    return;
  }
  updateDropdownPosition(true);
}

function attachViewportListeners() {
  if (typeof window === 'undefined') return;
  window.addEventListener('scroll', onWindowScrollOrResize, { capture: true, passive: true });
  window.addEventListener('resize', onWindowScrollOrResize, { passive: true });
}

function detachViewportListeners() {
  if (typeof window === 'undefined') return;
  window.removeEventListener('scroll', onWindowScrollOrResize, { capture: true });
  window.removeEventListener('resize', onWindowScrollOrResize);
}

function openDropdown() {
  if (props.disabled) return;
  isOpen.value = true;
  filterText.value = '';
  const firstSelectedIdx = filteredOptions.value.findIndex((o) => isOptionSelected(o.value) && !o.disabled);
  const firstEnabledIdx = filteredOptions.value.findIndex((o) => !o.disabled);
  focusedIndex.value = firstSelectedIdx >= 0 ? firstSelectedIdx : Math.max(0, firstEnabledIdx);
  updateDropdownPosition(false);
  attachViewportListeners();
  emit('open');
  nextTick(() => {
    updateDropdownPosition(true);
    if (props.searchable && searchInputRef.value) {
      searchInputRef.value.focus();
    }
  });
}

function closeDropdown() {
  if (!isOpen.value) return;
  isOpen.value = false;
  filterText.value = '';
  detachViewportListeners();
  emit('close');
}

function toggleDropdown() {
  if (props.disabled) return;
  if (isOpen.value) closeDropdown();
  else openDropdown();
}

function selectOption(opt) {
  if (!opt || opt.disabled || props.disabled) return;

  if (props.multiple) {
    const current = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
    const idx = current.indexOf(opt.value);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(opt.value);
    }
    emit('update:modelValue', current);
    emit('change', current);
  } else {
    emit('update:modelValue', opt.value);
    emit('change', opt.value);
    closeDropdown();
  }
}

function removeChip(val) {
  if (props.disabled || !props.multiple) return;
  const current = Array.isArray(props.modelValue) ? props.modelValue.filter((v) => v !== val) : [];
  emit('update:modelValue', current);
  emit('change', current);
}

function clearSelection() {
  if (props.disabled) return;
  const emptyVal = props.multiple ? [] : null;
  emit('update:modelValue', emptyVal);
  emit('change', emptyVal);
  emit('clear');
}

function moveFocus(step) {
  const list = filteredOptions.value;
  const len = list.length;
  if (len === 0) return;

  let nextIdx = focusedIndex.value;
  for (let i = 0; i < len; i++) {
    nextIdx = (nextIdx + step + len) % len;
    if (!list[nextIdx]?.disabled) {
      focusedIndex.value = nextIdx;
      return;
    }
  }
}

function onKeydown(e) {
  if (props.disabled) return;
  if (!isOpen.value) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      openDropdown();
    }
    return;
  }

  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    closeDropdown();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    moveFocus(1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    moveFocus(-1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const target = filteredOptions.value[focusedIndex.value];
    if (target && !target.disabled) {
      selectOption(target);
    }
  }
}

function onSearchInput() {
  const firstEnabled = filteredOptions.value.findIndex((o) => !o.disabled);
  focusedIndex.value = Math.max(0, firstEnabled);
  emit('search', filterText.value);
  nextTick(() => {
    updateDropdownPosition(true);
  });
}

watch(
  [
    () => props.options.length,
    () => props.maxDropdownHeight,
    () => props.smartPositioning,
    () => props.viewportMargin,
  ],
  () => {
    if (isOpen.value) {
      nextTick(() => updateDropdownPosition(true));
    }
  }
);

function onDocumentMouseDown(e) {
  if (!isOpen.value || !rootRef.value) return;
  const insideTrigger = rootRef.value.contains(e.target);
  const insideDropdown = dropdownRef.value && dropdownRef.value.contains(e.target);
  if (!insideTrigger && !insideDropdown) {
    closeDropdown();
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('mousedown', onDocumentMouseDown);
  }
});

onUnmounted(() => {
  detachViewportListeners();
  if (typeof document !== 'undefined') {
    document.removeEventListener('mousedown', onDocumentMouseDown);
  }
});

defineExpose({
  open: openDropdown,
  close: closeDropdown,
  toggle: toggleDropdown,
  clear: clearSelection,
  selectOption,
  updateDropdownPosition,
  isOpen,
  filterText,
  filteredOptions,
  selectedOptionsList,
  dropdownLayout,
  mountTarget,
});
</script>

<template>
  <div
    ref="rootRef"
    class="nano-select"
    :class="[
      `is-${size}`,
      `is-${status}`,
      `is-color-${color}`,
      {
        'is-open': isOpen,
        'is-disabled': disabled,
        'is-multiple': multiple,
      },
    ]"
    @keydown="onKeydown"
  >
    <!-- Trigger Button -->
    <div
      role="combobox"
      :tabindex="disabled ? -1 : 0"
      class="nano-select-trigger"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      :aria-disabled="disabled"
      @click="toggleDropdown"
    >
      <slot name="trigger" :selected="selectedOptionsList" :is-open="isOpen">
        <!-- Multi-select pills -->
        <div v-if="multiple && selectedOptionsList.length > 0" class="nano-select-pills">
          <span
            v-for="item in selectedOptionsList"
            :key="item.value"
            class="nano-select-pill"
          >
            <span v-if="item.color" class="nano-select-dot" :style="{ background: item.color }" />
            <span>{{ item.resolvedLabel }}</span>
            <button
              type="button"
              class="nano-select-pill-remove"
              :aria-label="`Remove ${item.resolvedLabel}`"
              @click.stop="removeChip(item.value)"
            >
              ×
            </button>
          </span>
        </div>

        <!-- Single-select value -->
        <div v-else-if="!multiple && selectedOptionsList.length > 0" class="nano-select-single">
          <span
            v-if="selectedOptionsList[0].color"
            class="nano-select-dot"
            :style="{ background: selectedOptionsList[0].color }"
          />
          <NanoIcon
            v-if="selectedOptionsList[0].icon"
            :name="selectedOptionsList[0].icon"
            :size="15"
            class="nano-select-opt-icon"
          />
          <span class="nano-select-value-text">{{ selectedOptionsList[0].resolvedLabel }}</span>
          <span v-if="selectedOptionsList[0].badge" class="nano-select-badge">
            {{ selectedOptionsList[0].badge }}
          </span>
        </div>

        <!-- Placeholder -->
        <span v-else class="nano-select-placeholder">
          {{ resolvedPlaceholder }}
        </span>
      </slot>

      <div class="nano-select-actions">
        <button
          v-if="clearable && hasSelection && !disabled"
          type="button"
          class="nano-select-clear"
          aria-label="Clear selection"
          @click.stop="clearSelection"
        >
          ×
        </button>

        <svg
          class="nano-select-chevron"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>

    <!-- Dropdown Popover (Smart Ancestor Mount + 4-Mode Viewport Clamp) -->
    <Teleport :to="mountTarget || 'body'" :disabled="!mountTarget">
      <transition name="nano-select-pop">
        <div
          v-if="isOpen"
          ref="dropdownRef"
          class="nano-select-dropdown"
          :class="[
            `is-color-${color}`,
            `is-placement-${dropdownLayout.placement}`,
            { 'is-teleported': Boolean(mountTarget) },
          ]"
          :data-placement="dropdownLayout.placement"
          :data-color="color"
          :style="dropdownInlineStyle"
          role="listbox"
          :aria-multiselectable="multiple"
          @keydown="onKeydown"
        >
          <!-- Search Input Bar -->
          <div v-if="searchable" class="nano-select-search-bar">
            <svg
              class="nano-select-search-icon"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref="searchInputRef"
              v-model="filterText"
              type="text"
              class="nano-select-search-input"
              :placeholder="resolvedSearchPlaceholder"
              @input="onSearchInput"
              @click.stop
            />
            <button
              v-if="filterText"
              type="button"
              class="nano-select-search-clear"
              aria-label="Clear filter"
              @click.stop="filterText = ''; onSearchInput()"
            >
              ×
            </button>
          </div>

          <!-- Options List -->
          <div
            ref="optionsListRef"
            class="nano-select-options nano-scrollbar"
            :style="{ maxHeight: `${dropdownLayout.optionsMaxHeight || maxDropdownHeight}px` }"
          >
            <button
              v-for="(opt, idx) in filteredOptions"
              :key="opt.value"
              type="button"
              role="option"
              class="nano-select-option"
              :class="{
                'is-selected': isOptionSelected(opt.value),
                'is-focused': idx === focusedIndex,
                'is-disabled': opt.disabled,
              }"
              :disabled="opt.disabled"
              :aria-selected="isOptionSelected(opt.value)"
              @mouseenter="!opt.disabled && (focusedIndex = idx)"
              @click.stop="selectOption(opt)"
            >
              <slot
                name="option"
                :option="opt"
                :selected="isOptionSelected(opt.value)"
                :focused="idx === focusedIndex"
              >
                <span
                  class="nano-select-check"
                  :class="{ active: isOptionSelected(opt.value) }"
                >
                  <svg
                    v-if="isOptionSelected(opt.value)"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>

                <span
                  v-if="opt.color"
                  class="nano-select-dot"
                  :style="{ background: opt.color }"
                />

                <NanoIcon
                  v-if="opt.icon"
                  :name="opt.icon"
                  :size="15"
                  class="nano-select-opt-icon"
                />

                <div class="nano-select-opt-body">
                  <div class="nano-select-opt-row">
                    <span class="nano-select-opt-label">{{ opt.resolvedLabel }}</span>
                    <span v-if="opt.badge" class="nano-select-badge">{{ opt.badge }}</span>
                  </div>
                  <span v-if="opt.description" class="nano-select-opt-desc">
                    {{ opt.description }}
                  </span>
                </div>
              </slot>
            </button>

            <div v-if="filteredOptions.length === 0" class="nano-select-empty">
              <slot name="empty" :query="filterText">
                {{ resolvedEmptyText }}
              </slot>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.nano-select {
  position: relative;
  width: 100%;
  user-select: none;
  -webkit-user-select: none;
  font-family: var(--nano-font-sans, -apple-system, BlinkMacSystemFont, sans-serif);
}

/* Color Theme Presets (applied on both trigger wrapper & teleported dropdown) */
.nano-select.is-color-emerald,
.nano-select-dropdown.is-color-emerald {
  --nano-accent-primary: #10b981;
  --nano-bg-sidebar: #0a141d;
}

.nano-select.is-color-cyan,
.nano-select-dropdown.is-color-cyan {
  --nano-accent-primary: #06b6d4;
  --nano-bg-sidebar: #091520;
}

.nano-select.is-color-amber,
.nano-select-dropdown.is-color-amber {
  --nano-accent-primary: #f59e0b;
  --nano-bg-sidebar: #18130a;
}

.nano-select.is-color-rose,
.nano-select-dropdown.is-color-rose {
  --nano-accent-primary: #f43f5e;
  --nano-bg-sidebar: #1a0d12;
}

.nano-select.is-color-violet,
.nano-select-dropdown.is-color-violet {
  --nano-accent-primary: #a855f7;
  --nano-bg-sidebar: #150d21;
}

.nano-select.is-color-slate,
.nano-select-dropdown.is-color-slate {
  --nano-accent-primary: #94a3b8;
  --nano-bg-sidebar: #111827;
}

.nano-select-trigger {
  width: 100%;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 10px;
  background: var(--nano-bg-muted, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.14));
  border-radius: var(--nano-radius-md, 8px);
  color: var(--nano-text-main, #f8fafc);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  box-sizing: border-box;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}

.nano-select.is-sm .nano-select-trigger {
  min-height: 32px;
  padding: 4px 10px;
  font-size: 0.8rem;
  border-radius: var(--nano-radius-sm, 6px);
}

.nano-select.is-lg .nano-select-trigger {
  min-height: 44px;
  padding: 8px 14px;
  font-size: 0.92rem;
  border-radius: var(--nano-radius-md, 10px);
}

.nano-select-trigger:hover:not([aria-disabled="true"]),
.nano-select.is-open .nano-select-trigger {
  border-color: var(--nano-accent-primary, #6366f1);
  background: var(--nano-bg-card, rgba(255, 255, 255, 0.07));
}

.nano-select.is-open .nano-select-trigger {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--nano-accent-primary, #6366f1) 24%, transparent);
}

.nano-select.is-error .nano-select-trigger {
  border-color: var(--nano-status-danger, #f87171);
}

.nano-select.is-success .nano-select-trigger {
  border-color: var(--nano-status-success, #4ade80);
}

.nano-select.is-disabled {
  opacity: 0.48;
  pointer-events: none;
}

.nano-select-single {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.nano-select-value-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nano-select-placeholder {
  color: var(--nano-text-muted, #94a3b8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.nano-select-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  flex: 1;
  min-width: 0;
}

.nano-select-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 0.75rem;
  font-weight: 600;
  background: color-mix(in srgb, var(--nano-accent-primary, #6366f1) 18%, transparent);
  color: var(--nano-text-main, #f8fafc);
  border: 1px solid color-mix(in srgb, var(--nano-accent-primary, #6366f1) 35%, transparent);
}

.nano-select-pill-remove {
  border: none;
  background: transparent;
  color: var(--nano-text-muted, #94a3b8);
  font-size: 0.85rem;
  line-height: 1;
  padding: 0 1px;
  cursor: pointer;
}

.nano-select-pill-remove:hover {
  color: var(--nano-status-danger, #f87171);
}

.nano-select-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.nano-select-clear {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: var(--nano-bg-hover, rgba(255, 255, 255, 0.1));
  color: var(--nano-text-muted, #94a3b8);
  font-size: 0.85rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}

.nano-select-clear:hover {
  color: var(--nano-text-main, #f8fafc);
  background: color-mix(in srgb, var(--nano-status-danger, #f87171) 25%, transparent);
}

.nano-select-chevron {
  color: var(--nano-text-muted, #94a3b8);
  transition: transform 0.18s ease, color 0.18s ease;
}

.nano-select.is-open .nano-select-chevron {
  transform: rotate(180deg);
  color: var(--nano-accent-primary, #6366f1);
}

.nano-select-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 100%;
  width: max-content;
  max-width: min(360px, 90vw);
  z-index: 80;
  background: var(--nano-bg-sidebar, #18181b);
  border: 1px solid var(--nano-accent-primary, #6366f1);
  border-radius: var(--nano-radius-md, 10px);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.42);
  overflow: hidden;
  box-sizing: border-box;
  user-select: none;
  -webkit-user-select: none;
  font-family: var(--nano-font-sans, -apple-system, BlinkMacSystemFont, sans-serif);
}

.nano-select-dropdown.is-teleported {
  z-index: 160;
}

.nano-select-dropdown.is-placement-overlap {
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.56), 0 0 0 1px color-mix(in srgb, var(--nano-accent-primary, #6366f1) 45%, transparent);
}

.nano-select-search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--nano-bg-muted, rgba(255, 255, 255, 0.04));
  border-bottom: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.1));
}

.nano-select-search-icon {
  color: var(--nano-accent-primary, #6366f1);
  flex-shrink: 0;
}

.nano-select-search-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--nano-text-main, #f8fafc);
  font-size: 0.82rem;
  font-family: inherit;
}

.nano-select-search-clear {
  border: none;
  background: transparent;
  color: var(--nano-text-muted, #94a3b8);
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1;
  padding: 0 2px;
}

.nano-select-options {
  overflow-y: auto;
  padding: 5px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nano-select-option {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 9px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: var(--nano-text-secondary, #cbd5e1);
  font-size: 0.83rem;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}

.nano-select-option.is-focused,
.nano-select-option:hover:not(.is-disabled) {
  background: var(--nano-bg-hover, rgba(255, 255, 255, 0.08));
  color: var(--nano-text-main, #f8fafc);
}

.nano-select-option.is-selected {
  background: color-mix(in srgb, var(--nano-accent-primary, #6366f1) 14%, transparent);
  border-color: color-mix(in srgb, var(--nano-accent-primary, #6366f1) 38%, transparent);
  color: var(--nano-text-main, #f8fafc);
  font-weight: 600;
}

.nano-select-option.is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.nano-select-check {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.2));
  background: var(--nano-bg-muted, rgba(255, 255, 255, 0.04));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #ffffff;
}

.nano-select-check.active {
  background: var(--nano-accent-primary, #6366f1);
  border-color: var(--nano-accent-primary, #6366f1);
}

.nano-select-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

.nano-select-opt-icon {
  color: var(--nano-accent-primary, #818cf8);
  flex-shrink: 0;
}

.nano-select-opt-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.nano-select-opt-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.nano-select-opt-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.nano-select-opt-desc {
  font-size: 0.72rem;
  color: var(--nano-text-muted, #94a3b8);
  font-weight: 400;
}

.nano-select-badge {
  font-family: var(--nano-font-mono, ui-monospace, monospace);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--nano-accent-primary, #6366f1) 16%, transparent);
  color: var(--nano-accent-primary, #818cf8);
  border: 1px solid color-mix(in srgb, var(--nano-accent-primary, #6366f1) 30%, transparent);
  flex-shrink: 0;
}

.nano-select-empty {
  padding: 14px 10px;
  text-align: center;
  font-size: 0.8rem;
  color: var(--nano-text-muted, #94a3b8);
}

.nano-select-pop-enter-active,
.nano-select-pop-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.nano-select-pop-enter-from,
.nano-select-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
