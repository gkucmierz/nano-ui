<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  /**
   * Title text displayed in the header (e.g. 'API Reference', 'Props & Events')
   */
  title: {
    type: String,
    default: ''
  },
  /**
   * Language badge label (e.g. 'vue', 'bash', 'js', 'json')
   */
  lang: {
    type: String,
    default: ''
  },
  /**
   * Raw code string if not passed via default slot
   */
  code: {
    type: String,
    default: ''
  },
  /**
   * Initial word-wrap state
   */
  defaultWrap: {
    type: Boolean,
    default: false
  },
  /**
   * Whether to show the wrap toggle action button
   */
  allowWrap: {
    type: Boolean,
    default: true
  },
  /**
   * Whether to show the copy action button
   */
  allowCopy: {
    type: Boolean,
    default: true
  },
  /**
   * Optional max height with vertical scroll
   */
  maxHeight: {
    type: [Number, String],
    default: null
  }
});

const emit = defineEmits(['update:wrap', 'copied']);

const isWrapped = ref(props.defaultWrap);
const copied = ref(false);
const preRef = ref(null);
let copyTimeout = null;

const toggleWrap = () => {
  isWrapped.value = !isWrapped.value;
  emit('update:wrap', isWrapped.value);
};

const copyCode = async () => {
  let textToCopy = props.code;
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
  <div class="nano-code-block" :class="{ 'is-wrapped': isWrapped }">
    <div v-if="title || lang || $slots.header || allowWrap || allowCopy" class="code-block-header">
      <div class="code-block-title-group">
        <slot name="header">
          <span v-if="title" class="code-block-title">{{ title }}</span>
          <span v-if="lang" class="code-block-lang">{{ lang }}</span>
        </slot>
      </div>

      <div class="code-block-actions">
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
      <pre ref="preRef" class="code-block-pre"><slot>{{ code }}</slot></pre>
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

.code-block-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
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
</style>
