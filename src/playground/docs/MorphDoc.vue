<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import NanoMorph from '../../components/NanoMorph.vue';
import NanoSelect from '../../components/NanoSelect.vue';
import NanoSlider from '../../components/NanoSlider.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import {
  shapeToPathD,
  normalizeBezierPairForMorph,
  interpolateCubicBeziers,
  cubicBeziersToPathD,
  textToContourBeziers,
  createMorphStrategyGovernor,
} from '../../utils/nanoMorph.js';
import { isCallable } from '../../utils/type.js';
import { createDocTabs } from '../docSnippets.js';

// Tier 1: Floating Card <-> Docked Header Pill
const isWishesExpanded = ref(false);
const morphMode = ref('auto');
const morphDuration = ref(340);

const modeOptions = [
  { value: 'auto', label: 'auto (Adaptive Governor)' },
  { value: 'flip', label: 'flip (Tier 1 Box FLIP)' },
  { value: 'bezier', label: 'bezier (Tier 2 Cubic Bezier)' },
  { value: 'freeze', label: 'freeze (Strategy 3A Bitmap)' },
  { value: 'kinetic-worker', label: 'kinetic-worker (Strategy 3B Decimated)' },
];

// Tier 2: Vector SVG & Text De Casteljau Morph
const shapePresetKey = ref('circle-to-star');
const manualScrubPct = ref(0);

const shapePresets = {
  'circle-to-star': {
    label: 'Circle -> 5-Point Star (De Casteljau N-Node Alignment)',
    from: shapeToPathD({ type: 'circle', cx: 120, cy: 60, r: 42 }),
    to: shapeToPathD({
      type: 'polygon',
      points: [
        [120, 14], [132, 44], [164, 46], [139, 66], [147, 98],
        [120, 80], [93, 98], [101, 66], [76, 46], [108, 44],
      ],
    }),
  },
  'rect-to-heart': {
    label: 'Rounded Card -> Heart Curve',
    from: shapeToPathD({ type: 'rect', x: 56, y: 22, width: 128, height: 76, rx: 18, ry: 18 }),
    to: 'M 120 36 C 120 20, 92 14, 80 30 C 66 48, 86 74, 120 98 C 154 74, 174 48, 160 30 C 148 14, 120 20, 120 36 Z',
  },
  'text-ai-to-ok': {
    label: 'Glyph Contour: "AI" -> "OK"',
    from: textToContourBeziers('AI', { width: 240, height: 120 }).pathD,
    to: textToContourBeziers('OK', { width: 240, height: 120 }).pathD,
  },
};

const shapePresetOptions = Object.entries(shapePresets).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

const normalizedVectorDemo = computed(() => {
  const cfg = shapePresets[shapePresetKey.value] || shapePresets['circle-to-star'];
  return normalizeBezierPairForMorph(cfg.from, cfg.to, { minSegments: 16 });
});

const scrubbedPathD = computed(() => {
  const pair = normalizedVectorDemo.value;
  if (!pair.count) return '';
  const t = manualScrubPct.value / 100;
  return cubicBeziersToPathD(interpolateCubicBeziers(pair.segmentsA, pair.segmentsB, t), true);
});

// Tier 3: Adaptive Frame-Budget Governor Telemetry
const simulatedWorkMs = ref(2.8);
const governorDemo = createMorphStrategyGovernor({ initialWorkMs: 2.8 });
const governorDecision = computed(() => governorDemo.evaluate(simulatedWorkMs.value));

const kineticCanvasRef = ref(null);
const isKineticCardOpen = ref(true);
let canvasRafId = null;

function drawPulseWave(ts = 0) {
  const canvas = kineticCanvasRef.value;
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0b1220';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const phase = ts * 0.004 + x * 0.045;
        const y = h * 0.5 + Math.sin(phase) * 18 + Math.cos(phase * 2.1) * 7;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  if (isCallable(globalThis.requestAnimationFrame)) {
    canvasRafId = globalThis.requestAnimationFrame(drawPulseWave);
  }
}

onMounted(() => {
  if (isCallable(globalThis.requestAnimationFrame)) {
    canvasRafId = globalThis.requestAnimationFrame(drawPulseWave);
  }
});

onUnmounted(() => {
  if (canvasRafId !== null && isCallable(globalThis.cancelAnimationFrame)) {
    globalThis.cancelAnimationFrame(canvasRafId);
    canvasRafId = null;
  }
});

