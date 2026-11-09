<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
  highlightCode,
  escapeHtml,
  registerParser,
  SYNTAX_THEMES,
} from '../utils/syntax-highlighter.js';
import { detectLangFromPath, parseUnifiedDiff } from '../utils/git-diff.js';
import { NANOSOUND_COMPLETIONS } from '../parsers/index.js';
import { tooltipDirective as vTooltip } from '../directives/tooltip.js';
import {
  getScopedStorageController,
  normalizeStorageMode,
  STORAGE_MODES,
} from '../utils/storage-controller.js';
import NanoSelect from './NanoSelect.vue';

const editorStorageCtrl = getScopedStorageController('nano-ui');

const props = defineProps({
  /**
   * Code content (v-model or :code)
   */
  modelValue: {
    type: String,
    default: undefined,
  },
  code: {
    type: String,
    default: '',
  },
  /**
   * Unified git diff string (when provided, enables Diff view)
   */
  diff: {
    type: String,
    default: '',
  },
  /**
   * File path displayed in header and used for automatic language detection
   */
  filePath: {
    type: String,
    default: '',
  },
  /**
   * Explicit language override ('js', 'vue', 'md', 'json', 'css', 'bash', 'rust', 'python', etc.)
   */
  lang: {
    type: String,
    default: '',
  },
  /**
   * Syntax highlighting color profile:
   * 'nano' | 'github' | 'monokai' | 'dracula' | 'one-dark' | 'nord' | 'solarized' | 'cyberpunk'
   */
  syntaxTheme: {
    type: String,
    default: 'nano',
  },
  /**
   * Show syntax color profile switcher in the editor header bar
   */
  showThemeSelector: {
    type: Boolean,
    default: false,
  },
  /**
   * Optional array of modular language parser definitions to register on mount/update
   */
  parsers: {
    type: Array,
    default: () => [],
  },
  /**
   * Optional array of IntelliSense autocomplete items:
   * [{ label, insertText, detail, kind }]
   * Defaults automatically to NANOSOUND_COMPLETIONS when lang === 'nanosound'.
   */
  completions: {
    type: Array,
    default: null,
  },
  /**
   * View mode: 'auto' | 'diff' | 'code'
   */
  mode: {
    type: String,
    default: 'auto',
  },
  /**
   * Diff layout: 'unified' | 'split'
   */
  diffStyle: {
    type: String,
    default: 'unified',
  },
  /**
   * Enable live code editing in 'code' mode
   */
  editable: {
    type: Boolean,
    default: false,
  },
  /**
   * Show line numbers gutter
   */
  showLineNumbers: {
    type: Boolean,
    default: true,
  },
  /**
   * Initial line wrap state
   */
  defaultWrap: {
    type: Boolean,
    default: false,
  },
  /**
   * Optional max height for scrolling
   */
  maxHeight: {
    type: [Number, String],
    default: null,
  },
  /**
   * Show file download button in header (downloads filePath or 'snippet.txt')
   */
  downloadable: {
    type: Boolean,
    default: false,
  },
  /**
   * UI language for header tooltips & labels ('en' | 'pl')
   */
  uiLang: {
    type: String,
    default: 'en',
  },
  /**
   * Storage backend mode when `storageKey` is provided:
   * - `'ls'` (default): localStorage (`window.localStorage`)
   * - `'ss'`: sessionStorage (`window.sessionStorage`)
   * - `'none'` | `false`: disable persistence
   */
  storage: {
    type: [String, Boolean],
    default: 'ls',
  },
  /**
   * Optional application-level prefix override (e.g. `'dashboard-app'` -> `'DA_NU_<storageKey>'`).
   */
  appPrefix: {
    type: String,
    default: '',
  },
  /**
   * Optional storage key for persisting editor state (`{ diffStyle, syntaxTheme, wrap, draft? }`).
   */
  storageKey: {
    type: String,
    default: '',
  },
  /**
   * When true and `storageKey` is provided, also persists live editable code draft.
   */
  persistDraft: {
    type: Boolean,
    default: false,
  },
  /**
   * Show native macOS external editor launcher buttons (Sublime Text / CotEditor / System Default)
   */
  openInEditor: {
    type: Boolean,
    default: false,
  },
});

let editorUidSeq = 0;

const emit = defineEmits([
  'update:modelValue',
  'update:code',
  'update:mode',
  'update:diffStyle',
  'update:syntaxTheme',
  'change',
  'copied',
  'downloaded',
  'open-in-editor',
  'run',
]);

const editorAutoId = `nano-code-editor-${++editorUidSeq}`;

const resolvedStorageMode = computed(() => {
  if (!props.storageKey) return STORAGE_MODES.NONE;
  return normalizeStorageMode(props.storage, STORAGE_MODES.LS);
});

const isStorageEnabled = computed(
  () => Boolean(props.storageKey) && resolvedStorageMode.value !== STORAGE_MODES.NONE
);

const resolvedStorageKey = computed(() => {
  if (!props.storageKey) return '';
  return editorStorageCtrl.resolveKey(props.storageKey, {
    appPrefix: props.appPrefix || undefined,
  });
});

