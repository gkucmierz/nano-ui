<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import NanoSplitter from '../../components/NanoSplitter.vue';
import NanoFileList from '../../components/NanoFileList.vue';
import NanoCodeEditor from '../../components/NanoCodeEditor.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoSlider from '../../components/NanoSlider.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { getScopedStorageController } from '../../utils/storage-controller.js';
import { createDocTabs } from '../docSnippets.js';
import { t } from '../../locales.js';

// Demo 1: Interactive Configurator + Storage Persistence (ls / ss / none)
const splitRatio = ref(0.38);
const orientation = ref('horizontal');
const lockable = ref(true);
const isLocked = ref(false);
const showGrip = ref(false);
const gapPx = ref(12);
const storageMode = ref('ls');
const hostAppPrefix = ref('dashboard-app');
const splitterStorageKey = ref('splitter_demo');
const storageTick = ref(0);

const nanoStorage = getScopedStorageController('nano-ui');
let unsubscribeStorage = null;

onMounted(() => {
  unsubscribeStorage = nanoStorage.subscribe(() => {
    storageTick.value += 1;
  });
});

onUnmounted(() => {
  if (unsubscribeStorage) unsubscribeStorage();
});

watch([storageMode, hostAppPrefix, splitterStorageKey, splitRatio, isLocked], () => {
  storageTick.value += 1;
});

const liveSplitterStorage = computed(() => {
  const _tick = storageTick.value;
  return nanoStorage.inspect(splitterStorageKey.value, {
    mode: storageMode.value,
    appPrefix: hostAppPrefix.value,
  });
});

// Demo 2: Nested 3-pane IDE layout (Horizontal + Vertical)
const ideLeftWidth = ref(290);
const ideTopRatio = ref(0.56);
const selectedFile = ref('src/components/NanoSplitter.vue');

const ideFiles = [
  { path: 'src/components/NanoSplitter.vue', status: 'A', additions: 392, deletions: 0 },
  { path: 'src/components/NanoFileList.vue', status: 'M', additions: 42, deletions: 3 },
  { path: 'src/components/NanoCodeEditor.vue', status: 'M', additions: 6, deletions: 0 },
  { path: 'src/components/NanoModal.vue', status: 'M', additions: 5, deletions: 0 },
  { path: 'src/playground/docs/SplitterDoc.vue', status: 'A', additions: 245, deletions: 0 },
];

const sampleDiff = `@@ -1,6 +1,14 @@
+.nano-splitter-hitbox:hover::before,
+.nano-splitter-hitbox.active::before {
+  background: var(--nano-splitter-laser, #00e5ff);
+}
+
+.nano-splitter-lock-toggle:hover .nano-splitter-triangle {
+  color: #fbbf24;
+  filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.85));
+  transform: scaleY(1.22);
+}`;

const scratchpadCode = ref(`// Bottom pane: Live Scratchpad inside nested vertical NanoSplitter
export function formatSplitRatio(ratio) {
  return \`\${(ratio * 100).toFixed(1)}% / \${((1 - ratio) * 100).toFixed(1)}%\`;
}`);
const codeTabs = createDocTabs({
  componentName: 'NanoSplitter',
  stateRef: 'sidebarWidth',
  initialValue: '320',
  templateAttrs: [
    'v-model="sidebarWidth"',
    'unit="px"',
    ':default-size="320"',
    ':min="220"',
    ':max="560"',
    ':gap="12"',
    'lockable',
    'storage="ls"',
    'app-prefix="dashboard-app"',
    'storage-key="ide_sidebar"',
  ],
  slotContent: '<template #first>Left Pane</template>\n    <template #second>Right Pane</template>',
  apiSections: [
    {
      title: 'Props',
      items: [
        'modelValue: Number (v-model) - Current first pane size in unit ("ratio" | "percent" | "px")',
        'locked: Boolean (v-model:locked) - Lock splitter against drag/keyboard resizing',
        'orientation: String (default: "horizontal") - Split direction ("horizontal" | "vertical")',
        'unit: String (default: "ratio") - Measurement unit ("ratio" 0..1 | "percent" 0..100 | "px")',
        'defaultSize: Number - Size restored on double-click or reset()',
        'min / max: Number - Lower and upper bounds for first pane',
        'gap: Number (default: 12) - Gutter spacing in px',
        'lockable: Boolean (default: false) - Render triangle lock tab on gutter',
        'storage: "ls" | "ss" | "none" | Boolean (default: "ls") - Persist split size & lock state in localStorage, sessionStorage, or disable persistence',
        'appPrefix: String (default: auto-detected) - Host app prefix compressed to acronym in <APP>_NU_<storageKey>',
        'storageKey: String (default: "") - Key suffix for persisting size & lock state (e.g. "ide_sidebar" -> "DA_NU_ide_sidebar")',
      ],
    },
    {
      title: 'Events',
      items: [
        '@update:modelValue / @change: (payload) => void - Emitted when pane size changes',
        '@update:locked: (locked: boolean) => void - Emitted when lock state toggles',
        '@reset: (defaultSize: number) => void - Emitted on double-click reset',
        '@dragStart / @dragEnd: (size: number) => void - Emitted when gutter drag starts or ends',
      ],
    },
    {
      title: 'Exposed Methods & State (via template ref)',
      items: [
        'setSize(val: number): void - Clamp and set pane size programmatically',
        'reset(): void - Restore pane size to defaultSize',
        'toggleLock(): void - Toggle splitter lock state',
        'currentSize / isLocked / isDragging: ComputedRef/Ref',
      ],
    },
  ],
});
</script>

