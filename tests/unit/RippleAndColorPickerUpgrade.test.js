import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { computeRippleGeometry, resolveRippleOptions } from '../../src/directives/ripple.js';
import { pickAdaptiveHeaderLabel } from '../../src/utils/mutatingHeader.js';
import { createKineticImpulse } from '../../src/utils/kinetics.js';
import { dispatchGlobalShellShortcut } from '../../src/utils/key-controller.js';
import { BUILTIN_ICONS } from '../../src/icons/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, '../../src');

const collectFiles = (dir, extFilter = /\.(vue|js)$/) => {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, extFilter));
    } else if (extFilter.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
};

describe('v-ripple Structured Options, NanoColorPickerOklch Popover & C1 Kinetic Impulse', () => {
  test('resolveRippleOptions supports boolean, string shorthand, and structured options object', () => {
    assert.deepEqual(resolveRippleOptions(undefined), {
      enabled: true,
      color: '',
      centered: false,
      duration: 540,
      opacity: null,
      onRipple: null,
    });

    assert.equal(resolveRippleOptions(false).enabled, false);
    assert.equal(resolveRippleOptions({ disabled: true }).enabled, false);

    const strOpt = resolveRippleOptions('oklch(0.72 0.16 205)');
    assert.equal(strOpt.enabled, true);
    assert.equal(strOpt.color, 'oklch(0.72 0.16 205)');

    const fn = () => {};
    const objOpt = resolveRippleOptions({
      color: ' #38bdf8 ',
      centered: true,
      duration: 920,
      opacity: 0.42,
      onRipple: fn,
    });
    assert.equal(objOpt.enabled, true);
    assert.equal(objOpt.color, '#38bdf8');
    assert.equal(objOpt.centered, true);
    assert.equal(objOpt.duration, 920);
    assert.equal(objOpt.opacity, 0.42);
    assert.equal(objOpt.onRipple, fn);

    const centeredGeom = computeRippleGeometry({ left: 20, top: 40, width: 120, height: 60 });
    assert.equal(centeredGeom.centered, true);
    assert.equal(centeredGeom.x, 60);
    assert.equal(centeredGeom.y, 30);
  });

  test('Nano UI src/ contains zero native <input type="color"> and uses NanoColorPickerOklch popover', () => {
    const allSrcFiles = collectFiles(SRC_DIR);
    for (const file of allSrcFiles) {
      const content = fs.readFileSync(file, 'utf8');
      assert.doesNotMatch(
        content,
        /<input\b[^>]*\btype\s*=\s*["']color["']/i,
        `Native <input type="color"> is banned in ${path.relative(SRC_DIR, file)}; use <NanoColorPickerOklch popover>`
      );
    }

    const rippleDoc = fs.readFileSync(path.join(SRC_DIR, 'playground/docs/RippleDoc.vue'), 'utf8');
    assert.match(rippleDoc, /NanoColorPickerOklch/);
    assert.match(rippleDoc, /popover/);
    assert.match(rippleDoc, /labRippleBinding/);
  });

  test('pickAdaptiveHeaderLabel supports both pixel budgets and discrete tier indices + safe string coercion', () => {
    const candidates = ['Scena Lounge', 'Scena', 'Lounge'];

    // Discrete tier indices 0..2
    const t0 = pickAdaptiveHeaderLabel(candidates, 0);
    const t1 = pickAdaptiveHeaderLabel(candidates, 1);
    const t2 = pickAdaptiveHeaderLabel(candidates, 2);
    assert.equal(t0.label, 'Scena Lounge');
    assert.equal(t1.label, 'Scena');
    assert.equal(t2.label, 'Lounge');

    // Safe string coercion when interpolated directly without .label
    assert.equal(String(t0), 'Scena Lounge');
    assert.equal(`${t2}`, 'Lounge');
    assert.deepEqual(Object.keys(t0), ['label', 'tierIndex', 'estimatedWidthPx']);

    // Pixel width naturalSearch remains exact
    assert.equal(pickAdaptiveHeaderLabel(candidates, 240).label, 'Scena Lounge');
    assert.equal(pickAdaptiveHeaderLabel(candidates, 82).label, 'Scena');
  });

  test('createKineticImpulse preserves C1 position continuity (0.00px jump) across rapid multi-click bursts', () => {
    const imp = createKineticImpulse({ omega: 16.5, zeta: 0.68, impulseVelocity: 9 });
    imp.trigger(1, { timestamp: 1000 });
    const s1 = imp.step(1060);
    assert.ok(s1.value > 0.05, 'Should lift smoothly after first trigger');

    // Rapid 2nd click mid-flight: position before and right at trigger MUST match identically
    const posBeforeSecondClick = imp.getState().value;
    const s2AtClick = imp.trigger(1, { timestamp: 1060 });
    assert.ok(
      Math.abs(s2AtClick.value - posBeforeSecondClick) < 1e-9,
      `Expected 0 position jump on rapid click, got ${s2AtClick.value} vs ${posBeforeSecondClick}`
    );
    assert.equal(s2AtClick.comboCount, 2);

    // Rapid 3rd click while descending
    imp.step(1260);
    const posBeforeThirdClick = imp.getState().value;
    const s3AtClick = imp.trigger(1, { timestamp: 1260 });
    assert.ok(Math.abs(s3AtClick.value - posBeforeThirdClick) < 1e-9);
    assert.equal(s3AtClick.comboCount, 3);

    // Eventually settles cleanly to exact zero
    let latest = s3AtClick;
    for (let t = 1300; t <= 4000; t += 50) {
      latest = imp.step(t);
    }
    assert.equal(latest.isMoving, false);
    assert.equal(latest.value, 0);
    assert.equal(latest.comboCount, 0);
  });

  test('ThreeDDonutChart pruneStaleSliceTransitions has zero undeclared processedData references and layout-grid icon resolves cleanly', () => {
    const donutVue = fs.readFileSync(path.join(SRC_DIR, 'components/ThreeDDonutChart.vue'), 'utf8');
    assert.doesNotMatch(donutVue, /\bprocessedData\b/, 'ThreeDDonutChart.vue must not reference undeclared processedData');
    assert.match(donutVue, /normalizedData\.value/, 'pruneStaleSliceTransitions must inspect normalizedData.value');
    assert.match(donutVue, /animatedItems\.value/, 'pruneStaleSliceTransitions must preserve outgoing animatedItems.value');

    assert.ok(BUILTIN_ICONS['layout-grid'], 'BUILTIN_ICONS["layout-grid"] must resolve to a valid icon component');

    const pickerVue = fs.readFileSync(path.join(SRC_DIR, 'components/NanoColorPickerOklch.vue'), 'utf8');
    assert.match(pickerVue, /forceResolveMount:\s*true/, 'openPopover must resolve teleportTarget before mounting');
    assert.match(pickerVue, /onWindowDiscPointerMove/, 'NanoColorPickerOklch must track circular wheel drags via window pointermove');
    assert.match(pickerVue, /stopDiscDrag/, 'NanoColorPickerOklch must clean up window drag listeners on pointerup/unmount');

    const miscCss = fs.readFileSync(path.join(SRC_DIR, 'assets/misc.css'), 'utf8');
    assert.match(miscCss, /kbd\s*\{[\s\S]*?white-space:\s*nowrap/i, 'misc.css must enforce white-space: nowrap on <kbd>');
  });

  test('dispatchGlobalShellShortcut handles L/T/M/?/Escape even when modals are open while ignoring inputs and modifiers', () => {
    const calls = [];
    const handlers = {
      onLocale: () => calls.push('locale'),
      onTheme: () => calls.push('theme'),
      onMute: () => calls.push('mute'),
      onHelp: () => calls.push('help'),
      onEscape: () => {
        calls.push('escape');
        return true;
      },
    };

    assert.equal(dispatchGlobalShellShortcut({ key: 't', target: { tagName: 'DIV' } }, handlers), true);
    assert.equal(dispatchGlobalShellShortcut({ key: 'L', shiftKey: true, target: { tagName: 'DIV' } }, handlers), true);
    assert.equal(dispatchGlobalShellShortcut({ key: 'm', target: { tagName: 'DIV' } }, handlers), true);
    assert.equal(dispatchGlobalShellShortcut({ key: '?', shiftKey: true, target: { tagName: 'DIV' } }, handlers), true);
    assert.equal(dispatchGlobalShellShortcut({ key: 'Escape', target: { tagName: 'DIV' } }, handlers), true);
    assert.deepEqual(calls, ['theme', 'locale', 'mute', 'help', 'escape']);

    // Must ignore Ctrl/Meta/Alt combos (e.g. Cmd+T, Cmd+L) and editable inputs
    assert.equal(dispatchGlobalShellShortcut({ key: 't', metaKey: true, target: { tagName: 'DIV' } }, handlers), false);
    assert.equal(dispatchGlobalShellShortcut({ key: 'l', ctrlKey: true, target: { tagName: 'DIV' } }, handlers), false);
    assert.equal(dispatchGlobalShellShortcut({ key: 't', target: { tagName: 'INPUT', type: 'text' } }, handlers), false);
    assert.equal(calls.length, 5);
  });
});
