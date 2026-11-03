<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { middleTruncatePath, normalizeFileStatus } from '../utils/git-diff.js';
import { tooltipDirective as vTooltip } from '../directives/tooltip.js';

const props = defineProps({
  /**
   * Array of file items:
   * [{ path: string, status?: 'A'|'M'|'D'|'R'|'added'|'modified'|'deleted'|'renamed', additions?: number, deletions?: number, oldPath?: string }]
   */
  files: {
    type: Array,
    default: () => [],
  },
  /**
   * Selected file path (v-model)
   */
  modelValue: {
    type: String,
    default: '',
  },
  /**
   * Optional active commit metadata:
   * { hash: string, shortHash?: string, author?: string, avatarUrl?: string, message?: string, date?: string }
   */
  commit: {
    type: Object,
    default: null,
  },
  /**
   * Optional list of commits to switch between (e.g. unpushed commits ahead of remote)
   */
  commits: {
    type: Array,
    default: () => [],
  },
  /**
   * Selected commit hash when `commits` array is provided
   */
  selectedCommitHash: {
    type: String,
    default: '',
  },
  /**
   * Custom summary text (defaults to "{count} changed files")
   */
  summaryText: {
    type: String,
    default: '',
  },
  /**
   * Max characters before middle-truncating paths (used as fallback or when autoTruncate is false)
   */
  maxPathLength: {
    type: Number,
    default: 34,
  },
  /**
   * Dynamically adapt maxPathLength to the container width via ResizeObserver
   */
  autoTruncate: {
    type: Boolean,
    default: true,
  },
  /**
   * Show filter input when file list is long
   */
  searchable: {
    type: Boolean,
    default: false,
  },
  /**
   * Filter placeholder
   */
  searchPlaceholder: {
    type: String,
    default: 'Filter files...',
  },
  /**
   * Show +/- line stats next to status icon
   */
  showStats: {
    type: Boolean,
    default: false,
  },
  /**
   * Optional max height of the scrollable file list
   */
  maxHeight: {
    type: [Number, String],
    default: null,
  },
});

const emit = defineEmits([
  'update:modelValue',
  'select',
  'update:selectedCommitHash',
  'selectCommit',
  'copyHash',
]);

const rootRef = ref(null);
const measuredWidth = ref(0);
let resizeObserver = null;

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined' && rootRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect?.width || rootRef.value?.clientWidth || 0;
        if (w > 0) measuredWidth.value = w;
      }
    });
    resizeObserver.observe(rootRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (copyTimer) {
    clearTimeout(copyTimer);
    copyTimer = null;
  }
});

const effectiveMaxPathLength = computed(() => {
  if (props.autoTruncate && measuredWidth.value > 0) {
    const reservedRight = props.showStats ? 106 : 48;
    const availPx = Math.max(100, measuredWidth.value - reservedRight);
    return Math.max(18, Math.floor(availPx / 7.2));
  }
  return props.maxPathLength;
});

const searchQuery = ref('');
const copiedHash = ref(false);
let copyTimer = null;

const normalizedFiles = computed(() => {
  return (props.files || []).map((item, index) => {
    const raw = typeof item === 'string' ? { path: item, status: 'M' } : item;
    const statusInfo = normalizeFileStatus(raw.status);
    const trunc = middleTruncatePath(raw.path, effectiveMaxPathLength.value);
    return {
      ...raw,
      index,
      path: raw.path || '',
      statusInfo,
      trunc,
      isTruncated: trunc.displayPath !== trunc.fullPath,
    };
  });
});

const filteredFiles = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return normalizedFiles.value;
  return normalizedFiles.value.filter(f => f.path.toLowerCase().includes(q));
});

const activePath = computed(() => {
  if (props.modelValue) return props.modelValue;
  return filteredFiles.value[0]?.path || '';
});

const activeCommit = computed(() => {
  if (props.commit) return props.commit;
  if (props.commits && props.commits.length > 0) {
    if (props.selectedCommitHash) {
      const found = props.commits.find(c => c.hash === props.selectedCommitHash || c.shortHash === props.selectedCommitHash);
      if (found) return found;
    }
    return props.commits[0];
  }
  return null;
});

const shortSha = computed(() => {
  const c = activeCommit.value;
  if (!c) return '';
  if (c.shortHash) return c.shortHash;
  return c.hash ? String(c.hash).slice(0, 7) : '';
});

const authorInitials = computed(() => {
  const name = activeCommit.value?.author || '';
  if (!name) return 'GK';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('');
});

