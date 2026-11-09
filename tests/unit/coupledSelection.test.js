import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_REARM_MOVE_THRESHOLD_PX,
  createCoupledSelectionMachine,
  useCoupledSelection,
} from '../../src/utils/coupledSelection.js';

describe('Coupled Selection & Hover-Suppress-Rearm (CSHR) State Machine', () => {
  it('follows the 4-phase cycle: hover -> 1st click lock -> 2nd click deselect & suppress hover -> >=3px move re-arms hover', () => {
    const machine = createCoupledSelectionMachine({ rearmMoveThresholdPx: 3 });

    // Phase 1: Hover item 'green'
    let snap = machine.onPointerEnter('green');
    assert.strictEqual(snap.hoveredId, 'green');
    assert.strictEqual(snap.selectedId, null);
    assert.strictEqual(snap.effectiveActiveId, 'green');

    // Phase 2: 1st Click on 'green' locks selection
    snap = machine.toggleSelect('green', { clientX: 100, clientY: 200 });
    assert.strictEqual(snap.selectedId, 'green');
    assert.strictEqual(snap.effectiveActiveId, 'green');

    // Phase 3: 2nd Click on 'green' at (100, 200) deselects AND suppresses hover even while cursor remains inside
    snap = machine.toggleSelect('green', { clientX: 100, clientY: 200 });
    assert.strictEqual(snap.selectedId, null);
    assert.strictEqual(snap.hoveredId, null);
    assert.strictEqual(snap.suppressedHoverId, 'green');
    assert.strictEqual(snap.effectiveActiveId, null);

    // Micro-jitter (< 3px) does NOT re-arm hover
    snap = machine.onPointerMove('green', { clientX: 101, clientY: 201 });
    assert.strictEqual(snap.effectiveActiveId, null);
    assert.strictEqual(snap.suppressedHoverId, 'green');

    // Phase 4: Deliberate movement (>= 3px) re-arms transient hover until mouseleave
    snap = machine.onPointerMove('green', { clientX: 104, clientY: 200 });
    assert.strictEqual(snap.suppressedHoverId, null);
    assert.strictEqual(snap.hoveredId, 'green');
    assert.strictEqual(snap.effectiveActiveId, 'green');

    // Mouseleave clears transient hover
    snap = machine.onPointerLeave('green');
    assert.strictEqual(snap.hoveredId, null);
    assert.strictEqual(snap.effectiveActiveId, null);
  });

  it('exposes reactive Vue 3 composable useCoupledSelection with isSelected, isHovered, isActive, and isDimmed helpers', () => {
    const sel = useCoupledSelection();
    assert.strictEqual(DEFAULT_REARM_MOVE_THRESHOLD_PX, 3);

    sel.toggleSelect('kingston', { clientX: 50, clientY: 50 });
    assert.strictEqual(sel.isSelected('kingston'), true);
    assert.strictEqual(sel.isActive('kingston'), true);
    assert.strictEqual(sel.isDimmed('lexar'), true);

    // 2nd click deselects & suppresses hover immediately
    sel.toggleSelect('kingston', { clientX: 50, clientY: 50 });
    assert.strictEqual(sel.isSelected('kingston'), false);
    assert.strictEqual(sel.isActive('kingston'), false);
    assert.strictEqual(sel.isDimmed('lexar'), false);

    // Deliberate pointer move >= 3px re-arms hover
    sel.onPointerMove('kingston', { clientX: 55, clientY: 50 });
    assert.strictEqual(sel.isHovered('kingston'), true);
    assert.strictEqual(sel.isActive('kingston'), true);
  });
});