const parserVersion = ref(0);
const internalSyntaxTheme = ref(props.syntaxTheme || 'nano');

watch(
  () => props.parsers,
  (list) => {
    if (Array.isArray(list) && list.length > 0) {
      registerParser(list);
      parserVersion.value++;
    }
  },
  { immediate: true, deep: true }
);

watch(
  () => props.syntaxTheme,
  (val) => {
    if (val) internalSyntaxTheme.value = val;
  }
);

const setSyntaxTheme = (nextTheme) => {
  internalSyntaxTheme.value = nextTheme;
  emit('update:syntaxTheme', nextTheme);
  saveEditorState();
};

const syntaxThemeOptions = SYNTAX_THEMES.map((th) => ({
  value: th.id,
  label: th.label,
}));

const internalMode = ref(
  props.mode !== 'auto'
    ? props.mode
    : (props.diff ? 'diff' : 'code')
);
const internalDiffStyle = ref(props.diffStyle || 'unified');
const isWrapped = ref(props.defaultWrap);
const copied = ref(false);
const activeLine = ref(1);
const textareaRef = ref(null);
const highlightLayerRef = ref(null);
const gutterRef = ref(null);
let copyTimer = null;

watch(() => props.mode, (val) => {
  if (val && val !== 'auto') internalMode.value = val;
});

watch(() => props.diff, (val) => {
  if (props.mode === 'auto') {
    internalMode.value = val ? 'diff' : 'code';
  }
});

watch(() => props.diffStyle, (val) => {
  if (val) internalDiffStyle.value = val;
});

const resolvedLang = computed(() => {
  return detectLangFromPath(props.filePath, props.lang);
});

const currentCode = computed(() => {
  if (props.modelValue !== undefined) return props.modelValue;
  return props.code || '';
});

const codeLines = computed(() => {
  // Touch parserVersion so dynamic parser registration re-evaluates highlights
  void parserVersion.value;
  const raw = currentCode.value.replace(/\r\n/g, '\n');
  const split = raw.split('\n');
  const lang = resolvedLang.value;
  return split.map((lineText, idx) => ({
    number: idx + 1,
    text: lineText,
    html: highlightCode(lineText, lang) || escapeHtml(lineText) || ' ',
  }));
});

const fullHighlightedHtml = computed(() => {
  void parserVersion.value;
  const raw = currentCode.value;
  if (!raw) return ' ';
  const html = highlightCode(raw, resolvedLang.value) || escapeHtml(raw);
  return html.endsWith('\n') ? `${html} ` : html;
});

const parsedDiff = computed(() => {
  void parserVersion.value;
  if (!props.diff) return { lines: [], splitRows: [], additions: 0, deletions: 0 };
  return parseUnifiedDiff(props.diff, resolvedLang.value);
});

const hasBothDiffAndCode = computed(() => {
  return Boolean(props.diff && (props.code || props.modelValue !== undefined));
});

const containerMaxHeight = computed(() => {
  if (!props.maxHeight) return undefined;
  return typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight;
});

const saveEditorState = (extraDraft = undefined) => {
  if (!isStorageEnabled.value) return;
  const payload = {
    diffStyle: internalDiffStyle.value,
    syntaxTheme: internalSyntaxTheme.value,
    wrap: Boolean(isWrapped.value),
  };
  if (props.persistDraft && props.editable) {
    payload.draft = extraDraft !== undefined ? extraDraft : currentCode.value;
  }
  editorStorageCtrl.set(props.storageKey, payload, {
    mode: resolvedStorageMode.value,
    appPrefix: props.appPrefix || undefined,
  });
};

const loadEditorState = () => {
  if (!isStorageEnabled.value) return;
  const saved = editorStorageCtrl.get(props.storageKey, null, {
    mode: resolvedStorageMode.value,
    appPrefix: props.appPrefix || undefined,
  });
  if (!saved || typeof saved !== 'object') return;

  if (saved.diffStyle === 'unified' || saved.diffStyle === 'split') {
    internalDiffStyle.value = saved.diffStyle;
    emit('update:diffStyle', saved.diffStyle);
  }
  if (typeof saved.syntaxTheme === 'string' && saved.syntaxTheme.trim()) {
    internalSyntaxTheme.value = saved.syntaxTheme.trim();
    emit('update:syntaxTheme', internalSyntaxTheme.value);
  }
  if (typeof saved.wrap === 'boolean') {
    isWrapped.value = saved.wrap;
  }
  if (props.persistDraft && props.editable && typeof saved.draft === 'string') {
    if (saved.draft !== currentCode.value) {
      emit('update:modelValue', saved.draft);
      emit('update:code', saved.draft);
    }
  }
};

const setMode = (m) => {
  internalMode.value = m;
  emit('update:mode', m);
};

const setDiffStyle = (style) => {
  internalDiffStyle.value = style;
  emit('update:diffStyle', style);
  saveEditorState();
};

const syncEditorScroll = (e) => {
  const el = e.target;
  if (highlightLayerRef.value) {
    highlightLayerRef.value.scrollTop = el.scrollTop;
    highlightLayerRef.value.scrollLeft = el.scrollLeft;
  }
  if (gutterRef.value) {
    gutterRef.value.scrollTop = el.scrollTop;
  }
};

