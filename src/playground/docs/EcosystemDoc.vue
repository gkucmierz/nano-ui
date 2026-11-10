<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoTree from '../../components/NanoTree.vue';
import {
  toAcronym,
  buildHierarchicalKey,
  getScopedStorageController,
} from '../../utils/storage-controller.js';

const sampleApp = ref('dashboard-app');
const sampleScope = ref('nano-ui');
const sampleLeafKey = ref('demo_geometry');
const useCompactAcronyms = ref(true);
const activeMode = ref('ls');
const storageTick = ref(0);

const nanoStorage = getScopedStorageController('nano-ui');
let unsubscribe = null;

onMounted(() => {
  unsubscribe = nanoStorage.subscribe(() => {
    storageTick.value += 1;
  });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});

const compactKey = computed(() =>
  buildHierarchicalKey({
    appPrefix: sampleApp.value,
    scopePrefix: sampleScope.value,
    key: sampleLeafKey.value,
    compactPrefixes: true,
  })
);

const verboseKey = computed(() =>
  buildHierarchicalKey({
    appPrefix: sampleApp.value,
    scopePrefix: sampleScope.value,
    key: sampleLeafKey.value,
    compactPrefixes: false,
  })
);

const activeResolvedKey = computed(() =>
  useCompactAcronyms.value ? compactKey.value : verboseKey.value
);

const savedPercent = computed(() => {
  const fullLen = verboseKey.value.length;
  const compLen = compactKey.value.length;
  if (!fullLen || fullLen <= compLen) return 0;
  return Math.round(((fullLen - compLen) / fullLen) * 100);
});

const liveEntry = computed(() => {
  const _t = storageTick.value;
  return nanoStorage.inspect(sampleLeafKey.value, {
    mode: activeMode.value,
    appPrefix: sampleApp.value,
    scopePrefix: sampleScope.value,
    compactPrefixes: useCompactAcronyms.value,
  });
});

const writeDemoRecord = () => {
  nanoStorage.set(
    sampleLeafKey.value,
    {
      x: 160,
      y: 96,
      width: 680,
      height: 460,
      updatedAt: new Date().toISOString().slice(0, 19),
    },
    {
      mode: activeMode.value,
      appPrefix: sampleApp.value,
      scopePrefix: sampleScope.value,
      compactPrefixes: useCompactAcronyms.value,
    }
  );
  storageTick.value += 1;
};

const clearDemoRecord = () => {
  nanoStorage.remove(sampleLeafKey.value, {
    mode: activeMode.value,
    appPrefix: sampleApp.value,
    scopePrefix: sampleScope.value,
    compactPrefixes: useCompactAcronyms.value,
  });
  storageTick.value += 1;
};

const firstPartyPackages = [
  {
    name: '@gkucmierz/storage-controller',
    version: '1.0.0',
    acronym: 'SC',
    usedBy: 'NanoModal, NanoSplitter, App State',
    deps: '0 (Pure ES Module)',
    role: 'Global Symbol.for(...) singleton Front-Controller for localStorage (ls), sessionStorage (ss), and disabled (none) persistence with DA_NU_<key> acronym compression.',
  },
  {
    name: '@gkucmierz/key-controller',
    version: '1.0.1',
    acronym: 'KC',
    usedBy: 'Global Shortcuts (L, T, ?, ESC), Chords',
    deps: '0 (Pure ES Module)',
    role: 'DOM focus-aware keyboard shortcut Front-Controller with ignoreUsedKeyModifiers collision resolution (Shift+Arrow vs Arrow, held C+Arrow chords).',
  },
  {
    name: '@gkucmierz/nano-sound',
    version: '1.0.1',
    acronym: 'NS',
    usedBy: '3D Showoff (Φ), Tactile UI Audio (.nsd)',
    deps: '0 (Web Audio API)',
    role: 'Procedural Web Audio synthesizer and algebraic .nsd DSL compiler — zero MP3/WAV asset downloads.',
  },
  {
    name: '@gkucmierz/dport',
    version: '1.6.1',
    acronym: 'DP',
    usedBy: 'pickNanoPresetByPort, Dev Servers',
    deps: '0 (SHA-256 Isomorphic)',
    role: 'Deterministic port & OKLCH accent preset generator based on project name SHA-256 hash.',
  },
  {
    name: '@gkucmierz/utils',
    version: '5.4.0',
    acronym: 'UT',
    usedBy: 'Runtime Type Guards (is, same, of)',
    deps: '0 (Pure ES Module)',
    role: 'Strict prototype-safe type reflection and deep structural equality without raw typeof pitfalls.',
  },
];

