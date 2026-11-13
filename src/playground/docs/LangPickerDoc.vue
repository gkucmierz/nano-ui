<script setup>
import { ref, computed } from 'vue';
import NanoLangPicker from '../../components/NanoLangPicker.vue';
import NanoFlag from '../../components/NanoFlag.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { LANG_FLAG_REGISTRY } from '../../utils/langFlags.js';
import { t } from '../../locales.js';
import { createDocTabs } from '../docSnippets.js';

const VIRAL_8_LANGS = ['pl', 'en', 'es', 'pt', 'de', 'fr', 'uk', 'ja'];
const BILINGUAL_LANGS = ['pl', 'en'];

// Independent demo refs per AGENTS.md Rule 1.4
const matrixLang = ref('pl');
const mobileListLang = ref('ja');
const bilingualLang = ref('en');

const allFlagEntries = computed(() => Object.values(LANG_FLAG_REGISTRY));

const docTabs = createDocTabs({
  componentName: 'NanoLangPicker',
  template: `<NanoLangPicker
  v-model="lang"
  :languages="['pl', 'en', 'es', 'pt', 'de', 'fr', 'uk', 'ja']"
  :tooltip="ui.langTooltip"
/>

<!-- Standalone crisp 24x18 vector SVG flag (zero OS emoji reliance) -->
<NanoFlag lang="pl" :size="20" />`,
  script: `import { ref } from 'vue';
import { NanoLangPicker, NanoFlag } from '@gkucmierz/nano-ui';

const lang = ref('pl');`,
});
</script>

<template>
  <div class="doc-page">
    <header class="doc-header">
      <h1>{{ t('langPickerDoc.title') }}</h1>
      <p class="doc-lead">{{ t('langPickerDoc.desc') }}</p>
    </header>

    <section class="doc-section">
      <h2>{{ t('langPickerDoc.demosTitle') }}</h2>
      <div class="demo-cards-grid">
        <div class="demo-card">
          <h3>{{ t('langPickerDoc.matrixCardTitle') }}</h3>
          <p>{{ t('langPickerDoc.matrixCardDesc') }}</p>
          <div class="demo-stage">
            <NanoLangPicker
              v-model="matrixLang"
              :languages="VIRAL_8_LANGS"
              mode="matrix"
            />
            <span class="demo-active-pill">{{ matrixLang.toUpperCase() }}</span>
          </div>
        </div>

        <div class="demo-card">
          <h3>{{ t('langPickerDoc.listCardTitle') }}</h3>
          <p>{{ t('langPickerDoc.listCardDesc') }}</p>
          <div class="demo-stage">
            <NanoLangPicker
              v-model="mobileListLang"
              :languages="VIRAL_8_LANGS"
              mode="list"
            />
            <span class="demo-active-pill">{{ mobileListLang.toUpperCase() }}</span>
          </div>
        </div>

        <div class="demo-card">
          <h3>{{ t('langPickerDoc.bilingualCardTitle') }}</h3>
          <p>{{ t('langPickerDoc.bilingualCardDesc') }}</p>
          <div class="demo-stage">
            <NanoLangPicker
              v-model="bilingualLang"
              :languages="BILINGUAL_LANGS"
            />
            <span class="demo-active-pill">{{ bilingualLang.toUpperCase() }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="doc-section">
      <h2>{{ t('langPickerDoc.flagsTitle') }} ({{ allFlagEntries.length }})</h2>
      <div class="flags-catalog-grid">
        <div
          v-for="entry in allFlagEntries"
          :key="entry.code"
          class="flag-catalog-cell"
        >
          <NanoFlag :lang="entry.code" :size="22" />
          <span class="flag-code">{{ entry.code.toUpperCase() }}</span>
          <span :lang="entry.code" class="flag-native">{{ entry.nativeLabel }}</span>
        </div>
      </div>
    </section>

    <section class="doc-section">
      <NanoCodeBlock :tabs="docTabs" />
    </section>
  </div>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.doc-header h1 {
  margin: 0 0 8px;
  font-size: 1.55rem;
}

.doc-lead {
  margin: 0;
  color: var(--text-muted, #94a3b8);
  line-height: 1.55;
}

.doc-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.demo-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}

.demo-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--border, rgba(148, 163, 184, 0.2));
  background: var(--bg-elevated, rgba(15, 23, 42, 0.55));
}

.demo-card h3 {
  margin: 0;
  font-size: 0.95rem;
}

.demo-card p {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-muted, #94a3b8);
  line-height: 1.45;
}

.demo-stage {
  margin-top: auto;
  padding-top: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.demo-active-pill {
  font-size: 0.74rem;
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(56, 189, 248, 0.14);
  color: #38bdf8;
}

.flags-catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}

.flag-catalog-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 9px;
  border: 1px solid var(--border, rgba(148, 163, 184, 0.18));
  background: var(--bg-elevated, rgba(15, 23, 42, 0.45));
}

.flag-code {
  font-size: 0.72rem;
  font-weight: 800;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.flag-native {
  font-size: 0.8rem;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
