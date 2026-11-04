<script setup>
import { ref, computed, onUnmounted } from 'vue';
import { currentLang } from '../../locales.js';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';

const isPl = computed(() => currentLang.value === 'pl');
const copiedToken = ref('');
let copyTokenTimer = null;

const copyToken = async (tokenName) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(`var(${tokenName})`);
      copiedToken.value = tokenName;
      if (copyTokenTimer) clearTimeout(copyTokenTimer);
      copyTokenTimer = setTimeout(() => {
        copyTokenTimer = null;
        if (copiedToken.value === tokenName) copiedToken.value = '';
      }, 1500);
    }
  } catch {
    // Ignore clipboard error
  }
};

onUnmounted(() => {
  if (copyTokenTimer) {
    clearTimeout(copyTokenTimer);
    copyTokenTimer = null;
  }
});

const spacingScale = [
  {
    token: '--nano-space-xs',
    alias: '0.5 × unit',
    px: 4,
    formula: 'calc(var(--nano-unit) * 0.5)',
    usagePl: 'Mikro-odstępy między ikoną a etykietą, wewnętrzne badge i kompaktowe chipy.',
    usageEn: 'Micro-gaps between icons and labels, inline badges, and compact chips.',
  },
  {
    token: '--nano-space-sm',
    alias: '--nano-space-1 (1 × unit)',
    px: 8,
    formula: 'var(--nano-unit)',
    usagePl: 'Kwant bazowy 8px: domyślny margines krawędzi ekranu (NanoSelect viewportMargin), odstępy przycisków.',
    usageEn: 'Base 8px quantum: default viewport edge margin (NanoSelect viewportMargin), button gaps.',
  },
  {
    token: '--nano-space-md',
    alias: '--nano-space-2 (2 × unit)',
    px: 16,
    formula: 'calc(var(--nano-unit) * 2)',
    usagePl: 'Standardowy padding kart (.nano-card), odstępy sekcji formularzy i symetryczny margines modalny.',
    usageEn: 'Standard card padding (.nano-card), form section gaps, and symmetrical modal margin.',
  },
  {
    token: '--nano-space-lg',
    alias: '--nano-space-3 (3 × unit)',
    px: 24,
    formula: 'calc(var(--nano-unit) * 3)',
    usagePl: 'Odstępy między głównymi panelami dashboardu, nagłówki sekcji i szerokie marginesy viewportu.',
    usageEn: 'Gaps between primary dashboard panels, section headers, and wide viewport margins.',
  },
  {
    token: '--nano-space-xl',
    alias: '--nano-space-4 (4 × unit)',
    px: 32,
    formula: 'calc(var(--nano-unit) * 4)',
    usagePl: 'Separatory dużych bloków dokumentacji, hero-banery i kontenery pełnoekranowe.',
    usageEn: 'Large documentation block separators, hero banners, and fullscreen containers.',
  },
  {
    token: '--nano-space-2xl',
    alias: '6 × unit',
    px: 48,
    formula: 'calc(var(--nano-unit) * 6)',
    usagePl: 'Maksymalny rytm pionowy między rozdziałami strony i sekcjami landing page.',
    usageEn: 'Maximum vertical rhythm between page chapters and landing page sections.',
  },
];

