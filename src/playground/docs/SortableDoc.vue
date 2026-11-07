<script setup>
import { ref, computed } from 'vue';
import NanoSortableList from '../../components/NanoSortableList.vue';
import NanoCheckbox from '../../components/NanoCheckbox.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoNumberStepper from '../../components/NanoNumberStepper.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { getScopedStorageController } from '../../utils/storage-controller.js';
import { currentLang } from '../../locales.js';

const sortableStorageCtrl = getScopedStorageController('nano-ui');
const storageMode = ref('ls');
const storageAppPrefix = ref('dashboard-app');
const storageKeyName = ref('sortable_demo');
const storageRevision = ref(0);

const inspectedSortableStorage = computed(() => {
  void storageRevision.value;
  return sortableStorageCtrl.inspect(storageKeyName.value, {
    mode: storageMode.value,
    appPrefix: storageAppPrefix.value,
  });
});

const handleOnlyMode = ref(false);
const sortableDisabled = ref(false);
const placeholderTheme = ref('#0ea5e9');
const lastReorderLog = ref('—');

const pipelineTracks = ref([
  {
    id: 'track-osc',
    namePl: 'Ścieżka #1 — Oscylator Sub-Bass (55 Hz)',
    nameEn: 'Track #1 — Sub-Bass Oscillator (55 Hz)',
    color: 'cyan',
    enabled: true,
    checked: true,
    gain: 0.85,
    badge: 'OSC',
  },
  {
    id: 'track-env',
    namePl: 'Ścieżka #2 — Obwiednia Perkusyjna (perc 2ms / 45ms)',
    nameEn: 'Track #2 — Percussive Envelope (perc 2ms / 45ms)',
    color: 'emerald',
    enabled: true,
    checked: true,
    gain: 1.0,
    badge: 'ENV',
  },
  {
    id: 'track-dsp',
    namePl: 'Ścieżka #3 — Filtr Dolnoprzepustowy SVF (2400 Hz)',
    nameEn: 'Track #3 — Low-Pass SVF Filter (2400 Hz)',
    color: 'purple',
    enabled: true,
    checked: false,
    gain: 0.72,
    badge: 'DSP',
  },
  {
    id: 'track-out',
    namePl: 'Ścieżka #4 — Limiter Wyjściowy & Master Bus',
    nameEn: 'Track #4 — Output Limiter & Master Bus',
    color: 'gold',
    enabled: false,
    checked: false,
    gain: 0.95,
    badge: 'OUT',
  },
]);

const macroGroups = ref([
  { id: 'grp-shortcuts', title: 'Shortcuts', count: 4, accent: '#0284c7', bg: 'rgba(14, 165, 233, 0.12)' },
  { id: 'grp-dev', title: 'Developer', count: 3, accent: '#059669', bg: 'rgba(16, 185, 129, 0.12)' },
  { id: 'grp-wrappers', title: 'LoL Wrappers', count: 5, accent: '#9333ea', bg: 'rgba(147, 51, 234, 0.12)' },
  { id: 'grp-endings', title: 'Macro Endings', count: 2, accent: '#d97706', bg: 'rgba(217, 119, 6, 0.12)' },
]);

const onTrackReorder = ({ fromIndex, toIndex, item }) => {
  const label = currentLang.value === 'pl' ? item.namePl : item.nameEn;
  lastReorderLog.value = `${label}: #${fromIndex + 1} → #${toIndex + 1}`;
  storageRevision.value++;
};

const isPl = computed(() => currentLang.value === 'pl');

const apiCode = `// Props (<NanoSortableList>)
modelValue:        Array            (default: [])
itemKey:           String|Function  (default: 'id')
direction:         String           (default: 'vertical') // 'vertical' | 'horizontal' | 'grid'
gap:               Number|String    (default: 10)
disabled:          Boolean          (default: false)
handleOnly:        Boolean          (default: false)       // false = grab anywhere on card background
handleSelector:    String           (default: '[data-drag-handle], .drag-handle')
ignoreSelector:    String           (default: DEFAULT_INTERACTIVE_IGNORE_SELECTOR)
placeholderColor:  String           (default: '#0ea5e9')
placeholderRadius: String           (default: '10px')
ghostScale:        Number           (default: 1.015)
ghostOpacity:      Number           (default: 0.88)
dragThreshold:     Number           (default: 3)          // px threshold before card lift
storage:           String|Boolean   (default: 'ls')       // 'ls' | 'ss' | 'none' | false (when storageKey is set)
appPrefix:         String           (default: '')         // auto-detected acronym e.g. 'DA'
storageKey:        String           (default: '')         // resolves to 'DA_NU_<storageKey>' ({ order: [...] })

// Events
@update:modelValue (nextItems: Array)
@reorder           ({ fromIndex, toIndex, item, items })
@drag-start        ({ index, item })
@drag-end          ({ fromIndex, toIndex, item })

// Scoped Slots (#default or #item)
{ item, index, isDragging, isGhost, moveUp, moveDown }`;

