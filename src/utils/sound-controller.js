import { ref, computed, readonly } from 'vue';
import { compileNsdPreview } from './nsd-preview.js';
import { clamp, shortestAngleDiff } from './math.js';
import { is, isCallable } from './type.js';

export const DEFAULT_NANO_SOUND_STORAGE_KEY = 'nano_ui_sound';
export const NANO_SOUND_BROADCAST_CHANNEL = 'nano_ui_sound_sync';
export const VALID_NANO_SOUND_PRESETS = Object.freeze(['glass', 'tactile', 'cyber', 'minimal']);

/**
 * Curated RFC-7U-0001 (.nsd) acoustic micro-patches for Nano UI controls.
 * Supports both camelCase and kebab-case semantic event identifiers.
 */
export const NANO_UI_SOUND_PRESETS = Object.freeze({
  // Rotary & Slider Precision Controls
  knobTick: '0.58 * tri(210->76hz, 9ms) lp(1650hz) + 0.36 * sin(1560->640hz, 5ms)',
  knobCardinal: '0.68 * tri(260->92hz, 14ms) lp(1900hz) + 0.44 * sin(1980->860hz, 7ms)',
  knobReset: '0.52 * sin(528->792hz, 36ms) + 0.34 * tri(264hz, 42ms)',
  sliderSwishSm: '0.26 * pink(24ms) lp(2150hz) + 0.14 * sin(660->880hz, 22ms)',
  sliderSwish: '0.32 * pink(34ms) lp(1380hz) + 0.16 * sin(480->640hz, 30ms)',
  sliderSwishLg: '0.38 * pink(46ms) lp(780hz) + 0.34 * tri(240->315hz, 42ms) lp(740hz) + 0.22 * sin(140->185hz, 44ms)',
  sliderQuartileSm: '0.40 * sin(660->666hz, 30ms) + 0.18 * tri(1320hz, 18ms)',
  sliderQuartile: '0.46 * sin(528->532hz, 42ms) + 0.22 * tri(1056hz, 24ms)',
  sliderQuartileLg: '0.54 * tri(330->334hz, 56ms) lp(980hz) + 0.32 * sin(165hz, 52ms)',
  sliderBoundarySm: '0.40 * tri(250->125hz, 16ms) lp(1320hz)',
  sliderBoundary: '0.48 * tri(175->82hz, 22ms) lp(920hz)',
  sliderBoundaryLg: '0.60 * tri(145->64hz, 36ms) lp(580hz) + 0.28 * sin(104->50hz, 34ms)',

  // Bistable Switch Glissandos (180 Hz -> 520 Hz & 520 Hz -> 180 Hz)
  switchOn: '0.48 * sin(glide(180Hz, 520Hz, 26ms)) * expDecay(24ms) + 0.22 * tri(1040Hz) * expDecay(10ms)',
  'switch-on': '0.48 * sin(glide(180Hz, 520Hz, 26ms)) * expDecay(24ms) + 0.22 * tri(1040Hz) * expDecay(10ms)',
  switchOff: '0.44 * sin(glide(520Hz, 180Hz, 26ms)) * expDecay(24ms) + 0.20 * tri(780Hz) * expDecay(10ms)',
  'switch-off': '0.44 * sin(glide(520Hz, 180Hz, 26ms)) * expDecay(24ms) + 0.20 * tri(780Hz) * expDecay(10ms)',

  // Stepper & Scrubber Quantization
  stepperUp: '0.44 * tri(320->480hz, 14ms) + 0.26 * sin(1420hz, 6ms)',
  stepperDown: '0.44 * tri(440->280hz, 14ms) + 0.24 * sin(1120hz, 6ms)',
  scrubberTick: '0.42 * tri(280->110hz, 8ms) lp(1750hz) + 0.28 * sin(1480->720hz, 5ms)',
  'scrubber-tick': '0.42 * tri(280->110hz, 8ms) lp(1750hz) + 0.28 * sin(1480->720hz, 5ms)',

  // Ripple & Button Clicks
  uiTapSoft: '0.32 * sin(glide(620Hz, 340Hz, 14ms)) * expDecay(12ms) + 0.16 * pink(8ms) * lpf(1800Hz) * expDecay(8ms)',
  'ui-tap-soft': '0.32 * sin(glide(620Hz, 340Hz, 14ms)) * expDecay(12ms) + 0.16 * pink(8ms) * lpf(1800Hz) * expDecay(8ms)',
  uiClickGlass: '0.42 * sin(glide(880Hz, 1320Hz, 16ms)) * expDecay(18ms) + 0.22 * tri(1760Hz) * expDecay(9ms)',
  'ui-click-glass': '0.42 * sin(glide(880Hz, 1320Hz, 16ms)) * expDecay(18ms) + 0.22 * tri(1760Hz) * expDecay(9ms)',

  // Modal Open & Close
  modalOpen: '0.28 * pink(42ms) * lpf(1250Hz) * expDecay(38ms) + 0.36 * sin(glide(330Hz, 495Hz, 64ms)) * expDecay(58ms)',
  'modal-open': '0.28 * pink(42ms) * lpf(1250Hz) * expDecay(38ms) + 0.36 * sin(glide(330Hz, 495Hz, 64ms)) * expDecay(58ms)',
  modalClose: '0.24 * pink(36ms) * lpf(920Hz) * expDecay(32ms) + 0.34 * sin(glide(495Hz, 294Hz, 54ms)) * expDecay(48ms)',
  'modal-close': '0.24 * pink(36ms) * lpf(920Hz) * expDecay(32ms) + 0.34 * sin(glide(495Hz, 294Hz, 54ms)) * expDecay(48ms)',

  // Select & Tabs
  tabSelect: '0.38 * sin(glide(480Hz, 720Hz, 18ms)) * expDecay(16ms) + 0.18 * tri(960Hz) * expDecay(10ms)',
  'tab-select': '0.38 * sin(glide(480Hz, 720Hz, 18ms)) * expDecay(16ms) + 0.18 * tri(960Hz) * expDecay(10ms)',

  // Clipboard Copy Confirmation
  copyChime: '0.42 * sin(1046.5Hz) * expDecay(42ms) + 0.36 * sin(1568Hz) * delay(28ms) * expDecay(58ms)',
  'copy-chime': '0.42 * sin(1046.5Hz) * expDecay(42ms) + 0.36 * sin(1568Hz) * delay(28ms) * expDecay(58ms)',

  // Semantic Alerts & Toasts
  alertInfo: '0.38 * sin(587.3Hz) * expDecay(48ms) + 0.30 * sin(880Hz) * delay(34ms) * expDecay(56ms)',
  'alert-info': '0.38 * sin(587.3Hz) * expDecay(48ms) + 0.30 * sin(880Hz) * delay(34ms) * expDecay(56ms)',
  alertSuccess: '0.40 * sin(523.25Hz) * expDecay(44ms) + 0.38 * sin(783.99Hz) * delay(32ms) * expDecay(68ms)',
  'alert-success': '0.40 * sin(523.25Hz) * expDecay(44ms) + 0.38 * sin(783.99Hz) * delay(32ms) * expDecay(68ms)',
  alertWarn: '0.42 * tri(440Hz) * lpf(1500Hz) * expDecay(46ms) + 0.36 * tri(392Hz) * delay(42ms) * lpf(1400Hz) * expDecay(56ms)',
  'alert-warn': '0.42 * tri(440Hz) * lpf(1500Hz) * expDecay(46ms) + 0.36 * tri(392Hz) * delay(42ms) * lpf(1400Hz) * expDecay(56ms)',
  alertDanger: '0.46 * saw(glide(311Hz, 233Hz, 68ms)) * lpf(1180Hz) * expDecay(64ms) + 0.32 * tri(155.5Hz) * expDecay(72ms)',
  'alert-danger': '0.46 * saw(glide(311Hz, 233Hz, 68ms)) * lpf(1180Hz) * expDecay(64ms) + 0.32 * tri(155.5Hz) * expDecay(72ms)',
});

