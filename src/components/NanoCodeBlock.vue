<script setup>
import { ref, computed, watch, useSlots } from 'vue';
import { highlightCode } from '../utils/syntax-highlighter.js';

const slots = useSlots();

const props = defineProps({
  /**
   * Title text displayed in the header (e.g. 'API Reference', 'Props & Events')
   */
  title: {
    type: String,
    default: '',
  },
  /**
   * Language badge label (e.g. 'vue', 'bash', 'js', 'json')
   */
  lang: {
    type: String,
    default: '',
  },
  /**
   * Raw code string if not passed via default slot
   */
  code: {
    type: String,
    default: '',
  },
  /**
   * Optional array of tabs: [{ id?: string, label: string, lang?: string, code?: string }]
   */
  tabs: {
    type: Array,
    default: () => [],
  },
  /**
   * Active tab index (v-model support)
   */
  modelValue: {
    type: Number,
    default: 0,
  },
  /**
   * Initial word-wrap state
   */
  defaultWrap: {
    type: Boolean,
    default: false,
  },
  /**
   * Whether to show the wrap toggle action button
   */
  allowWrap: {
    type: Boolean,
    default: true,
  },
  /**
   * Whether to show the copy action button
   */
  allowCopy: {
    type: Boolean,
    default: true,
  },
  /**
   * Optional max height with vertical scroll
   */
  maxHeight: {
    type: [Number, String],
    default: null,
  },
});

const emit = defineEmits(['update:wrap', 'update:modelValue', 'changeTab', 'copied']);

const isWrapped = ref(props.defaultWrap);
const copied = ref(false);
const preRef = ref(null);
let copyTimeout = null;

const currentTabIndex = ref(props.modelValue || 0);

watch(() => props.modelValue, (val) => {
  if (val !== undefined && val !== currentTabIndex.value) {
    currentTabIndex.value = val;
  }
});

const activeTab = computed(() => {
  if (!props.tabs || props.tabs.length === 0) return null;
  return props.tabs[currentTabIndex.value] || props.tabs[0];
});

const hasTabs = computed(() => Boolean(props.tabs && props.tabs.length > 0));

const currentLang = computed(() => {
  if (activeTab.value && activeTab.value.lang) return activeTab.value.lang;
  return props.lang;
});

const extractSlotText = (nodes) => {
  if (!nodes) return '';
  let str = '';
  for (const node of nodes) {
    if (node == null) continue;
    if (typeof node === 'string') {
      str += node;
    } else if (typeof node.children === 'string') {
      str += node.children;
    } else if (Array.isArray(node.children)) {
      str += extractSlotText(node.children);
    }
  }
  return str;
};

const rawSlotText = computed(() => {
  if (props.tabs && props.tabs.length > 0) return '';
  if (!slots.default) return '';
  const text = extractSlotText(slots.default());
  return text ? text.replace(/^\n+/, '').replace(/\s+$/, '') : '';
});

const currentCode = computed(() => {
  if (activeTab.value && activeTab.value.code !== undefined) return activeTab.value.code;
  if (props.code) return props.code;
  return rawSlotText.value;
});

const highlightedCode = computed(() => {
  if (!currentCode.value) return '';
  return highlightCode(currentCode.value, currentLang.value);
});

const selectTab = (idx) => {
  currentTabIndex.value = idx;
  emit('update:modelValue', idx);
  emit('changeTab', idx, props.tabs[idx]);
};

const toggleWrap = () => {
  isWrapped.value = !isWrapped.value;
  emit('update:wrap', isWrapped.value);
};

const copyCode = async () => {
  let textToCopy = currentCode.value;
  if (!textToCopy && preRef.value) {
    textToCopy = preRef.value.innerText || preRef.value.textContent || '';
  }

  if (!textToCopy) return;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(textToCopy);
    } else {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    copied.value = true;
    emit('copied', textToCopy);

    if (copyTimeout) clearTimeout(copyTimeout);
    copyTimeout = setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy code snippet:', err);
  }
};

const containerMaxHeight = computed(() => {
  if (!props.maxHeight) return undefined;
  return typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight;
});
</script>

