import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveOrbitBorderClasses,
  resolveOrbitBorderStyle,
} from '../../src/utils/coupledSelection.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('Standalone Orbiting Border (.nano-orbit-border) & Dual-Stack Local Dev Config', async (t) => {
  await t.test('resolveOrbitBorderClasses & resolveOrbitBorderStyle return deterministic bindings', () => {
    assert.deepEqual(resolveOrbitBorderClasses(false), {
      'nano-orbit-border': true,
      'is-orbit-active': false,
    });
    assert.deepEqual(resolveOrbitBorderClasses(true), {
      'nano-orbit-border': true,
      'is-orbit-active': true,
    });
    assert.deepEqual(resolveOrbitBorderStyle(null), {});
    assert.deepEqual(resolveOrbitBorderStyle('  #38bdf8 '), {
      '--nano-orbit-color': '#38bdf8',
    });
  });

  await t.test('primitives.css defines .nano-orbit-border for both Dark and Light themes', () => {
    const css = fs.readFileSync(path.join(ROOT, 'src/assets/primitives.css'), 'utf8');
    assert.ok(css.includes('.nano-orbit-border.is-orbit-active'));
    assert.ok(css.includes('[data-theme="light"] .nano-orbit-border.is-orbit-active'));
  });

  await t.test('vite.config.js & index.html enable dual-stack IPv4/IPv6 host binding and HMR WebSocket CSP', () => {
    const viteCfg = fs.readFileSync(path.join(ROOT, 'vite.config.js'), 'utf8');
    assert.match(viteCfg, /server:\s*\{[\s\S]*?host:\s*true/);
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.ok(html.includes('ws: wss:'));
    assert.ok(html.includes("worker-src 'self' blob:"));
  });
});
