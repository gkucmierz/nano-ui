import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSelectDropdownLayout,
  findSafeSelectMount,
} from '../../src/utils/selectPositioning.js';

describe('NanoSelect Smart Positioning (Options 2 + 3)', () => {
  test('computeSelectDropdownLayout selects "bottom" when plenty of screen space exists below', () => {
    const layout = computeSelectDropdownLayout({
      triggerRect: { top: 80, bottom: 116, left: 40, width: 240, height: 36 },
      screenRect: { top: 0, bottom: 768, left: 0, right: 1024 },
      searchable: true,
      optionsCount: 5,
      maxDropdownHeight: 260,
    });

    assert.equal(layout.placement, 'bottom');
    assert.equal(layout.optionsMaxHeight, 260);
    assert.equal(layout.top, 42); // 36px trigger height + 6px gap
  });

  test('computeSelectDropdownLayout flips to "top" when select is near the bottom of screen/modal', () => {
    const layout = computeSelectDropdownLayout({
      triggerRect: { top: 350, bottom: 386, left: 40, width: 240, height: 36 },
      screenRect: { top: 0, bottom: 420, left: 0, right: 800 },
      searchable: true,
      optionsCount: 5,
      maxDropdownHeight: 260,
    });

    assert.equal(layout.placement, 'top');
    assert.ok(layout.top < 0, 'Dropdown top should be negative (above trigger) when not teleported');
  });

  test('computeSelectDropdownLayout selects "overlap" (top + bottom simultaneously) with symmetrical top/bottom margins and clamps height to screen', () => {
    const layout = computeSelectDropdownLayout({
      triggerRect: { top: 90, bottom: 126, left: 30, width: 260, height: 36 },
      screenRect: { top: 0, bottom: 220, left: 0, right: 640 },
      mountRect: { top: 0, left: 0 },
      searchable: true,
      optionsCount: 8,
      maxDropdownHeight: 260,
      edgeMargin: 16,
    });

    assert.equal(layout.placement, 'overlap');
    // Visible safe screen height is 220 - 32 = 188px; optionsMaxHeight + chromeHeight equals 188px
    assert.ok(layout.optionsMaxHeight <= 156, `Expected clamped optionsMaxHeight <= 156, got ${layout.optionsMaxHeight}`);
    assert.equal(layout.top, 16, `Expected dropdown top === 16px screen margin, got ${layout.top}`);
    assert.equal(layout.topMarginPx, 16);
    assert.equal(layout.bottomMarginPx, 16);
    assert.equal(layout.topMarginPx, layout.bottomMarginPx, 'Top margin must strictly equal bottom margin in overlap mode');
    assert.ok(layout.top < 90, 'In overlap mode, dropdown starts above the trigger and extends below it simultaneously');
  });

  test('computeSelectDropdownLayout selects "bottom-clamped" when more room is below than above, but less than full ideal height', () => {
    const layout = computeSelectDropdownLayout({
      triggerRect: { top: 30, bottom: 66, left: 20, width: 220, height: 36 },
      screenRect: { top: 0, bottom: 270, left: 0, right: 640 },
      searchable: true,
      optionsCount: 8,
      maxDropdownHeight: 260,
    });

    assert.equal(layout.placement, 'bottom-clamped');
    assert.ok(layout.optionsMaxHeight < 260);
    assert.ok(layout.optionsMaxHeight >= 140);
  });

  test('computeSelectDropdownLayout expands optionsMaxHeight without scrollbar when autoHeight is enabled and viewport has room', () => {
    const layout = computeSelectDropdownLayout({
      triggerRect: { top: 80, bottom: 116, left: 40, width: 240, height: 36 },
      screenRect: { top: 0, bottom: 768, left: 0, right: 1024 },
      searchable: false,
      optionsCount: 8,
      maxDropdownHeight: 'auto',
      autoHeight: true,
    });

    assert.equal(layout.placement, 'bottom');
    assert.ok(layout.optionsMaxHeight >= 348, `Expected optionsMaxHeight >= 348 without scrollbar, got ${layout.optionsMaxHeight}`);
  });

  test('findSafeSelectMount walks up parentNode past tight overflow containers to [data-nano-viewport] or .nano-modal-overlay', () => {
    const origWindow = globalThis.window;
    const origDocument = globalThis.document;

    try {
      const fakeBody = { nodeType: 1 };
      const fakeDocEl = { nodeType: 1 };
      const viewportNode = {
        nodeType: 1,
        parentNode: fakeBody,
        hasAttribute: (attr) => attr === 'data-nano-viewport',
        classList: { contains: () => false },
        getBoundingClientRect: () => ({ top: 0, bottom: 420, left: 0, right: 800, height: 420 }),
      };
      const modalWindowNode = {
        nodeType: 1,
        parentNode: viewportNode,
        hasAttribute: () => false,
        classList: { contains: () => false },
        _style: { overflow: 'hidden', overflowY: 'hidden', overflowX: 'hidden' },
        getBoundingClientRect: () => ({ top: 60, bottom: 340, left: 100, right: 660, height: 280 }),
      };
      const modalBodyNode = {
        nodeType: 1,
        parentNode: modalWindowNode,
        hasAttribute: () => false,
        classList: { contains: () => false },
        scrollTop: 0,
        scrollHeight: 180,
        _style: { overflow: 'visible', overflowY: 'auto', overflowX: 'hidden' },
        getBoundingClientRect: () => ({ top: 110, bottom: 290, left: 100, right: 660, height: 180 }),
      };
      const selectRootNode = {
        nodeType: 1,
        parentNode: modalBodyNode,
        getBoundingClientRect: () => ({ top: 240, bottom: 276, left: 260, right: 620, height: 36 }),
      };

      globalThis.document = { body: fakeBody, documentElement: fakeDocEl };
      globalThis.window = {
        getComputedStyle: (el) => el._style || { overflow: 'visible', overflowY: 'visible', overflowX: 'visible' },
      };

      const res = findSafeSelectMount(selectRootNode, 240);
      assert.equal(res.mountEl, viewportNode);
      assert.equal(res.viewportEl, viewportNode);
      assert.equal(res.escapedScrollers, 2);
    } finally {
      globalThis.window = origWindow;
      globalThis.document = origDocument;
    }
  });
});