/**
 * Global Ecosystem Acoustic Style Profiles (`'glass' | 'tactile' | 'cyber' | 'minimal'`).
 * `glass` is the canonical 1.0x reference profile; alternative presets reshape timbre, pitch, and envelope.
 */
export const NANO_SOUND_STYLE_PROFILES = Object.freeze({
  glass: Object.freeze({
    id: 'glass',
    pitchScale: 1.0,
    gainScale: 1.0,
    patches: Object.freeze({}),
  }),
  tactile: Object.freeze({
    id: 'tactile',
    pitchScale: 0.86,
    gainScale: 1.06,
    patches: Object.freeze({
      'ui-tap-soft': '0.42 * tri(glide(280Hz, 120Hz, 12ms)) * lpf(1200Hz) * expDecay(11ms) + 0.22 * pink(7ms) * lpf(1100Hz) * expDecay(7ms)',
      uiTapSoft: '0.42 * tri(glide(280Hz, 120Hz, 12ms)) * lpf(1200Hz) * expDecay(11ms) + 0.22 * pink(7ms) * lpf(1100Hz) * expDecay(7ms)',
      'ui-click-glass': '0.48 * tri(glide(360Hz, 165Hz, 14ms)) * lpf(1450Hz) * expDecay(13ms)',
      uiClickGlass: '0.48 * tri(glide(360Hz, 165Hz, 14ms)) * lpf(1450Hz) * expDecay(13ms)',
      'tab-select': '0.44 * tri(glide(310Hz, 440Hz, 15ms)) * lpf(1350Hz) * expDecay(14ms)',
      tabSelect: '0.44 * tri(glide(310Hz, 440Hz, 15ms)) * lpf(1350Hz) * expDecay(14ms)',
    }),
  }),
  cyber: Object.freeze({
    id: 'cyber',
    pitchScale: 1.14,
    gainScale: 0.96,
    patches: Object.freeze({
      'ui-tap-soft': '0.34 * saw(glide(740Hz, 1180Hz, 12ms)) * lpf(2400Hz) * expDecay(11ms)',
      uiTapSoft: '0.34 * saw(glide(740Hz, 1180Hz, 12ms)) * lpf(2400Hz) * expDecay(11ms)',
      'ui-click-glass': '0.40 * saw(glide(660Hz, 1320Hz, 16ms)) * lpf(2600Hz) * expDecay(16ms) + 0.20 * square(1980Hz) * lpf(2200Hz) * expDecay(8ms)',
      uiClickGlass: '0.40 * saw(glide(660Hz, 1320Hz, 16ms)) * lpf(2600Hz) * expDecay(16ms) + 0.20 * square(1980Hz) * lpf(2200Hz) * expDecay(8ms)',
      'tab-select': '0.38 * saw(glide(540Hz, 960Hz, 16ms)) * lpf(2300Hz) * expDecay(14ms)',
      tabSelect: '0.38 * saw(glide(540Hz, 960Hz, 16ms)) * lpf(2300Hz) * expDecay(14ms)',
    }),
  }),
  minimal: Object.freeze({
    id: 'minimal',
    pitchScale: 1.04,
    gainScale: 0.68,
    patches: Object.freeze({
      'ui-tap-soft': '0.24 * sin(glide(520Hz, 360Hz, 9ms)) * expDecay(8ms)',
      uiTapSoft: '0.24 * sin(glide(520Hz, 360Hz, 9ms)) * expDecay(8ms)',
      'ui-click-glass': '0.28 * sin(glide(720Hz, 960Hz, 10ms)) * expDecay(10ms)',
      uiClickGlass: '0.28 * sin(glide(720Hz, 960Hz, 10ms)) * expDecay(10ms)',
      'modal-open': '0.24 * sin(glide(360Hz, 480Hz, 36ms)) * expDecay(32ms)',
      modalOpen: '0.24 * sin(glide(360Hz, 480Hz, 36ms)) * expDecay(32ms)',
      'modal-close': '0.22 * sin(glide(480Hz, 340Hz, 32ms)) * expDecay(28ms)',
      modalClose: '0.22 * sin(glide(480Hz, 340Hz, 32ms)) * expDecay(28ms)',
    }),
  }),
});

