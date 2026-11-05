<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import NanoSwitch from '../components/NanoSwitch.vue';
import NanoSlider from '../components/NanoSlider.vue';
import NanoCodeBlock from '../components/NanoCodeBlock.vue';
import {
  PHI,
  INV_PHI,
  INV_PHI2,
  INV_PHI3,
  BAUHAUS_PHI_2D_SPEC,
  NANO_UI_SONIC_LOGO_NSD,
  projectOrthographic3D,
  computeGoldenFlowAndCursorField,
  computeBauhausPhiScene3D,
  sampleMonteCarloNShadow,
} from '../utils/bauhausPhiLogo.js';
import {
  sharedBrandConcept,
  interactiveSoundEnabled,
  ambientMusicEnabled,
  liveAudioTelemetry,
  playConceptSonicLogo,
  updateInteractive3DAudio,
  stopInteractive3DAudio,
  setAmbientBackgroundMusic,
  stopAmbientBackgroundMusic,
} from './brandLogoState.js';

const silhouetteMode = ref(false);
const showGoldenGrid = ref(true);
const showLaserRays = ref(true);
const showMathArtifacts = ref(true);
const showMonteCarloOverlay = ref(false);
const monteCarloShotCount = ref(0);
const isMonteCarloShooting = ref(false);
const activePulseConcept = ref(null);
const activePulseStep = ref(0);

// Fullscreen Presentation & 3-Device Form Factor Mode ('desktop' | 'tablet' | 'mobile')
const isFullscreenPresentation = ref(false);
const isMountedClient = ref(false);
const deviceViewport = ref('desktop'); // 'desktop' | 'tablet' | 'mobile'

// 3D Orthographic Camera Angles + Calibration Perturbation + Holographic Phase
const anchorYawDeg = ref(13.9);
const anchorPitchDeg = ref(4.9);
const yawDeg = ref(13.9);
const pitchDeg = ref(4.9);
const calibrationPerturbation = ref(0.18);
const holoPhaseRad = ref(0);
const isAutoOrbiting = ref(false);
const isConverging = ref(false);
const convergenceProgress = ref(0);
const isPointerDragging = ref(false);
const hasUserInteractedAudio = ref(false);
const stage3DBoxRef = ref(null);

// Interactive Cursor Parallax & Holographic Field State (No Dragging Required!)
const cursorField = ref({
  normX: 0,
  normY: 0,
  energy: 0,
  presence: 0,
  x: 16,
  y: 16,
  rInner: 1.25,
  rPhi: 2.02,
  rPhi2: 3.27,
  cursorYawDelta: 0,
  cursorPitchDelta: 0,
});
const cursorTrail = ref([]);

let timers = [];
let transitionRafId = null;
let orbitRafId = null;
let orbitStartTime = 0;
let dragStartX = 0;
let dragStartY = 0;
let dragBaseYaw = 0;
let dragBasePitch = 0;

// Smooth spring-damped cursor tracking variables
let cursorTargetX = 0;
let cursorTargetY = 0;
let cursorTargetEnergy = 0;
let cursorTargetPresence = 0;
let smoothCursorX = 0;
let smoothCursorY = 0;
let smoothCursorEnergy = 0;
let smoothCursorPresence = 0;
let lastPointerNormX = 0;
let lastPointerNormY = 0;
let trailFrameTick = 0;

const clearTimers = () => {
  for (const id of timers) clearTimeout(id);
  timers = [];
};

const stopTransitionLoop = () => {
  if (transitionRafId && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(transitionRafId);
    transitionRafId = null;
  }
};

const stopOrbitAnimation = () => {
  isAutoOrbiting.value = false;
  if (orbitRafId && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(orbitRafId);
    orbitRafId = null;
  }
};

const syncBodyScrollLock = (locked) => {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = locked ? 'hidden' : '';
};

/**
 * Launches Fullscreen Presentation (100dvh) with the canonical Dual-Stage (3D + 2D "N" Shadow)
 * view, activates all 5 visual/audio toggles (Artefakty 3D Math.*, Ambient Φ w Tle, Dźwięk 3D,
 * Siatka φ, Promienie π_XY, with Mono 100% OFF), starts the warm ambient music, and runs
 * the gentle autonomous floating flow + interactive cursor parallax effect!
 */
const toggleFullscreenPresentation = async () => {
  const next = !isFullscreenPresentation.value;
  isFullscreenPresentation.value = next;
  syncBodyScrollLock(next);

  if (next) {
    deviceViewport.value = 'desktop';
    showMathArtifacts.value = true;
    interactiveSoundEnabled.value = true;
    showGoldenGrid.value = true;
    showLaserRays.value = true;
    silhouetteMode.value = false;
    hasUserInteractedAudio.value = true;
    anchorYawDeg.value = 13.9;
    anchorPitchDeg.value = 4.9;
    setAmbientBackgroundMusic(true);
    startAutoOrbitLoop(true);
  }

  if (typeof document !== 'undefined') {
    try {
      if (next && !document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (!next && document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Fallback to Teleported 100dvw x 100dvh fixed overlay
    }
  }
};

const onFullscreenChange = () => {
  if (typeof document !== 'undefined' && !document.fullscreenElement && isFullscreenPresentation.value) {
    // Keep overlay synced when user presses ESC in browser fullscreen
    isFullscreenPresentation.value = false;
    syncBodyScrollLock(false);
  }
};

const onGlobalKeydown = (e) => {
  if (e.key === 'Escape' && isFullscreenPresentation.value) {
    e.stopPropagation();
    isFullscreenPresentation.value = false;
    syncBodyScrollLock(false);
    if (typeof document !== 'undefined' && document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }
};

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const animateToAngles = (targetYaw, targetPitch, targetPert = 0, durationMs = 780) => {
  hasUserInteractedAudio.value = true;
  stopOrbitAnimation();
  stopTransitionLoop();
  isConverging.value = false;
  anchorYawDeg.value = targetYaw;
  anchorPitchDeg.value = targetPitch;

  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    yawDeg.value = targetYaw;
    pitchDeg.value = targetPitch;
    calibrationPerturbation.value = targetPert;
    return;
  }

  const startYaw = yawDeg.value;
  const startPitch = pitchDeg.value;
  const startPert = calibrationPerturbation.value;
  const startPhase = holoPhaseRad.value;
  const startTime = performance.now();

  const step = (now) => {
    const p = Math.min(1, Math.max(0, (now - startTime) / durationMs));
    const e = easeInOutCubic(p);

    const curYaw = startYaw + (targetYaw - startYaw) * e;
    const curPitch = startPitch + (targetPitch - startPitch) * e;
    const curPert = startPert + (targetPert - startPert) * e;

    yawDeg.value = Math.abs(curYaw) < 1e-6 ? 0 : Number(curYaw.toFixed(4));
    pitchDeg.value = Math.abs(curPitch) < 1e-6 ? 0 : Number(curPitch.toFixed(4));
    calibrationPerturbation.value = Math.abs(curPert) < 1e-6 ? 0 : Number(curPert.toFixed(5));
    holoPhaseRad.value = Number((startPhase + p * 2.2).toFixed(3));

    if (hasUserInteractedAudio.value) {
      updateInteractive3DAudio(yawDeg.value, pitchDeg.value, scene3D.value.perfection.scalar);
    }

    if (p < 1) {
      transitionRafId = window.requestAnimationFrame(step);
    } else {
      transitionRafId = null;
      yawDeg.value = targetYaw;
      pitchDeg.value = targetPitch;
      calibrationPerturbation.value = targetPert;
      if (targetYaw === 0 && targetPitch === 0 && targetPert === 0) {
        stopInteractive3DAudio();
      }
    }
  };

  transitionRafId = window.requestAnimationFrame(step);
};

/**
 * Runs a rich 5.8-second damped golden-spiral convergence from L(Φ) = 1.0 down to <= 10^-9,
 * sweeping all Math.* candidate formulas and culminating in the 3-vector Golden Chord.
 */
const runConvergenceOptimization = () => {
  hasUserInteractedAudio.value = true;
  stopOrbitAnimation();
  stopTransitionLoop();
  isConverging.value = true;
  convergenceProgress.value = 0;

  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    yawDeg.value = 0;
    pitchDeg.value = 0;
    calibrationPerturbation.value = 0;
    isConverging.value = false;
    triggerConceptDemo('PHI');
    return;
  }

  const durationMs = 5800;
  const startTime = performance.now();
  const basePhase = holoPhaseRad.value;

  const stepConvergence = (now) => {
    if (!isConverging.value) return;
    const elapsed = now - startTime;
    const p = Math.min(1, Math.max(0, elapsed / durationMs));
    convergenceProgress.value = Number((p * 100).toFixed(0));

    if (p < 1) {
      // Smooth damped golden-spiral envelope: starts at (65°, 45°, pert=1) and spirals cleanly to (0°, 0°, 0)
      const env = Math.pow(1 - p, 2.25);
      const spiralAngle = p * Math.PI * 3.0;
      const curYaw = 65 * env * Math.cos(spiralAngle);
      const curPitch = 45 * env * Math.cos(spiralAngle * INV_PHI);
      const curPert = env;

      yawDeg.value = Math.abs(curYaw) < 1e-6 ? 0 : Number(curYaw.toFixed(5));
      pitchDeg.value = Math.abs(curPitch) < 1e-6 ? 0 : Number(curPitch.toFixed(5));
      calibrationPerturbation.value = Math.abs(curPert) < 1e-6 ? 0 : Number(curPert.toFixed(6));
      holoPhaseRad.value = Number((basePhase + p * 18.85).toFixed(3));

      if (hasUserInteractedAudio.value) {
        updateInteractive3DAudio(yawDeg.value, pitchDeg.value, scene3D.value.perfection.scalar);
      }
      transitionRafId = window.requestAnimationFrame(stepConvergence);
    } else {
      transitionRafId = null;
      anchorYawDeg.value = 0;
      anchorPitchDeg.value = 0;
      yawDeg.value = 0;
      pitchDeg.value = 0;
      calibrationPerturbation.value = 0;
      convergenceProgress.value = 100;
      isConverging.value = false;
      stopInteractive3DAudio();
      triggerConceptDemo('PHI');
    }
  };

  transitionRafId = window.requestAnimationFrame(stepConvergence);
};

/**
 * Gentle Autonomous Floating Animation + Smooth Spring-Damped Cursor Parallax Loop:
 * Continuously flows the 3D Bauhaus Φ scene around (anchorYawDeg, anchorPitchDeg)
 * while blending in the user's cursor movement without requiring any clicking or dragging.
 */
const startAutoOrbitLoop = (withAudioGesture = false) => {
  if (withAudioGesture) {
    hasUserInteractedAudio.value = true;
  }
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    return;
  }
  stopOrbitAnimation();
  stopTransitionLoop();
  isConverging.value = false;
  isAutoOrbiting.value = true;
  orbitStartTime = performance.now();

  const stepOrbit = (now) => {
    if (!isAutoOrbiting.value) return;
    const elapsedSec = (now - orbitStartTime) * 0.001;

    // Exponential spring smoothing for liquid-smooth cursor parallax & kinetic energy decay
    smoothCursorX += (cursorTargetX - smoothCursorX) * 0.085;
    smoothCursorY += (cursorTargetY - smoothCursorY) * 0.085;
    cursorTargetEnergy *= 0.93;
    smoothCursorEnergy += (cursorTargetEnergy - smoothCursorEnergy) * 0.14;
    smoothCursorPresence += (cursorTargetPresence - smoothCursorPresence) * 0.08;

    const flow = computeGoldenFlowAndCursorField({
      timeSec: elapsedSec,
      cursorNormX: smoothCursorX,
      cursorNormY: smoothCursorY,
      cursorEnergy: smoothCursorEnergy,
      cursorPresence: smoothCursorPresence,
      anchorYawDeg: anchorYawDeg.value,
      anchorPitchDeg: anchorPitchDeg.value,
    });

    yawDeg.value = flow.yawDeg;
    pitchDeg.value = flow.pitchDeg;
    calibrationPerturbation.value = flow.calibrationPerturbation;
    holoPhaseRad.value = flow.holoPhaseRad;

    cursorField.value = {
      ...flow.cursorSvg,
      cursorYawDelta: flow.cursorYawDelta,
      cursorPitchDelta: flow.cursorPitchDelta,
    };

    trailFrameTick++;
    if (smoothCursorPresence > 0.04 && trailFrameTick % 2 === 0) {
      const nextTrail = [
        {
          id: trailFrameTick,
          x: flow.cursorSvg.x,
          y: flow.cursorSvg.y,
          r: Number((0.42 + smoothCursorEnergy * 0.35).toFixed(2)),
        },
        ...cursorTrail.value.slice(0, 6),
      ];
      cursorTrail.value = nextTrail;
    } else if (smoothCursorPresence <= 0.04 && cursorTrail.value.length > 0) {
      cursorTrail.value = cursorTrail.value.slice(0, -1);
    }

    if (
      (hasUserInteractedAudio.value || ambientMusicEnabled.value) &&
      smoothCursorEnergy > 0.015
    ) {
      updateInteractive3DAudio(flow.yawDeg, flow.pitchDeg, scene3D.value.perfection.scalar);
    }

    orbitRafId = window.requestAnimationFrame(stepOrbit);
  };

  orbitRafId = window.requestAnimationFrame(stepOrbit);
};