const headerSummary = computed(() => {
  if (props.summaryText) return props.summaryText;
  const count = normalizedFiles.value.length;
  return count === 1 ? '1 changed file' : `${count} changed files`;
});

const listMaxHeight = computed(() => {
  if (!props.maxHeight) return undefined;
  return typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight;
});

const selectFile = (file) => {
  emit('update:modelValue', file.path);
  emit('select', file);
};

const handleCommitChange = (hash) => {
  emit('update:selectedCommitHash', hash);
  const found = props.commits.find(c => (c.hash || c.shortHash) === hash) || null;
  emit('selectCommit', found);
};

const copyCommitHash = async () => {
  const hashToCopy = activeCommit.value?.hash || shortSha.value;
  if (!hashToCopy) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(hashToCopy);
    }
    copiedHash.value = true;
    emit('copyHash', hashToCopy);
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copiedHash.value = false;
    }, 1800);
  } catch {}
};

const handleKeyDown = (e) => {
  if (!filteredFiles.value.length) return;
  const curIdx = filteredFiles.value.findIndex(f => f.path === activePath.value);
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const next = filteredFiles.value[Math.min(filteredFiles.value.length - 1, curIdx + 1)];
    if (next) selectFile(next);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prev = filteredFiles.value[Math.max(0, curIdx - 1)];
    if (prev) selectFile(prev);
  }
};

watch(
  () => props.files,
  (newFiles) => {
    if (newFiles && newFiles.length > 0 && !props.modelValue) {
      const firstPath = typeof newFiles[0] === 'string' ? newFiles[0] : newFiles[0]?.path;
      if (firstPath) emit('update:modelValue', firstPath);
    }
  },
  { immediate: true }
);
</script>

