<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  createKineticTransition,
  createKineticPoints,
  buildSplinePath,
  evaluateSplineY,
  cubicHermite,
} from '../../utils/kinetics.js';
import NanoSlider from '../../components/NanoSlider.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { t } from '../../locales.js';

// Interactive Multi-Point Resampling & C1 Hermite Spline Laboratory
const tension = ref(0.35);
const duration = ref(450);
const pointCountMode = ref(12); // 5 | 12 | 24
const probeX = ref(440);
const isMoving = ref(false);
const liveProgress = ref(1);
const currentPts = ref([]);

const SVG_W = 860;
const SVG_H = 260;
const PAD_X = 36;
const PAD_Y = 28;

let wavePhase = 0;
let rafId = null;

const generateTargetWave = (count, phase) => {
  const pts = [];
  const plotW = SVG_W - PAD_X * 2;
  const plotH = SVG_H - PAD_Y * 2;
  for (let i = 0; i < count; i++) {
    const u = count > 1 ? i / (count - 1) : 0;
    const x = PAD_X + u * plotW;
    const normY =
      0.5 +
      0.34 * Math.sin(u * Math.PI * 2.5 + phase) +
      0.12 * Math.cos(u * Math.PI * 5 - phase * 1.3);
    const y = PAD_Y + (1 - normY) * plotH;
    pts.push({ x, y, index: i });
  }
  return pts;
};

const pointsCtrl = createKineticPoints({
  duration: duration.value,
  onUpdate: (pts, { progress, isMoving: moving }) => {
    currentPts.value = [...pts];
    liveProgress.value = progress;
    isMoving.value = moving;
  },
});

const probeCtrl = createKineticTransition({
  initialValue: 440,
  duration: 240,
  shortestPath: false,
  timingMode: 'fixed',
  onUpdate: ({ value }) => {
    probeX.value = value;
  },
});

const stepLoop = (ts) => {
  pointsCtrl.step(ts);
  probeCtrl.step(ts);
  if (pointsCtrl.isMoving() || probeCtrl.isMoving()) {
    rafId = window.requestAnimationFrame(stepLoop);
  } else {
    rafId = null;
  }
};

const startLoop = () => {
  if (rafId === null && typeof window !== 'undefined' && window.requestAnimationFrame) {
    rafId = window.requestAnimationFrame(stepLoop);
  }
};

const triggerWaveMorph = (newCount = pointCountMode.value) => {
  pointCountMode.value = newCount;
  wavePhase += 1.35;
  const targets = generateTargetWave(newCount, wavePhase);
  pointsCtrl.setTargets(targets, { immediate: currentPts.value.length === 0 });
  startLoop();
};

const handleSvgMove = (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  if (!rect.width) return;
  const relX = ((e.clientX - rect.left) / rect.width) * SVG_W;
  const clamped = Math.max(PAD_X, Math.min(SVG_W - PAD_X, relX));
  probeCtrl.setTarget(clamped);
  startLoop();
};

onMounted(() => {
  const initial = generateTargetWave(pointCountMode.value, 0);
  pointsCtrl.setTargets(initial, { immediate: true });
});

onUnmounted(() => {
  if (rafId !== null && typeof window !== 'undefined' && window.cancelAnimationFrame) {
    window.cancelAnimationFrame(rafId);
  }
  pointsCtrl.destroy();
  probeCtrl.destroy();
});

const splinePath = computed(() =>
  buildSplinePath(currentPts.value, { tension: tension.value })
);

const areaPath = computed(() =>
  buildSplinePath(currentPts.value, { tension: tension.value, groundY: SVG_H - PAD_Y })
);

const probeY = computed(() =>
  evaluateSplineY(currentPts.value, probeX.value, tension.value)
);

// Hermite basis preview curves for v0 = -2, 0, +2
const hermitePreviewPaths = computed(() => {
  const v0List = [
    { v0: -2.0, color: '#ef4444', label: 'v₀ = -2.0 (Counter-Momentum)' },
    { v0: 0.0, color: '#38bdf8', label: 'v₀ = 0.0 (Rest Easing)' },
    { v0: 2.0, color: '#10b981', label: 'v₀ = +2.0 (Forward Boost)' },
  ];
  return v0List.map((item) => {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const p = i / 40;
      const val = cubicHermite(p, item.v0);
      pts.push({
        x: 40 + p * 320,
        y: 130 - val * 90,
      });
    }
    return {
      ...item,
      d: pts.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' '),
    };
  });
});

