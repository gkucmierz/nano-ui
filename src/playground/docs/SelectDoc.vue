<script setup>
import { ref } from 'vue';
import NanoSelect from '../../components/NanoSelect.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoModal from '../../components/NanoModal.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { createDocTabs } from '../docSnippets.js';
import { t, currentLang } from '../../locales.js';

const selectedSingle = ref('rust');
const selectedMulti = ref(['vue', 'rust', 'sqlite']);
const isMultiple = ref(false);
const searchable = ref(true);
const clearable = ref(true);
const disabled = ref(false);
const size = ref('md');
const status = ref('normal');
const modalOpen = ref(false);
const modalSelectedRegion = ref('eu-central-1');
const stackedSecondModalOpen = ref(false);

// Simulator state (Options 2 + 3)
const useSmartPositioning = ref(true);
const simUiLang = ref('en');
const simCommitStyle = ref('conventional');
const simBottomEdgeValue = ref('eu-central-1');
const simOverlapValue = ref('rust');
const simTightViewportHeight = ref(240);
const simViewportMargin = ref(16);
const simScrollFlowValue = ref('vue');
const simStackedOverlayInViewport = ref(false);

const commitSelectRef = ref(null);
const bottomSelectRef = ref(null);
const overlapSelectRef = ref(null);
const scrollFlowSelectRef = ref(null);

const commitStyleOptions = [
  {
    value: 'conventional',
    label: 'Conventional (feat/fix/docs)',
    badge: 'DEFAULT',
    color: '#6366f1',
    description: 'Structured semantic prefixes with automatic changelog grouping',
  },
  {
    value: 'gitmoji',
    label: 'Gitmoji + Scope (:sparkles: feat)',
    badge: 'EMOJI',
    color: '#f59e0b',
    description: 'Visual commit classification with scope tags',
  },
  {
    value: 'imperative',
    label: 'Linux Kernel Imperative (Subsys: Msg)',
    badge: 'KERNEL',
    color: '#10b981',
    description: 'Strict 72-char summary line + Signed-off-by trailer',
  },
  {
    value: 'ticket',
    label: 'Workflow Task Prefix ([TASK-402] ...)',
    badge: 'TRAILER',
    color: '#38bdf8',
    description: 'Automatic Task URL trailer injection on commit',
  },
  {
    value: 'minimal',
    label: 'Compact One-Liner (fast-forward)',
    badge: 'SHORT',
    color: '#a855f7',
    description: 'Single-line summary for rapid prototyping branches',
  },
];

const uiLangOptions = [
  { value: 'en', label: 'English (EN)', badge: 'EN', color: '#6366f1' },
  { value: 'pl', label: 'Polski (PL)', badge: 'PL', color: '#10b981' },
  { value: 'de', label: 'Deutsch (DE)', badge: 'DE', color: '#f59e0b' },
];

const techOptions = [
  {
    value: 'vue',
    labelPl: 'Vue 3 + Vite (Reaktywne UI)',
    labelEn: 'Vue 3 + Vite (Reactive UI)',
    badge: 'FRONTEND',
    color: '#10b981',
    icon: 'sparkles',
    description: 'Zero-FOUC glassmorphic components & kinetic directives',
  },
  {
    value: 'rust',
    labelPl: 'Rust + Cargo (Silnik DSP / Audio)',
    labelEn: 'Rust + Cargo (DSP / Audio Engine)',
    badge: 'SYSTEMS',
    color: '#f97316',
    icon: 'rotate',
    description: 'Memory-safe SIMD synthesis & consensus pipelines',
  },
  {
    value: 'sqlite',
    labelPl: 'SQLite WAL (Wbudowana baza danych)',
    labelEn: 'SQLite WAL (Embedded Database)',
    badge: 'STORAGE',
    color: '#38bdf8',
    description: 'Strict schema tables with sub-millisecond reads',
  },
  {
    value: 'healpix',
    labelPl: 'Żółta Siatka Sferyczna HEALPix (Nside=2^k)',
    labelEn: 'Yellow HEALPix Spherical Grid (Nside=2^k)',
    badge: 'ASTRO',
    color: '#eab308',
    description: 'Equal-area hierarchical isolatitude pixelization',
  },
  {
    value: 'playwright',
    labelPl: 'Playwright E2E (Weryfikacja wizualna)',
    labelEn: 'Playwright E2E (Visual Verification)',
    badge: 'QA',
    color: '#a855f7',
    description: 'Automated headless Chromium assertions',
  },
  {
    value: 'legacy',
    labelPl: 'Przestarzały moduł Flash (Zablokowany)',
    labelEn: 'Deprecated Flash Module (Disabled)',
    badge: 'EOL',
    color: '#64748b',
    disabled: true,
  },
];