const updateActiveCursorLine = () => {
  const el = textareaRef.value;
  if (!el) return;
  const pos = el.selectionStart || 0;
  const before = el.value.slice(0, pos);
  activeLine.value = before.split('\n').length;
};

const showCompletions = ref(false);
const completionPrefix = ref('');
const selectedCompletionIdx = ref(0);

const effectiveCompletions = computed(() => {
  if (Array.isArray(props.completions)) return props.completions;
  if (resolvedLang.value === 'nanosound' || resolvedLang.value === 'nsd' || resolvedLang.value === 'sound') {
    return NANOSOUND_COMPLETIONS;
  }
  return [];
});

const filteredCompletions = computed(() => {
  const list = effectiveCompletions.value;
  const pref = completionPrefix.value.toLowerCase();
  if (!pref || list.length === 0) return [];
  return list
    .filter((item) => {
      const lbl = String(item.label || '').toLowerCase();
      return lbl.startsWith(pref) && lbl !== pref;
    })
    .slice(0, 8);
});

const updateCompletionState = () => {
  const el = textareaRef.value;
  if (!el || effectiveCompletions.value.length === 0) {
    showCompletions.value = false;
    return;
  }
  const pos = el.selectionStart || 0;
  const before = el.value.slice(0, pos);
  const match = before.match(/[a-zA-Z_][a-zA-Z0-9_]*$/);
  if (match && match[0].length >= 1) {
    completionPrefix.value = match[0];
    selectedCompletionIdx.value = 0;
    showCompletions.value = filteredCompletions.value.length > 0;
  } else {
    completionPrefix.value = '';
    showCompletions.value = false;
  }
};

const applyCompletion = (item) => {
  const el = textareaRef.value;
  if (!el || !item) return;
  const pos = el.selectionStart || 0;
  const val = el.value;
  const prefLen = completionPrefix.value.length;
  const replaceStart = Math.max(0, pos - prefLen);
  const insertStr = item.insertText || item.label || '';
  const nextVal = `${val.slice(0, replaceStart)}${insertStr}${val.slice(pos)}`;
  el.value = nextVal;
  const nextCursor = replaceStart + insertStr.length;
  el.selectionStart = el.selectionEnd = nextCursor;
  showCompletions.value = false;
  completionPrefix.value = '';
  emit('update:modelValue', nextVal);
  emit('update:code', nextVal);
  emit('change', nextVal);
  saveEditorState(nextVal);
  updateActiveCursorLine();
  el.focus();
};

const handleEditorInput = (e) => {
  const val = e.target.value;
  emit('update:modelValue', val);
  emit('update:code', val);
  emit('change', val);
  saveEditorState(val);
  updateActiveCursorLine();
  updateCompletionState();
};

const handleEditorKeyDown = (e) => {
  if ((e.metaKey || e.ctrlKey) && (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter')) {
    e.preventDefault();
    showCompletions.value = false;
    emit('run', currentCode.value);
    return;
  }

  if (showCompletions.value && filteredCompletions.value.length > 0) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedCompletionIdx.value =
        (selectedCompletionIdx.value + 1) % filteredCompletions.value.length;
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedCompletionIdx.value =
        (selectedCompletionIdx.value - 1 + filteredCompletions.value.length) %
        filteredCompletions.value.length;
      return;
    }
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      applyCompletion(filteredCompletions.value[selectedCompletionIdx.value]);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      showCompletions.value = false;
      return;
    }
  }

  if (e.key === 'Tab') {
    e.preventDefault();
    const el = e.target;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = el.value;
    const nextVal = `${val.slice(0, start)}  ${val.slice(end)}`;
    el.value = nextVal;
    el.selectionStart = el.selectionEnd = start + 2;
    emit('update:modelValue', nextVal);
    emit('update:code', nextVal);
    emit('change', nextVal);
    saveEditorState(nextVal);
  }
};

const copyContent = async () => {
  const textToCopy = internalMode.value === 'diff' && props.diff
    ? props.diff
    : currentCode.value;
  if (!textToCopy) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(textToCopy);
    }
    copied.value = true;
    emit('copied', textToCopy);
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copied.value = false;
    }, 1800);
  } catch {}
};
const downloadContent = () => {
  const text = internalMode.value === 'diff' && props.diff
    ? props.diff
    : currentCode.value;
  if (!text || typeof document === 'undefined') return;
  const filename = (props.filePath || 'snippet.nsd').split('/').pop() || 'snippet.nsd';
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  emit('downloaded', { filename, content: text });
};

const openedEditorId = ref('');
let openedEditorTimer = null;

const triggerOpenInEditor = (editorId = 'subl') => {
  if (!props.filePath) return;
  openedEditorId.value = editorId;
  emit('open-in-editor', {
    filePath: props.filePath,
    line: activeLine.value || 1,
    editor: editorId,
  });
  if (openedEditorTimer) clearTimeout(openedEditorTimer);
  openedEditorTimer = setTimeout(() => {
    openedEditorId.value = '';
  }, 1500);
};

