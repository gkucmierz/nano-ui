import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  CHANNEL_OSD_SHAPES,
  resolveChannelOsdMaxDigits,
  resolveChannelOsdBox,
} from '../../src/utils/channelOsdLayout.js';
import { getWcagContrastRatio } from '../../src/utils/colors.js';

describe('NanoChannelOsd naturalSearch Multi-Digit Geometry', () => {
  test('infers maxDigits from max with minimum of 2 unless explicitly overridden', () => {
    assert.deepEqual(CHANNEL_OSD_SHAPES, ['rect', 'square']);
    assert.equal(resolveChannelOsdMaxDigits({ max: 13 }), 2);
    assert.equal(resolveChannelOsdMaxDigits({ max: 99 }), 2);
    assert.equal(resolveChannelOsdMaxDigits({ max: 128 }), 3);
    assert.equal(resolveChannelOsdMaxDigits({ max: 1024 }), 4);
    assert.equal(resolveChannelOsdMaxDigits({ max: 99, maxDigits: 5 }), 5);
  });

  test('preserves exact 1:1 square for classic 1-2 digit channels (<= 99)', () => {
    const rect2 = resolveChannelOsdBox({ size: 140, displayText: '12', max: 99, shape: 'rect' });
    const sq2 = resolveChannelOsdBox({ size: 140, displayText: '12', max: 99, shape: 'square' });

    assert.equal(rect2.widthPx, 140);
    assert.equal(rect2.heightPx, 140);
    assert.equal(rect2.aspectRatio, 1);

    assert.equal(sq2.widthPx, 140);
    assert.equal(sq2.heightPx, 140);
    assert.equal(sq2.aspectRatio, 1);
  });

  test('widens horizontally via naturalSearch in shape="rect" while keeping height = size for 3+ digits', () => {
    const m3 = resolveChannelOsdBox({
      size: 152,
      displayText: '016',
      max: 128,
      subtitle: 'Relatywistyczna Kratownica',
      shape: 'rect',
    });

    assert.equal(m3.heightPx, 152);
    assert.ok(m3.widthPx >= 200, `Expected 3-digit width >= 200px, got ${m3.widthPx}`);
    assert.equal(m3.widthPx % 2, 0, 'Width must be quantized to even pixels to prevent half-pixel blur');
    assert.ok(m3.aspectRatio > 1.25);

    const m4 = resolveChannelOsdBox({
      size: 152,
      displayText: '1024',
      max: 1024,
      shape: 'rect',
    });
    assert.equal(m4.heightPx, 152);
    assert.ok(m4.widthPx > m3.heightPx);
  });

  test('expands uniformly 1:1 via naturalSearch in shape="square" for 3+ digits', () => {
    const sq3 = resolveChannelOsdBox({
      size: 152,
      displayText: '016',
      max: 128,
      subtitle: 'Relatywistyczna Kratownica',
      shape: 'square',
    });

    assert.equal(sq3.widthPx, sq3.heightPx);
    assert.ok(sq3.widthPx >= 196, `Expected expanded square side >= 196px, got ${sq3.widthPx}`);
    assert.equal(sq3.aspectRatio, 1);
  });

  test('guarantees CLS = 0 across 1st, 2nd, and 3rd typed digit when stabilizeCapacity is true', () => {
    const d1 = resolveChannelOsdBox({ size: 152, displayText: '0', max: 128, shape: 'rect', stabilizeCapacity: true });
    const d2 = resolveChannelOsdBox({ size: 152, displayText: '01', max: 128, shape: 'rect', stabilizeCapacity: true });
    const d3 = resolveChannelOsdBox({ size: 152, displayText: '016', max: 128, shape: 'rect', stabilizeCapacity: true });

    assert.equal(d1.widthPx, d2.widthPx);
    assert.equal(d2.widthPx, d3.widthPx);
  });

  test('NanoChannelOsd, NanoWelcomeHud, ChannelOsdDoc, and colors.css support Light Theme tokens and theme="auto|light|dark" prop', () => {
    const rootDir = path.resolve(import.meta.dirname, '../..');
    const osdSfc = fs.readFileSync(path.join(rootDir, 'src/components/NanoChannelOsd.vue'), 'utf8');
    const hudSfc = fs.readFileSync(path.join(rootDir, 'src/components/NanoWelcomeHud.vue'), 'utf8');
    const osdDoc = fs.readFileSync(path.join(rootDir, 'src/playground/docs/ChannelOsdDoc.vue'), 'utf8');
    const colorsCss = fs.readFileSync(path.join(rootDir, 'src/assets/colors.css'), 'utf8');

    for (const [name, sfc, clsPrefix, tokenPrefix] of [
      ['NanoChannelOsd.vue', osdSfc, '.nano-channel-osd', '--nano-osd-'],
      ['NanoWelcomeHud.vue', hudSfc, '.nano-welcome-hud', '--nano-welcome-hud-'],
    ]) {
      assert.match(sfc, /theme:\s*\{\s*type:\s*String,\s*default:\s*'auto'/, `${name} missing theme prop`);
      assert.match(sfc, /v\s*===\s*'auto'\s*\|\|\s*v\s*===\s*'light'\s*\|\|\s*v\s*===\s*'dark'/, `${name} missing theme validator`);
      assert.ok(sfc.includes(`${clsPrefix}.theme-light`), `${name} missing .theme-light rule`);
      assert.ok(sfc.includes(`${clsPrefix}.theme-dark`), `${name} missing .theme-dark rule`);
      assert.ok(sfc.includes(`var(${tokenPrefix}bg,`), `${name} missing ${tokenPrefix}bg CSS variable`);
      assert.doesNotMatch(sfc, /:global\(/, `${name} must not use :global()`);
      assert.doesNotMatch(sfc, /\[data-v-/, `${name} must not hardcode [data-v-*]`);
      assert.doesNotMatch(sfc, /\btypeof\b/, `${name} must not use raw typeof`);
    }

    // Verify ChannelOsdDoc uses theme-reactive CSS custom properties for stage & static comparison previews
    assert.ok(osdDoc.includes('var(--nano-osd-stage-bg)'));
    assert.ok(osdDoc.includes('var(--nano-osd-comparison-bg)'));
    assert.ok(osdDoc.includes('var(--nano-osd-bg)'));
    assert.ok(osdDoc.includes('var(--nano-osd-fg)'));
    assert.ok(osdDoc.includes('var(--nano-osd-subtitle-fg)'));
    assert.doesNotMatch(osdDoc, /:global\(/);
    assert.doesNotMatch(osdDoc, /\btypeof\b/);

    // Verify colors.css defines both Dark and Light tokens for --nano-osd-* and --nano-welcome-hud-*
    const lightIdx = colorsCss.indexOf(':root[data-theme="light"]');
    assert.ok(lightIdx > 0);
    const darkSection = colorsCss.slice(0, lightIdx);
    const lightSection = colorsCss.slice(lightIdx);

    for (const token of [
      '--nano-osd-bg',
      '--nano-osd-border',
      '--nano-osd-fg',
      '--nano-osd-subtitle-fg',
      '--nano-osd-stage-bg',
      '--nano-osd-comparison-bg',
      '--nano-welcome-hud-bg',
      '--nano-welcome-hud-border',
      '--nano-welcome-hud-fg',
      '--nano-welcome-hud-title-fg',
      '--nano-welcome-hud-subtitle-fg',
      '--nano-welcome-hud-kbd-bg',
      '--nano-welcome-hud-kbd-fg',
    ]) {
      assert.ok(darkSection.includes(`${token}:`), `Missing dark token ${token}`);
      assert.ok(lightSection.includes(`${token}:`), `Missing light token ${token}`);
    }

    assert.ok(getWcagContrastRatio('#0f172a', '#ffffff') >= 4.5, 'Light HUD primary digits/title contrast >= 4.5:1');
    assert.ok(getWcagContrastRatio('#475569', '#ffffff') >= 4.5, 'Light HUD subtitle contrast >= 4.5:1');
    assert.ok(getWcagContrastRatio('#0369a1', '#e0f2fe') >= 4.5, 'Light WelcomeHud kbd contrast >= 4.5:1');
  });
});
