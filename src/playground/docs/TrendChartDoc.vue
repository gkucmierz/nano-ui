<script setup>
import { ref, computed } from 'vue';
import NanoTrendChart from '../../components/NanoTrendChart.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { currentLang, t } from '../../locales.js';

// Domain selector: proves X-axis is 100% generic (Time-Series, Audio Frequency, Algorithmic Steps)
const activeDomain = ref('timeseries'); // 'timeseries' | 'frequency' | 'complexity'
const showBands = ref(true);
const mergeAdjacentBands = ref(true);
const includeFriday = ref(false);
const curveMode = ref('spline');
const activePresetIdx = ref(0);

// 1. Time-Series Domain (Multi-series with Weekend / Custom Day Vertical Bands)
const timeSeriesVariants = [
  {
    name: 'Standard Market',
    ddr5: [78.4, 79.1, 79.5, 79.5, 81.7, 82.9, 82.1, 83.4, 84.8, 84.8, 84.8, 86.2],
    ddr4: [41.2, 41.5, 41.6, 41.6, 41.88, 42.1, 41.9, 42.4, 42.7, 42.7, 42.7, 43.1],
  },
  {
    name: 'Volatility Spike',
    ddr5: [82.0, 80.2, 77.8, 77.8, 85.4, 89.2, 91.5, 88.0, 86.1, 86.1, 86.1, 83.5],
    ddr4: [43.0, 42.1, 40.9, 40.9, 43.5, 45.2, 46.8, 44.9, 43.8, 43.8, 43.8, 42.6],
  },
];

const dates = [
  '2026-10-16', // Fri
  '2026-10-17', // Sat
  '2026-10-18', // Sun
  '2026-10-19', // Mon
  '2026-10-20', // Tue
  '2026-10-21', // Wed
  '2026-10-22', // Thu
  '2026-10-23', // Fri
  '2026-10-24', // Sat
  '2026-10-25', // Sun
  '2026-10-26', // Mon
  '2026-10-27', // Tue
];

// 2. Audio Frequency Spectrum Domain (Non-date X-axis: 20 Hz .. 20 kHz)
const freqLabels = ['20Hz', '40Hz', '80Hz', '160Hz', '315Hz', '630Hz', '1.25kHz', '2.5kHz', '5kHz', '10kHz', '16kHz', '20kHz'];
const freqSeriesVariants = [
  {
    studio: [-2.4, -0.8, 0.4, 0.2, 0.0, -0.3, 0.5, 1.8, 2.4, 1.2, -0.6, -2.1],
    warm: [1.5, 3.2, 3.8, 2.1, 0.5, -0.4, -1.2, -0.8, 0.2, 0.9, -1.1, -3.4],
  },
  {
    studio: [-1.2, 0.6, 1.8, 1.1, -0.5, -1.4, 0.9, 3.1, 3.8, 2.5, 0.8, -1.0],
    warm: [2.8, 4.5, 4.1, 1.4, -0.8, -1.9, -0.5, 0.6, 1.4, 0.2, -1.8, -4.0],
  },
];

// 3. Algorithmic Complexity / Cache Hierarchy Domain (Non-date X-axis: Input size N)
const stepLabels = ['N=16', 'N=64', 'N=256', 'N=1K', 'N=4K', 'N=16K', 'N=64K', 'N=256K', 'N=1M', 'N=4M'];
const complexityVariants = [
  {
    radix: [0.12, 0.18, 0.29, 0.52, 0.95, 1.82, 3.45, 6.9, 13.8, 27.4],
    quick: [0.10, 0.19, 0.38, 0.84, 1.92, 4.35, 9.8, 22.4, 51.2, 114.0],
  },
  {
    radix: [0.15, 0.22, 0.35, 0.64, 1.18, 2.15, 4.10, 8.2, 16.1, 31.8],
    quick: [0.14, 0.25, 0.51, 1.12, 2.60, 5.90, 13.4, 30.1, 68.5, 148.0],
  },
];

