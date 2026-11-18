import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NANO_UI_SOUND_PRESETS,
  VALID_NANO_SOUND_PRESETS,
  configureNanoUiSound,
  getNanoUiSoundConfig,
  resetNanoUiSoundConfig,
  useNanoSound,
  isNanoUiAudioUnlocked,
  setNanoUiSoundTestEnv,
  resolveComponentSoundConfig,
  playNanoUiSound,
} from '../../src/utils/sound-controller.js';
import { compileNsdPreview } from '../../src/utils/nsd-preview.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const readSrc = (rel) => readFileSync(resolve(__dirname, '../../src', rel), 'utf8');

function createMockBrowserEnv({ reducedMotion = false, initialStorage = {} } = {}) {
  const store = new Map(Object.entries(initialStorage));
  const listeners = new Map();
  const channels = [];
  let audioContextCount = 0;
  let startedBuffers = 0;

  class MockBroadcastChannel {
    constructor(name) {
      this.name = name;
      this.onmessage = null;
      channels.push(this);
    }
    postMessage(data) {
      for (const ch of channels) {
        if (ch !== this && ch.name === this.name && ch.onmessage) {
          ch.onmessage({ data });
        }
      }
    }
    close() {
      const idx = channels.indexOf(this);
      if (idx >= 0) channels.splice(idx, 1);
    }
  }

  class MockAudioContext {
    constructor() {
      audioContextCount += 1;
      this.state = 'running';
      this.sampleRate = 22050;
      this.destination = {};
    }
    createBuffer(_ch, len, sr) {
      const arr = new Float32Array(len);
      return {
        length: len,
        sampleRate: sr,
        getChannelData: () => arr,
      };
    }
    createBufferSource() {
      return {
        buffer: null,
        playbackRate: { value: 1 },
        connect() {},
        start() {
          startedBuffers += 1;
        },
      };
    }
    createGain() {
      return {
        gain: { value: 1 },
        connect() {},
      };
    }
    resume() {
      this.state = 'running';
      return Promise.resolve();
    }
  }

  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };

  const windowObj = {
    AudioContext: MockAudioContext,
    localStorage,
    BroadcastChannel: MockBroadcastChannel,
    matchMedia: (q) => ({
      matches: q.includes('prefers-reduced-motion') ? reducedMotion : false,
    }),
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    dispatch(type, ev = {}) {
      for (const fn of Array.from(listeners.get(type) || [])) {
        fn(ev);
      }
    },
  };

  return {
    env: {
      window: windowObj,
      localStorage,
      BroadcastChannel: MockBroadcastChannel,
      matchMedia: windowObj.matchMedia,
    },
    windowObj,
    localStorage,
    channels,
    getAudioContextCount: () => audioContextCount,
    getStartedBuffers: () => startedBuffers,
  };
}

