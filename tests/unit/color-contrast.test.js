import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@vue/compiler-sfc';
import {
  NANO_COLOR_PRESETS,
  isNanoColorPreset,
  resolveNanoColor,
  getPerceivedLightness,
  getContrastTextColor,
  pickBestContrastColor,
  adjustLightness,
  getWcagContrastRatio,
  parseColor,
} from '../../src/utils/colors.js';
import {
  clamp,
  countStepDecimals,
  quantizeStepValue,
} from '../../src/utils/math.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('OKLCH Perceptual Lightness & Contrast Utilities', () => {
  describe('when evaluating getContrastTextColor on perceptual edge cases', () => {
    test('should return dark text for bright yellow #ffff00', () => {
      const color = getContrastTextColor('#ffff00');
      assert.equal(color, '#0b0f17');
      assert.ok(getPerceivedLightness('#ffff00') > 0.9);
    });

    test('should return light text for deep blue #0000ff', () => {
      const color = getContrastTextColor('#0000ff');
      assert.equal(color, '#ffffff');
      assert.ok(getPerceivedLightness('#0000ff') < 0.5);
    });

    test('should return light text for dark emerald #0b8439', () => {
      const color = getContrastTextColor('#0b8439');
      assert.equal(color, '#ffffff');
      assert.ok(getPerceivedLightness('#0b8439') < 0.62);
    });

    test('should return dark text for bright emerald #4ce67a', () => {
      const color = getContrastTextColor('#4ce67a');
      assert.equal(color, '#0b0f17');
      assert.ok(getPerceivedLightness('#4ce67a') >= 0.62);
    });

    test('should support custom light/dark tokens and models (oklch, wcag, hsp)', () => {
      assert.equal(
        getContrastTextColor('#ffff00', { light: '#fff', dark: '#000', model: 'hsp' }),
        '#000'
      );
      assert.equal(
        getContrastTextColor('#0000ff', { light: '#fff', dark: '#000', model: 'wcag' }),
        '#fff'
      );
    });
  });

  describe('when parsing HEX (3/6 chars), RGB, HSL, and OKLCH formats', () => {
    test('should parse 3-char and 6-char HEX identically', () => {
      const l3 = getPerceivedLightness('#ff0');
      const l6 = getPerceivedLightness('#ffff00');
      assert.ok(Math.abs(l3 - l6) < 1e-6);
      assert.ok(Math.abs(getPerceivedLightness('#00f') - getPerceivedLightness('#0000ff')) < 1e-6);
    });

    test('should compute consistent perceptual lightness across HEX, RGB, HSL, and OKLCH for #3b4394', () => {
      const lHex = getPerceivedLightness('#3b4394');
      const lRgb = getPerceivedLightness('rgb(59, 67, 148)');
      const lHsl = getPerceivedLightness('hsl(235, 43%, 41%)');
      const lOklch = getPerceivedLightness('oklch(0.42 0.15 265)');

      assert.ok(Math.abs(lHex - lRgb) < 0.005);
      assert.ok(Math.abs(lHex - lHsl) < 0.015);
      assert.ok(Math.abs(lHex - lOklch) < 0.015);
      assert.ok(lHex > 0.4 && lHex < 0.45);
    });

    test('should support percentage lightness in oklch()', () => {
      const l = getPerceivedLightness('oklch(70% 0.14 160)');
      assert.ok(Math.abs(l - 0.7) < 1e-6);
    });
  });

  describe('when selecting optimal color from a palette (pickBestContrastColor)', () => {
    test('should pick the candidate with highest WCAG contrast against dark and light backgrounds', () => {
      const palette = ['#1e293b', '#475569', '#f8fafc'];
      assert.equal(pickBestContrastColor('#0b8439', palette), '#f8fafc');
      assert.equal(pickBestContrastColor('#ffff00', palette), '#1e293b');
    });

    test('should honor minRatio requirement and fall back when no candidate meets threshold', () => {
      const lowContrastPalette = ['#222222', '#333333'];
      const chosen = pickBestContrastColor('#111111', lowContrastPalette, {
        minRatio: 4.5,
        fallback: '#ffffff',
      });
      assert.equal(chosen, '#ffffff');
    });
  });

  describe('when adjusting perceptual lightness (adjustLightness) and computing WCAG ratio', () => {
    test('should shift lightness while preserving hue and chroma', () => {
      const base = 'oklch(0.42 0.15 265)';
      const lighter = adjustLightness(base, 0.3);
      const parsed = parseColor(lighter);
      assert.ok(Math.abs(parsed.l - 0.72) < 0.005);
      assert.ok(Math.abs(parsed.c - 0.15) < 0.005);
      assert.ok(Math.abs(parsed.h - 265) < 0.5);
    });

    test('should compute 21:1 WCAG contrast ratio for black and white', () => {
      const ratio = getWcagContrastRatio('#000000', '#ffffff');
      assert.ok(Math.abs(ratio - 21) < 0.05);
      assert.ok(Math.abs(getWcagContrastRatio('#3b4394', '#3b4394') - 1) < 1e-6);
    });
  });

  describe('SSoT Color Presets (NANO_COLOR_PRESETS, resolveNanoColor) & Math Quantization Utilities', () => {
    test('should resolve named presets to --nano-preset-* CSS tokens and pass through custom CSS colors', () => {
      assert.equal(isNanoColorPreset('purple'), true);
      assert.equal(isNanoColorPreset('emerald'), true);
      assert.equal(isNanoColorPreset('#ff0055'), false);
      assert.equal(resolveNanoColor('purple'), NANO_COLOR_PRESETS.purple);
      assert.equal(resolveNanoColor('#ff0055'), '#ff0055');
      assert.equal(resolveNanoColor('', 'cyan'), NANO_COLOR_PRESETS.cyan);
    });

    test('should clamp, count step decimals, and quantize step values without floating-point drift', () => {
      assert.equal(clamp(15, 0, 10), 10);
      assert.equal(clamp(-3, 0, 10), 0);
      assert.equal(countStepDecimals(0.005), 3);
      assert.equal(countStepDecimals(1e-4), 4);
      assert.equal(quantizeStepValue(0.88 + 0.333 * 0.24, { min: 0.88, max: 1.12, step: 0.002 }), 0.96);
    });
  });

  describe('NanoColorPickerOklch Component Structure', () => {
    test('should follow <script setup> -> <template> -> <style scoped> structure with zero layout shift controls', () => {
      const sfcPath = path.resolve(__dirname, '../../src/components/NanoColorPickerOklch.vue');
      const sfcContent = fs.readFileSync(sfcPath, 'utf-8');
      const { descriptor } = parse(sfcContent);

      assert.ok(descriptor.scriptSetup, 'Should have <script setup>');
      assert.ok(descriptor.template, 'Should have <template>');
      assert.equal(descriptor.styles.length, 1);
      assert.equal(descriptor.styles[0].scoped, true);
      assert.match(descriptor.template.content, /nano-oklch-disc/);
      assert.match(descriptor.template.content, /nano-oklch-preview/);
      assert.match(descriptor.styles[0].content, /user-select:\s*none/);
    });
  });
});