const regionOptions = [
  { value: 'eu-central-1', label: 'Frankfurt (eu-central-1)', badge: '9ms', color: '#10b981' },
  { value: 'eu-north-1', label: 'Stockholm (eu-north-1)', badge: '18ms', color: '#38bdf8' },
  { value: 'us-east-1', label: 'Virginia (us-east-1)', badge: '84ms', color: '#f59e0b' },
  { value: 'ap-northeast-1', label: 'Tokyo (ap-northeast-1)', badge: '210ms', color: '#a855f7' },
  { value: 'sa-east-1', label: 'São Paulo (sa-east-1)', badge: '195ms', color: '#f97316' },
  { value: 'ap-southeast-2', label: 'Sydney (ap-southeast-2)', badge: '265ms', color: '#ec4899' },
];

const usageSnippet = `<script setup>
import { ref } from 'vue';
import { NanoSelect } from '@gkucmierz/nano-ui';

const selectedStack = ref('rust');
const options = [
  { value: 'vue', label: 'Vue 3 + Vite', badge: 'UI', color: '#10b981' },
  { value: 'rust', label: 'Rust + Cargo', badge: 'DSP', color: '#f97316' },
  { value: 'sqlite', label: 'SQLite WAL', badge: 'DB', color: '#38bdf8' },
];
<\/script>

<template>
  <!-- Smart parentNode traversal (Option 2) + 4-mode Screen Clamping (Option 3) enabled by default -->
  <NanoSelect
    v-model="selectedStack"
    :options="options"
    :searchable="true"
    :clearable="true"
    :smart-positioning="true"
    size="md"
  />
</template>`;

const codeTabs = createDocTabs({
  componentName: 'NanoSelect',
  usageCode: usageSnippet,
  apiSections: [
    {
      title: 'Props',
      items: [
        'modelValue: String | Number | Array (default: null, v-model) - Selected option value(s)',
        'options: Array<Object | String | Number> (default: []) - Options ({ value, label, labelPl?, labelEn?, badge?, color?, description?, disabled? })',
        'multiple: Boolean (default: false) - Enable multi-select with removable chips',
        'searchable: Boolean (default: true) - Enable live diacritic-insensitive search input',
        'clearable: Boolean (default: false) - Show clear selection button',
        'smartPositioning: Boolean (default: true) - Enable Option 2 (parentNode clipping escape) & Option 3 (4-mode bottom / top / bottom-clamped / overlap screen clamping)',
        'maxDropdownHeight: Number (default: 260) - Maximum height of options list before clamping',
        'size: String (default: "md") - Control height preset ("sm" | "md" | "lg")',
        'status: String (default: "normal") - Validation state ("normal" | "error" | "success")',
        'disabled: Boolean (default: false) - Disable dropdown interaction',
      ],
    },
    {
      title: 'Events',
      items: [
        '@update:modelValue / @change: (val) => void - Emitted when selection changes',
        '@open / @close: () => void - Emitted when dropdown opens or closes',
        '@clear: () => void - Emitted when selection is cleared',
        '@search: (query: string) => void - Emitted when search filter text changes',
      ],
    },
    {
      title: 'Exposed Methods & State (via template ref)',
      items: [
        'open() / close() / toggle(): void - Programmatically control dropdown visibility',
        'updateDropdownPosition(measureActual?): void - Recompute ancestor mount & 4-mode screen layout',
        'dropdownLayout: Ref<{ placement, optionsMaxHeight, top, left, spaceBelow, spaceAbove, screenHeight, escapedScrollers }>',
        'isOpen / filterText / filteredOptions / selectedOptionsList: Ref/ComputedRef',
      ],
    },
  ],
});
</script>