const usageCode = `<script setup>
import { ref } from 'vue';
import { NanoSortableList, NanoCheckbox, NanoNumberStepper } from '@gkucmierz/nano-ui';

const tracks = ref([
  { id: 't1', title: 'Oscillator #1', active: true, gain: 0.85 },
  { id: 't2', title: 'Envelope #2', active: true, gain: 1.0 },
  { id: 't3', title: 'SVF Filter #3', active: false, gain: 0.65 },
]);
<\/script>

<template>
  <!-- Grab anywhere on the card background; inputs/checkboxes stay interactive automatically -->
  <NanoSortableList
    v-model="tracks"
    item-key="id"
    :gap="10"
    storage="ls"
    app-prefix="dashboard-app"
    storage-key="tracks_order"
  >
    <template #item="{ item, index, moveUp, moveDown }">
      <div class="nano-card" style="padding: 12px 16px; display: flex; align-items: center; gap: 12px;">
        <span data-drag-handle style="cursor: grab; opacity: 0.6;">⠿ #{{ index + 1 }}</span>
        <NanoCheckbox v-model="item.active" color="cyan" :label="item.title" />
        <div style="margin-left: auto; display: flex; align-items: center; gap: 8px;">
          <NanoNumberStepper v-model="item.gain" :min="0" :max="2" :step="0.05" size="sm" />
          <button class="nano-btn nano-btn-xs" @click="moveUp">↑</button>
          <button class="nano-btn nano-btn-xs" @click="moveDown">↓</button>
        </div>
      </div>
    </template>
  </NanoSortableList>
</template>`;

const granularCode = `// Pure headless utilities exported from '@gkucmierz/nano-ui'
import {
  reorderArray,
  resolveSortableSlot,
  resolvePlaceholderBeforeIndex,
  DEFAULT_INTERACTIVE_IGNORE_SELECTOR,
} from '@gkucmierz/nano-ui';

const next = reorderArray(['A', 'B', 'C', 'D'], 0, 2); // ['B', 'C', 'A', 'D']`;

const codeTabs = computed(() => [
  { label: 'API Reference', code: apiCode, lang: 'javascript' },
  { label: 'Usage', code: usageCode, lang: 'html' },
  { label: 'Headless Utils', code: granularCode, lang: 'javascript' },
]);
</script>

