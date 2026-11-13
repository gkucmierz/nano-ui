<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted, useId } from 'vue';
import NanoFlag from './NanoFlag.vue';
import { tooltipDirective as vTooltip } from '../directives/tooltip.js';
import { normalizeLangOptions, resolveLangMeta } from '../utils/langFlags.js';
import {
  navigateGrid,
  detectRenderedGridColumns,
  resolveAdaptiveMatrixColumns,
} from '../utils/grid.js';
import { clampFloatingBox2D } from '../utils/selectPositioning.js';

const hasDomWindow = () => Boolean(globalThis.window);
const hasDomDocument = () => Boolean(globalThis.document);

const props = defineProps({
  /**
   * Active ISO 639-1 language code (`v-model`).
   */
  modelValue: {
    type: String,
    default: 'pl',
  },
  /**
   * Supported languages array (`['pl', 'en', ...]` or objects `{ code, nativeLabel, short }`).
   * - `<= 2` languages: 1-click direct toggle (`PL <-> EN`).
   * - `>= 3` languages: opens adaptive Desktop/Tablet 2D Matrix (`navigateGrid`) or Mobile Vertical Dropdown List.
   */
  languages: {
    type: Array,
    default: () => ['pl', 'en'],
  },
  /**
   * Layout mode for `>= 3` languages:
   * - `'auto'` (default): 2D Matrix on desktop/tablet (`> mobileBreakpoint`), 1-column vertical list on mobile/portrait (`<= mobileBreakpoint`).
   * - `'matrix'`: always 2D matrix.
   * - `'list'`: always 1-column vertical list.
   */
  mode: {
    type: String,
    default: 'auto',
    validator: (v) => ['auto', 'matrix', 'list'].includes(v),
  },
  /**
   * Optional explicit column count for matrix mode (`0` = auto-balanced via `resolveAdaptiveMatrixColumns`, e.g. `4x2` for 8 langs).
   */
  columns: {
    type: Number,
    default: 0,
  },
  /**
   * Viewport width threshold (px) below which `'auto'` switches from 2D Matrix to sleek Mobile Vertical List.
   */
  mobileBreakpoint: {
    type: Number,
    default: 640,
  },
  /**
   * Uniform SPA topbar pixel height (`36` or `38` per `.agents/rules/05-ui-ux-and-css.md`).
   */
  height: {
    type: Number,
    default: 36,
  },
  /**
   * Show vector `<NanoFlag>` inside the topbar trigger button.
   */
  showFlag: {
    type: Boolean,
    default: true,
  },
  /**
   * Keyboard shortcut badge text inside trigger (pass `''` to hide). Automatically hidden on mobile & coarse touch tablets.
   */
  shortcutKey: {
    type: String,
    default: 'L',
  },
  /**
   * Localized tooltip string (never hardcode `'PL/EN'` when `languages.length >= 3`).
   */
  tooltip: {
    type: String,
    default: '',
  },
  /**
   * Optional panel header title shown inside the multi-language popover.
   */
  panelTitle: {
    type: String,
    default: '',
  },
  /**
   * Theme override (`'auto'` inherits `[data-theme]` / `.light` / `.theme-light`; `'dark'` or `'light'` pins explicitly).
   */
  theme: {
    type: String,
    default: 'auto',
    validator: (v) => ['auto', 'dark', 'light'].includes(v),
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'change', 'open', 'close']);

const listboxId = `nano-lang-listbox-${useId()}`;
const rootRef = ref(null);
const triggerBtnRef = ref(null);
const panelRef = ref(null);
const optionsContainerRef = ref(null);
const optionRefs = ref([]);

const isOpen = ref(false);
const focusedIndex = ref(0);
const viewportWidth = ref(hasDomWindow() ? window.innerWidth : 1280);
const viewportHeight = ref(hasDomWindow() ? window.innerHeight : 800);
const panelPosition = ref({ top: 48, left: 12 });
const isDocumentLight = ref(false);

const normalizedLanguages = computed(() => normalizeLangOptions(props.languages));
const isMultiPicker = computed(() => normalizedLanguages.value.length >= 3);

const activeMeta = computed(() => {
  const code = String(props.modelValue || 'pl').trim().toLowerCase();
  return (
    normalizedLanguages.value.find((item) => item.code === code) ||
    resolveLangMeta(code)
  );
});

const resolvedThemeIsLight = computed(() => {
  if (props.theme === 'light') return true;
  if (props.theme === 'dark') return false;
  return isDocumentLight.value;
});

const isMobileList = computed(() => {
  if (props.mode === 'list') return true;
  if (props.mode === 'matrix') return false;
  return viewportWidth.value <= props.mobileBreakpoint;
});

const resolvedMatrixColumns = computed(() => {
  if (isMobileList.value) return 1;
  if (props.columns >= 1) return Math.floor(props.columns);
  return resolveAdaptiveMatrixColumns(normalizedLanguages.value.length, { maxCols: 4 });
});

const resolvedTooltip = computed(() => {
  if (props.tooltip) return props.tooltip;
  if (!isMultiPicker.value) {
    const pair = normalizedLanguages.value.map((l) => l.short).join('/');
    return props.modelValue === 'pl'
      ? `Przełącz język ${pair}${props.shortcutKey ? ` (${props.shortcutKey})` : ''}`
      : `Toggle language ${pair}${props.shortcutKey ? ` (${props.shortcutKey})` : ''}`;
  }
  return props.modelValue === 'pl'
    ? `Wybierz język · ${activeMeta.value.nativeLabel}${props.shortcutKey ? ` (${props.shortcutKey})` : ''}`
    : `Language · ${activeMeta.value.nativeLabel}${props.shortcutKey ? ` (${props.shortcutKey})` : ''}`;
});

// WCAG 2.5.3 Label in Name: accessible name MUST begin with exact visible button text (short code + shortcutKey).
const triggerAriaLabel = computed(() => {
  const visiblePrefix = props.shortcutKey
    ? `${activeMeta.value.short} ${props.shortcutKey}`
    : activeMeta.value.short;
  return `${visiblePrefix} — ${resolvedTooltip.value}`;
});

function syncDocumentThemeState() {
  if (!hasDomDocument()) return;
  const root = document.documentElement;
  const body = document.body;
  const dataTheme = root.getAttribute('data-theme') || body?.getAttribute('data-theme') || '';
  isDocumentLight.value =
    dataTheme === 'light' ||
    root.classList.contains('light') ||
    root.classList.contains('theme-light') ||
    Boolean(rootRef.value?.closest?.('.theme-light, .light, [data-theme="light"]'));
}

function syncViewportMetrics() {
  if (!hasDomWindow()) return;
  viewportWidth.value = window.innerWidth || 1280;
  viewportHeight.value = window.innerHeight || 800;
  if (isOpen.value) {
    updatePanelPosition();
  }
}

function updatePanelPosition() {
  if (!isOpen.value || !triggerBtnRef.value || !hasDomWindow()) return;
  syncDocumentThemeState();

  const trigRect = triggerBtnRef.value.getBoundingClientRect();
  const vw = window.innerWidth || 1280;
  const vh = window.innerHeight || 800;

  const estWidth = isMobileList.value
    ? Math.min(vw - 16, 268)
    : Math.min(vw - 16, resolvedMatrixColumns.value * 116 + 24);
  const actualWidth = panelRef.value?.offsetWidth || estWidth;
  const actualHeight =
    panelRef.value?.offsetHeight ||
    (isMobileList.value
      ? Math.min(360, normalizedLanguages.value.length * 46 + 20)
      : Math.ceil(normalizedLanguages.value.length / resolvedMatrixColumns.value) * 60 + 28);

  // Right-align to the trigger button by default (since language pills sit at top-right of headers)
  const rawLeft = trigRect.right - actualWidth;
  const preferAbove =
    trigRect.bottom + 6 + actualHeight > vh - 8 && trigRect.top - 6 - actualHeight >= 8;
  const rawTop = preferAbove ? trigRect.top - 6 - actualHeight : trigRect.bottom + 6;

  const clamped = clampFloatingBox2D(
    {
      left: rawLeft,
      top: rawTop,
      width: actualWidth,
      height: actualHeight,
    },
    {
      left: 0,
      top: 0,
      right: vw,
      bottom: vh,
    },
    8
  );

  panelPosition.value = {
    left: Math.round(clamped.left),
    top: Math.round(clamped.top),
  };
}

function focusOptionAt(idx) {
  const list = normalizedLanguages.value;
  if (!list.length) return;
  const clamped = Math.max(0, Math.min(list.length - 1, idx));
  focusedIndex.value = clamped;
  nextTick(() => {
    const el = optionRefs.value[clamped];
    if (el && el.focus) {
      el.focus({ preventScroll: false });
    }
  });
}

function open() {
  if (props.disabled || !isMultiPicker.value) return;
  syncViewportMetrics();
  syncDocumentThemeState();
  const curIdx = normalizedLanguages.value.findIndex(
    (item) => item.code === activeMeta.value.code
  );
  focusedIndex.value = curIdx >= 0 ? curIdx : 0;
  isOpen.value = true;
  updatePanelPosition();
  emit('open');
  nextTick(() => {
    updatePanelPosition();
    focusOptionAt(focusedIndex.value);
  });
}

function close({ restoreFocus = false } = {}) {
  if (!isOpen.value) return;
  isOpen.value = false;
  emit('close');
  if (restoreFocus) {
    nextTick(() => {
      triggerBtnRef.value?.focus?.();
    });
  }
}

function selectLanguage(code) {
  if (props.disabled) return;
  const nextMeta =
    normalizedLanguages.value.find((item) => item.code === code) ||
    resolveLangMeta(code);
  emit('update:modelValue', nextMeta.code);
  emit('change', nextMeta.code);
  close({ restoreFocus: true });
}

function cycle() {
  if (props.disabled) return;
  const list = normalizedLanguages.value;
  if (!list.length) return;
  const curIdx = list.findIndex((item) => item.code === activeMeta.value.code);
  const nextIdx = curIdx >= 0 ? (curIdx + 1) % list.length : 0;
  const nextCode = list[nextIdx].code;
  emit('update:modelValue', nextCode);
  emit('change', nextCode);
}

function toggle() {
  if (props.disabled) return;
  if (!isMultiPicker.value) {
    cycle();
    return;
  }
  if (isOpen.value) {
    close({ restoreFocus: true });
  } else {
    open();
  }
}

function resolveLiveGridColumns() {
  if (isMobileList.value) return 1;
  if (optionsContainerRef.value) {
    const measured = detectRenderedGridColumns(
      optionsContainerRef.value,
      '.nano-lang-option'
    );
    if (measured >= 1) return measured;
  }
  return resolvedMatrixColumns.value;
}

function onTriggerKeydown(e) {
  if (props.disabled || !isMultiPicker.value) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    e.stopPropagation();
    open();
  } else if (e.key === 'Escape' && isOpen.value) {
    e.preventDefault();
    e.stopPropagation();
    close({ restoreFocus: true });
  }
}

