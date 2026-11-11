import { ref, readonly } from 'vue';
import { compileNsdPreview } from './nsd-preview.js';
import { clamp, shortestAngleDiff } from './math.js';

const isObj = (val) => Object.prototype.toString.call(val) === '[object Object]';
const isStr = (val) => Object.prototype.toString.call(val) === '[object String]';
const isFn = (val) => {
  const tag = Object.prototype.toString.call(val);
  return tag === '[object Function]' || tag === '[object AsyncFunction]';
};

/**
 * Curated RFC-7U-0001 (.nsd) acoustic micro-patches for Nano UI controls.
 * Designed for physical realism, low ear fatigue, and sub-50ms transient clarity:
 * - `knobTick`: Precision stepper-motor / optical encoder micro-impulse (armature + body)
 * - `knobCardinal`: Deeper ball-bearing detent at cardinal 30° / 90° rim ticks
 * - `knobReset`: Magnetic zero-snap harmonic lock on center-hub reset
 * - `sliderSwish`: Velvety aerodynamic pink-noise + air-sheen whisper during drag
 * - `sliderQuartile`: Crystalline harmonic chime when crossing 25% / 50% / 75% quartile ticks
 * - `sliderBoundary`: Soft rubberized mechanical end-stop at 0% / 100%
 * - `switchOn` / `switchOff`: Crisp bistable relay micro-snap
 * - `stepperUp` / `stepperDown`: Precision numeric counter click
 */
export const NANO_UI_SOUND_PRESETS = Object.freeze({
  knobTick: '0.58 * tri(210->76hz, 9ms) lp(1650hz) + 0.36 * sin(1560->640hz, 5ms)',
  knobCardinal: '0.68 * tri(260->92hz, 14ms) lp(1900hz) + 0.44 * sin(1980->860hz, 7ms)',
  knobReset: '0.52 * sin(528->792hz, 36ms) + 0.34 * tri(264hz, 42ms)',
  sliderSwish: '0.32 * pink(34ms) lp(1380hz) + 0.16 * sin(480->640hz, 30ms)',
  sliderQuartile: '0.46 * sin(528->532hz, 42ms) + 0.22 * tri(1056hz, 24ms)',
  sliderBoundary: '0.48 * tri(175->82hz, 22ms) lp(920hz)',
  switchOn: '0.48 * sin(540->810hz, 26ms) + 0.24 * tri(1200hz, 10ms)',
  switchOff: '0.44 * sin(720->460hz, 26ms) + 0.22 * tri(920hz, 10ms)',
  stepperUp: '0.44 * tri(320->480hz, 14ms) + 0.26 * sin(1420hz, 6ms)',
  stepperDown: '0.44 * tri(440->280hz, 14ms) + 0.24 * sin(1120hz, 6ms)',
});

const globalEnabledRef = ref(false);
const globalVolumeRef = ref(0.45);
let customPlayerFn = null;
let sharedAudioCtx = null;

const MAX_PCM_CACHE_ENTRIES = 64;
const pcmCache = new Map();
const lastTriggerAtByKey = new Map();

/**
 * Configures global Nano UI `.nsd` tactile sound behavior.
 * Components remain silent by default (`enabled: false`) unless opted in either globally
 * via `app.use(NanoUI, { sound: true })` / `configureNanoUiSound({ enabled: true })`
 * or locally per component via `:sound="true"`.
 *
 * @param {boolean | { enabled?: boolean, volume?: number, player?: Function }} config
 */
export const configureNanoUiSound = (config = {}) => {
  if (config === true || config === false) {
    globalEnabledRef.value = config;
    return getNanoUiSoundConfig();
  }
  if (isObj(config)) {
    if (config.enabled === true || config.enabled === false) {
      globalEnabledRef.value = config.enabled;
    }
    if (Number.isFinite(Number(config.volume))) {
      globalVolumeRef.value = clamp(Number(config.volume), 0, 1);
    }
    if (config.player === null || isFn(config.player)) {
      customPlayerFn = config.player;
    }
  }
  return getNanoUiSoundConfig();
};