const codeTabs = createDocTabs({
  componentName: 'NanoMorph',
  stateRef: 'isExpanded',
  initialValue: 'false',
  templateAttrs: [
    'v-model:expanded="isExpanded"',
    ':duration="340"',
    'easing="cubic-bezier(0.4, 0, 0.2, 1)"',
    'mode="auto"',
  ],
  slotContent: `<template #compact="{ expand }">
    <button class="nano-btn" @click="expand">Open Wishes Card</button>
  </template>
  <template #expanded="{ collapse }">
    <div class="nano-card">
      <h4>Floating Wishes Card</h4>
      <button class="nano-btn" @click="collapse">Dock to Header</button>
    </div>
  </template>`,
  headlessImports: [
    {
      symbols: [
        'pathToCubicBeziers',
        'resampleCubicBeziers',
        'alignCubicBezierLoops',
        'textToContourBeziers',
        'createMorphStrategyGovernor',
      ],
      path: '@gkucmierz/nano-ui',
    },
  ],
  apiSections: [
    {
      title: 'Props',
      items: [
        'expanded / modelValue: Boolean (default: false) - Bidirectional compact <-> expanded state (v-model:expanded)',
        'duration: Number (default: 340) - Morph transition duration in ms',
        'easing: String (default: "cubic-bezier(0.4, 0, 0.2, 1)") - CSS/solver cubic-bezier curve',
        'mode: "auto" | "flip" | "bezier" | "freeze" | "kinetic-worker" (default: "auto") - 3-tier morph strategy selector',
        'fromPath / toPath: String | ShapeObject - Optional SVG path or shape primitive pair for Tier 2 De Casteljau morphing',
        'fromText / toText: String - Deterministic vector glyph contour pair',
      ],
    },
    {
      title: 'Headless Math & Governor Exports',
      items: [
        'pathToCubicBeziers(pathOrShape) - Normalizes M, L, H, V, C, S, Q, T, A, Z + rect/circle/ellipse/polygon into cubic Beziers',
        'resampleCubicBeziers(segments, N) - Isoparametric De Casteljau t=0.5 subdivision to equal N segments',
        'alignCubicBezierLoops(segsA, segsB) - Cyclic shift + orientation search minimizing sum ||P_A,i - P_B,(i+k) mod N||^2',
        'captureCanvasFreezeSnapshot(canvas) / createDecimatedMorphStream(opts) / createMorphStrategyGovernor(opts)',
      ],
    },
  ],
});
</script>

<template>
  <div class="doc-page">
    <h2>NanoMorph &amp; 3-Tier Morphing Engine</h2>
    <p class="lead-text">
      Deterministic bidirectional morphing across <strong>Tier 1</strong> (DOM Box FLIP portal ghost),
      <strong>Tier 2</strong> (De Casteljau SVG &amp; Text Cubic Bézier alignment), and
      <strong>Tier 3</strong> (<code>Snapshot Freeze</code> vs. <code>Decimated OffscreenCanvas Worker</code> governed by <code>ADAPTIVE-60FPS-01</code>).
    </p>

    <!-- TIER 1 -->
    <div class="demo-section">
      <h3>1. Tier 1 — Bidirectional Floating Card &harr; Docked Header Pill (FLIP)</h3>
      <div class="controls-bar">
        <div class="select-wrap">
          <NanoSelect v-model="morphMode" :options="modeOptions" size="sm" />
        </div>
        <div class="slider-wrap">
          <span class="meta-label">Duration: <code>{{ morphDuration }}ms</code></span>
          <NanoSlider v-model="morphDuration" :min="120" :max="800" :step="20" />
        </div>
      </div>

      <div class="morph-stage-box">
        <div class="simulated-topbar">
          <span class="topbar-brand">Workspace Shell</span>
          <NanoMorph
            v-model:expanded="isWishesExpanded"
            :duration="morphDuration"
            :mode="morphMode"
          >
            <template #compact="{ expand }">
              <button type="button" class="docked-pill-btn" @click="expand">
                <span>★ Docked Wishes Pill</span>
              </button>
            </template>
            <template #expanded="{ collapse }">
              <div class="floating-wishes-card">
                <div class="card-head">
                  <strong>Floating Wishes Card</strong>
                  <button type="button" class="dock-action-btn" @click="collapse">
                    Dock to Topbar
                  </button>
                </div>
                <p class="card-copy">
                  Measured via <code>getBoundingClientRect()</code> before and after <code>nextTick</code> and interpolated in a fixed <code>.nano-morph-portal-ghost</code> layer without layout shift.
                </p>
              </div>
            </template>
          </NanoMorph>
        </div>
      </div>
    </div>

    <!-- TIER 2 -->
    <div class="demo-section">
      <h3>2. Tier 2 — Isoparametric De Casteljau Cubic Bézier &amp; Text Contour Morph</h3>
      <div class="controls-bar">
        <div class="select-wrap wide">
          <NanoSelect v-model="shapePresetKey" :options="shapePresetOptions" size="sm" />
        </div>
        <div class="slider-wrap">
          <span class="meta-label">
            Morph <code>t = {{ (manualScrubPct / 100).toFixed(2) }}</code>
            · Segments <code>N = {{ normalizedVectorDemo.count }}</code>
            · Shift <code>k = {{ normalizedVectorDemo.shift }}</code>
          </span>
          <NanoSlider v-model="manualScrubPct" :min="0" :max="100" :step="1" />
        </div>
      </div>

      <div class="vector-preview-card">
        <svg viewBox="0 0 240 120" class="vector-svg-canvas" aria-label="Cubic Bezier Morph Preview">
          <path :d="scrubbedPathD" class="vector-morph-path" />
        </svg>
      </div>
    </div>

    <!-- TIER 3 -->
    <div class="demo-section">
      <h3>3. Tier 3 — Kinetic Canvas &amp; Adaptive Frame-Budget Governor (<code>&lt;4ms</code> / <code>4–12ms</code> / <code>&gt;12ms</code>)</h3>
      <div class="controls-bar">
        <div class="slider-wrap">
          <span class="meta-label">Simulated Frame Work Cost: <code>{{ simulatedWorkMs.toFixed(1) }} ms</code></span>
          <NanoSlider v-model="simulatedWorkMs" :min="1" :max="18" :step="0.5" />
        </div>
        <div class="governor-readout">
          <span class="gov-pill" :class="`is-${governorDecision.strategy}`">
            Strategy: {{ governorDecision.strategy }}
          </span>
          <span class="gov-pill">Stride: {{ governorDecision.frameStride || 'frozen' }}</span>
          <span class="gov-pill">DPR Scale: {{ governorDecision.dprScale }}x</span>
        </div>
      </div>

      <NanoMorph
        v-model:expanded="isKineticCardOpen"
        :duration="morphDuration"
        :mode="governorDecision.strategy === 'kinetic-worker' ? 'kinetic-worker' : (governorDecision.strategy === 'freeze' ? 'freeze' : 'flip')"
      >
        <template #compact="{ expand }">
          <button type="button" class="docked-pill-btn" @click="expand">
            Resume Live Telemetry Wave
          </button>
        </template>
        <template #expanded="{ collapse }">
          <div class="kinetic-card">
            <div class="card-head">
              <strong>Live Kinetic Oscilloscope Canvas</strong>
              <button type="button" class="dock-action-btn" @click="collapse">
                Morph &amp; Minimize
              </button>
            </div>
            <canvas ref="kineticCanvasRef" width="360" height="92" class="kinetic-canvas"></canvas>
          </div>
        </template>
      </NanoMorph>
    </div>

    <NanoCodeBlock :tabs="codeTabs" />
  </div>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