const toggleAutoOrbit = () => {
  if (isAutoOrbiting.value) {
    stopOrbitAnimation();
    stopInteractive3DAudio();
    return;
  }
  anchorYawDeg.value = 13.9;
  anchorPitchDeg.value = 4.9;
  startAutoOrbitLoop(true);
};

/**
 * Updates normalized cursor coordinates & kinetic energy from pointer hover/move
 * (works automatically without clicking or dragging!).
 */
const updateCursorFieldFromEvent = (e, referenceEl) => {
  const el = referenceEl || stage3DBoxRef.value || e.currentTarget;
  if (!el || typeof el.getBoundingClientRect !== 'function') return;
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const nx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
  const ny = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height) * 2 - 1));
  const vel = Math.hypot(nx - lastPointerNormX, ny - lastPointerNormY);
  lastPointerNormX = nx;
  lastPointerNormY = ny;

  cursorTargetX = nx;
  cursorTargetY = ny;
  cursorTargetEnergy = Math.min(1, cursorTargetEnergy + vel * 2.8);
  cursorTargetPresence = 1;

  // If auto-orbit was paused (e.g. after a manual preset), still apply gentle cursor parallax around anchor!
  if (!isAutoOrbiting.value && !isPointerDragging.value && !isConverging.value) {
    smoothCursorX += (cursorTargetX - smoothCursorX) * 0.22;
    smoothCursorY += (cursorTargetY - smoothCursorY) * 0.22;
    smoothCursorEnergy = Math.min(1, cursorTargetEnergy);
    smoothCursorPresence = 1;
    const flow = computeGoldenFlowAndCursorField({
      timeSec: holoPhaseRad.value * 0.74,
      cursorNormX: smoothCursorX,
      cursorNormY: smoothCursorY,
      cursorEnergy: smoothCursorEnergy,
      cursorPresence: 1,
      anchorYawDeg: anchorYawDeg.value,
      anchorPitchDeg: anchorPitchDeg.value,
    });
    yawDeg.value = Number(
      Math.max(-65, Math.min(65, anchorYawDeg.value + flow.cursorYawDelta)).toFixed(2)
    );
    pitchDeg.value = Number(
      Math.max(-45, Math.min(45, anchorPitchDeg.value + flow.cursorPitchDelta)).toFixed(2)
    );
    holoPhaseRad.value = Number((holoPhaseRad.value + 0.035).toFixed(3));
    cursorField.value = {
      ...flow.cursorSvg,
      cursorYawDelta: flow.cursorYawDelta,
      cursorPitchDelta: flow.cursorPitchDelta,
    };
    if (hasUserInteractedAudio.value || ambientMusicEnabled.value) {
      updateInteractive3DAudio(yawDeg.value, pitchDeg.value, scene3D.value.perfection.scalar);
    }
  }
};

const onDeckPointerMove = (e) => {
  if (!isFullscreenPresentation.value) return;
  updateCursorFieldFromEvent(e, e.currentTarget);
};

const onStagePointerLeave = () => {
  cursorTargetX = 0;
  cursorTargetY = 0;
  cursorTargetPresence = 0;
  if (!isAutoOrbiting.value && !isPointerDragging.value && !isConverging.value) {
    cursorField.value = {
      ...cursorField.value,
      presence: 0,
      energy: 0,
    };
  }
};

const onStagePointerDown = (e) => {
  hasUserInteractedAudio.value = true;
  isPointerDragging.value = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragBaseYaw = anchorYawDeg.value;
  dragBasePitch = anchorPitchDeg.value;
  if (e.currentTarget && typeof e.currentTarget.setPointerCapture === 'function') {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore capture errors in synthetic test environments
    }
  }
};

const onStagePointerMove = (e) => {
  updateCursorFieldFromEvent(e, e.currentTarget);
  if (!isPointerDragging.value) return;
  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;
  const nextYaw = Math.max(-65, Math.min(65, Number((dragBaseYaw + dx * 0.45).toFixed(2))));
  const nextPitch = Math.max(-45, Math.min(45, Number((dragBasePitch - dy * 0.35).toFixed(2))));
  anchorYawDeg.value = nextYaw;
  anchorPitchDeg.value = nextPitch;
  yawDeg.value = nextYaw;
  pitchDeg.value = nextPitch;
  holoPhaseRad.value = Number((holoPhaseRad.value + 0.08).toFixed(3));
  updateInteractive3DAudio(nextYaw, nextPitch, scene3D.value.perfection.scalar);
};

const onStagePointerUp = () => {
  if (!isPointerDragging.value) return;
  isPointerDragging.value = false;
  if (Math.abs(yawDeg.value) < 3.5 && Math.abs(pitchDeg.value) < 3.5) {
    animateToAngles(0, 0, 0, 420);
    triggerConceptDemo('PHI');
  }
};

const onSliderYaw = (v) => {
  hasUserInteractedAudio.value = true;
  stopOrbitAnimation();
  stopTransitionLoop();
  isConverging.value = false;
  anchorYawDeg.value = v;
  yawDeg.value = v;
  holoPhaseRad.value = Number((holoPhaseRad.value + 0.06).toFixed(3));
  updateInteractive3DAudio(yawDeg.value, pitchDeg.value, scene3D.value.perfection.scalar);
};

const onSliderPitch = (v) => {
  hasUserInteractedAudio.value = true;
  stopOrbitAnimation();
  stopTransitionLoop();
  isConverging.value = false;
  anchorPitchDeg.value = v;
  pitchDeg.value = v;
  holoPhaseRad.value = Number((holoPhaseRad.value + 0.06).toFixed(3));
  updateInteractive3DAudio(yawDeg.value, pitchDeg.value, scene3D.value.perfection.scalar);
};

const scene3D = computed(() =>
  computeBauhausPhiScene3D(
    yawDeg.value,
    pitchDeg.value,
    calibrationPerturbation.value,
    holoPhaseRad.value,
    cursorField.value
  )
);

const monteCarloState = computed(() =>
  sampleMonteCarloNShadow(
    monteCarloShotCount.value > 0 ? monteCarloShotCount.value : 360,
    holoPhaseRad.value
  )
);

let mcTimer = null;

const stopMonteCarloShooter = () => {
  isMonteCarloShooting.value = false;
  if (mcTimer) {
    clearInterval(mcTimer);
    mcTimer = null;
  }
};

const runMonteCarloShootingDemo = () => {
  hasUserInteractedAudio.value = true;
  stopMonteCarloShooter();
  showMonteCarloOverlay.value = true;
  isMonteCarloShooting.value = true;
  monteCarloShotCount.value = 24;
  animateToAngles(0, 0, 0, 950);

  mcTimer = setInterval(() => {
    if (monteCarloShotCount.value < 520) {
      monteCarloShotCount.value += 28;
      holoPhaseRad.value = Number((holoPhaseRad.value + 0.04).toFixed(3));
    } else {
      monteCarloShotCount.value = 520;
      stopMonteCarloShooter();
      triggerConceptDemo('PHI');
    }
  }, 45);
};

/**
 * 3D Structural N-Bridge Beams & Perspective Floor Grid so the 3 Bauhaus primitives
 * clearly form a cohesive 3D sculptural Letter 'N' in space when rotated.
 */
