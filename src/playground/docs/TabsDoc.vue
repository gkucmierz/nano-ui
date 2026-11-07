<script setup>
import { ref, computed } from 'vue';
import NanoTabs from '../../components/NanoTabs.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { createDocTabs } from '../docSnippets.js';
import { getScopedStorageController } from '../../utils/storage-controller.js';
import { t, currentLang } from '../../locales.js';

const tabsStorageCtrl = getScopedStorageController('nano-ui');
const storageMode = ref('ss');
const storageAppPrefix = ref('dashboard-app');
const storageKeyName = ref('tabs_demo');
const storageRevision = ref(0);

const inspectedTabsStorage = computed(() => {
  void storageRevision.value;
  return tabsStorageCtrl.inspect(storageKeyName.value, {
    mode: storageMode.value,
    appPrefix: storageAppPrefix.value,
  });
});

const activeSize = ref('md');
const sizeOptions = [
  { id: 'sm', label: 'sm' },
  { id: 'md', label: 'md' },
  { id: 'lg', label: 'lg' },
];

const dockedTab = ref('toc');
const dockedItems = computed(() => [
  { id: 'toc', label: t('tabsDoc.tocLabel'), count: 9, icon: 'list' },
  { id: 'files', label: t('tabsDoc.filesLabel'), count: 1, icon: 'folder' },
]);

const segmentedTab = ref('all');
const segmentedItems = computed(() => [
  { id: 'all', label: t('tabsDoc.allLabel'), count: 60 },
  { id: 'ddr5', label: 'RAM DDR5', count: 24 },
  { id: 'ddr4', label: 'RAM DDR4', count: 18 },
  { id: 'nvme', label: 'SSD NVMe', count: 18 },
]);

const sizeDemoTabSm = ref('nsd');
const sizeDemoTabMd = ref('mood');
const sizeDemoTabLg = ref('default');

const colorModeItems = computed(() => [
  { id: 'default', label: t('tabsDoc.defaultColor') },
  { id: 'mood', label: t('tabsDoc.moodColor') },
  { id: 'nsd', label: t('tabsDoc.nsdColor'), badge: 'dport' },
]);

const apiDoc = `// Props
modelValue: String | Number (supports v-model)
items: Array<{ id, label, count?, badge?, icon?, disabled?, tooltip? }>
variant: 'docked' | 'segmented' (default: 'docked')
size: 'sm' | 'md' | 'lg' (default: 'md')
fullWidth: Boolean (default: true for 'docked', false for 'segmented')
countFormat: 'auto' | 'parens' | 'badge' (default: 'auto')
ariaLabel: String (default: 'Navigation tabs')
storage: 'ss' | 'ls' | 'none' | false (default: 'ss' when storageKey is set)
appPrefix: String (default: '' -> auto-detected acronym e.g. 'DA')
storageKey: String (default: '' -> resolves to 'DA_NU_<storageKey>')

// Events
@update:modelValue(id: String | Number)
@change(id: String | Number, item: Object)

// Slots
#icon="{ item, active }" - Custom icon per tab
#tab="{ item, active }" - Full custom tab content`;

const codeTabs = createDocTabs({
  name: 'NanoTabs',
  apiDoc,
  props: {
    'v-model': 'activeTab',
    variant: 'docked',
    size: 'md',
    ':items': 'tabs',
    storage: 'ss',
    'app-prefix': 'dashboard-app',
    'storage-key': 'tabs_demo',
  },
  imports: [
    "import { ref } from 'vue';",
    '',
    "const activeTab = ref('toc');",
    'const tabs = [',
    "  { id: 'toc', label: 'Contents', count: 9, icon: 'list' },",
    "  { id: 'files', label: 'Files', count: 1, icon: 'folder' },",
    '];',
  ],
});
</script>