const ecosystemTreeNodes = [
  {
    id: 'nano-ui',
    label: '@gkucmierz/nano-ui',
    version: '1.14.0',
    icon: '🎨',
    badge: 'PUBLIC · MIT',
    badgeVariant: 'emerald',
    meta: '🚀 28 apps',
    children: [
      {
        id: 'storage-controller',
        label: '@gkucmierz/storage-controller',
        version: '1.0.0',
        icon: '💾',
        badge: 'PUBLIC · MIT',
        badgeVariant: 'emerald',
        meta: '0 deps (SC)',
      },
      {
        id: 'key-controller',
        label: '@gkucmierz/key-controller',
        version: '1.0.1',
        icon: '⌨️',
        badge: 'PUBLIC · MIT',
        badgeVariant: 'emerald',
        meta: '0 deps (KC)',
      },
      {
        id: 'nano-sound',
        label: '@gkucmierz/nano-sound',
        version: '1.0.1',
        icon: '🔊',
        badge: 'PUBLIC · MIT',
        badgeVariant: 'emerald',
        meta: '0 deps (.nsd)',
      },
      {
        id: 'dport',
        label: '@gkucmierz/dport',
        version: '1.6.1',
        icon: '🔌',
        badge: 'PUBLIC · MIT',
        badgeVariant: 'emerald',
        meta: '0 deps (SHA-256)',
      },
      {
        id: 'utils',
        label: '@gkucmierz/utils',
        version: '5.4.0',
        icon: '🧬',
        badge: 'PUBLIC · MIT',
        badgeVariant: 'emerald',
        meta: '0 deps (is/same/of)',
      },
    ],
  },
];

const codeTabs = [
  {
    label: 'Storage Front-Controller',
    lang: 'javascript',
    code: `import {
  configureGlobalStorage,
  getScopedStorageController,
  toAcronym,
} from '@gkucmierz/storage-controller';

// 1. Host application sets its name once (or lets detectHostAppPrefix() infer it)
configureGlobalStorage({ appPrefix: 'dashboard-app' }); // Acronym -> "DA"

// 2. Nano UI components use a scoped child adapter ("nano-ui" -> "NU")
const nanoStorage = getScopedStorageController('nano-ui');

// 3. Writes to localStorage under compact key "DA_NU_demo_geometry"
nanoStorage.set('demo_geometry', { x: 120, y: 80, width: 640, height: 480 }, { mode: 'ls' });

// 4. Ephemeral tab-only persistence via sessionStorage ("ss") or disabled ("none")
nanoStorage.set('demo_geometry', { x: 120, y: 80 }, { mode: 'ss' });`,
  },
  {
    label: 'Key Front-Controller',
    lang: 'javascript',
    code: `import { getGlobalKeyController } from '@gkucmierz/key-controller';

const keys = getGlobalKeyController();

// Automatic modifier collision resolution (ignoreUsedKeyModifiers: true by default):
// Pressing Shift+ArrowLeft or holding C+ArrowLeft triggers ONLY the specific handler
// and automatically skips the plain ArrowLeft handler!
const off = keys.bindAll({
  'ArrowLeft': () => stepFrame(-1),
  'Shift+ArrowLeft': () => stepFrame(-10),
  'C+ArrowLeft': () => scrubChapter(-1),
  't': () => toggleTheme(),
  'l': () => toggleLanguage(),
});`,
  },
];
</script>

