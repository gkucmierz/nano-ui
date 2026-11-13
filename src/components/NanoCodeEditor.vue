<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
  highlightCode,
  escapeHtml,
  registerParser,
  SYNTAX_THEMES,
} from '../utils/syntax-highlighter.js';
import {
  detectLangFromPath,
  detectMediaTypeFromPath,
  extractSvgIntrinsicDimensions,
  formatFileSizeBytes,
  normalizeSvgPreviewMarkup,
  parseUnifiedDiff,
  PREVIEW_MEDIA_TYPES,
  resolveEditorViewMode,
} from '../utils/git-diff.js';
import {
  compileNsdPreview,
  extractEmbeddedNsdSnippets,
} from '../utils/nsd-preview.js';
import { NANOSOUND_COMPLETIONS, GLSL_COMPLETIONS, BLENDER_COMPLETIONS } from '../parsers/index.js';
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
  /**
   * Optional URL (or data URI) for previewing binary/media files (images, SVG, audio, video, PDF)
   */
  mediaUrl: {
    type: String,
    default: '',
  },
  /**
   * Optional URL for previous version (e.g. HEAD / parent commit) to enable Before vs After media comparison
   */
  beforeMediaUrl: {
    type: String,
    default: '',
  },
  /**
   * Optional metadata object for media asset: { sizeBytes, oldSizeBytes, mimeType, status }
   */
  mediaMeta: {
    type: Object,
    default: null,
  },
  /**
   * Indicates that an asynchronous diff/file payload is currently in flight for `filePath`.
   * Prevents transient mode/tab flicker while awaiting async HTTP diff/metadata responses.
   */
  loading: {
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
const userLockedMode = ref(null);
const internalDiffStyle = ref(props.diffStyle || 'unified');
const isWrapped = ref(props.defaultWrap);
const copied = ref(false);
const activeLine = ref(1);
const textareaRef = ref(null);
const highlightLayerRef = ref(null);
const gutterRef = ref(null);
let copyTimer = null;

watch(() => props.diffStyle, (val) => {
  if (val) internalDiffStyle.value = val;
});

const resolvedLang = computed(() => {
  return detectLangFromPath(props.filePath, props.lang);
});

const resolvedMediaType = computed(() => {
  if (resolvedLang.value === 'nanosound') return 'nsd';
  return detectMediaTypeFromPath(props.filePath);
});

const fetchedMediaText = ref('');
let customTextReqSeq = 0;
let customTextAbortCtrl = null;

const currentCode = computed(() => {
  if (props.modelValue !== undefined) return props.modelValue;
  return props.code || fetchedMediaText.value || '';
});

const isSvgAsset = computed(() => {
  const pathClean = String(props.filePath || props.mediaUrl || '')
    .split('?')[0]
    .split('#')[0]
    .trim()
    .toLowerCase();
  return pathClean.endsWith('.svg');
});

const rawSvgPreviewSource = computed(() => {
  if (!isSvgAsset.value) return '';
  let rawSvg = currentCode.value.trim();
  if (!rawSvg && props.diff) {
    const reconstructedLines = props.diff
      .split(/\r?\n/)
      .filter((l) => (l.startsWith('+') || l.startsWith(' ')) && !l.startsWith('+++'))
      .map((l) => l.slice(1));
    rawSvg = reconstructedLines.join('\n').trim();
  }
  return rawSvg && rawSvg.includes('<svg') ? rawSvg : '';
});

const svgIntrinsicDims = computed(() => {
  if (!rawSvgPreviewSource.value) return { width: 0, height: 0, source: null };
  return extractSvgIntrinsicDimensions(rawSvgPreviewSource.value);
});

const svgInlineDataUrl = computed(() => {
  if (!rawSvgPreviewSource.value) return '';
  const normalized = normalizeSvgPreviewMarkup(rawSvgPreviewSource.value);
  if (!normalized) return '';
  return `data:image/svg+xml;utf8,${encodeURIComponent(normalized)}`;
});

const effectiveMediaUrl = computed(() => {
  if (isSvgAsset.value && svgInlineDataUrl.value) {
    return svgInlineDataUrl.value;
  }
  return props.mediaUrl || svgInlineDataUrl.value || '';
});

const embeddedNsdSnippets = computed(() => {
  if (resolvedMediaType.value) return [];
  const source = currentCode.value || props.diff || '';
  if (!source) return [];
  return extractEmbeddedNsdSnippets(source).map((snip) => ({
    ...snip,
    compiled: compileNsdPreview(snip.dsl, { sampleRate: 22050, waveformBins: 96 }),
  }));
});

const hasEmbeddedNsd = computed(() => embeddedNsdSnippets.value.length > 0);

const hasMediaPreview = computed(() => {
  const mt = resolvedMediaType.value;
  if (!mt) return false;
  if (mt === 'nsd' || mt === '7uaudio' || mt === 'meme') {
    return Boolean(
      currentCode.value.trim() ||
      props.diff.trim() ||
      effectiveMediaUrl.value ||
      props.loading
    );
  }
  if (PREVIEW_MEDIA_TYPES.has(mt)) {
    return Boolean(effectiveMediaUrl.value || props.beforeMediaUrl || props.loading);
  }
  return false;
});

const canShowPreviewTab = computed(() => hasMediaPreview.value || hasEmbeddedNsd.value);

const mediaBgMode = ref('checker'); // 'checker' | 'dark' | 'light'
const mediaZoom = ref(1);
const mediaCompareMode = ref('after'); // 'after' | 'split' | 'before'
const userLockedCompareMode = ref(false);
const naturalImgWidth = ref(0);
const naturalImgHeight = ref(0);
const beforeImgWidth = ref(0);
const beforeImgHeight = ref(0);
const afterImgMissing = ref(false);
const beforeImgMissing = ref(false);
const mediaDurationSec = ref(0);
const isPlayingCustomFormat = ref(false);
const activePlayingSnippetId = ref('');
const loadedFontFamily = ref('');
let fontLoadSeq = 0;
let customAudioCtx = null;
let customPlaybackTimer = null;

function setMediaCompareMode(nextCompareMode) {
  userLockedCompareMode.value = true;
  mediaCompareMode.value = nextCompareMode;
}

function syncAutoMode() {
  internalMode.value = resolveEditorViewMode({
    propMode: props.mode,
    userLockedMode: userLockedMode.value,
    mediaType: resolvedMediaType.value,
    hasMediaPreview: hasMediaPreview.value,
    hasEmbeddedNsd: hasEmbeddedNsd.value,
    hasDiff: Boolean(props.diff),
    hasCode: Boolean(currentCode.value || props.modelValue !== undefined),
    loading: props.loading,
  });
}

// Reset per-file manual tab locks ONLY when switching to another filePath
watch(
  () => props.filePath,
  () => {
    userLockedMode.value = null;
    userLockedCompareMode.value = false;
    stopCustomFormatPlayback();
  }
);

watch(
  () => props.mode,
  (val) => {
    userLockedMode.value = null;
    if (val && val !== 'auto') {
      internalMode.value = val;
    } else {
      syncAutoMode();
    }
  }
);

// Reset image natural dimensions & zoom ONLY when primary file or mediaUrl changes
watch(
  [() => props.filePath, () => props.mediaUrl, () => props.mediaMeta?.exists],
  () => {
    naturalImgWidth.value = 0;
    naturalImgHeight.value = 0;
    beforeImgWidth.value = 0;
    beforeImgHeight.value = 0;
    afterImgMissing.value = props.mediaMeta?.exists === false;
    beforeImgMissing.value = false;
    mediaDurationSec.value = 0;
    mediaZoom.value = 1;
    userLockedCompareMode.value = false;
    mediaCompareMode.value = props.beforeMediaUrl && effectiveMediaUrl.value ? 'split' : 'after';
  },
  { immediate: true }
);

// When async `beforeMediaUrl` resolves later (e.g. meta=1 HEAD check), promote to split view without resetting zoom or mode
watch(
  () => props.beforeMediaUrl,
  (beforeUrl) => {
    beforeImgWidth.value = 0;
    beforeImgHeight.value = 0;
    beforeImgMissing.value = false;
    if (!userLockedCompareMode.value) {
      mediaCompareMode.value = beforeUrl && effectiveMediaUrl.value ? 'split' : 'after';
    }
  }
);

// Fetch complete text for custom text-based RFC formats (.nsd, .7uaudio, .meme) and .svg icons when only mediaUrl is provided
watch(
  [() => props.filePath, () => props.mediaUrl, resolvedMediaType, isSvgAsset, () => props.code, () => props.modelValue],
  async ([_fp, mUrl, mt, svgFlag, explicitCode, modelVal]) => {
    const seq = ++customTextReqSeq;
    if (customTextAbortCtrl) {
      customTextAbortCtrl.abort();
      customTextAbortCtrl = null;
    }
    fetchedMediaText.value = '';
    const isCustomTextFmt = mt === 'nsd' || mt === '7uaudio' || mt === 'meme';
    if (!mUrl || (!isCustomTextFmt && !svgFlag)) return;
    if (explicitCode || modelVal !== undefined) return;
    if (!globalThis.fetch) return;

    const ctrl = new AbortController();
    customTextAbortCtrl = ctrl;
    try {
      const res = await globalThis.fetch(mUrl, { signal: ctrl.signal });
      if (seq !== customTextReqSeq || !res.ok) return;
      const ctype = String(res.headers?.get?.('content-type') || '').toLowerCase();
      const isAllowedSvgMime = svgFlag && ctype.includes('svg');
      if (!isAllowedSvgMime && (ctype.startsWith('image/') || ctype.startsWith('audio/') || ctype.startsWith('video/'))) return;
      const txt = await res.text();
      if (seq !== customTextReqSeq) return;
      fetchedMediaText.value = txt;
    } catch {
      // Ignore AbortError or offline fetch failure; diff/mediaUrl fallback still works
    }
  },
  { immediate: true }
);

const isSafePreviewUrl = (rawUrl, { allowDataImage = false } = {}) => {
  const s = String(rawUrl || '').trim();
  if (!s) return false;
  const compact = s.replace(/[\x00-\x20]+/g, '').toLowerCase();
  if (compact.startsWith('javascript:') || compact.startsWith('vbscript:') || compact.startsWith('data:text/html')) {
    return false;
  }
  if (allowDataImage && /^data:image\/(?:png|jpeg|jpg|webp|gif|avif);/i.test(compact)) {
    return true;
  }
  if (compact.startsWith('https://') || compact.startsWith('http://') || compact.startsWith('blob:')) {
    return true;
  }
  if (s.startsWith('/') && !s.startsWith('//')) {
    return true;
  }
  return !/^[a-z][a-z0-9+.-]*:/i.test(compact) && !s.startsWith('//');
};

const safePdfMediaUrl = computed(() => {
  const url = effectiveMediaUrl.value;
  if (!url || !isSafePreviewUrl(url)) return '';
  if (props.mediaBlob && props.mediaBlob.type && props.mediaBlob.type !== 'application/pdf') {
    return '';
  }
  return url;
});

let activeFontFace = null;
let isEditorUnmounted = false;

const releaseActiveFontFace = () => {
  const doc = globalThis.document;
  if (activeFontFace && doc && doc.fonts && typeof doc.fonts.delete === 'function') {
    try {
      doc.fonts.delete(activeFontFace);
    } catch {}
  }
  activeFontFace = null;
};

// Dynamically load FontFace for .woff2 / .woff / .ttf / .otf font specimen previews
watch(
  [() => props.filePath, effectiveMediaUrl, resolvedMediaType],
  async ([_fp, mUrl, mt]) => {
    const seq = ++fontLoadSeq;
    loadedFontFamily.value = '';
    releaseActiveFontFace();
    if (mt !== 'font' || !mUrl || !isSafePreviewUrl(mUrl)) return;
    const win = globalThis.window;
    const doc = globalThis.document;
    if (!win || !win.FontFace || !doc || !doc.fonts) return;
    const family = `nano-font-preview-${editorAutoId}-${seq}`;
    try {
      const face = new win.FontFace(family, `url(${JSON.stringify(mUrl)})`);
      await face.load();
      if (isEditorUnmounted || seq !== fontLoadSeq) return;
      releaseActiveFontFace();
      doc.fonts.add(face);
      activeFontFace = face;
      loadedFontFamily.value = family;
    } catch {
      // Keep system fallback if font binary fails to decode
    }
  },
  { immediate: true }
);

// Single deterministic view-mode synchronization across sync & async prop updates
watch(
  [
    () => props.filePath,
    () => props.mode,
    resolvedMediaType,
    hasMediaPreview,
    hasEmbeddedNsd,
    () => Boolean(props.diff),
    () => Boolean(currentCode.value || props.modelValue !== undefined),
    () => props.loading,
  ],
  syncAutoMode,
  { immediate: true }
);

function handleAfterImageLoad(e) {
  afterImgMissing.value = false;
  const el = e?.target;
  if (el) {
    naturalImgWidth.value = el.naturalWidth || svgIntrinsicDims.value.width || 0;
    naturalImgHeight.value = el.naturalHeight || svgIntrinsicDims.value.height || 0;
  }
}

function handleAfterImageError() {
  afterImgMissing.value = true;
}

function handleBeforeImageLoad(e) {
  beforeImgMissing.value = false;
  const el = e?.target;
  if (el) {
    beforeImgWidth.value = el.naturalWidth || svgIntrinsicDims.value.width || 0;
    beforeImgHeight.value = el.naturalHeight || svgIntrinsicDims.value.height || 0;
  }
}

function handleBeforeImageError() {
  beforeImgMissing.value = true;
}

function handleMediaMetadataLoaded(e) {
  const el = e?.target;
  if (el) {
    if (Number.isFinite(el.duration)) {
      mediaDurationSec.value = Math.round(el.duration * 10) / 10;
    }
    if (el.videoWidth && el.videoHeight) {
      naturalImgWidth.value = el.videoWidth;
      naturalImgHeight.value = el.videoHeight;
    }
  }
}

function adjustMediaZoom(delta) {
  const next = Math.max(0.25, Math.min(4, Math.round((mediaZoom.value + delta) * 100) / 100));
  mediaZoom.value = next;
}

const formattedMediaSize = computed(() => {
  const sz = props.mediaMeta?.sizeBytes;
  if (!Number.isFinite(sz)) return '';
  return formatFileSizeBytes(sz);
});

const formattedMediaDelta = computed(() => {
  const sz = props.mediaMeta?.sizeBytes;
  const oldSz = props.mediaMeta?.oldSizeBytes;
  if (!Number.isFinite(sz) || !Number.isFinite(oldSz) || oldSz <= 0) return '';
  const diffBytes = sz - oldSz;
  if (diffBytes === 0) return '0 B';
  const sign = diffBytes > 0 ? '+' : '−';
  return `${sign}${formatFileSizeBytes(Math.abs(diffBytes))}`;
});

function extractTextForCustomFormat() {
  if (currentCode.value && currentCode.value.trim()) return currentCode.value.trim();
  if (props.diff) {
    return props.diff
      .split(/\r?\n/)
      .filter((l) => (l.startsWith('+') || l.startsWith(' ')) && !l.startsWith('+++'))
      .map((l) => l.slice(1))
      .join('\n')
      .trim();
  }
  return '';
}

const parsedNsdPreview = computed(() => {
  if (resolvedMediaType.value !== 'nsd') return null;
  const raw = extractTextForCustomFormat();
  return compileNsdPreview(raw);
});

const parsed7uAudio = computed(() => {
  if (resolvedMediaType.value !== '7uaudio') return null;
  try {
    const raw = extractTextForCustomFormat();
    if (!raw) return null;
    const obj = JSON.parse(raw);
    const seq = Array.isArray(obj.sequence) ? obj.sequence : [];
    const notes = seq.slice(0, 160);
    let minMidi = 108;
    let maxMidi = 21;
    let maxTime = 1;
    for (const n of notes) {
      const m = Number(n.midi) || 60;
      const tEnd = (Number(n.time) || 0) + (Number(n.duration) || 0.25);
      if (m < minMidi) minMidi = m;
      if (m > maxMidi) maxMidi = m;
      if (tEnd > maxTime) maxTime = tEnd;
    }
    return {
      protocol: obj.protocol || '7uaudio',
      version: obj.version || '1.0',
      name: obj.metadata?.name || props.filePath || '7uAudio Sequence',
      duration: Number(obj.metadata?.duration || maxTime).toFixed(1),
      totalNotes: seq.length,
      notes,
      minMidi: Math.max(21, minMidi - 2),
      maxMidi: Math.min(108, maxMidi + 2),
      maxTime: Math.max(1, maxTime),
    };
  } catch {
    return null;
  }
});

const parsedMemeSpec = computed(() => {
  if (resolvedMediaType.value !== 'meme') return null;
  try {
    const raw = extractTextForCustomFormat();
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return {
      protocol: obj.protocol || '7u-meme',
      version: obj.version || '1.0',
      title: obj.title || obj.id || props.filePath || 'Meme Spec',
      topCaption: obj.captions?.top || obj.topText || '',
      bottomCaption: obj.captions?.bottom || obj.bottomText || '',
      panels: Array.isArray(obj.panels) ? obj.panels : [],
      imageUrl: obj.imageUrl || obj.background || '',
      tags: Array.isArray(obj.tags) ? obj.tags : [],
    };
  } catch {
    return null;
  }
});

function stopCustomFormatPlayback() {
  if (customPlaybackTimer) {
    clearTimeout(customPlaybackTimer);
    customPlaybackTimer = null;
  }
  if (customAudioCtx) {
    try {
      customAudioCtx.close();
    } catch {}
    customAudioCtx = null;
  }
  isPlayingCustomFormat.value = false;
  activePlayingSnippetId.value = '';
}

function playNsdDslSnippet(dslText, snippetId = 'primary') {
  if (isPlayingCustomFormat.value && activePlayingSnippetId.value === snippetId) {
    stopCustomFormatPlayback();
    return;
  }
  const win = globalThis.window;
  if (!win) return;
  const AudioCtx = win.AudioContext || win.webkitAudioContext;
  if (!AudioCtx) return;

  stopCustomFormatPlayback();
  customAudioCtx = new AudioCtx();
  const sr = customAudioCtx.sampleRate || 44100;
  const compiled = compileNsdPreview(dslText, { sampleRate: sr });
  if (!compiled.valid || compiled.pcm.length === 0) {
    stopCustomFormatPlayback();
    return;
  }

  isPlayingCustomFormat.value = true;
  activePlayingSnippetId.value = snippetId;

  const audioBuf = customAudioCtx.createBuffer(1, compiled.pcm.length, sr);
  audioBuf.getChannelData(0).set(compiled.pcm);
  const src = customAudioCtx.createBufferSource();
  const masterGain = customAudioCtx.createGain();
  masterGain.gain.value = 0.78;
  src.buffer = audioBuf;
  src.connect(masterGain);
  masterGain.connect(customAudioCtx.destination);
  src.start();

  emit('run', { type: 'nsd', code: dslText, filePath: props.filePath });
  customPlaybackTimer = setTimeout(() => {
    stopCustomFormatPlayback();
  }, Math.min(8000, compiled.durationMs + 140));
}

function playCustomFormatPreview() {
  if (resolvedMediaType.value === 'nsd') {
    const rawNsd = extractTextForCustomFormat();
    playNsdDslSnippet(rawNsd, 'primary');
    return;
  }

  if (isPlayingCustomFormat.value) {
    stopCustomFormatPlayback();
    return;
  }
  const win = globalThis.window;
  if (!win) return;
  const AudioCtx = win.AudioContext || win.webkitAudioContext;
  if (!AudioCtx) return;

  stopCustomFormatPlayback();
  customAudioCtx = new AudioCtx();
  isPlayingCustomFormat.value = true;
  activePlayingSnippetId.value = 'primary';
  const now = customAudioCtx.currentTime;

  if (resolvedMediaType.value === '7uaudio' && parsed7uAudio.value) {
    const previewNotes = parsed7uAudio.value.notes.slice(0, 48);
    let latestEnd = 0.5;
    for (const n of previewNotes) {
      const start = Math.max(0, Number(n.time) || 0);
      if (start > 12) continue;
      const dur = Math.max(0.08, Math.min(2.5, Number(n.duration) || 0.3));
      const midi = Number(n.midi) || 60;
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const vel = Math.max(0.05, Math.min(1, Number(n.velocity) || 0.7)) * 0.18;

      const osc = customAudioCtx.createOscillator();
      const gain = customAudioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(vel, now + start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain);
      gain.connect(customAudioCtx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.02);
      if (start + dur > latestEnd) latestEnd = start + dur;
    }
    customPlaybackTimer = setTimeout(() => {
      stopCustomFormatPlayback();
    }, Math.min(12500, Math.round(latestEnd * 1000) + 150));
  }
}

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
  return Boolean(props.diff && (currentCode.value || props.modelValue !== undefined));
});