<template>
  <div class="doc-page">
    <h2>{{ isPl ? 'Komponent NanoSortableList (Drag & Drop Kart)' : 'NanoSortableList Component (Whole-Card Drag & Reorder)' }}</h2>
    <p class="desc">
      {{
        isPl
          ? 'Uniwersalny kontener przeciągania i zmiany kolejności całych kart, wierszy oraz siatek (wzorowany na ergonomii Virtual Keyboard Extension). Pozwala chwycić kartę za dowolny punkt jej tła, tworzy pływający duplikat pod kursorem (Teleport do body) oraz rysuje przerywany placeholder w miejscu docelowego zrzutu, automatycznie przepuszczając kliknięcia w kontrolki wewnętrzne (NanoCheckbox, NanoSwitch, NanoNumberStepper, NanoSelect, input, button).'
          : 'Universal whole-card and grid drag-and-drop reordering container (modeled after Virtual Keyboard Extension ergonomics). Grab any card by its background surface to lift a floating ghost card (teleported to body) with a dashed drop-slot placeholder while automatically preserving click/focus on nested interactive controls (NanoCheckbox, NanoSwitch, NanoNumberStepper, NanoSelect, inputs, buttons).'
      }}
    </p>

    <!-- 1. Interactive Vertical Whole-Card Stack -->
    <div class="section-header-row">
      <h3 class="section-title">
        {{ isPl ? '1. Przeciąganie Całych Kart z Aktywnymi Kontrolkami (Vertical Stack)' : '1. Whole-Card Vertical Reordering with Nested Controls' }}
      </h3>
      <div class="header-toggles">
        <NanoCheckbox
          v-model="handleOnlyMode"
          color="cyan"
          :label="isPl ? 'Tylko za uchwyt (handleOnly)' : 'Handle Only (⠿)'"
        />
        <NanoCheckbox
          v-model="sortableDisabled"
          color="danger"
          :label="isPl ? 'Zablokuj (disabled)' : 'Disabled'"
        />
      </div>
    </div>

    <div class="sortable-showcase-card">
      <NanoSortableList
        v-model="pipelineTracks"
        item-key="id"
        :gap="10"
        :handle-only="handleOnlyMode"
        :disabled="sortableDisabled"
        :placeholder-color="placeholderTheme"
        :storage="storageMode"
        :app-prefix="storageAppPrefix"
        :storage-key="storageKeyName"
        @reorder="onTrackReorder"
      >
        <template #item="{ item, index, moveUp, moveDown }">
          <div class="sortable-track-card">
            <span class="drag-handle-pill" data-drag-handle>⠿ #{{ index + 1 }}</span>
            <span class="track-badge" :class="`badge-${item.color}`">{{ item.badge }}</span>
            <NanoCheckbox
              v-model="item.checked"
              :color="item.color"
              :label="isPl ? item.namePl : item.nameEn"
            />
            <div class="track-right-controls">
              <div class="stepper-wrap">
                <span class="gain-label">Gain:</span>
                <NanoNumberStepper
                  v-model="item.gain"
                  :min="0"
                  :max="2"
                  :step="0.05"
                  size="sm"
                  width="76px"
                />
              </div>
              <NanoSwitch v-model="item.enabled" size="sm" :color="item.color" />
              <div class="arrow-btns">
                <button
                  type="button"
                  class="arrow-btn"
                  :disabled="index === 0"
                  @click="moveUp"
                >↑</button>
                <button
                  type="button"
                  class="arrow-btn"
                  :disabled="index === pipelineTracks.length - 1"
                  @click="moveDown"
                >↓</button>
              </div>
            </div>
          </div>
        </template>
      </NanoSortableList>

      <div class="telemetry-bar">
        <span><strong>{{ isPl ? 'Kolejność ID:' : 'Current Order:' }}</strong> <code>{{ pipelineTracks.map(t => t.badge).join(' → ') }}</code></span>
        <span><strong>{{ isPl ? 'Ostatni ruch:' : 'Last Reorder:' }}</strong> <code>{{ lastReorderLog }}</code></span>
        <span>
          <strong>Storage (<code>@gkucmierz/storage-controller</code>):</strong>
          <button
            v-for="m in ['ls', 'ss', 'none']"
            :key="m"
            type="button"
            class="arrow-btn"
            style="width: auto; padding: 0 7px; margin-left: 4px; font-weight: 700;"
            :style="storageMode === m ? 'border-color: #38bdf8; color: #38bdf8;' : ''"
            @click="storageMode = m; storageRevision++;"
          >
            {{ m.toUpperCase() }}
          </button>
          <code
            v-tooltip="`from ${inspectedSortableStorage.verboseKey}`"
            style="margin-left: 6px; cursor: help;"
          >
            <span style="color: var(--nano-status-info-text); font-weight: 700;">{{ inspectedSortableStorage.displayAppSeg }}</span>_<span style="color: var(--nano-status-purple-text); font-weight: 700;">{{ inspectedSortableStorage.displayScopeSeg }}</span>_<span style="color: var(--nano-status-success-text); font-weight: 600;">{{ inspectedSortableStorage.rawKey }}</span>
            = {{ inspectedSortableStorage.rawValue || 'null' }}
          </code>
        </span>
      </div>
    </div>

    <!-- 2. Grid Mode (2D Card Dashboard) -->
    <h3 class="section-title">
      {{ isPl ? '2. Siatka 2D (direction="grid" — Dominujące Wspólne Pole Powierzchni 2D)' : '2. 2D Grid Sorting (direction="grid" — Dominant 2D Shared Surface Area)' }}
    </h3>
    <p class="desc">
      {{
        isPl
          ? 'W trybie direction="grid" algorytm resolveSortableSlot wyznacza docelowe gniazdo na podstawie dominującego wspólnego pola powierzchni 2D (computeSharedArea2D = Δx · Δy z algebry przedziałów mutualRange) pomiędzy unoszoną kartą a zamrożonymi gniazdami siatki, z fallbackiem do odległości euklidesowej 2D (hypot(dx, dy)).'
          : 'In direction="grid" mode, resolveSortableSlot determines the target slot by maximizing the 2D shared surface area (computeSharedArea2D = Δx · Δy via mutualRange interval algebra) between the floating ghost card and frozen grid slots, with 2D Euclidean distance (hypot(dx, dy)) as a fallback.'
      }}
    </p>

    <div class="sortable-showcase-card">
      <NanoSortableList
        v-model="macroGroups"
        item-key="id"
        direction="grid"
        :gap="12"
        placeholder-color="#6366f1"
        placeholder-radius="12px"
      >
        <template #item="{ item, index }">
          <div
            class="macro-group-card"
            :style="{
              '--grp-accent': item.accent,
              '--grp-bg': item.bg,
            }"
          >
            <div class="macro-group-header">
              <span class="macro-group-title">{{ item.title }}</span>
              <span class="macro-group-dot" :style="{ background: item.accent }" />
            </div>
            <div class="macro-group-pills">
              <span class="macro-pill">Slot #{{ index + 1 }}</span>
              <span class="macro-pill">{{ item.count }} macros</span>
            </div>
          </div>
        </template>
      </NanoSortableList>
    </div>

    <!-- API Reference & Usage Guide -->
    <NanoCodeBlock :tabs="codeTabs" />
  </div>