h2 {
  margin: 0;
  color: var(--nano-text-main);
}

.lead-text {
  margin: 0;
  color: var(--nano-text-muted);
  line-height: 1.55;
}

.demo-section {
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-card);
  border-radius: 10px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.demo-section h3 {
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--nano-border-subtle);
  color: var(--nano-text-main);
}

.controls-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.25rem;
}

.select-wrap {
  min-width: 230px;
}

.select-wrap.wide {
  min-width: 300px;
}

.slider-wrap {
  flex: 1;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.meta-label {
  font-size: 0.82rem;
  color: var(--nano-text-muted);
}

.morph-stage-box {
  padding: 1rem;
  border-radius: 8px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-subtle);
}

.simulated-topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.topbar-brand {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--nano-text-main);
  line-height: 36px;
}

.docked-pill-btn,
.dock-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  box-sizing: border-box;
  line-height: 1;
  border: 1px solid rgba(99, 102, 241, 0.45);
  background: rgba(99, 102, 241, 0.16);
  color: var(--nano-text-main);
  font-weight: 600;
  font-size: 0.84rem;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.docked-pill-btn:hover,
.dock-action-btn:hover {
  background: rgba(99, 102, 241, 0.26);
  border-color: var(--nano-accent-primary, #6366f1);
}

.floating-wishes-card,
.kinetic-card {
  max-width: 440px;
  padding: 1rem 1.15rem;
  border-radius: 14px;
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-card);
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.28);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.card-copy {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.5;
  color: var(--nano-text-muted);
}

.vector-preview-card {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  border-radius: 8px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-subtle);
}

.vector-svg-canvas {
  width: 100%;
  max-width: 340px;
  height: auto;
}

.vector-morph-path {
  fill: rgba(99, 102, 241, 0.22);
  stroke: #818cf8;
  stroke-width: 2.4;
  stroke-linejoin: round;
}

.governor-readout {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.gov-pill {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 600;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-muted);
  color: var(--nano-text-main);
}

.gov-pill.is-live-60fps {
  border-color: rgba(16, 185, 129, 0.45);
  color: #34d399;
}

.gov-pill.is-kinetic-worker {
  border-color: rgba(56, 189, 248, 0.45);
  color: #38bdf8;
}

.gov-pill.is-freeze {
  border-color: rgba(245, 158, 11, 0.45);
  color: #fbbf24;
}

.kinetic-canvas {
  width: 100%;
  height: auto;
  border-radius: 8px;
  border: 1px solid var(--nano-border-subtle);
  display: block;
}
</style>