<template>
  <div
    ref="rootRef"
    class="nano-file-list"
    tabindex="0"
    role="listbox"
    :aria-label="headerSummary"
    @keydown="handleKeyDown"
  >
    <!-- Optional Commit Selector Bar (when inspecting multiple unpushed commits) -->
    <div v-if="commits && commits.length > 1" class="nfl-commits-bar">
      <button
        v-for="c in commits"
        :key="c.hash || c.shortHash"
        type="button"
        class="nfl-commit-pill"
        :class="{ active: (selectedCommitHash || commits[0]?.hash) === (c.hash || c.shortHash) }"
        v-tooltip="c.message || c.hash"
        @click="handleCommitChange(c.hash || c.shortHash)"
      >
        <span class="nfl-commit-pill-sha">{{ c.shortHash || String(c.hash).slice(0, 7) }}</span>
        <span v-if="c.message" class="nfl-commit-pill-msg">{{ c.message }}</span>
      </button>
    </div>

    <!-- Author & Commit SHA Row (GitHub Desktop style) -->
    <div v-if="activeCommit" class="nfl-commit-header">
      <div class="nfl-author-group">
        <img
          v-if="activeCommit.avatarUrl"
          :src="activeCommit.avatarUrl"
          :alt="activeCommit.author || 'Author'"
          class="nfl-author-avatar"
        />
        <span v-else class="nfl-author-initials">{{ authorInitials }}</span>
        <span class="nfl-author-name" :title="activeCommit.author">{{ activeCommit.author }}</span>
      </div>

      <div v-if="shortSha" class="nfl-sha-group">
        <!-- Git commit node icon (-o-) -->
        <svg class="nfl-commit-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <circle cx="8" cy="8" r="2.6" />
          <line x1="1.2" y1="8" x2="5.4" y2="8" />
          <line x1="10.6" y1="8" x2="14.8" y2="8" />
        </svg>
        <code class="nfl-sha-code">{{ shortSha }}</code>
        <button
          type="button"
          class="nfl-copy-sha-btn"
          :class="{ copied: copiedHash }"
          v-tooltip="copiedHash ? 'Copied SHA!' : 'Copy full commit SHA'"
          :aria-label="copiedHash ? 'Copied SHA' : 'Copy commit SHA'"
          @click="copyCommitHash"
        >
          <svg v-if="!copiedHash" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
            <path d="M3.5 10.5H2.8A1.3 1.3 0 0 1 1.5 9.2V2.8A1.3 1.3 0 0 1 2.8 1.5h6.4a1.3 1.3 0 0 1 1.3 1.3v.7" />
          </svg>
          <svg v-else class="nfl-check-svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="13.5 4.5 6.5 11.5 2.5 7.5" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Changed Files Count Bar -->
    <div class="nfl-summary-bar">
      <span class="nfl-summary-text">{{ headerSummary }}</span>
      <slot name="summary-extra" />
    </div>

    <!-- Optional Search Filter -->
    <div v-if="searchable" class="nfl-search-bar">
      <input
        v-model="searchQuery"
        type="text"
        class="nfl-search-input"
        :placeholder="searchPlaceholder"
      />
    </div>

    <!-- Scrollable File Items -->
    <div class="nfl-items-container nano-scrollbar" :style="{ maxHeight: listMaxHeight }">
      <div v-if="filteredFiles.length === 0" class="nfl-empty">
        No changed files
      </div>

      <button
        v-for="file in filteredFiles"
        :key="file.path"
        type="button"
        role="option"
        :aria-selected="activePath === file.path"
        class="nfl-item"
        :class="{ active: activePath === file.path }"
        v-tooltip="file.isTruncated ? file.path : undefined"
        @click="selectFile(file)"
      >
        <span class="nfl-path-text">
          <span v-if="file.trunc.displayDir" class="nfl-path-dir">{{ file.trunc.displayDir }}</span><span class="nfl-path-file">{{ file.trunc.displayFile }}</span>
        </span>

        <span class="nfl-right-meta">
          <span v-if="showStats && (file.additions || file.deletions)" class="nfl-line-stats">
            <span v-if="file.additions" class="stat-add">+{{ file.additions }}</span>
            <span v-if="file.deletions" class="stat-del">-{{ file.deletions }}</span>
          </span>

          <!-- Status square badge matching GitHub Desktop (+, •, −, →) -->
          <span
            class="nfl-status-box"
            :class="`is-${file.statusInfo.type}`"
            :title="file.statusInfo.label"
          >
            <!-- Added [+] -->
            <svg v-if="file.statusInfo.type === 'added'" viewBox="0 0 14 14" fill="none">
              <rect x="1.25" y="1.25" width="11.5" height="11.5" rx="2" stroke="currentColor" stroke-width="1.4" />
              <line x1="7" y1="4" x2="7" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              <line x1="4" y1="7" x2="10" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            <!-- Deleted [−] -->
            <svg v-else-if="file.statusInfo.type === 'deleted'" viewBox="0 0 14 14" fill="none">
              <rect x="1.25" y="1.25" width="11.5" height="11.5" rx="2" stroke="currentColor" stroke-width="1.4" />
              <line x1="4" y1="7" x2="10" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            <!-- Renamed [→] -->
            <svg v-else-if="file.statusInfo.type === 'renamed'" viewBox="0 0 14 14" fill="none">
              <rect x="1.25" y="1.25" width="11.5" height="11.5" rx="2" stroke="currentColor" stroke-width="1.4" />
              <path d="M4 7h6M7.8 4.8L10 7l-2.2 2.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <!-- Modified [•] -->
            <svg v-else viewBox="0 0 14 14" fill="none">
              <rect x="1.25" y="1.25" width="11.5" height="11.5" rx="2" stroke="currentColor" stroke-width="1.4" />
              <circle cx="7" cy="7" r="1.8" fill="currentColor" />
            </svg>
          </span>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.nano-file-list {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  background: var(--nano-bg-card, #0f172a);
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.12));
  border-radius: var(--nano-radius-md, 8px);
  overflow: hidden;
  outline: none;
  font-family: var(--nano-font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  color: var(--nano-text-main, #f8fafc);
  user-select: none;
}

.nano-file-list:focus-visible {
  border-color: var(--nano-accent-primary, #6366f1);
  box-shadow: 0 0 0 1px var(--nano-accent-primary, #6366f1);
}

.nfl-commits-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  overflow-x: auto;
  background: var(--nano-bg-muted, rgba(255, 255, 255, 0.03));
  border-bottom: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.08));
}

.nfl-commit-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 5px;
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.12));
  background: transparent;
  color: var(--nano-text-muted, #94a3b8);
  font-size: 0.72rem;
  cursor: pointer;
  white-space: nowrap;
  max-width: 180px;
  transition: all 0.15s ease;
}

