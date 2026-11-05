import { ref } from 'vue';
import { PHI } from '../utils/bauhausPhiLogo.js';

export const sharedBrandConcept = ref('PHI'); // 'PHI' | 'A' | 'C'
export const interactiveSoundEnabled = ref(true);
export const ambientMusicEnabled = ref(false);

/**
 * Consonance-tuned 432 Hz Warm Lydian / Major Pentatonic Ambient Scale (Just Intonation):
 * 100% pure harmonic ratios (1:1, 9:8, 5:4, 3:2, 15:8, 2:1) — zero dissonance, zero spooky glides!
 */
export const WARM_AMBIENT_SCALE_HZ = Object.freeze([
  216.0,  // Root (Octave -1)
  243.0,  // Major 2nd (9:8)
  270.0,  // Major 3rd (5:4)
  324.0,  // Perfect 5th (3:2)
  364.5,  // Major 6th (27:16)
  405.0,  // Major 7th (15:8)
  432.0,  // Fundamental Root (1:1)
  486.0,  // Major 9th (9:4)
  540.0,  // Major 10th (5:2)
  648.0,  // Perfect 12th (3:1)
  810.0,  // Sweet High Major 7th (15:4)
]);

export const WARM_NOTE_NAMES = Object.freeze([
  'A3 (216Hz)',
  'B3 (243Hz)',
  'C#4 (270Hz)',
  'E4 (324Hz)',
  'F#4 (365Hz)',
  'G#4 (405Hz)',
  'A4 (432Hz)',
  'B4 (486Hz)',
  'C#5 (540Hz)',
  'E5 (648Hz)',
  'G#5 (810Hz)',
]);

/**
 * Live 6-parameter acoustic telemetry updated in real time during 3D mouse dragging & convergence.
 */
export const liveAudioTelemetry = ref({
  isActive: false,
  noteName: 'A4 (432Hz)',
  pitchHz: 432.0,
  subHz: 216.0,
  bellHz: 648.0,
  pan: 0.0,
  cutoffHz: 780,
  resonanceQ: 0.71,
  detuneCents: 0.0,
  dopplerHz: 1.0,
});

let sharedAudioCtx = null;
let ambientNodes = null;
let ambientStopTimer = null;
let bgMusicNodes = null;
let bgMusicArpTimer = null;
let bgMusicStep = 0;
let lastPluckZone = -1;
let lastPluckTime = 0;

function ensureAudioCtx() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

/**
 * Plays a single warm, soft-attack ambient acoustic droplet (like a felt piano / handpan / celesta note)
 * at a discrete consonant scale frequency — never glides pitch like a ghost!
 */
function triggerWarmAmbientNote(ctx, freqHz, panVal = 0, cutoffHz = 920, gainLevel = 0.045) {
  const now = ctx.currentTime;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cutoffHz, now);
  filter.Q.setValueAtTime(0.65, now);

  const panner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
  if (panner) {
    panner.pan.setValueAtTime(panVal, now);
    filter.connect(panner);
    panner.connect(ctx.destination);
  } else {
    filter.connect(ctx.destination);
  }

  // Fundamental warm sine + soft octave-down sub-warmth
  const oscMain = ctx.createOscillator();
  const oscWarmth = ctx.createOscillator();
  const gMain = ctx.createGain();
  const gWarmth = ctx.createGain();

  oscMain.type = 'sine';
  oscWarmth.type = 'triangle';
  oscMain.frequency.setValueAtTime(freqHz, now);
  oscWarmth.frequency.setValueAtTime(freqHz * 0.5, now);

  // Soft felt-like attack (35ms) and long, peaceful decay (1.65s)
  gMain.gain.setValueAtTime(0.0001, now);
  gMain.gain.linearRampToValueAtTime(gainLevel, now + 0.035);
  gMain.gain.exponentialRampToValueAtTime(0.0001, now + 1.65);

  gWarmth.gain.setValueAtTime(0.0001, now);
  gWarmth.gain.linearRampToValueAtTime(gainLevel * 0.35, now + 0.045);
  gWarmth.gain.exponentialRampToValueAtTime(0.0001, now + 1.45);

  oscMain.connect(gMain);
  oscWarmth.connect(gWarmth);
  gMain.connect(filter);
  gWarmth.connect(filter);

  oscMain.start(now);
  oscWarmth.start(now);
  oscMain.stop(now + 1.72);
  oscWarmth.stop(now + 1.52);
}