<template>
  <div class="doc-page">
    <h2>{{ t('select.title') }}</h2>
    <p>{{ t('select.desc') }}</p>

    <!-- SECTION 1: Interactive Configurator -->
    <div class="demo-section">
      <h3>{{ t('select.sec1Title') }}</h3>
      <p class="demo-desc">{{ t('select.sec1Desc') }}</p>

      <div class="select-sandbox-grid">
        <div class="select-stage">
          <div style="width: 100%; max-width: 460px;">
            <NanoSelect
              v-if="isMultiple"
              v-model="selectedMulti"
              :options="techOptions"
              :multiple="true"
              :searchable="searchable"
              :clearable="clearable"
              :disabled="disabled"
              :size="size"
              :status="status"
            />
            <NanoSelect
              v-else
              v-model="selectedSingle"
              :options="techOptions"
              :multiple="false"
              :searchable="searchable"
              :clearable="clearable"
              :disabled="disabled"
              :size="size"
              :status="status"
            />
          </div>

          <div class="readout-pill">
            <code>v-model: {{ isMultiple ? JSON.stringify(selectedMulti) : JSON.stringify(selectedSingle) }}</code>
          </div>
        </div>

        <div class="select-controls">
          <label class="toggle-row">
            <NanoSwitch v-model="isMultiple" size="compact" />
            <span>{{ t('select.multiple') }}</span>
          </label>
          <label class="toggle-row">
            <NanoSwitch v-model="searchable" size="compact" />
            <span>{{ t('select.searchable') }}</span>
          </label>
          <label class="toggle-row">
            <NanoSwitch v-model="clearable" size="compact" />
            <span>{{ t('select.clearable') }}</span>
          </label>
          <label class="toggle-row">
            <NanoSwitch v-model="disabled" size="compact" />
            <span>{{ t('select.disabled') }}</span>
          </label>

          <div class="ctrl-group">
            <span class="ctrl-label">{{ t('select.size') }}</span>
            <div class="nano-btn-group">
              <button
                v-for="s in ['sm', 'md', 'lg']"
                :key="s"
                type="button"
                class="nano-btn nano-btn-secondary nano-btn-sm"
                :class="{ 'nano-btn-active': size === s }"
                @click="size = s"
              >
                {{ s }}
              </button>
            </div>
          </div>

          <div class="ctrl-group">
            <span class="ctrl-label">{{ t('select.status') }}</span>
            <div class="nano-btn-group">
              <button
                v-for="st in ['normal', 'error', 'success']"
                :key="st"
                type="button"
                class="nano-btn nano-btn-secondary nano-btn-sm"
                :class="{ 'nano-btn-active': status === st }"
                @click="status = st"
              >
                {{ st }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SECTION 2: Modal Escape & Stacking Context Isolation Demo -->
    <div class="demo-section">
      <h3>{{ t('select.sec2Title') }}</h3>
      <p class="demo-desc">{{ t('select.sec2Desc') }}</p>

      <button type="button" class="nano-btn nano-btn-primary" @click="modalOpen = true">
        Open NanoModal with NanoSelect (Bottom of Modal Body)
      </button>

      <NanoModal
        v-model="modalOpen"
        title="Repository Settings & Commit Style"
        width="540px"
      >
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <p style="margin: 0; font-size: 0.84rem; color: var(--nano-text-muted);">
            The <strong>Commit Style</strong> select sits right at the bottom of <code>.nano-modal-body</code> above the modal footer. Because <code>NanoSelect</code> walks up <code>parentNode</code> to <code>.nano-modal-overlay</code>, opening it causes <strong>zero scrollbar inflation</strong> inside the modal and never gets clipped by the footer!
          </p>

          <div style="display: grid; grid-template-columns: 160px 1fr; gap: 12px; align-items: end;">
            <div>
              <span class="sim-field-label">Language</span>
              <NanoSelect
                v-model="simUiLang"
                :options="uiLangOptions"
                :searchable="false"
              />
            </div>
            <div>
              <span class="sim-field-label">Commit Style</span>
              <NanoSelect
                v-model="simCommitStyle"
                :options="commitStyleOptions"
                :searchable="true"
              />
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 6px;">
            <span style="font-size: 0.78rem; color: var(--nano-text-muted);">
              Press <kbd class="nano-kbd">Esc</kbd> while open — only the select closes!
            </span>
            <button
              type="button"
              class="nano-btn nano-btn-secondary nano-btn-sm"
              @click="stackedSecondModalOpen = true"
            >
              Open 2nd Modal With Backdrop Over Select
            </button>
          </div>
        </div>
      </NanoModal>

      <NanoModal
        v-model="stackedSecondModalOpen"
        title="Stacked Confirmation Modal (Layer 2)"
        width="400px"
      >
        <p style="margin: 0; font-size: 0.86rem; color: var(--nano-text-muted); line-height: 1.5;">
          Notice how this second modal's backdrop cleanly covers the first modal and any open <code>NanoSelect</code> inside it! That is why Option 2 (mounting on the nearest safe ancestor / modal overlay) is superior to naively mounting on <code>document.body</code> with an extreme <code>z-index</code>.
        </p>
      </NanoModal>
    </div>

    <!-- SECTION 3: Simulated Browser Screens (Options 2 + 3) -->
    <div class="demo-section">
      <h3>{{ t('select.sec3Title') }}</h3>
      <p class="demo-desc">{{ t('select.sec3Desc') }}</p>

      <!-- CASE A: Exact reproduction of the Commit Style / Save Settings modal footer clipping bug -->
      <div class="sim-card">
        <div class="sim-card-header">
          <div>
            <span class="sim-badge sim-badge-indigo">CASE 1 • OPTION 2 + 3</span>
            <h4 class="sim-card-title">
              {{ currentLang === 'pl'
                ? 'Select na samym dole .modal-body tuż nad stopką (Commit Style / Save Settings)'
                : 'Select at the Bottom of .modal-body Right Above Footer (Commit Style / Save Settings)' }}
            </h4>
            <p class="sim-card-sub">
              {{ currentLang === 'pl'
                ? 'Porównaj zachowanie pętli parentNode (uciekającej ponad .sim-modal-body i .sim-modal-window bez pojawiania się scrollbara) z trybem naiwnym ze zrzutu ekranu.'
                : 'Compare smart parentNode traversal (escaping .sim-modal-body & .sim-modal-window with zero scrollbar inflation) against the legacy clipped behavior.' }}
            </p>
          </div>

          <div class="sim-header-controls">
            <label class="toggle-row sim-toggle-pill">
              <NanoSwitch v-model="useSmartPositioning" size="compact" />
              <span>
                {{ useSmartPositioning
                  ? (currentLang === 'pl' ? 'Opcja 2+3: Smart parentNode (Naprawiony)' : 'Option 2+3: Smart parentNode (Fixed)')
                  : (currentLang === 'pl' ? 'Stary błąd: Wewnątrz .modal-body (Ucięty + Scrollbar)' : 'Legacy Bug: Inside .modal-body (Clipped + Scrollbar)') }}
              </span>
            </label>

            <button
              type="button"
              class="nano-btn nano-btn-secondary nano-btn-sm"
              @click="simStackedOverlayInViewport = !simStackedOverlayInViewport"
            >
              {{ simStackedOverlayInViewport
                ? (currentLang === 'pl' ? 'Zamknij 2. Modal z Backdropem' : 'Close 2nd Backdrop Modal')
                : (currentLang === 'pl' ? 'Nałóż 2. Modal z Backdropem' : 'Open 2nd Modal Backdrop') }}
            </button>
          </div>
        </div>

        <!-- Simulated Browser Screen 1 -->
        <div class="browser-frame">
          <div class="browser-chrome">
            <div class="browser-dots">
              <span class="b-dot is-red" />
              <span class="b-dot is-amber" />
              <span class="b-dot is-green" />
            </div>
            <div class="browser-url">https://dashboard.7u.pl/settings — Simulated Viewport (100% × 420px)</div>
            <div class="browser-telemetry">
              <code>placement: {{ commitSelectRef?.dropdownLayout?.placement || 'bottom' }}</code>
              <code>escapedScrollers: {{ commitSelectRef?.dropdownLayout?.escapedScrollers ?? 0 }}</code>
            </div>
          </div>

          <div class="browser-viewport" style="height: 420px;" data-nano-viewport>
            <div class="sim-modal-backdrop">
              <div class="sim-modal-window" style="width: 560px; max-width: 94%;">
                <div class="sim-modal-header">
                  <span class="sim-modal-title">Workspace Git & Commit Configuration</span>
                  <span class="sim-modal-tag">.sim-modal-window (overflow: hidden)</span>
                </div>

                <div class="sim-modal-body">
                  <div class="sim-setting-Placeholder">
                    <div class="sim-setting-line">
                      <span>GPG Commit Signing (<code>git commit -S</code>)</span>
                      <span class="sim-status-ok">ENABLED</span>
                    </div>
                    <div class="sim-setting-line">
                      <span>Remote Origin</span>
                      <code>git@gitea.7u.pl:gkucmierz/nano-ui.git</code>
                    </div>
                  </div>

                  <div class="sim-commit-grid">
                    <div>
                      <span class="sim-field-label">UI Locale</span>
                      <NanoSelect
                        v-model="simUiLang"
                        :options="uiLangOptions"
                        :searchable="false"
                        :smart-positioning="useSmartPositioning"
                      />
                    </div>
                    <div>
                      <span class="sim-field-label">Commit Style</span>
                      <NanoSelect
                        ref="commitSelectRef"
                        v-model="simCommitStyle"
                        :options="commitStyleOptions"
                        :searchable="true"
                        :smart-positioning="useSmartPositioning"
                      />
                    </div>
                  </div>
                </div>

                <div class="sim-modal-footer">
                  <button type="button" class="sim-btn sim-btn-ghost">Inspector</button>
                  <button type="button" class="sim-btn sim-btn-ghost">Close</button>
                  <button type="button" class="sim-btn sim-btn-save">✓ Save Settings</button>
                </div>
              </div>
            </div>

            <!-- Simulated 2nd Modal with Backdrop opened on top of the open Select -->
            <div
              v-if="simStackedOverlayInViewport"
              class="sim-second-modal-backdrop"
              @click.self="simStackedOverlayInViewport = false"
            >
              <div class="sim-second-modal-card">
                <h5>2nd Modal Backdrop (z-index: 260)</h5>
                <p>
                  {{ currentLang === 'pl'
                    ? 'Ponieważ otwarty NanoSelect został zamontowany w bezpiecznym przodku bieżącej warstwy (Opcja 2), a nie naiwnie w document.body z gigantycznym z-indexem (Opcja 1), nowy modal z backdropem prawidłowo go przykrywa!'
                    : 'Because the open NanoSelect mounted inside its layer container (Option 2) rather than naively on document.body with an extreme z-index (Option 1), this newer modal backdrop properly covers it!' }}
                </p>
                <button
                  type="button"
                  class="nano-btn nano-btn-primary nano-btn-sm"
                  @click="simStackedOverlayInViewport = false"
                >
                  {{ currentLang === 'pl' ? 'Zamknij 2. Modal' : 'Dismiss 2nd Modal' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CASE B & CASE C: Two-Column Browser Screen Simulators -->
      <div class="sim-dual-grid">
        <!-- CASE B: Select near bottom of visible screen -> flips upward ('top') -->
        <div class="sim-card">
          <div class="sim-card-header">
            <div>
              <span class="sim-badge sim-badge-emerald">CASE 2 • PLACEMENT: TOP</span>
              <h4 class="sim-card-title">
                {{ currentLang === 'pl'
                  ? 'Select przy dolnej krawędzi ekranu (Flip na górę)'
                  : 'Select Near Bottom Screen Edge (Auto-Flip Upward)' }}
              </h4>
              <p class="sim-card-sub">
                {{ currentLang === 'pl'
                  ? 'Gdy poniżej brakuje miejsca na widocznym ekranie, a powyżej jest wolna przestrzeń, lista otwiera się nad kontrolką.'
                  : 'When space below on the visible screen is insufficient and there is room above, the dropdown automatically flips upward.' }}
              </p>
            </div>
          </div>

          <div class="browser-frame">
            <div class="browser-chrome">
              <div class="browser-dots">
                <span class="b-dot is-red" />
                <span class="b-dot is-amber" />
                <span class="b-dot is-green" />
              </div>
              <div class="browser-url">Bottom-Edge Screen (height: 330px)</div>
              <div class="browser-telemetry">
                <code>placement: {{ bottomSelectRef?.dropdownLayout?.placement || 'top' }}</code>
              </div>
            </div>

            <div class="browser-viewport sim-bottom-viewport" style="height: 330px;" data-nano-viewport>
              <div class="sim-screen-watermark">
                <span>Visible Screen Area Above Trigger ({{ bottomSelectRef?.dropdownLayout?.spaceAbove ?? 238 }}px free)</span>
              </div>

              <div class="sim-bottom-dock">
                <div style="flex: 1; max-width: 340px;">
                  <span class="sim-field-label">Edge Cluster Region (Near Screen Bottom)</span>
                  <NanoSelect
                    ref="bottomSelectRef"
                    v-model="simBottomEdgeValue"
                    :options="regionOptions"
                    :searchable="true"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- CASE C: Tight vertical screen -> opens simultaneously above AND below ('overlap') clamped to screen height -->
        <div class="sim-card">
          <div class="sim-card-header">
            <div>
              <span class="sim-badge sim-badge-amber">CASE 3 • PLACEMENT: OVERLAP (GÓRA + DÓŁ)</span>
              <h4 class="sim-card-title">
                {{ currentLang === 'pl'
                  ? 'Niski ekran: Jednocześnie na górze i na dole + Clamping wysokości'
                  : 'Low Screen: Simultaneous Top & Bottom Overlap + Screen Height Clamp' }}
              </h4>
              <p class="sim-card-sub">
                {{ currentLang === 'pl'
                  ? 'Gdy ani na dole, ani na górze nie ma pełnej wysokości, select rozwija się jednocześnie w górę i w dół, clampując max-height do rozmiaru ekranu.'
                  : 'When neither side alone fits the menu, the select expands simultaneously above and below the trigger, clamping its height to the visible screen.' }}
              </p>
            </div>
          </div>

          <div class="sim-slider-bar">
            <span>{{ currentLang === 'pl' ? 'Wysokość ekranu:' : 'Screen Height:' }}</span>
            <input
              id="select-sim-viewport-height"
              name="select-sim-viewport-height"
              aria-label="Screen height"
              v-model.number="simTightViewportHeight"
              type="range"
              min="170"
              max="360"
              step="10"
              @input="overlapSelectRef?.updateDropdownPosition?.(true)"
            />
            <code>{{ simTightViewportHeight }}px</code>
            <span style="margin-left: 6px; color: var(--nano-text-muted);">Margin:</span>
            <div class="nano-btn-group">
              <button
                v-for="m in [8, 16, 24, 32]"
                :key="m"
                type="button"
                class="nano-btn nano-btn-secondary nano-btn-sm"
                :class="{ 'nano-btn-active': simViewportMargin === m }"
                @click="simViewportMargin = m"
              >
                {{ m }}px
              </button>
            </div>
          </div>

          <div class="browser-frame">
            <div class="browser-chrome">
              <div class="browser-dots">
                <span class="b-dot is-red" />
                <span class="b-dot is-amber" />
                <span class="b-dot is-green" />
              </div>
              <div class="browser-url">Tight Screen ({{ simTightViewportHeight }}px)</div>
              <div class="browser-telemetry">
                <code>{{ overlapSelectRef?.dropdownLayout?.placement || 'overlap' }}</code>
                <code>top: {{ overlapSelectRef?.dropdownLayout?.topMarginPx ?? simViewportMargin }}px === bottom: {{ overlapSelectRef?.dropdownLayout?.bottomMarginPx ?? simViewportMargin }}px</code>
              </div>
            </div>

            <div
              class="browser-viewport sim-overlap-viewport"
              :style="{ height: `${simTightViewportHeight}px` }"
              data-nano-viewport
            >
              <div style="width: 100%; max-width: 350px;">
                <span class="sim-field-label">
                  {{ currentLang === 'pl'
                    ? 'Kliknij — wykorzysta maks. wysokość ekranu z równym marginesem góra=dół:'
                    : 'Click — uses max screen height with equal top=bottom margin:' }}
                </span>
                <NanoSelect
                  ref="overlapSelectRef"
                  v-model="simOverlapValue"
                  :options="techOptions"
                  :searchable="true"
                  :viewport-margin="simViewportMargin"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CASE D: Scrollable container that ALREADY has scroll content below (no scrollbar inflation) -->
      <div class="sim-card">
        <div class="sim-card-header">
          <div>
            <span class="sim-badge sim-badge-cyan">CASE 4 • SCROLL CONTAINER WITHOUT SCROLLBAR INFLATION</span>
            <h4 class="sim-card-title">
              {{ currentLang === 'pl'
                ? 'Kontener ze scrollem posiadający już dalszą treść poniżej (Brak powiększenia scrollbara + Screen Clamp)'
                : 'Scrollable Container With Existing Content Below (Zero Scrollbar Inflation + Screen Clamp)' }}
            </h4>
            <p class="sim-card-sub">
              {{ currentLang === 'pl'
                ? 'Jeśli otwarcie selecta nie powiększa scrollbara danego elementu (bo kontener ma już dłuższą treść pod spodem), select może otworzyć się na dole wewnątrz scrolla użytkownika, ale jego wysokość nadal jest ograniczona do widocznego ekranu.'
                : 'When opening the select does not inflate the container scrollbar (because scrollable content already exists below), it renders downward inside the scroll container while clamping height to the visible screen.' }}
            </p>
          </div>
        </div>

        <div class="browser-frame">
          <div class="browser-chrome">
            <div class="browser-dots">
              <span class="b-dot is-red" />
              <span class="b-dot is-amber" />
              <span class="b-dot is-green" />
            </div>
            <div class="browser-url">Scrollable Page Container (scrollHeight: 640px unchanged on open)</div>
            <div class="browser-telemetry">
              <code>placement: {{ scrollFlowSelectRef?.dropdownLayout?.placement || 'bottom' }}</code>
              <code>escapedScrollers: {{ scrollFlowSelectRef?.dropdownLayout?.escapedScrollers ?? 0 }}</code>
            </div>
          </div>

          <div class="browser-viewport" style="height: 310px;" data-nano-viewport>
            <div class="sim-long-scroll-container nano-scrollbar" data-nano-keep-in-scroller>
              <div class="sim-scroll-section">
                <strong>Section 1 — Runtime Pipeline</strong>
                <p>Scroll down or open the select below. Because this container already has 640px of scrollable content below, opening the select does NOT expand <code>scrollHeight</code>.</p>
                <div style="max-width: 380px;">
                  <NanoSelect
                    ref="scrollFlowSelectRef"
                    v-model="simScrollFlowValue"
                    :options="techOptions"
                    :searchable="true"
                  />
                </div>
              </div>

              <div class="sim-scroll-section">
                <strong>Section 2 — Existing Scrollable Content Below</strong>
                <p>Telemetry buffer #1 — existing page content below the select control.</p>
              </div>
              <div class="sim-scroll-section">
                <strong>Section 3 — Telemetry Archive</strong>
                <p>Telemetry buffer #2 — scrolling the container keeps the select anchored while clamping height to the screen.</p>
              </div>
              <div class="sim-scroll-section">
                <strong>Section 4 — Footer Diagnostics</strong>
                <p>End of scrollable document flow.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <NanoCodeBlock :tabs="codeTabs" />
  </div>
</template>

<style scoped>
.select-sandbox-grid {
  display: grid;
  grid-template-columns: 1fr 310px;
  gap: 20px;
  align-items: start;
}

@media (max-width: 860px) {
  .select-sandbox-grid {
    grid-template-columns: 1fr;
  }
}

.select-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 24px;
  min-height: 290px;
  padding: 36px 24px;
  border-radius: 10px;
  background: var(--nano-bg-app);
  border: 1px dashed var(--nano-border-card);
}

.readout-pill {
  padding: 6px 12px;
  border-radius: 6px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-card);
  font-size: 0.78rem;
}

.select-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-card);
}

