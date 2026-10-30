<script setup>
import { ref, computed } from 'vue';
import NanoFileList from '../../components/NanoFileList.vue';
import NanoCodeEditor from '../../components/NanoCodeEditor.vue';
import NanoSplitter from '../../components/NanoSplitter.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoSlider from '../../components/NanoSlider.vue';

const maxPathLen = ref(34);
const autoTruncate = ref(true);
const searchable = ref(true);
const showStats = ref(true);
const diffStyle = ref('unified');
const leftPanePx = ref(320);
const splitterLocked = ref(false);

const demoCommits = [
  {
    hash: 'de9227a8b41c90f123456789abcdef0123456789',
    shortHash: 'de9227a',
    author: 'Grzegorz Kucmierz',
    message: 'feat(mermaid): inject dual-theme rules from @gkucmierz/blog-engine',
    files: [
      {
        path: '.agents/rules/90-pkg-blog-engine.md',
        status: 'A',
        additions: 48,
        deletions: 0,
        diff: `@@ -0,0 +1,14 @@
+# Package Rules: @gkucmierz/blog-engine
+
+> [!IMPORTANT]
+> Auto-injected by \`sync-agent-rules\` from \`@gkucmierz/blog-engine\`.
+
+## 1. Dual-Theme Mermaid Contrast Standard
+- Never hardcode dark node fills (\`fill:#0f172a\`) inside Markdown \`\`\`mermaid blocks.
+- Always use semantic classDefs (\`classDef primary\`, \`classDef accent\`, \`classDef warn\`)
+  so \`useMermaid.js\` can dynamically adapt contrast in both Light and Dark themes.`,
        code: `# Package Rules: @gkucmierz/blog-engine\n\n> [!IMPORTANT]\n> Auto-injected by \`sync-agent-rules\` from \`@gkucmierz/blog-engine\`.\n\n## 1. Dual-Theme Mermaid Contrast Standard\n- Never hardcode dark node fills (\`fill:#0f172a\`) inside Markdown \`\`\`mermaid blocks.\n- Always use semantic classDefs (\`classDef primary\`, \`classDef accent\`, \`classDef warn\`)\n  so \`useMermaid.js\` can dynamically adapt contrast in both Light and Dark themes.`,
      },
      {
        path: 'AGENTS.md',
        status: 'M',
        additions: 6,
        deletions: 1,
        diff: `@@ -12,4 +12,9 @@
 ## Blog Engine Standards
-See local rules in \`.agents/rules/\`.
+See local rules in \`.agents/rules/\` including package-injected rules:
+- \`.agents/rules/90-pkg-blog-engine.md\` (Mermaid dual-theme & KaTeX standards)
+
+Always verify light and dark mode contrast before committing diagrams.`,
        code: `## Blog Engine Standards\nSee local rules in \`.agents/rules/\` including package-injected rules:\n- \`.agents/rules/90-pkg-blog-engine.md\` (Mermaid dual-theme & KaTeX standards)\n\nAlways verify light and dark mode contrast before committing diagrams.`,
      },
      {
        path: 'docs/.vitepress/theme/custom.css',
        status: 'M',
        additions: 14,
        deletions: 3,
        diff: `@@ -84,6 +84,17 @@
 .mermaid-wrapper {
-  background: #0b1120;
+  background: var(--vp-c-bg-soft);
+  border: 1px solid var(--vp-c-divider);
   border-radius: 10px;
   padding: 18px;
 }
+
+html:not(.dark) .mermaid-wrapper svg text {
+  fill: #0f172a !important;
+}`,
        code: `.mermaid-wrapper {\n  background: var(--vp-c-bg-soft);\n  border: 1px solid var(--vp-c-divider);\n  border-radius: 10px;\n  padding: 18px;\n}\n\nhtml:not(.dark) .mermaid-wrapper svg text {\n  fill: #0f172a !important;\n}`,
      },
      {
        path: 'docs/.vitepress/theme/composables/useMermaid.js',
        status: 'M',
        additions: 22,
        deletions: 5,
        diff: `@@ -31,8 +31,19 @@ export function getMermaidConfig(isDark = true) {
   return {
     startOnLoad: false,
-    theme: 'dark',
+    theme: isDark ? 'dark' : 'default',
     themeVariables: isDark
       ? { primaryColor: '#1e293b', primaryTextColor: '#f8fafc', lineColor: '#64748b' }
-      : { primaryColor: '#1e293b', primaryTextColor: '#f8fafc', lineColor: '#64748b' }
+      : { primaryColor: '#eef2ff', primaryTextColor: '#0f172a', lineColor: '#475569' }
   };
 }`,
        code: `export function getMermaidConfig(isDark = true) {\n  return {\n    startOnLoad: false,\n    theme: isDark ? 'dark' : 'default',\n    themeVariables: isDark\n      ? { primaryColor: '#1e293b', primaryTextColor: '#f8fafc', lineColor: '#64748b' }\n      : { primaryColor: '#eef2ff', primaryTextColor: '#0f172a', lineColor: '#475569' }\n  };\n}`,
      },
      {
        path: 'docs/posts/hipoteza-kosmicznej-cenzury-dowody-lean-4-biblioteka-babel.md',
        status: 'M',
        additions: 12,
        deletions: 12,
        diff: `@@ -170,5 +170,5 @@
-style A fill:#0f172a,stroke:#38bdf8,color:#f8fafc
-style B fill:#0f172a,stroke:#10b981,color:#f8fafc
+classDef primary fill:#eef2ff,stroke:#4f46e5,color:#0f172a
+class A,B primary`,
        code: `graph LR\n  A["Stan początkowy δx₀"] --> B["Punkt bifurkacji (λ_L > 0)"]\n  classDef primary fill:#eef2ff,stroke:#4f46e5,color:#0f172a\n  class A,B primary`,
      },
    ],
  },
  {
    hash: '1a39e1699c22f18a00112233445566778899aabb',
    shortHash: '1a39e16',
    author: 'Grzegorz Kucmierz',
    message: 'feat(ui): warm orange hue for weekend bands & centered 1-day edge cutoffs',
    files: [
      {
        path: 'ui/src/utils/weekendBands.js',
        status: 'M',
        additions: 14,
        deletions: 4,
        diff: `@@ -73,6 +73,10 @@ export const computeWeekendBands = (points, leftBound, rightBound, lang = 'pl') => {
-  let label = 'SB–ND';
+  const isEn = lang === 'en';
+  const fullLabel = isEn ? 'SAT–SUN' : 'SB–ND';
+  const satLabel = isEn ? 'SAT' : 'SB';
+  const sunLabel = isEn ? 'SUN' : 'ND';`,
        code: `export const computeWeekendBands = (points, leftBound, rightBound, lang = 'pl') => {\n  const isEn = lang === 'en';\n  const fullLabel = isEn ? 'SAT–SUN' : 'SB–ND';\n  return points;\n};`,
      },
      {
        path: 'ui/src/locales/en.json',
        status: 'M',
        additions: 1,
        deletions: 1,
        diff: `@@ -60,3 +60,3 @@
-  "weekendShort": "WKND",
+  "weekendShort": "SAT/SUN",`,
        code: `{\n  "weekendShort": "SAT/SUN"\n}`,
      },
    ],
  },
];