describe('Recipe 04 — Global NanoSound Integration & useNanoSound()', () => {
  afterEach(() => {
    setNanoUiSoundTestEnv(null);
    resetNanoUiSoundConfig();
  });

  it('compiles all semantic .nsd presets cleanly with finite non-zero PCM', () => {
    const requiredKeys = [
      'ui-tap-soft',
      'ui-click-glass',
      'switch-on',
      'switch-off',
      'scrubber-tick',
      'modal-open',
      'modal-close',
      'tab-select',
      'copy-chime',
      'alert-info',
      'alert-success',
      'alert-warn',
      'alert-danger',
    ];
    for (const key of requiredKeys) {
      assert.ok(NANO_UI_SOUND_PRESETS[key], `Missing preset ${key}`);
      const compiled = compileNsdPreview(NANO_UI_SOUND_PRESETS[key], { sampleRate: 22050 });
      assert.equal(compiled.valid, true, `Preset ${key} failed to compile`);
      assert.ok(compiled.pcm.length > 0, `Preset ${key} produced empty PCM`);
    }
  });

  it('remains 100% SSR/Node-safe when window, AudioContext, and BroadcastChannel are absent', () => {
    setNanoUiSoundTestEnv({});
    configureNanoUiSound({ enabled: true, preset: 'cyber', volume: 0.6 });
    const sound = useNanoSound();
    assert.equal(sound.muted.value, false);
    assert.equal(sound.preset.value, 'cyber');
    assert.equal(sound.volume.value, 0.6);
    assert.equal(sound.play('ui-tap-soft', { nowMs: 100 }), false);
    sound.toggleMute();
    assert.equal(sound.muted.value, true);
  });

  it('enforces lazy AudioContext creation strictly AFTER first pointerdown/keydown user interaction', () => {
    const mock = createMockBrowserEnv();
    setNanoUiSoundTestEnv(mock.env);
    configureNanoUiSound({ enabled: true, preset: 'glass', volume: 0.5 });

    // Before gesture: zero AudioContext allocated
    assert.equal(isNanoUiAudioUnlocked(), false);
    assert.equal(playNanoUiSound('ui-tap-soft', { nowMs: 50 }), false);
    assert.equal(mock.getAudioContextCount(), 0);

    // Trigger first pointerdown gesture -> unlocks lazy AudioContext synthesis
    mock.windowObj.dispatch('pointerdown', {});
    assert.equal(isNanoUiAudioUnlocked(), true);
    assert.equal(playNanoUiSound('ui-click-glass', { nowMs: 200 }), true);
    assert.equal(mock.getAudioContextCount(), 1);
    assert.equal(mock.getStartedBuffers(), 1);
  });

  it('suppresses acoustic synthesis automatically when prefers-reduced-motion: reduce is active', () => {
    const mock = createMockBrowserEnv({ reducedMotion: true });
    setNanoUiSoundTestEnv(mock.env);
    configureNanoUiSound({ enabled: true, volume: 0.5 });
    mock.windowObj.dispatch('keydown', { key: 'Enter' });

    assert.equal(playNanoUiSound('switch-on', { nowMs: 300 }), false);
    assert.equal(mock.getStartedBuffers(), 0);
  });

  it('persists muted/volume/preset to localStorage and syncs across tabs via BroadcastChannel and storage events', () => {
    const mock = createMockBrowserEnv();
    setNanoUiSoundTestEnv(mock.env);
    configureNanoUiSound({
      enabled: true,
      preset: 'tactile',
      volume: 0.72,
      storageKey: 'custom_sound_key',
    });

    const sound = useNanoSound();
    assert.equal(sound.muted.value, false);
    assert.equal(sound.preset.value, 'tactile');
    assert.deepEqual(VALID_NANO_SOUND_PRESETS, ['glass', 'tactile', 'cyber', 'minimal']);

    const storedRaw = mock.localStorage.getItem('custom_sound_key');
    assert.ok(storedRaw);
    assert.equal(JSON.parse(storedRaw).preset, 'tactile');

    // Simulate external tab BroadcastChannel message
    const peerChannel = new mock.env.BroadcastChannel('nano_ui_sound_sync');
    peerChannel.postMessage({
      type: 'nano-ui-sound-sync',
      storageKey: 'custom_sound_key',
      muted: true,
      volume: 0.3,
      preset: 'minimal',
    });

    assert.equal(sound.muted.value, true);
    assert.equal(sound.volume.value, 0.3);
    assert.equal(sound.preset.value, 'minimal');

    // Simulate window storage event from another tab
    mock.windowObj.dispatch('storage', {
      key: 'custom_sound_key',
      newValue: JSON.stringify({ enabled: true, volume: 0.85, preset: 'cyber' }),
    });
    assert.equal(sound.muted.value, false);
    assert.equal(sound.volume.value, 0.85);
    assert.equal(sound.preset.value, 'cyber');
  });

  it('hydrates existing user mute preference during plugin install configureNanoUiSound({ hydrateFromStorage: true })', () => {
    const mock = createMockBrowserEnv({
      initialStorage: {
        nano_ui_sound: JSON.stringify({ enabled: false, muted: true, volume: 0.25, preset: 'minimal' }),
      },
    });
    setNanoUiSoundTestEnv(mock.env);
    configureNanoUiSound({
      hydrateFromStorage: true,
      enabled: true,
      preset: 'glass',
      volume: 0.5,
    });
    const cfg = getNanoUiSoundConfig();
    assert.equal(cfg.enabled, false);
    assert.equal(cfg.muted, true);
    assert.equal(cfg.volume, 0.25);
    assert.equal(cfg.preset, 'minimal');
  });

  it('supports :sound="false" mute override and custom sound="..." across all target components and plugin index.js', () => {
    configureNanoUiSound({ enabled: true, volume: 0.5 });
    assert.equal(resolveComponentSoundConfig(false, 'ui-tap-soft').enabled, false);
    const custom = resolveComponentSoundConfig('copy-chime', 'ui-tap-soft');
    assert.equal(custom.enabled, true);
    assert.equal(custom.dsl, NANO_UI_SOUND_PRESETS['copy-chime']);

    const indexSrc = readSrc('index.js');
    assert.ok(indexSrc.includes('useNanoSound'));
    assert.ok(indexSrc.includes('hydrateFromStorage: true'));

    const targetComponents = [
      'components/NanoButton.vue',
      'components/NanoSwitch.vue',
      'components/NanoSlider.vue',
      'components/PrecisionScrubber.vue',
      'components/NanoModal.vue',
      'components/NanoSelect.vue',
      'components/NanoTabs.vue',
      'components/NanoCodeBlock.vue',
      'components/NanoAlert.vue',
    ];
    for (const file of targetComponents) {
      const sfc = readSrc(file);
      assert.ok(sfc.includes('sound:'), `Expected :sound prop in ${file}`);
      assert.ok(sfc.includes('playNanoUiSound'), `Expected playNanoUiSound integration in ${file}`);
    }
  });
});