const nSculpture3D = computed(() => {
  const y = yawDeg.value;
  const p = pitchDeg.value;
  const cx = cursorField.value.normX * cursorField.value.presence;
  const cy = cursorField.value.normY * cursorField.value.presence;

  // 3D structural N-bridge linking Pillar top-right (11.25, 8.2, zPillar) -> Wedge apex (13.25, 8.2, 0)
  // and Pillar mid-right (11.25, 16.0, zPillar) -> Wedge diagonal (19.1, 16.0, 0)
  const bridgeTopA = projectOrthographic3D(11.25, 8.2, -4 * INV_PHI, y, p);
  const bridgeTopB = projectOrthographic3D(13.8, 8.2, 0, y, p);
  const bridgeLowA = projectOrthographic3D(11.25, 22.8, -4 * INV_PHI, y, p);
  const bridgeLowB = projectOrthographic3D(23.5, 22.8, 0, y, p);
  const sphereAxisA = projectOrthographic3D(22.55, 9.45, 0, y, p);
  const sphereAxisB = projectOrthographic3D(22.55, 9.45, 4 * INV_PHI, y, p);

  // Subtle 3D architectural stage floor at y = 26.8, x ∈ [5, 27], z ∈ [-5, 5]
  const f1 = projectOrthographic3D(5.5, 26.6, -4.5, y, p);
  const f2 = projectOrthographic3D(26.5, 26.6, -4.5, y, p);
  const f3 = projectOrthographic3D(26.5, 26.6, 4.5, y, p);
  const f4 = projectOrthographic3D(5.5, 26.6, 4.5, y, p);

  // Dynamic specular highlight offset on the 3D sphere following both 3D angle and user cursor!
  const specCx = Number(Math.max(12, Math.min(78, 34 - y * 0.22 + cx * 14)).toFixed(1));
  const specCy = Number(Math.max(12, Math.min(78, 30 - p * 0.22 + cy * 14)).toFixed(1));

  return {
    bridgeTopA,
    bridgeTopB,
    bridgeLowA,
    bridgeLowB,
    sphereAxisA,
    sphereAxisB,
    floorPoints: `${f1.x},${f1.y} ${f2.x},${f2.y} ${f3.x},${f3.y} ${f4.x},${f4.y}`,
    specCx: `${specCx}%`,
    specCy: `${specCy}%`,
  };
});

/**
 * Computes 100% opaque RGB Lambertian fill for extruded 3D side walls (zero X-ray bleed-through).
 */
const getPillarSideFill = (shade) => {
  if (silhouetteMode.value) {
    const v = Math.round(140 + shade * 95);
    return `rgb(${v}, ${v}, ${v})`;
  }
  const r = Math.round(48 + shade * 58);
  const g = Math.round(44 + shade * 62);
  const b = Math.round(138 + shade * 108);
  return `rgb(${r}, ${g}, ${b})`;
};

const getWedgeSideFill = (shade) => {
  if (silhouetteMode.value) {
    const v = Math.round(135 + shade * 100);
    return `rgb(${v}, ${v}, ${v})`;
  }
  const r = Math.round(4 + shade * 24);
  const g = Math.round(98 + shade * 104);
  const b = Math.round(132 + shade * 106);
  return `rgb(${r}, ${g}, ${b})`;
};

const triggerConceptDemo = (conceptId) => {
  clearTimers();
  sharedBrandConcept.value = conceptId;
  activePulseConcept.value = conceptId;
  activePulseStep.value = 1;

  playConceptSonicLogo(conceptId);

  timers.push(
    setTimeout(() => {
      activePulseStep.value = 2;
    }, 65),
    setTimeout(() => {
      activePulseStep.value = 3;
    }, 130),
    setTimeout(() => {
      activePulseConcept.value = null;
      activePulseStep.value = 0;
    }, 520)
  );
};

onMounted(() => {
  isMountedClient.value = true;
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onGlobalKeydown);
    document.addEventListener('fullscreenchange', onFullscreenChange);
  }
  // Start gentle 3D holographic orbit automatically on mount
  startAutoOrbitLoop(false);
});

onUnmounted(() => {
  clearTimers();
  stopOrbitAnimation();
  stopTransitionLoop();
  stopMonteCarloShooter();
  stopInteractive3DAudio();
  stopAmbientBackgroundMusic();
  syncBodyScrollLock(false);
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onGlobalKeydown);
    document.removeEventListener('fullscreenchange', onFullscreenChange);
  }
});

const concepts = [
  {
    id: 'PHI',
    badge: '★ Oficjalne Logo (□ + △ + ○ • Bauhaus Φ)',
    title: 'Bauhaus Φ Tri-Primitive (Kwadrat + Trójkąt + Koło)',
    desc: 'Trzy elementarne figury geometryczne w ramie 18×18: Filar □ (szer. 18·φ⁻³ ≈ 4.25), Złoty Trójkąt △ (podział 18·φ⁻¹ : 18·φ⁻²) oraz Sfera Kwantowa ○ (r = 2.45).',
    nsd: NANO_UI_SONIC_LOGO_NSD,
  },
  {
    id: 'A',
    badge: 'Wariant A (3D Prism)',
    title: 'Isometric N-Prism',
    desc: 'Trzy fasetowane sztaby krystaliczne budujące literę N z głębią izometryczną 3D.',
    nsd: `seq(
  0ms:   0.58 * tri(440Hz) * expDecay(210ms),
  65ms:  0.50 * tri(glide(554.37Hz, 659.25Hz, easeOutCubic, 110ms)) * expDecay(195ms),
  130ms: 0.65 * sin(880Hz) * expDecay(340ms) + 0.30 * sin(1318.5Hz) * expDecay(280ms)
)`,
  },
  {
    id: 'C',
    badge: 'Wariant C (Detached Node)',
    title: 'Detached Quantum Node',
    desc: 'Zaokrąglony filar z ukośnym mostem i zawieszonym węzłem kwantowym.',
    nsd: `seq(
  0ms:   0.52 * sin(523.25Hz) * expDecay(200ms),
  65ms:  0.48 * tri(glide(659.25Hz, 783.99Hz, easeOutCubic, 115ms)) * expDecay(190ms),
  130ms: 0.64 * sin(1567.98Hz) * expDecay(380ms) + 0.28 * sin(2093Hz) * expDecay(290ms)
)`,
  },
];
</script>

