<script setup>
import { ref, computed } from 'vue';
import NanoFileList from '../../components/NanoFileList.vue';
import NanoCodeEditor from '../../components/NanoCodeEditor.vue';
import NanoSplitter from '../../components/NanoSplitter.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoSlider from '../../components/NanoSlider.vue';
import NanoSelect from '../../components/NanoSelect.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { createDocTabs } from '../docSnippets.js';
import { getScopedStorageController } from '../../utils/storage-controller.js';
import { SYNTAX_THEMES, getRegisteredParsers } from '../../utils/syntax-highlighter.js';
import {
  ALL_PARSERS,
  rustParser,
  pythonParser,
  sqlParser,
  yamlParser,
  goParser,
  dockerfileParser,
  nanosoundParser,
  NANOSOUND_COMPLETIONS,
  glslParser,
  GLSL_COMPLETIONS,
} from '../../parsers/index.js';
import { t } from '../../locales.js';

const maxPathLen = ref(34);
const autoTruncate = ref(true);
const searchable = ref(true);
const showStats = ref(true);
const diffStyle = ref('unified');
const leftPanePx = ref(320);
const splitterLocked = ref(false);
const activeSyntaxTheme = ref('nano');
const liveSyntaxTheme = ref('dracula');
const editorStorageCtrl = getScopedStorageController('nano-ui');
const editorStorageMode = ref('ls');
const editorStorageAppPrefix = ref('dashboard-app');
const editorStorageKeyName = ref('editor_demo');
const editorStorageRevision = ref(0);

const inspectedEditorStorage = computed(() => {
  void editorStorageRevision.value;
  return editorStorageCtrl.inspect(editorStorageKeyName.value, {
    mode: editorStorageMode.value,
    appPrefix: editorStorageAppPrefix.value,
  });
});

const extraParsers = [
  rustParser,
  pythonParser,
  sqlParser,
  yamlParser,
  goParser,
  dockerfileParser,
  nanosoundParser,
  glslParser,
];

const themeOptions = SYNTAX_THEMES.map((th) => ({
  value: th.id,
  label: th.label,
  badge: th.badge,
}));

