import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tooltipDirective } from '../../src/directives/tooltip.js';
import { showTooltip, hideTooltip, tooltipState } from '../../src/composables/useTooltip.js';
import Ripple from '../../src/directives/ripple.js';
import { sanitizeLightboxSvgMarkup, normalizeLightboxSvgMarkup } from '../../src/utils/lightboxGeometry.js';
import { showAlert, handleCancel } from '../../src/composables/useDialog.js';
import {
  decodeEcosystemPrefsToken,
  extractAndStripEcosystemHash,
  buildEcosystemSyncBounceUrl,
} from '../../src/utils/ecosystemPrefs.js';
import { resolveTranslation } from '../../src/utils/i18n-engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '../../src');

const readSrc = (relPath) => fs.readFileSync(path.join(srcDir, relPath), 'utf8');

describe('Whitebox OPSEC, Memory Leak & Lifecycle Cleanup Audit (@gkucmierz/nano-ui v1.8.37)', () => {
  it('PrecisionScrubber removes document mousemove/mouseup listeners on unmount', () => {
    const src = readSrc('components/PrecisionScrubber.vue');
    assert.match(src, /onUnmounted\(\(\)\s*=>\s*\{[\s\S]*removeEventListener\('mousemove',\s*handleScrubMove\)[\s\S]*removeEventListener\('mouseup',\s*stopScrubbing\)/);
  });

  it('tooltipDirective clears touch timers and deletes all DOM expando properties on unmount', () => {
    const listeners = new Map();
    const mockEl = {
      isConnected: true,
      hasAttribute: () => false,
      setAttribute: () => {},
      getBoundingClientRect: () => ({ top: 10, left: 20, width: 100, bottom: 40, right: 120 }),
      addEventListener: (evt, fn) => listeners.set(evt, fn),
      removeEventListener: (evt, fn) => {
        if (listeners.get(evt) === fn) listeners.delete(evt);
      },
    };

    tooltipDirective.mounted(mockEl, { value: 'Audit Tooltip' });
    assert.equal(listeners.size, 11);
    assert.ok(mockEl._handleMouseEnter);
    assert.ok(mockEl._tooltipOptions);

    mockEl._handleTouchStart();
    assert.ok(mockEl._touchTimeout);
    mockEl._handleTouchEnd();
    assert.equal(mockEl._touchTimeout, null);
    assert.ok(mockEl._touchResetTimeout);

    tooltipDirective.unmounted(mockEl);
    assert.equal(listeners.size, 0);
    assert.equal('_handleMouseEnter' in mockEl, false);
    assert.equal('_handleTouchStart' in mockEl, false);
    assert.equal('_tooltipOptions' in mockEl, false);
    assert.equal('_touchTimeout' in mockEl, false);
    assert.equal('_touchResetTimeout' in mockEl, false);
    assert.equal(tooltipState.isVisible, false);
    assert.equal(tooltipState.targetRect, null);
  });

  it('showTooltip ignores detached DOM elements (el.isConnected === false)', () => {
    hideTooltip();
    const detachedEl = {
      isConnected: false,
      hasAttribute: () => true,
      getBoundingClientRect: () => ({ top: 0, left: 0, width: 50, bottom: 20, right: 50 }),
    };
    showTooltip(detachedEl, 'Should Not Show');
    assert.equal(tooltipState.isVisible, false);
    assert.equal(tooltipState.targetRect, null);
  });

  it('v-ripple directive removes click listener, expando refs, and any in-flight .ripple spans on unmount', () => {
    const rippleChildren = [];
    const listeners = new Map();
    const mockEl = {
      style: {},
      addEventListener: (evt, fn) => listeners.set(evt, fn),
      removeEventListener: (evt, fn) => {
        if (listeners.get(evt) === fn) listeners.delete(evt);
      },
      querySelectorAll: () => [...rippleChildren],
    };

    let removed = false;
    const fakeSpan = {
      _rippleTimer: setTimeout(() => {}, 10000),
      remove: () => { removed = true; },
    };
    rippleChildren.push(fakeSpan);

    Ripple.mounted(mockEl, { value: true });
    assert.equal(listeners.size, 1);
    assert.ok(mockEl._rippleHandler);

    Ripple.unmounted(mockEl);
    assert.equal(listeners.size, 0);
    assert.equal('_rippleHandler' in mockEl, false);
    assert.equal('_rippleBinding' in mockEl, false);
    assert.equal(removed, true);
    assert.equal('_rippleTimer' in fakeSpan, false);
  });

  it('NanoGlobe guards auto-rotate RAF with isUnmounted and cancels animFrameId & dragRafId on unmount', () => {
    const src = readSrc('components/NanoGlobe.vue');
    assert.match(src, /let isUnmounted = false/);
    assert.match(src, /watch\(\(\)\s*=>\s*props\.autoRotateSpeed,\s*startOrStopAutoRotate\)/);
    assert.match(src, /onUnmounted\(\(\)\s*=>\s*\{[\s\S]*isUnmounted = true[\s\S]*cancelAnimationFrame\(animFrameId\)[\s\S]*cancelAnimationFrame\(dragRafId\)/);
  });

  it('NanoCodeBlock, NanoCodeEditor, NanoFileList, and NanoColorPickerOklch clear copy timers on unmount', () => {
    for (const file of [
      'components/NanoCodeBlock.vue',
      'components/NanoCodeEditor.vue',
      'components/NanoFileList.vue',
      'components/NanoColorPickerOklch.vue',
    ]) {
      const src = readSrc(file);
      assert.match(src, /onUnmounted\(\(\)\s*=>\s*\{[\s\S]*clearTimeout\(/, `${file} must clear copy timer in onUnmounted`);
    }
  });

  it('NanoModal guards stopDrag and stopResize so unmounting an idle modal does not write to localStorage', () => {
    const src = readSrc('components/NanoModal.vue');
    assert.match(src, /const stopDrag = \(\) => \{\s*if \(!isDragging\.value\) return;/);
    assert.match(src, /const stopResize = \(\) => \{\s*if \(!isResizing\.value\) return;/);
  });

  it('Every Playground doc view that schedules setTimeout or setInterval registers an onUnmounted cleanup hook', () => {
    const docsDir = path.join(srcDir, 'playground/docs');
    const docFiles = fs.readdirSync(docsDir).filter((f) => f.endsWith('.vue'));
    for (const file of docFiles) {
      const content = fs.readFileSync(path.join(docsDir, file), 'utf8');
      if (/\b(setTimeout|setInterval)\s*\(/.test(content)) {
        assert.match(
          content,
          /on(?:Unmounted|BeforeUnmount)\s*\(/,
          `Playground doc ${file} uses timers and must clean them up in onUnmounted/onBeforeUnmount`
        );
      }
    }
  });

  it('SEC-02: sanitizeLightboxSvgMarkup strips <script>, event handlers, SMIL href mutators, and javascript: URIs while preserving Mermaid <foreignObject>', () => {
    const maliciousSvg = `<svg viewBox="0 0 200 100" onload="alert(1)">
      <script>window.pwned = true;</script>
      <foreignObject width="120" height="40"><div onclick="evil()" xmlns="http://www.w3.org/1999/xhtml">Mermaid Node</div></foreignObject>
      <a href="javascript:alert(2)" xlink:href="data:text/html,<script>x</script>"><rect width="10" height="10" /></a>
      <set attributeName="href" to="javascript:alert(3)" />
    </svg>`;
    const clean = normalizeLightboxSvgMarkup(maliciousSvg, 'audit');
    assert.ok(!clean.includes('<script'), 'Must strip <script> elements');
    assert.ok(!clean.includes('onload='), 'Must strip onload attributes');
    assert.ok(!clean.includes('onclick='), 'Must strip onclick inside <foreignObject>');
    assert.ok(!clean.includes('javascript:'), 'Must block javascript: URIs');
    assert.ok(!clean.includes('data:text/html'), 'Must block data:text/html URIs');
    assert.ok(!clean.includes('<set'), 'Must strip SMIL <set> mutator');
    assert.ok(clean.includes('Mermaid Node'), 'Must preserve valid Mermaid <foreignObject> label');
    assert.equal(sanitizeLightboxSvgMarkup(''), '');
  });

  it('MEM-01..06 & SEC-03..08: verifies FontFace cleanup, splitter gesture teardown, fillHeight unmount guard, inertial disposal guard, and NanoSwitch scoped CSS', () => {
    const editorSrc = readSrc('components/NanoCodeEditor.vue');
    assert.match(editorSrc, /(?:document|doc)\.fonts\.delete\(activeFontFace\)/);
    assert.match(editorSrc, /isSafePreviewUrl/);

    const splitterSrc = readSrc('components/NanoSplitter.vue');
    assert.match(splitterSrc, /cancelPendingGesture/);

    const fillHeightSrc = readSrc('utils/fillHeight.js');
    assert.match(fillHeightSrc, /isMounted = false/);

    const inertialSrc = readSrc('composables/useInertialStabilizer.js');
    assert.match(inertialSrc, /let isDisposed = false/);

    const coverFlowSrc = readSrc('components/NanoCoverFlow.vue');
    assert.match(coverFlowSrc, /coverFlowStorage\.get\(/);
    assert.match(coverFlowSrc, /formatSafeCoverFlowImageCss/);

    const switchSrc = readSrc('components/NanoSwitch.vue');
    assert.match(switchSrc, /<style scoped>/);
  });

  it('useDialog settles any superseded open dialog Promise instead of leaking unresolvable Promises', async () => {
    const firstPromise = showAlert('First alert');
    const secondPromise = showAlert('Second alert');
    assert.equal(await firstPromise, false);
    handleCancel();
    assert.equal(await secondPromise, false);
  });

  it('ecosystemPrefs & i18n-engine harden malformed percent-encoding, compound hashes, non-string URLs, and prototype keys', () => {
    assert.equal(decodeEcosystemPrefsToken('%E0%A4%A'), null);
    assert.equal(decodeEcosystemPrefsToken('v1:__proto__=polluted:theme=dark')?.theme, 'dark');

    const stripped = extractAndStripEcosystemHash('https://serce.app/guide#7u_p=v1.light.en.1.l.abc&section=intro');
    assert.equal(stripped.prefs?.theme, 'light');
    assert.equal(stripped.cleanUrl, '/guide#section=intro');

    assert.equal(buildEcosystemSyncBounceUrl({ origin: 'https://7u.pl', toString: () => 'https://evil.example' }), '');
    assert.equal(resolveTranslation({ en: { msg: 'Pay {amount} now' } }, 'en', 'msg', { amount: '$&100' }), 'Pay $&100 now');
    assert.equal(resolveTranslation({ en: {} }, 'en', 'constructor.prototype'), 'constructor.prototype');
  });
});