<template>
  <Teleport to="body" :disabled="!isFullscreenPresentation || !isMountedClient">
    <section
      class="logo-lab-card"
      :class="[
        `is-device-${deviceViewport}`,
        { 'is-fullscreen-deck': isFullscreenPresentation }
      ]"
      @pointermove="onDeckPointerMove"
      @pointerleave="onStagePointerLeave"
    >
      <div class="logo-lab-header" :class="{ 'is-fullscreen-header': isFullscreenPresentation }">
        <div v-if="!isFullscreenPresentation">
          <span class="lab-kicker">✨ BAUHAUS Φ TRI-PRIMITIVE (□ + △ + ○) • ARCHITEKTURA 3-URZĄDZENIA (DESKTOP / TABLET / MOBILE)</span>
          <h3 class="lab-title">Interaktywne Studio 3D → 2D + Latające Artefakty `Math.*` &amp; Sprzężenie Akustyczne (.nsd)</h3>
          <p class="lab-sub">
            Przełączaj widok pomiędzy <strong>🖥️ Desktop (Dual-Stage 3D+2D)</strong>, <strong>📱 Tablet (780px Split-Deck)</strong> i <strong>📲 Mobile (390px Thumb-First + PiP 2D)</strong>
            lub uruchom <strong>⛶ Prezentację Pełnoekranową (`100dvh`)</strong> z płynnym przepływem 3D, muzyką Ambient Φ i interaktywnym polem kursora!
          </p>
        </div>

        <!-- Device Switcher + Fullscreen Presentation Button + Feature Toggles -->
        <div class="header-actions-col" :class="{ 'is-fullscreen-bar': isFullscreenPresentation }">
          <div class="device-switcher-bar" role="group" aria-label="Device Viewport Switcher">
            <button
              type="button"
              class="device-pill"
              :class="{ 'is-active': deviceViewport === 'desktop' }"
              @click="deviceViewport = 'desktop'"
            >
              🖥️ Desktop
            </button>
            <button
              type="button"
              class="device-pill"
              :class="{ 'is-active': deviceViewport === 'tablet' }"
              @click="deviceViewport = 'tablet'"
            >
              📱 Tablet
            </button>
            <button
              type="button"
              class="device-pill"
              :class="{ 'is-active': deviceViewport === 'mobile' }"
              @click="deviceViewport = 'mobile'"
            >
              📲 Mobile
            </button>
            <button
              type="button"
              class="device-pill is-fullscreen-btn"
              :class="{ 'is-active': isFullscreenPresentation }"
              @click="toggleFullscreenPresentation()"
            >
              {{ isFullscreenPresentation ? '✕ Zamknij Pełny Ekran (ESC)' : '⛶ Pełny Ekran (100dvh)' }}
            </button>
          </div>

          <div class="lab-toggles">
            <label class="silhouette-toggle">
              <NanoSwitch v-model="showMathArtifacts" color="violet" />
              <span>✨ Artefakty 3D `Math.*`</span>
            </label>
            <label class="silhouette-toggle">
              <NanoSwitch
                :model-value="ambientMusicEnabled"
                color="emerald"
                @update:model-value="setAmbientBackgroundMusic"
              />
              <span>🎵 Ambient Φ w Tle</span>
            </label>
            <label class="silhouette-toggle">
              <NanoSwitch v-model="interactiveSoundEnabled" color="indigo" />
              <span>🔊 Dźwięk 3D</span>
            </label>
            <label class="silhouette-toggle">
              <NanoSwitch v-model="showGoldenGrid" color="amber" />
              <span>Siatka φ</span>
            </label>
            <label class="silhouette-toggle">
              <NanoSwitch v-model="showLaserRays" color="emerald" />
              <span>Promienie π<sub>XY</sub></span>
            </label>
            <label class="silhouette-toggle">
              <NanoSwitch v-model="silhouetteMode" color="cyan" />
              <span>Mono 100%</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Device Frame Container (Adapts width for Desktop / Tablet 780px / Mobile 390px) -->
      <div class="device-viewport-frame" :class="`frame-${deviceViewport}`">
        <!-- Live Mathematical Perfection Scalar HUD: L(Φ): 1 -> 0 (<= 10^-9) -->
        <div class="perfection-hud" :class="{ 'is-converged': scene3D.perfection.isConverged }">
          <div class="hud-main">
            <span class="hud-label">L(Φ) ∈ [0, 1] (CEL ≤ 10⁻⁹):</span>
            <span class="hud-value mono">
              {{ scene3D.perfection.fixed12 }} ({{ scene3D.perfection.formatted }})
            </span>
            <span class="hud-badge" :class="{ 'is-ok': scene3D.perfection.isConverged }">
              {{
                scene3D.perfection.isConverged
                  ? '✓ ZBIEŻNOŚĆ ≤ 10⁻⁹'
                  : isConverging
                    ? `⚡ ZBIEŻNOŚĆ ${convergenceProgress}%`
                    : '⟳ OMIATANIE MATH.*'
              }}
            </span>
          </div>
          <div class="hud-submetrics mono">
            <span>ε_πXY: {{ scene3D.perfection.components.projectionLoss.toFixed(5) }}</span>
            <span>ε_φ: {{ scene3D.perfection.components.phiLoss.toFixed(5) }}</span>
            <span>ε_sym: {{ scene3D.perfection.components.symLoss.toFixed(5) }}</span>
            <span>ε_audio: {{ scene3D.perfection.components.acousticLoss.toFixed(5) }}</span>
          </div>
        </div>

        <!-- Interactive 3D Sculpture + Floating Math.* Artifacts -> 2D Shadow Projection Stage -->
        <div class="projection-stage">
          <div class="stage-visuals">
            <!-- Left / Top: 3D Rotatable Manifold with Orbiting Math.* Formula Sweepers & Nano-Charts -->
            <div
              ref="stage3DBoxRef"
              class="stage-box stage-box-wide is-interactive-3d"
              :class="{ 'is-exact-match': scene3D.isOrthographicLock, 'is-dragging': isPointerDragging }"
              @pointerdown="onStagePointerDown"
              @pointermove="onStagePointerMove"
              @pointerup="onStagePointerUp"
              @pointercancel="onStagePointerUp"
              @pointerleave="onStagePointerLeave"
            >
              <div class="stage-box-head">
                <span class="stage-tag">
                  {{
                    scene3D.isOrthographicLock
                      ? '🔒 CIEŃ 2D (0°, 0°) • WZORY MATH.* ZBIEŻNE'
                      : '🌊 PŁYNNY PRZEPŁYW 3D + EFEKT KURSORA Φ (PORUSZAJ KURSOREM)'
                  }}
                </span>
                <span class="stage-coords mono">ψ={{ yawDeg.toFixed(1) }}° | θ={{ pitchDeg.toFixed(1) }}°</span>
              </div>

              <div class="stage-3d-canvas-wrap">
                <svg
                  :viewBox="deviceViewport === 'mobile' ? '-2 -2 36 36' : '-22 -7 76 46'"
                  :width="deviceViewport === 'mobile' ? 320 : 450"
                  :height="deviceViewport === 'mobile' ? 320 : 272"
                  class="stage-svg"
                >
                  <defs>
                    <!-- Volumetric 3D Quantum Sphere Shader (Crisp in Light & Dark Modes) -->
                    <radialGradient
                      id="labSphere3D"
                      :cx="nSculpture3D.specCx"
                      :cy="nSculpture3D.specCy"
                      r="68%"
                    >
                      <stop offset="0%" stop-color="#ffffff" />
                      <stop offset="26%" stop-color="#67e8f9" />
                      <stop offset="62%" stop-color="#06b6d4" />
                      <stop offset="88%" stop-color="#0284c7" />
                      <stop offset="100%" stop-color="#0369a1" />
                    </radialGradient>

                    <!-- Crisp 2D Sphere Shader for Flat Logo & Multi-Scale Cards -->
                    <radialGradient id="labSphere2D" cx="34%" cy="30%" r="68%">
                      <stop offset="0%" stop-color="#a5f3fc" />
                      <stop offset="38%" stop-color="#22d3ee" />
                      <stop offset="78%" stop-color="#06b6d4" />
                      <stop offset="100%" stop-color="#0284c7" />
                    </radialGradient>

                    <!-- Anodized 3D Pillar Front Gradient -->
                    <linearGradient id="pillarFront3D" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#818cf8" />
                      <stop offset="48%" stop-color="#6366f1" />
                      <stop offset="100%" stop-color="#4f46e5" />
                    </linearGradient>

                    <!-- Anodized 3D Wedge Front Gradient -->
                    <linearGradient id="wedgeFront3D" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#22d3ee" />
                      <stop offset="52%" stop-color="#06b6d4" />
                      <stop offset="100%" stop-color="#0284c7" />
                    </linearGradient>

                    <radialGradient id="holoSpaceGlow" cx="50%" cy="50%" r="55%">
                      <stop offset="0%" stop-color="rgba(56, 189, 248, 0.16)" />
                      <stop offset="60%" stop-color="rgba(99, 102, 241, 0.07)" />
                      <stop offset="100%" stop-color="rgba(7, 11, 22, 0)" />
                    </radialGradient>

                    <radialGradient id="cursorHoloGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stop-color="rgba(103, 232, 249, 0.34)" />
                      <stop offset="55%" stop-color="rgba(129, 140, 248, 0.14)" />
                      <stop offset="100%" stop-color="rgba(15, 23, 42, 0)" />
                    </radialGradient>
                  </defs>

                  <!-- Outer Holographic Space Backdrop -->
                  <rect
                    :x="deviceViewport === 'mobile' ? -1.2 : -21"
                    :y="deviceViewport === 'mobile' ? -1.2 : -6"
                    :width="deviceViewport === 'mobile' ? 34.4 : 74"
                    :height="deviceViewport === 'mobile' ? 34.4 : 44"
                    rx="4.5"
                    :fill="silhouetteMode ? '#09090b' : '#070b16'"
                    stroke="rgba(99, 102, 241, 0.32)"
                    stroke-width="0.35"
                  />
                  <circle cx="16" cy="16" r="21" fill="url(#holoSpaceGlow)" />

                  <!-- 3D Orbital Halo Ring around (16, 16, 0) -->
                  <polyline
                    v-if="showMathArtifacts"
                    :points="scene3D.orbitRingPoints"
                    fill="none"
                    stroke="rgba(56, 189, 248, 0.25)"
                    stroke-width="0.24"
                    stroke-dasharray="0.8 0.55"
                  />

                  <!-- 3D Orbiting Math.* Formula Micro-Satellites (Behind Z < 0) -->
                  <g v-if="showMathArtifacts">
                    <g
                      v-for="tok in scene3D.orbitTokens.filter((t) => t.z < 0)"
                      :key="tok.id"
                      :transform="`translate(${tok.x}, ${tok.y}) scale(${tok.scale})`"
                      :opacity="tok.opacity"
                    >
                      <circle r="0.38" :fill="tok.color" />
                      <text
                        v-if="deviceViewport !== 'mobile'"
                        x="0.7"
                        y="0.35"
                        :fill="tok.color"
                        font-size="1.25"
                        font-weight="700"
                        font-family="ui-monospace, SFMono-Regular, monospace"
                      >
                        {{ tok.text }}
                      </text>
                    </g>
                  </g>

                  <!-- LAYER 1 (BACK Z < 0): FLOATING 3D MATH.* CARDS OCCLUDED BEHIND SOLIDS -->
                  <g v-if="showMathArtifacts && deviceViewport !== 'mobile'">
                    <g
                      v-for="art in scene3D.backArtifacts"
                      :key="art.id"
                      :opacity="art.opacity"
                    >
                      <line
                        :x1="art.x"
                        :y1="art.y"
                        :x2="art.anchorX"
                        :y2="art.anchorY"
                        :stroke="art.isLocked ? '#10b981' : art.color"
                        stroke-width="0.2"
                        stroke-dasharray="0.45 0.45"
                        opacity="0.65"
                      />
                      <g :transform="`translate(${art.x}, ${art.y}) scale(${art.scale * 0.34})`">
                        <rect
                          x="-29"
                          y="-12.5"
                          width="58"
                          height="25"
                          rx="2.8"
                          fill="rgba(15, 23, 42, 0.9)"
                          :stroke="art.isLocked ? '#10b981' : art.color"
                          stroke-width="0.75"
                        />
                        <text
                          x="-26"
                          y="-7.2"
                          :fill="art.isLocked ? '#10b981' : art.color"
                          font-size="3.1"
                          font-weight="800"
                          font-family="ui-monospace, SFMono-Regular, monospace"
                        >
                          {{ art.tag }}
                        </text>
                        <text
                          x="26"
                          y="-7.2"
                          text-anchor="end"
                          :fill="art.isLocked ? '#10b981' : '#94a3b8'"
                          font-size="2.7"
                          font-weight="700"
                          font-family="ui-monospace, SFMono-Regular, monospace"
                        >
                          {{ art.delta }}
                        </text>
                        <text
                          x="-26"
                          y="-2.4"
                          fill="#e2e8f0"
                          font-size="2.7"
                          font-weight="700"
                          font-family="ui-monospace, SFMono-Regular, monospace"
                        >
                          {{ art.expr }}
                        </text>
                        <g transform="translate(-26, 0.2)">
                          <rect
                            x="0"
                            y="0"
                            width="32"
                            height="10"
                            rx="1.2"
                            fill="rgba(2, 6, 23, 0.85)"
                            stroke="rgba(148, 163, 184, 0.24)"
                            stroke-width="0.35"
                          />
                          <g transform="scale(0.71, 0.74)">
                            <polygon
                              :points="art.areaPoints"
                              :fill="art.isLocked ? 'rgba(16, 185, 129, 0.18)' : 'rgba(56, 189, 248, 0.15)'"
                            />
                            <rect
                              v-for="(bar, bIdx) in art.bars"
                              :key="`b-back-${bIdx}`"
                              :x="bar.x"
                              :y="bar.y"
                              :width="bar.w"
                              :height="bar.h"
                              rx="0.6"
                              :fill="art.color"
                              opacity="0.28"
                            />
                            <polyline
                              :points="art.secondaryPoints"
                              fill="none"
                              stroke="rgba(255, 255, 255, 0.35)"
                              stroke-width="0.7"
                              stroke-dasharray="1.2 1.2"
                            />
                            <polyline
                              :points="art.sparklinePoints"
                              fill="none"
                              :stroke="art.isLocked ? '#10b981' : art.color"
                              stroke-width="1.2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            />
                            <circle
                              :cx="art.cursorPoint.x"
                              :cy="art.cursorPoint.y"
                              r="1.45"
                              fill="#ffffff"
                              :stroke="art.isLocked ? '#10b981' : art.color"
                              stroke-width="0.8"
                            />
                          </g>
                        </g>
                        <text
                          x="26"
                          y="6.8"
                          text-anchor="end"
                          :fill="art.isLocked ? '#10b981' : '#f8fafc'"
                          font-size="2.8"
                          font-weight="800"
                          font-family="ui-monospace, SFMono-Regular, monospace"
                        >
                          {{ art.readout }}
                        </text>
                      </g>
                    </g>
                  </g>

                  <!-- LAYER 2 (MIDDLE): Central 32x32 Bauhaus Tile Frame & Solid 3D N-Sculpture -->
                  <rect
                    x="0.8"
                    y="0.8"
                    width="30.4"
                    height="30.4"
                    rx="7.2"
                    :fill="silhouetteMode ? '#09090b' : 'rgba(15, 23, 42, 0.88)'"
                    stroke="rgba(148, 163, 184, 0.32)"
                    stroke-width="0.45"
                  />

                  <!-- 3D Architectural Stage Platform Floor (Visible when rotated in 3D) -->
                  <polygon
                    v-if="!scene3D.isOrthographicLock"
                    :points="nSculpture3D.floorPoints"
                    fill="rgba(56, 189, 248, 0.05)"
                    stroke="rgba(99, 102, 241, 0.24)"
                    stroke-width="0.22"
                    stroke-dasharray="0.6 0.4"
                  />

                  <!-- Orthographic Laser Rays from 3D Solids to 2D Shadow Plane + N-Bridge Axis -->
                  <g
                    v-if="showLaserRays && !scene3D.isOrthographicLock"
                    stroke="#10b981"
                    stroke-width="0.24"
                    stroke-dasharray="0.55 0.55"
                    opacity="0.72"
                  >
                    <!-- 3D Structural N-Struts connecting [□ Pillar] <-> [△ Wedge] <-> [○ Sphere] -->
                    <line
                      :x1="nSculpture3D.bridgeTopA.x"
                      :y1="nSculpture3D.bridgeTopA.y"
                      :x2="nSculpture3D.bridgeTopB.x"
                      :y2="nSculpture3D.bridgeTopB.y"
                      stroke="#818cf8"
                    />
                    <line
                      :x1="nSculpture3D.bridgeLowA.x"
                      :y1="nSculpture3D.bridgeLowA.y"
                      :x2="nSculpture3D.bridgeLowB.x"
                      :y2="nSculpture3D.bridgeLowB.y"
                      stroke="#38bdf8"
                    />
                    <line
                      :x1="nSculpture3D.sphereAxisA.x"
                      :y1="nSculpture3D.sphereAxisA.y"
                      :x2="nSculpture3D.sphereAxisB.x"
                      :y2="nSculpture3D.sphereAxisB.y"
                    />
                  </g>

                  <!-- 1. [□] Solid Watertight 3D Golden Pillar (z = -4*phi^-1, Backface-Culled Opaque Sides) -->
                  <g :class="{ 'vec-pulse': activePulseConcept === 'PHI' && activePulseStep === 1 }">
                    <polygon
                      v-for="(s, idx) in scene3D.prismBox.visibleSides"
                      :key="`p-vis-${idx}`"
                      :points="s.points"
                      :fill="getPillarSideFill(s.shade)"
                      :stroke=" getPillarSideFill(Math.min(0.95, s.shade + 0.12))"
                      stroke-width="0.18"
                      stroke-linejoin="round"
                    />
                    <polygon
                      :points="scene3D.prismBox.frontPoints"
                      :fill="silhouetteMode ? '#ffffff' : 'url(#pillarFront3D)'"
                      stroke="rgba(199, 210, 254, 0.5)"
                      stroke-width="0.22"
                      stroke-linejoin="round"
                    />
                  </g>

                  <!-- 2. [△] Solid Watertight 3D Golden Wedge Triangle (z = 0, Backface-Culled Opaque Sides) -->
                  <g :class="{ 'vec-pulse': activePulseConcept === 'PHI' && activePulseStep === 2 }">
                    <polygon
                      v-for="(s, idx) in scene3D.wedgeTri.visibleSides"
                      :key="`t-vis-${idx}`"
                      :points="s.points"
                      :fill="getWedgeSideFill(s.shade)"
                      :stroke="getWedgeSideFill(Math.min(0.95, s.shade + 0.12))"
                      stroke-width="0.18"
                      stroke-linejoin="round"
                    />
                    <polygon
                      :points="scene3D.wedgeTri.frontPoints"
                      :fill="silhouetteMode ? '#ffffff' : 'url(#wedgeFront3D)'"
                      stroke="rgba(165, 243, 252, 0.55)"
                      stroke-width="0.22"
                      stroke-linejoin="round"
                    />
                  </g>

                  <!-- 3. [○] 3D Volumetric Quantum Sphere (z = +4*phi^-1) -->
                  <g :class="{ 'vec-pulse': activePulseConcept === 'PHI' && activePulseStep === 3 }">
                    <!-- Subtle 3D Equatorial Orbital Ring around the Sphere -->
                    <ellipse
                      v-if="!scene3D.isOrthographicLock"
                      :cx="scene3D.sphere.x"
                      :cy="scene3D.sphere.y"
                      :rx="scene3D.sphere.r * 1.32"
                      :ry="scene3D.sphere.r * 0.46"
                      :transform="`rotate(${(yawDeg * 0.35).toFixed(1)} ${scene3D.sphere.x} ${scene3D.sphere.y})`"
                      fill="none"
                      stroke="rgba(103, 232, 249, 0.45)"
                      stroke-width="0.2"
                    />
                    <circle
                      :cx="scene3D.sphere.x"
                      :cy="scene3D.sphere.y"
                      :r="scene3D.sphere.r"
                      :fill="silhouetteMode ? '#ffffff' : 'url(#labSphere3D)'"
                      stroke="rgba(165, 243, 252, 0.65)"
                      stroke-width="0.2"
                    />
                  </g>

                  <!-- INTERACTIVE CURSOR HOLOGRAPHIC FIELD (No Dragging Needed — Responds to Mouse Hover/Move!) -->
                  <g
                    v-if="cursorField.presence > 0.02"
                    class="cursor-holo-field"
                    :opacity="Math.min(1, cursorField.presence * 1.15)"
                  >
                    <!-- Magnetic Field Filaments linking Cursor -> [□ Pillar], [△ Wedge], [○ Sphere] -->
                    <line
                      :x1="cursorField.x"
                      :y1="cursorField.y"
                      :x2="scene3D.primitiveCenters.pillar.x"
                      :y2="scene3D.primitiveCenters.pillar.y"
                      stroke="#818cf8"
                      stroke-width="0.2"
                      stroke-dasharray="0.55 0.45"
                      opacity="0.68"
                    />
                    <line
                      :x1="cursorField.x"
                      :y1="cursorField.y"
                      :x2="scene3D.primitiveCenters.wedge.x"
                      :y2="scene3D.primitiveCenters.wedge.y"
                      stroke="#22d3ee"
                      stroke-width="0.2"
                      stroke-dasharray="0.55 0.45"
                      opacity="0.68"
                    />
                    <line
                      :x1="cursorField.x"
                      :y1="cursorField.y"
                      :x2="scene3D.primitiveCenters.sphere.x"
                      :y2="scene3D.primitiveCenters.sphere.y"
                      stroke="#34d399"
                      stroke-width="0.2"
                      stroke-dasharray="0.55 0.45"
                      opacity="0.68"
                    />

                    <!-- Golden Stardust Wave Trail -->
                    <circle
                      v-for="(pt, tIdx) in cursorTrail"
                      :key="`ct-${pt.id}`"
                      :cx="pt.x"
                      :cy="pt.y"
                      :r="Math.max(0.18, pt.r * (1 - tIdx * 0.13))"
                      :fill="tIdx % 2 === 0 ? '#38bdf8' : '#a78bfa'"
                      :opacity="Math.max(0.12, 0.62 - tIdx * 0.08)"
                    />

                    <!-- Concentric Golden-Ratio Phase Rings (r, r·φ, r·φ²) -->
                    <circle
                      :cx="cursorField.x"
                      :cy="cursorField.y"
                      :r="cursorField.rPhi2 * 1.45"
                      fill="url(#cursorHoloGlow)"
                    />
                    <circle
                      :cx="cursorField.x"
                      :cy="cursorField.y"
                      :r="cursorField.rPhi2"
                      fill="none"
                      stroke="rgba(167, 139, 250, 0.44)"
                      stroke-width="0.18"
                      stroke-dasharray="0.65 0.45"
                    />
                    <circle
                      :cx="cursorField.x"
                      :cy="cursorField.y"
                      :r="cursorField.rPhi"
                      fill="none"
                      stroke="rgba(56, 189, 248, 0.68)"
                      stroke-width="0.22"
                    />
                    <circle
                      :cx="cursorField.x"
                      :cy="cursorField.y"
                      :r="cursorField.rInner"
                      fill="rgba(56, 189, 248, 0.16)"
                      stroke="#67e8f9"
                      stroke-width="0.26"
                    />
                    <circle
                      :cx="cursorField.x"
                      :cy="cursorField.y"
                      r="0.36"
                      fill="#ffffff"
                    />
                    <text
                      v-if="deviceViewport !== 'mobile'"
                      :x="cursorField.x"
                      :y="cursorField.y - cursorField.rPhi2 - 0.75"
                      text-anchor="middle"
                      fill="#67e8f9"
                      font-size="1.22"
                      font-weight="800"
                      font-family="ui-monospace, SFMono-Regular, monospace"
                    >
                      Δψ={{ cursorField.cursorYawDelta >= 0 ? `+${cursorField.cursorYawDelta.toFixed(1)}` : cursorField.cursorYawDelta.toFixed(1) }}° · Δθ={{ cursorField.cursorPitchDelta >= 0 ? `+${cursorField.cursorPitchDelta.toFixed(1)}` : cursorField.cursorPitchDelta.toFixed(1) }}°
                    </text>
                  </g>

                  <!-- LAYER 3 (FRONT Z >= 0): FLOATING 3D HOLOGRAPHIC MATH.* CARDS & SATELLITES IN FOREGROUND -->
                  <g v-if="showMathArtifacts">
                    <g
                      v-for="tok in scene3D.orbitTokens.filter((t) => t.z >= 0)"
                      :key="tok.id"
                      :transform="`translate(${tok.x}, ${tok.y}) scale(${tok.scale})`"
                      :opacity="tok.opacity"
                    >
                      <circle r="0.38" :fill="tok.color" />
                      <text
                        v-if="deviceViewport !== 'mobile'"
                        x="0.75"
                        y="0.38"
                        :fill="tok.color"
                        font-size="1.3"
                        font-weight="800"
                        font-family="ui-monospace, SFMono-Regular, monospace"
                      >
                        {{ tok.text }}
                      </text>
                    </g>

                    <g v-if="deviceViewport !== 'mobile'">
                      <g
                        v-for="art in scene3D.frontArtifacts"
                        :key="art.id"
                        :opacity="art.opacity"
                      >
                        <line
                          :x1="art.x"
                          :y1="art.y"
                          :x2="art.anchorX"
                          :y2="art.anchorY"
                          :stroke="art.isLocked ? '#10b981' : art.color"
                          stroke-width="0.22"
                          stroke-dasharray="0.45 0.45"
                          opacity="0.85"
                        />
                        <circle
                          :cx="art.anchorX"
                          :cy="art.anchorY"
                          r="0.45"
                          :fill="art.isLocked ? '#10b981' : art.color"
                        />

                        <g :transform="`translate(${art.x}, ${art.y}) scale(${art.scale * 0.34})`">
                          <rect
                            x="-29"
                            y="-12.5"
                            width="58"
                            height="25"
                            rx="2.8"
                            fill="rgba(15, 23, 42, 0.94)"
                            :stroke="art.isLocked ? '#10b981' : art.color"
                            stroke-width="0.88"
                          />
                          <text
                            x="-26"
                            y="-7.2"
                            :fill="art.isLocked ? '#10b981' : art.color"
                            font-size="3.1"
                            font-weight="800"
                            font-family="ui-monospace, SFMono-Regular, monospace"
                          >
                            {{ art.tag }}
                          </text>
                          <text
                            x="26"
                            y="-7.2"
                            text-anchor="end"
                            :fill="art.isLocked ? '#10b981' : '#94a3b8'"
                            font-size="2.7"
                            font-weight="700"
                            font-family="ui-monospace, SFMono-Regular, monospace"
                          >
                            {{ art.delta }}
                          </text>
                          <text
                            x="-26"
                            y="-2.4"
                            fill="#f8fafc"
                            font-size="2.75"
                            font-weight="700"
                            font-family="ui-monospace, SFMono-Regular, monospace"
                          >
                            {{ art.expr }}
                          </text>

                          <g transform="translate(-26, 0.2)">
                            <rect
                              x="0"
                              y="0"
                              width="32"
                              height="10"
                              rx="1.2"
                              fill="rgba(2, 6, 23, 0.85)"
                              stroke="rgba(148, 163, 184, 0.28)"
                              stroke-width="0.35"
                            />
                            <g transform="scale(0.71, 0.74)">
                              <polygon
                                :points="art.areaPoints"
                                :fill="art.isLocked ? 'rgba(16, 185, 129, 0.22)' : 'rgba(56, 189, 248, 0.18)'"
                              />
                              <rect
                                v-for="(bar, bIdx) in art.bars"
                                :key="`b-front-${bIdx}`"
                                :x="bar.x"
                                :y="bar.y"
                                :width="bar.w"
                                :height="bar.h"
                                rx="0.6"
                                :fill="art.color"
                                opacity="0.32"
                              />
                              <polyline
                                :points="art.secondaryPoints"
                                fill="none"
                                stroke="rgba(255, 255, 255, 0.38)"
                                stroke-width="0.7"
                                stroke-dasharray="1.2 1.2"
                              />
                              <polyline
                                :points="art.sparklinePoints"
                                fill="none"
                                :stroke="art.isLocked ? '#10b981' : art.color"
                                stroke-width="1.25"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                              />
                              <circle
                                :cx="art.cursorPoint.x"
                                :cy="art.cursorPoint.y"
                                r="1.5"
                                fill="#ffffff"
                                :stroke="art.isLocked ? '#10b981' : art.color"
                                stroke-width="0.85"
                              />
                            </g>
                          </g>

                          <text
                            x="26"
                            y="6.8"
                            text-anchor="end"
                            :fill="art.isLocked ? '#10b981' : '#f8fafc'"
                            font-size="2.8"
                            font-weight="800"
                            font-family="ui-monospace, SFMono-Regular, monospace"
                          >
                            {{ art.readout }}
                          </text>
                        </g>
                      </g>
                    </g>
                  </g>
                </svg>

                <!-- Mobile Picture-in-Picture (PiP) 2D Flat Shadow Overlay -->
                <div
                  v-if="deviceViewport === 'mobile'"
                  class="mobile-pip-shadow"
                  :class="{ 'is-locked': scene3D.isOrthographicLock }"
                  @click.stop="animateToAngles(0, 0); triggerConceptDemo('PHI')"
                >
                  <svg viewBox="0 0 32 32" width="44" height="44">
                    <rect x="1" y="1" width="30" height="30" rx="7" fill="#0f172a" stroke="#334155" stroke-width="1" />
                    <rect x="7" y="7" width="4.25" height="18" rx="0.9" fill="#6366f1" />
                    <polygon :points="BAUHAUS_PHI_2D_SPEC.triangle.svgPoints" fill="#06b6d4" />
                    <circle cx="22.55" cy="9.45" r="2.45" fill="url(#labSphere2D)" stroke="#0284c7" stroke-width="0.3" />
                  </svg>
                  <span class="pip-caption mono">2D 1:1</span>
                </div>
              </div>
            </div>

            <div v-if="deviceViewport !== 'mobile'" class="projection-arrow">
              <span class="arrow-math mono">π_XY(x,y,z) = (x,y)</span>
              <span class="arrow-glyph">⟶</span>
              <span class="arrow-caption">Cień Ortogonalny 1:1</span>
            </div>

            <!-- Right / Split: Exact 2D Shadow (The Official Flat Logo + Monte Carlo N-Field!) -->
            <div v-if="deviceViewport !== 'mobile'" class="stage-box" :class="{ 'is-exact-match': scene3D.isOrthographicLock }">
              <div class="stage-box-head">
                <span class="stage-tag">CIEŃ 2D = LITERA "N" (&lt;rect&gt; □ + &lt;polygon&gt; △ + &lt;circle&gt; ○)</span>
                <span class="stage-coords mono">
                  {{
                    showMonteCarloOverlay
                      ? `MC: ${monteCarloState.totalHits}/${monteCarloState.totalShots} • N-Score=${(monteCarloState.nLegibilityScore * 100).toFixed(2)}%`
                      : `φ=${PHI.toFixed(3)} | φ⁻¹=${INV_PHI.toFixed(3)} | φ⁻²=${INV_PHI2.toFixed(3)} | φ⁻³=${INV_PHI3.toFixed(3)}`
                  }}
                </span>
              </div>

              <svg viewBox="0 0 32 32" width="216" height="216" class="stage-svg">
                <rect
                  x="1"
                  y="1"
                  width="30"
                  height="30"
                  rx="7.2"
                  :fill="silhouetteMode ? '#09090b' : 'var(--nano-bg-card-elevated, #0f172a)'"
                  stroke="var(--nano-border-card)"
                  stroke-width="1"
                />

                <!-- Golden Ratio & Right-Stem N-Continuity Construction Guides -->
                <g v-if="showGoldenGrid" class="phi-guides" stroke="#f59e0b" stroke-width="0.26" stroke-dasharray="0.7 0.7" opacity="0.72">
                  <rect x="7" y="7" width="18" height="18" fill="none" />
                  <rect x="20.75" y="7" width="4.25" height="18" fill="rgba(6, 182, 212, 0.06)" stroke="#06b6d4" stroke-width="0.22" />
                  <line x1="5" y1="13.875" x2="27" y2="13.875" />
                  <line x1="11.25" y1="5" x2="11.25" y2="27" />
                  <circle cx="22.55" cy="9.45" r="3.25" fill="none" />
                </g>

                <!-- 1. □ SQUARE/RECTANGLE PILLAR (<rect>) — Left Stem of 'N' -->
                <rect
                  x="7"
                  y="7"
                  width="4.25"
                  height="18"
                  rx="0.9"
                  :fill="silhouetteMode ? '#ffffff' : '#6366f1'"
                  :class="{ 'vec-pulse': activePulseConcept === 'PHI' && activePulseStep === 1 }"
                />

                <!-- 2. △ GOLDEN RIGHT TRIANGLE (<polygon>) — Diagonal + Lower-Right Foot of 'N' -->
                <polygon
                  :points="BAUHAUS_PHI_2D_SPEC.triangle.svgPoints"
                  :fill="silhouetteMode ? '#ffffff' : '#06b6d4'"
                  :class="{ 'vec-pulse': activePulseConcept === 'PHI' && activePulseStep === 2 }"
                />

                <!-- 3. ○ GOLDEN CIRCLE (<circle>) — Upper-Right Crown of 'N' -->
                <circle
                  cx="22.55"
                  cy="9.45"
                  r="2.45"
                  :fill="silhouetteMode ? '#ffffff' : 'url(#labSphere2D)'"
                  :stroke="silhouetteMode ? 'none' : 'rgba(2, 132, 199, 0.45)'"
                  stroke-width="0.28"
                  :class="{ 'vec-pulse': activePulseConcept === 'PHI' && activePulseStep === 3 }"
                />

                <!-- Monte Carlo Weyl-R2 Point-Shooting Overlay on the 2D 'N' Shadow -->
                <g v-if="showMonteCarloOverlay">
                  <circle
                    v-for="pt in monteCarloState.samples"
                    :key="`mc-${pt.id}`"
                    :cx="pt.x"
                    :cy="pt.y"
                    :r="pt.r"
                    :fill="pt.color"
                  />
                </g>

                <!-- 2D Orthographic Cursor Shadow Ripple π_XY(x,y,z) -> (x,y) -->
                <g
                  v-if="cursorField.presence > 0.02"
                  :opacity="Math.min(0.9, cursorField.presence)"
                >
                  <circle
                    :cx="16 + cursorField.normX * 9.5"
                    :cy="16 + cursorField.normY * 9.5"
                    :r="1.15 + cursorField.energy * 0.65"
                    fill="none"
                    stroke="#38bdf8"
                    stroke-width="0.28"
                    stroke-dasharray="0.5 0.4"
                  />
                  <circle
                    :cx="16 + cursorField.normX * 9.5"
                    :cy="16 + cursorField.normY * 9.5"
                    r="0.35"
                    fill="#38bdf8"
                  />
                </g>
              </svg>
            </div>
          </div>

          <!-- Mobile & Tablet Math.* Telemetry + Multi-Layer Nano-Charts Ribbon -->
          <div v-if="deviceViewport !== 'desktop'" class="mobile-math-ribbon">
            <div
              v-for="art in scene3D.floatingArtifacts"
              :key="`mob-${art.id}`"
              class="mobile-math-pill"
              :class="{ 'is-locked': art.isLocked }"
            >
              <div class="mob-pill-top">
                <span class="mob-pill-tag" :style="{ color: art.isLocked ? '#10b981' : art.color }">{{ art.tag }}</span>
                <span class="mob-pill-delta mono">{{ art.delta }}</span>
              </div>
              <div class="mob-pill-expr mono">{{ art.expr }}</div>
              <svg viewBox="0 0 44 13" width="100%" height="26" class="mob-pill-chart">
                <polygon
                  :points="art.areaPoints"
                  :fill="art.isLocked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.16)'"
                />
                <rect
                  v-for="(bar, bIdx) in art.bars"
                  :key="`mob-bar-${bIdx}`"
                  :x="bar.x"
                  :y="bar.y"
                  :width="bar.w"
                  :height="bar.h"
                  rx="0.6"
                  :fill="art.color"
                  opacity="0.3"
                />
                <polyline
                  :points="art.secondaryPoints"
                  fill="none"
                  stroke="var(--nano-text-muted)"
                  stroke-width="0.7"
                  stroke-dasharray="1.2 1.2"
                  opacity="0.45"
                />
                <polyline
                  :points="art.sparklinePoints"
                  fill="none"
                  :stroke="art.isLocked ? '#10b981' : art.color"
                  stroke-width="1.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <circle
                  :cx="art.cursorPoint.x"
                  :cy="art.cursorPoint.y"
                  r="1.4"
                  fill="var(--nano-bg-card)"
                  :stroke="art.isLocked ? '#10b981' : art.color"
                  stroke-width="0.9"
                />
              </svg>
              <div class="mob-pill-readout mono">{{ art.readout }}</div>
            </div>
          </div>

          <!-- 3D Camera Controls + Monte Carlo Shooter + Live Warm Ambient Audio Telemetry -->
          <div class="stage-controls">
            <div class="Preset-btns">
              <button
                type="button"
                class="stage-btn is-primary"
                :class="{ 'is-converging-live': isConverging }"
                @click="runConvergenceOptimization()"
              >
                {{
                  isConverging
                    ? `⚡ Trwa Omiatanie Math.* i Zbieżność L(Φ)... (${convergenceProgress}%)`
                    : '⚡ Zbieżność L(Φ): 1.0 → 10⁻⁹ (Omiatanie Math.* + Złoty Akord!)'
                }}
              </button>
              <button
                type="button"
                class="stage-btn"
                :class="{ 'is-active-orbit': showMonteCarloOverlay }"
                @click="runMonteCarloShootingDemo()"
              >
                {{
                  isMonteCarloShooting
                    ? `🎯 Strzelanie Monte Carlo (${monteCarloState.totalShots} pkt)...`
                    : '🎯 Monte Carlo N-Perfekcja (Strzelaj Punktami)'
                }}
              </button>
              <button type="button" class="stage-btn" :class="{ 'is-active-orbit': isAutoOrbiting }" @click="toggleAutoOrbit()">
                {{ isAutoOrbiting ? '🌊 Płynny Przepływ 3D + Kursor Φ (Aktywny)' : '🪐 Wznów Płynny Przepływ 3D' }}
              </button>
              <button type="button" class="stage-btn" @click="animateToAngles(0, 0); triggerConceptDemo('PHI')">
                🎯 Rzut Cienia 2D (0°, 0°)
              </button>
              <button type="button" class="stage-btn" @click="animateToAngles(34, 22)">
                🧊 Izometria 3D (34°, 22°)
              </button>
              <button type="button" class="stage-btn" @click="animateToAngles(-42, 18)">
                📐 Paralaksa Z (-42°, 18°)
              </button>
            </div>

            <!-- Live Warm Ambient Audio Telemetry Bar (Responds to Gentle Flow & Cursor Movement!) -->
            <div class="audio-telemetry-strip mono">
              <span>🎹 Nuta (Pitch θ): <strong>{{ liveAudioTelemetry.noteName }}</strong></span>
              <span>🎧 Stereo Pan (Yaw ψ): <strong>{{ liveAudioTelemetry.pan >= 0 ? `R +${liveAudioTelemetry.pan}` : `L ${liveAudioTelemetry.pan}` }}</strong></span>
              <span>🎛️ Ciepły Filtr LPF: <strong>{{ liveAudioTelemetry.cutoffHz }} Hz</strong></span>
              <span>🎶 Akord Ambient: <strong>216 + 270 + 324 Hz (Just Maj9)</strong></span>
            </div>

            <div class="sliders-row">
              <div class="slider-item">
                <span class="mono">Obrót Yaw (ψ): {{ yawDeg.toFixed(1) }}°</span>
                <NanoSlider :model-value="Math.round(yawDeg)" :min="-65" :max="65" :step="1" size="sm" @update:model-value="onSliderYaw" />
              </div>
              <div class="slider-item">
                <span class="mono">Nachylenie Pitch (θ): {{ pitchDeg.toFixed(1) }}°</span>
                <NanoSlider :model-value="Math.round(pitchDeg)" :min="-45" :max="45" :step="1" size="sm" @update:model-value="onSliderPitch" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Multi-Scale Preview + Alternatives (Hidden in Fullscreen Presentation for 100dvh Zero-Scroll) -->
      <div v-if="!isFullscreenPresentation" class="concepts-grid">
        <div
          v-for="item in concepts"
          :key="item.id"
          class="concept-card"
          :class="{
            'is-selected': sharedBrandConcept === item.id,
            'is-mono': silhouetteMode
          }"
          @click="triggerConceptDemo(item.id)"
        >
          <div class="concept-top">
            <span class="concept-badge">{{ item.badge }}</span>
            <span v-if="sharedBrandConcept === item.id" class="active-pill">✓ Aktywne w Sidebarze</span>
          </div>

          <h4 class="concept-name">{{ item.title }}</h4>
          <p class="concept-desc">{{ item.desc }}</p>

          <div class="scales-row">
            <div
              v-for="sz in [
                { px: 84, label: '84×84 Hero' },
                { px: 40, label: '40×40 Sidebar' },
                { px: 16, label: '16×16 Favicon' }
              ]"
              :key="sz.px"
              class="scale-item"
            >
              <!-- CONCEPT PHI: □ + △ + ○ (Uniform inset border: zero corner thickening!) -->
              <svg
                v-if="item.id === 'PHI'"
                :width="sz.px"
                :height="sz.px"
                viewBox="0 0 32 32"
                fill="none"
                class="concept-svg"
              >
                <rect
                  x="1"
                  y="1"
                  width="30"
                  height="30"
                  rx="7.2"
                  :fill="silhouetteMode ? '#09090b' : 'var(--nano-bg-card-elevated, #0f172a)'"
                  :stroke="silhouetteMode ? '#ffffff' : 'var(--nano-border-card, rgba(148,163,184,0.35))'"
                  stroke-width="1"
                />
                <rect
                  x="7"
                  y="7"
                  width="4.25"
                  height="18"
                  rx="0.9"
                  :fill="silhouetteMode ? '#ffffff' : '#6366f1'"
                  :class="{ 'vec-pulse': activePulseConcept === 'PHI' && activePulseStep === 1 }"
                />
                <polygon
                  :points="BAUHAUS_PHI_2D_SPEC.triangle.svgPoints"
                  :fill="silhouetteMode ? '#ffffff' : '#06b6d4'"
                  :class="{ 'vec-pulse': activePulseConcept === 'PHI' && activePulseStep === 2 }"
                />
                <circle
                  cx="22.55"
                  cy="9.45"
                  r="2.45"
                  :fill="silhouetteMode ? '#ffffff' : 'url(#labSphere2D)'"
                  :stroke="silhouetteMode ? 'none' : 'rgba(2, 132, 199, 0.45)'"
                  stroke-width="0.28"
                  :class="{ 'vec-pulse': activePulseConcept === 'PHI' && activePulseStep === 3 }"
                />
              </svg>

              <!-- CONCEPT A: ISOMETRIC N-PRISM -->
              <svg
                v-else-if="item.id === 'A'"
                :width="sz.px"
                :height="sz.px"
                viewBox="0 0 32 32"
                fill="none"
                class="concept-svg"
              >
                <rect
                  x="1"
                  y="1"
                  width="30"
                  height="30"
                  rx="7.2"
                  :fill="silhouetteMode ? '#09090b' : 'var(--nano-bg-card-elevated, #0f172a)'"
                  :stroke="silhouetteMode ? '#ffffff' : 'var(--nano-border-card, rgba(148,163,184,0.35))'"
                  stroke-width="1"
                />
                <path
                  d="M6.5 9.8 L11.5 6.8 L11.5 22.8 L6.5 25.8 Z"
                  :fill="silhouetteMode ? '#ffffff' : '#6366f1'"
                  :class="{ 'vec-pulse': activePulseConcept === 'A' && activePulseStep === 1 }"
                />
                <path
                  d="M13.3 7.2 L18.7 16.6 L18.7 24.8 L13.3 15.4 Z"
                  :fill="silhouetteMode ? '#ffffff' : '#06b6d4'"
                  :class="{ 'vec-pulse': activePulseConcept === 'A' && activePulseStep === 2 }"
                />
                <path
                  d="M20.5 6.8 L25.5 9.8 L25.5 21.8 L20.5 18.8 Z"
                  :fill="silhouetteMode ? '#ffffff' : '#0284c7'"
                  :class="{ 'vec-pulse': activePulseConcept === 'A' && activePulseStep === 3 }"
                />
              </svg>

              <!-- CONCEPT C: DETACHED QUANTUM NODE -->
              <svg
                v-else
                :width="sz.px"
                :height="sz.px"
                viewBox="0 0 32 32"
                fill="none"
                class="concept-svg"
              >
                <rect
                  x="1"
                  y="1"
                  width="30"
                  height="30"
                  rx="7.2"
                  :fill="silhouetteMode ? '#09090b' : 'var(--nano-bg-card-elevated, #0f172a)'"
                  :stroke="silhouetteMode ? '#ffffff' : 'var(--nano-border-card, rgba(148,163,184,0.35))'"
                  stroke-width="1"
                />
                <rect
                  x="7"
                  y="7.2"
                  width="4.8"
                  height="17.6"
                  rx="2.4"
                  :fill="silhouetteMode ? '#ffffff' : '#6366f1'"
                  :class="{ 'vec-pulse': activePulseConcept === 'C' && activePulseStep === 1 }"
                />
                <path
                  d="M10.5 9.2 L22.2 22.8 V16.2"
                  :stroke="silhouetteMode ? '#ffffff' : '#06b6d4'"
                  stroke-width="4.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  :class="{ 'vec-pulse': activePulseConcept === 'C' && activePulseStep === 2 }"
                />
                <circle
                  cx="22.2"
                  cy="9.4"
                  r="3.1"
                  :fill="silhouetteMode ? '#ffffff' : 'url(#labSphere2D)'"
                  :stroke="silhouetteMode ? 'none' : 'rgba(2, 132, 199, 0.45)'"
                  stroke-width="0.28"
                  :class="{ 'vec-pulse': activePulseConcept === 'C' && activePulseStep === 3 }"
                />
              </svg>

              <span class="scale-label">{{ sz.label }}</span>
            </div>
          </div>

          <NanoCodeBlock :title="`nano-ui-${item.id.toLowerCase()}.nsd`" lang="nanosound" :code="item.nsd" />
        </div>
      </div>
    </section>
  </Teleport>
