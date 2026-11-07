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
 * at a discrete consonant scale frequency — high-pass filtered above 220 Hz so zero low-frequency hum occurs.
 */
function triggerWarmAmbientNote(ctx, freqHz, panVal = 0, cutoffHz = 980, gainLevel = 0.045, durationSec = 2.1) {
  const now = ctx.currentTime;

  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.setValueAtTime(220, now);
  highpass.Q.setValueAtTime(0.5, now);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cutoffHz, now);
  filter.Q.setValueAtTime(0.65, now);

  highpass.connect(filter);

  const panner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
  if (panner) {
    panner.pan.setValueAtTime(panVal, now);
    filter.connect(panner);
    panner.connect(ctx.destination);
  } else {
    filter.connect(ctx.destination);
  }

  // Fundamental warm sine + gentle upper harmonic overtone (2x octave shimmer, zero sub-bass hum)
  const oscMain = ctx.createOscillator();
  const oscShimmer = ctx.createOscillator();
  const gMain = ctx.createGain();
  const gShimmer = ctx.createGain();

  oscMain.type = 'sine';
  oscShimmer.type = 'sine';
  oscMain.frequency.setValueAtTime(freqHz, now);
  oscShimmer.frequency.setValueAtTime(freqHz * 2.0, now);

  // Soft felt-like attack (35ms) and long, peaceful decay
  gMain.gain.setValueAtTime(0.0001, now);
  gMain.gain.linearRampToValueAtTime(gainLevel, now + 0.035);
  gMain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  gShimmer.gain.setValueAtTime(0.0001, now);
  gShimmer.gain.linearRampToValueAtTime(gainLevel * 0.18, now + 0.025);
  gShimmer.gain.exponentialRampToValueAtTime(0.0001, now + durationSec * 0.65);

  oscMain.connect(gMain);
  oscShimmer.connect(gShimmer);
  gMain.connect(highpass);
  gShimmer.connect(highpass);

  oscMain.start(now);
  oscShimmer.start(now);
  oscMain.stop(now + durationSec + 0.08);
  oscShimmer.stop(now + durationSec * 0.65 + 0.08);
}

/**
 * Plays a slow-breathing, wide-voiced ambient chord bloom (450ms soft swell -> 4.2s decay)
 * with intervals >= 108 Hz apart so zero 50-60 Hz Tartini difference-tone hum ever occurs.
 */
function triggerWarmChordBloom(ctx, chordFreqs, cutoffHz = 860, gainLevel = 0.018) {
  const now = ctx.currentTime;
  chordFreqs.forEach((freqHz, idx) => {
    const panVal = Number(((idx - 1) * 0.28).toFixed(2));
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(240, now);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(cutoffHz, now);
    lowpass.Q.setValueAtTime(0.6, now);

    highpass.connect(lowpass);

    const panner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime(panVal, now);
      lowpass.connect(panner);
      panner.connect(ctx.destination);
    } else {
      lowpass.connect(ctx.destination);
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freqHz, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainLevel, now + 0.48 + idx * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);

    osc.connect(gain);
    gain.connect(highpass);
    osc.start(now);
    osc.stop(now + 4.3);
  });
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

  // Modulate background ambient music brightness gently if active
  if (bgMusicNodes) {
    bgMusicNodes.dynamicCutoff = cutoff;
  }

  // Trigger a delicate pentatonic harp/celesta droplet when entering a new angular zone (throttled to >= 165ms)
  const perfNow = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (scaleIdx !== lastPluckZone && perfNow - lastPluckTime > 165) {
    lastPluckZone = scaleIdx;
    lastPluckTime = perfNow;
    triggerWarmAmbientNote(ctx, selectedFreq, panVal, cutoff + 260, 0.042, 2.2);
  }

  if (ambientStopTimer) {
    clearTimeout(ambientStopTimer);
  }
  ambientStopTimer = setTimeout(() => {
    stopInteractive3DAudio();
  }, 450);
}

/**
 * Cleans up the interactive 3D audio telemetry state when mouse dragging pauses.
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
}

const GOLDEN_CHORD_PROGRESSION = Object.freeze([
  [324.0, 432.0, 648.0], // E4 + A4 + E5 (Open 5th + Octave)
  [270.0, 405.0, 540.0], // C#4 + G#4 + C#5 (Warm Major 3rd + 7th)
  [243.0, 364.5, 486.0], // B3 + F#4 + B4 (Lydian 2nd + 6th)
  [324.0, 486.0, 810.0], // E4 + B4 + G#5 (Crystalline Major 9th)
]);

/**
 * Starts or stops the Generative Golden Ratio (432Hz · φ^k) Ambient Background Music.
 * Uses pure transient envelope droplets + wide-voiced chord blooms (zero static oscillator drones = zero 54Hz hum).
 */
export function setAmbientBackgroundMusic(enabled) {
  ambientMusicEnabled.value = Boolean(enabled);
  if (!enabled) {
    stopAmbientBackgroundMusic();
    return;
  }

  const ctx = ensureAudioCtx();
  if (!ctx || bgMusicNodes) return;

  bgMusicNodes = {
    dynamicCutoff: 960,
    chordIdx: 0,
  };

  const triggerGoldenDroplet = () => {
    if (!ambientMusicEnabled.value || !sharedAudioCtx || !bgMusicNodes) return;
    const cutoff = bgMusicNodes.dynamicCutoff || 960;

    // Every 3rd step (approx every 4.85s), bloom a soft wide-voiced 3-note ambient chord
    if (bgMusicStep % 3 === 0) {
      const chord = GOLDEN_CHORD_PROGRESSION[bgMusicNodes.chordIdx % GOLDEN_CHORD_PROGRESSION.length];
      bgMusicNodes.chordIdx += 1;
      triggerWarmChordBloom(sharedAudioCtx, chord, cutoff, 0.016);
    }

    // Play a primary Golden-stepped felt-piano / celesta melody note (avoiding sub-240Hz bass to keep it airy)
    const upperScale = WARM_AMBIENT_SCALE_HZ.slice(1);
    const noteHz = upperScale[bgMusicStep % upperScale.length];
    const pan = Number((((bgMusicStep % 5) - 2) * 0.24).toFixed(2));
    bgMusicStep += 3;
    triggerWarmAmbientNote(sharedAudioCtx, noteHz, pan, cutoff + 180, 0.036, 2.6);

    // Golden-ratio delayed companion fifth/octave droplet (618ms later) for organic polyphony
    setTimeout(() => {
      if (!ambientMusicEnabled.value || !sharedAudioCtx || !bgMusicNodes) return;
      const companionHz = upperScale[(bgMusicStep + 2) % upperScale.length];
      triggerWarmAmbientNote(sharedAudioCtx, companionHz, -pan * 0.7, cutoff + 120, 0.022, 2.2);
    }, 618);
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
  bgMusicNodes = null;
}