const typographyScale = [
  {
    token: '--nano-font-size-xs',
    rem: '0.75rem',
    px: '12px',
    weight: 700,
    lineHeight: '--nano-line-height-tight (1.25)',
    samplePl: 'TELEMETRIA / ODZNAKA STATUSU / SKRÓT KLAWISZOWY (KBD)',
    sampleEn: 'TELEMETRY / STATUS BADGE / KEYBOARD SHORTCUT (KBD)',
  },
  {
    token: '--nano-font-size-sm',
    rem: '0.8125rem',
    px: '13px',
    weight: 500,
    lineHeight: '--nano-line-height-base (1.5)',
    samplePl: 'Kompaktowe tabele danych, opisy pomocnicze i podpowiedzi formularzy.',
    sampleEn: 'Compact data tables, secondary descriptions, and form helper hints.',
  },
  {
    token: '--nano-font-size-base',
    rem: '0.875rem',
    px: '14px',
    weight: 500,
    lineHeight: '--nano-line-height-base (1.5)',
    samplePl: 'Domyślny rozmiar kontrolek UI (.nano-btn, .nano-input, NanoSelect).',
    sampleEn: 'Default UI control font size (.nano-btn, .nano-input, NanoSelect).',
  },
  {
    token: '--nano-font-size-md',
    rem: '1rem',
    px: '16px',
    weight: 400,
    lineHeight: '--nano-line-height-relaxed (1.65)',
    samplePl: 'Tekst główny artykułów i dokumentacji technicznej (max 80ch w linii dla czytelności).',
    sampleEn: 'Primary article and technical documentation body copy (max 80ch per line for readability).',
  },
  {
    token: '--nano-font-size-lg',
    rem: '1.125rem',
    px: '18px',
    weight: 600,
    lineHeight: '--nano-line-height-tight (1.25)',
    samplePl: 'Nagłówki kart (.nano-card), tytuły modali (NanoModal) i podsekcji.',
    sampleEn: 'Card headers (.nano-card), modal titles (NanoModal), and subsection headings.',
  },
  {
    token: '--nano-font-size-xl',
    rem: '1.25rem',
    px: '20px',
    weight: 700,
    lineHeight: '--nano-line-height-tight (1.25)',
    samplePl: 'Nagłówki sekcji H3 i wyróżnione liczniki KPI.',
    sampleEn: 'H3 section headings and highlighted KPI metrics.',
  },
  {
    token: '--nano-font-size-2xl',
    rem: '1.5rem',
    px: '24px',
    weight: 700,
    lineHeight: '--nano-line-height-tight (1.25)',
    samplePl: 'Nagłówki rozdziałów H2 z automatycznym bilansem łamania wierszy (text-wrap: balance).',
    sampleEn: 'H2 chapter headings with balanced multi-line wrapping (text-wrap: balance).',
  },
  {
    token: '--nano-font-size-3xl',
    rem: '1.875rem',
    px: '30px',
    weight: 800,
    lineHeight: '--nano-line-height-tight (1.25)',
    samplePl: 'Główny tytuł widoku H1 & duże odczyty telemetryczne',
    sampleEn: 'Primary H1 view title & hero telemetry readouts',
  },
];

const radiusScale = [
  { token: '--nano-radius-xs', px: '2px', formula: '0.25 × unit' },
  { token: '--nano-radius-sm', px: '4px', formula: '0.5 × unit' },
  { token: '--nano-radius-md', px: '8px', formula: '1 × unit' },
  { token: '--nano-radius-lg', px: '12px', formula: '1.5 × unit' },
  { token: '--nano-radius-xl', px: '16px', formula: '2 × unit' },
  { token: '--nano-radius-full', px: '9999px', formula: 'pill / circle' },
];

const activePaddingPx = ref(16);
const activeGapPx = ref(16);
const activeRadiusPx = ref(8);

const tokensCode = `/* src/assets/sizes.css — Nano UI Spatial & Typography Tokens (SSoT) */
:root {
  /* 1. Kwant Przestrzenny (8pt Spatial Grid: 4px, 8px, 16px, 24px, 32px, 48px) */
  --nano-unit: 8px;
  --nano-space-xs:  calc(var(--nano-unit) * 0.5); /* 4px */
  --nano-space-sm:  var(--nano-unit);             /* 8px  (--nano-space-1) */
  --nano-space-md:  calc(var(--nano-unit) * 2);   /* 16px (--nano-space-2) */
  --nano-space-lg:  calc(var(--nano-unit) * 3);   /* 24px (--nano-space-3) */
  --nano-space-xl:  calc(var(--nano-unit) * 4);   /* 32px (--nano-space-4) */
  --nano-space-2xl: calc(var(--nano-unit) * 6);   /* 48px */

  /* 2. Skala Typograficzna (rem — skaluje się z preferencjami systemu i przeglądarki) */
  --nano-font-size-xs:   0.75rem;   /* 12px */
  --nano-font-size-sm:   0.8125rem; /* 13px */
  --nano-font-size-base: 0.875rem;  /* 14px */
  --nano-font-size-md:   1rem;      /* 16px */
  --nano-font-size-lg:   1.125rem;  /* 18px */
  --nano-font-size-xl:   1.25rem;   /* 20px */
  --nano-font-size-2xl:  1.5rem;    /* 24px */
  --nano-font-size-3xl:  1.875rem;  /* 30px */

  /* 3. Bezjednostkowe interlinie (Unitless Line-Heights) */
  --nano-line-height-tight:   1.25;
  --nano-line-height-base:    1.5;
  --nano-line-height-relaxed: 1.65;
}`;
</script>

