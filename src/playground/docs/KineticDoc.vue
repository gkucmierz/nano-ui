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
const timingMode = ref('proportional'); // 'proportional' | 'fixed'
const inertiaThreshold = ref(0.25); // seconds of momentum bias

// Units state: 'deg' | 'rad' | 'turn'
const selectedUnit = ref('deg');

// Waveform channels visibility
const showAngle = ref(true);
const showVelocity = ref(true);
const showAcceleration = ref(true);

// Realtime Telemetry state
const currentAngle = ref(0);
const targetAngle = ref(0);
const velocity = ref(0);
const acceleration = ref(0);
const isMoving = ref(false);
const initialV0 = ref(0);
const clickEvents = ref([]);

// Motion timing tracking
const motionStartTime = ref(null);
const liveElapsedSec = ref(0);

// Rolling buffer for waveform graph
const MAX_SAMPLES = 200;
const historySamples = ref([]);

// Speed base presets (duration in ms for 90deg, from 4x to 1/4x)
const speedPresets = [
  { label: '0.25s (4x)', duration: 250 },
  { label: '0.5s (2x)', duration: 500 },
  { label: '1s (1x)', duration: 1000 },
  { label: '2s (1/2x)', duration: 2000 },
  { label: '4s (1/4x)', duration: 4000 }
];

const normalizedAngle = computed(() => {
  return ((currentAngle.value % 360) + 360) % 360;
});

const normalizedTarget = computed(() => {
  return ((targetAngle.value % 360) + 360) % 360;
});

const cumulativeTurns = computed(() => {
  return targetAngle.value / 360;
});

// Unit conversion helpers
const formatAngle = (deg, unit = selectedUnit.value, decimals = 1) => {
  if (unit === 'rad') {
    const rad = (deg * Math.PI) / 180;
    return `${rad.toFixed(decimals + 1)} rad`;
  }
  if (unit === 'turn') {
    const turn = deg / 360;
    return `${turn.toFixed(decimals + 1)} turn`;
  }
  return `${deg.toFixed(decimals)}°`;
};

const formatVelocity = (degPerSec, unit = selectedUnit.value, decimals = 0) => {
  if (unit === 'rad') {
    const rad = (degPerSec * Math.PI) / 180;
    return `${rad.toFixed(1)} rad/s`;
  }
  if (unit === 'turn') {
    const turn = degPerSec / 360;
    return `${turn.toFixed(2)} turn/s`;
  }
  return `${degPerSec.toFixed(decimals)}°/s`;
};

const formatAcceleration = (degPerSec2, unit = selectedUnit.value, decimals = 0) => {
  if (unit === 'rad') {
    const rad = (degPerSec2 * Math.PI) / 180;
    return `${rad.toFixed(1)} rad/s²`;
  }
  if (unit === 'turn') {
    const turn = degPerSec2 / 360;
    return `${turn.toFixed(2)} turn/s²`;
  }
  return `${degPerSec2.toFixed(decimals)}°/s²`;
};

// Telemetry frame handler emitted by KineticRotator on each rAF
const onKineticFrame = (data) => {
  currentAngle.value = data.currentAngle;
  targetAngle.value = data.targetAngle;
  velocity.value = data.velocity;
  acceleration.value = data.acceleration || 0;
  isMoving.value = data.isMoving;
  initialV0.value = data.v0;

  if (data.isMoving) {
    if (motionStartTime.value === null) {
      motionStartTime.value = data.timestamp;
    }
    liveElapsedSec.value = Math.max(0, (data.timestamp - motionStartTime.value) / 1000);
  } else {
    // Settled: reset timer to 0 so it doesn't run to infinity
    motionStartTime.value = null;
    liveElapsedSec.value = 0;
  }

  const sample = {
    time: data.timestamp,
    angle: ((data.currentAngle % 360) + 360) % 360,
    target: ((data.targetAngle % 360) + 360) % 360,
    rawAngle: data.currentAngle,
    rawTarget: data.targetAngle,
    vel: data.velocity,
    acc: data.acceleration || 0,
    isMoving: data.isMoving
  };

  historySamples.value.push(sample);
  if (historySamples.value.length > MAX_SAMPLES) {
    historySamples.value.shift();
  }
};

const onSettled = () => {
  motionStartTime.value = null;
  liveElapsedSec.value = 0;
};