const focus = () => {
  textareaRef.value?.focus?.();
};

onMounted(() => {
  loadEditorState();
});

watch(
  () => [props.storageKey, props.storage, props.appPrefix],
  () => {
    loadEditorState();
  }
);

watch(isWrapped, () => {
  saveEditorState();
});

onUnmounted(() => {
  if (copyTimer) {
    clearTimeout(copyTimer);
    copyTimer = null;
  }
  if (openedEditorTimer) {
    clearTimeout(openedEditorTimer);
    openedEditorTimer = null;
  }
});

defineExpose({
  focus,
  copyContent,
  downloadContent,
  setMode,
  setDiffStyle,
  activeLine,
  parsedDiff,
  resolvedStorageKey,
  resolvedStorageMode,
  saveEditorState,
  loadEditorState,
});
</script>

<template>
  <div
    class="nano-code-editor"
    :data-syntax-theme="internalSyntaxTheme"
    :class="{
      'is-wrapped': isWrapped,
      'is-diff-mode': internalMode === 'diff',
      'is-editable': editable && internalMode === 'code',
    }"
  >
    <!-- Header Bar -->
    <header class="nce-header">
      <div class="nce-header-left">
        <span v-if="filePath" class="nce-filepath" v-tooltip="filePath">{{ filePath }}</span>
        <span v-else class="nce-filepath">Code Inspector</span>

        <span v-if="resolvedLang" class="nce-lang-badge">{{ resolvedLang }}</span>

        <span v-if="internalMode === 'diff' && (parsedDiff.additions || parsedDiff.deletions)" class="nce-diff-stats">
          <span class="nce-stat-add">+{{ parsedDiff.additions }}</span>
          <span class="nce-stat-del">−{{ parsedDiff.deletions }}</span>
        </span>
      </div>

      <div class="nce-header-actions">
        <!-- Optional Syntax Color Profile Selector -->
        <div v-if="showThemeSelector" class="nce-theme-select-wrap">
          <NanoSelect
            :model-value="internalSyntaxTheme"
            :options="syntaxThemeOptions"
            size="sm"
            placeholder="Syntax Theme"
            @update:model-value="setSyntaxTheme"
          />
        </div>

        <!-- Mode Toggle (Diff vs Code) ONLY when both diff and code are provided -->
        <div v-if="hasBothDiffAndCode" class="nce-seg-group">
          <button
            type="button"
            class="nce-seg-btn"
            :class="{ active: internalMode === 'diff' }"
            @click="setMode('diff')"
          >
            Diff
          </button>
          <button
            type="button"
            class="nce-seg-btn"
            :class="{ active: internalMode === 'code' }"
            @click="setMode('code')"
          >
            {{ editable ? 'Edit' : 'Code' }}
          </button>
        </div>

        <!-- Unified vs Split Diff Switcher -->
        <div v-if="internalMode === 'diff' && diff" class="nce-seg-group">
          <button
            type="button"
            class="nce-seg-btn"
            :class="{ active: internalDiffStyle === 'unified' }"
            v-tooltip="'Unified diff view'"
            @click="setDiffStyle('unified')"
          >
            Unified
          </button>
          <button
            type="button"
            class="nce-seg-btn"
            :class="{ active: internalDiffStyle === 'split' }"
            v-tooltip="'Side-by-side split diff view'"
            @click="setDiffStyle('split')"
          >
            Split
          </button>
        </div>

        <!-- Optional External macOS Editor Launcher (Sublime Text / CotEditor / Finder) -->
        <div v-if="openInEditor && filePath" class="nce-seg-group nce-editor-launch-group">
          <button
            type="button"
            class="nce-seg-btn"
            :class="{ active: openedEditorId === 'subl' }"
            v-tooltip="`Open ${filePath}:${activeLine || 1} in Sublime Text`"
            @click="triggerOpenInEditor('subl')"
          >
            {{ openedEditorId === 'subl' ? '✓ Subl' : 'Subl' }}
          </button>
          <button
            type="button"
            class="nce-seg-btn"
            :class="{ active: openedEditorId === 'cot' }"
            v-tooltip="`Open ${filePath}:${activeLine || 1} in CotEditor`"
            @click="triggerOpenInEditor('cot')"
          >
            {{ openedEditorId === 'cot' ? '✓ Cot' : 'Cot' }}
          </button>
          <button
            type="button"
            class="nce-seg-btn"
            :class="{ active: openedEditorId === 'finder' }"
            v-tooltip="`Reveal ${filePath} in macOS Finder`"
            @click="triggerOpenInEditor('finder')"
          >
            {{ openedEditorId === 'finder' ? '✓ Finder' : 'Finder' }}
          </button>
        </div>

        <!-- Wrap Toggle -->
        <button
          type="button"
          class="nce-icon-btn"
          :class="{ active: isWrapped }"
          v-tooltip="uiLang === 'pl' ? (isWrapped ? 'Wyłącz zawijanie wierszy' : 'Zawijaj wiersze') : (isWrapped ? 'Unwrap lines' : 'Wrap lines')"
          :aria-label="uiLang === 'pl' ? (isWrapped ? 'Wyłącz zawijanie wierszy' : 'Zawijaj wiersze') : (isWrapped ? 'Unwrap lines' : 'Wrap lines')"
          @click="isWrapped = !isWrapped"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 10 4 15 9 20" />
            <path d="M20 4v7a4 4 0 0 1-4 4H4" />
          </svg>
        </button>

        <!-- Optional Download File Button (e.g. .nsd) -->
        <button
          v-if="downloadable"
          type="button"
          class="nce-icon-btn"
          v-tooltip="uiLang === 'pl' ? `Pobierz ${filePath || 'plik'}` : `Download ${filePath || 'file'}`"
          :aria-label="uiLang === 'pl' ? `Pobierz ${filePath || 'plik'}` : `Download ${filePath || 'file'}`"
          @click="downloadContent"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>

        <!-- Copy Button -->
        <button
          type="button"
          class="nce-icon-btn"
          :class="{ copied }"
          v-tooltip="uiLang === 'pl' ? (copied ? 'Skopiowano!' : 'Kopiuj do schowka') : (copied ? 'Copied!' : 'Copy to clipboard')"
          :aria-label="uiLang === 'pl' ? (copied ? 'Skopiowano' : 'Kopiuj do schowka') : (copied ? 'Copied' : 'Copy to clipboard')"
          @click="copyContent"
        >
          <svg v-if="!copied" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>
    </header>

    <!-- 1. DIFF MODE: UNIFIED -->
    <div
      v-if="internalMode === 'diff' && internalDiffStyle === 'unified'"
      class="nce-diff-viewport nano-scrollbar"
      :style="{ maxHeight: containerMaxHeight }"
    >
      <div v-if="parsedDiff.lines.length === 0" class="nce-empty">
        No diff changes to display.
      </div>
      <table v-else class="nce-diff-table">
        <tbody>
          <tr
            v-for="line in parsedDiff.lines"
            :key="line.id"
            class="nce-diff-row"
            :class="`is-${line.type}`"
          >
            <template v-if="line.type === 'hunk'">
              <td colspan="2" class="nce-num-col nce-hunk-num">@@</td>
              <td colspan="2" class="nce-hunk-cell">{{ line.content }}</td>
            </template>
            <template v-else>
              <td v-if="showLineNumbers" class="nce-num-col">{{ line.oldNumber ?? '' }}</td>
              <td v-if="showLineNumbers" class="nce-num-col">{{ line.newNumber ?? '' }}</td>
              <td class="nce-sign-col">{{ line.prefix }}</td>
              <td class="nce-code-col"><span class="nano-syntax-code" v-html="line.html"></span></td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 2. DIFF MODE: SPLIT (SIDE-BY-SIDE) -->
    <div
      v-else-if="internalMode === 'diff' && internalDiffStyle === 'split'"
      class="nce-diff-viewport nano-scrollbar"
      :style="{ maxHeight: containerMaxHeight }"
    >
      <div v-if="parsedDiff.splitRows.length === 0" class="nce-empty">
        No diff changes to display.
      </div>
      <table v-else class="nce-diff-table is-split">
        <tbody>
          <tr
            v-for="row in parsedDiff.splitRows"
            :key="row.id"
            class="nce-diff-row"
            :class="{ 'is-hunk': row.type === 'hunk' }"
          >
            <template v-if="row.type === 'hunk'">
              <td colspan="6" class="nce-hunk-cell">{{ row.hunkText }}</td>
            </template>
            <template v-else>
              <!-- Left side (old) -->
              <td class="nce-num-col" :class="row.left ? `is-${row.left.type}` : 'is-empty'">
                {{ row.left?.oldNumber ?? '' }}
              </td>
              <td class="nce-sign-col" :class="row.left ? `is-${row.left.type}` : 'is-empty'">
                {{ row.left ? row.left.prefix : '' }}
              </td>
              <td class="nce-code-col nce-split-half" :class="row.left ? `is-${row.left.type}` : 'is-empty'">
                <span v-if="row.left" class="nano-syntax-code" v-html="row.left.html"></span>
              </td>

              <!-- Right side (new) -->
              <td class="nce-num-col nce-split-border" :class="row.right ? `is-${row.right.type}` : 'is-empty'">
                {{ row.right?.newNumber ?? '' }}
              </td>
              <td class="nce-sign-col" :class="row.right ? `is-${row.right.type}` : 'is-empty'">
                {{ row.right ? row.right.prefix : '' }}
              </td>
              <td class="nce-code-col nce-split-half" :class="row.right ? `is-${row.right.type}` : 'is-empty'">
                <span v-if="row.right" class="nano-syntax-code" v-html="row.right.html"></span>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 3. CODE MODE: LIVE EDITABLE OVERLAY EDITOR -->
    <div
      v-else-if="editable"
      class="nce-live-editor-shell"
      :style="{ maxHeight: containerMaxHeight }"
    >
      <div v-if="showLineNumbers" ref="gutterRef" class="nce-live-gutter">
        <div
          v-for="line in codeLines"
          :key="line.number"
          class="nce-gutter-num"
          :class="{ active: activeLine === line.number }"
        >
          {{ line.number }}
        </div>
      </div>

      <div class="nce-live-stage">
        <pre
          ref="highlightLayerRef"
          class="nce-live-highlight"
          aria-hidden="true"
        ><code class="nano-syntax-code" v-html="fullHighlightedHtml"></code></pre>

        <textarea
          :id="editorAutoId"
          ref="textareaRef"
          :name="editorAutoId"
          :value="currentCode"
          :aria-label="filePath ? `Code editor (${filePath})` : 'Code editor'"
          class="nce-live-textarea nano-scrollbar"
          spellcheck="false"
          autocapitalize="off"
          autocomplete="off"
          autocorrect="off"
          @input="handleEditorInput"
          @scroll="syncEditorScroll"
          @click="updateActiveCursorLine"
          @keyup="updateActiveCursorLine"
          @keydown="handleEditorKeyDown"
        ></textarea>

        <!-- Built-in IntelliSense / Autocomplete Popup -->
        <div
          v-if="showCompletions && filteredCompletions.length > 0"
          class="nce-completions-popup"
          role="listbox"
        >
          <div class="nce-completions-header">
            <span>IntelliSense ({{ resolvedLang || 'code' }})</span>
            <span class="nce-completions-hint">↑↓ · Tab/Enter</span>
          </div>
          <button
            v-for="(item, idx) in filteredCompletions"
            :key="item.label"
            type="button"
            class="nce-completion-item"
            :class="{ active: idx === selectedCompletionIdx }"
            @mousedown.prevent="applyCompletion(item)"
          >
            <span class="nce-comp-kind" :data-kind="item.kind || 'fn'">{{ item.kind || 'fn' }}</span>
            <code class="nce-comp-label">{{ item.label }}</code>
            <span v-if="item.detail" class="nce-comp-detail">{{ item.detail }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 4. CODE MODE: READ-ONLY SYNTAX VIEWER WITH LINE NUMBERS -->
    <div
      v-else
      class="nce-diff-viewport nano-scrollbar"
      :style="{ maxHeight: containerMaxHeight }"
    >
      <div v-if="codeLines.length === 0 || (codeLines.length === 1 && !codeLines[0].text)" class="nce-empty">
        Empty file.
      </div>
      <table v-else class="nce-diff-table">
        <tbody>
          <tr
            v-for="line in codeLines"
            :key="line.number"
            class="nce-diff-row"
            :class="{ 'is-active-line': activeLine === line.number }"
            @click="activeLine = line.number"
          >
            <td v-if="showLineNumbers" class="nce-num-col">{{ line.number }}</td>
            <td class="nce-code-col"><span class="nano-syntax-code" v-html="line.html"></span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.nano-code-editor {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  background: var(--nano-code-bg, var(--nano-bg-code, #0b1120));
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.12));
  border-radius: var(--nano-radius-md, 8px);
  overflow: hidden;
  font-family: var(--nano-font-mono, 'JetBrains Mono', 'Fira Code', monospace);
  color: var(--nano-text-main, #f8fafc);
}

.nce-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 12px;
  background: var(--nano-code-header-bg, rgba(0, 0, 0, 0.25));
  border-bottom: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.09));
  font-family: var(--nano-font-sans, -apple-system, BlinkMacSystemFont, sans-serif);
  user-select: none;
}