<template>
  <div class="doc-page">
    <h2>1st-Party Ecosystem &amp; Front-Controllers</h2>
    <p class="lead-text">
      Why does <code>@gkucmierz/nano-ui</code> extract micro-packages like
      <code>@gkucmierz/storage-controller</code> and <code>@gkucmierz/key-controller</code>?
      Every package below is <strong>100% 1st-party, authored in-house under MIT, with zero 3rd-party transitive dependencies</strong>.
      Extracting them allows standalone use in vanilla JS / backend / CLI projects while sharing a single
      <code>globalThis[Symbol.for(...)]</code> singleton instance when paired with <code>Nano UI</code>.
    </p>

    <div class="demo-section">
      <h3>1. 1st-Party Dependency Matrix (Zero 3rd-Party Supply-Chain Bloat)</h3>
      <div class="table-scroll">
        <table class="nano-table">
          <thead>
            <tr>
              <th>Package (1st-Party OSS)</th>
              <th>Acronym</th>
              <th>3rd-Party Deps</th>
              <th>Used In Nano UI</th>
              <th>Architectural Responsibility</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pkg in firstPartyPackages" :key="pkg.name">
              <td><code>{{ pkg.name }}</code> <span class="ver-tag">v{{ pkg.version }}</span></td>
              <td><span class="acronym-pill">{{ pkg.acronym }}</span></td>
              <td><span class="zero-deps-pill">{{ pkg.deps }}</span></td>
              <td>{{ pkg.usedBy }}</td>
              <td>{{ pkg.role }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-top: 16px;">
        <NanoTree
          :nodes="ecosystemTreeNodes"
          root-title="@gkucmierz/nano-ui"
          root-sublabel="Unix tree(1) DAG"
          footer-summary="1 root library, 3 front-controllers, 0 circular dependencies"
        />
      </div>
    </div>

    <div class="demo-section">
      <h3>2. Interactive <code>@gkucmierz/storage-controller</code> &amp; Acronym Key Sandbox</h3>
      <p class="section-desc">
        All prefix segments before the final leaf key are compressed to uppercase acronyms
        (e.g. <code>dashboard-app</code> &rarr; <code>DA</code>, <code>nano-ui</code> &rarr; <code>NU</code>),
        saving <strong>~{{ savedPercent }}%</strong> key length in <code>localStorage</code> and keeping the
        semantic modal/splitter identifier immediately visible inside narrow DevTools storage tables.
      </p>

      <div class="sandbox-controls">
        <div class="field-col">
          <label class="field-label" for="eco-app-prefix-input">
            1. Host App Name (<code>appPrefix</code> &rarr; <code>{{ toAcronym(sampleApp) }}</code>):
          </label>
          <input
            id="eco-app-prefix-input"
            v-model="sampleApp"
            name="eco-app-prefix-input"
            type="text"
            class="eco-input"
          />
          <div class="chip-row">
            <button
              v-for="app in ['dashboard-app', 'workflow-app', 'home-control-app', 'cv-app']"
              :key="app"
              type="button"
              class="mini-chip"
              :class="{ active: sampleApp === app }"
              @click="sampleApp = app"
            >
              {{ app }} ({{ toAcronym(app) }})
            </button>
          </div>
        </div>

        <div class="field-col">
          <label class="field-label" for="eco-scope-prefix-input">
            2. Library Scope (<code>scopePrefix</code> &rarr; <code>{{ toAcronym(sampleScope) }}</code>):
          </label>
          <input
            id="eco-scope-prefix-input"
            v-model="sampleScope"
            name="eco-scope-prefix-input"
            type="text"
            class="eco-input"
          />
        </div>

        <div class="field-col">
          <label class="field-label" for="eco-leaf-key-input">
            3. Element / Route Key (Full Semantic Suffix):
          </label>
          <input
            id="eco-leaf-key-input"
            v-model="sampleLeafKey"
            name="eco-leaf-key-input"
            type="text"
            class="eco-input"
          />
          <div class="chip-row">
            <button
              v-for="k in ['demo_geometry', 'help_modal', 'ide_sidebar', 'build_fix_modal']"
              :key="k"
              type="button"
              class="mini-chip"
              :class="{ active: sampleLeafKey === k }"
              @click="sampleLeafKey = k"
            >
              {{ k }}
            </button>
          </div>
        </div>
      </div>

      <div class="compression-banner">
        <div class="key-comparison">
          <div class="key-line">
            <span class="key-tag">Active Key:</span>
            <code
              v-tooltip="`from ${verboseKey}`"
              class="resolved-code"
              style="cursor: help;"
            ><template v-if="liveEntry.displayAppSeg && liveEntry.displayAppSeg !== liveEntry.displayScopeSeg"><span class="seg-app">{{ liveEntry.displayAppSeg }}</span>_</template><span class="seg-lib">{{ liveEntry.displayScopeSeg }}</span>_<span class="seg-key">{{ liveEntry.rawKey }}</span></code>
            <span class="byte-saving-badge">
              {{ activeResolvedKey.length }} chars ({{ savedPercent }}% prefix reduction vs {{ verboseKey.length }} chars)
            </span>
          </div>
          <div class="key-line muted-line">
            <span>Full Chain:</span>
            <code>{{ verboseKey }}</code>
          </div>
        </div>

        <div class="mode-and-toggle">
          <label class="switch-label">
            <NanoSwitch v-model="useCompactAcronyms" size="compact" />
            <span>Acronym Compression (<code>DA_NU_</code>)</span>
          </label>

          <div class="mode-pills" role="radiogroup" aria-label="Storage backend">
            <button
              v-for="m in ['ls', 'ss', 'none']"
              :key="m"
              type="button"
              class="mode-btn"
              :class="{ active: activeMode === m }"
              @click="activeMode = m"
            >
              {{ m.toUpperCase() }}
            </button>
          </div>
        </div>
      </div>

      <div class="live-storage-actions">
        <button type="button" class="action-btn primary" @click="writeDemoRecord">
          Write Sample Geometry to {{ activeMode.toUpperCase() }}
        </button>
        <button type="button" class="action-btn" @click="clearDemoRecord">
          Remove Key
        </button>
        <span class="live-readout">
          <strong>{{ liveEntry.backend }}:</strong>
          <code>{{ liveEntry.exists ? liveEntry.rawValue : 'null (empty)' }}</code>
        </span>
      </div>
    </div>

    <NanoCodeBlock :tabs="codeTabs" />
  </div>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.lead-text {
  margin: 0;
  color: var(--nano-text-secondary);
  line-height: 1.65;
}

.demo-section {
  background: var(--nano-bg-card);
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid var(--nano-border-card);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

h2 {
  margin: 0;
  color: var(--nano-text-main);
}

h3 {
  margin: 0;
  color: var(--nano-text-main);
  border-bottom: 1px solid var(--nano-border-subtle);
  padding-bottom: 0.5rem;
}

.section-desc {
  margin: 0;
  color: var(--nano-text-muted);
  font-size: 0.9rem;
  line-height: 1.55;
}

.table-scroll {
  overflow-x: auto;
}

.ver-tag {
  font-size: 0.74rem;
  color: var(--nano-text-muted);
  margin-left: 4px;
}

.acronym-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--nano-status-purple-bg);
  border: 1px solid var(--nano-status-purple-border);
  color: var(--nano-status-purple-text);
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-weight: 700;
  font-size: 0.76rem;
}