function onPanelKeydown(e) {
  if (!isOpen.value) return;
  const total = normalizedLanguages.value.length;
  if (total <= 0) return;

  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    close({ restoreFocus: true });
    return;
  }

  if (
    e.key === 'ArrowRight' ||
    e.key === 'ArrowLeft' ||
    e.key === 'ArrowDown' ||
    e.key === 'ArrowUp'
  ) {
    e.preventDefault();
    e.stopPropagation();
    const cols = resolveLiveGridColumns();
    const nextIdx = navigateGrid(focusedIndex.value, total, e.key, cols, {
      wrap: true,
    });
    if (nextIdx >= 0) {
      focusOptionAt(nextIdx);
    }
    return;
  }

  if (e.key === 'Home') {
    e.preventDefault();
    e.stopPropagation();
    focusOptionAt(0);
    return;
  }

  if (e.key === 'End') {
    e.preventDefault();
    e.stopPropagation();
    focusOptionAt(total - 1);
  }
}

function onDocumentPointerDown(e) {
  if (!isOpen.value) return;
  const target = e.target;
  if (rootRef.value?.contains?.(target)) return;
  if (panelRef.value?.contains?.(target)) return;
  close({ restoreFocus: false });
}

watch(
  () => props.theme,
  () => syncDocumentThemeState()
);