const activeSeries = computed(() => {
  const vIdx = activePresetIdx.value % 2;
  if (activeDomain.value === 'frequency') {
    const v = freqSeriesVariants[vIdx];
    return [
      {
        id: 'studio',
        label: 'Reference Monitor',
        color: '#38bdf8',
        area: true,
        points: freqLabels.map((lbl, idx) => ({
          key: lbl,
          label: lbl,
          value: v.studio[idx],
          badge: idx <= 2 ? 'BASS' : idx <= 6 ? 'MID' : 'TREBLE',
          badgeHighlight: idx <= 2 || idx >= 9,
        })),
      },
      {
        id: 'warm',
        label: 'Tube Analog EQ',
        color: '#f59e0b',
        dash: '5,4',
        area: false,
        points: freqLabels.map((lbl, idx) => ({
          key: lbl,
          label: lbl,
          value: v.warm[idx],
        })),
      },
    ];
  }

  if (activeDomain.value === 'complexity') {
    const v = complexityVariants[vIdx];
    return [
      {
        id: 'radix',
        label: 'LSD Radix Sort O(k·N)',
        color: '#10b981',
        area: true,
        points: stepLabels.map((lbl, idx) => ({
          key: lbl,
          label: lbl,
          value: v.radix[idx],
          badge: idx <= 2 ? 'L1' : idx <= 5 ? 'L2/L3' : 'DRAM',
          badgeHighlight: idx >= 6,
        })),
      },
      {
        id: 'quick',
        label: 'Pattern-Defeating Quicksort O(N log N)',
        color: '#6366f1',
        area: false,
        points: stepLabels.map((lbl, idx) => ({
          key: lbl,
          label: lbl,
          value: v.quick[idx],
        })),
      },
    ];
  }

  const v = timeSeriesVariants[vIdx];
  return [
    {
      id: 'ddr5',
      label: 'DDR5',
      color: '#6366f1',
      area: true,
      points: dates.map((d, idx) => ({
        key: d,
        label: d,
        date: d,
        value: v.ddr5[idx],
        subValue: idx > 0 ? `${(((v.ddr5[idx] - v.ddr5[idx - 1]) / v.ddr5[idx - 1]) * 100).toFixed(2)}%` : '0.00%',
      })),
    },
    {
      id: 'ddr4',
      label: 'DDR4',
      color: '#10b981',
      area: false,
      points: dates.map((d, idx) => ({
        key: d,
        label: d,
        date: d,
        value: v.ddr4[idx],
        subValue: idx > 0 ? `${(((v.ddr4[idx] - v.ddr4[idx - 1]) / v.ddr4[idx - 1]) * 100).toFixed(2)}%` : '0.00%',
      })),
    },
  ];
});

const verticalBandsConfig = computed(() => {
  if (activeDomain.value === 'frequency') {
    return {
      mergeAdjacent: mergeAdjacentBands.value,
      match: (pt, idx) => {
        if (idx >= 0 && idx <= 2) return { match: true, label: `SUB-${idx + 1}`, group: 'sub' };
        if (idx >= 9 && idx <= 11) return { match: true, label: `AIR-${idx - 8}`, group: 'air' };
        return false;
      },
      mergedLabel: (labels) => (labels[0]?.startsWith('SUB') ? 'SUB–BASS' : 'AIR–BRILLIANCE'),
    };
  }

  if (activeDomain.value === 'complexity') {
    return {
      mergeAdjacent: mergeAdjacentBands.value,
      match: (pt, idx) => {
        if (idx >= 0 && idx <= 2) return { match: true, label: 'L1', group: 'l1' };
        if (idx >= 6 && idx <= 9) return { match: true, label: `RAM-${idx - 5}`, group: 'ram' };
        return false;
      },
      mergedLabel: (labels) => (labels[0] === 'L1' ? 'L1 CACHE' : 'DRAM PAGE WALK'),
    };
  }

  return {
    preset: 'weekend',
    lang: currentLang.value,
    days: includeFriday.value ? [5, 6, 0] : [6, 0],
    mergeAdjacent: mergeAdjacentBands.value,
  };
});

const formatChartValue = (val) => {
  if (activeDomain.value === 'frequency') return `${val >= 0 ? '+' : ''}${val.toFixed(1)} dB`;
  if (activeDomain.value === 'complexity') return `${val.toFixed(2)} ms`;
  return `${val.toFixed(2)} PLN`;
};

const formatTooltipFooter = ({ items }) => {
  if (items.length < 2) return '';
  if (activeDomain.value === 'timeseries') {
    const a = items[0].value;
    const b = items[1].value;
    const pct = ((a - b) / b) * 100;
    const ratio = a / b;
    return `Spread: +${pct.toFixed(1)}% (${ratio.toFixed(2)}×)`;
  }
  if (activeDomain.value === 'complexity') {
    const speedup = items[1].value / Math.max(0.01, items[0].value);
    return `Radix Speedup: ${speedup.toFixed(2)}×`;
  }
  return `Δ Gain: ${(items[0].value - items[1].value).toFixed(1)} dB`;
};