/**
 * Canonical Psychoacoustic Geometry Scaling profiles (`ACOUSTIC-MASS-01`).
 */
export const CONTROL_ACOUSTIC_MASS_PROFILES = Object.freeze({
  xs: Object.freeze({ tier: 'xs', pitchScale: 1.32, gainScale: 0.8, presetSuffix: 'Sm' }),
  sm: Object.freeze({ tier: 'sm', pitchScale: 1.18, gainScale: 0.88, presetSuffix: 'Sm' }),
  md: Object.freeze({ tier: 'md', pitchScale: 1.0, gainScale: 1.0, presetSuffix: '' }),
  lg: Object.freeze({ tier: 'lg', pitchScale: 0.72, gainScale: 1.16, presetSuffix: 'Lg' }),
  xl: Object.freeze({ tier: 'xl', pitchScale: 0.6, gainScale: 1.24, presetSuffix: 'Lg' }),
});

export const normalizeSoundStylePreset = (rawPreset) => {
  if (!is(rawPreset, 'string')) return 'glass';
  const norm = rawPreset.trim().toLowerCase();
  return VALID_NANO_SOUND_PRESETS.includes(norm) ? norm : 'glass';
};

/**
 * Resolves deterministic acoustic mass scaling for a UI control's `size` prop.
 */
