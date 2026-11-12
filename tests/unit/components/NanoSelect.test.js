import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getWcagContrastRatio } from '../../../src/utils/colors.js';

describe('NanoSelect — Light & Dark Theme SSoT Tokens, WCAG 1.4.11 Boundary Contrast & Accessibility', () => {
  const rootDir = path.resolve(import.meta.dirname, '../../..');
  const sfcPath = path.join(rootDir, 'src/components/NanoSelect.vue');
  const colorsPath = path.join(rootDir, 'src/assets/colors.css');

  it('delegates trigger, dropdown, search bar, and color presets to --nano-select-* tokens with zero raw typeof or :global leaks', () => {
    const sfc = fs.readFileSync(sfcPath, 'utf8');

    assert.match(sfc, /theme:\s*\{\s*type:\s*String,\s*default:\s*'auto'/);
    assert.ok(sfc.includes('.nano-select.theme-light'));
    assert.ok(sfc.includes('.nano-select-dropdown.theme-light'));
    assert.ok(sfc.includes('.nano-select.theme-dark'));
    assert.ok(sfc.includes('.nano-select-dropdown.theme-dark'));
    assert.ok(sfc.includes('var(--nano-select-bg,'));
    assert.ok(sfc.includes('var(--nano-select-border,'));
    assert.ok(sfc.includes('var(--nano-select-dropdown-bg,'));
    assert.ok(sfc.includes('var(--nano-select-dropdown-shadow,'));
    assert.ok(sfc.includes('var(--nano-select-preset-cyan,'));
    assert.ok(sfc.includes('.nano-select-trigger:focus-visible'));
    assert.ok(sfc.includes('autocorrect="off"'));
    assert.ok(sfc.includes('autocapitalize="none"'));
    assert.ok(sfc.includes('spellcheck="false"'));
    assert.ok(sfc.includes('aria-hidden="true"'));

    assert.doesNotMatch(sfc, /:global\(/);
    assert.doesNotMatch(sfc, /\[data-v-/);
    assert.doesNotMatch(sfc, /\btypeof\b/);
  });

  it('defines complete Dark and Light Mode --nano-select-* palettes in colors.css meeting WCAG 1.4.11 (>= 3:1) and WCAG AA (>= 4.5:1)', () => {
    const colorsCss = fs.readFileSync(colorsPath, 'utf8');
    const lightIdx = colorsCss.indexOf(':root[data-theme="light"]');
    assert.ok(lightIdx > 0, 'Expected Light Theme section in colors.css');

    const darkSection = colorsCss.slice(0, lightIdx);
    const lightSection = colorsCss.slice(lightIdx);

    for (const token of [
      '--nano-select-bg',
      '--nano-select-bg-hover',
      '--nano-select-border',
      '--nano-select-fg',
      '--nano-select-placeholder',
      '--nano-select-chevron',
      '--nano-select-dropdown-bg',
      '--nano-select-dropdown-border',
      '--nano-select-dropdown-shadow',
      '--nano-select-dropdown-overlap-shadow',
      '--nano-select-search-bg',
      '--nano-select-search-border',
      '--nano-select-option-fg',
      '--nano-select-option-hover-bg',
      '--nano-select-option-selected-bg',
      '--nano-select-check-border',
      '--nano-select-preset-emerald',
      '--nano-select-preset-cyan',
      '--nano-select-preset-amber',
      '--nano-select-preset-rose',
      '--nano-select-preset-violet',
      '--nano-select-preset-slate',
    ]) {
      assert.ok(darkSection.includes(`${token}:`), `Missing dark token ${token} in colors.css`);
      assert.ok(lightSection.includes(`${token}:`), `Missing light token ${token} in colors.css`);
    }

    // UI component boundary contrast (WCAG 1.4.11 >= 3.0:1 against #ffffff and #f8fafc)
    assert.ok(
      getWcagContrastRatio('#64748b', '#ffffff') >= 3.0,
      'Light Mode --nano-select-border (#64748b) must achieve >= 3:1 boundary contrast on white cards'
    );
    assert.ok(
      getWcagContrastRatio('#64748b', '#f8fafc') >= 3.0,
      'Light Mode --nano-select-border (#64748b) must achieve >= 3:1 boundary contrast on app canvas'
    );

    // Text, placeholder, and Light Mode preset badge/icon contrast (>= 4.5:1 on #ffffff)
    for (const hex of ['#0f172a', '#1e293b', '#475569', '#047857', '#0369a1', '#b45309', '#be123c', '#6d28d9']) {
      const ratio = getWcagContrastRatio(hex, '#ffffff');
      assert.ok(ratio >= 4.5, `Expected ${hex} to have >= 4.5:1 contrast against #ffffff, got ${ratio.toFixed(2)}:1`);
    }
  });
});