// Record click event for timeline markers
const registerClickEvent = (label) => {
  const now = performance.now();
  if (!isMoving.value || motionStartTime.value === null) {
    motionStartTime.value = now;
  }
  const relTime = Math.max(0, (now - motionStartTime.value) / 1000);
  clickEvents.value.push({
    time: now,
    relTime,
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
  motionStartTime.value = null;
  liveElapsedSec.value = 0;
};

// SVG Telemetry Graph rendering math
const svgWidth = 720;
const svgHeight = 240;
const padding = { top: 24, right: 65, bottom: 32, left: 65 };
const plotWidth = svgWidth - padding.left - padding.right;
const plotHeight = svgHeight - padding.top - padding.bottom;

// Left Y maps 0° at bottom (plotHeight) to 360° at top (0)
const mapAngleToY = (deg) => {
  return padding.top + (1 - deg / 360) * plotHeight;
};

// Dynamic scale limits for velocity and acceleration
const maxVel = computed(() => {
  const maxSample = historySamples.value.reduce((acc, p) => Math.max(acc, Math.abs(p.vel || 0)), 0);
  return Math.max(360, Math.ceil(maxSample / 180) * 180);
});

const maxAcc = computed(() => {
  const maxSample = historySamples.value.reduce((acc, p) => Math.max(acc, Math.abs(p.acc || 0)), 0);
  return Math.max(1200, Math.ceil(maxSample / 600) * 600);
});

const mapVelToY = (v) => {
  const norm = Math.max(-1, Math.min(1, v / maxVel.value));
  return padding.top + (0.5 - norm * 0.5) * plotHeight;
};

const mapAccToY = (a) => {
  const norm = Math.max(-1, Math.min(1, a / maxAcc.value));
  return padding.top + (0.5 - norm * 0.5) * plotHeight;
};

// Y-Axis Ticks according to selected unit
const yAxisTicks = computed(() => {
  if (selectedUnit.value === 'rad') {
    return [
      { deg: 360, label: '2π rad' },
      { deg: 270, label: '1.5π' },
      { deg: 180, label: 'π' },
      { deg: 90, label: '0.5π' },
      { deg: 0, label: '0 rad' }
    ];
  }
  if (selectedUnit.value === 'turn') {
    return [
      { deg: 360, label: '1.0 turn' },
      { deg: 270, label: '0.75' },
      { deg: 180, label: '0.50' },
      { deg: 90, label: '0.25' },
      { deg: 0, label: '0.0 turn' }
    ];
  }
  return [
    { deg: 360, label: '360°' },
    { deg: 270, label: '270°' },
    { deg: 180, label: '180°' },
    { deg: 90, label: '90°' },
    { deg: 0, label: '0°' }
  ];
});

// Generate SVG polyline paths
const actualPathD = computed(() => {
  const pts = historySamples.value;
  if (pts.length < 2) return '';

  let d = '';
  for (let i = 0; i < pts.length; i++) {
    const x = padding.left + (i / (MAX_SAMPLES - 1)) * plotWidth;
    const y = mapAngleToY(pts[i].angle);
    if (i === 0) {
      d += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    } else {
      const prev = pts[i - 1];
      if (Math.abs(pts[i].angle - prev.angle) > 180) {
        d += ` M ${x.toFixed(1)} ${y.toFixed(1)}`;
      } else {
        d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
    }
  }
  return d;
});

const targetPathD = computed(() => {
  const pts = historySamples.value;
  if (pts.length < 2) return '';

  let d = '';
  for (let i = 0; i < pts.length; i++) {
    const x = padding.left + (i / (MAX_SAMPLES - 1)) * plotWidth;
    const y = mapAngleToY(pts[i].target);
    if (i === 0) {
      d += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    } else {
      const prev = pts[i - 1];
      if (Math.abs(pts[i].target - prev.target) > 180) {
        d += ` M ${x.toFixed(1)} ${y.toFixed(1)}`;
      } else {
        d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
    }
  }
  return d;
});

const velPathD = computed(() => {
  const pts = historySamples.value;
  if (pts.length < 2) return '';

  return pts.map((pt, idx) => {
    const x = padding.left + (idx / (MAX_SAMPLES - 1)) * plotWidth;
    const y = mapVelToY(pt.vel || 0);
    return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
});

const accPathD = computed(() => {
  const pts = historySamples.value;
  if (pts.length < 2) return '';

  return pts.map((pt, idx) => {
    const x = padding.left + (idx / (MAX_SAMPLES - 1)) * plotWidth;
    const y = mapAccToY(pt.acc || 0);
    return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
});

// Discrete tick dots on recent points
const recentTicks = computed(() => {
  const pts = historySamples.value;
  if (pts.length === 0) return [];
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

// Click markers locked to the exact sample frame index in the rolling buffer
const activeMarkers = computed(() => {
  const pts = historySamples.value;
  if (pts.length < 2) return [];

  return clickEvents.value
    .map(c => {
      // Find the closest sample index to when the click occurred
      let closestIdx = -1;
      let minDiff = Infinity;
      for (let i = 0; i < pts.length; i++) {
        const diff = Math.abs(pts[i].time - c.time);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      // Only show marker if within the current buffer time range
      if (closestIdx === -1 || (minDiff > 200 && (c.time < pts[0].time || c.time > pts[pts.length - 1].time))) {
        return null;
      }

      const x = padding.left + (closestIdx / (MAX_SAMPLES - 1)) * plotWidth;
      return { x, label: c.label };
    })
    .filter(Boolean);
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
        acceleration: 0,
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
            :timing-mode="timingMode"
            :inertia-threshold="inertiaThreshold"
            :size="240"
            @frame="onKineticFrame"
            @settled="onSettled"
          >
            <InstaCatCanvas v-if="activeVisual === 'cat'" :size="240" />
            <NanoBanana v-else-if="activeVisual === 'banana'" :size="240" />
            <NanoLogoCard v-else-if="activeVisual === 'logo'" :size="240" />
          </KineticRotator>
        </div>

        <!-- Live Telemetry Matrix (2x2 Grid + Fixed Status Bar) -->
        <div class="telemetry-box">
          <div class="telemetry-matrix">
            <div class="matrix-cell">
              <span class="matrix-lbl">CURRENT</span>
              <span class="matrix-val active">{{ formatAngle(normalizedAngle, selectedUnit, 1) }}</span>
            </div>
            <div class="matrix-cell">
              <span class="matrix-lbl">TARGET</span>
              <span class="matrix-val target">{{ formatAngle(normalizedTarget, selectedUnit, 1) }}</span>
            </div>
            <div class="matrix-cell">
              <span class="matrix-lbl">VELOCITY (ω)</span>
              <span class="matrix-val vel">{{ formatVelocity(velocity, selectedUnit, 1) }}</span>
            </div>
            <div class="matrix-cell">
              <span class="matrix-lbl">ACCEL (α)</span>
              <span class="matrix-val acc">{{ formatAcceleration(acceleration, selectedUnit, 0) }}</span>
            </div>
          </div>

          <!-- Fixed Status & Revolutions Bar -->
          <div class="stage-status-bar">
            <div class="status-left">
              <span class="status-pulse-dot" :class="{ moving: isMoving }"></span>
              <span class="status-text font-mono" :class="{ moving: isMoving }">
                {{ isMoving ? `IN MOTION (+${liveElapsedSec.toFixed(2)}s)` : 'SETTLED (0.00s)' }}
              </span>
            </div>
            <div class="status-right font-mono" v-if="!isShortestPath && Math.abs(targetAngle) >= 360">
              <span class="cum-turns-pill">{{ cumulativeTurns.toFixed(2) }} turns</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Controls Panel -->
      <div class="controls-card">
        <h3 class="panel-title">Kinetic Controls</h3>

        <!-- Angular Units Switcher -->
        <div class="control-group">
          <label class="group-label">
            <span>Angular Units</span>
            <span class="unit-indicator">{{ selectedUnit.toUpperCase() }}</span>
          </label>
          <div class="preset-pills">
            <button
              type="button"
              class="preset-pill"
              :class="{ active: selectedUnit === 'deg' }"
              @click="selectedUnit = 'deg'"
              v-ripple
            >
              Degrees (°)
            </button>
            <button
              type="button"
              class="preset-pill"
              :class="{ active: selectedUnit === 'rad' }"
              @click="selectedUnit = 'rad'"
              v-ripple
            >
              Radians (rad)
            </button>
            <button
              type="button"
              class="preset-pill"
              :class="{ active: selectedUnit === 'turn' }"
              @click="selectedUnit = 'turn'"
              v-ripple
            >
              Turns (turn)
            </button>
          </div>
        </div>

        <!-- Timing Mode Switcher -->
        <div class="control-group">
          <label class="group-label">
            <span>Timing Mode</span>
            <span class="unit-indicator">{{ timingMode === 'fixed' ? 'T = const' : 'v ~ const' }}</span>
          </label>
          <div class="preset-pills">
            <button
              type="button"
              class="preset-pill"
              :class="{ active: timingMode === 'proportional' }"
              @click="timingMode = 'proportional'"
              v-ripple
            >
              Proportional (v ~ const)
            </button>
            <button
              type="button"
              class="preset-pill"
              :class="{ active: timingMode === 'fixed' }"
              @click="timingMode = 'fixed'"
              v-ripple
            >
              Fixed (T = const)
            </button>
          </div>
        </div>

        <!-- Angular Stepping Actions -->
        <div class="control-group">
          <label class="group-label">Step Rotations</label>
          <div class="actions-grid">
            <button type="button" class="btn btn-action" @click="triggerRotate(90, '+90°')" v-ripple>
              {{ selectedUnit === 'turn' ? '+0.25 turn' : selectedUnit === 'rad' ? '+0.5π rad' : '+90° CW' }}
            </button>
            <button type="button" class="btn btn-action" @click="triggerRotate(-90, '-90°')" v-ripple>
              {{ selectedUnit === 'turn' ? '-0.25 turn' : selectedUnit === 'rad' ? '-0.5π rad' : '-90° CCW' }}
            </button>
            <button type="button" class="btn btn-action" @click="triggerRotate(180, '+180°')" v-ripple>
              {{ selectedUnit === 'turn' ? '+0.50 turn' : selectedUnit === 'rad' ? '+π rad' : '+180° Flip' }}
            </button>
            <button
              type="button"
              class="btn btn-action highlight"
              @click="triggerRotate(450, '+450° (+1.25t)')"
              v-ripple
            >
              {{ selectedUnit === 'turn' ? '+1.25 turn' : selectedUnit === 'rad' ? '+2.5π rad' : '+450° (+360+90)' }}
            </button>
            <button
              type="button"
              class="btn btn-action warning"
              @click="triggerSpam"
              v-ripple
            >
              ⚡ Spam 4x
            </button>
            <button type="button" class="btn btn-reset" @click="triggerReset" v-ripple>
              ↺ Reset
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

        <!-- Inertia Reversal Threshold -->
        <div class="control-group" v-if="isShortestPath">
          <label class="group-label">
            <span>Inertia Reversal Threshold</span>
            <span class="unit-indicator">{{ inertiaThreshold > 0 ? `${inertiaThreshold}s` : 'Disabled (Strict)' }}</span>
          </label>
          <div class="preset-pills">
            <button
              type="button"
              class="preset-pill"
              :class="{ active: inertiaThreshold === 0 }"
              @click="inertiaThreshold = 0"
              v-ripple
            >
              0.0s (Strict)
            </button>
            <button
              type="button"
              class="preset-pill"
              :class="{ active: inertiaThreshold === 0.15 }"
              @click="inertiaThreshold = 0.15"
              v-ripple
            >
              0.15s
            </button>
            <button
              type="button"
              class="preset-pill"
              :class="{ active: inertiaThreshold === 0.25 }"
              @click="inertiaThreshold = 0.25"
              v-ripple
            >
              0.25s (Default)
            </button>
            <button
              type="button"
              class="preset-pill"
              :class="{ active: inertiaThreshold === 0.4 }"
              @click="inertiaThreshold = 0.4"
              v-ripple
            >
              0.40s (High)
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Realtime Telemetry Graph -->
    <div class="telemetry-section">
      <div class="telemetry-header">
        <div class="title-wrap">
          <h3>Real-Time Kinematic Waveform</h3>
          <span class="telemetry-desc">
            Left Y = Angle θ ({{ selectedUnit }}), Right Y = Velocity ω & Accel α, X = Rolling Time Buffer
          </span>
        </div>
        <div class="legend-wrap">
          <label class="legend-channel">
            <input type="checkbox" v-model="showAngle" class="channel-check" />
            <span class="legend-line solid cyan"></span>
            <span class="ch-name">Angle θ</span>
          </label>
          <label class="legend-channel">
            <input type="checkbox" v-model="showVelocity" class="channel-check" />
            <span class="legend-line solid emerald"></span>
            <span class="ch-name">Velocity ω</span>
          </label>
          <label class="legend-channel">
            <input type="checkbox" v-model="showAcceleration" class="channel-check" />
            <span class="legend-line dashed amber"></span>
            <span class="ch-name">Accel α</span>
          </label>
          <span class="legend-item target">
            <span class="legend-line dashed pink"></span> Target
          </span>
        </div>
      </div>

      <!-- Waveform SVG Container -->
      <div class="waveform-card">
        <svg :viewBox="`0 0 ${svgWidth} ${svgHeight}`" class="telemetry-svg">
          <!-- Horizontal Grid Lines based on yAxisTicks -->
          <g class="grid-lines">
            <line
              v-for="tick in yAxisTicks"
              :key="tick.deg"
              :x1="padding.left"
              :y1="mapAngleToY(tick.deg)"
              :x2="svgWidth - padding.right"
              :y2="mapAngleToY(tick.deg)"
              stroke="var(--nano-border-subtle, rgba(255,255,255,0.08))"
              :stroke-width="tick.deg === 0 || tick.deg === 360 ? 1.2 : 0.8"
              :stroke-dasharray="tick.deg === 0 || tick.deg === 360 ? 'none' : '3 3'"
            />
            <!-- Zero reference line for velocity & acceleration -->
            <line
              v-if="showVelocity || showAcceleration"
              class="zero-ref-line"
              :x1="padding.left"
              :y1="padding.top + 0.5 * plotHeight"
              :x2="svgWidth - padding.right"
              :y2="padding.top + 0.5 * plotHeight"
              stroke="rgba(16, 185, 129, 0.3)"
              stroke-width="1"
              stroke-dasharray="2 4"
            />
          </g>

          <!-- Left Y-Axis Labels (Angle θ) -->
          <g class="axis-labels" font-family="monospace" font-size="10" fill="var(--nano-text-muted, #94a3b8)">
            <text
              v-for="tick in yAxisTicks"
              :key="tick.deg"
              :x="padding.left - 8"
              :y="mapAngleToY(tick.deg) + 4"
              text-anchor="end"
            >
              {{ tick.label }}
            </text>
          </g>

          <!-- Right Y-Axis Labels (Velocity ω scale) -->
          <g v-if="showVelocity" class="axis-labels axis-vel-labels" font-family="monospace" font-size="9" fill="#10b981">
            <text :x="svgWidth - padding.right + 8" :y="padding.top + 10" text-anchor="start">
              +{{ formatVelocity(maxVel, selectedUnit, 0) }}
            </text>
            <text :x="svgWidth - padding.right + 8" :y="padding.top + 0.5 * plotHeight + 3" text-anchor="start">
              0
            </text>
            <text :x="svgWidth - padding.right + 8" :y="svgHeight - padding.bottom" text-anchor="start">
              -{{ formatVelocity(maxVel, selectedUnit, 0) }}
            </text>
          </g>

          <!-- Vertical Click Markers (Dirac Impulses) with Captured Timestamp -->
          <g class="click-markers" v-for="(marker, idx) in activeMarkers" :key="idx">
            <line
              :x1="marker.x"
              :y1="padding.top"
              :x2="marker.x"
              :y2="svgHeight - padding.bottom"
              stroke="var(--nano-accent-secondary, #ec4899)"
              stroke-width="1.2"
              stroke-dasharray="2 4"
              opacity="0.85"
            />
            <text
              :x="marker.x + 3"
              :y="padding.top + 12"
              font-family="monospace"
              font-size="9"
              font-weight="700"
              fill="var(--nano-accent-secondary, #ec4899)"
            >
              {{ marker.label }}
            </text>
          </g>

          <!-- Target Trajectory (Dashed step) -->
          <path
            v-if="showAngle"
            :d="targetPathD"
            fill="none"
            stroke="var(--nano-accent-secondary, #ec4899)"
            stroke-width="1.8"
            stroke-dasharray="4 4"
            opacity="0.85"
          />

          <!-- Acceleration Curve (2nd Derivative, Amber) -->
          <path
            v-if="showAcceleration"
            :d="accPathD"
            fill="none"
            stroke="#f59e0b"
            stroke-width="1.8"
            stroke-dasharray="4 2"
            opacity="0.9"
            stroke-linecap="round"
          />

          <!-- Velocity Curve (1st Derivative, Emerald) -->
          <path
            v-if="showVelocity"
            :d="velPathD"
            fill="none"
            stroke="#10b981"
            stroke-width="2.2"
            opacity="0.95"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- Smooth Actual Kinetic Trajectory (Neon Curve, Cyan) -->
          <path
            v-if="showAngle"
            :d="actualPathD"
            fill="none"
            stroke="var(--nano-state-active, #00f2fe)"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- Discrete Evaluation Frame Dots (rAF quantization) -->
          <g v-if="showAngle" class="tick-dots">
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
          <g v-if="showAngle && historySamples.length > 0">
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
            <span class="foot-lbl">Instantaneous Angle θ</span>
            <span class="foot-val font-mono">
              {{ formatAngle(currentAngle, selectedUnit, 1) }}
              <span class="foot-sub">({{ formatAngle(normalizedAngle, selectedUnit, 1) }} mod)</span>
            </span>
          </div>
          <div class="foot-col">
            <span class="foot-lbl">Angular Velocity ω (θ')</span>
            <span class="foot-val font-mono vel-val">
              {{ formatVelocity(velocity, selectedUnit, 1) }}
            </span>
          </div>
          <div class="foot-col">
            <span class="foot-lbl">Angular Accel α (θ'')</span>
            <span class="foot-val font-mono acc-val">
              {{ formatAcceleration(acceleration, selectedUnit, 0) }}
            </span>
          </div>
          <div class="foot-col">
            <span class="foot-lbl">Cumulative Target</span>
            <span class="foot-val font-mono target-val">
              {{ cumulativeTurns.toFixed(2) }} turns ({{ formatAngle(targetAngle, selectedUnit, 0) }})
            </span>
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
timingMode: String (default: 'proportional') - 'proportional' (v ~ const, isokinetic) or 'fixed' (T = const, isochronous)
inertiaThreshold: Number (default: 0.25) - Momentum reversal avoidance threshold in seconds (0 to disable)
size: Number | String (default: 260) - Width/height dimension

// Slots
default - Content to rotate. Receives { currentAngle, targetAngle, normalizedAngle, velocity, acceleration, isMoving, progress }

// Exposed Methods (ref)
rotateBy(delta: Number) - Increment target by delta degrees with continuous velocity chaining
setAngle(deg: Number) - Set absolute target orientation
reset() - Immediate reset to 0°
currentAngle - Reactive continuous angle ref
velocity - Reactive angular speed ref (deg/sec)
acceleration - Reactive angular acceleration ref (deg/sec²)
isMoving - Boolean motion status ref

// Events
@update:modelValue - Emits settled target angle
@change - Emits new target whenever commanded
@settled - Emitted when movement completes: { angle, normalizedAngle }
@frame - Emitted on every rAF tick with live kinematic telemetry { currentAngle, targetAngle, velocity, acceleration, progress, isMoving, v0, timestamp }</code></pre>
    </div>

    <!-- Kinematic & Mathematical Foundations -->
    <h3 class="section-title">Kinematics & Smoothness Classes (Cᵏ)</h3>
    <div class="math-reference">
      <div class="math-table-container">
        <table class="math-table">
          <thead>
            <tr>
              <th>Funkcja / Sygnał</th>
              <th>Nazwa matematyczna</th>
              <th>Klasa gładkości</th>
              <th>Opis fizyczny & zachowanie</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div class="fn-badge">
                  <span class="dot-badge cyan"></span>
                  <strong>Kąt θ(t)</strong>
                </div>
              </td>
              <td>Funkcja ciągła i gładka</td>
              <td><span class="class-pill c1">C¹</span></td>
              <td>Ciągła na całej dziedzinie, bez skoków i teleportacji. Ciągła pierwsza pochodna (brak ostrych załamań).</td>
            </tr>
            <tr>
              <td>
                <div class="fn-badge">
                  <span class="dot-badge emerald"></span>
                  <strong>Prędkość ω(t)</strong>
                </div>
              </td>
              <td>Funkcja kawałkami gładka</td>
              <td><span class="class-pill c0">C⁰</span></td>
              <td>Ciągła, lecz w momentach impulsów posiada punkty nieróżniczkowalności (ostrza / załamania).</td>
            </tr>
            <tr>
              <td>
                <div class="fn-badge">
                  <span class="dot-badge amber"></span>
                  <strong>Przyspieszenie α(t)</strong>
                </div>
              </td>
              <td>Funkcja nieciągła (przedziałami ciągła)</td>
              <td><span class="class-pill disc">Skokowa</span></td>
              <td>Posiada nieciągłości skokowe I rodzaju (jump discontinuities). W momentach impulsów przyspieszenie zmienia się skokowo.</td>
            </tr>
            <tr>
              <td>
                <div class="fn-badge">
                  <span class="dot-badge pink"></span>
                  <strong>Cel θ_target(t)</strong>
                </div>
              </td>
              <td>Funkcja schodkowa</td>
              <td><span class="class-pill step">Heaviside</span></td>
              <td>Suma skoków jednostkowych Heaviside'a Θ(t). Zadana orientacja przeskakuje natychmiast o kwant kąta.</td>
            </tr>
            <tr>
              <td>
                <div class="fn-badge">
                  <span class="dot-badge purple"></span>
                  <strong>Zryw j(t) & Impulsy</strong>
                </div>
              </td>
              <td>Pochodna przyspieszenia / Impuls Diraca</td>
              <td><span class="class-pill dirac">δ(t)</span></td>
              <td>W punktach uskoków przyspieszenia zryw (jerk) dąży do nieskończoności, modelowany jako impulsy Diraca.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="timing-modes-grid">
        <div class="mode-card">
          <div class="mode-header">
            <span class="mode-badge">Proportional</span>
            <span class="mode-formula font-mono">v ≈ const (ω ≈ const)</span>
          </div>
          <p class="mode-desc">
            Ruch <strong>izokinetyczny</strong>. Czas trwania animacji skaluje się proporcjonalnie do odległości kątowej:
            <code class="font-mono">T ∝ |Δθ|</code>. Prędkość kątowa pozostaje stała, więc dłuższy obrót trwa odpowiednio dłużej.
          </p>
        </div>
        <div class="mode-card">
          <div class="mode-header">
            <span class="mode-badge isochronous">Fixed Duration</span>
            <span class="mode-formula font-mono">T = const (1T)</span>
          </div>
          <p class="mode-desc">
            Ruch <strong>izochroniczny</strong>. Każdy impuls kończy się dokładnie po upływie stałego czasu bazowego:
            <code class="font-mono">t_end = now + T</code>. Prędkość kątowa skaluje się z dystansem:
            <code class="font-mono">ω ∝ |Δθ|</code>.
          </p>
        </div>
      </div>
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
  grid-template-columns: 340px 1fr;
  gap: var(--nano-space-md, 16px);
  align-items: start;
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
  justify-content: flex-start;
  gap: var(--nano-space-md, 16px);
  padding: var(--nano-space-lg, 24px);
  background: var(--nano-bg-card-elevated, rgba(16, 22, 34, 0.9));
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.12));
  border-radius: var(--nano-radius-lg, 16px);
  box-shadow: var(--nano-shadow-elevated, 0 8px 24px -6px rgba(0, 0, 0, 0.35));
  box-sizing: border-box;
}

.visual-tabs {
  height: 36px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--nano-bg-input, rgba(0, 0, 0, 0.25));
  padding: 4px;
  border-radius: var(--nano-radius-full, 9999px);
  border: 1px solid var(--nano-border-subtle, rgba(255, 255, 255, 0.08));
  flex-shrink: 0;
  box-sizing: border-box;
}

.tab-btn {
  background: transparent;
  border: none;
  color: var(--nano-text-muted, #94a3b8);
  font-size: 0.78rem;
  font-weight: 700;
  padding: 5px 12px;
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
  width: 260px;
  height: 260px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-sizing: border-box;
}

.telemetry-box {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.telemetry-matrix {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.matrix-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 10px;
  background: var(--nano-bg-input, rgba(0, 0, 0, 0.25));
  border: 1px solid var(--nano-border-subtle, rgba(255, 255, 255, 0.08));
  border-radius: var(--nano-radius-md, 8px);
}

.matrix-lbl {
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--nano-text-muted, #94a3b8);
  letter-spacing: 0.5px;
}

.matrix-val {
  font-family: var(--font-mono, monospace);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--nano-text-main, #ffffff);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.matrix-val.active {
  color: var(--nano-state-active, #00f2fe);
}

.matrix-val.target {
  color: var(--nano-accent-secondary, #ec4899);
}

.matrix-val.vel {
  color: #10b981;
}

.matrix-val.acc {
  color: #f59e0b;
}

.stage-status-bar {
  width: 100%;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  background: var(--nano-bg-input, rgba(0, 0, 0, 0.25));
  border: 1px solid var(--nano-border-subtle, rgba(255, 255, 255, 0.08));
  border-radius: var(--nano-radius-md, 8px);
  box-sizing: border-box;
  flex-shrink: 0;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  flex-shrink: 0;
}

.status-pulse-dot.moving {
  background: #f59e0b;
  box-shadow: 0 0 8px #f59e0b;
  animation: pulse 1s infinite alternate;
}

@keyframes pulse {
  from { opacity: 0.6; }
  to { opacity: 1; }
}

.status-text {
  font-size: 0.72rem;
  font-weight: 700;
  color: #10b981;
}

.status-text.moving {
  color: #f59e0b;
}

.cum-turns-pill {
  font-size: 0.7rem;
  font-weight: 700;
  color: #818cf8;
  background: rgba(99, 102, 241, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
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
  flex-wrap: wrap;
  gap: 14px;
}

.legend-channel {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--nano-text-muted, #94a3b8);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}

.channel-check {
  cursor: pointer;
  accent-color: var(--nano-accent-primary, #6366f1);
}

.ch-name {
  user-select: none;
  -webkit-user-select: none;
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

.legend-line.solid.cyan {
  background: var(--nano-state-active, #00f2fe);
}

.legend-line.solid.emerald {
  background: #10b981;
}

.legend-line.dashed.amber {
  background: repeating-linear-gradient(90deg, #f59e0b, #f59e0b 4px, transparent 4px, transparent 8px);
}

.legend-line.dashed.pink {
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
  height: 240px;
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

.foot-val.vel-val {
  color: #10b981;
  font-weight: 700;
}

.foot-val.acc-val {
  color: #f59e0b;
  font-weight: 700;
}

.foot-val.target-val {
  color: var(--nano-accent-secondary, #ec4899);
  font-weight: 700;
}

.foot-sub {
  font-size: 0.72rem;
  color: var(--nano-text-muted, #94a3b8);
  margin-left: 4px;
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
  overflow-x: auto;
}

.api-reference pre {
  margin: 0;
  padding: 0;
  background: transparent;
  white-space: pre-wrap;
  word-break: break-word;
}

.api-reference code {
  display: block;
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--nano-text-code, #e2e8f0);
}

/* Kinematics Math Reference Table */
.math-reference {
  display: flex;
  flex-direction: column;
  gap: var(--nano-space-md, 16px);
}

.math-table-container {
  overflow-x: auto;
  border-radius: var(--nano-radius-md, 8px);
  background: var(--nano-bg-code, #0f172a);
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.12));
}

.math-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
  text-align: left;
}

.math-table th {
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--nano-text-muted, #94a3b8);
  font-weight: 600;
  border-bottom: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.08));
  white-space: nowrap;
}

.math-table td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.05));
  color: var(--nano-text-main, #e2e8f0);
  vertical-align: middle;
}

.math-table tr:last-child td {
  border-bottom: none;
}

.fn-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.dot-badge {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-badge.cyan { background: var(--nano-state-active, #00f2fe); }
.dot-badge.emerald { background: #10b981; }
.dot-badge.amber { background: #f59e0b; }
.dot-badge.pink { background: var(--nano-accent-secondary, #ec4899); }
.dot-badge.purple { background: #a855f7; }

.class-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 9999px;
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.class-pill.c1 {
  background: rgba(0, 242, 254, 0.15);
  color: #00f2fe;
}

.class-pill.c0 {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.class-pill.disc {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.class-pill.step {
  background: rgba(236, 72, 153, 0.15);
  color: #ec4899;
}

.class-pill.dirac {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
}

.timing-modes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--nano-space-md, 16px);
}

.mode-card {
  padding: var(--nano-space-md, 16px);
  border-radius: var(--nano-radius-md, 8px);
  background: var(--nano-bg-code, #0f172a);
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.12));
}

.mode-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.mode-badge {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(99, 102, 241, 0.2);
  color: #818cf8;
}

.mode-badge.isochronous {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.mode-formula {
  font-size: 0.8rem;
  color: var(--nano-text-muted, #94a3b8);
}

.mode-desc {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.55;
  color: var(--nano-text-main, #e2e8f0);
}

.mode-desc code {
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: #00f2fe;
}

/* ==========================================================================
   Light Theme Enhancements (High Contrast & Crisp Soft Surfaces)
   ========================================================================== */
[data-theme="light"] .matrix-cell,
:root[data-theme="light"] .matrix-cell,
[data-theme="light"] .stage-status-bar,
:root[data-theme="light"] .stage-status-bar,
[data-theme="light"] .visual-tabs,
:root[data-theme="light"] .visual-tabs,
[data-theme="light"] .telemetry-foot,
:root[data-theme="light"] .telemetry-foot {
  background: #f8fafc;
  border-color: #e2e8f0;
}

[data-theme="light"] .matrix-lbl,
:root[data-theme="light"] .matrix-lbl {
  color: #64748b;
}

[data-theme="light"] .matrix-val,
:root[data-theme="light"] .matrix-val {
  color: #0f172a;
}

[data-theme="light"] .matrix-val.active,
:root[data-theme="light"] .matrix-val.active {
  color: #0284c7;
}

[data-theme="light"] .matrix-val.target,
:root[data-theme="light"] .matrix-val.target {
  color: #be185d;
}

[data-theme="light"] .matrix-val.vel,
:root[data-theme="light"] .matrix-val.vel {
  color: #047857;
}

[data-theme="light"] .matrix-val.acc,
:root[data-theme="light"] .matrix-val.acc {
  color: #b45309;
}

[data-theme="light"] .status-text,
:root[data-theme="light"] .status-text {
  color: #047857;
}

[data-theme="light"] .status-text.moving,
:root[data-theme="light"] .status-text.moving {
  color: #b45309;
}

[data-theme="light"] .cum-turns-pill,
:root[data-theme="light"] .cum-turns-pill {
  background: rgba(99, 102, 241, 0.12);
  color: #4338ca;
}

[data-theme="light"] .preset-pill,
:root[data-theme="light"] .preset-pill {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #334155;
}

[data-theme="light"] .preset-pill:hover,
:root[data-theme="light"] .preset-pill:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
}

[data-theme="light"] .preset-pill.active,
:root[data-theme="light"] .preset-pill.active {
  background: var(--nano-accent-primary, #4f46e5);
  border-color: var(--nano-accent-primary, #4f46e5);
  color: #ffffff;
}

[data-theme="light"] .btn-action,
:root[data-theme="light"] .btn-action {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #0f172a;
}

[data-theme="light"] .btn-action:hover,
:root[data-theme="light"] .btn-action:hover {
  background: #f1f5f9;
  border-color: var(--nano-accent-primary, #4f46e5);
}

[data-theme="light"] .btn-action.highlight,
:root[data-theme="light"] .btn-action.highlight {
  border-color: #0284c7;
  color: #0369a1;
  background: rgba(2, 132, 199, 0.08);
}

[data-theme="light"] .btn-action.highlight:hover,
:root[data-theme="light"] .btn-action.highlight:hover {
  background: rgba(2, 132, 199, 0.16);
}

[data-theme="light"] .btn-action.warning,
:root[data-theme="light"] .btn-action.warning {
  border-color: #f59e0b;
  color: #b45309;
  background: rgba(245, 158, 11, 0.08);
}

[data-theme="light"] .btn-action.warning:hover,
:root[data-theme="light"] .btn-action.warning:hover {
  background: rgba(245, 158, 11, 0.16);
}

[data-theme="light"] .btn-reset,
:root[data-theme="light"] .btn-reset {
  color: #475569;
  border-color: #cbd5e1;
}

[data-theme="light"] .btn-reset:hover,
:root[data-theme="light"] .btn-reset:hover {
  color: #dc2626;
  border-color: #dc2626;
  background: rgba(239, 68, 68, 0.08);
}

[data-theme="light"] .tab-btn,
:root[data-theme="light"] .tab-btn {
  color: #64748b;
}

[data-theme="light"] .tab-btn:hover,
:root[data-theme="light"] .tab-btn:hover {
  color: #0f172a;
  background: #e2e8f0;
}

[data-theme="light"] .tab-btn.active,
:root[data-theme="light"] .tab-btn.active {
  background: var(--nano-accent-primary, #4f46e5);
  color: #ffffff;
}

[data-theme="light"] .unit-indicator,
:root[data-theme="light"] .unit-indicator {
  color: #0284c7;
}

[data-theme="light"] .foot-lbl,
:root[data-theme="light"] .foot-lbl,
[data-theme="light"] .foot-sub,
:root[data-theme="light"] .foot-sub {
  color: #64748b;
}

[data-theme="light"] .foot-val,
:root[data-theme="light"] .foot-val {
  color: #0f172a;
}

[data-theme="light"] .foot-val.vel-val,
:root[data-theme="light"] .foot-val.vel-val {
  color: #047857;
}

[data-theme="light"] .foot-val.acc-val,
:root[data-theme="light"] .foot-val.acc-val {
  color: #b45309;
}

[data-theme="light"] .foot-val.target-val,
:root[data-theme="light"] .foot-val.target-val {
  color: #be185d;
}

[data-theme="light"] .axis-vel-labels text,
:root[data-theme="light"] .axis-vel-labels text {
  fill: #047857;
}

[data-theme="light"] .axis-labels text,
:root[data-theme="light"] .axis-labels text {
  fill: #475569;
}

[data-theme="light"] .zero-ref-line,
:root[data-theme="light"] .zero-ref-line {
  stroke: rgba(4, 120, 87, 0.35);
}

[data-theme="light"] .math-table-container,
:root[data-theme="light"] .math-table-container,
[data-theme="light"] .mode-card,
:root[data-theme="light"] .mode-card {
  background: #ffffff;
  border-color: #cbd5e1;
}

[data-theme="light"] .math-table th,
:root[data-theme="light"] .math-table th {
  background: #f8fafc;
  color: #475569;
  border-color: #e2e8f0;
}

[data-theme="light"] .math-table td,
:root[data-theme="light"] .math-table td {
  color: #0f172a;
  border-color: #f1f5f9;
}

[data-theme="light"] .mode-desc,
:root[data-theme="light"] .mode-desc {
  color: #1e293b;
}

[data-theme="light"] .mode-desc code,
:root[data-theme="light"] .mode-desc code {
  background: #f1f5f9;
  color: #0369a1;
  border: 1px solid #e2e8f0;
}

[data-theme="light"] .mode-formula,
:root[data-theme="light"] .mode-formula {
  color: #64748b;
}

[data-theme="light"] .class-pill.c1,
:root[data-theme="light"] .class-pill.c1 {
  background: rgba(2, 132, 199, 0.12);
  color: #0284c7;
}

[data-theme="light"] .class-pill.c0,
:root[data-theme="light"] .class-pill.c0 {
  background: rgba(4, 120, 87, 0.12);
  color: #047857;
}

[data-theme="light"] .class-pill.disc,
:root[data-theme="light"] .class-pill.disc {
  background: rgba(180, 83, 9, 0.12);
  color: #b45309;
}

[data-theme="light"] .class-pill.step,
:root[data-theme="light"] .class-pill.step {
  background: rgba(190, 24, 93, 0.12);
  color: #be185d;
}

[data-theme="light"] .class-pill.dirac,
:root[data-theme="light"] .class-pill.dirac {
  background: rgba(126, 34, 206, 0.12);
  color: #7e22ce;
}
</style>