export const resolveControlAcousticMass = (size, options = {}) => {
  if (size === undefined || size === null || size === '') {
    return CONTROL_ACOUSTIC_MASS_PROFILES.md;
  }
  if (is(size, 'number') && Number.isFinite(size) && size > 0) {
    const refPx = Math.max(16, Number(options.refPx) || 56);
    if (Math.abs(size - refPx) < 0.5) {
      return CONTROL_ACOUSTIC_MASS_PROFILES.md;
    }
    const clampedPx = clamp(size, 24, 160);
    const pitchScale = Number(clamp(Math.pow(refPx / clampedPx, 0.6), 0.56, 1.36).toFixed(3));
    const gainScale = Number(clamp(Math.pow(1 / pitchScale, 0.35), 0.8, 1.24).toFixed(3));
    const tier =
      clampedPx <= 34 ? 'xs' : clampedPx <= 44 ? 'sm' : clampedPx >= 104 ? 'xl' : clampedPx >= 72 ? 'lg' : 'md';
    const presetSuffix = tier === 'xs' || tier === 'sm' ? 'Sm' : tier === 'lg' || tier === 'xl' ? 'Lg' : '';
    return { tier, pitchScale, gainScale, presetSuffix };
  }
  const norm = String(size).trim().toLowerCase();
  if (norm === 'xs' || norm === 'mini') return CONTROL_ACOUSTIC_MASS_PROFILES.xs;
  if (norm === 'sm' || norm === 'compact') return CONTROL_ACOUSTIC_MASS_PROFILES.sm;
  if (norm === 'lg' || norm === 'large') return CONTROL_ACOUSTIC_MASS_PROFILES.lg;
  if (norm === 'xl') return CONTROL_ACOUSTIC_MASS_PROFILES.xl;
  return CONTROL_ACOUSTIC_MASS_PROFILES.md;
};

const globalEnabledRef = ref(false);
const globalMutedComputed = computed(() => !globalEnabledRef.value);
const globalVolumeRef = ref(0.45);
const globalPresetRef = ref('glass');
const globalStorageKeyRef = ref(DEFAULT_NANO_SOUND_STORAGE_KEY);
const respectReducedMotionRef = ref(true);

let customPlayerFn = null;
let sharedAudioCtx = null;
let hasUserInteracted = false;
let unlockListenersAttached = false;
let removeUnlockListeners = null;
let broadcastChannel = null;
let storageEventAttached = false;
let removeStorageListener = null;
let injectedEnv = null;

const MAX_PCM_CACHE_ENTRIES = 64;
const pcmCache = new Map();
const lastTriggerAtByKey = new Map();

const getActiveWin = () => {
  if (injectedEnv && 'window' in injectedEnv) return injectedEnv.window;
  return globalThis.window || null;
};

const getActiveLocalStorage = () => {
  if (injectedEnv && 'localStorage' in injectedEnv) return injectedEnv.localStorage;
  const win = getActiveWin();
  if (!win) return null;
  try {
    return win.localStorage || null;
  } catch {
    return null;
  }
};

const getBroadcastChannelCtor = () => {
  if (injectedEnv && 'BroadcastChannel' in injectedEnv) return injectedEnv.BroadcastChannel;
  return isCallable(globalThis.BroadcastChannel) ? globalThis.BroadcastChannel : null;
};

export const isReducedMotionPreferred = () => {
  const matchMediaFn =
    injectedEnv?.matchMedia ||
    (getActiveWin() && isCallable(getActiveWin().matchMedia)
      ? getActiveWin().matchMedia.bind(getActiveWin())
      : null);
  if (!isCallable(matchMediaFn)) return false;
  try {
    return Boolean(matchMediaFn('(prefers-reduced-motion: reduce)')?.matches);
  } catch {
    return false;
  }
};

export const isNanoUiAudioUnlocked = () => hasUserInteracted;

export const unlockNanoUiAudio = () => {
  hasUserInteracted = true;
  if (removeUnlockListeners) {
    removeUnlockListeners();
    removeUnlockListeners = null;
  }
  unlockListenersAttached = false;
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended' && isCallable(sharedAudioCtx.resume)) {
    sharedAudioCtx.resume().catch(() => {});
  }
  return true;
};

const ensureInteractionUnlockListeners = () => {
  if (hasUserInteracted || unlockListenersAttached) return;
  const win = getActiveWin();
  if (!win || !isCallable(win.addEventListener)) return;

  const onFirstGesture = () => {
    unlockNanoUiAudio();
  };
  try {
    win.addEventListener('pointerdown', onFirstGesture, { capture: true, passive: true });
    win.addEventListener('keydown', onFirstGesture, { capture: true, passive: true });
    unlockListenersAttached = true;
    removeUnlockListeners = () => {
      try {
        win.removeEventListener('pointerdown', onFirstGesture, { capture: true });
        win.removeEventListener('keydown', onFirstGesture, { capture: true });
      } catch {
        // Ignore teardown errors on detached window mocks
      }
    };
  } catch {
    // SSR / restricted iframe fallback
  }
};