export const getNanoUiSoundConfig = () => ({
  enabled: globalEnabledRef.value,
  volume: globalVolumeRef.value,
  hasCustomPlayer: Boolean(customPlayerFn),
});

export const resetNanoUiSoundConfig = () => {
  globalEnabledRef.value = false;
  globalVolumeRef.value = 0.45;
  customPlayerFn = null;
  lastTriggerAtByKey.clear();
};

/**
 * Reactive composable exposing global Nano UI `.nsd` sound state and controls.
 */
export const useNanoUiSound = () => ({
  enabled: readonly(globalEnabledRef),
  volume: readonly(globalVolumeRef),
  setEnabled: (val) => configureNanoUiSound({ enabled: Boolean(val) }),
  setVolume: (vol) => configureNanoUiSound({ volume: vol }),
  configure: configureNanoUiSound,
});

/**
 * Resolves 3-level sound precedence:
 * 1. Explicit component `propSound === false` -> disabled (overrides global true)
 * 2. Explicit component `propSound === true | string | object` -> enabled (overrides global false)
 * 3. `propSound === undefined | null` -> inherits `globalEnabledRef.value`
 *
 * @param {boolean | string | object | undefined | null} propSound
 * @param {string} [presetKey='knobTick']
 */
export const resolveComponentSoundConfig = (propSound, presetKey = 'knobTick') => {
  if (propSound === false) {
    return {
      enabled: false,
      volume: globalVolumeRef.value,
      dsl: NANO_UI_SOUND_PRESETS[presetKey] || NANO_UI_SOUND_PRESETS.knobTick,
      options: {},
    };
  }

  if (propSound === true) {
    return {
      enabled: true,
      volume: globalVolumeRef.value,
      dsl: NANO_UI_SOUND_PRESETS[presetKey] || NANO_UI_SOUND_PRESETS.knobTick,
      options: {},
    };
  }

  if (isStr(propSound) && propSound.trim()) {
    const trimmed = propSound.trim();
    const resolvedDsl = NANO_UI_SOUND_PRESETS[trimmed] || trimmed;
    return {
      enabled: true,
      volume: globalVolumeRef.value,
      dsl: resolvedDsl,
      options: {},
    };
  }

  if (isObj(propSound)) {
    const enabled = propSound.enabled !== undefined ? Boolean(propSound.enabled) : true;
    const volume = Number.isFinite(Number(propSound.volume))
      ? clamp(Number(propSound.volume), 0, 1)
      : globalVolumeRef.value;
    const customDsl = isStr(propSound[presetKey])
      ? propSound[presetKey]
      : isStr(propSound.dsl)
        ? propSound.dsl
        : NANO_UI_SOUND_PRESETS[presetKey] || NANO_UI_SOUND_PRESETS.knobTick;
    return {
      enabled,
      volume,
      dsl: customDsl,
      options: propSound,
    };
  }

  return {
    enabled: globalEnabledRef.value,
    volume: globalVolumeRef.value,
    dsl: NANO_UI_SOUND_PRESETS[presetKey] || NANO_UI_SOUND_PRESETS.knobTick,
    options: {},
  };
};

const getOrCreateAudioContext = () => {
  const win = globalThis.window;
  if (!win) return null;
  const AudioCtx = win.AudioContext || win.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    try {
      sharedAudioCtx = new AudioCtx();
    } catch {
      return null;
    }
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
};

const getCachedCompiledPcm = (dsl, sampleRate) => {
  const key = `${sampleRate}:${dsl}`;
  if (pcmCache.has(key)) {
    const hit = pcmCache.get(key);
    pcmCache.delete(key);
    pcmCache.set(key, hit);
    return hit;
  }
  const compiled = compileNsdPreview(dsl, { sampleRate, waveformBins: 32 });
  if (pcmCache.size >= MAX_PCM_CACHE_ENTRIES) {
    const oldestKey = pcmCache.keys().next().value;
    pcmCache.delete(oldestKey);
  }
  pcmCache.set(key, compiled);
  return compiled;
};

