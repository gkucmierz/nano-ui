<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import NanoCollapsible from '../../components/NanoCollapsible.vue';
import NanoFitText from '../../components/NanoFitText.vue';
import NanoSlider from '../../components/NanoSlider.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { scrollElementToBoundedCenter } from '../../utils/boundedCenterScroll.js';
import { useCoupledSelection } from '../../utils/coupledSelection.js';
import { computeMonospaceFittedFontSize, fitTextDirective as vFitText } from '../../utils/fitText.js';
import { scrollPersistDirective as vScrollPersist } from '../../utils/scrollPersist.js';
import { getGlobalKeyController, stepWrappedIndex } from '../../utils/key-controller.js';
import { createDocTabs } from '../docSnippets.js';

// Active keyboard navigation zone ('cshr' | 'bounded-pills' | 'bounded-list')
const activeKeyZone = ref('cshr');

// 1. v-fit-text & naturalSearch demo
const fitContainerWidth = ref(340);
const fitSampleText = ref('E = mc² · ∮ B·dl = μ₀I · Φ = (1+√5)/2 ≈ 1.6180339887');
const actualFittedFontPx = ref(null);
const computedMonoFontSize = () =>
  actualFittedFontPx.value ??
  computeMonospaceFittedFontSize(fitSampleText.value, {
    maxWidth: Math.max(24, fitContainerWidth.value - 38),
    maxFontSize: 24,
    minFontSize: 0.5,
    step: 0.05,
  });

// 2. v-scroll-persist & scrollElementToBoundedCenter demo
const BOUNDED_PRESET_INDICES = [1, 4, 7, 10, 14, 18];
const showPersistedList = ref(true);
const boundedListRef = ref(null);
const activeBoundedIdx = ref(7);
const boundedItems = Array.from({ length: 18 }, (_, i) => ({
  id: i + 1,
  label: `Węzeł Telemetrii #${String(i + 1).padStart(2, '0')} — Bounded Center [0..maxScroll]`,
}));

function jumpToBoundedItem(idx, zone = null) {
  if (zone) {
    activeKeyZone.value = zone;
  }
  activeBoundedIdx.value = idx;
  const container = boundedListRef.value;
  if (!container) return;
  const targetEl = container.querySelector(`[data-item-idx="${idx}"]`);
  if (targetEl) {
    scrollElementToBoundedCenter(container, targetEl, {
      axis: 'y',
      durationMs: 280,
    });
  }
}

function stepBoundedPresets(delta) {
  activeKeyZone.value = 'bounded-pills';
  const curIdx = BOUNDED_PRESET_INDICES.indexOf(activeBoundedIdx.value);
  let nextPresetPos;
  if (curIdx !== -1) {
    nextPresetPos = stepWrappedIndex(curIdx, delta, BOUNDED_PRESET_INDICES.length);
  } else if (delta >= 0) {
    const found = BOUNDED_PRESET_INDICES.findIndex((v) => v > activeBoundedIdx.value);
    nextPresetPos = found !== -1 ? found : 0;
  } else {
    let found = -1;
    for (let i = BOUNDED_PRESET_INDICES.length - 1; i >= 0; i--) {
      if (BOUNDED_PRESET_INDICES[i] < activeBoundedIdx.value) {
        found = i;
        break;
      }
    }
    nextPresetPos = found !== -1 ? found : BOUNDED_PRESET_INDICES.length - 1;
  }
  jumpToBoundedItem(BOUNDED_PRESET_INDICES[nextPresetPos], 'bounded-pills');
}

function stepBoundedAllItems(delta) {
  const zeroBased = stepWrappedIndex(activeBoundedIdx.value - 1, delta, boundedItems.length);
  jumpToBoundedItem(zeroBased + 1, 'bounded-list');
}

// 3. Coupled Selection & Hover-Suppress-Rearm (CSHR) + Tri-State Border demo
const cshrNodes = [
  { id: 'alpha', title: 'Alpha Core', metric: '99.4%', desc: 'Primary SSoT Engine' },
  { id: 'beta', title: 'Beta Mesh', metric: '14.2 ms', desc: 'Zero-Latency Relay' },
  { id: 'gamma', title: 'Gamma Vault', metric: '512 B', desc: 'RAM Secret Buffer' },
  { id: 'delta', title: 'Delta Orbit', metric: '60 FPS', desc: 'C¹ Hermite Spline' },
];