</template>

<style scoped>
.doc-page {
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.doc-page h2 {
  font-weight: 700;
  margin-bottom: 0.25rem;
  font-size: 1.8rem;
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 0.5rem;
}

.section-title {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-color, #f8fafc);
}

[data-theme="light"] .section-title,
.light .section-title {
  color: #0f172a;
}

.header-toggles {
  display: flex;
  align-items: center;
  gap: 16px;
}

.desc {
  color: #94a3b8;
  line-height: 1.6;
  margin: 0;
}

[data-theme="light"] .desc,
.light .desc {
  color: #475569;
}

.sortable-showcase-card {
  background: var(--sidebar-bg, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

[data-theme="light"] .sortable-showcase-card,
.light .sortable-showcase-card {
  background: #ffffff;
  border-color: #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.sortable-track-card {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 11px 14px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.22);
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.sortable-track-card:hover {
  border-color: rgba(56, 189, 248, 0.45);
}

[data-theme="light"] .sortable-track-card,
.light .sortable-track-card {
  background: #f8fafc;
  border-color: #cbd5e1;
}

[data-theme="light"] .sortable-track-card:hover,
.light .sortable-track-card:hover {
  background: #f1f5f9;
  border-color: #0284c7;
}

.drag-handle-pill {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.28);
  padding: 3px 8px;
  border-radius: 6px;
  cursor: grab;
  user-select: none;
}

[data-theme="light"] .drag-handle-pill,
.light .drag-handle-pill {
  color: #0284c7;
  background: rgba(2, 132, 199, 0.08);
  border-color: rgba(2, 132, 199, 0.25);
}

.track-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  letter-spacing: 0.05em;
}

.badge-cyan {
  background: rgba(6, 182, 212, 0.16);
  color: #22d3ee;
}
.badge-emerald {
  background: rgba(16, 185, 129, 0.16);
  color: #34d399;
}
.badge-purple {
  background: rgba(147, 51, 234, 0.16);
  color: #c084fc;
}
.badge-gold {
  background: rgba(217, 119, 6, 0.16);
  color: #fbbf24;
}

[data-theme="light"] .badge-cyan,
.light .badge-cyan { color: #0891b2; }
[data-theme="light"] .badge-emerald,
.light .badge-emerald { color: #059669; }
[data-theme="light"] .badge-purple,
.light .badge-purple { color: #7e22ce; }
[data-theme="light"] .badge-gold,
.light .badge-gold { color: #b45309; }

.track-right-controls {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

.stepper-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.gain-label {
  font-size: 11px;
  color: #94a3b8;
  font-family: 'JetBrains Mono', monospace;
}

[data-theme="light"] .gain-label,
.light .gain-label {
  color: #475569;
}

.arrow-btns {
  display: flex;
  gap: 4px;
}

.arrow-btn {
  width: 24px;
  height: 24px;
  border-radius: 5px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(15, 23, 42, 0.5);
  color: #cbd5e1;
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.arrow-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

[data-theme="light"] .arrow-btn,
.light .arrow-btn {
  background: #ffffff;
  border-color: #cbd5e1;
  color: #334155;
}

.telemetry-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px dashed rgba(148, 163, 184, 0.22);
  font-size: 12px;
  color: #94a3b8;
}

[data-theme="light"] .telemetry-bar,
.light .telemetry-bar {
  color: #475569;
  border-top-color: #e2e8f0;
}

.macro-group-card {
  width: 220px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--grp-bg);
  border: 1.5px solid var(--grp-accent);
  display: flex;
  flex-direction: column;
  gap: 10px;
  user-select: none;
}

.macro-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.macro-group-title {
  font-weight: 700;
  font-size: 13px;
  color: var(--text-color, #f8fafc);
}

[data-theme="light"] .macro-group-title,
.light .macro-group-title {
  color: #0f172a;
}

.macro-group-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
}

.macro-group-pills {
  display: flex;
  gap: 6px;
}

.macro-pill {
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.55);
  color: #e2e8f0;
}

[data-theme="light"] .macro-pill,
.light .macro-pill {
  background: rgba(255, 255, 255, 0.88);
  color: #1e293b;
  border: 1px solid rgba(15, 23, 42, 0.1);
}
</style>