<template>
  <div class="doc-page">
    <h2>
      {{
        isPl
          ? 'Typografia, Skala Przestrzenna (8px / 16px / 24px) & Design Tokens'
          : 'Typography, Spatial Scale (8px / 16px / 24px) & Design Tokens'
      }}
    </h2>
    <p class="doc-lead">
      {{
        isPl
          ? 'Fundament wizualny @gkucmierz/nano-ui łączący dwie komplementarne skale: Skalę Typograficzną (rozmiary fontów w rem i bezjednostkowe interlinie) oraz Skalę Przestrzenną opartą na kwancie bazowym --nano-unit: 8px (4px, 8px, 16px, 24px, 32px, 48px).'
          : 'The visual foundation of @gkucmierz/nano-ui combining two complementary scales: the Typography Scale (rem font sizes and unitless line-heights) and the Spatial Scale built on the --nano-unit: 8px quantum (4px, 8px, 16px, 24px, 32px, 48px).'
      }}
    </p>

    <!-- 1. TERMINOLOGY & ARCHITECTURE CALLOUT -->
    <div class="demo-card terminology-card">
      <h3>
        {{
          isPl
            ? '1. Nazewnictwo w Design Systemie: Typografia vs Siatka Przestrzenna (8pt Grid)'
            : '1. Design System Terminology: Typography vs Spatial Scale (8pt Grid)'
        }}
      </h3>
      <div class="terminology-grid">
        <div class="term-box">
          <div class="term-badge cyan">SPATIAL SCALE / 8PT GRID</div>
          <h4>
            {{
              isPl
                ? 'Skala Przestrzenna (Spacing & Sizing Tokens: 8px, 16px, 24px)'
                : 'Spatial Scale (Spacing & Sizing Tokens: 8px, 16px, 24px)'
            }}
          </h4>
          <p>
            {{
              isPl
                ? 'Jednostki 4px, 8px, 16px, 24px, 32px, 48px w nomenklaturze Design Systemów nazywamy Skalą Przestrzenną (Spatial / Spacing Scale) lub Siatką 8-punktową (8pt Grid). Wywodzą się jednak bezpośrednio z klasycznej typografii drukarskiej (rytm pionowy i spacja krzesłowa). W Nano UI ich pojedynczym źródłem prawdy (SSoT) jest plik sizes.css oraz zmienna --nano-unit: 8px.'
                : 'Units like 4px, 8px, 16px, 24px, 32px, 48px are formally called the Spatial / Spacing Scale (or 8pt Grid) in Design Systems, originating from classical print typography (vertical rhythm). In Nano UI, their Single Source of Truth (SSoT) is sizes.css anchored by --nano-unit: 8px.'
            }}
          </p>
        </div>

        <div class="term-box">
          <div class="term-badge purple">TYPOGRAPHY SCALE</div>
          <h4>
            {{
              isPl
                ? 'Skala Typograficzna (Font Sizes, Weights & Line-Heights)'
                : 'Typography Scale (Font Sizes, Weights & Line-Heights)'
            }}
          </h4>
          <p>
            {{
              isPl
                ? 'Odpowiada za hierarchię tekstu: rozmiary w jednostkach względnych rem (--nano-font-size-xs do 3xl), bezjednostkowe interlinie (--nano-line-height-tight/base/relaxed), szerokość kolumny tekstu (max 80ch) oraz nowoczesne łamanie wierszy (text-wrap: balance dla nagłówków i text-wrap: pretty dla akapitów).'
                : 'Governs text hierarchy: relative rem font sizes (--nano-font-size-xs to 3xl), unitless line-heights (--nano-line-height-tight/base/relaxed), readable measure (max 80ch), and modern wrapping (text-wrap: balance for headings and text-wrap: pretty for body copy).'
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- 2. SPATIAL SCALE (8px, 16px, 24px, 32px, 48px) -->
    <div class="demo-card">
      <div class="section-header-row">
        <div>
          <h3>
            {{
              isPl
                ? '2. Skala Przestrzenna (--nano-unit: 8px)'
                : '2. Spatial Scale (--nano-unit: 8px)'
            }}
          </h3>
          <p class="section-sub">
            {{
              isPl
                ? 'Kliknij dowolny token, aby skopiować var(--nano-space-*) do schowka. Te same jednostki sterują m.in. propem :viewport-margin="8 | 16 | 24 | 32" w komponencie NanoSelect.'
                : 'Click any token row to copy var(--nano-space-*) to clipboard. These exact units also power the :viewport-margin="8 | 16 | 24 | 32" prop in NanoSelect.'
            }}
          </p>
        </div>
        <span v-if="copiedToken" class="copied-pill">
          ✓ {{ isPl ? 'Skopiowano' : 'Copied' }}: <code>var({{ copiedToken }})</code>
        </span>
      </div>

      <div class="spacing-table">
        <div
          v-for="item in spacingScale"
          :key="item.token"
          class="spacing-row"
          @click="copyToken(item.token)"
        >
          <div class="spacing-meta">
            <code class="token-code">{{ item.token }}</code>
            <span class="token-alias">{{ item.alias }}</span>
          </div>
          <div class="spacing-px-badge">{{ item.px }}px</div>
          <div class="spacing-bar-track">
            <div class="spacing-bar-fill" :style="{ width: `${item.px * 3.5}px` }">
              <span class="spacing-quantum-ticks">
                <i v-for="n in Math.max(1, Math.round(item.px / 8))" :key="n" class="q-tick"></i>
              </span>
            </div>
          </div>
          <div class="spacing-desc">
            {{ isPl ? item.usagePl : item.usageEn }}
          </div>
        </div>
      </div>

      <!-- Interactive Live Sandbox for 8px / 16px / 24px / 32px -->
      <div class="spatial-sandbox">
        <div class="sandbox-controls">
          <div class="sandbox-ctrl-group">
            <span class="ctrl-label">Padding:</span>
            <button
              v-for="v in [8, 16, 24, 32]"
              :key="'pad-' + v"
              type="button"
              class="unit-btn"
              :class="{ active: activePaddingPx === v }"
              @click="activePaddingPx = v"
            >
              {{ v }}px
            </button>
          </div>
          <div class="sandbox-ctrl-group">
            <span class="ctrl-label">Gap:</span>
            <button
              v-for="v in [8, 16, 24, 32]"
              :key="'gap-' + v"
              type="button"
              class="unit-btn"
              :class="{ active: activeGapPx === v }"
              @click="activeGapPx = v"
            >
              {{ v }}px
            </button>
          </div>
          <div class="sandbox-ctrl-group">
            <span class="ctrl-label">Radius:</span>
            <button
              v-for="v in [4, 8, 12, 16]"
              :key="'rad-' + v"
              type="button"
              class="unit-btn"
              :class="{ active: activeRadiusPx === v }"
              @click="activeRadiusPx = v"
            >
              {{ v }}px
            </button>
          </div>
        </div>

        <div
          class="sandbox-preview-surface"
          :style="{
            padding: `${activePaddingPx}px`,
            gap: `${activeGapPx}px`,
            borderRadius: `${activeRadiusPx}px`,
          }"
        >
          <div
            v-for="idx in 3"
            :key="idx"
            class="sandbox-preview-tile"
            :style="{ borderRadius: `${Math.max(4, activeRadiusPx - 2)}px` }"
          >
            <span class="tile-index">0{{ idx }}</span>
            <span class="tile-meta">
              padding: {{ activePaddingPx }}px · gap: {{ activeGapPx }}px · radius: {{ activeRadiusPx }}px
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. TYPOGRAPHY SCALE (REM & UNITLESS LINE-HEIGHT) -->
    <div class="demo-card">
      <h3>
        {{
          isPl
            ? '3. Skala Typograficzna (--nano-font-size-* & --nano-line-height-*)'
            : '3. Typography Scale (--nano-font-size-* & --nano-line-height-*)'
        }}
      </h3>
      <p class="section-sub">
        {{
          isPl
            ? 'Wszystkie rozmiary tekstu używają jednostek rem (zamiast sztywnych px), aby respektować ustawienia powiększenia w systemie operacyjnym i przeglądarce, a interlinie są bezjednostkowe (1.25 / 1.5 / 1.65).'
            : 'All font sizes use relative rem units (rather than rigid px) to respect OS and browser text-scale preferences, paired with unitless line-heights (1.25 / 1.5 / 1.65).'
        }}
      </p>

      <div class="type-specimen-list">
        <div
          v-for="tItem in typographyScale"
          :key="tItem.token"
          class="type-specimen-row"
          @click="copyToken(tItem.token)"
        >
          <div class="type-specimen-meta">
            <code class="token-code">{{ tItem.token }}</code>
            <div class="type-badges">
              <span class="spec-pill">{{ tItem.rem }} ({{ tItem.px }})</span>
              <span class="spec-pill muted">w{{ tItem.weight }}</span>
            </div>
          </div>
          <div
            class="type-specimen-preview"
            :style="{
              fontSize: tItem.rem,
              fontWeight: tItem.weight,
            }"
          >
            {{ isPl ? tItem.samplePl : tItem.sampleEn }}
          </div>
        </div>
      </div>
    </div>

    <!-- 4. RADIUS SCALE & CODE PREVIEW -->
    <div class="demo-card">
      <h3>
        {{
          isPl
            ? '4. Skala Zaokrągleń (--nano-radius-*) i Definicja CSS (sizes.css)'
            : '4. Border Radius Scale (--nano-radius-*) & CSS Definition (sizes.css)'
        }}
      </h3>
      <div class="radius-grid">
        <div
          v-for="rItem in radiusScale"
          :key="rItem.token"
          class="radius-box"
          :style="{ borderRadius: rItem.px }"
          @click="copyToken(rItem.token)"
        >
          <code>{{ rItem.token }}</code>
          <strong>{{ rItem.px }}</strong>
          <span>{{ rItem.formula }}</span>
        </div>
      </div>

      <NanoCodeBlock :code="tokensCode" lang="css" title="src/assets/sizes.css" />
    </div>
  </div>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: var(--nano-space-lg, 24px);
}