<template>
  <div class="nano-code-block" :class="{ 'is-wrapped': isWrapped, 'has-tabs': hasTabs }">
    <div v-if="title || lang || hasTabs || $slots.header || allowWrap || allowCopy" class="code-block-header">
      <div class="code-block-title-group">
        <slot name="header">
          <div v-if="hasTabs" class="code-block-tabs">
            <button
              v-for="(tab, idx) in tabs"
              :key="tab.id || idx"
              type="button"
              class="code-tab-btn"
              :class="{ active: currentTabIndex === idx }"
              @click="selectTab(idx)"
            >
              {{ tab.label }}
            </button>
          </div>
          <span v-else-if="title" class="code-block-title">{{ title }}</span>
          <span v-if="!hasTabs && currentLang" class="code-block-lang">{{ currentLang }}</span>
        </slot>
      </div>

      <div class="code-block-actions">
        <span v-if="hasTabs && currentLang" class="code-block-lang">{{ currentLang }}</span>
        <button
          v-if="allowWrap"
          type="button"
          class="code-action-btn"
          :class="{ active: isWrapped }"
          @click="toggleWrap"
          :aria-label="isWrapped ? 'Unwrap lines (Scroll mode)' : 'Wrap lines (Word-wrap mode)'"
          v-tooltip="isWrapped ? 'Unwrap lines (Scroll)' : 'Wrap lines'"
        >
          <!-- Wrap icon -->
          <svg v-if="!isWrapped" class="action-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 10 4 15 9 20" />
            <path d="M20 4v7a4 4 0 0 1-4 4H4" />
          </svg>
          <!-- Unwrap / horizontal lines icon -->
          <svg v-else class="action-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <button
          v-if="allowCopy"
          type="button"
          class="code-action-btn"
          :class="{ copied: copied }"
          @click="copyCode"
          :aria-label="copied ? 'Copied to clipboard' : 'Copy code to clipboard'"
          v-tooltip="copied ? 'Copied!' : 'Copy code'"
        >
          <svg v-if="!copied" class="action-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <svg v-else class="action-svg success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>
    </div>

    <div class="code-block-body" :style="{ maxHeight: containerMaxHeight }">
      <pre ref="preRef" class="code-block-pre"><slot :name="activeTab?.id || `tab-${currentTabIndex}`"><code v-if="highlightedCode" class="nano-syntax-code" v-html="highlightedCode"></code><code v-else-if="currentCode">{{ currentCode }}</code><slot v-else /></slot></pre>
    </div>
  </div>
</template>

<style scoped>
.nano-code-block {
  display: flex;
  flex-direction: column;
  background: var(--nano-code-bg, var(--nano-bg-code, #0b1120));
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.12));
  border-radius: var(--nano-radius-md, 10px);
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  margin: var(--nano-space-md, 16px) 0;
  transition: var(--nano-transition-interactive, border-color 0.2s ease);
}

.nano-code-block:hover {
  border-color: var(--nano-border-hover, rgba(255, 255, 255, 0.22));
}

.code-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: var(--nano-code-header-bg, rgba(0, 0, 0, 0.25));
  border-bottom: 1px solid var(--nano-code-header-border, var(--nano-border-card, rgba(255, 255, 255, 0.08)));
  user-select: none;
  -webkit-user-select: none;
  gap: 12px;
  flex-shrink: 0;
}

.nano-code-block.has-tabs .code-block-header {
  height: 38px;
  padding: 0 10px 0 0;
  align-items: stretch;
}

.code-block-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.nano-code-block.has-tabs .code-block-title-group {
  height: 100%;
  align-items: stretch;
  gap: 0;
}

.code-block-tabs {
  display: flex;
  align-items: stretch;
  height: 100%;
  gap: 0;
  padding: 0;
  margin: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  user-select: none;
  -webkit-user-select: none;
}