.nce-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.nce-filepath {
  font-family: var(--nano-font-mono, 'JetBrains Mono', monospace);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--nano-text-main, #f8fafc);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nce-lang-badge {
  font-family: var(--nano-font-mono, 'JetBrains Mono', monospace);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--nano-accent-primary, #6366f1) 16%, transparent);
  color: var(--nano-accent-primary, #818cf8);
  border: 1px solid color-mix(in srgb, var(--nano-accent-primary, #6366f1) 30%, transparent);
  flex-shrink: 0;
}

.nce-diff-stats {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--nano-font-mono, 'JetBrains Mono', monospace);
  font-size: 0.73rem;
  font-weight: 700;
  flex-shrink: 0;
}

.nce-stat-add {
  color: #16a34a;
}

[data-theme="dark"] .nce-stat-add,
:root:not([data-theme="light"]) .nce-stat-add {
  color: #4ade80;
}

.nce-stat-del {
  color: #dc2626;
}

[data-theme="dark"] .nce-stat-del,
:root:not([data-theme="light"]) .nce-stat-del {
  color: #f87171;
}

.nce-header-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.nce-seg-group {
  display: inline-flex;
  align-items: center;
  background: var(--nano-bg-muted, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.1));
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.nce-seg-btn {
  padding: 3px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--nano-text-muted, #94a3b8);
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.12s ease;
}

.nce-seg-btn:hover {
  color: var(--nano-text-main, #f8fafc);
}

.nce-seg-btn.active {
  background: var(--nano-accent-primary, #6366f1);
  color: #ffffff;
}

.nce-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border-radius: 5px;
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.1));
  background: var(--nano-bg-muted, rgba(255, 255, 255, 0.04));
  color: var(--nano-text-muted, #94a3b8);
  cursor: pointer;
  transition: all 0.15s ease;
}

.nce-icon-btn:hover {
  color: var(--nano-text-main, #f8fafc);
  border-color: var(--nano-border-hover, rgba(255, 255, 255, 0.22));
}

.nce-icon-btn.active {
  color: var(--nano-accent-primary, #818cf8);
  border-color: var(--nano-accent-primary, #6366f1);
}

.nce-icon-btn.copied {
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.45);
}

.nce-icon-btn svg {
  width: 14px;
  height: 14px;
}

.nce-diff-viewport {
  overflow: auto;
  flex: 1;
  min-height: 0;
}

.nce-empty {
  padding: 28px 16px;
  text-align: center;
  font-family: var(--nano-font-sans, sans-serif);
  font-size: 0.8rem;
  color: var(--nano-text-muted, #94a3b8);
}

.nce-diff-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--nano-font-mono, 'JetBrains Mono', monospace);
  font-size: 0.78rem;
  line-height: 1.5;
}

.nce-diff-row {
  border: none;
}

.nce-num-col {
  width: 40px;
  min-width: 40px;
  padding: 0 8px;
  text-align: right;
  color: var(--nano-text-muted, #64748b);
  opacity: 0.7;
  user-select: none;
  border-right: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.06));
  font-variant-numeric: tabular-nums;
  vertical-align: top;
}

.nce-sign-col {
  width: 20px;
  min-width: 20px;
  padding: 0 4px;
  text-align: center;
  user-select: none;
  font-weight: 700;
  vertical-align: top;
}

.nce-code-col {
  padding: 0 12px 0 6px;
  white-space: pre;
  vertical-align: top;
  -webkit-user-select: text !important;
  user-select: text !important;
  cursor: text;
}

.nce-code-col :deep(*),
.nano-syntax-code,
.nce-hunk-cell,
.nce-filepath {
  -webkit-user-select: text !important;
  user-select: text !important;
  cursor: text;
}

.nano-code-editor.is-wrapped .nce-code-col {
  white-space: pre-wrap;
  word-break: break-word;
}

.nce-split-half {
  width: 50%;
  max-width: 0;
  overflow-x: auto;
}

.nce-split-border {
  border-left: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.12));
}