const engineCodeSnippet = `import {
  createKineticTransition,
  createKineticPoints,
  buildSplinePath,
  evaluateSplineY,
  cubicHermite,
  sampleKinematics,
} from '@gkucmierz/nano-ui';

// 1. 1D Scalar / Angular Velocity-Preserving C¹ Hermite Controller
const scaleTransition = createKineticTransition({
  initialValue: 0,
  duration: 350,
  shortestPath: false, // true for 360° modular angles, false for linear scalars
  timingMode: 'fixed',
  onUpdate: ({ value, velocity, acceleration }) => {
    console.log('C¹ state:', value, velocity);
  },
});

// 2. 2D Multi-Point Array Controller with Automatic Curve Resampling (N_old -> N_new)
const pointsController = createKineticPoints({
  duration: 350,
  onUpdate: (points) => {
    const pathD = buildSplinePath(points, { tension: 0.35 });
    const exactRiderY = evaluateSplineY(points, hoverX, 0.35);
  },
});`;
</script>

<template>
  <div class="doc-page">
    <h2>{{ t('kineticEngine.title') }}</h2>
    <p>{{ t('kineticEngine.desc') }}</p>

    <div class="demo-section">
      <h3>{{ t('kineticEngine.labTitle') }}</h3>
      <p class="demo-desc">{{ t('kineticEngine.labDesc') }}</p>

      <div class="lab-controls">
        <div class="ctrl-item">
          <span class="ctrl-label">{{ t('kineticEngine.resampleLabel') }}</span>
          <div class="nano-btn-group">
            <button
              v-for="cnt in [5, 12, 24]"
              :key="cnt"
              type="button"
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': pointCountMode === cnt }"
              @click="triggerWaveMorph(cnt)"
            >
              N = {{ cnt }} {{ t('kineticEngine.pointsUnit') }}
            </button>
          </div>
        </div>

        <button
          type="button"
          class="nano-btn nano-btn-primary nano-btn-sm"
          @click="triggerWaveMorph(pointCountMode)"
        >
          ⚡ {{ t('kineticEngine.impulseBtn') }}
        </button>

        <div class="slider-wrap">
          <NanoSlider
            v-model="tension"
            :min="0"
            :max="0.65"
            :step="0.05"
            :label="`${t('kineticEngine.tensionLabel')}: ${tension.toFixed(2)}`"
          />
        </div>
      </div>

      <div class="spline-stage" @mousemove="handleSvgMove">
        <svg :viewBox="`0 0 ${SVG_W} ${SVG_H}`" class="kinetics-svg">
          <defs>
            <linearGradient id="kinetic-lab-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#00f2fe" stop-opacity="0.28" />
              <stop offset="100%" stop-color="#6366f1" stop-opacity="0.0" />
            </linearGradient>
          </defs>

          <path :d="areaPath" fill="url(#kinetic-lab-grad)" />
          <path
            :d="splinePath"
            fill="none"
            stroke="#00f2fe"
            stroke-width="2.8"
            stroke-linecap="round"
          />

          <!-- Control knots with live velocity vectors -->
          <g v-for="(pt, idx) in currentPts" :key="`knot-${idx}`">
            <line
              v-if="Math.abs(pt.vy || 0) > 2"
              :x1="pt.x"
              :y1="pt.y"
              :x2="pt.x"
              :y2="pt.y + (pt.vy || 0) * 0.06"
              stroke="#f59e0b"
              stroke-width="1.6"
            />
            <circle
              :cx="pt.x"
              :cy="pt.y"
              r="3.8"
              fill="#0f172a"
              stroke="#38bdf8"
              stroke-width="1.8"
            />
          </g>

          <!-- 16-Step Bisection Bezier Curve Rider (evaluateSplineY) -->
          <line
            :x1="probeX"
            :y1="PAD_Y"
            :x2="probeX"
            :y2="SVG_H - PAD_Y"
            stroke="rgba(248, 250, 252, 0.3)"
            stroke-dasharray="3 3"
          />
          <circle
            :cx="probeX"
            :cy="probeY"
            r="6.5"
            fill="#6366f1"
            stroke="#ffffff"
            stroke-width="2.4"
          />
        </svg>

        <div class="lab-telemetry">
          <span><strong>Nodes:</strong> {{ currentPts.length }}</span>
          <span><strong>Progress:</strong> {{ (liveProgress * 100).toFixed(0) }}%</span>
          <span><strong>evaluateSplineY(x={{ probeX.toFixed(0) }}):</strong> {{ probeY.toFixed(1) }} px</span>
          <span><strong>State:</strong> {{ isMoving ? 'C¹ IN FLIGHT' : 'SETTLED' }}</span>
        </div>
      </div>
    </div>

    <div class="demo-section">
      <h3>{{ t('kineticEngine.hermiteTitle') }}</h3>
      <p class="demo-desc">{{ t('kineticEngine.hermiteDesc') }}</p>

      <div class="hermite-grid">
        <div class="hermite-card">
          <svg viewBox="0 0 400 160" class="hermite-svg">
            <line x1="40" y1="40" x2="360" y2="40" stroke="rgba(148,163,184,0.2)" stroke-dasharray="3 3" />
            <line x1="40" y1="130" x2="360" y2="130" stroke="rgba(148,163,184,0.2)" stroke-dasharray="3 3" />
            <path
              v-for="curve in hermitePreviewPaths"
              :key="curve.label"
              :d="curve.d"
              fill="none"
              :stroke="curve.color"
              stroke-width="2.4"
            />
          </svg>
          <div class="hermite-legend">
            <span v-for="curve in hermitePreviewPaths" :key="curve.label" class="legend-pill">
              <i :style="{ background: curve.color }"></i>
              {{ curve.label }}
            </span>
          </div>
        </div>

        <div class="primitives-list">
          <div class="prim-row">
            <code>createKineticTransition(opts)</code>
            <span>{{ t('kineticEngine.prim1Desc') }}</span>
          </div>
          <div class="prim-row">
            <code>createKineticPoints(opts)</code>
            <span>{{ t('kineticEngine.prim2Desc') }}</span>
          </div>
          <div class="prim-row">
            <code>buildSplinePath(pts, opts)</code>
            <span>{{ t('kineticEngine.prim3Desc') }}</span>
          </div>
          <div class="prim-row">
            <code>evaluateSplineY(pts, x, tension)</code>
            <span>{{ t('kineticEngine.prim4Desc') }}</span>
          </div>
        </div>
      </div>
    </div>

    <NanoCodeBlock :code="engineCodeSnippet" lang="javascript" title="Headless Kinetic Engine API (src/utils/kinetics.js)" />
  </div>
</template>

<style scoped>
.lab-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  margin-bottom: 14px;
  border-radius: 10px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-card);
}

.ctrl-item {
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

.slider-wrap {
  min-width: 220px;
  flex: 1;
}

.spline-stage {
  padding: 16px;
  border-radius: 12px;
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-card);
  cursor: crosshair;
}

.kinetics-svg {
  width: 100%;
  height: auto;
  display: block;
}

.lab-telemetry {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--nano-border-subtle);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.76rem;
  color: var(--nano-text-muted);
}

.hermite-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: stretch;
}

@media (max-width: 860px) {
  .hermite-grid {
    grid-template-columns: 1fr;
  }
}

.hermite-card,
.primitives-list {
  padding: 16px;
  border-radius: 10px;
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-card);
}

.hermite-svg {
  width: 100%;
  height: auto;
  display: block;
}

.hermite-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
  font-size: 0.74rem;
}

.legend-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-pill i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}

.primitives-list {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}

.prim-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--nano-bg-muted);
  font-size: 0.8rem;
}

.prim-row code {
  color: var(--nano-state-active, #00f2fe);
  font-weight: 700;
}
</style>