/**
 * Plays the warm, low-pass filtered 3-vector Bauhaus Φ Sonic Logo (.nsd).
 * Uses soft felt-piano attack envelopes and pure Major 9th / Golden consonance.
 */
export function playConceptSonicLogo(conceptId = 'PHI') {
  if (!interactiveSoundEnabled.value) return;
  const ctx = ensureAudioCtx();
  if (!ctx) return;

  const presets = {
    PHI: [
      { delay: 0, freq: 216.0, pan: -0.25, cutoff: 880, gain: 0.065 },
      { delay: 90, freq: 324.0, pan: 0.0, cutoff: 1050, gain: 0.058 },
      { delay: 180, freq: 432.0, pan: 0.2, cutoff: 1200, gain: 0.062 },
      { delay: 270, freq: 540.0, pan: 0.0, cutoff: 1350, gain: 0.052 },
    ],
    A: [
      { delay: 0, freq: 243.0, pan: -0.2, cutoff: 900, gain: 0.058 },
      { delay: 95, freq: 324.0, pan: 0.0, cutoff: 1050, gain: 0.054 },
      { delay: 190, freq: 486.0, pan: 0.2, cutoff: 1250, gain: 0.058 },
    ],
    C: [
      { delay: 0, freq: 270.0, pan: -0.2, cutoff: 920, gain: 0.058 },
      { delay: 95, freq: 405.0, pan: 0.0, cutoff: 1100, gain: 0.054 },
      { delay: 190, freq: 540.0, pan: 0.2, cutoff: 1280, gain: 0.058 },
    ],
  };

  const notes = presets[conceptId] || presets.PHI;
  for (const n of notes) {
    setTimeout(() => {
      if (interactiveSoundEnabled.value && sharedAudioCtx) {
        triggerWarmAmbientNote(sharedAudioCtx, n.freq, n.pan, n.cutoff, n.gain);
      }
    }, n.delay);
  }
}

/**
 * Gentle, Pleasant Ambient Soundscape coupled to 3D mouse dragging & convergence:
 * - ZERO spooky ghost pitch-bends!
 * - Sustains a whisper-soft, fixed Major 9th warm velvet pad (216 Hz + 270 Hz + 324 Hz + 405 Hz)
 *   whose stereo pan (L/R) and warm low-pass filter cutoff (420 Hz -> 1180 Hz) breathe with the mouse.
 * - Crossing angular zones gently plucks discrete, consonant pentatonic harp/celesta notes!
 */