<template>
  <div class="doc-page">
    <h2>{{ t('tabsDoc.title') }}</h2>
    <p class="desc">
      {{ t('tabsDoc.desc') }}
    </p>

    <div class="size-control-bar">
      <span class="size-control-label">{{ t('tabsDoc.sizeLabel') }}</span>
      <NanoTabs v-model="activeSize" :items="sizeOptions" variant="segmented" size="sm" />
      <code class="active-size-code">size="{{ activeSize }}"</code>
      <span class="size-control-label" style="margin-left: 8px;">Storage (<code>@gkucmierz/storage-controller</code>):</span>
      <NanoTabs
        v-model="storageMode"
        :items="[
          { id: 'ss', label: 'SS (default)' },
          { id: 'ls', label: 'LS' },
          { id: 'none', label: 'NONE' },
        ]"
        variant="segmented"
        size="sm"
        @change="storageRevision++"
      />
      <code
        v-tooltip="`from ${inspectedTabsStorage.verboseKey}`"
        class="storage-key-pill"
      >
        <span class="seg-app">{{ inspectedTabsStorage.displayAppSeg }}</span>_<span class="seg-lib">{{ inspectedTabsStorage.displayScopeSeg }}</span>_<span class="seg-key">{{ inspectedTabsStorage.rawKey }}</span>
        = {{ inspectedTabsStorage.rawValue || 'null' }}
      </code>
    </div>

    <h3 class="section-title">{{ t('tabsDoc.sec1Title') }}</h3>
    <p class="desc">
      {{ t('tabsDoc.sec1Desc') }}
    </p>

    <div class="demo-box docked-demo-shell">
      <NanoTabs
        v-model="dockedTab"
        :items="dockedItems"
        variant="docked"
        :size="activeSize"
        :storage="storageMode"
        :app-prefix="storageAppPrefix"
        :storage-key="storageKeyName"
        @change="storageRevision++"
      />
      <div class="docked-demo-body">
        <template v-if="dockedTab === 'toc'">
          <div class="demo-row"># 1. {{ currentLang === 'pl' ? 'Przegląd architektury' : 'Architecture Overview' }}</div>
          <div class="demo-row"># 2. {{ currentLang === 'pl' ? 'Silnik motywów Zero-FOUC' : 'Zero-FOUC Theme Engine' }}</div>
          <div class="demo-row"># 3. {{ currentLang === 'pl' ? 'Zakładki Docked & Segmented' : 'Docked & Segmented Tabs' }}</div>
        </template>
        <template v-else>
          <div class="demo-row">README.md (3.4 KB)</div>
        </template>
      </div>
    </div>

    <h3 class="section-title">{{ t('tabsDoc.sec2Title') }}</h3>
    <p class="desc">
      {{ t('tabsDoc.sec2Desc') }}
    </p>

    <div class="demo-box segmented-demo-stack">
      <div class="seg-row">
        <span class="seg-caption">{{ t('tabsDoc.sizeSm') }}:</span>
        <NanoTabs v-model="sizeDemoTabSm" :items="colorModeItems" variant="segmented" size="sm" />
      </div>
      <div class="seg-row">
        <span class="seg-caption">{{ t('tabsDoc.sizeMd') }}:</span>
        <NanoTabs v-model="sizeDemoTabMd" :items="segmentedItems" variant="segmented" size="md" />
      </div>
      <div class="seg-row">
        <span class="seg-caption">{{ t('tabsDoc.sizeLg') }}:</span>
        <NanoTabs v-model="sizeDemoTabLg" :items="colorModeItems" variant="segmented" size="lg" />
      </div>
    </div>

    <NanoCodeBlock :tabs="codeTabs" />
  </div>
</template>

<style scoped>
.size-control-bar {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--nano-bg-card, rgba(15, 23, 42, 0.65));
  border: 1px solid var(--nano-border-subtle, rgba(148, 163, 184, 0.18));
  align-self: flex-start;
}

.size-control-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--nano-text-main);
}

.active-size-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(99, 102, 241, 0.14);
  color: var(--nano-accent-primary, #6366f1);
}

.storage-key-pill {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  padding: 4px 9px;
  border-radius: 6px;
  background: var(--nano-bg-code);
  border: 1px solid var(--nano-border-card);
  color: var(--nano-text-main);
  cursor: help;
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
  font-weight: 600;
}

.demo-box {
  margin: 14px 0 24px;
  border-radius: 12px;
  border: 1px solid var(--nano-border-subtle, rgba(148, 163, 184, 0.18));
  background: var(--nano-bg-card, rgba(15, 23, 42, 0.65));
  overflow: hidden;
}

.docked-demo-shell {
  max-width: 420px;
}

.docked-demo-body {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--nano-text-muted, #94a3b8);
}

.demo-row {
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(148, 163, 184, 0.06);
}

.segmented-demo-stack {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.seg-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.seg-caption {
  min-width: 190px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: var(--nano-text-muted, #94a3b8);
}
</style>