const {
  selectedId,
  hoveredId,
  effectiveActiveId,
  stepSelection,
  bindCoupledItem,
  triStateClasses,
} = useCoupledSelection({
  items: cshrNodes,
  initialSelectedId: 'alpha',
  keyboardNavigation: false,
});

function handleArrowStep(delta) {
  if (activeKeyZone.value === 'bounded-pills') {
    stepBoundedPresets(delta);
  } else if (activeKeyZone.value === 'bounded-list') {
    stepBoundedAllItems(delta);
  } else {
    activeKeyZone.value = 'cshr';
    stepSelection(delta);
  }
}

let offKeyBindings = null;
onMounted(() => {
  const keys = getGlobalKeyController();
  offKeyBindings = keys.bindAll(
    {
      ArrowLeft: () => handleArrowStep(-1),
      ArrowRight: () => handleArrowStep(1),
      'Shift+ArrowLeft': () => stepBoundedAllItems(-1),
      'Shift+ArrowRight': () => stepBoundedAllItems(1),
    },
    { allowRepeat: true }
  );
});

onBeforeUnmount(() => {
  if (typeof offKeyBindings === 'function') {
    offKeyBindings();
    offKeyBindings = null;
  }
});

// 4. NanoCollapsible + v-fill-height demo
const collapsibleOpenA = ref(true);
const collapsibleOpenB = ref(false);

const codeTabs = createDocTabs({
  componentName: 'NanoCollapsible',
  stateRef: 'isOpen',
  initialValue: 'true',
  templateAttrs: [
    'v-model="isOpen"',
    'title="Zaawansowana Telemetria Układu"',
    'badge="4 moduły"',
    'storage-key="demo_collapsible_panel"',
  ],
  apiSections: [
    {
      title: 'Built-in Layout Directives',
      items: [
        'v-fill-height="{ bottomOffset: 16, minHeight: 160 }" — Stretches scrollable container to viewport or NanoModal bottom boundary',
        'v-fit-text="{ minSize: 11, maxSize: 24 }" — Binary-search (naturalSearch) font auto-fitting inside fixed containers',
        'v-scroll-persist="\'unique-panel-key\'" — Preserves & restores scrollTop/scrollLeft across v-if tab switches',
      ],
    },
    {
      title: 'Headless Engines & Composables',
      items: [
        'scrollElementToBoundedCenter(containerEl, itemEl, { axis: "y" | "x" | "both", durationMs: 280 })',
        'useCoupledSelection({ items, initialSelectedId, rearmMoveThresholdPx: 3 }) — CSHR + built-in ArrowLeft/ArrowRight key-controller cycling',
        'NanoCollapsible (NanoAccordion) — Collapsible card with #summary-collapsed slot, badge, and localStorage persistence',
      ],
    },
  ],
});
</script>

