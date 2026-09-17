<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import KineticRotator from '../../components/KineticRotator.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import InstaCatCanvas from '../components/InstaCatCanvas.vue';
import NanoBanana from '../components/NanoBanana.vue';
import NanoLogoCard from '../components/NanoLogoCard.vue';

const rotatorRef = ref(null);

// Configuration state
const activeVisual = ref('cat'); // 'cat' | 'banana' | 'logo'
const baseDuration = ref(1000); // 1000ms default
const isShortestPath = ref(true);

// Realtime Telemetry state
const currentAngle = ref(0);
const targetAngle = ref(0);
const velocity = ref(0);
const isMoving = ref(false);
const initialV0 = ref(0);
const clickEvents = ref([]);

// Rolling buffer for waveform graph
const MAX_SAMPLES = 200;
const historySamples = ref([]);

// Speed base presets (duration in ms for 90deg)
const speedPresets = [
  { label: '0.5s (2x)', duration: 500 },
  { label: '1s (1x)', duration: 1000 },
  { label: '2s (1/2x)', duration: 2000 },
  { label: '4s (1/4x)', duration: 4000 },
  { label: '8s (1/8x)', duration: 8000 }
];

const normalizedAngle = computed(() => {
  return ((currentAngle.value % 360) + 360) % 360;
});

const normalizedTarget = computed(() => {
  return ((targetAngle.value % 360) + 360) % 360;
});

// Telemetry frame handler emitted by KineticRotator on each rAF
const onKineticFrame = (data) => {
  currentAngle.value = data.currentAngle;
  targetAngle.value = data.targetAngle;
  velocity.value = data.velocity;
  isMoving.value = data.isMoving;
  initialV0.value = data.v0;

  const sample = {
    time: data.timestamp,
    angle: ((data.currentAngle % 360) + 360) % 360,
    target: ((data.targetAngle % 360) + 360) % 360,
    rawAngle: data.currentAngle,
    rawTarget: data.targetAngle,
    vel: data.velocity,
    isMoving: data.isMoving
  };

  historySamples.value.push(sample);
  if (historySamples.value.length > MAX_SAMPLES) {
    historySamples.value.shift();
  }
};

// Record click event for timeline markers
const registerClickEvent = (label) => {
  const now = performance.now();
  clickEvents.value.push({
    time: now,
    label
  });

  // Keep last 10 clicks
  if (clickEvents.value.length > 10) {
    clickEvents.value.shift();
  }
};

// Action triggers
const triggerRotate = (delta, label) => {
  registerClickEvent(label || `${delta > 0 ? '+' : ''}${delta}°`);
  if (rotatorRef.value) {
    rotatorRef.value.rotateBy(delta);
  }
};

const triggerSpam = () => {
  registerClickEvent('Spam 4x');
  if (!rotatorRef.value) return;

  // Simulate multiple rapid clicks
  rotatorRef.value.rotateBy(90);
  setTimeout(() => {
    if (rotatorRef.value) rotatorRef.value.rotateBy(90);
  }, 120);
  setTimeout(() => {
    if (rotatorRef.value) rotatorRef.value.rotateBy(90);
  }, 240);
  setTimeout(() => {
    if (rotatorRef.value) rotatorRef.value.rotateBy(90);
  }, 360);
};

const triggerReset = () => {
  registerClickEvent('Reset');
  if (rotatorRef.value) {
    rotatorRef.value.reset();
  }
  historySamples.value = [];
  clickEvents.value = [];
};

// SVG Telemetry Graph rendering math
const svgWidth = 720;
const svgHeight = 220;
const padding = { top: 20, right: 30, bottom: 30, left: 50 };
const plotWidth = svgWidth - padding.left - padding.right;
const plotHeight = svgHeight - padding.top - padding.bottom;

const mapAngleToY = (deg) => {
  // Y maps 0° at bottom (plotHeight) to 360° at top (0)
  const norm = ((deg % 360) + 360) % 360;
  return padding.top + (1 - norm / 360) * plotHeight;
};