/* Diff line semantic colors (Dark & Light theme aware) */
.nce-diff-row.is-add,
td.is-add {
  background: rgba(34, 197, 94, 0.14);
}

[data-theme="light"] .nce-diff-row.is-add,
[data-theme="light"] td.is-add {
  background: rgba(22, 163, 74, 0.13);
}

.nce-diff-row.is-add .nce-sign-col,
td.is-add.nce-sign-col {
  color: #16a34a;
}

[data-theme="dark"] .nce-diff-row.is-add .nce-sign-col,
:root:not([data-theme="light"]) .nce-diff-row.is-add .nce-sign-col,
[data-theme="dark"] td.is-add.nce-sign-col,
:root:not([data-theme="light"]) td.is-add.nce-sign-col {
  color: #4ade80;
}

.nce-diff-row.is-del,
td.is-del {
  background: rgba(239, 68, 68, 0.14);
}

[data-theme="light"] .nce-diff-row.is-del,
[data-theme="light"] td.is-del {
  background: rgba(220, 38, 38, 0.11);
}

.nce-diff-row.is-del .nce-sign-col,
td.is-del.nce-sign-col {
  color: #dc2626;
}

[data-theme="dark"] .nce-diff-row.is-del .nce-sign-col,
:root:not([data-theme="light"]) .nce-diff-row.is-del .nce-sign-col,
[data-theme="dark"] td.is-del.nce-sign-col,
:root:not([data-theme="light"]) td.is-del.nce-sign-col {
  color: #f87171;
}