.doc-page h2 {
  text-wrap: balance;
}

.doc-lead {
  max-width: 80ch;
  line-height: var(--nano-line-height-relaxed, 1.65);
  text-wrap: pretty;
  color: var(--nano-text-secondary, #94a3b8);
  margin-top: -8px;
}

.terminology-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--nano-space-md, 16px);
  margin-top: var(--nano-space-sm, 8px);
}

.term-box {
  padding: var(--nano-space-md, 16px);
  border-radius: var(--nano-radius-lg, 12px);
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(99, 102, 241, 0.22);
  display: flex;
  flex-direction: column;
  gap: var(--nano-space-sm, 8px);
}

[data-theme="light"] .term-box {
  background: rgba(248, 250, 252, 0.9);
  border-color: rgba(15, 23, 42, 0.12);
}

.term-box h4 {
  margin: 0;
  font-size: var(--nano-font-size-md, 1rem);
  line-height: var(--nano-line-height-tight, 1.25);
}

.term-box p {
  margin: 0;
  font-size: var(--nano-font-size-sm, 0.8125rem);
  line-height: var(--nano-line-height-relaxed, 1.65);
  color: var(--nano-text-secondary, #94a3b8);
  max-width: 80ch;
  text-wrap: pretty;
}

.term-badge {
  align-self: flex-start;
  font-family: var(--font-mono, monospace);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  padding: 2px 8px;
  border-radius: var(--nano-radius-sm, 4px);
}

.term-badge.cyan {
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.14);
  border: 1px solid rgba(56, 189, 248, 0.35);
}