.toggle-row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 0.84rem;
  cursor: pointer;
}

.ctrl-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.ctrl-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--nano-text-muted);
}

/* Browser Screen Simulator Styles */
.sim-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 12px;
  background: var(--nano-bg-muted, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.1));
  margin-bottom: 20px;
}

.sim-card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.sim-card-title {
  margin: 6px 0 4px;
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--nano-text-main);
}

.sim-card-sub {
  margin: 0;
  font-size: 0.82rem;
  color: var(--nano-text-muted);
  max-width: 760px;
  line-height: 1.45;
}

.sim-header-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.sim-toggle-pill {
  padding: 6px 12px;
  border-radius: 8px;
  background: var(--nano-bg-app);
  border: 1px solid var(--nano-border-card);
  font-weight: 600;
  font-size: 0.8rem;
}

.sim-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 5px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  font-family: var(--nano-font-mono, monospace);
}

.sim-badge-indigo {
  background: rgba(99, 102, 241, 0.18);
  color: #818cf8;
  border: 1px solid rgba(99, 102, 241, 0.35);
}

.sim-badge-emerald {
  background: rgba(16, 185, 129, 0.16);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.sim-badge-amber {
  background: rgba(245, 158, 11, 0.16);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.35);
}

.sim-badge-cyan {
  background: rgba(56, 189, 248, 0.16);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.35);
}

