import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initTheme, syncDocumentColorSchemeFromDom, syncThemeWithHostDark } from '../../src/theme.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

const createMockDom = ({ attrTheme = null, classes = [], prefersDark = true } = {}) => {
  const attrs = new Map();
  if (attrTheme) attrs.set('data-theme', attrTheme);
  const classSet = new Set(classes);
  const style = { colorScheme: '' };

  const documentElement = {
    style,
    getAttribute: (name) => (attrs.has(name) ? attrs.get(name) : null),
    setAttribute: (name, val) => attrs.set(name, String(val)),
    removeAttribute: (name) => attrs.delete(name),
    classList: {
      add: (...tokens) => tokens.forEach((t) => classSet.add(t)),
      remove: (...tokens) => tokens.forEach((t) => classSet.delete(t)),
      contains: (token) => classSet.has(token),
    },
  };

  return {
    window: {
      matchMedia: () => ({ matches: prefersDark }),
    },
    document: {
      documentElement,
      querySelector: () => null,
    },
    documentElement,
    style,
    attrs,
    classSet,
  };
};

describe('Color-Scheme & Light-Mode Checkbox Parity (COLOR-SCHEME-SYNC-01)', () => {
  test('syncDocumentColorSchemeFromDom flips inline colorScheme to light when data-theme="light" or .light is active', () => {
    const prevDoc = globalThis.document;
    const prevWin = globalThis.window;
    try {
      const mock = createMockDom({ attrTheme: null, classes: [], prefersDark: true });
      globalThis.window = mock.window;
      globalThis.document = mock.document;

      // Simulate OS dark boot first
      mock.style.colorScheme = 'dark';
      assert.equal(syncDocumentColorSchemeFromDom(), 'dark');
      assert.equal(mock.style.colorScheme, 'dark');

      // Host app switches to data-theme="light" without touching style.colorScheme
      mock.documentElement.setAttribute('data-theme', 'light');
      assert.equal(syncDocumentColorSchemeFromDom(), 'light');
      assert.equal(mock.style.colorScheme, 'light');

      // Host app uses class="light" without data-theme
      mock.documentElement.removeAttribute('data-theme');
      mock.documentElement.classList.add('light');
      assert.equal(syncDocumentColorSchemeFromDom(), 'light');
      assert.equal(mock.style.colorScheme, 'light');

      // Host app switches back to dark
      mock.documentElement.classList.remove('light');
      mock.documentElement.classList.add('dark');
      assert.equal(syncDocumentColorSchemeFromDom(), 'dark');
      assert.equal(mock.style.colorScheme, 'dark');
    } finally {
      globalThis.document = prevDoc;
      globalThis.window = prevWin;
    }
  });

  test('initTheme respects pre-existing host light attribute/class even when OS prefers-color-scheme is dark', () => {
    const prevDoc = globalThis.document;
    const prevWin = globalThis.window;
    try {
      const mock = createMockDom({ attrTheme: 'light', classes: ['light'], prefersDark: true });
      globalThis.window = mock.window;
      globalThis.document = mock.document;

      const resolved = initTheme({ storage: 'none', defaultTheme: 'dark' });
      assert.equal(resolved, 'light');
      assert.equal(mock.style.colorScheme, 'light');
      assert.equal(mock.documentElement.getAttribute('data-theme'), 'light');

      syncThemeWithHostDark(false);
      assert.equal(mock.style.colorScheme, 'light');
      syncThemeWithHostDark(true);
      assert.equal(mock.style.colorScheme, 'dark');
    } finally {
      globalThis.document = prevDoc;
      globalThis.window = prevWin;
    }
  });

  test('style.css and NanoCheckbox.vue enforce explicit light-mode checkbox background and color-scheme parity', () => {
    const styleCss = fs.readFileSync(path.join(rootDir, 'src/style.css'), 'utf8');
    const checkboxVue = fs.readFileSync(path.join(rootDir, 'src/components/NanoCheckbox.vue'), 'utf8');

    assert.match(styleCss, /color-scheme:\s*light/);
    assert.match(styleCss, /input\[type="checkbox"\]/);
    assert.match(checkboxVue, /\.light\s+\.nano-checkbox-box/);
    assert.match(checkboxVue, /background:\s*#ffffff/);
  });
});