const containerMaxHeight = computed(() => {
  if (!props.maxHeight) return undefined;
  return Number.isFinite(props.maxHeight) ? `${props.maxHeight}px` : props.maxHeight;
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
  if (!saved || Object.prototype.toString.call(saved) !== '[object Object]') return;

  if (saved.diffStyle === 'unified' || saved.diffStyle === 'split') {
    internalDiffStyle.value = saved.diffStyle;
    emit('update:diffStyle', saved.diffStyle);
  }
  if (Object.prototype.toString.call(saved.syntaxTheme) === '[object String]' && saved.syntaxTheme.trim()) {
    internalSyntaxTheme.value = saved.syntaxTheme.trim();
    emit('update:syntaxTheme', internalSyntaxTheme.value);
  }
  if (saved.wrap === true || saved.wrap === false) {
    isWrapped.value = saved.wrap;
  }
  if (props.persistDraft && props.editable && Object.prototype.toString.call(saved.draft) === '[object String]') {
    if (saved.draft !== currentCode.value) {
      emit('update:modelValue', saved.draft);
      emit('update:code', saved.draft);
    }
  }
};

const setMode = (m) => {
  userLockedMode.value = m;
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

const GLSL_LANG_IDS = new Set([
  'glsl',
  'frag',
  'vert',
  'shader',
  'wgsl',
  'hlsl',
  'fs',
  'vs',
]);

const BLENDER_LANG_IDS = new Set([
  'bpy',
  'blender',
  'blender-python',
  'bmesh',
]);

const effectiveCompletions = computed(() => {
  if (Array.isArray(props.completions)) return props.completions;
  if (resolvedLang.value === 'nanosound' || resolvedLang.value === 'nsd' || resolvedLang.value === 'sound') {
    return NANOSOUND_COMPLETIONS;
  }
  if (GLSL_LANG_IDS.has(resolvedLang.value)) {
    return GLSL_COMPLETIONS;
  }
  if (BLENDER_LANG_IDS.has(resolvedLang.value)) {
    return BLENDER_COMPLETIONS;
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
  isEditorUnmounted = true;
  releaseActiveFontFace();
  stopCustomFormatPlayback();
  if (customTextAbortCtrl) {
    customTextAbortCtrl.abort();
    customTextAbortCtrl = null;
  }
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
      'is-preview-mode': internalMode === 'preview',
      'is-editable': editable && internalMode === 'code',
    }"
  >
    <!-- Header Bar -->
    <header class="nce-header">
      <div class="nce-header-left">
        <span v-if="filePath" class="nce-filepath" v-tooltip="filePath">{{ filePath }}</span>
        <span v-else class="nce-filepath">Code Inspector</span>

        <span v-if="resolvedLang" class="nce-lang-badge">{{ resolvedLang }}</span>

        <span v-if="formattedMediaSize" class="nce-media-meta-badge">
          {{ formattedMediaSize }}
          <span
            v-if="formattedMediaDelta"
            :class="formattedMediaDelta.startsWith('+') ? 'nce-stat-add' : formattedMediaDelta.startsWith('−') ? 'nce-stat-del' : ''"
          >({{ formattedMediaDelta }})</span>
        </span>

        <span v-if="(naturalImgWidth || svgIntrinsicDims.width) && (naturalImgHeight || svgIntrinsicDims.height)" class="nce-media-meta-badge">
          {{ naturalImgWidth || svgIntrinsicDims.width }}×{{ naturalImgHeight || svgIntrinsicDims.height }} px
        </span>

        <span v-if="mediaDurationSec > 0" class="nce-media-meta-badge">
          {{ mediaDurationSec }}s
        </span>

        <span v-if="internalMode === 'diff' && (parsedDiff.additions || parsedDiff.deletions)" class="nce-diff-stats">
          <span class="nce-stat-add">+{{ parsedDiff.additions }}</span>
          <span class="nce-stat-del">−{{ parsedDiff.deletions }}</span>
        </span>
      </div>

      <div class="nce-header-actions">
        <!-- Quick WebAudio Synthesizer Trigger for .nsd & .7uaudio/.7jap -->
        <button
          v-if="resolvedMediaType === 'nsd' || resolvedMediaType === '7uaudio'"
          type="button"
          class="nce-seg-btn nce-synth-play-btn"
          :class="{ active: isPlayingCustomFormat }"
          @click="playCustomFormatPreview"
        >
          {{ isPlayingCustomFormat ? '⏹ Stop Audio' : `▶ Play .${resolvedMediaType === '7uaudio' ? '7uaudio' : 'nsd'}` }}
        </button>

        <!-- Optional Syntax Color Profile Selector -->
        <div v-if="showThemeSelector && internalMode !== 'preview'" class="nce-theme-select-wrap">
          <NanoSelect
            :model-value="internalSyntaxTheme"
            :options="syntaxThemeOptions"
            size="sm"
            placeholder="Syntax Theme"
            @update:model-value="setSyntaxTheme"
          />
        </div>

        <!-- Mode Toggle (Preview / Diff / Code) -->
        <div v-if="canShowPreviewTab || hasBothDiffAndCode || diff" class="nce-seg-group">
          <button
            v-if="canShowPreviewTab"
            type="button"
            class="nce-seg-btn"
            :class="{ active: internalMode === 'preview' }"
            @click="setMode('preview')"
          >
            {{ hasEmbeddedNsd && !resolvedMediaType ? `♪ .nsd (${embeddedNsdSnippets.length})` : 'Preview' }}
          </button>
          <button
            v-if="diff"
            type="button"
            class="nce-seg-btn"
            :class="{ active: internalMode === 'diff' }"
            @click="setMode('diff')"
          >
            Diff
          </button>
          <button
            v-if="currentCode || modelValue !== undefined || (!diff && !hasMediaPreview)"
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

    <!-- 0. MEDIA & 7U RFC CUSTOM FORMAT PREVIEW MODE -->
    <div
      v-if="internalMode === 'preview' && canShowPreviewTab"
      class="nce-media-viewport nano-scrollbar"
      :style="{ maxHeight: containerMaxHeight }"
    >
      <!-- IMAGE PREVIEW (PNG, JPG, WEBP, GIF, SVG, ICO, AVIF, BMP) -->
      <template v-if="resolvedMediaType === 'image'">
        <div class="nce-media-toolbar">
          <div class="nce-media-toolbar-left">
            <span class="nce-media-kind-pill">{{ isSvgAsset ? 'SVG' : 'IMAGE' }}</span>
            <span v-if="(naturalImgWidth || svgIntrinsicDims.width) && (naturalImgHeight || svgIntrinsicDims.height)" class="nce-media-dim-label">
              {{ naturalImgWidth || svgIntrinsicDims.width }} × {{ naturalImgHeight || svgIntrinsicDims.height }} px
            </span>
            <span v-if="formattedMediaSize" class="nce-media-dim-label">
              · {{ formattedMediaSize }}
            </span>
          </div>

          <div class="nce-media-toolbar-actions">
            <div v-if="beforeMediaUrl && effectiveMediaUrl" class="nce-seg-group">
              <button
                type="button"
                class="nce-seg-btn"
                :class="{ active: mediaCompareMode === 'split' }"
                @click="setMediaCompareMode('split')"
              >
                Split (Before / After)
              </button>
              <button
                type="button"
                class="nce-seg-btn"
                :class="{ active: mediaCompareMode === 'after' }"
                @click="setMediaCompareMode('after')"
              >
                After
              </button>
              <button
                type="button"
                class="nce-seg-btn"
                :class="{ active: mediaCompareMode === 'before' }"
                @click="setMediaCompareMode('before')"
              >
                Before
              </button>
            </div>

            <div class="nce-seg-group">
              <button
                type="button"
                class="nce-seg-btn"
                :class="{ active: mediaBgMode === 'checker' }"
                @click="mediaBgMode = 'checker'"
              >
                Checker
              </button>
              <button
                type="button"
                class="nce-seg-btn"
                :class="{ active: mediaBgMode === 'dark' }"
                @click="mediaBgMode = 'dark'"
              >
                Dark
              </button>
              <button
                type="button"
                class="nce-seg-btn"
                :class="{ active: mediaBgMode === 'light' }"
                @click="mediaBgMode = 'light'"
              >
                Light
              </button>
            </div>

            <div class="nce-seg-group">
              <button type="button" class="nce-seg-btn" @click="adjustMediaZoom(-0.25)">−</button>
              <button type="button" class="nce-seg-btn" @click="mediaZoom = 1">
                {{ Math.round(mediaZoom * 100) }}%
              </button>
              <button type="button" class="nce-seg-btn" @click="adjustMediaZoom(0.25)">+</button>
            </div>
          </div>
        </div>

        <div class="nce-media-stage" :class="`is-bg-${mediaBgMode}`">
          <div v-if="mediaCompareMode === 'split' && beforeMediaUrl && effectiveMediaUrl" class="nce-media-split-grid">
            <figure class="nce-media-figure">
              <figcaption class="nce-media-caption is-before">
                BEFORE
                <span v-if="beforeImgWidth && beforeImgHeight">({{ beforeImgWidth }}×{{ beforeImgHeight }})</span>
              </figcaption>
              <div v-if="beforeImgMissing" class="nce-media-missing-card">
                <span class="nce-media-missing-pill">NEW FILE</span>
                <span class="nce-media-missing-path">{{ filePath || 'Not present in parent revision' }}</span>
              </div>
              <img
                v-else
                :src="beforeMediaUrl"
                :alt="`Before ${filePath}`"
                class="nce-preview-img"
                :class="{ 'is-svg-asset': isSvgAsset }"
                :style="{ transform: `scale(${mediaZoom})` }"
                @load="handleBeforeImageLoad"
                @error="handleBeforeImageError"
              />
            </figure>
            <figure class="nce-media-figure">
              <figcaption class="nce-media-caption is-after" :class="{ 'is-deleted': afterImgMissing }">
                {{ afterImgMissing ? 'AFTER · DELETED (0 B)' : 'AFTER' }}
                <span v-if="!afterImgMissing && (naturalImgWidth || svgIntrinsicDims.width) && (naturalImgHeight || svgIntrinsicDims.height)">({{ naturalImgWidth || svgIntrinsicDims.width }}×{{ naturalImgHeight || svgIntrinsicDims.height }})</span>
              </figcaption>
              <div v-if="afterImgMissing" class="nce-media-missing-card is-deleted">
                <span class="nce-media-missing-pill is-deleted">USUNIĘTO DUPLIKAT / PLIK (0 B)</span>
                <span class="nce-media-missing-path">{{ filePath }}</span>
              </div>
              <img
                v-else
                :src="effectiveMediaUrl"
                :alt="filePath || 'Image preview'"
                class="nce-preview-img"
                :class="{ 'is-svg-asset': isSvgAsset }"
                :style="{ transform: `scale(${mediaZoom})` }"
                @load="handleAfterImageLoad"
                @error="handleAfterImageError"
              />
            </figure>
          </div>
          <figure v-else-if="effectiveMediaUrl || beforeMediaUrl" class="nce-media-figure">
            <div v-if="mediaCompareMode === 'after' && afterImgMissing && !beforeMediaUrl" class="nce-media-missing-card is-deleted">
              <span class="nce-media-missing-pill is-deleted">USUNIĘTO PLIK (0 B)</span>
              <span class="nce-media-missing-path">{{ filePath }}</span>
            </div>
            <img
              v-else
              :src="(mediaCompareMode === 'before' || afterImgMissing) && beforeMediaUrl ? beforeMediaUrl : (effectiveMediaUrl || beforeMediaUrl)"
              :alt="filePath || 'Image preview'"
              class="nce-preview-img"
              :class="{ 'is-svg-asset': isSvgAsset }"
              :style="{ transform: `scale(${mediaZoom})` }"
              @load="handleAfterImageLoad"
              @error="handleAfterImageError"
            />
          </figure>
          <div v-else class="nce-empty">
            {{ loading ? 'Loading image preview…' : 'Image preview unavailable.' }}
          </div>
        </div>
      </template>

      <!-- AUDIO PREVIEW (MP3, WAV, OGG, M4A, FLAC, OPUS) -->
      <template v-else-if="resolvedMediaType === 'audio'">
        <div class="nce-media-stage is-bg-dark nce-audio-stage">
          <div class="nce-audio-card">
            <div class="nce-audio-card-head">
              <span class="nce-media-kind-pill">AUDIO</span>
              <span class="nce-audio-filename">{{ filePath || 'Audio Stream' }}</span>
              <span v-if="mediaDurationSec > 0" class="nce-media-dim-label">{{ mediaDurationSec }}s</span>
              <span v-if="formattedMediaSize" class="nce-media-dim-label">· {{ formattedMediaSize }}</span>
            </div>
            <audio
              v-if="effectiveMediaUrl"
              :src="effectiveMediaUrl"
              controls
              preload="metadata"
              class="nce-audio-player"
              @loadedmetadata="handleMediaMetadataLoaded"
            ></audio>
            <div v-if="beforeMediaUrl" class="nce-audio-before-wrap">
              <span class="nce-media-caption is-before">Previous Revision (HEAD)</span>
              <audio :src="beforeMediaUrl" controls preload="metadata" class="nce-audio-player"></audio>
            </div>
          </div>
        </div>
      </template>

      <!-- VIDEO PREVIEW (MP4, WEBM, MOV, M4V) -->
      <template v-else-if="resolvedMediaType === 'video'">
        <div class="nce-media-stage is-bg-dark nce-video-stage">
          <video
            v-if="effectiveMediaUrl"
            :src="effectiveMediaUrl"
            controls
            playsinline
            preload="metadata"
            class="nce-video-player"
            @loadedmetadata="handleMediaMetadataLoaded"
          ></video>
        </div>
      </template>

      <!-- PDF PREVIEW -->
      <template v-else-if="resolvedMediaType === 'pdf'">
        <iframe
          v-if="safePdfMediaUrl"
          :src="safePdfMediaUrl"
          :title="filePath || 'PDF Preview'"
          referrerpolicy="no-referrer"
          class="nce-pdf-frame"
        ></iframe>
      </template>

      <!-- FONT SPECIMEN PREVIEW (WOFF2, WOFF, TTF, OTF) -->
      <template v-else-if="resolvedMediaType === 'font'">
        <div class="nce-rfc-stage">
          <div class="nce-rfc-card nce-font-card">
            <div class="nce-rfc-head">
              <div>
                <span class="nce-media-kind-pill">TYPOGRAPHY SPECIMEN</span>
                <h4 class="nce-rfc-title">{{ filePath || 'Local WebFont' }}</h4>
              </div>
              <div class="nce-rfc-stats">
                <span v-if="formattedMediaSize">{{ formattedMediaSize }}</span>
                <span>{{ loadedFontFamily ? '✓ Loaded' : 'System Fallback' }}</span>
              </div>
            </div>
            <div
              class="nce-font-specimen-stage"
              :style="loadedFontFamily ? { fontFamily: `'${loadedFontFamily}', sans-serif` } : undefined"
            >
              <p class="nce-font-sample-xl">Zażółć gęślą jaźń · 0123456789</p>
              <p class="nce-font-sample-lg">ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz</p>
              <p class="nce-font-sample-sm">const f = (x) =&gt; x !== 0 ? Math.sin(x) * 440 : 0; // !@#$%^&amp;*()[]{}&lt;&gt;</p>
            </div>
          </div>
        </div>
      </template>

      <!-- RFC-7U-0001: .nsd NANOSOUND ALGEBRAIC SYNTHESIZER & OSCILLOSCOPE PREVIEW -->
      <template v-else-if="resolvedMediaType === 'nsd'">
        <div class="nce-rfc-stage">
          <div v-if="parsedNsdPreview && parsedNsdPreview.valid" class="nce-rfc-card">
            <div class="nce-rfc-head">
              <div>
                <span class="nce-media-kind-pill">RFC-7U-0001 · NANOSOUND DSL</span>
                <h4 class="nce-rfc-title">{{ filePath || 'NanoSound Patch (.nsd)' }}</h4>
              </div>
              <div class="nce-rfc-stats">
                <span>{{ parsedNsdPreview.layers.length }} {{ parsedNsdPreview.layers.length === 1 ? 'voice' : 'voices' }}</span>
                <span>· {{ parsedNsdPreview.durationMs }} ms</span>
                <button
                  type="button"
                  class="nce-seg-btn nce-synth-play-btn"
                  :class="{ active: isPlayingCustomFormat && activePlayingSnippetId === 'primary' }"
                  @click="playCustomFormatPreview"
                >
                  {{ isPlayingCustomFormat && activePlayingSnippetId === 'primary' ? '⏹ Stop Synth' : '▶ Play WebAudio' }}
                </button>
              </div>
            </div>

            <svg class="nce-piano-roll-svg nce-nsd-osc-svg" viewBox="0 0 640 144" preserveAspectRatio="none">
              <rect x="0" y="0" width="640" height="144" fill="rgba(9, 13, 22, 0.92)" rx="6" />
              <line x1="0" y1="72" x2="640" y2="72" stroke="rgba(148, 163, 184, 0.22)" stroke-dasharray="4 4" stroke-width="1" />
              <path v-if="parsedNsdPreview.svgAreaPath" :d="parsedNsdPreview.svgAreaPath" fill="rgba(52, 211, 153, 0.18)" />
              <polyline
                v-if="parsedNsdPreview.svgPoints"
                :points="parsedNsdPreview.svgPoints"
                fill="none"
                stroke="#34d399"
                stroke-width="1.6"
                stroke-linejoin="round"
              />
            </svg>

            <div class="nce-nsd-layers">
              <span
                v-for="layer in parsedNsdPreview.layers"
                :key="layer.id"
                class="nce-nsd-layer-pill"
              >
                <strong>{{ layer.wave }}</strong>
                <span>{{ layer.freqStart === layer.freqEnd ? `${layer.freqStart}Hz` : `${layer.freqStart}→${layer.freqEnd}Hz` }}</span>
                <span>τ={{ layer.decayMs }}ms</span>
                <span v-if="layer.filterType">{{ layer.filterType }}({{ layer.cutoffHz }}Hz)</span>
                <span>×{{ layer.gain }}</span>
              </span>
            </div>

            <code class="nce-nsd-formula">{{ parsedNsdPreview.dsl }}</code>
          </div>
          <div v-else class="nce-empty">
            {{ loading ? 'Synthesizing .nsd waveform…' : 'Empty or unparseable .nsd expression.' }}
          </div>
        </div>
      </template>

      <!-- RFC-7U-0002: .7uaudio / .7jap PIANO ROLL & SYNTHESIZER PREVIEW -->
      <template v-else-if="resolvedMediaType === '7uaudio'">
        <div class="nce-rfc-stage">
          <div v-if="parsed7uAudio" class="nce-rfc-card">
            <div class="nce-rfc-head">
              <div>
                <span class="nce-media-kind-pill">RFC-7U-0002 · {{ parsed7uAudio.protocol.toUpperCase() }} v{{ parsed7uAudio.version }}</span>
                <h4 class="nce-rfc-title">{{ parsed7uAudio.name }}</h4>
              </div>
              <div class="nce-rfc-stats">
                <span>{{ parsed7uAudio.totalNotes }} notes</span>
                <span>· {{ parsed7uAudio.duration }}s</span>
                <button
                  type="button"
                  class="nce-seg-btn nce-synth-play-btn"
                  :class="{ active: isPlayingCustomFormat }"
                  @click="playCustomFormatPreview"
                >
                  {{ isPlayingCustomFormat ? '⏹ Stop Synth' : '▶ Play WebAudio' }}
                </button>
              </div>
            </div>

            <svg class="nce-piano-roll-svg" viewBox="0 0 640 160" preserveAspectRatio="none">
              <rect x="0" y="0" width="640" height="160" fill="rgba(15, 23, 42, 0.85)" rx="6" />
              <line v-for="g in 7" :key="g" x1="0" :y1="g * 20" x2="640" :y2="g * 20" stroke="rgba(148, 163, 184, 0.12)" stroke-width="1" />
              <rect
                v-for="(note, nIdx) in parsed7uAudio.notes"
                :key="nIdx"
                :x="Math.max(2, ((Number(note.time) || 0) / parsed7uAudio.maxTime) * 628)"
                :y="Math.max(4, 152 - (((Number(note.midi) || 60) - parsed7uAudio.minMidi) / Math.max(1, parsed7uAudio.maxMidi - parsed7uAudio.minMidi)) * 144)"
                :width="Math.max(4, ((Number(note.duration) || 0.25) / parsed7uAudio.maxTime) * 628)"
                height="6"
                rx="2"
                fill="#818cf8"
                :fill-opacity="Math.max(0.45, Math.min(1, Number(note.velocity) || 0.8))"
              />
            </svg>
          </div>
          <div v-else class="nce-empty">
            {{ loading ? 'Loading .7uaudio sequence…' : 'Switch to Diff or Code to inspect raw .7uaudio content.' }}
          </div>
        </div>
      </template>

      <!-- RFC-7U-0003: .meme DECLARATIVE MEME SPECIFICATION PREVIEW -->
      <template v-else-if="resolvedMediaType === 'meme'">
        <div class="nce-rfc-stage">
          <div v-if="parsedMemeSpec" class="nce-rfc-card nce-meme-card">
            <div class="nce-rfc-head">
              <span class="nce-media-kind-pill">RFC-7U-0003 · {{ parsedMemeSpec.protocol.toUpperCase() }} v{{ parsedMemeSpec.version }}</span>
              <span class="nce-rfc-title">{{ parsedMemeSpec.title }}</span>
            </div>
            <div class="nce-meme-canvas">
              <div v-if="parsedMemeSpec.topCaption" class="nce-meme-caption is-top">{{ parsedMemeSpec.topCaption }}</div>
              <img
                v-if="parsedMemeSpec.imageUrl && isSafePreviewUrl(parsedMemeSpec.imageUrl, { allowDataImage: true })"
                :src="parsedMemeSpec.imageUrl"
                :alt="parsedMemeSpec.title"
                referrerpolicy="no-referrer"
                class="nce-preview-img"
              />
              <div v-if="parsedMemeSpec.panels.length > 0" class="nce-meme-panels">
                <div v-for="(panel, pIdx) in parsedMemeSpec.panels" :key="pIdx" class="nce-meme-panel">
                  <span class="nce-meme-panel-idx">#{{ pIdx + 1 }}</span>
                  <p class="nce-meme-panel-text">{{ panel.caption || panel.text || panel.prompt || JSON.stringify(panel) }}</p>
                </div>
              </div>
              <div v-if="parsedMemeSpec.bottomCaption" class="nce-meme-caption is-bottom">{{ parsedMemeSpec.bottomCaption }}</div>
            </div>
          </div>
          <div v-else-if="effectiveMediaUrl && mediaMeta?.mimeType?.startsWith('image/')" class="nce-media-stage is-bg-checker">
            <img :src="effectiveMediaUrl" :alt="filePath || 'Meme preview'" class="nce-preview-img" />
          </div>
          <div v-else class="nce-empty">
            {{ loading ? 'Loading .meme container…' : 'Switch to Diff or Code to inspect raw .meme payload.' }}
          </div>
        </div>
      </template>

      <!-- EMBEDDED NANOSOUND (.nsd) PRESETS RACK FOR SOURCE CODE FILES -->
      <template v-else-if="hasEmbeddedNsd">
        <div class="nce-rfc-stage">
          <div
            v-for="snip in embeddedNsdSnippets"
            :key="snip.id"
            class="nce-rfc-card nce-embedded-nsd-card"
          >
            <div class="nce-rfc-head">
              <div>
                <span class="nce-media-kind-pill">EMBEDDED .NSD</span>
                <strong class="nce-nsd-snip-label">{{ snip.label }}</strong>
              </div>
              <div class="nce-rfc-stats">
                <span>{{ snip.compiled.durationMs }} ms</span>
                <button
                  type="button"
                  class="nce-seg-btn nce-synth-play-btn"
                  :class="{ active: isPlayingCustomFormat && activePlayingSnippetId === snip.id }"
                  @click="playNsdDslSnippet(snip.dsl, snip.id)"
                >
                  {{ isPlayingCustomFormat && activePlayingSnippetId === snip.id ? '⏹ Stop' : '▶ Play' }}
                </button>
              </div>
            </div>
            <svg class="nce-piano-roll-svg nce-nsd-osc-mini" viewBox="0 0 640 144" preserveAspectRatio="none">
              <rect x="0" y="0" width="640" height="144" fill="rgba(9, 13, 22, 0.9)" rx="6" />
              <line x1="0" y1="72" x2="640" y2="72" stroke="rgba(148, 163, 184, 0.18)" stroke-dasharray="4 4" stroke-width="1" />
              <path v-if="snip.compiled.svgAreaPath" :d="snip.compiled.svgAreaPath" fill="rgba(129, 140, 248, 0.2)" />
              <polyline
                v-if="snip.compiled.svgPoints"
                :points="snip.compiled.svgPoints"
                fill="none"
                stroke="#818cf8"
                stroke-width="1.6"
              />
            </svg>
            <code class="nce-nsd-formula">{{ snip.dsl }}</code>
          </div>
        </div>
      </template>
    </div>

    <!-- 1. DIFF MODE: UNIFIED -->
    <div
      v-else-if="internalMode === 'diff' && internalDiffStyle === 'unified'"
      class="nce-diff-viewport nano-scrollbar"
      :style="{ maxHeight: containerMaxHeight }"
    >
      <div v-if="parsedDiff.lines.length === 0" class="nce-empty">
        {{ loading ? 'Loading file diff…' : 'No diff changes to display.' }}
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
        {{ loading ? 'Loading file diff…' : 'No diff changes to display.' }}
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

/* Media & 7u RFC Previewer */
.nce-media-meta-badge {
  font-family: var(--nano-font-mono, 'JetBrains Mono', monospace);
  font-size: 0.68rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(148, 163, 184, 0.12);
  color: var(--nano-text-muted, #94a3b8);
  white-space: nowrap;
}

.nce-synth-play-btn {
  border: 1px solid rgba(129, 140, 248, 0.35);
  border-radius: 5px;
  padding: 3px 9px;
  background: rgba(99, 102, 241, 0.16);
  color: #a5b4fc;
}

.nce-synth-play-btn.active {
  background: rgba(244, 63, 94, 0.22);
  border-color: rgba(244, 63, 94, 0.45);
  color: #fda4af;
}

.nce-media-viewport {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: var(--nano-code-bg, #0b1120);
}

.nce-media-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(15, 23, 42, 0.65);
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  font-family: var(--nano-font-sans, sans-serif);
}

.nce-media-toolbar-left,
.nce-media-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.nce-media-kind-pill {
  font-family: var(--nano-font-mono, monospace);
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(16, 185, 129, 0.16);
  color: #34d399;
}

.nce-media-dim-label {
  font-family: var(--nano-font-mono, monospace);
  font-size: 0.72rem;
  color: var(--nano-text-muted, #94a3b8);
}

.nce-media-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 280px;
  padding: 20px;
  overflow: auto;
  box-sizing: border-box;
}

.nce-media-stage.is-bg-checker {
  background-color: #0f172a;
  background-image:
    linear-gradient(45deg, rgba(148, 163, 184, 0.1) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(148, 163, 184, 0.1) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(148, 163, 184, 0.1) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(148, 163, 184, 0.1) 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;
}

.nce-media-stage.is-bg-dark {
  background: #090d16;
}

.nce-media-stage.is-bg-light {
  background: #f1f5f9;
}

.nce-media-split-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  width: 100%;
  align-items: center;
}

.nce-media-figure {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  max-width: 100%;
}

.nce-media-caption {
  font-family: var(--nano-font-mono, monospace);
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: 4px;
}

.nce-media-caption.is-before {
  background: rgba(244, 63, 94, 0.18);
  color: #fda4af;
}

.nce-media-caption.is-after {
  background: rgba(16, 185, 129, 0.18);
  color: #6ee7b7;
}

.nce-media-caption.is-after.is-deleted {
  background: rgba(244, 63, 94, 0.18);
  color: #fda4af;
}

.nce-media-missing-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 240px;
  min-height: 150px;
  padding: 20px 24px;
  border-radius: 10px;
  border: 1px dashed rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.72);
  text-align: center;
}

.nce-media-missing-card.is-deleted {
  border-color: rgba(244, 63, 94, 0.42);
  background: rgba(30, 14, 24, 0.72);
}

.nce-media-missing-pill {
  font-family: var(--nano-font-mono, monospace);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.16);
  color: #7dd3fc;
}

.nce-media-missing-pill.is-deleted {
  background: rgba(244, 63, 94, 0.2);
  color: #fda4af;
}

.nce-media-missing-path {
  font-family: var(--nano-font-mono, monospace);
  font-size: 0.74rem;
  color: var(--nano-text-muted, #94a3b8);
  word-break: break-all;
}

.nce-preview-img {
  display: block;
  max-width: 100%;
  max-height: 62vh;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
  transition: transform 0.15s ease;
  transform-origin: center center;
}

.nce-preview-img.is-svg-asset {
  width: min(240px, 60vw);
  height: auto;
  min-width: 96px;
  min-height: 96px;
  box-shadow: none;
  filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.35));
}

.nce-audio-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(560px, 100%);
  padding: 18px 20px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.nce-audio-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.nce-audio-filename {
  font-family: var(--nano-font-mono, monospace);
  font-size: 0.8rem;
  font-weight: 600;
  color: #f8fafc;
}

.nce-audio-player {
  width: 100%;
}

.nce-audio-before-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px dashed rgba(148, 163, 184, 0.2);
}