.sim-dual-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

@media (max-width: 980px) {
  .sim-dual-grid {
    grid-template-columns: 1fr;
  }
}

.sim-slider-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--nano-bg-app);
  border: 1px solid var(--nano-border-card);
  font-size: 0.8rem;
}

.sim-slider-bar input[type="range"] {
  flex: 1;
  accent-color: var(--nano-accent-primary, #6366f1);
}

.browser-frame {
  border-radius: 10px;
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.16));
  background: #090d16;
  overflow: hidden;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
}

.browser-chrome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  background: #111827;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.74rem;
}

.browser-dots {
  display: inline-flex;
  gap: 6px;
}

.b-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.b-dot.is-red { background: #ef4444; }
.b-dot.is-amber { background: #f59e0b; }
.b-dot.is-green { background: #10b981; }

.browser-url {
  color: #94a3b8;
  font-family: var(--nano-font-mono, monospace);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.browser-telemetry {
  display: inline-flex;
  gap: 8px;
  flex-shrink: 0;
}

.browser-telemetry code {
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(99, 102, 241, 0.16);
  color: #a5b4fc;
  font-size: 0.7rem;
}

.browser-viewport {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.1), rgba(9, 13, 22, 0.98) 75%);
  box-sizing: border-box;
}

.sim-modal-backdrop {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
}

.sim-modal-window {
  background: #12131a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65);
  display: flex;
  flex-direction: column;
  max-height: 280px;
  overflow: hidden;
}

.sim-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
}

.sim-modal-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: #f8fafc;
}