const applyIncomingSyncPayload = (payload) => {
  if (!is(payload, 'object')) return false;
  if (payload.storageKey && payload.storageKey !== globalStorageKeyRef.value) return false;

  if (is(payload.muted, 'boolean')) {
    globalEnabledRef.value = !payload.muted;
  } else if (is(payload.enabled, 'boolean')) {
    globalEnabledRef.value = payload.enabled;
  }
  if (Number.isFinite(Number(payload.volume))) {
    globalVolumeRef.value = clamp(Number(payload.volume), 0, 1);
  }
  if (is(payload.preset, 'string')) {
    globalPresetRef.value = normalizeSoundStylePreset(payload.preset);
  }
  return true;
};

const ensureCrossTabSync = () => {
  const ChannelCtor = getBroadcastChannelCtor();
  if (!broadcastChannel && isCallable(ChannelCtor)) {
    try {
      broadcastChannel = new ChannelCtor(NANO_SOUND_BROADCAST_CHANNEL);
      if (isCallable(broadcastChannel.unref)) {
        broadcastChannel.unref();
      }
      broadcastChannel.onmessage = (event) => {
        const data = event?.data;
        if (is(data, 'object') && data.type === 'nano-ui-sound-sync') {
          applyIncomingSyncPayload(data);
        }
      };
    } catch {
      broadcastChannel = null;
    }
  }

  const win = getActiveWin();
  if (!storageEventAttached && win && isCallable(win.addEventListener)) {
    const onStorage = (event) => {
      if (!event || event.key !== globalStorageKeyRef.value || !is(event.newValue, 'string')) return;
      try {
        const parsed = JSON.parse(event.newValue);
        applyIncomingSyncPayload(parsed);
      } catch {
        // Ignore malformed storage JSON
      }
    };
    try {
      win.addEventListener('storage', onStorage);
      storageEventAttached = true;
      removeStorageListener = () => {
        try {
          win.removeEventListener('storage', onStorage);
        } catch {
          // Ignore teardown errors
        }
      };
    } catch {
      storageEventAttached = false;
    }
  }
};

export const readPersistedNanoSoundState = (storageKey = globalStorageKeyRef.value) => {
  const ls = getActiveLocalStorage();
  if (!ls || !storageKey || !isCallable(ls.getItem)) return null;
  try {
    const raw = ls.getItem(storageKey);
    if (!is(raw, 'string') || !raw.trim()) return null;
    const parsed = JSON.parse(raw);
    return is(parsed, 'object') ? parsed : null;
  } catch {
    return null;
  }
};

const persistAndBroadcastSoundState = ({ persist = true, broadcast = true } = {}) => {
  const key = globalStorageKeyRef.value;
  const payload = {
    type: 'nano-ui-sound-sync',
    storageKey: key,
    enabled: globalEnabledRef.value,
    muted: !globalEnabledRef.value,
    volume: globalVolumeRef.value,
    preset: globalPresetRef.value,
  };

  if (persist && key) {
    const ls = getActiveLocalStorage();
    if (ls && isCallable(ls.setItem)) {
      try {
        ls.setItem(
          key,
          JSON.stringify({
            enabled: payload.enabled,
            muted: payload.muted,
            volume: payload.volume,
            preset: payload.preset,
          })
        );
      } catch {
        // QuotaExceededError / private-browsing safe no-op
      }
    }
  }

  if (broadcast && broadcastChannel && isCallable(broadcastChannel.postMessage)) {
    try {
      broadcastChannel.postMessage(payload);
    } catch {
      // Ignore closed channel errors
    }
  }
};

/**
 * Injects deterministic environment mocks (`window`, `localStorage`, `BroadcastChannel`, `matchMedia`)
 * for headless Node unit tests without mutating process globals.
 */
export const setNanoUiSoundTestEnv = (env = null) => {
  if (removeUnlockListeners) {
    removeUnlockListeners();
    removeUnlockListeners = null;
  }
  if (removeStorageListener) {
    removeStorageListener();
    removeStorageListener = null;
  }
  if (broadcastChannel && isCallable(broadcastChannel.close)) {
    try {
      broadcastChannel.close();
    } catch {
      // Ignore
    }
  }
  broadcastChannel = null;
  unlockListenersAttached = false;
  storageEventAttached = false;
  sharedAudioCtx = null;
  hasUserInteracted = false;
  injectedEnv = env;
  if (env) {
    ensureInteractionUnlockListeners();
    ensureCrossTabSync();
  }
};