<template>
  <div class="doc-page">
    <h2>{{ t('splitter.title') }}</h2>
    <p>{{ t('splitter.desc') }}</p>

    <!-- SECTION 1: Interactive Configurator -->
    <div class="demo-section">
      <h3>{{ t('splitter.sec1Title') }}</h3>
      <p class="demo-desc">{{ t('splitter.sec1Desc') }}</p>

      <div class="controls-bar">
        <div class="seg-orient">
          <button
            type="button"
            class="orient-btn"
            :class="{ active: orientation === 'horizontal' }"
            @click="orientation = 'horizontal'"
          >
            {{ t('splitter.horiz') }}
          </button>
          <button
            type="button"
            class="orient-btn"
            :class="{ active: orientation === 'vertical' }"
            @click="orientation = 'vertical'"
          >
            {{ t('splitter.vert') }}
          </button>
        </div>

        <label class="ctrl-item">
          <NanoSwitch v-model="lockable" size="compact" />
          <span>{{ t('splitter.showLock') }}</span>
        </label>

        <label class="ctrl-item">
          <NanoSwitch v-model="isLocked" size="compact" color="amber" />
          <span>{{ t('splitter.locked') }} ({{ isLocked ? t('splitter.yes') : t('splitter.no') }})</span>
        </label>

        <label class="ctrl-item">
          <NanoSwitch v-model="showGrip" size="compact" />
          <span>{{ t('splitter.showGrip') }}</span>
        </label>

        <div class="ctrl-slider">
          <span class="ctrl-label">{{ t('splitter.gap') }} ({{ gapPx }}px):</span>
          <NanoSlider v-model="gapPx" :min="0" :max="28" :step="2" size="sm" />
        </div>

        <div class="seg-orient" role="radiogroup" aria-label="Splitter storage mode">
          <button
            v-for="m in ['ls', 'ss', 'none']"
            :key="m"
            type="button"
            class="orient-btn"
            :class="{ active: storageMode === m }"
            @click="storageMode = m"
          >
            {{ m.toUpperCase() }}
          </button>
        </div>

        <code
          v-tooltip="`from ${liveSplitterStorage.verboseKey}`"
          class="splitter-storage-pill"
          style="cursor: help;"
        ><template v-if="liveSplitterStorage.displayAppSeg && liveSplitterStorage.displayAppSeg !== liveSplitterStorage.displayScopeSeg"><span class="seg-app">{{ liveSplitterStorage.displayAppSeg }}</span>_</template><span class="seg-lib">{{ liveSplitterStorage.displayScopeSeg }}</span>_<span class="seg-key">{{ liveSplitterStorage.rawKey }}</span></code>
        <span class="splitter-storage-val">
          {{ liveSplitterStorage.exists ? liveSplitterStorage.rawValue : `(${liveSplitterStorage.backend}: drag to persist)` }}
        </span>
      </div>

      <div class="splitter-demo-stage" :class="{ 'is-vert': orientation === 'vertical' }">
        <NanoSplitter
          v-model="splitRatio"
          v-model:locked="isLocked"
          :orientation="orientation"
          unit="ratio"
          :default-size="0.38"
          :min="0.18"
          :max="0.82"
          :gap="gapPx"
          :lockable="lockable"
          :show-grip="showGrip"
          :storage="storageMode"
          :app-prefix="hostAppPrefix"
          :storage-key="splitterStorageKey"
        >
          <template #first>
            <div class="demo-pane pane-alpha">
              <div class="pane-badge">PANE A (First)</div>
              <div class="pane-metric">{{ (splitRatio * 100).toFixed(1) }}%</div>
              <p class="pane-hint">
                {{ isLocked ? '🔒 Splitter is locked (click the top triangle tab to unlock)' : '↔ Drag the cyan laser line or press ← / →' }}
              </p>
            </div>
          </template>

          <template #second>
            <div class="demo-pane pane-beta">
              <div class="pane-badge">PANE B (Second — Flex 1)</div>
              <div class="pane-metric">{{ ((1 - splitRatio) * 100).toFixed(1) }}%</div>
              <p class="pane-hint">
                Double-click the splitter line to snap back to <code>38.0%</code>.
              </p>
            </div>
          </template>
        </NanoSplitter>
      </div>
    </div>

    <!-- SECTION 2: Nested 3-Pane IDE / Git Inspector -->
    <div class="demo-section">
      <h3>{{ t('splitter.sec2Title') }}</h3>
      <p class="demo-desc">{{ t('splitter.sec2Desc') }}</p>

      <div class="ide-workbench-frame">
        <NanoSplitter
          v-model="ideLeftWidth"
          unit="px"
          :default-size="290"
          :min="210"
          :max="520"
          :gap="12"
          lockable
        >
          <template #first>
            <NanoFileList
              v-model="selectedFile"
              :commit="{ hash: '4311bc19a', shortHash: '4311bc1', author: 'Grzegorz Kucmierz' }"
              :files="ideFiles"
              :show-stats="true"
              :searchable="true"
            />
          </template>

          <template #second>
            <NanoSplitter
              v-model="ideTopRatio"
              orientation="vertical"
              unit="ratio"
              :default-size="0.56"
              :min="0.25"
              :max="0.78"
              :gap="12"
              lockable
            >
              <template #first>
                <NanoCodeEditor
                  :file-path="selectedFile"
                  :diff="sampleDiff"
                />
              </template>

              <template #second>
                <NanoCodeEditor
                  v-model="scratchpadCode"
                  file-path="scratchpad/splitMetrics.js"
                  lang="javascript"
                  mode="code"
                  :editable="true"
                />
              </template>
            </NanoSplitter>
          </template>
        </NanoSplitter>
      </div>
    </div>

    <NanoCodeBlock :tabs="codeTabs" />
  </div>