</template>

<style scoped>
.logo-lab-card {
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-card);
  border-radius: 16px;
  padding: 1.75rem;
  margin-top: 1.5rem;
  margin-bottom: 2.75rem;
  box-shadow: var(--nano-shadow-card);
}

.logo-lab-card.is-fullscreen-deck {
  position: fixed !important;
  inset: 0 !important;
  z-index: 99999 !important;
  margin: 0 !important;
  border-radius: 0 !important;
  border: none !important;
  width: 100dvw !important;
  height: 100dvh !important;
  padding: 1.15rem 1.75rem !important;
  overflow-y: auto !important;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: var(--nano-bg-app, #090d16);
}

.logo-lab-card.is-fullscreen-deck .device-viewport-frame {
  max-width: 1240px;
  margin-bottom: 0;
}

.logo-lab-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}

.logo-lab-header.is-fullscreen-header {
  width: 100%;
  max-width: 1240px;
  margin: 0 auto 0.85rem auto;
}

.header-actions-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.header-actions-col.is-fullscreen-bar {
  width: 100%;
  flex-direction: row-reverse;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.device-switcher-bar {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  background: var(--nano-bg-muted);
  padding: 4px;
  border-radius: 10px;
  border: 1px solid var(--nano-border-card);
}

.device-pill {
  padding: 6px 11px;
  border-radius: 7px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--nano-text-muted);
  font-size: 0.76rem;
  font-weight: 800;
  cursor: pointer;
}