/**
 * Configures global Nano UI `.nsd` tactile sound behavior.
 * Supports zero-config plugin initialization (`app.use(NanoUI, { sound })`) as well as runtime updates.
 *
 * @param {boolean | {
 *   enabled?: boolean,
 *   muted?: boolean,
 *   preset?: 'glass'|'tactile'|'cyber'|'minimal',
 *   volume?: number,
 *   storageKey?: string,
 *   respectReducedMotion?: boolean,
 *   hydrateFromStorage?: boolean,
 *   persist?: boolean,
 *   broadcast?: boolean,
 *   player?: Function | null
 * }} config
 */
export const configureNanoUiSound = (config = {}) => {
  ensureInteractionUnlockListeners();
  ensureCrossTabSync();

  if (config === true || config === false) {
    globalEnabledRef.value = config;
    persistAndBroadcastSoundState();
    return getNanoUiSoundConfig();
  }

  if (is(config, 'object')) {
    if (is(config.storageKey, 'string') && config.storageKey.trim()) {
      globalStorageKeyRef.value = config.storageKey.trim();
    }
    if (is(config.respectReducedMotion, 'boolean')) {
      respectReducedMotionRef.value = config.respectReducedMotion;
    }
    if (config.player === null || isCallable(config.player)) {
      customPlayerFn = config.player;
    }

    // Apply explicit config values first
    if (is(config.muted, 'boolean')) {
      globalEnabledRef.value = !config.muted;
    } else if (is(config.enabled, 'boolean')) {
      globalEnabledRef.value = config.enabled;
    }
    if (Number.isFinite(Number(config.volume))) {
      globalVolumeRef.value = clamp(Number(config.volume), 0, 1);
    }
    if (is(config.preset, 'string')) {
      globalPresetRef.value = normalizeSoundStylePreset(config.preset);
    }

    // During plugin boot (`hydrateFromStorage: true`), let saved user prefs in localStorage override defaults
    if (config.hydrateFromStorage === true) {
      const saved = readPersistedNanoSoundState(globalStorageKeyRef.value);
      if (saved) {
        applyIncomingSyncPayload(saved);
      } else if (config.persist !== false) {
        persistAndBroadcastSoundState({ persist: true, broadcast: false });
      }
      return getNanoUiSoundConfig();
    }

    const shouldPersist = config.persist !== false;
    const shouldBroadcast = config.broadcast !== false;
    if (
      is(config.enabled, 'boolean') ||
      is(config.muted, 'boolean') ||
      Number.isFinite(Number(config.volume)) ||
      is(config.preset, 'string')
    ) {
      persistAndBroadcastSoundState({ persist: shouldPersist, broadcast: shouldBroadcast });
    }
  }

  return getNanoUiSoundConfig();
};

export const getNanoUiSoundConfig = () => ({
  enabled: globalEnabledRef.value,
  muted: !globalEnabledRef.value,
  volume: globalVolumeRef.value,
  preset: globalPresetRef.value,
  storageKey: globalStorageKeyRef.value,
  respectReducedMotion: respectReducedMotionRef.value,
  audioUnlocked: hasUserInteracted,
  hasCustomPlayer: Boolean(customPlayerFn),
});

export const resetNanoUiSoundConfig = () => {
  if (broadcastChannel && isCallable(broadcastChannel.close)) {
    try {
      broadcastChannel.close();
    } catch {
      // Ignore close errors
    }
  }
  broadcastChannel = null;
  globalEnabledRef.value = false;
  globalVolumeRef.value = 0.45;
  globalPresetRef.value = 'glass';
  globalStorageKeyRef.value = DEFAULT_NANO_SOUND_STORAGE_KEY;
  respectReducedMotionRef.value = true;
  customPlayerFn = null;
  sharedAudioCtx = null;
  hasUserInteracted = false;
  lastTriggerAtByKey.clear();
};

const resolveStylePresetDsl = (presetKey, stylePreset = globalPresetRef.value) => {
  const profile = NANO_SOUND_STYLE_PROFILES[stylePreset] || NANO_SOUND_STYLE_PROFILES.glass;
  if (profile.patches && profile.patches[presetKey]) {
    return profile.patches[presetKey];
  }
  return NANO_UI_SOUND_PRESETS[presetKey] || NANO_UI_SOUND_PRESETS.knobTick;
};

/**
 * Resolves 3-level sound precedence:
 * 1. Explicit component `propSound === false` -> disabled (overrides global true)
 * 2. Explicit component `propSound === true | string | object` -> enabled (overrides global false)
 * 3. `propSound === undefined | null` -> inherits `globalEnabledRef.value`
 */
