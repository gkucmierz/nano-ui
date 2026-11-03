import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tooltipDirective } from '../../src/directives/tooltip.js';
import { showTooltip, hideTooltip, tooltipState } from '../../src/composables/useTooltip.js';
import Ripple from '../../src/directives/ripple.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '../../src');

const readSrc = (relPath) => fs.readFileSync(path.join(srcDir, relPath), 'utf8');

describe('Memory Leak & Lifecycle Cleanup Audit (@gkucmierz/nano-ui)', () => {
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
    assert.equal(listeners.size, 9);
    assert.ok(mockEl._handleMouseEnter);
    assert.ok(mockEl._tooltipOptions);

    // Trigger touchstart & touchend to schedule _touchTimeout / _touchResetTimeout
    mockEl._handleTouchStart();
    assert.ok(mockEl._touchTimeout);
    mockEl._handleTouchEnd();
    assert.equal(mockEl._touchTimeout, null);
    assert.ok(mockEl._touchResetTimeout);

    // Unmount while _touchResetTimeout is pending
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

    // Simulate an in-flight ripple span created right before route navigation
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
});