.nce-diff-row.is-hunk,
.nce-hunk-cell,
.nce-hunk-num {
  background: color-mix(in srgb, #38bdf8 11%, transparent);
  color: #0284c7;
  font-weight: 600;
}

[data-theme="dark"] .nce-diff-row.is-hunk,
:root:not([data-theme="light"]) .nce-diff-row.is-hunk,
[data-theme="dark"] .nce-hunk-cell,
:root:not([data-theme="light"]) .nce-hunk-cell {
  color: #38bdf8;
}

.nce-hunk-cell {
  padding: 3px 12px;
  font-family: var(--nano-font-mono, monospace);
  font-size: 0.74rem;
}

td.is-empty {
  background: var(--nano-bg-muted, rgba(128, 128, 128, 0.05));
}

.nce-diff-row.is-active-line {
  background: color-mix(in srgb, var(--nano-accent-primary, #6366f1) 12%, transparent);
}

/* Live Editable Overlay Editor */
.nce-live-editor-shell {
  display: flex;
  position: relative;
  min-height: 220px;
  overflow: hidden;
  flex: 1;
}

.nce-live-gutter {
  padding: 12px 0;
  min-width: 44px;
  background: var(--nano-code-header-bg, rgba(0, 0, 0, 0.15));
  border-right: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.08));
  overflow: hidden;
  user-select: none;
  flex-shrink: 0;
}

.nce-gutter-num {
  padding: 0 10px 0 6px;
  text-align: right;
  font-size: 0.78rem;
  line-height: 1.55;
  color: var(--nano-text-muted, #64748b);
  font-variant-numeric: tabular-nums;
}

.nce-gutter-num.active {
  color: var(--nano-accent-primary, #818cf8);
  font-weight: 700;
}

.nce-live-stage {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.nce-live-highlight,
.nce-live-textarea {
  margin: 0;
  padding: 12px 14px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  font-family: var(--nano-font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace);
  font-size: 0.78rem;
  line-height: 1.55;
  tab-size: 2;
  white-space: pre;
  overflow: auto;
}

.nce-live-highlight code {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

.nano-code-editor.is-wrapped .nce-live-highlight,
.nano-code-editor.is-wrapped .nce-live-textarea {
  white-space: pre-wrap;
  word-break: break-word;
}

.nce-live-highlight {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.nce-live-textarea {
  position: relative;
  z-index: 1;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: transparent;
  caret-color: var(--nano-state-active, #00f2fe);
}

.nce-live-textarea::selection {
  background: rgba(99, 102, 241, 0.32);
  color: transparent;
}

.nce-completions-popup {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 10px;
  max-width: 520px;
  z-index: 10;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(56, 189, 248, 0.35);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.nce-completions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 10px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #38bdf8;
  background: rgba(2, 6, 23, 0.65);
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}

.nce-completions-hint {
  color: #94a3b8;
  font-weight: 600;
}

.nce-completion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 5px 10px;
  border: none;
  background: transparent;
  color: #f1f5f9;
  font-family: inherit;
  font-size: 0.74rem;
  text-align: left;
  cursor: pointer;
}

.nce-completion-item.active,
.nce-completion-item:hover {
  background: rgba(56, 189, 248, 0.18);
}

.nce-comp-kind {
  font-size: 0.62rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(56, 189, 248, 0.16);
  color: #38bdf8;
  min-width: 38px;
  text-align: center;
}

.nce-comp-label {
  font-weight: 700;
  color: #34d399;
}

.nce-comp-detail {
  color: #94a3b8;
  font-size: 0.69rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nce-theme-select-wrap {
  min-width: 175px;
}

.nce-theme-select-wrap :deep(.nano-select-trigger) {
  min-height: 26px;
  height: 26px;
  padding: 0 10px;
  font-size: 0.72rem;
  border-radius: 6px;
}

/* Scoped fallback token rules backed by --hl-* CSS variables */
:deep(.hljs-keyword),
:deep(.hljs-selector-tag),
:deep(.hljs-subst),
:deep(.hl-keyword) {
  color: var(--hl-keyword, #c084fc);
  font-weight: 600;
}

:deep(.hljs-string),
:deep(.hljs-addition),
:deep(.hljs-regexp),
:deep(.hl-string) {
  color: var(--hl-string, #34d399);
}

:deep(.hljs-number),
:deep(.hl-number) {
  color: var(--hl-number, #fbbf24);
}

:deep(.hljs-literal),
:deep(.hljs-boolean),
:deep(.hl-boolean) {
  color: var(--hl-boolean, #f472b6);
  font-weight: 600;
}

:deep(.hljs-comment),
:deep(.hljs-quote),
:deep(.hl-comment) {
  color: var(--hl-comment, #64748b);
  font-style: italic;
}

:deep(.hljs-tag),
:deep(.hljs-name),
:deep(.hl-tag) {
  color: var(--hl-tag, #38bdf8);
  font-weight: 600;
}

:deep(.hljs-attr),
:deep(.hljs-attribute),
:deep(.hl-attr) {
  color: var(--hl-attr, #a78bfa);
}

:deep(.hljs-title.function_),
:deep(.hljs-function),
:deep(.hljs-section),
:deep(.hl-function) {
  color: var(--hl-func, #60a5fa);
}

:deep(.hljs-property),
:deep(.hl-property) {
  color: var(--hl-prop, #38bdf8);
}

:deep(.hljs-variable),
:deep(.hljs-variable.language_),
:deep(.hljs-template-variable),
:deep(.hl-var) {
  color: var(--hl-var, #fb7185);
}

:deep(.hljs-selector-class),
:deep(.hljs-selector-id),
:deep(.hl-selector) {
  color: var(--hl-attr, #e879f9);
}

:deep(.hljs-symbol) {
  color: var(--hl-symbol, var(--hl-attr, #e879f9));
  font-weight: 600;
}

:deep(.hljs-operator) {
  color: var(--hl-operator, var(--hl-keyword, #818cf8));
  font-weight: 600;
}

:deep(.hljs-punctuation),
:deep(.hl-punct) {
  color: var(--hl-punct, #94a3b8);
}

:deep(.hljs-built_in),
:deep(.hljs-meta) {
  color: var(--hl-builtin, #60a5fa);
  font-weight: 600;
}

:deep(.hljs-title),
:deep(.hljs-title.class_),
:deep(.hljs-type) {
  color: var(--hl-type, #fbbf24);
  font-weight: 600;
}

:deep(.hljs-params) {
  color: var(--hl-params, #e2e8f0);
}
</style>