export function updateInteractive3DAudio(yawDeg = 0, pitchDeg = 0, perfectionScalar = 0.5) {
  const harmonyCloseness = Math.max(0, Math.min(1, 1 - perfectionScalar));
  const yawNorm = Math.max(-1, Math.min(1, yawDeg / 65));
  const pitchNorm = Math.max(-1, Math.min(1, -pitchDeg / 45));

  // Map vertical & horizontal angle to a discrete, consonant note in WARM_AMBIENT_SCALE_HZ
  const normPos = Math.max(0, Math.min(0.999, (pitchNorm + 1) * 0.35 + (yawNorm + 1) * 0.15));
  const scaleIdx = Math.floor(normPos * WARM_AMBIENT_SCALE_HZ.length);
  const selectedFreq = WARM_AMBIENT_SCALE_HZ[scaleIdx];
  const selectedName = WARM_NOTE_NAMES[scaleIdx];

  const panVal = Number((yawNorm * 0.65).toFixed(2));
  const cutoff = Math.round(440 + (pitchNorm + 1) * 260 + harmonyCloseness * 380);

  liveAudioTelemetry.value = {
    isActive: true,
    noteName: selectedName,
    pitchHz: selectedFreq,
    subHz: 216.0,
    bellHz: 324.0,
    pan: panVal,
    cutoffHz: cutoff,
    resonanceQ: 0.71,
    detuneCents: 0.0,
    dopplerHz: Number((1 / (PHI * 4)).toFixed(2)),
  };

  if (!interactiveSoundEnabled.value) return;
  const ctx = ensureAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Modulate background ambient music filter gently if active
  if (bgMusicNodes) {
    bgMusicNodes.filter.frequency.setTargetAtTime(cutoff, now, 0.12);
  }

  // Create whisper-soft, fixed-pitch Major 9th velvet pad (zero pitch bending = zero ghost sound!)
  if (!ambientNodes) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, now);
    filter.Q.setValueAtTime(0.65, now);

    const panner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime(panVal, now);
    }

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);

    // Fixed consonant chord: 216 Hz (A3 Root), 270 Hz (C#4 Major 3rd), 324 Hz (E4 Pure 5th)
    const oscRoot = ctx.createOscillator();
    const oscThird = ctx.createOscillator();
    const oscFifth = ctx.createOscillator();

    oscRoot.type = 'sine';
    oscThird.type = 'sine';
    oscFifth.type = 'triangle';

    oscRoot.frequency.setValueAtTime(216.0, now);
    oscThird.frequency.setValueAtTime(270.0, now);
    oscFifth.frequency.setValueAtTime(324.0, now);

    const gRoot = ctx.createGain();
    const gThird = ctx.createGain();
    const gFifth = ctx.createGain();

    gRoot.gain.setValueAtTime(0.45, now);
    gThird.gain.setValueAtTime(0.30, now);
    gFifth.gain.setValueAtTime(0.22, now);

    oscRoot.connect(gRoot);
    oscThird.connect(gThird);
    oscFifth.connect(gFifth);

    gRoot.connect(filter);
    gThird.connect(filter);
    gFifth.connect(filter);

    if (panner) {
      filter.connect(panner);
      panner.connect(masterGain);
    } else {
      filter.connect(masterGain);
    }
    masterGain.connect(ctx.destination);

    oscRoot.start(now);
    oscThird.start(now);
    oscFifth.start(now);

    ambientNodes = {
      filter,
      panner,
      masterGain,
      oscRoot,
      oscThird,
      oscFifth,
    };
  }

  // Only modulate warm filter brightness and stereo balance — keep pad frequencies 100% locked & consonant!
  ambientNodes.filter.frequency.setTargetAtTime(cutoff, now, 0.08);
  if (ambientNodes.panner) {
    ambientNodes.panner.pan.setTargetAtTime(panVal, now, 0.08);
  }
  ambientNodes.masterGain.gain.setTargetAtTime(0.028 + harmonyCloseness * 0.018, now, 0.12);

  // Trigger a delicate pentatonic harp/celesta droplet when entering a new angular zone (throttled to >= 190ms)
  const perfNow = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (scaleIdx !== lastPluckZone && perfNow - lastPluckTime > 190) {
    lastPluckZone = scaleIdx;
    lastPluckTime = perfNow;
    triggerWarmAmbientNote(ctx, selectedFreq, panVal, cutoff + 260, 0.036);
  }

  if (ambientStopTimer) {
    clearTimeout(ambientStopTimer);
  }
  ambientStopTimer = setTimeout(() => {
    stopInteractive3DAudio();
  }, 450);
}

/**
 * Gently fades out and cleans up the short-term interactive 3D ambient pad.
 */
export function stopInteractive3DAudio() {
  if (ambientStopTimer) {
    clearTimeout(ambientStopTimer);
    ambientStopTimer = null;
  }
  liveAudioTelemetry.value = {
    ...liveAudioTelemetry.value,
    isActive: false,
  };
  if (!ambientNodes || !sharedAudioCtx) return;

  const nodes = ambientNodes;
  ambientNodes = null;
  const now = sharedAudioCtx.currentTime;

  try {
    nodes.masterGain.gain.setTargetAtTime(0.0001, now, 0.18);
    setTimeout(() => {
      try {
        nodes.oscRoot.stop();
        nodes.oscThird.stop();
        nodes.oscFifth.stop();
        nodes.masterGain.disconnect();
      } catch {
        // Ignore cleanup errors
      }
    }, 650);
  } catch {
    // Ignore context errors
  }
}

