<script setup>
import { ref } from 'vue';
import NanoDatePicker from '../../components/NanoDatePicker.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { getTodayIso, addDaysToIso } from '../../utils/datepicker.js';
import { createDocTabs } from '../docSnippets.js';

const todayIso = getTodayIso();
const selectedDate = ref(todayIso);
const rangeStartDate = ref(todayIso);
const rangeEndDate = ref(addDaysToIso(todayIso, 90));
const smallDate = ref(todayIso);
const largeDate = ref(addDaysToIso(todayIso, 30));

const codeTabs = createDocTabs({
  componentName: 'NanoDatePicker',
  stateRef: 'selectedDate',
  initialValue: `'${todayIso}'`,
  templateAttrs: [
    'v-model="selectedDate"',
    'color="emerald"',
    'size="md"',
    'locale="pl"',
    ':show-presets="true"',
  ],
  apiSections: [
    {
      title: 'Props (NanoDatePicker / NanoCalendar)',
      items: [
        'modelValue: String (default: "", v-model) - Selected date in strict ISO 8601 YYYY-MM-DD format',
        'min: String (optional, default: "") - Lower bound ISO date YYYY-MM-DD',
        'max: String (optional, default: "") - Upper bound ISO date YYYY-MM-DD',
        'locale: String (default: "pl") - Calendar language ("pl" | "en") with Monday-first 42-cell grid',
        'color: String (default: "emerald") - Accent preset ("emerald" | "primary" | "cyan" | "amber" | "purple" | "crimson")',
        'size: String (default: "md") - Height preset ("sm" = 28px | "md" = 34px | "lg" = 40px)',
        'showPresets: Boolean (default: true) - Show quick action pills (Dziś / +30d / +90d / Wyczyść)',
        'disabled: Boolean (default: false) - Disable trigger and popover',
      ],
    },
    {
      title: 'Events',
      items: [
        '@update:modelValue: (iso: string) => void - Emitted immediately when a day or preset is selected',
        '@change: (iso: string) => void - Emitted when selection changes',
      ],
    },
  ],
});
</script>

<template>
  <div class="doc-page">
    <div class="doc-header">
      <div class="doc-badge-row">
        <span class="nano-badge nano-badge-primary">Component</span>
        <span class="nano-badge">ISO 8601 (YYYY-MM-DD)</span>
        <span class="nano-badge">Monday-First 42-Cell Grid</span>
      </div>
      <h2>NanoDatePicker &amp; NanoCalendar</h2>
      <p>
        Ergonomic, zero-dependency ISO 8601 calendar picker replacing native browser
        <code>&lt;input type="date"&gt;</code> controls with a Monday-first month grid, quick rotation presets
        (<code>Dziś</code>, <code>+30d</code>, <code>+90d</code>), and full Light/Dark theme reactivity.
      </p>
    </div>

    <div class="demo-section">
      <h3>1. Interactive Calendar Picker &amp; Bounded Date Range</h3>
      <p class="demo-desc">
        Each control binds an independent ISO <code>YYYY-MM-DD</code> string ref and supports optional
        <code>:min</code> / <code>:max</code> boundaries.
      </p>

      <div class="picker-grid">
        <div class="picker-card">
          <div class="picker-head">
            <span class="picker-label">Standard Calendar (Emerald)</span>
            <span class="picker-val mono">{{ selectedDate || '—' }}</span>
          </div>
          <NanoDatePicker v-model="selectedDate" color="emerald" locale="pl" />
        </div>

        <div class="picker-card">
          <div class="picker-head">
            <span class="picker-label">Bounded Window [Start .. +90d]</span>
            <span class="picker-val mono">{{ rangeStartDate }} → {{ rangeEndDate }}</span>
          </div>
          <div class="picker-row">
            <NanoDatePicker v-model="rangeStartDate" :max="rangeEndDate" color="primary" locale="pl" />
            <NanoDatePicker v-model="rangeEndDate" :min="rangeStartDate" color="amber" locale="pl" />
          </div>
        </div>

        <div class="picker-card">
          <div class="picker-head">
            <span class="picker-label">Size Variants (sm / lg, EN locale)</span>
            <span class="picker-val mono">{{ smallDate }} | {{ largeDate }}</span>
          </div>
          <div class="picker-row">
            <NanoDatePicker v-model="smallDate" size="sm" color="cyan" locale="en" />
            <NanoDatePicker v-model="largeDate" size="lg" color="purple" locale="en" />
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
  gap: 2rem;
}

.doc-header {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.doc-badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.doc-page h2 {
  color: var(--nano-text-main);
  margin: 0;
}

.doc-header p {
  color: var(--nano-text-muted);
  margin: 0;
  line-height: 1.6;
}

.demo-section {
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-card);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--nano-shadow-card);
}

.demo-section h3 {
  color: var(--nano-text-main);
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.demo-desc {
  color: var(--nano-text-muted);
  margin-top: 0;
  margin-bottom: 1.25rem;
  line-height: 1.5;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
}

.picker-card {
  background: var(--nano-bg-card-elevated);
  border: 1px solid var(--nano-border-card);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.picker-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.picker-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--nano-text-main);
}

.picker-val {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 6px;
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-card);
  color: var(--nano-state-active, #10b981);
}

.picker-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.pipe-feedback {
  margin: 10px 0 0;
  font-size: 0.8rem;
  color: #10b981;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, monospace;
}
</style>