/**
 * Plays a `.nsd` patch or preset with optional refractory throttling, gain scaling, and real-time pitch rate.
 *
 * @param {string} presetOrDsl - Key from `NANO_UI_SOUND_PRESETS` or raw `.nsd` expression
 * @param {{
 *   propSound?: boolean | string | object,
 *   gain?: number,
 *   playbackRate?: number,
 *   minIntervalMs?: number,
 *   throttleKey?: string,
 *   nowMs?: number
 * }} [opts]
 * @returns {boolean} True if sound was scheduled/dispatched
 */
export const playNanoUiSound = (presetOrDsl, opts = {}) => {
  const presetKey = NANO_UI_SOUND_PRESETS[presetOrDsl] ? presetOrDsl : 'knobTick';
  const cfg = resolveComponentSoundConfig(opts.propSound, presetKey);
  if (!cfg.enabled) return false;

  const dsl = NANO_UI_SOUND_PRESETS[presetOrDsl]
    ? cfg.dsl
    : (isStr(presetOrDsl) && presetOrDsl.trim() ? presetOrDsl.trim() : cfg.dsl);

  const now = Number.isFinite(opts.nowMs)
    ? opts.nowMs
    : (globalThis.performance ? globalThis.performance.now() : Date.now());
  const minInterval = Math.max(0, Number(opts.minIntervalMs ?? 16));
  const tKey = opts.throttleKey || presetOrDsl;

  if (minInterval > 0) {
    const prevAt = lastTriggerAtByKey.get(tKey);
    if (prevAt !== undefined && now - prevAt < minInterval) {
      return false;
    }
    lastTriggerAtByKey.set(tKey, now);
  }

  const gainScale = clamp(Number(opts.gain ?? 1), 0.02, 2);
  const finalVolume = clamp(cfg.volume * gainScale, 0, 1);
  if (finalVolume <= 0.001) return false;

  const playbackRate = clamp(Number(opts.playbackRate ?? 1), 0.45, 2.4);

  if (customPlayerFn) {
    try {
      customPlayerFn(dsl, { volume: finalVolume, playbackRate, preset: presetOrDsl });
      return true;
    } catch {
      return false;
    }
  }

  const ctx = getOrCreateAudioContext();
  if (!ctx) return false;

  const sr = ctx.sampleRate || 44100;
  const compiled = getCachedCompiledPcm(dsl, sr);
  if (!compiled || !compiled.valid || !compiled.pcm || compiled.pcm.length === 0) {
    return false;
  }

  try {
    const buf = ctx.createBuffer(1, compiled.pcm.length, sr);
    buf.getChannelData(0).set(compiled.pcm);
    const src = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    src.buffer = buf;
    src.playbackRate.value = playbackRate;
    gainNode.gain.value = finalVolume;
    src.connect(gainNode);
    gainNode.connect(ctx.destination);
    src.start();
    return true;
  } catch {
    return false;
  }
};

/**
 * Pure kinematic analyzer for `<NanoKnob>` stepper-motor ticks and cardinal detents.
 * Computes whether an angular transition `prevVal -> nextVal` crossed a stepper tooth
 * (default every `6°` or `max(step, tickStep)`) or a `30°` cardinal rim mark, plus
 * RPM-coupled `playbackRate` so faster rotation subtly raises the stepper pitch.
 *
 * @param {number} prevVal
 * @param {number} nextVal
 * @param {{
 *   wrap?: boolean,
 *   tickStep?: number,
 *   cardinalStep?: number,
 *   showTicks?: boolean,
 *   dtMs?: number
 * }} [options]
 */