.nce-video-player {
  max-width: 100%;
  max-height: 65vh;
  border-radius: 8px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
}

.nce-pdf-frame {
  width: 100%;
  height: 100%;
  min-height: 480px;
  border: 0;
}

.nce-rfc-stage {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.nce-rfc-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(129, 140, 248, 0.24);
}

.nce-rfc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.nce-rfc-title {
  margin: 4px 0 0;
  font-size: 0.92rem;
  font-weight: 700;
  color: #f8fafc;
}

.nce-rfc-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.76rem;
  color: #94a3b8;
}

.nce-piano-roll-svg {
  width: 100%;
  height: 160px;
  border-radius: 6px;
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.nce-meme-canvas {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: 8px;
  background: #090d16;
  border: 1px solid rgba(148, 163, 184, 0.2);
  text-align: center;
}

.nce-meme-caption {
  font-family: Impact, 'Arial Black', sans-serif;
  font-size: 1.15rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #ffffff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.85);
}

.nce-meme-panels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.nce-meme-panel {
  padding: 12px;
  border-radius: 6px;
  background: rgba(30, 41, 59, 0.75);
  border: 1px solid rgba(148, 163, 184, 0.18);
  text-align: left;
}

.nce-meme-panel-idx {
  font-size: 0.68rem;
  font-weight: 700;
  color: #818cf8;
}

.nce-meme-panel-text {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: #e2e8f0;
}

.nce-nsd-osc-svg {
  height: 144px;
}

.nce-nsd-osc-mini {
  height: 92px;
}

.nce-nsd-layers {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.nce-nsd-layer-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 5px;
  background: rgba(30, 41, 59, 0.82);
  border: 1px solid rgba(52, 211, 153, 0.24);
  font-family: var(--nano-font-mono, monospace);
  font-size: 0.72rem;
  color: #cbd5e1;
}

.nce-nsd-layer-pill strong {
  color: #34d399;
}

.nce-nsd-formula {
  display: block;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(9, 13, 22, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.14);
  font-family: var(--nano-font-mono, monospace);
  font-size: 0.74rem;
  color: #a5b4fc;
  word-break: break-word;
}

.nce-nsd-snip-label {
  margin-left: 8px;
  font-family: var(--nano-font-mono, monospace);
  font-size: 0.8rem;
  color: #f8fafc;
}

.nce-font-specimen-stage {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: 8px;
  background: rgba(9, 13, 22, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.16);
  color: #f8fafc;
}

.nce-font-sample-xl {
  margin: 0;
  font-size: 1.75rem;
  line-height: 1.25;
}

.nce-font-sample-lg {
  margin: 0;
  font-size: 1.05rem;
  color: #cbd5e1;
}

.nce-font-sample-sm {
  margin: 0;
  font-size: 0.82rem;
  color: #94a3b8;
}
</style>