</template>

<style scoped>
.controls-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  background: var(--nano-bg-muted, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.08));
}

.seg-orient {
  display: inline-flex;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.12));
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.orient-btn {
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--nano-text-muted, #94a3b8);
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.orient-btn.active {
  background: var(--nano-accent-primary, #6366f1);
  color: #ffffff;
}

.ctrl-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  cursor: pointer;
}

.ctrl-slider {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 190px;
}

.ctrl-label {
  font-size: 0.78rem;
  color: var(--nano-text-muted, #94a3b8);
  white-space: nowrap;
}

.splitter-storage-pill {
  padding: 4px 9px;
  border-radius: 6px;
  background: var(--nano-bg-code);
  border: 1px solid var(--nano-border-card);
  color: var(--nano-text-main);
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.78rem;
}

.seg-app {
  color: var(--nano-status-info-text);
  font-weight: 600;
}

.seg-lib {
  color: var(--nano-status-purple-text);
  font-weight: 600;
}

.seg-key {
  color: var(--nano-status-success-text);
  font-weight: 600;
}

.splitter-storage-val {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.76rem;
  color: var(--nano-text-muted);
}

.splitter-demo-stage {
  height: 250px;
  border-radius: 10px;
}

.splitter-demo-stage.is-vert {
  height: 340px;
}

.demo-pane {
  flex: 1;
  height: 100%;
  border-radius: 8px;
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.12));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  box-sizing: border-box;
}

.pane-alpha {
  background: linear-gradient(135deg, rgba(0, 229, 255, 0.07), rgba(99, 102, 241, 0.08));
}

.pane-beta {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.06), rgba(15, 23, 42, 0.4));
}

.pane-badge {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--nano-text-muted, #94a3b8);
  margin-bottom: 6px;
}

.pane-metric {
  font-family: var(--nano-font-mono, 'JetBrains Mono', monospace);
  font-size: 1.7rem;
  font-weight: 800;
  color: var(--nano-text-main, #f8fafc);
}

.pane-hint {
  margin: 8px 0 0;
  font-size: 0.78rem;
  color: var(--nano-text-muted, #94a3b8);
}

.ide-workbench-frame {
  height: 520px;
  min-height: 360px;
  max-height: 860px;
  resize: vertical;
  overflow: hidden;
  padding-bottom: 4px;
}
</style>