export const resolveComponentSoundConfig = (propSound, presetKey = 'knobTick') => {
  const activeStyle = globalPresetRef.value;
  if (propSound === false) {
    return {
      enabled: false,
      volume: globalVolumeRef.value,
      dsl: resolveStylePresetDsl(presetKey, activeStyle),
      options: {},
    };
  }

  if (propSound === true) {
    return {
      enabled: true,
      volume: globalVolumeRef.value,
      dsl: resolveStylePresetDsl(presetKey, activeStyle),
      options: {},
    };
  }

  if (is(propSound, 'string') && propSound.trim()) {
    const trimmed = propSound.trim();
    const resolvedDsl = NANO_UI_SOUND_PRESETS[trimmed]
      ? resolveStylePresetDsl(trimmed, activeStyle)
      : trimmed;
    return {
      enabled: true,
      volume: globalVolumeRef.value,
      dsl: resolvedDsl,
      options: {},
    };
  }

  if (is(propSound, 'object')) {
    const enabled = propSound.enabled !== undefined ? Boolean(propSound.enabled) : true;
    const volume = Number.isFinite(Number(propSound.volume))
      ? clamp(Number(propSound.volume), 0, 1)
      : globalVolumeRef.value;
    const customDsl = is(propSound[presetKey], 'string')
      ? propSound[presetKey]
      : is(propSound.dsl, 'string')
        ? propSound.dsl
        : resolveStylePresetDsl(presetKey, activeStyle);
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
    dsl: resolveStylePresetDsl(presetKey, activeStyle),
    options: {},
  };
};

