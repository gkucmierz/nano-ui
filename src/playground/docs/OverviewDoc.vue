<script setup>
import pkg from '../../../package.json';
import { currentLang, t } from '../../locales.js';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';

const version = pkg.version;

const installCode = `npm install @gkucmierz/nano-ui`;

const setupCode = `// main.js
import { createApp } from 'vue';
import App from './App.vue';
import NanoUI from '@gkucmierz/nano-ui';
import '@gkucmierz/nano-ui/style.css';

const app = createApp(App);

// Standard installation - registers v-ripple, v-tooltip, and Nano* components
app.use(NanoUI);

app.mount('#app');`;

const prefixCode = `// main.js - Multi-library setup with custom prefix
import NanoUI from '@gkucmierz/nano-ui';
import '@gkucmierz/nano-ui/style.css';

// Avoid conflicts if your project already uses another UI library (e.g. PrimeVue, Vuetify)
app.use(NanoUI, {
  directivePrefix: 'nu',  // Directives become: v-nu-tooltip, v-nu-ripple
  componentPrefix: 'My'   // Components become: <MyNanoModal>, <MyNanoSwitch>, etc.
});`;

const localImportCode = `<script setup>
// Local import with alias - 100% immune to global naming conflicts
import { tooltipDirective as vNanoTooltip, NanoModal } from '@gkucmierz/nano-ui';
<\/script>

<template>
  <button v-nano-tooltip="'Instant high-performance tooltip'">
    Hover Me
  </button>
  <NanoModal :visible="false" title="Isolated Modal" />
</template>`;

const viteConfigCode = `// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { nanoCompilerOptions } from '@gkucmierz/nano-ui';

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: nanoCompilerOptions // Preserves newlines in NanoCodeBlock
      }
    })
  ]
});`;
</script>

