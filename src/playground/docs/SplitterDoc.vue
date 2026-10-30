<script setup>
import { ref } from 'vue';
import NanoSplitter from '../../components/NanoSplitter.vue';
import NanoFileList from '../../components/NanoFileList.vue';
import NanoCodeEditor from '../../components/NanoCodeEditor.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoSlider from '../../components/NanoSlider.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { t } from '../../locales.js';

// Demo 1: Interactive Configurator
const splitRatio = ref(0.38);
const orientation = ref('horizontal');
const lockable = ref(true);
const isLocked = ref(false);
const showGrip = ref(false);
const gapPx = ref(12);

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

    <NanoCodeBlock title="Usage Example" lang="vue">
&lt;script setup&gt;
import { ref } from 'vue';
import { NanoSplitter, NanoFileList, NanoCodeEditor } from '@gkucmierz/nano-ui';

const sidebarWidth = ref(320);
const isLocked = ref(false);
&lt;/script&gt;

&lt;template&gt;
  &lt;NanoSplitter
    v-model="sidebarWidth"
    v-model:locked="isLocked"
    unit="px"
    :default-size="320"
    :min="220"
    :max="560"
    :gap="12"
    lockable
    storage-key="my_app_inspector_split"
  &gt;
    &lt;template #first&gt;
      &lt;NanoFileList :files="files" v-model="selectedPath" :show-stats="true" /&gt;
    &lt;/template&gt;
    &lt;template #second&gt;
      &lt;NanoCodeEditor :file-path="selectedPath" :diff="activeDiff" /&gt;
    &lt;/template&gt;
  &lt;/NanoSplitter&gt;
&lt;/template&gt;
    </NanoCodeBlock>
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