.device-pill.is-active {
  background: var(--nano-bg-card-elevated);
  color: var(--nano-text-main);
  border-color: var(--nano-accent-primary, #6366f1);
}

.device-pill.is-fullscreen-btn {
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.28);
  background: rgba(16, 185, 129, 0.08);
}

.device-pill.is-fullscreen-btn:hover {
  background: rgba(16, 185, 129, 0.16);
}

.device-viewport-frame {
  width: 100%;
  margin: 0 auto 1.75rem auto;
  transition: max-width 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.device-viewport-frame.frame-tablet {
  max-width: 780px;
  border: 1.5px solid var(--nano-border-card);
  border-radius: 20px;
  padding: 16px;
  background: var(--nano-bg-muted);
  box-shadow: var(--nano-shadow-card);
}

.device-viewport-frame.frame-mobile {
  max-width: 400px;
  border: 2px solid var(--nano-border-card);
  border-radius: 28px;
  padding: 14px;
  background: var(--nano-bg-muted);
  box-shadow: var(--nano-shadow-card);
}

.lab-kicker {
  display: inline-block;
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--nano-state-active, #0284c7);
  margin-bottom: 4px;
}

.lab-title {
  margin: 0 0 6px 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--nano-text-main);
}

.lab-sub {
  margin: 0;
  font-size: 0.9rem;
  color: var(--nano-text-muted);
  max-width: 720px;
  line-height: 1.55;
}