<template>
  <div class="doc-page">
    <div class="hero-section">
      <span class="hero-badge">NANO UI {{ version }}</span>
      <h2>{{ currentLang === 'pl' ? 'Wprowadzenie i Konfiguracja' : 'Overview & Setup' }}</h2>
      <p class="desc">
        {{ currentLang === 'pl' 
          ? 'Wysokowydajna, ultrakompaktowa biblioteka komponentów Vue 3, interaktywnych wykresów 3D i kinetycznych dyrektyw z wbudowanym systemem Zero-FOUC.' 
          : 'High-performance, minimal footprint Vue 3 UI library, interactive 3D charts, and kinematic directives with built-in Zero-FOUC design tokens.' }}
      </p>
    </div>

    <!-- Quick Installation -->
    <h3 class="section-title">{{ currentLang === 'pl' ? '1. Instalacja' : '1. Installation' }}</h3>
    <NanoCodeBlock title="Terminal" lang="bash" :code="installCode" />

    <!-- Standard Setup -->
    <h3 class="section-title">{{ currentLang === 'pl' ? '2. Rejestracja globalna' : '2. Global Registration' }}</h3>
    <p class="section-desc">
      {{ currentLang === 'pl'
        ? 'Domyślna rejestracja rejestruje komponenty z prefiksem Nano* oraz dyrektywy pod czystymi nazwami (v-tooltip, v-ripple).'
        : 'Default installation registers components with Nano* prefix and directives under clean standard names (v-tooltip, v-ripple).' }}
    </p>
    <NanoCodeBlock title="main.js" lang="javascript" :code="setupCode" />

    <!-- Conflict Resolution -->
    <div class="highlight-box">
      <div class="highlight-header">
        <span class="highlight-icon">🛡️</span>
        <h3 class="highlight-title">
          {{ currentLang === 'pl' ? 'Zarządzanie kolizjami nazw (2+ biblioteki w projekcie)' : 'Resolving Name Conflicts (2+ Libraries in One Project)' }}
        </h3>
      </div>
      <p class="highlight-text">
        {{ currentLang === 'pl'
          ? 'Jeśli Twój projekt posiada już inną bibliotekę definiującą v-tooltip lub v-ripple (np. PrimeVue, Vuetify, Floating Vue), Nano UI oferuje dwa elastyczne rozwiązania:'
          : 'If your project already incorporates another library defining v-tooltip or v-ripple (e.g. PrimeVue, Vuetify, Floating Vue), Nano UI provides two flexible solutions:' }}
      </p>

      <h4>{{ currentLang === 'pl' ? 'A. Własny prefiks w opcjach pluginu (Globalnie)' : 'A. Custom Prefix in Plugin Options (Globally)' }}</h4>
      <p class="section-desc">
        {{ currentLang === 'pl'
          ? 'Przekaż directivePrefix lub componentPrefix podczas wywołania app.use():'
          : 'Pass directivePrefix or componentPrefix during app.use():' }}
      </p>
      <NanoCodeBlock title="main.js" lang="javascript" :code="prefixCode" />

      <h4>{{ currentLang === 'pl' ? 'B. Import lokalny w <script setup> z aliasem (Zero kolizji)' : 'B. Local Import in <script setup> with Alias (Zero Conflicts)' }}</h4>
      <p class="section-desc">
        {{ currentLang === 'pl'
          ? 'W Vue 3 każda zmienna zaczynająca się od litery v (np. vNanoTooltip) działa jako lokalna dyrektywa bez rejestrowania w app:'
          : 'In Vue 3, any variable starting with v (e.g. vNanoTooltip) acts as a local directive without registering on app:' }}
      </p>
      <NanoCodeBlock title="MyComponent.vue" lang="vue" :code="localImportCode" />
    </div>

    <!-- Vite Compiler Config -->
    <h3 class="section-title">{{ currentLang === 'pl' ? '3. Optymalizacja Vite (Opcjonalnie)' : '3. Vite Compiler Optimization (Optional)' }}</h3>
    <p class="section-desc">
      {{ currentLang === 'pl'
        ? 'Aby kompilator Vue zachowywał entery i wcięcia wewnątrz bloków <NanoCodeBlock>, zaimportuj nanoCompilerOptions w vite.config.js:'
        : 'To ensure the Vue compiler preserves newlines and indentation inside <NanoCodeBlock>, import nanoCompilerOptions in vite.config.js:' }}
    </p>
    <NanoCodeBlock title="vite.config.js" lang="javascript" :code="viteConfigCode" />
  </div>
</template>

<style scoped>
.doc-page {
  padding-top: 1rem;
}

.hero-section {
  margin-bottom: 2rem;
}

.hero-badge {
  display: inline-block;
  font-family: var(--font-mono, monospace);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(99, 102, 241, 0.12);
  color: var(--nano-accent-primary, #6366f1);
  border: 1px solid rgba(99, 102, 241, 0.25);
  margin-bottom: 0.75rem;
  letter-spacing: 0.5px;
}

.doc-page h2 {
  font-weight: 800;
  font-size: 2rem;
  margin: 0 0 0.5rem 0;
  color: var(--nano-text-main);
  letter-spacing: -0.5px;
}

.desc {
  color: var(--nano-text-muted);
  font-size: 1.05rem;
  line-height: 1.6;
  max-width: 780px;
  margin: 0;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--nano-text-main);
  margin: 2rem 0 0.5rem 0;
}

.section-desc {
  color: var(--nano-text-muted);
  font-size: 0.92rem;
  line-height: 1.5;
  margin: 0 0 0.75rem 0;
}

.highlight-box {
  background: var(--nano-bg-card, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.12));
  border-radius: var(--nano-radius-lg, 12px);
  padding: 1.5rem;
  margin: 2rem 0;
}

.highlight-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 0.75rem;
}

.highlight-icon {
  font-size: 1.3rem;
}

.highlight-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--nano-text-main);
}

.highlight-text {
  color: var(--nano-text-secondary);
  font-size: 0.95rem;
  line-height: 1.6;
  margin-bottom: 1.25rem;
}

.highlight-box h4 {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--nano-text-main);
  margin: 1.25rem 0 0.4rem 0;
}
</style>
