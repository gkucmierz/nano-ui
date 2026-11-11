import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  NANO_UI_SOUND_PRESETS,
  configureNanoUiSound,
  getNanoUiSoundConfig,
  resetNanoUiSoundConfig,
  resolveComponentSoundConfig,
  playNanoUiSound,
  computeKnobDetentCrossings,
  computeSliderAcousticEvents,
} from '../../src/utils/sound-controller.js';
import { compileNsdPreview } from '../../src/utils/nsd-preview.js';
import {
  isOklchInSrgbGamut,
  getMaxOklchChroma,
  oklchToRgb,
  rgbToOklch,
} from '../../src/utils/colors.js';
import { computeRippleGeometry } from '../../src/directives/ripple.js';
import {
  extractSvgIntrinsicDimensions,
  normalizeSvgPreviewMarkup,
} from '../../src/utils/git-diff.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');

test('NANO_UI_SOUND_PRESETS compile cleanly to non-empty PCM waveforms', () => {
  const keys = Object.keys(NANO_UI_SOUND_PRESETS);
  assert.ok(keys.length >= 8);
  for (const key of keys) {
    const res = compileNsdPreview(NANO_UI_SOUND_PRESETS[key], { sampleRate: 22050 });
    assert.equal(res.valid, true, `Preset ${key} failed to compile: ${res.error}`);
    assert.ok(res.pcm.length > 0, `Preset ${key} produced empty PCM`);
  }
});

test('sound-controller enforces 3-level precedence (prop -> global -> false) and refractory throttling', () => {
  resetNanoUiSoundConfig();
  assert.equal(getNanoUiSoundConfig().enabled, false);
  assert.equal(resolveComponentSoundConfig(undefined, 'knobTick').enabled, false);
  assert.equal(resolveComponentSoundConfig(true, 'knobTick').enabled, true);

  configureNanoUiSound({ enabled: true, volume: 0.6 });
  assert.equal(getNanoUiSoundConfig().enabled, true);
  assert.equal(resolveComponentSoundConfig(undefined, 'knobTick').enabled, true);
  assert.equal(resolveComponentSoundConfig(false, 'knobTick').enabled, false);

  const dispatched = [];
  configureNanoUiSound({
    enabled: false,
    volume: 0.5,
    player: (dsl, meta) => dispatched.push({ dsl, meta }),
  });

  // Global is false, propSound undefined -> silent
  assert.equal(playNanoUiSound('knobTick', { nowMs: 1000 }), false);
  assert.equal(dispatched.length, 0);

  // Local opt-in (:sound="true") -> plays & throttles within minIntervalMs
  assert.equal(
    playNanoUiSound('knobTick', { propSound: true, minIntervalMs: 25, throttleKey: 'k1', nowMs: 1000 }),
    true
  );
  assert.equal(
    playNanoUiSound('knobTick', { propSound: true, minIntervalMs: 25, throttleKey: 'k1', nowMs: 1010 }),
    false
  );
  assert.equal(
    playNanoUiSound('knobTick', { propSound: true, minIntervalMs: 25, throttleKey: 'k1', nowMs: 1030 }),
    true
  );
  assert.equal(dispatched.length, 2);

  resetNanoUiSoundConfig();
});

test('computeKnobDetentCrossings detects stepper teeth, 30-deg cardinal ticks, and RPM pitch scaling', () => {
  const smallMove = computeKnobDetentCrossings(1, 3, { tickStep: 6, cardinalStep: 30, showTicks: true });
  assert.equal(smallMove.crossedTick, false);
  assert.equal(smallMove.crossedCardinal, false);

  const toothCross = computeKnobDetentCrossings(4, 7, { tickStep: 6, cardinalStep: 30, showTicks: true, dtMs: 40 });
  assert.equal(toothCross.crossedTick, true);
  assert.equal(toothCross.crossedCardinal, false);

  const cardinalCross = computeKnobDetentCrossings(28, 31, { tickStep: 6, cardinalStep: 30, showTicks: true, dtMs: 16 });
  assert.equal(cardinalCross.crossedTick, true);
  assert.equal(cardinalCross.crossedCardinal, true);
  assert.ok(cardinalCross.playbackRate > toothCross.playbackRate);
});

test('computeSliderAcousticEvents maps 25% / 50% / 75% quartiles to C-E-G triad ratios and detects boundaries', () => {
  const q25 = computeSliderAcousticEvents(22, 26);
  assert.equal(q25.crossedQuartile, 25);
  assert.equal(q25.quartilePitch, 1.0);

  const q50 = computeSliderAcousticEvents(48, 52);
  assert.equal(q50.crossedQuartile, 50);
  assert.equal(q50.quartilePitch, 1.25);

  const q75 = computeSliderAcousticEvents(78, 74);
  assert.equal(q75.crossedQuartile, 75);
  assert.equal(q75.quartilePitch, 1.5);
  assert.ok(q75.swishPitch > q25.swishPitch);

  const hitTop = computeSliderAcousticEvents(97, 100);
  assert.equal(hitTop.hitBoundary, 100);
});