.nfl-commit-pill:hover {
  color: var(--nano-text-main, #f8fafc);
  border-color: var(--nano-border-hover, rgba(255, 255, 255, 0.24));
}

.nfl-commit-pill.active {
  background: color-mix(in srgb, var(--nano-accent-primary, #6366f1) 18%, transparent);
  border-color: var(--nano-accent-primary, #6366f1);
  color: var(--nano-text-main, #f8fafc);
}

.nfl-commit-pill-sha {
  font-family: var(--nano-font-mono, 'JetBrains Mono', monospace);
  font-weight: 700;
}

.nfl-commit-pill-msg {
  overflow: hidden;
  text-overflow: ellipsis;
}

.nfl-commit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 12px;
  background: var(--nano-bg-card-elevated, rgba(255, 255, 255, 0.02));
  border-bottom: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.09));
  font-size: 0.8rem;
}

.nfl-author-group {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.nfl-author-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.nfl-author-initials {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #0ea5e9);
  color: #ffffff;
  font-size: 0.64rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nfl-author-name {
  font-weight: 600;
  color: var(--nano-text-main, #f8fafc);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nfl-sha-group {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--nano-text-muted, #94a3b8);
  flex-shrink: 0;
}

.nfl-commit-icon {
  width: 15px;
  height: 15px;
  opacity: 0.85;
}

.nfl-sha-code {
  font-family: var(--nano-font-mono, 'JetBrains Mono', monospace);
  font-size: 0.76rem;
  color: var(--nano-text-main, #f8fafc);
}

.nfl-copy-sha-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--nano-text-muted, #94a3b8);
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.nfl-copy-sha-btn:hover {
  color: var(--nano-text-main, #f8fafc);
  background: var(--nano-bg-muted, rgba(255, 255, 255, 0.06));
}

.nfl-copy-sha-btn.copied {
  color: #10b981;
}

.nfl-copy-sha-btn svg {
  width: 13px;
  height: 13px;
}

.nfl-summary-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 7px 12px;
  background: var(--nano-bg-muted, rgba(255, 255, 255, 0.025));
  border-bottom: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.09));
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--nano-text-main, #f8fafc);
}

.nfl-search-bar {
  padding: 6px 8px;
  border-bottom: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.08));
}

.nfl-search-input {
  width: 100%;
  box-sizing: border-box;
  padding: 5px 9px;
  font-size: 0.76rem;
  border-radius: 5px;
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.12));
  background: var(--nano-bg-card, #0f172a);
  color: var(--nano-text-main, #f8fafc);
  outline: none;
}

.nfl-search-input:focus {
  border-color: var(--nano-accent-primary, #6366f1);
}

.nfl-items-container {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.nfl-empty {
  padding: 24px 12px;
  text-align: center;
  font-size: 0.78rem;
  color: var(--nano-text-muted, #94a3b8);
}

.nfl-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 7px 12px;
  border: none;
  border-bottom: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.06));
  background: transparent;
  color: var(--nano-text-main, #f8fafc);
  font-family: inherit;
  font-size: 0.8rem;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.nfl-item:last-child {
  border-bottom: none;
}

.nfl-item:hover {
  background: var(--nano-bg-muted, rgba(255, 255, 255, 0.04));
}

.nfl-item.active {
  background: color-mix(in srgb, var(--nano-accent-primary, #6366f1) 16%, transparent);
}

.nfl-path-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.35;
}

.nfl-path-dir {
  color: var(--nano-text-muted, #94a3b8);
  font-weight: 400;
}

.nfl-path-file {
  color: var(--nano-text-main, #f8fafc);
  font-weight: 500;
}

.nfl-item.active .nfl-path-file {
  font-weight: 600;
}

.nfl-right-meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.nfl-line-stats {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--nano-font-mono, 'JetBrains Mono', monospace);
  font-size: 0.68rem;
  font-weight: 600;
}

.stat-add {
  color: #10b981;
}

.stat-del {
  color: #ef4444;
}

.nfl-status-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.nfl-status-box svg {
  width: 14px;
  height: 14px;
}

.nfl-status-box.is-added {
  color: #16a34a;
}

[data-theme="dark"] .nfl-status-box.is-added,
:root:not([data-theme="light"]) .nfl-status-box.is-added {
  color: #22c55e;
}

.nfl-status-box.is-modified {
  color: #b45309;
}

[data-theme="dark"] .nfl-status-box.is-modified,
:root:not([data-theme="light"]) .nfl-status-box.is-modified {
  color: #eab308;
}

.nfl-status-box.is-deleted {
  color: #dc2626;
}

[data-theme="dark"] .nfl-status-box.is-deleted,
:root:not([data-theme="light"]) .nfl-status-box.is-deleted {
  color: #f87171;
}

.nfl-status-box.is-renamed {
  color: #2563eb;
}

[data-theme="dark"] .nfl-status-box.is-renamed,
:root:not([data-theme="light"]) .nfl-status-box.is-renamed {
  color: #38bdf8;
}
</style>