.lab-toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.silhouette-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 10px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-card);
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--nano-text-main);
  cursor: pointer;
  user-select: none;
}

.perfection-hud {
  background: var(--nano-bg-card-elevated);
  border: 1px solid var(--nano-border-card);
  border-radius: 12px;
  padding: 10px 14px;
  margin-bottom: 0.85rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.perfection-hud.is-converged {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.08);
}

.hud-main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.hud-label {
  font-size: 0.74rem;
  font-weight: 800;
  color: var(--nano-text-main);
}

.hud-value {
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--nano-state-active, #0284c7);
}

.perfection-hud.is-converged .hud-value {
  color: #10b981;
}

.hud-badge {
  font-size: 0.7rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-card);
  color: var(--nano-text-muted);
}

.hud-badge.is-ok {
  background: rgba(16, 185, 129, 0.18);
  border-color: rgba(16, 185, 129, 0.45);
  color: #10b981;
}

.hud-submetrics {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 0.69rem;
  color: var(--nano-text-muted);
}

.projection-stage {
  background: var(--nano-bg-card-elevated);
  border: 1px solid var(--nano-border-card);
  border-radius: 14px;
  padding: 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stage-visuals {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 1.15rem;
  flex-wrap: wrap;
}

.stage-box {
  flex: 1;
  min-width: 220px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-subtle);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.stage-box-wide {
  flex: 1.65;
  min-width: 280px;
}

.stage-3d-canvas-wrap {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
}

.mobile-pip-shadow {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(15, 23, 42, 0.92);
  border: 1.5px solid rgba(56, 189, 248, 0.55);
  border-radius: 10px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}

.mobile-pip-shadow.is-locked {
  border-color: #10b981;
}

.pip-caption {
  font-size: 0.58rem;
  font-weight: 800;
  color: #38bdf8;
}

.mobile-math-ribbon {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.is-device-tablet .mobile-math-ribbon {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.mobile-math-pill {
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-card);
  border-radius: 10px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.mobile-math-pill.is-locked {
  border-color: #10b981;
}

.mob-pill-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4px;
  font-size: 0.66rem;
  font-weight: 800;
  white-space: nowrap;
}

.mob-pill-tag {
  overflow: hidden;
  text-overflow: ellipsis;
}

.mob-pill-delta {
  color: var(--nano-text-muted);
  flex-shrink: 0;
}

.mob-pill-expr {
  font-size: 0.65rem;
  color: var(--nano-text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mob-pill-readout {
  font-size: 0.68rem;
  font-weight: 800;
  color: var(--nano-text-secondary);
  white-space: nowrap;
}

.stage-box.is-interactive-3d {
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.stage-box.is-interactive-3d.is-dragging {
  cursor: grabbing;
}

.stage-box.is-exact-match {
  border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.22);
}

.stage-box-head {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.stage-tag {
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--nano-text-main);
}

.stage-coords {
  font-size: 0.68rem;
  color: var(--nano-text-muted);
}

.projection-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--nano-state-active, #0284c7);
}

.arrow-math {
  font-size: 0.7rem;
  font-weight: 700;
}

.arrow-glyph {
  font-size: 1.8rem;
  line-height: 1;
}

.arrow-caption {
  font-size: 0.68rem;
  color: var(--nano-text-muted);
}

.stage-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--nano-border-subtle);
}

.Preset-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.is-device-mobile .Preset-btns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.is-device-mobile .Preset-btns .stage-btn.is-primary {
  grid-column: 1 / -1;
}

.stage-btn {
  padding: 8px 12px;
  border-radius: 9px;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-muted);
  color: var(--nano-text-main);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.stage-btn:hover {
  border-color: var(--nano-border-hover);
  background: var(--nano-bg-hover);
}

.stage-btn.is-primary {
  border-color: #10b981;
  color: #10b981;
  background: rgba(16, 185, 129, 0.08);
}

.stage-btn.is-primary.is-converging-live {
  background: rgba(16, 185, 129, 0.18);
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
}

.stage-btn.is-active-orbit {
  border-color: var(--nano-accent-primary, #6366f1);
  color: var(--nano-accent-primary, #6366f1);
}

.audio-telemetry-strip {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 9px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-subtle);
  font-size: 0.71rem;
  color: var(--nano-text-muted);
}

.audio-telemetry-strip strong {
  color: var(--nano-state-active, #0284c7);
}

.sliders-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}

.slider-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--nano-text-muted);
}