const getOrCreateAudioContext = () => {
  ensureInteractionUnlockListeners();
  // Browser Autoplay Policy & Zero-Idle-Allocation Gate:
  // Never allocate Web Audio graph before the user's first pointerdown/keydown gesture.
  if (!hasUserInteracted) return null;

  const win = getActiveWin();
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
  if (sharedAudioCtx.state === 'suspended' && isCallable(sharedAudioCtx.resume)) {
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
 * Plays a `.nsd` patch or semantic preset with refractory throttling, style profile shaping,
 * size-coupled acoustic mass, reduced-motion quiet fallback, and lazy AudioContext synthesis.
 */
export const playNanoUiSound = (presetOrDsl, opts = {}) => {
  if (respectReducedMotionRef.value && opts.ignoreReducedMotion !== true && isReducedMotionPreferred()) {
    return false;
  }

  const mass = resolveControlAcousticMass(opts.size);
  const hasBuiltInPreset = Boolean(NANO_UI_SOUND_PRESETS[presetOrDsl]);
  const sizedPresetKey =
    hasBuiltInPreset && mass.presetSuffix && NANO_UI_SOUND_PRESETS[`${presetOrDsl}${mass.presetSuffix}`]
      ? `${presetOrDsl}${mass.presetSuffix}`
      : presetOrDsl;
  const presetKey = NANO_UI_SOUND_PRESETS[sizedPresetKey] ? sizedPresetKey : 'knobTick';
  const cfg = resolveComponentSoundConfig(opts.propSound, presetKey);
  if (!cfg.enabled) return false;

  const styleProfile =
    NANO_SOUND_STYLE_PROFILES[globalPresetRef.value] || NANO_SOUND_STYLE_PROFILES.glass;

  const explicitBaseOverride =
    is(opts.propSound, 'object') && is(opts.propSound[presetOrDsl], 'string')
      ? opts.propSound[presetOrDsl]
      : null;
  const dsl = explicitBaseOverride
    ? explicitBaseOverride
    : hasBuiltInPreset
      ? cfg.dsl
      : is(presetOrDsl, 'string') && presetOrDsl.trim()
        ? NANO_UI_SOUND_PRESETS[presetOrDsl.trim()]
          ? resolveStylePresetDsl(presetOrDsl.trim(), styleProfile.id)
          : presetOrDsl.trim()
        : cfg.dsl;

  const now = Number.isFinite(opts.nowMs)
    ? opts.nowMs
    : globalThis.performance
      ? globalThis.performance.now()
      : Date.now();
  const minInterval = Math.max(0, Number(opts.minIntervalMs ?? 16));
  const tKey = opts.throttleKey || presetOrDsl;

  if (minInterval > 0) {
    const prevAt = lastTriggerAtByKey.get(tKey);
    if (prevAt !== undefined && now - prevAt < minInterval) {
      return false;
    }
    lastTriggerAtByKey.set(tKey, now);
  }

  const gainScale = clamp(
    Number(opts.gain ?? 1) * mass.gainScale * styleProfile.gainScale,
    0.02,
    2
  );
  const finalVolume = clamp(cfg.volume * gainScale, 0, 1);
  if (finalVolume <= 0.001) return false;

  const pitchMultiplier = opts.applySizePitch === false ? 1 : mass.pitchScale;
  const playbackRate = clamp(
    Number(opts.playbackRate ?? 1) * pitchMultiplier * styleProfile.pitchScale,
    0.42,
    2.4
  );

  if (customPlayerFn) {
    try {
      customPlayerFn(dsl, {
        volume: finalVolume,
        playbackRate,
        preset: sizedPresetKey,
        stylePreset: styleProfile.id,
        sizeTier: mass.tier,
      });
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
 * Canonical global NanoSound composable (`useNanoSound`) for `@gkucmierz/nano-ui`.
 * Exposes reactive `muted`, `enabled`, `volume`, `preset`, `play(soundNameOrDsl)`, and `toggleMute()`
 * with automatic `localStorage` + `BroadcastChannel` synchronization.
 */
export const useNanoSound = () => {
  ensureInteractionUnlockListeners();
  ensureCrossTabSync();

  const toggleMute = () => {
    const nextEnabled = !globalEnabledRef.value;
    configureNanoUiSound({ enabled: nextEnabled });
    return !nextEnabled;
  };

  const play = (soundNameOrDsl, opts = {}) =>
    playNanoUiSound(soundNameOrDsl, {
      propSound: true,
      ...opts,
    });

  return {
    muted: readonly(globalMutedComputed),
    enabled: readonly(globalEnabledRef),
    volume: readonly(globalVolumeRef),
    preset: readonly(globalPresetRef),
    play: (soundNameOrDsl, opts = {}) => {
      if (!globalEnabledRef.value && opts.force !== true) return false;
      return play(soundNameOrDsl, opts);
    },
    toggleMute,
    setMuted: (val) => configureNanoUiSound({ muted: Boolean(val) }),
    setEnabled: (val) => configureNanoUiSound({ enabled: Boolean(val) }),
    setVolume: (vol) => configureNanoUiSound({ volume: vol }),
    setPreset: (presetName) => configureNanoUiSound({ preset: presetName }),
    configure: configureNanoUiSound,
    unlockAudio: unlockNanoUiAudio,
  };
};

/**
 * Backward-compatible alias for `useNanoSound()`.
 */
export const useNanoUiSound = useNanoSound;

/**
 * Pure kinematic analyzer for `<NanoKnob>` stepper-motor ticks and cardinal detents.
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
 * boundary stops (`0%`, `100%`), directional drag swish pitch, and size-coupled acoustic mass (`sm`/`md`/`lg`).
 */
export const computeSliderAcousticEvents = (prevPct, nextPct, options = {}) => {
  const mass = resolveControlAcousticMass(options.size);
  if (!Number.isFinite(prevPct) || !Number.isFinite(nextPct) || prevPct === nextPct) {
    return {
      crossedQuartile: null,
      quartilePitch: Number(mass.pitchScale.toFixed(3)),
      hitBoundary: null,
      boundaryPitch: Number(mass.pitchScale.toFixed(3)),
      swishPitch: Number(mass.pitchScale.toFixed(3)),
      deltaPct: 0,
      acousticMass: mass,
    };
  }

  const p0 = clamp(prevPct, 0, 100);
  const p1 = clamp(nextPct, 0, 100);
  const deltaPct = p1 - p0;
  if (Math.abs(deltaPct) < 0.001) {
    return {
      crossedQuartile: null,
      quartilePitch: Number(mass.pitchScale.toFixed(3)),
      hitBoundary: null,
      boundaryPitch: Number(mass.pitchScale.toFixed(3)),
      swishPitch: Number(mass.pitchScale.toFixed(3)),
      deltaPct: 0,
      acousticMass: mass,
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

  const baseQuartilePitch =
    crossedQuartile === 25
      ? 1.0
      : crossedQuartile === 50
        ? 1.25
        : crossedQuartile === 75
          ? 1.5
          : 1.0 + (Number(crossedQuartile || 50) / 100) * 0.5;
  const quartilePitch = Number((baseQuartilePitch * mass.pitchScale).toFixed(3));

  let hitBoundary = null;
  if (p0 > 0 && p1 <= 0) hitBoundary = 0;
  else if (p0 < 100 && p1 >= 100) hitBoundary = 100;
  const baseBoundaryPitch = hitBoundary === 100 ? 1.18 : 0.92;
  const boundaryPitch = Number((baseBoundaryPitch * mass.pitchScale).toFixed(3));

  const dirOffset = deltaPct > 0 ? 0.04 : -0.04;
  const baseSwishPitch = clamp(0.84 + (p1 / 100) * 0.36 + dirOffset, 0.78, 1.32);
  const swishPitch = Number(clamp(baseSwishPitch * mass.pitchScale, 0.48, 1.68).toFixed(3));

  return {
    crossedQuartile,
    quartilePitch,
    hitBoundary,
    boundaryPitch,
    swishPitch,
    deltaPct,
    acousticMass: mass,
  };
};