const selectedCommitHash = ref(demoCommits[0].hash);
const selectedFilePath = ref(demoCommits[0].files[0].path);

const currentCommit = computed(() => {
  return demoCommits.find(c => c.hash === selectedCommitHash.value) || demoCommits[0];
});

const currentFile = computed(() => {
  const files = currentCommit.value.files || [];
  return files.find(f => f.path === selectedFilePath.value) || files[0] || null;
});

const handleCommitSelect = (commitObj) => {
  if (commitObj && commitObj.files?.length) {
    selectedFilePath.value = commitObj.files[0].path;
  }
};

const liveCode = ref(`import { computeWeekendBands } from '@gkucmierz/nano-ui';

// Live Editable NanoCodeEditor — try typing or pressing Tab!
export function inspectCommitHistory(commits) {
  return commits.map((c) => ({
    sha: c.hash.slice(0, 7),
    author: c.author,
    changedFiles: c.files.length,
  }));
}`);
</script>

<template>
  <div class="doc-page">
    <h2>NanoFileList &amp; NanoCodeEditor</h2>
    <p>
      Two composable Git &amp; Code inspection primitives built natively into <code>@gkucmierz/nano-ui</code> with zero external runtime bloat:
      <strong>NanoFileList</strong> (GitHub Desktop-inspired changed files navigator with middle-ellipsis path truncation and status badges)
      and <strong>NanoCodeEditor</strong> (Unified &amp; Split diff inspector + live syntax-highlighted code editor).
    </p>

    <!-- SECTION 1: Split Git Commit & Diff Inspector -->
    <div class="demo-section">
      <h3>1. Git Unpushed Commit &amp; Diff Inspector (NanoFileList + NanoCodeEditor)</h3>
      <p class="demo-desc">
        Click commits in the top bar or navigate changed files with <kbd class="nano-kbd">↑</kbd> / <kbd class="nano-kbd">↓</kbd>.
        Switch between <strong>Unified</strong> and <strong>Split</strong> diff views or inspect the full file in <strong>Code</strong> mode.
      </p>

      <div class="controls-bar">
        <label class="ctrl-item">
          <NanoSwitch v-model="searchable" size="compact" />
          <span>Searchable file list</span>
        </label>
        <label class="ctrl-item">
          <NanoSwitch v-model="showStats" size="compact" />
          <span>Show +/- line stats</span>
        </label>
        <label class="ctrl-item">
          <NanoSwitch v-model="autoTruncate" size="compact" />
          <span>Auto-truncate on resize</span>
        </label>
        <div v-if="!autoTruncate" class="ctrl-slider">
          <span class="ctrl-label">Path middle-truncation ({{ maxPathLen }} chars):</span>
          <NanoSlider v-model="maxPathLen" :min="20" :max="60" :step="1" size="sm" />
        </div>
      </div>

      <div class="git-inspector-splitter-box">
        <NanoSplitter
          v-model="leftPanePx"
          v-model:locked="splitterLocked"
          unit="px"
          :default-size="320"
          :min="220"
          :max="540"
          :gap="14"
          lockable
        >
          <template #first>
            <NanoFileList
              v-model="selectedFilePath"
              v-model:selected-commit-hash="selectedCommitHash"
              :commits="demoCommits"
              :commit="currentCommit"
              :files="currentCommit.files"
              :max-path-length="maxPathLen"
              :auto-truncate="autoTruncate"
              :searchable="searchable"
              :show-stats="showStats"
              @select-commit="handleCommitSelect"
            />
          </template>
          <template #second>
            <NanoCodeEditor
              v-if="currentFile"
              v-model:diff-style="diffStyle"
              :file-path="currentFile.path"
              :diff="currentFile.diff"
              :code="currentFile.code"
            />
          </template>
        </NanoSplitter>
      </div>
    </div>

    <!-- SECTION 2: Live Editable Code Editor -->
    <div class="demo-section">
      <h3>2. Live Editable Code Editor (<code>editable</code> mode)</h3>
      <p class="demo-desc">
        Zero-dependency transparent textarea overlay synchronized with Highlight.js grammar tokens, active cursor line tracking, and 2-space <kbd class="nano-kbd">Tab</kbd> indentation.
      </p>

      <NanoCodeEditor
        v-model="liveCode"
        file-path="src/utils/inspectCommitHistory.js"
        lang="javascript"
        mode="code"
        :editable="true"
        :max-height="280"
      />
    </div>

    <NanoCodeBlock title="API Reference & Usage" lang="vue">