.code-tab-btn {
  height: 100%;
  margin: 0;
  padding: 0 16px;
  border: none;
  border-right: 1px solid var(--nano-code-header-border, var(--nano-border-card, rgba(255, 255, 255, 0.08)));
  border-radius: 0;
  background: transparent;
  color: var(--nano-text-muted, #94a3b8);
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: none;
  outline: none !important;
  transition: var(--nano-transition-interactive, background 0.15s ease, color 0.15s ease);
  user-select: none;
  -webkit-user-select: none;
  line-height: 1;
  position: relative;
}

.code-tab-btn:hover:not(.active) {
  color: var(--nano-text-main, #f8fafc);
  background: var(--nano-bg-hover, rgba(255, 255, 255, 0.06));
}

.code-tab-btn.active {
  color: var(--nano-state-active, #00f2fe);
  background: var(--nano-code-bg, var(--nano-bg-code, #0b1120));
  font-weight: 700;
}

.code-tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--nano-state-active, #00f2fe);
}

.nano-code-block.has-tabs .code-block-actions {
  align-self: center;
}

.code-block-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--nano-text-main, #f8fafc);
  letter-spacing: 0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.code-block-lang {
  font-family: var(--font-mono, monospace);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--nano-state-active, #00f2fe);
  background: color-mix(in srgb, var(--nano-state-active, #00f2fe) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--nano-state-active, #00f2fe) 25%, transparent);
  padding: 1px 6px;
  border-radius: 4px;
  line-height: 1.2;
}

.code-block-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.code-action-btn {
  background: transparent;
  border: 1px solid transparent;
  color: var(--nano-text-muted, #94a3b8);
  cursor: pointer;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  outline: none;
  transition: var(--nano-transition-interactive, all 0.15s ease);
  user-select: none;
  -webkit-user-select: none;
}

.code-action-btn:hover {
  background: var(--nano-bg-hover, rgba(255, 255, 255, 0.08));
  color: var(--nano-text-main, #f8fafc);
  border-color: var(--nano-border-subtle, rgba(255, 255, 255, 0.1));
}

.code-action-btn:active {
  transform: scale(0.92);
}

.code-action-btn.active {
  color: var(--nano-state-active, #00f2fe);
  background: color-mix(in srgb, var(--nano-state-active, #00f2fe) 10%, transparent);
  border-color: color-mix(in srgb, var(--nano-state-active, #00f2fe) 25%, transparent);
}

.code-action-btn.copied {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
}

.action-svg {
  width: 14px;
  height: 14px;
}

.success-icon {
  color: #10b981;
}

.code-block-body {
  padding: 14px 16px;
  overflow-x: auto;
  overflow-y: auto;
  max-width: 100%;
  box-sizing: border-box;
  scrollbar-width: thin;
  scrollbar-color: var(--nano-border-subtle, rgba(255, 255, 255, 0.15)) transparent;
}

.code-block-pre {
  margin: 0;
  padding: 0;
  background: transparent;
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--nano-text-code, #e2e8f0);
  white-space: pre;
  user-select: text !important;
  -webkit-user-select: text !important;
  cursor: text;
}

.is-wrapped .code-block-pre {
  white-space: pre-wrap !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
}

.code-block-pre code {
  user-select: text !important;
  -webkit-user-select: text !important;
  cursor: text;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
}

.code-block-pre pre {
  margin: 0;
  padding: 0;
  background: transparent;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
  white-space: inherit;
}

.is-wrapped .code-block-pre pre {
  white-space: pre-wrap !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
}

/* Built-in Syntax Highlighting Tokens (highlight.js) */
:deep(.hljs-keyword),
:deep(.hljs-selector-tag),
:deep(.hljs-subst),
:deep(.hl-keyword) {
  color: #c084fc;
  font-weight: 600;
}

:deep(.hljs-string),
:deep(.hljs-addition),
:deep(.hl-string) {
  color: var(--nano-code-hl-string, #34d399);
}

:deep(.hljs-number),
:deep(.hl-number) {
  color: var(--nano-code-hl-number, #fbbf24);
}

:deep(.hljs-literal),
:deep(.hljs-boolean),
:deep(.hl-boolean) {
  color: #f472b6;
  font-weight: 600;
}

:deep(.hljs-comment),
:deep(.hljs-quote),
:deep(.hl-comment) {
  color: #64748b;
  font-style: italic;
}

:deep(.hljs-tag),
:deep(.hljs-name),
:deep(.hl-tag) {
  color: #38bdf8;
  font-weight: 600;
}

:deep(.hljs-attr),
:deep(.hljs-attribute),
:deep(.hl-attr) {
  color: #a78bfa;
}

:deep(.hljs-title.function_),
:deep(.hljs-function),
:deep(.hl-function) {
  color: #60a5fa;
}

:deep(.hljs-property),
:deep(.hl-property) {
  color: #38bdf8;
}

:deep(.hljs-variable),
:deep(.hljs-variable.language_),
:deep(.hl-var) {
  color: #f43f5e;
}

:deep(.hljs-selector-class),
:deep(.hljs-selector-id),
:deep(.hljs-symbol),
:deep(.hl-selector) {
  color: #e879f9;
}

:deep(.hljs-punctuation),
:deep(.hl-punct) {
  color: #94a3b8;
}

:deep(.hljs-built_in) {
  color: #60a5fa;
  font-weight: 600;
}

:deep(.hljs-title),
:deep(.hljs-title.class_),
:deep(.hljs-type) {
  color: #fbbf24;
  font-weight: 600;
}

:deep(.hljs-params) {
  color: #e2e8f0;
}

/* Light theme high-contrast adjustments: darkened green and yellow/amber */
:root[data-theme="light"] :deep(.hljs-string),
html[data-theme="light"] :deep(.hljs-string),
[data-theme="light"] :deep(.hljs-string),
:root[data-theme="light"] :deep(.hl-string),
[data-theme="light"] :deep(.hl-string) {
  color: #059669;
}

:root[data-theme="light"] :deep(.hljs-number),
html[data-theme="light"] :deep(.hljs-number),
[data-theme="light"] :deep(.hljs-number),
:root[data-theme="light"] :deep(.hl-number),
[data-theme="light"] :deep(.hl-number) {
  color: #d97706;
}

:root[data-theme="light"] :deep(.hljs-built_in),
html[data-theme="light"] :deep(.hljs-built_in),
[data-theme="light"] :deep(.hljs-built_in) {
  color: #2563eb;
}

:root[data-theme="light"] :deep(.hljs-title),
:root[data-theme="light"] :deep(.hljs-title.class_),
:root[data-theme="light"] :deep(.hljs-type),
html[data-theme="light"] :deep(.hljs-title.class_),
[data-theme="light"] :deep(.hljs-title.class_) {
  color: #b45309;
}
</style>