onMounted(() => {
  syncViewportMetrics();
  syncDocumentThemeState();
  if (hasDomWindow()) {
    window.addEventListener('resize', syncViewportMetrics, { passive: true });
    window.addEventListener('scroll', updatePanelPosition, { capture: true, passive: true });
  }
  if (hasDomDocument()) {
    document.addEventListener('pointerdown', onDocumentPointerDown);
  }
});

onUnmounted(() => {
  if (hasDomWindow()) {
    window.removeEventListener('resize', syncViewportMetrics);
    window.removeEventListener('scroll', updatePanelPosition, { capture: true });
  }
  if (hasDomDocument()) {
    document.removeEventListener('pointerdown', onDocumentPointerDown);
  }
});

defineExpose({
  open,
  close,
  toggle,
  cycle,
  isOpen,
  isMobileList,
  normalizedLanguages,
  resolvedMatrixColumns,
  resolveLiveGridColumns,
});
</script>

<template>
  <div
    ref="rootRef"
    class="nano-lang-picker"
    :class="{ 'is-light': resolvedThemeIsLight, 'is-open': isOpen }"
  >
    <button
      ref="triggerBtnRef"
      type="button"
      class="nano-lang-trigger"
      :class="{ active: isOpen }"
      :style="{ height: `${height}px` }"
      :disabled="disabled"
      :aria-label="triggerAriaLabel"
      :aria-haspopup="isMultiPicker ? 'listbox' : undefined"
      :aria-expanded="isMultiPicker ? isOpen : undefined"
      :aria-controls="isMultiPicker && isOpen ? listboxId : undefined"
      v-tooltip="!isOpen ? resolvedTooltip : ''"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      <NanoFlag v-if="showFlag" :lang="activeMeta" :size="16" />
      <span class="nano-lang-code">{{ activeMeta.short }}</span>
      <svg
        v-if="isMultiPicker"
        class="nano-lang-chevron"
        :class="{ 'is-open': isOpen }"
        viewBox="0 0 12 12"
        width="10"
        height="10"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M2.5 4.5L6 8l3.5-3.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <kbd v-if="shortcutKey" class="nano-lang-kbd">{{ shortcutKey }}</kbd>
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen && isMultiPicker"
        ref="panelRef"
        class="nano-lang-panel"
        :class="{
          'is-light': resolvedThemeIsLight,
          'is-mobile-list': isMobileList,
          'is-desktop-matrix': !isMobileList,
        }"
        :style="{
          top: `${panelPosition.top}px`,
          left: `${panelPosition.left}px`,
          '--nano-lang-cols': String(resolvedMatrixColumns),
        }"
        @keydown="onPanelKeydown"
      >
        <div v-if="panelTitle" class="nano-lang-panel-head">
          <span class="nano-lang-panel-title">{{ panelTitle }}</span>
          <span class="nano-lang-panel-count">{{ normalizedLanguages.length }}</span>
        </div>

        <div
          :id="listboxId"
          ref="optionsContainerRef"
          role="listbox"
          :aria-label="panelTitle || resolvedTooltip"
          class="nano-lang-options"
          :class="isMobileList ? 'layout-list' : 'layout-matrix'"
        >
          <button
            v-for="(opt, idx) in normalizedLanguages"
            :key="opt.code"
            :ref="(el) => { optionRefs[idx] = el; }"
            type="button"
            role="option"
            class="nano-lang-option"
            :class="{
              'is-selected': opt.code === activeMeta.code,
              'is-focused': idx === focusedIndex,
            }"
            :aria-selected="opt.code === activeMeta.code"
            :tabindex="idx === focusedIndex ? 0 : -1"
            @mouseenter="focusedIndex = idx"
            @focus="focusedIndex = idx"
            @click.stop="selectLanguage(opt.code)"
          >
            <span class="nano-lang-opt-top">
              <NanoFlag :lang="opt" :size="isMobileList ? 20 : 19" />
              <span
                v-if="isMobileList"
                :lang="opt.code"
                class="nano-lang-native"
              >{{ opt.nativeLabel }}</span>
              <span class="nano-lang-iso-pill">{{ opt.short }}</span>
              <svg
                v-if="opt.code === activeMeta.code"
                class="nano-lang-check"
                viewBox="0 0 14 14"
                width="13"
                height="13"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2.6 7.3L5.6 10.3L11.4 3.9"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            <span
              v-if="!isMobileList"
              :lang="opt.code"
              class="nano-lang-native matrix-native"
            >{{ opt.nativeLabel }}</span>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.nano-lang-picker {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.nano-lang-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 10px;
  box-sizing: border-box;
  line-height: 1;
  border-radius: 9px;
  border: 1px solid var(--border, rgba(148, 163, 184, 0.22));
  background: var(--bg-elevated, rgba(30, 41, 59, 0.65));
  color: var(--text-main, #f1f5f9);
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  -webkit-user-select: none;
  outline: none !important;
  transition:
    background-color 140ms ease,
    border-color 140ms ease,
    color 140ms ease;
}

.nano-lang-picker.is-light .nano-lang-trigger {
  background: var(--bg-elevated, #f8fafc);
  border-color: var(--border, rgba(15, 23, 42, 0.16));
  color: var(--text-main, #0f172a);
}

/* Stationary :hover obeying CSS-HOVER-01 (zero translateY / scale flicker) */
.nano-lang-trigger:hover:not(:disabled),
.nano-lang-trigger:focus-visible {
  border-color: var(--accent, #38bdf8);
  background: rgba(56, 189, 248, 0.13);
}

.nano-lang-picker.is-light .nano-lang-trigger:hover:not(:disabled),
.nano-lang-picker.is-light .nano-lang-trigger:focus-visible {
  border-color: var(--accent, #0284c7);
  background: rgba(2, 132, 199, 0.09);
}

.nano-lang-trigger.active {
  border-color: var(--accent, #38bdf8);
  background: rgba(56, 189, 248, 0.18);
  color: #38bdf8;
}

.nano-lang-picker.is-light .nano-lang-trigger.active {
  border-color: #0284c7;
  background: rgba(2, 132, 199, 0.12);
  color: #0369a1;
}

.nano-lang-code {
  font-weight: 700;
  letter-spacing: 0.03em;
}

.nano-lang-chevron {
  opacity: 0.75;
  transition: transform 150ms ease;
}

.nano-lang-chevron.is-open {
  transform: rotate(180deg);
}

.nano-lang-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 4px;
  font-size: 0.66rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 700;
  line-height: 1;
  background: rgba(15, 23, 42, 0.52);
  border: 1px solid rgba(148, 163, 184, 0.24);
  color: var(--text-muted, #94a3b8);
}

.nano-lang-picker.is-light .nano-lang-kbd {
  background: #e2e8f0;
  border-color: rgba(15, 23, 42, 0.16);
  color: #334155;
}

@media (max-width: 768px) {
  .nano-lang-kbd {
    display: none;
  }
  .nano-lang-trigger {
    padding: 0 8px;
  }
}

@media (min-width: 769px) and (max-width: 1180px) and (pointer: coarse) {
  .nano-lang-kbd {
    display: none;
  }
}

.nano-lang-panel {
  position: fixed;
  z-index: 12000;
  box-sizing: border-box;
  border-radius: 14px;
  padding: 8px;
  background: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.28);
  box-shadow:
    0 18px 42px rgba(2, 6, 23, 0.62),
    0 4px 12px rgba(2, 6, 23, 0.35);
  color: #f1f5f9;
  user-select: none;
  -webkit-user-select: none;
}

.nano-lang-panel.is-light {
  background: #ffffff;
  border-color: rgba(15, 23, 42, 0.16);
  box-shadow:
    0 18px 40px rgba(15, 23, 42, 0.16),
    0 4px 12px rgba(15, 23, 42, 0.08);
  color: #0f172a;
}

.nano-lang-panel.is-desktop-matrix {
  width: min(calc(100dvw - 16px), calc(var(--nano-lang-cols, 4) * 116px + 18px));
}

.nano-lang-panel.is-mobile-list {
  width: min(calc(100dvw - 16px), 268px);
}

.nano-lang-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 6px 7px;
  margin-bottom: 6px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}

.nano-lang-panel.is-light .nano-lang-panel-head {
  border-bottom-color: rgba(15, 23, 42, 0.1);
}

.nano-lang-panel-title {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #94a3b8;
}

.nano-lang-panel.is-light .nano-lang-panel-title {
  color: #475569;
}

.nano-lang-panel-count {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}

.nano-lang-panel.is-light .nano-lang-panel-count {
  background: rgba(2, 132, 199, 0.12);
  color: #0369a1;
}

/* Desktop & Tablet: 2D Matrix Grid */
.nano-lang-options.layout-matrix {
  display: grid;
  grid-template-columns: repeat(var(--nano-lang-cols, 4), minmax(0, 1fr));
  gap: 6px;
}

/* Mobile / Portrait: Sleek Scrollable Vertical Dropdown List */
.nano-lang-options.layout-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-block-size: min(68dvh, 380px);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.nano-lang-option {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  min-inline-size: 0;
  padding: 8px 9px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(30, 41, 59, 0.56);
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  outline: none !important;
  transition:
    background-color 120ms ease,
    border-color 120ms ease;
}

.nano-lang-options.layout-list .nano-lang-option {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  min-block-size: 44px;
  padding: 8px 11px;
}

.nano-lang-panel.is-light .nano-lang-option {
  background: #f8fafc;
  border-color: rgba(15, 23, 42, 0.1);
}

/* Stationary hover & keyboard focus (>= 3:1 contrast border) */
.nano-lang-option:hover,
.nano-lang-option.is-focused,
.nano-lang-option:focus-visible {
  background: rgba(56, 189, 248, 0.14);
  border-color: #38bdf8;
}

.nano-lang-panel.is-light .nano-lang-option:hover,
.nano-lang-panel.is-light .nano-lang-option.is-focused,
.nano-lang-panel.is-light .nano-lang-option:focus-visible {
  background: rgba(2, 132, 199, 0.08);
  border-color: #0284c7;
}

/* Multi-cue selected state: border + tint + checkmark */
.nano-lang-option.is-selected {
  background: rgba(244, 63, 94, 0.16);
  border-color: #fb7185;
}

.nano-lang-panel.is-light .nano-lang-option.is-selected {
  background: rgba(225, 29, 72, 0.09);
  border-color: #be123c;
}

.nano-lang-opt-top {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  min-inline-size: 0;
}

.nano-lang-iso-pill {
  font-size: 0.68rem;
  font-weight: 800;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  letter-spacing: 0.04em;
  color: #cbd5e1;
}

.nano-lang-options.layout-list .nano-lang-iso-pill {
  margin-inline-start: auto;
  padding: 2px 6px;
  border-radius: 5px;
  background: rgba(15, 23, 42, 0.48);
}

.nano-lang-panel.is-light .nano-lang-iso-pill {
  color: #334155;
}

.nano-lang-panel.is-light .nano-lang-options.layout-list .nano-lang-iso-pill {
  background: #e2e8f0;
}

.nano-lang-check {
  margin-inline-start: auto;
  flex-shrink: 0;
  color: #fb7185;
}

.nano-lang-options.layout-list .nano-lang-check {
  margin-inline-start: 4px;
}

.nano-lang-panel.is-light .nano-lang-check {
  color: #be123c;
}

.nano-lang-native {
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.2;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nano-lang-native.matrix-native {
  font-size: 0.76rem;
  color: #e2e8f0;
}

.nano-lang-panel.is-light .nano-lang-native.matrix-native {
  color: #1e293b;
}
</style>