<template>
  <div class="doc-page">
    <div class="header-section">
      <h2>Dyrektywy Układu, CSHR &amp; NanoCollapsible</h2>
      <p class="desc">
        Zestaw wbudowanych w <code>@gkucmierz/nano-ui</code> dyrektyw geometrycznych (<code>v-fit-text</code>, <code>v-fill-height</code>, <code>v-scroll-persist</code>), maszyny stanów sprzężonej selekcji <code>useCoupledSelection</code> (CSHR + <code>.nano-tri-border-card</code>), kinetycznego centrowania <code>scrollElementToBoundedCenter</code> oraz zwijanych sekcji <code>&lt;NanoCollapsible&gt;</code>.
      </p>
    </div>

    <div class="demo-section">
      <!-- 1. NanoCollapsible Showcase -->
      <div class="ld-card">
        <h3 class="controls-title">
          1. Zwijane Sekcje <code>&lt;NanoCollapsible&gt;</code> (z podglądem <code>#summary-collapsed</code>)
        </h3>
        <p class="desc-sm">
          Kliknij nagłówek sekcji, aby ją zwinąć — w stanie zwiniętym pojawia się kompaktowa pigułka podsumowania (slot <code>#summary-collapsed</code>).
        </p>

        <div class="ld-stack">
          <NanoCollapsible
            v-model="collapsibleOpenA"
            title="Klaster Węzłów Obliczeniowych (Region EU-Central)"
            subtitle="Aktywna telemetria"
            badge="3 online"
          >
            <template #summary-collapsed>
              <span class="ld-summary-chip">CPU: 18% · RAM: 4.2 GB · 0 błędów</span>
            </template>
            <div class="ld-collapsible-content">
              Wszystkie 3 węzły wykonawcze pracują w trybie pełnej izolacji. Kliknij pasek nagłówka powyżej, aby zobaczyć skrócone podsumowanie <code>#summary-collapsed</code>.
            </div>
          </NanoCollapsible>

          <NanoCollapsible
            v-model="collapsibleOpenB"
            title="Zasady Bezpieczeństwa i Limity Pamięci (Compact)"
            badge="OPSEC"
            compact
          >
            <template #summary-collapsed>
              <span class="ld-summary-chip">Fail-Closed · Zero-Leaks</span>
            </template>
            <div class="ld-collapsible-content">
              Tryb <code>compact</code> zmniejsza wysokość paska nagłówka do <code>34px</code>, idealnie pasując do bocznych inspektorów i drzew nawigacji.
            </div>
          </NanoCollapsible>
        </div>
      </div>

      <!-- 2. Coupled Selection & Hover-Suppress-Rearm (CSHR) -->
      <div
        class="ld-card"
        @mouseenter="activeKeyZone = 'cshr'"
        @click="activeKeyZone = 'cshr'"
      >
        <div class="ld-row-between">
          <div>
            <h3 class="controls-title">
              2. Sprzężona Selekcja <code>useCoupledSelection</code> (CSHR) &amp; <code>.nano-tri-border-card</code>
            </h3>
            <p class="desc-sm">
              1. kliknięcie blokuje wybór (złota ramka), a strzałki <code>←</code> / <code>→</code> (<code>@gkucmierz/key-controller</code>) przechodzą cyklicznie po liście/gridzie. 2. kliknięcie w ten sam element natychmiast go odznacza i tłumi hover dopóki nie poruszysz kursorem o <code>&ge; 3px</code>.
            </p>
          </div>
          <span
            class="cshr-status-badge"
            :class="{ 'is-key-active': activeKeyZone === 'cshr' }"
          >
            ⌨️ <strong>[←/→]</strong> {{ activeKeyZone === 'cshr' ? 'aktywne' : 'najedź aby aktywować' }}
          </span>
        </div>

        <div class="cshr-pills-row">
          <button
            v-for="node in cshrNodes"
            :key="`pill-${node.id}`"
            type="button"
            class="cshr-pill"
            :class="{
              'is-selected': selectedId === node.id,
              'is-hovered': hoveredId === node.id && selectedId !== node.id,
            }"
            v-bind="bindCoupledItem(node.id)"
          >
            {{ node.title }} ({{ node.metric }})
          </button>
          <span class="cshr-status-badge">
            selected: <strong>{{ selectedId || 'null' }}</strong> · hovered: <strong>{{ hoveredId || 'null' }}</strong> · effective: <strong>{{ effectiveActiveId || 'null' }}</strong>
          </span>
        </div>

        <div class="cshr-grid">
          <div
            v-for="node in cshrNodes"
            :key="`card-${node.id}`"
            class="cshr-card"
            :class="triStateClasses(node.id)"
            v-bind="bindCoupledItem(node.id)"
          >
            <div class="cshr-card-top">
              <strong>{{ node.title }}</strong>
              <span class="cshr-metric">{{ node.metric }}</span>
            </div>
            <div class="cshr-desc">{{ node.desc }}</div>
          </div>
        </div>
      </div>

      <!-- 3. v-fit-text & naturalSearch -->
      <div class="ld-card">
        <div class="ld-row-between">
          <div>
            <h3 class="controls-title">
              3. Automatyczne Dopasowanie Czcionki (<code>v-fit-text</code> &amp; <code>naturalSearch</code>)
            </h3>
            <p class="desc-sm">
              Zmieniaj szerokość kontenera lub tekst — bisekcja <code>naturalSearch</code> dobiera maksymalny rozmiar czcionki mieszczący się w jednej linii bez ucinania.
            </p>
          </div>
          <span class="cshr-status-badge">
            Szerokość: <strong>{{ fitContainerWidth }}px</strong> · Font: <strong>{{ computedMonoFontSize() }}px</strong>
          </span>
        </div>

        <NanoSlider
          v-model="fitContainerWidth"
          :min="180"
          :max="640"
          :step="10"
          size="sm"
          aria-label="Szerokość kontenera v-fit-text"
        />

        <input
          id="fit-sample-text-input"
          v-model="fitSampleText"
          name="fit-sample-text"
          type="text"
          class="ld-input"
          placeholder="Wpisz dowolny wzór lub długi tytuł..."
        />

        <div
          class="fit-stage-box"
          :style="{ width: `${fitContainerWidth}px`, maxWidth: '100%' }"
        >
          <NanoFitText
            tag="div"
            :min-size="0.5"
            :max-size="24"
            :step="0.05"
            mode="single-line"
            class="fit-stage-text"
            @fit="(px) => (actualFittedFontPx = px)"
          >
            {{ fitSampleText }}
          </NanoFitText>
        </div>
      </div>

      <!-- 4. v-scroll-persist & scrollElementToBoundedCenter -->
      <div
        class="ld-card"
        @mouseenter="activeKeyZone === 'cshr' && (activeKeyZone = 'bounded-pills')"
      >
        <div class="ld-row-between">
          <div>
            <h3 class="controls-title">
              4. Kinetyczne Centrowanie <code>scrollElementToBoundedCenter</code> &amp; <code>v-scroll-persist</code>
            </h3>
            <p class="desc-sm">
              Kliknij dowolny numer węzła lub użyj strzałek <code>←</code> / <code>→</code> (oraz <code>Shift+←/→</code> dla kroku co 1 węzeł), aby płynnie wycentrować go w granicach <code>[0, maxScroll]</code>.
            </p>
          </div>
          <div class="cshr-pills-row">
            <span
              class="cshr-status-badge"
              :class="{ 'is-key-active': activeKeyZone === 'bounded-pills' || activeKeyZone === 'bounded-list' }"
            >
              ⌨️ <strong>[←/→]</strong> {{ activeKeyZone === 'bounded-list' ? 'wiersze #01..#18' : activeKeyZone === 'bounded-pills' ? 'presety #01..#18' : 'najedź aby aktywować' }}
            </span>
            <label class="ld-switch-label">
              <NanoSwitch v-model="showPersistedList" size="sm" />
              <span>Panel zamontowany (<code>v-if</code>)</span>
            </label>
          </div>
        </div>

        <div
          class="cshr-pills-row"
          @mouseenter="activeKeyZone = 'bounded-pills'"
        >
          <button
            v-for="idx in BOUNDED_PRESET_INDICES"
            :key="`jump-${idx}`"
            type="button"
            class="cshr-pill"
            :class="{ 'is-selected': activeBoundedIdx === idx }"
            @click="jumpToBoundedItem(idx, 'bounded-pills')"
          >
            🎯 Centruj #{{ String(idx).padStart(2, '0') }}
          </button>
        </div>

        <div
          v-if="showPersistedList"
          ref="boundedListRef"
          v-scroll-persist="'playground-demo-bounded-scroll'"
          class="bounded-scroll-box"
          @mouseenter="activeKeyZone = 'bounded-list'"
        >
          <div
            v-for="item in boundedItems"
            :key="item.id"
            :data-item-idx="item.id"
            class="bounded-scroll-item"
            :class="{ active: activeBoundedIdx === item.id }"
            @click="jumpToBoundedItem(item.id, 'bounded-list')"
          >
            <span>{{ item.label }}</span>
            <small>#{{ item.id }}</small>
          </div>
        </div>
      </div>
    </div>

    <NanoCodeBlock :tabs="codeTabs" />
  </div>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: var(--nano-space-lg, 24px);
  max-width: 920px;
}