.sim-modal-tag {
  font-size: 0.68rem;
  font-family: var(--nano-font-mono, monospace);
  color: #94a3b8;
}

.sim-modal-body {
  padding: 14px 18px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sim-setting-Placeholder {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 0.78rem;
  color: #cbd5e1;
}

.sim-setting-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sim-status-ok {
  font-size: 0.68rem;
  font-weight: 700;
  color: #4ade80;
}

.sim-commit-grid {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 12px;
  align-items: end;
}

.sim-field-label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.76rem;
  font-weight: 700;
  color: #94a3b8;
}

.sim-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 11px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: #161821;
  flex-shrink: 0;
}

.sim-btn {
  padding: 7px 14px;
  border-radius: 7px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.sim-btn-ghost {
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
}

.sim-btn-save {
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  border-color: #6366f1;
  color: #ffffff;
}

.sim-second-modal-backdrop {
  position: absolute;
  inset: 0;
  z-index: 260;
  background: rgba(9, 13, 22, 0.76);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.sim-second-modal-card {
  max-width: 390px;
  padding: 18px 20px;
  border-radius: 12px;
  background: #1e293b;
  border: 1px solid #6366f1;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65);
  color: #f8fafc;
}

.sim-second-modal-card h5 {
  margin: 0 0 8px;
  font-size: 0.95rem;
}

.sim-second-modal-card p {
  margin: 0 0 14px;
  font-size: 0.8rem;
  line-height: 1.45;
  color: #cbd5e1;
}

.sim-bottom-viewport {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px;
}

.sim-screen-watermark {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  margin-bottom: 12px;
  color: #64748b;
  font-size: 0.78rem;
}

.sim-bottom-dock {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 9px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.sim-overlap-viewport {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.sim-long-scroll-container {
  height: 100%;
  overflow-y: auto;
  padding: 16px 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.sim-scroll-section {
  padding: 14px 16px;
  border-radius: 9px;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  font-size: 0.82rem;
}

.sim-scroll-section p {
  margin: 6px 0 12px;
  color: #94a3b8;
  font-size: 0.78rem;
}
</style>