&lt;script setup&gt;
import { ref } from 'vue';
import { NanoFileList, NanoCodeEditor } from '@gkucmierz/nano-ui';

const selectedPath = ref('.agents/rules/90-pkg-blog-engine.md');
const files = [
  { path: '.agents/rules/90-pkg-blog-engine.md', status: 'A', additions: 48, deletions: 0 },
  { path: 'docs/.vitepress/theme/composables/useMermaid.js', status: 'M', additions: 22, deletions: 5 },
];
&lt;/script&gt;

&lt;template&gt;
  &lt;div class="inspector-layout"&gt;
    &lt;NanoFileList
      v-model="selectedPath"
      :commit="{ hash: 'de9227a', author: 'Grzegorz Kucmierz' }"
      :files="files"
      :max-path-length="34"
      :searchable="true"
    /&gt;
    &lt;NanoCodeEditor
      :file-path="selectedPath"
      :diff="activeDiff"
      :code="activeCode"
      diff-style="unified"
    /&gt;
  &lt;/div&gt;
&lt;/template&gt;
    </NanoCodeBlock>
  </div>
</template>

<style scoped>
.controls-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  background: var(--nano-bg-muted, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.08));
}

.ctrl-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.84rem;
  cursor: pointer;
}

.ctrl-slider {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 280px;
  flex: 1;
}

.ctrl-label {
  font-size: 0.8rem;
  color: var(--nano-text-muted, #94a3b8);
  white-space: nowrap;
}

.git-inspector-splitter-box {
  height: 460px;
  min-height: 320px;
  max-height: 820px;
  resize: vertical;
  overflow: hidden;
  padding-bottom: 4px;
}
</style>