.concepts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
  gap: 1.35rem;
  padding-top: 0.25rem;
}

.concept-card {
  background: var(--nano-bg-card-elevated);
  border: 1px solid var(--nano-border-card);
  border-radius: 14px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.concept-card.is-selected {
  border-color: var(--nano-accent-primary, #6366f1);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.22);
}

.concept-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.concept-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-card);
  color: var(--nano-text-secondary);
}

.active-pill {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.16);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.concept-name {
  margin: 0;
  font-size: 1.02rem;
  font-weight: 800;
  color: var(--nano-text-main);
}

.concept-desc {
  margin: 0;
  font-size: 0.81rem;
  line-height: 1.5;
  color: var(--nano-text-muted);
}

.scales-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: 12px;
  padding: 14px 10px;
  border-radius: 10px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-subtle);
}

.scale-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.scale-label {
  font-size: 0.68rem;
  font-family: ui-monospace, SFMono-Regular, monospace;
  color: var(--nano-text-muted);
}

.concept-svg {
  display: block;
}

.stage-svg {
  max-width: 100%;
  height: auto;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, monospace;
}

.vec-pulse {
  filter: drop-shadow(0 0 5px rgba(56, 189, 248, 0.95));
  transition: filter 0.08s ease;
}

@media (max-width: 767px) {
  .header-actions-col {
    align-items: flex-start;
  }
  .projection-arrow {
    display: none;
  }
}
</style>