const demoCommits = [
  {
    hash: 'de9227a8b41c90f123456789abcdef0123456789',
    shortHash: 'de9227a',
    author: 'Grzegorz Kucmierz',
    message: 'feat(mermaid): inject dual-theme rules from @gkucmierz/blog-engine',
    files: [
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
        path: 'src/shaders/sdfCathedral.glsl',
        status: 'A',
        additions: 16,
        deletions: 0,
        diff: `@@ -0,0 +1,16 @@
+#version 300 es
+precision highp float;
+uniform vec4 iParams;
+uniform vec4 iAudio;
+
+vec2 c01_map(vec3 pos) {
+  float blendK = mix(0.14, 0.68, iParams.x) + 0.08 * iAudio.x;
+  vec3 rp = pos;
+  rp.z = mod(rp.z + 1.6, 3.2) - 1.6;
+  vec3 symP = vec3(abs(rp.x) - 1.55, rp.y, rp.z);
+  float pillar = length(symP.xz) - 0.27;
+  float plinth = sdRoundBox(symP - vec3(0.0, -1.0, 0.0), vec3(0.42, 0.25, 0.42), 0.06);
+  return vec2(smin(pillar, plinth, blendK), 1.0);
+}`,
        code: `#version 300 es\nprecision highp float;\nuniform vec4 iParams;\nuniform vec4 iAudio;\n\nvec2 c01_map(vec3 pos) {\n  float blendK = mix(0.14, 0.68, iParams.x) + 0.08 * iAudio.x;\n  vec3 rp = pos;\n  rp.z = mod(rp.z + 1.6, 3.2) - 1.6;\n  vec3 symP = vec3(abs(rp.x) - 1.55, rp.y, rp.z);\n  float pillar = length(symP.xz) - 0.27;\n  float plinth = sdRoundBox(symP - vec3(0.0, -1.0, 0.0), vec3(0.42, 0.25, 0.42), 0.06);\n  return vec2(smin(pillar, plinth, blendK), 1.0);\n}`,
      },
      {
        path: '.agents/rules/90-pkg-blog-engine.md',
        status: 'A',
        additions: 48,
        deletions: 0,
        diff: `@@ -0,0 +1,10 @@
+# Package Rules: @gkucmierz/blog-engine
+
+## 1. Dual-Theme Mermaid Contrast Standard
+- Never hardcode dark node fills (\`fill:#0f172a\`) inside Markdown \`\`\`mermaid blocks.
+- Always use semantic classDefs (\`classDef primary\`, \`classDef accent\`, \`classDef warn\`).`,
        code: `# Package Rules: @gkucmierz/blog-engine\n\n## 1. Dual-Theme Mermaid Contrast Standard\n- Never hardcode dark node fills (\`fill:#0f172a\`) inside Markdown \`\`\`mermaid blocks.\n- Always use semantic classDefs (\`classDef primary\`, \`classDef accent\`, \`classDef warn\`).`,
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

const languageSamples = {
  javascript: {
    filePath: 'src/utils/inspectCommitHistory.js',
    badge: 'Core',
    importPath: '@gkucmierz/nano-ui/parsers/javascript',
    code: `import { computeWeekendBands } from '@gkucmierz/nano-ui';

// Live Editable NanoCodeEditor — try typing or switching Color Profiles!
export function inspectCommitHistory(commits, maxItems = 12) {
  const active = true;
  return commits.slice(0, maxItems).map((c) => ({
    sha: c.hash.slice(0, 7),
    author: c.author,
    changedFiles: c.files.length,
    verified: active,
  }));
}`,
  },
  typescript: {
    filePath: 'src/Healpix.ts',
    badge: 'Core',
    importPath: '@gkucmierz/nano-ui/parsers/typescript',
    code: `export interface SphericalCoord {
  readonly theta: number;
  readonly phi: number;
}

export function ang2pixNest(nside: bigint, coord: SphericalCoord): bigint {
  if (nside <= 0n || (nside & (nside - 1n)) !== 0n) {
    throw new RangeError('HEALPix nside must be a power of 2');
  }
  const z = Math.cos(coord.theta);
  return BigInt(Math.floor((1 - z) * Number(nside)));
}`,
  },
  vue: {
    filePath: 'src/components/VoiceConsensusCard.vue',
    badge: 'Core',
    importPath: '@gkucmierz/nano-ui/parsers/vue',
    code: `<script setup>
import { ref } from 'vue';
import { NanoSwitch, NanoKnob } from '@gkucmierz/nano-ui';

const gainAngle = ref(45);
const consensusActive = ref(true);
<\/script>

<template>
  <section class="voice-card">
    <NanoSwitch v-model="consensusActive" label="2-of-3 Quorum" />
    <NanoKnob v-model="gainAngle" :size="56" color="cyan" />
  </section>
</template>`,
  },
  rust: {
    filePath: 'crates/voice-synth/src/consensus.rs',
    badge: 'Modular',
    importPath: '@gkucmierz/nano-ui/parsers/rust',
    code: `#[derive(Debug, Clone, PartialEq)]
pub struct TranscriptVote<'a> {
    pub engine: &'a str,
    pub text: String,
    pub confidence: f32,
}

pub fn quorum_two_of_three<'a>(votes: &'a [TranscriptVote<'a>]) -> Option<&'a str> {
    if votes.len() < 3 {
        return None;
    }
    for i in 0..votes.len() {
        let matches = votes.iter().filter(|v| v.text == votes[i].text).count();
        if matches >= 2 {
            return Some(votes[i].text.as_str());
        }
    }
    None
}`,
  },
  python: {
    filePath: 'scripts/opsec_audit_scanner.py',
    badge: 'Modular',
    importPath: '@gkucmierz/nano-ui/parsers/python',
    code: `from pathlib import Path
import re

PRIVATE_IP_RE = re.compile(r"\\b192\\.168\\.\\d{1,3}\\.\\d{1,3}\\b")

def scan_repository(repo_dir: Path) -> list[str]:
    findings: list[str] = []
    for src_file in repo_dir.rglob("*.js"):
        content = src_file.read_text(encoding="utf-8")
        if PRIVATE_IP_RE.search(content):
            findings.append(str(src_file))
    return findings`,
  },
  sql: {
    filePath: 'migrations/004_telemetry_events.sql',
    badge: 'Modular',
    importPath: '@gkucmierz/nano-ui/parsers/sql',
    code: `CREATE TABLE IF NOT EXISTS telemetry_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_slug TEXT NOT NULL,
  status_code INTEGER DEFAULT 200,
  latency_ms REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
) STRICT;

SELECT app_slug, COUNT(*) AS req_count, ROUND(AVG(latency_ms), 2) AS p50_ms
FROM telemetry_events
WHERE status_code >= 400
GROUP BY app_slug
ORDER BY req_count DESC;`,
  },
  bash: {
    filePath: 'scripts/verify-workspace.sh',
    badge: 'Core',
    importPath: '@gkucmierz/nano-ui/parsers/bash',
    code: `$ npm run test:unit && npm run build
$ git commit -S -m "feat(nano-ui): modular syntax parsers & color profiles"
$ docker compose up -d --build`,
  },
  go: {
    filePath: 'cmd/relay/main.go',
    badge: 'Modular',
    importPath: '@gkucmierz/nano-ui/parsers/go',
    code: `package main

import (
  "crypto/hmac"
  "crypto/sha256"
  "encoding/hex"
)

func VerifyStreamSignature(payload, sig, secret string) bool {
  mac := hmac.New(sha256.New, []byte(secret))
  mac.Write([]byte(payload))
  expected := hex.EncodeToString(mac.Sum(nil))
  return hmac.Equal([]byte(expected), []byte(sig))
}`,
  },
  yaml: {
    filePath: 'docker-compose.yml',
    badge: 'Modular',
    importPath: '@gkucmierz/nano-ui/parsers/yaml',
    code: `services:
  nano-ui-docs:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "127.0.0.1:33164:80"
    restart: unless-stopped`,
  },
  dockerfile: {
    filePath: 'Dockerfile',
    badge: 'Modular',
    importPath: '@gkucmierz/nano-ui/parsers/dockerfile',
    code: `FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:ssg`,
  },
  nanosound: {
    filePath: 'sounds/retro-laser-pew.nsd',
    badge: 'Core',
    importPath: '@gkucmierz/nano-ui/parsers/nanosound',
    code: `# NanoSound Algebraic DSL (.nsd) — Procedural Laser & Harmonic Chime
seq(
  0ms: saw(glide(1900Hz, 110Hz, exp, 120ms)) * lpf(2800Hz, q:1.8) * expDecay(45ms),
  65ms: 0.75 * sin(880Hz, fm:2.0*0.35) * cheby(3200Hz, ripple:1.5) * adsr(2ms, 28ms, 0.5, 90ms)
)`,
  },
  glsl: {
    filePath: 'src/shaders/sdfCathedral.glsl',
    badge: 'Core',
    importPath: '@gkucmierz/nano-ui/parsers/glsl',
    code: `#version 300 es
precision highp float;

// WebGL2 Raymarching SDF + 1:1 NanoSound (.nsd) Uniforms
uniform vec3 iResolution;
uniform float iTime;
uniform vec4 iAudio;
uniform vec4 iParams;
out vec4 fragColor;

vec2 c01_map(vec3 pos) {
  float blendK = mix(0.14, 0.68, iParams.x) + 0.08 * iAudio.x;
  float vaultH = mix(1.55, 2.55, iParams.y);
  vec3 rp = pos;
  rp.z = mod(rp.z + 1.6, 3.2) - 1.6;
  vec3 symP = vec3(abs(rp.x) - 1.55, rp.y, rp.z);
  float fluting = 0.028 * cos(8.0 * safeAtan(symP.z, symP.x));
  float pillar = max(length(symP.xz) - (0.27 + fluting), symP.y - vaultH);
  float plinth = sdRoundBox(symP - vec3(0.0, -1.0, 0.0), vec3(0.42, 0.25, 0.42), 0.06);
  return vec2(smin(pillar, plinth, blendK), 1.0);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
  vec3 col = acesFilmic(vec3(0.92, 0.28, 0.54) * exp(-2.4 * length(uv)) + 0.25 * iAudio.z);
  fragColor = vec4(col, 1.0);
}`,
  },
};

const selectedSampleLang = ref('glsl');
const liveCode = ref(languageSamples.glsl.code);

const languageOptions = Object.entries(languageSamples).map(([id, meta]) => ({
  value: id,
  label: `${id.toUpperCase()} — ${meta.filePath}`,
  badge: meta.badge,
  description: meta.importPath,
}));

const selectSampleLang = (langId) => {
  selectedSampleLang.value = langId;
  if (languageSamples[langId]) {
    liveCode.value = languageSamples[langId].code;
  }
};

const registeredList = computed(() => {
  void selectedSampleLang.value;
  return getRegisteredParsers();
});

const modularImportSnippet = `// 1. Import only the specific language parsers your project needs:
import { NanoCodeEditor, registerParser } from '@gkucmierz/nano-ui';
import { glslParser, GLSL_COMPLETIONS } from '@gkucmierz/nano-ui/parsers/glsl';
import { rustParser } from '@gkucmierz/nano-ui/parsers/rust';
import { pythonParser } from '@gkucmierz/nano-ui/parsers/python';
import { sqlParser } from '@gkucmierz/nano-ui/parsers/sql';

// Option A: Register globally once at app startup
registerParser([glslParser, rustParser, pythonParser, sqlParser]);

// Option B: Or pass :parsers and :syntax-theme directly to <NanoCodeEditor>
// Supported syntaxTheme values:
// 'nano' | 'github' | 'monokai' | 'dracula' | 'one-dark' | 'nord' | 'solarized' | 'cyberpunk'`;
const codeTabs = createDocTabs({
  componentName: 'NanoCodeEditor',
  stateRef: 'sourceCode',
  initialValue: "'const sum = (a, b) => a + b;'",
  templateAttrs: [
    'v-model="sourceCode"',
    'file-path="src/math.js"',
    'syntax-theme="nano"',
    'mode="code"',
    ':editable="true"',
    'storage="ls"',
    'app-prefix="dashboard-app"',
    'storage-key="editor_prefs"',
  ],
  granularCode: modularImportSnippet,
  apiSections: [
    {
      title: 'Props',
      items: [
        'modelValue / code: String (default: "") - Source code string (supports v-model)',
        'diff: String (default: "") - Unified git diff patch string',
        'filePath: String (default: "") - File path shown in header bar & used for auto language detection',
        'lang: String (default: "") - Explicit language ID override ("js", "rust", "python", "sql", "vue", etc.)',
        'syntaxTheme: String (default: "nano") - Color profile ("nano" | "github" | "monokai" | "dracula" | "one-dark" | "nord" | "solarized" | "cyberpunk")',
        'mode: String (default: "auto") - Display mode ("auto" | "diff" | "code")',
        'diffStyle: String (default: "unified") - Diff layout ("unified" | "split") (supports v-model:diffStyle)',
        'editable: Boolean (default: false) - Enable live textarea editing with syntax overlay',
        'parsers: Array (default: []) - Additional language parser objects to register',
        'storage: "ls" | "ss" | "none" | false (default: "ls" when storageKey is set)',
        'appPrefix: String (default: "" -> auto-detected acronym e.g. "DA")',
        'storageKey: String (default: "" -> resolves to "DA_NU_<storageKey>")',
        'persistDraft: Boolean (default: false) - Also persist live editable code draft in storage',
      ],
    },
    {
      title: 'Events',
      items: [
        '@update:modelValue: (code: string) => void - Emitted when code is edited',
        '@update:diffStyle: (style: "unified"|"split") => void - Emitted when diff layout switches',
        '@update:syntaxTheme: (theme: string) => void - Emitted when color profile changes',
        '@copy: (text: string) => void - Emitted when buffer is copied to clipboard',
      ],
    },
    {
      title: 'Exposed Methods & State (via template ref)',
      items: [
        'focus(): void - Focus the editable code textarea',
        'copyContent(): Promise<void> - Copy current code or diff to clipboard',
        'setMode(mode: "diff"|"code"): void - Switch active viewer mode',
        'setDiffStyle(style: "unified"|"split"): void - Switch unified/split diff view',
        'activeLine / parsedDiff: Ref/ComputedRef',
      ],
    },
  ],
});
</script>

<template>
  <div class="doc-page">
    <h2>{{ t('codeEditor.title') }}</h2>
    <p>{{ t('codeEditor.desc') }}</p>

    <!-- SECTION 1: Split Git Commit & Diff Inspector -->
    <div class="demo-section">
      <h3>{{ t('codeEditor.sec1Title') }}</h3>
      <p class="demo-desc">{{ t('codeEditor.sec1Desc') }}</p>

      <div class="controls-bar">
        <label class="ctrl-item">
          <NanoSwitch v-model="searchable" size="compact" />
          <span>{{ t('codeEditor.searchableList') }}</span>
        </label>
        <label class="ctrl-item">
          <NanoSwitch v-model="showStats" size="compact" />
          <span>{{ t('codeEditor.showStats') }}</span>
        </label>
        <label class="ctrl-item">
          <NanoSwitch v-model="autoTruncate" size="compact" />
          <span>{{ t('codeEditor.autoTruncate') }}</span>
        </label>
        <div class="ctrl-select-wrap">
          <span class="ctrl-label">{{ t('codeEditor.syntaxProfile') }}</span>
          <div style="width: 210px;">
            <NanoSelect
              v-model="activeSyntaxTheme"
              :options="themeOptions"
              size="sm"
              :searchable="false"
            />
          </div>
        </div>
        <div v-if="!autoTruncate" class="ctrl-slider">
          <span class="ctrl-label">{{ t('codeEditor.pathTrunc') }} ({{ maxPathLen }}):</span>
          <NanoSlider v-model="maxPathLen" :min="20" :max="60" :step="1" size="sm" />
        </div>
        <div class="ctrl-select-wrap">
          <span class="ctrl-label">Storage (<code>@gkucmierz/storage-controller</code>):</span>
          <div class="theme-pills-row">
            <button
              v-for="m in ['ls', 'ss', 'none']"
              :key="m"
              type="button"
              class="theme-pill-btn"
              :class="{ active: editorStorageMode === m }"
              @click="editorStorageMode = m; editorStorageRevision++;"
            >
              {{ m.toUpperCase() }}
            </button>
          </div>
          <code
            v-tooltip="`from ${inspectedEditorStorage.verboseKey}`"
            style="font-size: 0.75rem; padding: 3px 8px; border-radius: 6px; background: var(--nano-bg-code); border: 1px solid var(--nano-border-card); cursor: help;"
          >
            <span style="color: var(--nano-status-info-text); font-weight: 700;">{{ inspectedEditorStorage.displayAppSeg }}</span>_<span style="color: var(--nano-status-purple-text); font-weight: 700;">{{ inspectedEditorStorage.displayScopeSeg }}</span>_<span style="color: var(--nano-status-success-text); font-weight: 600;">{{ inspectedEditorStorage.rawKey }}</span>
            = {{ inspectedEditorStorage.rawValue || 'null' }}
          </code>
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
              v-model:syntax-theme="activeSyntaxTheme"
              :file-path="currentFile.path"
              :diff="currentFile.diff"
              :code="currentFile.code"
              :show-theme-selector="true"
              :storage="editorStorageMode"
              :app-prefix="editorStorageAppPrefix"
              :storage-key="editorStorageKeyName"
              @update:diff-style="editorStorageRevision++"
              @update:syntax-theme="editorStorageRevision++"
            />
          </template>
        </NanoSplitter>
      </div>
    </div>

    <!-- SECTION 2: Live Editable Code Editor with Selectable Profiles & Modular Parsers -->
    <div class="demo-section">
      <h3>{{ t('codeEditor.sec2Title') }}</h3>
      <p class="demo-desc">{{ t('codeEditor.sec2Desc') }}</p>

      <div class="controls-bar">
        <div class="ctrl-select-wrap">
          <span class="ctrl-label">{{ t('codeEditor.selectLang') }}</span>
          <div style="width: 290px;">
            <NanoSelect
              :model-value="selectedSampleLang"
              :options="languageOptions"
              size="sm"
              @update:model-value="selectSampleLang"
            />
          </div>
        </div>

        <div class="ctrl-select-wrap">
          <span class="ctrl-label">{{ t('codeEditor.selectTheme') }}</span>
          <div style="width: 210px;">
            <NanoSelect
              v-model="liveSyntaxTheme"
              :options="themeOptions"
              size="sm"
              :searchable="false"
            />
          </div>
        </div>

        <div class="theme-pills-row">
          <button
            v-for="th in SYNTAX_THEMES"
            :key="th.id"
            type="button"
            class="theme-pill-btn"
            :class="{ active: liveSyntaxTheme === th.id }"
            @click="liveSyntaxTheme = th.id"
          >
            {{ th.id }}
          </button>
        </div>
      </div>

      <NanoCodeEditor
        v-model="liveCode"
        v-model:syntax-theme="liveSyntaxTheme"
        :file-path="languageSamples[selectedSampleLang]?.filePath || 'snippet.js'"
        :lang="selectedSampleLang"
        :parsers="extraParsers"
        :completions="selectedSampleLang === 'nanosound' ? NANOSOUND_COMPLETIONS : (selectedSampleLang === 'glsl' ? GLSL_COMPLETIONS : null)"
        :show-theme-selector="true"
        mode="code"
        :editable="true"
        :max-height="310"
      />

      <div class="registered-parsers-bar">
        <span class="reg-title">{{ t('codeEditor.registeredBadge') }} ({{ ALL_PARSERS.length }}):</span>
        <span
          v-for="p in ALL_PARSERS"
          :key="p.id"
          class="parser-chip"
          :class="{ active: selectedSampleLang === p.id || (p.aliases && p.aliases.includes(selectedSampleLang)) }"
          @click="languageSamples[p.id] ? selectSampleLang(p.id) : (p.id === 'xml' ? selectSampleLang('vue') : null)"
        >
          <code>{{ p.id }}</code>
          <small>({{ p.aliases.slice(0, 2).join(', ') }})</small>
        </span>
      </div>
    </div>

    <!-- SECTION 3: Separately Importable Language Parsers Reference -->
    <div class="demo-section">
      <h3>{{ t('codeEditor.sec3Title') }}</h3>
      <p class="demo-desc">{{ t('codeEditor.sec3Desc') }}</p>
      <NanoCodeBlock :tabs="codeTabs" />
    </div>
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

.ctrl-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.84rem;
  cursor: pointer;
}

.ctrl-select-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.ctrl-slider {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 260px;
  flex: 1;
}

.ctrl-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--nano-text-muted, #94a3b8);
  white-space: nowrap;
}

.theme-pills-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.theme-pill-btn {
  padding: 4px 9px;
  border-radius: 5px;
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.12));
  background: var(--nano-bg-card, rgba(255, 255, 255, 0.04));
  color: var(--nano-text-muted, #94a3b8);
  font-family: var(--nano-font-mono, monospace);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.14s ease;
}

.theme-pill-btn:hover {
  color: var(--nano-text-main, #f8fafc);
  border-color: var(--nano-border-hover);
}

.theme-pill-btn.active {
  background: var(--nano-accent-primary, #6366f1);
  border-color: var(--nano-accent-primary, #6366f1);
  color: #ffffff;
}

.registered-parsers-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--nano-border-card, rgba(255, 255, 255, 0.1));
}

.reg-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--nano-text-muted, #94a3b8);
  margin-right: 4px;
}

.parser-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 5px;
  font-size: 0.72rem;
  background: var(--nano-bg-muted, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.1));
  color: var(--nano-text-secondary, #cbd5e1);
  cursor: pointer;
  transition: all 0.14s ease;
}

.parser-chip.active {
  border-color: var(--nano-state-active, #00f2fe);
  background: color-mix(in srgb, var(--nano-state-active, #00f2fe) 12%, transparent);
  color: var(--nano-text-main, #f8fafc);
}

.parser-chip small {
  color: var(--nano-text-muted, #94a3b8);
  font-size: 0.66rem;
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