test('OKLCH sRGB gamut helpers preserve hue angle under high-chroma clamping', () => {
  assert.equal(isOklchInSrgbGamut(0.7, 0.02, 210), true);
  assert.equal(isOklchInSrgbGamut(0.85, 0.37, 210), false);

  const maxC = getMaxOklchChroma(0.75, 210);
  assert.ok(maxC > 0.05 && maxC < 0.3);
  assert.equal(isOklchInSrgbGamut(0.75, maxC * 0.99, 210), true);

  // High out-of-gamut cyan should preserve hue ~210° instead of twisting toward blue/green
  const clampedRgb = oklchToRgb(0.78, 0.37, 210);
  const roundTrip = rgbToOklch(clampedRgb.r, clampedRgb.g, clampedRgb.b);
  const hueDiff = Math.abs(((roundTrip.h - 210 + 540) % 360) - 180);
  assert.ok(hueDiff < 4, `Expected hue near 210°, got ${roundTrip.h.toFixed(2)}°`);
});

test('computeRippleGeometry calculates exact Euclidean farthest-corner wave diameter', () => {
  const geom = computeRippleGeometry({ left: 50, top: 100, width: 100, height: 40 }, 60, 120);
  // Local click at (10, 20); farthest corners at (100, 0) & (100, 40) -> hypot(90, 20) = 92.195 -> ceil = 93
  assert.equal(geom.x, 10);
  assert.equal(geom.y, 20);
  assert.equal(geom.radius, 93);
  assert.equal(geom.diameter, 186);

  const centered = computeRippleGeometry({ left: 0, top: 0, width: 80, height: 60 });
  // Center (40, 30) -> hypot(40, 30) = 50 -> diameter = 100
  assert.equal(centered.radius, 50);
  assert.equal(centered.diameter, 100);
});

test('extractSvgIntrinsicDimensions and normalizeSvgPreviewMarkup rescue viewBox-only SVGs from 0x0 collapse', () => {
  const rawViewBoxOnly = '<svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14"/></svg>';
  const dims = extractSvgIntrinsicDimensions(rawViewBoxOnly);
  assert.deepEqual(dims, { width: 32, height: 32, source: 'viewBox' });

  const normalized = normalizeSvgPreviewMarkup(rawViewBoxOnly);
  assert.match(normalized, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(normalized, /width="32"/);
  assert.match(normalized, /height="32"/);
});

test('NanoDatePicker and SelectDoc follow portal layout & light-mode simulator token contracts', () => {
  const dpSource = fs.readFileSync(path.join(ROOT_DIR, 'src/components/NanoDatePicker.vue'), 'utf8');
  assert.match(dpSource, /const\s*\{\s*mountEl,\s*viewportEl\s*\}\s*=\s*findSafeSelectMount/);
  assert.match(dpSource, /screenRect/);
  assert.match(dpSource, /actualDropdownHeight/);

  const colorsCss = fs.readFileSync(path.join(ROOT_DIR, 'src/assets/colors.css'), 'utf8');
  const selectDoc = fs.readFileSync(path.join(ROOT_DIR, 'src/playground/docs/SelectDoc.vue'), 'utf8');
  assert.match(colorsCss, /--nano-sim-frame-bg:/);
  assert.match(selectDoc, /var\(--nano-sim-frame-bg/);
  assert.match(selectDoc, /var\(--nano-sim-chrome-bg/);
  assert.doesNotMatch(selectDoc, /:global\(/);
});

test('Playground KnobDoc, SliderDoc, NanoSwitch & App enforce silent-by-default and local :sound override precedence', () => {
  const knobDoc = fs.readFileSync(path.join(ROOT_DIR, 'src/playground/docs/KnobDoc.vue'), 'utf8');
  const sliderDoc = fs.readFileSync(path.join(ROOT_DIR, 'src/playground/docs/SliderDoc.vue'), 'utf8');
  const switchSfc = fs.readFileSync(path.join(ROOT_DIR, 'src/components/NanoSwitch.vue'), 'utf8');
  const playgroundApp = fs.readFileSync(path.join(ROOT_DIR, 'src/playground/App.vue'), 'utf8');

  assert.match(knobDoc, /localSoundMode\s*=\s*ref\('inherit'\)/);
  assert.match(sliderDoc, /localSoundMode\s*=\s*ref\('inherit'\)/);
  assert.match(knobDoc, /:sound="resolvedLocalSound"/);
  assert.match(sliderDoc, /:sound="resolvedLocalSound"/);

  // NanoSwitch must emit update:modelValue before calling playNanoUiSound so muting global sound is 100% silent
  const emitIdx = switchSfc.indexOf("emit('update:modelValue', nextVal)");
  const soundIdx = switchSfc.indexOf("playNanoUiSound(nextVal ? 'switchOn' : 'switchOff'");
  assert.ok(emitIdx > 0 && soundIdx > emitIdx, 'Expected NanoSwitch to emit update:modelValue before playNanoUiSound');

  // Playground sidebar header exposes global .nsd audio toggle button
  assert.match(playgroundApp, /class="sound-toggle"/);
  assert.match(playgroundApp, /:aria-pressed="globalSound\.enabled\.value \? 'true' : 'false'"/);
});