.term-badge.purple {
  color: #a855f7;
  background: rgba(168, 85, 247, 0.14);
  border: 1px solid rgba(168, 85, 247, 0.35);
}

.section-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--nano-space-md, 16px);
  flex-wrap: wrap;
}

.section-sub {
  margin: 4px 0 14px;
  font-size: var(--nano-font-size-sm, 0.8125rem);
  line-height: var(--nano-line-height-base, 1.5);
  color: var(--nano-text-secondary, #94a3b8);
  max-width: 80ch;
}

.copied-pill {
  font-size: var(--nano-font-size-xs, 0.75rem);
  font-weight: 700;
  color: #10b981;
  background: rgba(16, 185, 129, 0.14);
  border: 1px solid rgba(16, 185, 129, 0.35);
  padding: 4px 10px;
  border-radius: var(--nano-radius-md, 8px);
}

.spacing-table {
  display: flex;
  flex-direction: column;
  gap: var(--nano-space-sm, 8px);
}

.spacing-row {
  display: grid;
  grid-template-columns: 210px 64px 190px 1fr;
  align-items: center;
  gap: var(--nano-space-md, 16px);
  padding: 10px 14px;
  border-radius: var(--nano-radius-md, 8px);
  background: rgba(15, 23, 42, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.14);
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

[data-theme="light"] .spacing-row {
  background: rgba(248, 250, 252, 0.85);
  border-color: rgba(15, 23, 42, 0.1);
}

.spacing-row:hover {
  border-color: rgba(99, 102, 241, 0.5);
}

.spacing-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.token-code {
  font-family: var(--font-mono, monospace);
  font-size: var(--nano-font-size-xs, 0.75rem);
  font-weight: 700;
  color: #818cf8;
}

[data-theme="light"] .token-code {
  color: #4f46e5;
}

.token-alias {
  font-family: var(--font-mono, monospace);
  font-size: 0.68rem;
  color: var(--nano-text-secondary, #94a3b8);
}

[data-theme="light"] .token-alias {
  color: #475569;
}

.spacing-px-badge {
  font-family: var(--font-mono, monospace);
  font-size: var(--nano-font-size-sm, 0.8125rem);
  font-weight: 800;
  color: #38bdf8;
  text-align: right;
}

[data-theme="light"] .spacing-px-badge {
  color: #0284c7;
}

.spacing-bar-track {
  height: 18px;
  background: rgba(15, 23, 42, 0.7);
  border-radius: var(--nano-radius-sm, 4px);
  border: 1px solid rgba(56, 189, 248, 0.2);
  display: flex;
  align-items: center;
  padding: 2px;
  overflow: hidden;
}

[data-theme="light"] .spacing-bar-track {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.spacing-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1 0%, #38bdf8 100%);
  border-radius: 2px;
  position: relative;
}

.spacing-quantum-ticks {
  display: flex;
  width: 100%;
  height: 100%;
}

.q-tick {
  flex: 1;
  border-right: 1px dashed rgba(255, 255, 255, 0.35);
}

.q-tick:last-child {
  border-right: none;
}

.spacing-desc {
  font-size: var(--nano-font-size-xs, 0.75rem);
  color: var(--nano-text-secondary, #94a3b8);
  line-height: var(--nano-line-height-base, 1.5);
}

.spatial-sandbox {
  margin-top: var(--nano-space-md, 16px);
  padding: var(--nano-space-md, 16px);
  border-radius: var(--nano-radius-lg, 12px);
  background: rgba(15, 23, 42, 0.38);
  border: 1px dashed rgba(99, 102, 241, 0.35);
  display: flex;
  flex-direction: column;
  gap: var(--nano-space-md, 16px);
}

[data-theme="light"] .spatial-sandbox {
  background: #f8fafc;
  border-color: rgba(79, 70, 229, 0.35);
}

.sandbox-controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nano-space-md, 16px);
}

.sandbox-ctrl-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ctrl-label {
  font-family: var(--font-mono, monospace);
  font-size: var(--nano-font-size-xs, 0.75rem);
  font-weight: 700;
  color: var(--nano-text-secondary, #94a3b8);
}

[data-theme="light"] .ctrl-label {
  color: #334155;
}

.unit-btn {
  padding: 4px 10px;
  border-radius: var(--nano-radius-sm, 4px);
  font-family: var(--font-mono, monospace);
  font-size: var(--nano-font-size-xs, 0.75rem);
  font-weight: 700;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.28);
  color: var(--nano-text-main, #f8fafc);
  cursor: pointer;
}

[data-theme="light"] .unit-btn {
  background: #ffffff;
  border-color: #cbd5e1;
  color: #1e293b;
}

.unit-btn.active {
  background: #6366f1;
  border-color: #818cf8;
  color: #ffffff;
}

[data-theme="light"] .unit-btn.active {
  background: #4f46e5;
  border-color: #4338ca;
  color: #ffffff;
}

.sandbox-preview-surface {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.4);
  transition: padding 0.2s ease, gap 0.2s ease, border-radius 0.2s ease;
}

[data-theme="light"] .sandbox-preview-surface {
  background: rgba(79, 70, 229, 0.06);
  border-color: rgba(79, 70, 229, 0.28);
}

.sandbox-preview-tile {
  padding: 12px 14px;
  background: rgba(15, 23, 42, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.24);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

[data-theme="light"] .sandbox-preview-tile {
  background: #ffffff;
  border-color: #cbd5e1;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
}

.tile-index {
  font-family: var(--font-mono, monospace);
  font-size: var(--nano-font-size-xs, 0.75rem);
  font-weight: 800;
  color: #38bdf8;
}

[data-theme="light"] .tile-index {
  color: #0284c7;
}

.tile-meta {
  font-family: var(--font-mono, monospace);
  font-size: 0.7rem;
  color: #cbd5e1;
}

[data-theme="light"] .tile-meta {
  color: #475569;
}

.type-specimen-list {
  display: flex;
  flex-direction: column;
  gap: var(--nano-space-sm, 8px);
}

.type-specimen-row {
  display: grid;
  grid-template-columns: 240px 1fr;
  align-items: center;
  gap: var(--nano-space-md, 16px);
  padding: 12px 16px;
  border-radius: var(--nano-radius-md, 8px);
  background: rgba(15, 23, 42, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.14);
  cursor: pointer;
}

[data-theme="light"] .type-specimen-row {
  background: rgba(248, 250, 252, 0.85);
  border-color: rgba(15, 23, 42, 0.1);
}

.type-specimen-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.type-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.spec-pill {
  font-family: var(--font-mono, monospace);
  font-size: 0.68rem;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
}

.spec-pill.muted {
  background: rgba(148, 163, 184, 0.14);
  color: var(--nano-text-secondary, #94a3b8);
}

.type-specimen-preview {
  line-height: var(--nano-line-height-base, 1.5);
  overflow-wrap: break-word;
}

.radius-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--nano-space-md, 16px);
  margin-bottom: var(--nano-space-md, 16px);
}

.radius-box {
  padding: var(--nano-space-md, 16px);
  background: rgba(99, 102, 241, 0.12);
  border: 1.5px solid rgba(99, 102, 241, 0.45);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  text-align: center;
}

.radius-box code {
  font-size: 0.68rem;
  color: #818cf8;
}

.radius-box strong {
  font-family: var(--font-mono, monospace);
  font-size: var(--nano-font-size-md, 1rem);
  color: #38bdf8;
}

.radius-box span {
  font-size: 0.68rem;
  color: var(--nano-text-secondary, #94a3b8);
}

@media (max-width: 860px) {
  .spacing-row,
  .type-specimen-row {
    grid-template-columns: 1fr;
  }
}
</style>