// Generate SVG polyline path for history
const actualPathD = computed(() => {
  const pts = historySamples.value;
  if (pts.length < 2) return '';

  return pts.map((pt, idx) => {
    const x = padding.left + (idx / (MAX_SAMPLES - 1)) * plotWidth;
    const y = mapAngleToY(pt.angle);
    return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
});

const targetPathD = computed(() => {
  const pts = historySamples.value;
  if (pts.length < 2) return '';

  return pts.map((pt, idx) => {
    const x = padding.left + (idx / (MAX_SAMPLES - 1)) * plotWidth;
    const y = mapAngleToY(pt.target);
    return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
});

// Discrete tick dots on recent points (quantized visualization)
const recentTicks = computed(() => {
  const pts = historySamples.value;
  if (pts.length === 0) return [];
  // Sample every 4th point or last 30 points to show rAF evaluation ticks
  const stride = Math.max(1, Math.floor(pts.length / 40));
  const dots = [];
  for (let i = 0; i < pts.length; i += stride) {
    const pt = pts[i];
    const x = padding.left + (i / (MAX_SAMPLES - 1)) * plotWidth;
    const y = mapAngleToY(pt.angle);
    dots.push({ x, y });
  }
  return dots;
});

// Click markers on the rolling graph
const activeMarkers = computed(() => {
  const pts = historySamples.value;
  if (pts.length < 2) return [];

  const minTime = pts[0].time;
  const maxTime = pts[pts.length - 1].time;
  const timeSpan = Math.max(1, maxTime - minTime);

  return clickEvents.value
    .filter(c => c.time >= minTime && c.time <= maxTime)
    .map(c => {
      const rel = (c.time - minTime) / timeSpan;
      const x = padding.left + rel * plotWidth;
      return { x, label: c.label };
    });
});

// Periodic passive ticker to keep rolling graph live even when stationary
let passiveTickerId = null;
onMounted(() => {
  passiveTickerId = setInterval(() => {
    if (!isMoving.value && rotatorRef.value) {
      const now = performance.now();
      onKineticFrame({
        currentAngle: currentAngle.value,
        targetAngle: targetAngle.value,
        velocity: 0,
        progress: 1,
        isMoving: false,
        v0: 0,
        timestamp: now
      });
    }
  }, 50);
});

onUnmounted(() => {
  if (passiveTickerId) clearInterval(passiveTickerId);
});
</script>

<template>
  <div class="doc-page">
    <div class="header-section">
      <h2>KineticRotator Component</h2>
      <p class="desc">
        Continuous velocity-preserving Hermite kinematics with modular geodesic shortest-path interpolation.
        Chaining mid-flight rotations seamlessly absorbs momentum (<em>C¹ velocity continuity</em>) without jerky snaps or excess revolutions.
      </p>
    </div>

    <!-- Main Interactive Stage -->
    <div class="stage-container">
      <div class="rotator-stage-card">
        <!-- Visual Content Switcher Tabs -->
        <div class="visual-tabs">
          <button
            type="button"
            class="tab-btn"
            :class="{ active: activeVisual === 'cat' }"
            @click="activeVisual = 'cat'"
            v-ripple
          >
            🐱 InstaCat
          </button>
          <button
            type="button"
            class="tab-btn"
            :class="{ active: activeVisual === 'banana' }"
            @click="activeVisual = 'banana'"
            v-ripple
          >
            🍌 Nano Banana
          </button>
          <button
            type="button"
            class="tab-btn"
            :class="{ active: activeVisual === 'logo' }"
            @click="activeVisual = 'logo'"
            v-ripple
          >
            ⚡ Nano Logo
          </button>
        </div>

        <!-- The Kinetic Rotator Component -->
        <div class="rotator-viewport">
          <KineticRotator
            ref="rotatorRef"
            :duration="baseDuration"
            :shortest-path="isShortestPath"
            :size="240"
            @frame="onKineticFrame"
          >
            <InstaCatCanvas v-if="activeVisual === 'cat'" :size="240" />
            <NanoBanana v-else-if="activeVisual === 'banana'" :size="240" />
            <NanoLogoCard v-else-if="activeVisual === 'logo'" :size="240" />
          </KineticRotator>
        </div>

        <!-- Live Angular Readout Badge -->
        <div class="angle-badge-strip">
          <div class="badge-item">
            <span class="badge-label">CURRENT</span>
            <span class="badge-val active">{{ Math.round(normalizedAngle) }}°</span>
          </div>
          <div class="badge-divider"></div>
          <div class="badge-item">
            <span class="badge-label">TARGET</span>
            <span class="badge-val target">{{ Math.round(normalizedTarget) }}°</span>
          </div>
          <div class="badge-divider"></div>
          <div class="badge-item">
            <span class="badge-label">VELOCITY</span>
            <span class="badge-val">{{ Math.round(velocity) }}°/s</span>
          </div>
          <div class="badge-divider"></div>
          <div class="badge-item">
            <span class="badge-label">STATUS</span>
            <span class="badge-val status" :class="{ moving: isMoving }">
              {{ isMoving ? 'IN MOTION' : 'SETTLED' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Controls Panel -->
      <div class="controls-card">
        <h3 class="panel-title">Kinetic Controls</h3>

        <!-- Angular Stepping Actions -->
        <div class="control-group">
          <label class="group-label">Step Rotations</label>
          <div class="actions-grid">
            <button type="button" class="btn btn-action" @click="triggerRotate(90)" v-ripple>
              +90° CW
            </button>
            <button type="button" class="btn btn-action" @click="triggerRotate(-90)" v-ripple>
              -90° CCW
            </button>
            <button type="button" class="btn btn-action" @click="triggerRotate(180)" v-ripple>
              +180° Flip
            </button>
            <button
              type="button"
              class="btn btn-action highlight"
              @click="triggerRotate(450, '+450° (+360+90)')"
              v-ripple
              v-tooltip="'Test geodesic modular reduction: queues +360°+90°!'"
            >
              +450° (+360+90)
            </button>
            <button
              type="button"
              class="btn btn-action warning"
              @click="triggerSpam"
              v-ripple
              v-tooltip="'Sends 4 quick +90° bursts to test velocity preservation'"
            >
              ⚡ Spam 4x
            </button>
            <button type="button" class="btn btn-reset" @click="triggerReset" v-ripple>
              Reset (0°)
            </button>
          </div>
        </div>

        <!-- Duration / Speed Base Selector -->
        <div class="control-group">
          <label class="group-label">
            <span>Base Unit Duration (T)</span>
            <span class="unit-indicator">{{ (baseDuration / 1000).toFixed(1) }}s per 90°</span>
          </label>
          <div class="preset-pills">
            <button
              v-for="p in speedPresets"
              :key="p.duration"
              type="button"
              class="preset-pill"
              :class="{ active: baseDuration === p.duration }"
              @click="baseDuration = p.duration"
              v-ripple
            >
              {{ p.label }}
            </button>
          </div>
        </div>

        <!-- Shortest-Path Modular Switch -->
        <div class="control-group switch-group">
          <div class="switch-meta">
            <span class="switch-title">Modular Shortest-Path</span>
            <span class="switch-desc">
              When enabled, targets reduce modulo 360°. +450° smoothly decelerates into +90° along the shortest arc.
            </span>
          </div>
          <NanoSwitch v-model="isShortestPath" size="compact" color="cyan" />
        </div>
      </div>
    </div>

    <!-- Realtime Telemetry Graph -->
    <div class="telemetry-section">
      <div class="telemetry-header">
        <div class="title-wrap">
          <h3>Real-Time Kinematic Waveform</h3>
          <span class="telemetry-desc">Y = Angle (0°–360°), X = Rolling Time Buffer (rAF quantized discrete frames)</span>
        </div>
        <div class="legend-wrap">
          <span class="legend-item target">
            <span class="legend-line dashed"></span> Target Input
          </span>
          <span class="legend-item actual">
            <span class="legend-line solid"></span> Actual Angle
          </span>
          <span class="legend-item dots">
            <span class="legend-dot"></span> rAF Quantized Ticks
          </span>
        </div>
      </div>

      <!-- Waveform SVG Container -->
      <div class="waveform-card">
        <svg :viewBox="`0 0 ${svgWidth} ${svgHeight}`" class="telemetry-svg">
          <!-- Horizontal 90° Grid Lines -->
          <g class="grid-lines">
            <line :x1="padding.left" :y1="mapAngleToY(0)" :x2="svgWidth - padding.right" :y2="mapAngleToY(0)" stroke="var(--nano-border-subtle, rgba(255,255,255,0.08))" stroke-width="1" />
            <line :x1="padding.left" :y1="mapAngleToY(90)" :x2="svgWidth - padding.right" :y2="mapAngleToY(90)" stroke="var(--nano-border-subtle, rgba(255,255,255,0.08))" stroke-width="1" stroke-dasharray="3 3" />
            <line :x1="padding.left" :y1="mapAngleToY(180)" :x2="svgWidth - padding.right" :y2="mapAngleToY(180)" stroke="var(--nano-border-subtle, rgba(255,255,255,0.08))" stroke-width="1" stroke-dasharray="3 3" />
            <line :x1="padding.left" :y1="mapAngleToY(270)" :x2="svgWidth - padding.right" :y2="mapAngleToY(270)" stroke="var(--nano-border-subtle, rgba(255,255,255,0.08))" stroke-width="1" stroke-dasharray="3 3" />
            <line :x1="padding.left" :y1="mapAngleToY(360)" :x2="svgWidth - padding.right" :y2="mapAngleToY(360)" stroke="var(--nano-border-subtle, rgba(255,255,255,0.08))" stroke-width="1" />
          </g>

          <!-- Y-Axis Labels -->
          <g class="axis-labels" font-family="monospace" font-size="10" fill="var(--nano-text-muted, #94a3b8)">
            <text :x="padding.left - 8" :y="mapAngleToY(360) + 4" text-anchor="end">360°</text>
            <text :x="padding.left - 8" :y="mapAngleToY(270) + 4" text-anchor="end">270°</text>
            <text :x="padding.left - 8" :y="mapAngleToY(180) + 4" text-anchor="end">180°</text>
            <text :x="padding.left - 8" :y="mapAngleToY(90) + 4" text-anchor="end">90°</text>
            <text :x="padding.left - 8" :y="mapAngleToY(0) + 4" text-anchor="end">0°</text>
          </g>

          <!-- Vertical Click Markers -->
          <g class="click-markers" v-for="(marker, idx) in activeMarkers" :key="idx">
            <line :x1="marker.x" :y1="padding.top" :x2="marker.x" :y2="svgHeight - padding.bottom" stroke="var(--nano-accent-secondary, #ec4899)" stroke-width="1.2" stroke-dasharray="2 4" opacity="0.8" />
            <text :x="marker.x + 3" :y="padding.top + 12" font-family="monospace" font-size="9" font-weight="700" fill="var(--nano-accent-secondary, #ec4899)">
              {{ marker.label }}
            </text>
          </g>

          <!-- Target Trajectory (Dashed step) -->
          <path :d="targetPathD" fill="none" stroke="var(--nano-accent-secondary, #ec4899)" stroke-width="1.8" stroke-dasharray="4 4" opacity="0.85" />

          <!-- Smooth Actual Kinetic Trajectory (Neon Curve) -->
          <path :d="actualPathD" fill="none" stroke="var(--nano-state-active, #00f2fe)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

          <!-- Discrete Evaluation Frame Dots (rAF quantization) -->
          <g class="tick-dots">
            <circle
              v-for="(dot, dIdx) in recentTicks"
              :key="dIdx"
              :cx="dot.x"
              :cy="dot.y"
              r="2"
              fill="var(--nano-state-active, #00f2fe)"
              opacity="0.7"
            />
          </g>

          <!-- Current Live Position Reticle -->
          <g v-if="historySamples.length > 0">
            <circle
              :cx="padding.left + plotWidth"
              :cy="mapAngleToY(normalizedAngle)"
              r="6"
              fill="var(--nano-state-active, #00f2fe)"
            />
            <circle
              :cx="padding.left + plotWidth"
              :cy="mapAngleToY(normalizedAngle)"
              r="11"
              fill="none"
              stroke="var(--nano-state-active, #00f2fe)"
              stroke-width="1.5"
              opacity="0.5"
            />
          </g>
        </svg>

        <!-- Live Telemetry Footer Bar -->
        <div class="waveform-footer">
          <div class="foot-col">
            <span class="foot-lbl">Instantaneous Angle</span>
            <span class="foot-val font-mono">{{ currentAngle.toFixed(1) }}° (mod {{ Math.round(normalizedAngle) }}°)</span>
          </div>
          <div class="foot-col">
            <span class="foot-lbl">Initial Velocity (v₀)</span>
            <span class="foot-val font-mono">{{ initialV0.toFixed(3) }}</span>
          </div>
          <div class="foot-col">
            <span class="foot-lbl">Angular Speed</span>
            <span class="foot-val font-mono">{{ Math.abs(velocity).toFixed(1) }}°/s</span>
          </div>
          <div class="foot-col">
            <span class="foot-lbl">C¹ Spline Continuity</span>
            <span class="foot-val font-mono verified">✓ ACTIVE</span>
          </div>
        </div>
      </div>
    </div>

    <!-- API Reference -->
    <h3 class="section-title">API Reference</h3>
    <div class="api-reference">
      <pre><code>// Props
modelValue: Number (default: 0) - Target angle in degrees (v-model support)
duration: Number (default: 1000) - Base duration in ms per 90° step
speedMultiplier: Number (default: 1) - Time multiplier (e.g. 0.5 = 2x slower)
step: Number (default: 90) - Angular step quantum in degrees
shortestPath: Boolean (default: true) - Geodesic modulo 360° path optimization
size: Number | String (default: 260) - Width/height dimension

// Slots
default - Content to rotate. Receives { currentAngle, targetAngle, normalizedAngle, velocity, isMoving, progress }

// Exposed Methods (ref)
rotateBy(delta: Number) - Increment target by delta degrees with continuous velocity chaining
setAngle(deg: Number) - Set absolute target orientation
reset() - Immediate reset to 0°
currentAngle - Reactive continuous angle ref
velocity - Reactive angular speed ref (deg/sec)
isMoving - Boolean motion status ref

// Events
@update:modelValue - Emits settled target angle
@change - Emits new target whenever commanded
@settled - Emitted when movement completes: { angle, normalizedAngle }
@frame - Emitted on every rAF tick with live kinematic telemetry</code></pre>
    </div>
  </div>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: var(--nano-space-lg, 24px);
  max-width: 900px;
}

.header-section h2 {
  color: var(--nano-text-main);
  margin: 0 0 8px 0;
}

.desc {
  color: var(--nano-text-muted);
  font-size: 0.95rem;
  line-height: var(--nano-line-height-base, 1.5);
  margin: 0;
}

/* Stage Layout */
.stage-container {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: var(--nano-space-md, 16px);
}

@media (max-width: 768px) {
  .stage-container {
    grid-template-columns: 1fr;
  }
}

.rotator-stage-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: var(--nano-space-md, 16px);
  padding: var(--nano-space-lg, 24px);
  background: var(--nano-bg-card-elevated, rgba(16, 22, 34, 0.9));
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.12));
  border-radius: var(--nano-radius-lg, 16px);
  box-shadow: var(--nano-shadow-elevated, 0 8px 24px -6px rgba(0, 0, 0, 0.35));
}

.visual-tabs {
  display: flex;
  gap: 6px;
  background: var(--nano-bg-input, rgba(0, 0, 0, 0.25));
  padding: 4px;
  border-radius: var(--nano-radius-full, 9999px);
  border: 1px solid var(--nano-border-subtle, rgba(255, 255, 255, 0.08));
}

.tab-btn {
  background: transparent;
  border: none;
  color: var(--nano-text-muted, #94a3b8);
  font-size: 0.78rem;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: var(--nano-radius-full, 9999px);
  cursor: pointer;
  outline: none !important;
  user-select: none;
  -webkit-user-select: none;
  transition: var(--nano-transition-interactive, all 150ms cubic-bezier(0.4, 0, 0.2, 1));
}

.tab-btn:hover {
  color: var(--nano-text-main, #ffffff);
  background: var(--nano-bg-hover, rgba(255, 255, 255, 0.08));
}

.tab-btn.active {
  background: var(--nano-accent-primary, #6366f1);
  color: #ffffff;
}

.rotator-viewport {
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.angle-badge-strip {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 8px 12px;
  border-radius: var(--nano-radius-md, 8px);
  background: var(--nano-bg-input, rgba(0, 0, 0, 0.25));
  border: 1px solid var(--nano-border-subtle, rgba(255, 255, 255, 0.08));
}

.badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.badge-label {
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--nano-text-muted, #94a3b8);
  letter-spacing: 0.5px;
}

.badge-val {
  font-family: var(--font-mono, monospace);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--nano-text-main, #ffffff);
}

.badge-val.active {
  color: var(--nano-state-active, #00f2fe);
}

.badge-val.target {
  color: var(--nano-accent-secondary, #ec4899);
}

.badge-val.status {
  font-size: 0.72rem;
  color: #10b981;
}

.badge-val.status.moving {
  color: #f59e0b;
}

.badge-divider {
  width: 1px;
  height: 20px;
  background: var(--nano-border-subtle, rgba(255, 255, 255, 0.08));
}

/* Controls Panel */
.controls-card {
  display: flex;
  flex-direction: column;
  gap: var(--nano-space-md, 16px);
  padding: var(--nano-space-lg, 24px);
  background: var(--nano-bg-card, rgba(16, 22, 34, 0.7));
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.12));
  border-radius: var(--nano-radius-lg, 16px);
}

.panel-title {
  margin: 0;
  color: var(--nano-text-main, #ffffff);
  font-size: 1.1rem;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-label {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--nano-text-muted, #94a3b8);
}

.unit-indicator {
  font-family: var(--font-mono, monospace);
  color: var(--nano-state-active, #00f2fe);
  font-size: 0.75rem;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

@media (max-width: 500px) {
  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.btn {
  font-family: var(--font-mono, monospace);
  font-size: 0.8rem;
  font-weight: 700;
  padding: 10px 12px;
  border-radius: var(--nano-radius-md, 8px);
  cursor: pointer;
  outline: none !important;
  user-select: none;
  -webkit-user-select: none;
  transition: var(--nano-transition-interactive, all 150ms cubic-bezier(0.4, 0, 0.2, 1));
}

.btn-action {
  background: var(--nano-bg-input, rgba(0, 0, 0, 0.3));
  color: var(--nano-text-main, #ffffff);
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.15));
}

.btn-action:hover {
  background: var(--nano-bg-hover, rgba(255, 255, 255, 0.1));
  border-color: var(--nano-accent-primary, #6366f1);
}

.btn-action.highlight {
  border-color: var(--nano-state-active, #00f2fe);
  color: var(--nano-state-active, #00f2fe);
  background: rgba(0, 242, 254, 0.08);
}

.btn-action.highlight:hover {
  background: rgba(0, 242, 254, 0.16);
}

.btn-action.warning {
  border-color: #f59e0b;
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.08);
}

.btn-action.warning:hover {
  background: rgba(245, 158, 11, 0.16);
}

.btn-reset {
  background: transparent;
  color: var(--nano-text-muted, #94a3b8);
  border: 1px solid var(--nano-border-subtle, rgba(255, 255, 255, 0.1));
}

.btn-reset:hover {
  color: #ef4444;
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

/* Preset Pills */
.preset-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset-pill {
  flex: 1;
  min-width: 60px;
  background: var(--nano-bg-input, rgba(0, 0, 0, 0.25));
  border: 1px solid var(--nano-border-subtle, rgba(255, 255, 255, 0.1));
  color: var(--nano-text-muted, #94a3b8);
  font-family: var(--font-mono, monospace);
  font-size: 0.74rem;
  font-weight: 700;
  padding: 6px 8px;
  border-radius: var(--nano-radius-md, 8px);
  cursor: pointer;
  outline: none !important;
  user-select: none;
  -webkit-user-select: none;
  text-align: center;
  transition: var(--nano-transition-interactive, all 150ms cubic-bezier(0.4, 0, 0.2, 1));
}

.preset-pill:hover {
  color: var(--nano-text-main, #ffffff);
  background: var(--nano-bg-hover, rgba(255, 255, 255, 0.08));
}

.preset-pill.active {
  background: var(--nano-accent-primary, #6366f1);
  border-color: var(--nano-accent-primary, #6366f1);
  color: #ffffff;
}

.switch-group {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--nano-border-subtle, rgba(255, 255, 255, 0.08));
}

.switch-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-right: 16px;
}

.switch-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--nano-text-main, #ffffff);
}

.switch-desc {
  font-size: 0.74rem;
  color: var(--nano-text-muted, #94a3b8);
  line-height: var(--nano-line-height-tight, 1.25);
}

/* Telemetry Section */
.telemetry-section {
  display: flex;
  flex-direction: column;
  gap: var(--nano-space-sm, 8px);
}

.telemetry-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}

.telemetry-header h3 {
  margin: 0 0 4px 0;
  color: var(--nano-text-main, #ffffff);
}

.telemetry-desc {
  font-size: 0.8rem;
  color: var(--nano-text-muted, #94a3b8);
}

.legend-wrap {
  display: flex;
  align-items: center;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--nano-text-muted, #94a3b8);
}

.legend-line {
  display: inline-block;
  width: 18px;
  height: 2px;
}

.legend-line.solid {
  background: var(--nano-state-active, #00f2fe);
}

.legend-line.dashed {
  background: repeating-linear-gradient(90deg, var(--nano-accent-secondary, #ec4899), var(--nano-accent-secondary, #ec4899) 4px, transparent 4px, transparent 8px);
}

.legend-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--nano-state-active, #00f2fe);
}

.waveform-card {
  display: flex;
  flex-direction: column;
  background: var(--nano-bg-card, rgba(16, 22, 34, 0.7));
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.12));
  border-radius: var(--nano-radius-lg, 16px);
  overflow: hidden;
  box-shadow: var(--nano-shadow-card, 0 4px 16px rgba(0, 0, 0, 0.3));
}

.telemetry-svg {
  width: 100%;
  height: 220px;
  display: block;
}

.waveform-footer {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 12px 20px;
  background: var(--nano-bg-input, rgba(0, 0, 0, 0.25));
  border-top: 1px solid var(--nano-border-subtle, rgba(255, 255, 255, 0.08));
  gap: 12px;
}

@media (max-width: 640px) {
  .waveform-footer {
    grid-template-columns: repeat(2, 1fr);
  }
}

.foot-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.foot-lbl {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--nano-text-muted, #94a3b8);
  letter-spacing: 0.5px;
}

.foot-val {
  font-size: 0.82rem;
  color: var(--nano-text-main, #ffffff);
}

.foot-val.verified {
  color: #10b981;
  font-weight: 700;
}

.font-mono {
  font-family: var(--font-mono, monospace);
}

/* API Reference */
.section-title {
  color: var(--nano-text-main, #ffffff);
  margin: var(--nano-space-md, 16px) 0 0 0;
}

.api-reference {
  padding: var(--nano-space-md, 16px);
  border-radius: var(--nano-radius-md, 8px);
  background: var(--nano-bg-code, #0f172a);
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.12));
}

.api-reference pre {
  margin: 0;
  padding: 0;
  background: transparent;
}

.api-reference code {
  display: block;
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--nano-text-code, #e2e8f0);
}
</style>