.header-section h2 {
  margin: 0 0 6px 0;
  color: var(--nano-text-main);
  font-size: 1.5rem;
  font-weight: 700;
}

.desc {
  color: var(--nano-text-muted);
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.55;
}

.desc-sm {
  color: var(--nano-text-muted);
  margin: 4px 0 0 0;
  font-size: 0.84rem;
}

.demo-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.ld-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 22px;
  border-radius: var(--nano-radius-lg, 12px);
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-card);
}

.controls-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--nano-text-main);
}

.ld-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ld-summary-chip {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--nano-status-success-text, #10b981);
  background: var(--nano-status-success-bg, rgba(16, 185, 129, 0.14));
  border: 1px solid var(--nano-status-success-border, rgba(16, 185, 129, 0.35));
  padding: 2px 8px;
  border-radius: 999px;
}

.ld-collapsible-content {
  font-size: 0.86rem;
  color: var(--nano-text-secondary, var(--nano-text-muted));
  line-height: 1.5;
}

.cshr-pills-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.cshr-pill {
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-muted);
  color: var(--nano-text-main);
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}

.cshr-pill:hover {
  border-color: var(--nano-border-hover);
  background: var(--nano-bg-hover);
}

.cshr-pill.is-hovered {
  border-color: var(--nano-status-info, #38bdf8);
  background: var(--nano-status-info-bg, rgba(56, 189, 248, 0.14));
  color: var(--nano-status-info-text, #38bdf8);
}

.cshr-pill.is-selected {
  border-color: var(--nano-status-warn, #fbbf24);
  background: var(--nano-status-warn-bg, rgba(251, 191, 36, 0.16));
  color: var(--nano-status-warn-text, #fbbf24);
}

.cshr-status-badge {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--nano-status-info-bg, rgba(56, 189, 248, 0.12));
  border: 1px solid var(--nano-status-info-border, rgba(56, 189, 248, 0.3));
  color: var(--nano-status-info-text, var(--nano-text-muted));
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.cshr-status-badge.is-key-active {
  background: var(--nano-status-success-bg, rgba(16, 185, 129, 0.14));
  border-color: var(--nano-status-success-border, rgba(16, 185, 129, 0.38));
  color: var(--nano-status-success-text, #10b981);
}

.cshr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(185px, 1fr));
  gap: 12px;
}

.cshr-card {
  padding: 14px;
  border-radius: 10px;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-muted);
  color: var(--nano-text-main);
  cursor: pointer;
  user-select: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, background-color 0.15s ease;
}

.cshr-card.is-hovered {
  border-color: var(--nano-status-info, #38bdf8);
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.2);
}

.cshr-card.is-selected {
  border-color: var(--nano-status-warn, #fbbf24);
  box-shadow: 0 0 18px rgba(245, 158, 11, 0.22);
}

.cshr-card.is-hover-active {
  border-color: var(--nano-status-info, #38bdf8);
  box-shadow:
    0 0 0 1px var(--nano-status-warn, #fbbf24),
    0 0 22px rgba(56, 189, 248, 0.28);
}

.cshr-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.cshr-metric {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.78rem;
  color: var(--nano-status-info-text, #38bdf8);
  font-weight: 700;
}

.cshr-desc {
  font-size: 0.8rem;
  color: var(--nano-text-muted);
}

.ld-row-between {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.ld-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-muted);
  color: var(--nano-text-main);
  font-size: 0.86rem;
}

.fit-stage-box {
  box-sizing: border-box;
  padding: 14px 18px;
  border-radius: 10px;
  border: 1px dashed var(--nano-status-info, #38bdf8);
  background: var(--nano-status-info-bg, rgba(56, 189, 248, 0.08));
  overflow: hidden;
}

.fit-stage-text {
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
  color: var(--nano-text-main);
}

.ld-switch-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.84rem;
  color: var(--nano-text-main);
  cursor: pointer;
  user-select: none;
}

.bounded-scroll-box {
  max-height: 190px;
  overflow-y: auto;
  border-radius: 10px;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-muted);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bounded-scroll-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 7px;
  border: 1px solid var(--nano-border-subtle);
  background: var(--nano-bg-card);
  font-size: 0.82rem;
  color: var(--nano-text-main);
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.bounded-scroll-item:hover {
  border-color: var(--nano-border-hover);
}

.bounded-scroll-item.active {
  border-color: var(--nano-status-info, #38bdf8);
  background: var(--nano-status-info-bg, rgba(56, 189, 248, 0.16));
  color: var(--nano-status-info-text, var(--nano-text-main));
  font-weight: 700;
}
</style>