export const computeKnobDetentCrossings = (prevVal, nextVal, options = {}) => {
  if (!Number.isFinite(prevVal) || !Number.isFinite(nextVal) || prevVal === nextVal) {
    return { crossedTick: false, crossedCardinal: false, playbackRate: 1, deltaDeg: 0 };
  }
  const wrap = options.wrap !== false;
  const tickStep = Math.max(1, Number(options.tickStep) || 6);
  const cardinalStep = Math.max(tickStep, Number(options.cardinalStep) || 30);
  const delta = wrap ? shortestAngleDiff(prevVal, nextVal) : nextVal - prevVal;
  const absDelta = Math.abs(delta);
  if (absDelta < 0.001) {
    return { crossedTick: false, crossedCardinal: false, playbackRate: 1, deltaDeg: 0 };
  }

  const continuousEnd = prevVal + delta;
  const low = Math.min(prevVal, continuousEnd);
  const high = Math.max(prevVal, continuousEnd);

  const crossedMultiple = (stepSize) => {
    const idxLow = Math.floor(low / stepSize);
    const idxHigh = Math.floor(high / stepSize);
    return idxHigh > idxLow;
  };

  const crossedCardinal = Boolean(options.showTicks) && crossedMultiple(cardinalStep);
  const crossedTick = crossedCardinal || crossedMultiple(tickStep);

  const dtMs = Math.max(8, Number(options.dtMs) || 32);
  const degPerSec = (absDelta / dtMs) * 1000;
  // Gently map 0..720 deg/s -> 0.92..1.28x pitch rate + slight directional offset
  const dirBias = delta >= 0 ? 0.02 : -0.02;
  const playbackRate = Number(
    clamp(0.92 + Math.min(1, degPerSec / 720) * 0.34 + dirBias, 0.85, 1.35).toFixed(3)
  );

  return {
    crossedTick,
    crossedCardinal,
    playbackRate,
    deltaDeg: delta,
  };
};

/**
 * Pure kinematic analyzer for `<NanoSlider>` quartile harmonic crossings (`25%`, `50%`, `75%`),
 * boundary stops (`0%`, `100%`), and directional drag swish pitch.
 *
 * @param {number} prevPct - Previous slider percentage in `[0, 100]`
 * @param {number} nextPct - Next slider percentage in `[0, 100]`
 * @param {{ quartiles?: number[] }} [options]
 */
export const computeSliderAcousticEvents = (prevPct, nextPct, options = {}) => {
  if (!Number.isFinite(prevPct) || !Number.isFinite(nextPct) || prevPct === nextPct) {
    return {
      crossedQuartile: null,
      quartilePitch: 1,
      hitBoundary: null,
      swishPitch: 1,
      deltaPct: 0,
    };
  }

  const p0 = clamp(prevPct, 0, 100);
  const p1 = clamp(nextPct, 0, 100);
  const deltaPct = p1 - p0;
  if (Math.abs(deltaPct) < 0.001) {
    return {
      crossedQuartile: null,
      quartilePitch: 1,
      hitBoundary: null,
      swishPitch: 1,
      deltaPct: 0,
    };
  }

  const quartiles = Array.isArray(options.quartiles) ? options.quartiles : [25, 50, 75];
  const low = Math.min(p0, p1);
  const high = Math.max(p0, p1);

  let crossedQuartile = null;
  for (const q of quartiles) {
    const crossedUp = p0 < q && p1 >= q;
    const crossedDown = p0 > q && p1 <= q;
    if ((crossedUp || crossedDown) && low < q && high >= q) {
      crossedQuartile = q;
      if (deltaPct > 0) break;
    }
  }

  // Harmonic Triad Ratios for 25% (C5: 1.0), 50% (E5: 1.25), 75% (G5: 1.5)
  const quartilePitch =
    crossedQuartile === 25
      ? 1.0
      : crossedQuartile === 50
        ? 1.25
        : crossedQuartile === 75
          ? 1.5
          : 1.0 + (Number(crossedQuartile || 50) / 100) * 0.5;

  let hitBoundary = null;
  if (p0 > 0 && p1 <= 0) hitBoundary = 0;
  else if (p0 < 100 && p1 >= 100) hitBoundary = 100;

  // Aerodynamic swish pitch glides smoothly along the slider position (0.84 -> 1.24)
  const dirOffset = deltaPct > 0 ? 0.04 : -0.04;
  const swishPitch = Number(clamp(0.84 + (p1 / 100) * 0.36 + dirOffset, 0.78, 1.32).toFixed(3));

  return {
    crossedQuartile,
    quartilePitch,
    hitBoundary,
    swishPitch,
    deltaPct,
  };
};