const usageSnippet = `<script setup>
import { NanoTrendChart, computeVerticalBands } from '@gkucmierz/nano-ui';

// Works with ANY X-axis domain (dates, frequencies, steps, categories)
const series = [
  {
    id: 'ddr5',
    label: 'DDR5',
    color: '#6366f1',
    area: true,
    points: [
      { key: '2026-10-16', label: '2026-10-16', value: 78.4 },
      { key: '2026-10-17', label: '2026-10-17', value: 79.1 },
      { key: '2026-10-18', label: '2026-10-18', value: 79.5 },
      { key: '2026-10-19', label: '2026-10-19', value: 81.7 },
    ],
  },
];

// Configurable vertical bands: single ('SB', 'ND') or merged ('SB–ND', 'PT–ND', or custom predicate)
const bandConfig = {
  preset: 'weekend',
  lang: 'pl',
  days: [6, 0],
  mergeAdjacent: true, // true -> 'SB–ND', false -> separate 'SB' and 'ND'
};
<\/script>

<template>
  <NanoTrendChart
    :series="series"
    :vertical-bands="bandConfig"
    :show-vertical-bands="true"
    curve="spline"
  />
</template>`;
</script>

<template>
  <div class="doc-page">
    <h2>{{ t('trendChart.title') }}</h2>
    <p>{{ t('trendChart.desc') }}</p>

    <div class="demo-section">
      <div class="chart-toolbar">
        <div class="ctrl-block">
          <span class="ctrl-label">{{ t('trendChart.domainLabel') }}</span>
          <div class="nano-btn-group">
            <button
              type="button"
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': activeDomain === 'timeseries' }"
              @click="activeDomain = 'timeseries'"
            >
              {{ t('trendChart.domainTime') }}
            </button>
            <button
              type="button"
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': activeDomain === 'frequency' }"
              @click="activeDomain = 'frequency'"
            >
              {{ t('trendChart.domainFreq') }}
            </button>
            <button
              type="button"
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': activeDomain === 'complexity' }"
              @click="activeDomain = 'complexity'"
            >
              {{ t('trendChart.domainComplexity') }}
            </button>
          </div>
        </div>

        <div class="ctrl-block">
          <span class="ctrl-label">{{ t('trendChart.kineticTrigger') }}</span>
          <button
            type="button"
            class="nano-btn nano-btn-primary nano-btn-sm"
            @click="activePresetIdx++"
          >
            ⚡ {{ t('trendChart.morphData') }}
          </button>
        </div>

        <div class="ctrl-block">
          <span class="ctrl-label">{{ t('trendChart.curveMode') }}</span>
          <div class="nano-btn-group">
            <button
              type="button"
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': curveMode === 'spline' }"
              @click="curveMode = 'spline'"
            >
              Spline (C¹ Bezier)
            </button>
            <button
              type="button"
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': curveMode === 'linear' }"
              @click="curveMode = 'linear'"
            >
              Linear
            </button>
          </div>
        </div>

        <label class="toggle-item">
          <NanoSwitch v-model="showBands" size="compact" color="amber" />
          <span>{{ t('trendChart.showBands') }}</span>
        </label>

        <label class="toggle-item">
          <NanoSwitch v-model="mergeAdjacentBands" size="compact" :disabled="!showBands" />
          <span>{{ t('trendChart.mergeAdjacent') }}</span>
        </label>

        <label v-if="activeDomain === 'timeseries'" class="toggle-item">
          <NanoSwitch v-model="includeFriday" size="compact" :disabled="!showBands" />
          <span>{{ t('trendChart.includeFriday') }}</span>
        </label>
      </div>

      <div class="chart-stage-card">
        <NanoTrendChart
          :series="activeSeries"
          :vertical-bands="verticalBandsConfig"
          :show-vertical-bands="showBands"
          :curve="curveMode"
          :zero-baseline="activeDomain === 'frequency'"
          :lang="currentLang"
          :format-value="formatChartValue"
          :tooltip-footer="formatTooltipFooter"
        />
      </div>
    </div>

    <NanoCodeBlock :code="usageSnippet" lang="vue" title="NanoTrendChart & Vertical Bands Config" />
  </div>
</template>

<style scoped>
.chart-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  margin-bottom: 16px;
  border-radius: 10px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-card);
}

.ctrl-block {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ctrl-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--nano-text-muted);
  text-transform: uppercase;
}

.toggle-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  cursor: pointer;
}

.chart-stage-card {
  padding: 18px;
  border-radius: 12px;
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-card);
}
</style>