.zero-deps-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--nano-status-success-bg);
  border: 1px solid var(--nano-status-success-border);
  color: var(--nano-status-success-text);
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-weight: 600;
  font-size: 0.75rem;
  white-space: nowrap;
}

.sandbox-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 1rem;
}

.field-col {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.field-label {
  font-size: 0.82rem;
  color: var(--nano-text-muted);
}

.eco-input {
  height: 34px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-code);
  color: var(--nano-text-main);
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.84rem;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.mini-chip {
  padding: 3px 8px;
  border-radius: 5px;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-muted);
  color: var(--nano-text-secondary);
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.74rem;
  cursor: pointer;
}

.mini-chip.active {
  border-color: var(--nano-accent-primary);
  background: var(--nano-nav-active-bg);
  color: var(--nano-nav-active-color);
  font-weight: 600;
}

.compression-banner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-card);
}

.key-comparison {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.key-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.muted-line {
  font-size: 0.8rem;
  color: var(--nano-text-muted);
}

.key-tag {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--nano-text-secondary);
}

.resolved-code {
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-card);
  color: var(--nano-text-main);
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.88rem;
}

.seg-app {
  color: var(--nano-status-info-text);
  font-weight: 700;
}

.seg-lib {
  color: var(--nano-status-purple-text);
  font-weight: 700;
}

.seg-key {
  color: var(--nano-status-success-text);
  font-weight: 700;
}

.byte-saving-badge {
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--nano-status-success-bg);
  border: 1px solid var(--nano-status-success-border);
  color: var(--nano-status-success-text);
  font-size: 0.76rem;
  font-weight: 600;
}

.mode-and-toggle {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.switch-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.84rem;
  color: var(--nano-text-main);
  cursor: pointer;
  user-select: none;
}

.mode-pills {
  display: inline-flex;
  padding: 2px;
  border-radius: 6px;
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-card);
  gap: 2px;
}

.mode-btn {
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--nano-text-muted);
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
}

.mode-btn.active {
  background: var(--nano-accent-primary);
  color: #ffffff;
}

.live-storage-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.action-btn {
  height: 36px;
  padding: 0 14px;
  border-radius: 6px;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-muted);
  color: var(--nano-text-main);
  font-weight: 600;
  font-size: 0.84rem;
  cursor: pointer;
}

.action-btn.primary {
  background: var(--nano-accent-primary);
  border-color: var(--nano-accent-primary);
  color: #ffffff;
}

.live-readout {
  font-size: 0.82rem;
  color: var(--nano-text-secondary);
}
</style>