/**
 * Starts or stops the optional Generative Golden Ratio (432Hz · φ^k) Ambient Background Music.
 */
export function setAmbientBackgroundMusic(enabled) {
  ambientMusicEnabled.value = Boolean(enabled);
  if (!enabled) {
    stopAmbientBackgroundMusic();
    return;
  }

  const ctx = ensureAudioCtx();
  if (!ctx || bgMusicNodes) return;

  const now = ctx.currentTime;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(580, now);
  filter.Q.setValueAtTime(0.65, now);

  // Slow LFO (0.154 Hz ≈ 1 / 4φ) breathing the low-pass filter
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(1 / (PHI * 4), now);
  lfoGain.gain.setValueAtTime(180, now);
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.0001, now);
  masterGain.gain.linearRampToValueAtTime(0.055, now + 1.5);

  // Warm 3-voice Major triad drone: 216 Hz (Root) + 270 Hz (Major 3rd) + 324 Hz (Pure 5th)
  const oscSub = ctx.createOscillator();
  const oscRoot = ctx.createOscillator();
  const oscFifth = ctx.createOscillator();

  oscSub.type = 'sine';
  oscRoot.type = 'sine';
  oscFifth.type = 'sine';

  oscSub.frequency.setValueAtTime(216.0, now);
  oscRoot.frequency.setValueAtTime(270.0, now);
  oscFifth.frequency.setValueAtTime(324.0, now);

  const gSub = ctx.createGain();
  const gRoot = ctx.createGain();
  const gFifth = ctx.createGain();

  gSub.gain.setValueAtTime(0.40, now);
  gRoot.gain.setValueAtTime(0.32, now);
  gFifth.gain.setValueAtTime(0.28, now);

  oscSub.connect(gSub);
  oscRoot.connect(gRoot);
  oscFifth.connect(gFifth);
  gSub.connect(filter);
  gRoot.connect(filter);
  gFifth.connect(filter);
  filter.connect(masterGain);
  masterGain.connect(ctx.destination);

  lfo.start(now);
  oscSub.start(now);
  oscRoot.start(now);
  oscFifth.start(now);

  bgMusicNodes = {
    filter,
    lfo,
    masterGain,
    oscSub,
    oscRoot,
    oscFifth,
  };

  const triggerGoldenDroplet = () => {
    if (!ambientMusicEnabled.value || !sharedAudioCtx || !bgMusicNodes) return;
    const noteHz = WARM_AMBIENT_SCALE_HZ[bgMusicStep % WARM_AMBIENT_SCALE_HZ.length];
    const pan = Number((((bgMusicStep % 5) - 2) * 0.22).toFixed(2));
    bgMusicStep += 3;
    triggerWarmAmbientNote(sharedAudioCtx, noteHz, pan, 980, 0.038);
  };

  triggerGoldenDroplet();
  bgMusicArpTimer = setInterval(triggerGoldenDroplet, 1618);
}

export function stopAmbientBackgroundMusic() {
  ambientMusicEnabled.value = false;
  if (bgMusicArpTimer) {
    clearInterval(bgMusicArpTimer);
    bgMusicArpTimer = null;
  }
  if (!bgMusicNodes || !sharedAudioCtx) return;

  const nodes = bgMusicNodes;
  bgMusicNodes = null;
  const now = sharedAudioCtx.currentTime;

  try {
    nodes.masterGain.gain.setTargetAtTime(0.0001, now, 0.25);
    setTimeout(() => {
      try {
        nodes.lfo.stop();
        nodes.oscSub.stop();
        nodes.oscRoot.stop();
        nodes.oscFifth.stop();
        nodes.masterGain.disconnect();
      } catch {
        // Ignore cleanup errors
      }
    }, 850);
  } catch {
    // Ignore context errors
  }
}
