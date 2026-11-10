import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_REARM_MOVE_THRESHOLD_PX,
  NANO_TRI_BORDER_STATES,
  resolveTriStateBorder,
  resolveTriStateBorderClasses,
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

  it('resolves 3 distinct active border states: hover, active, and hover-active (2-color orbiting border)', () => {
    const sel = useCoupledSelection();
    assert.strictEqual(sel.getTriBorderState('card-1'), NANO_TRI_BORDER_STATES.IDLE);

    // 1. Hover only -> 'hover'
    sel.onPointerEnter('card-1');
    assert.strictEqual(sel.getTriBorderState('card-1'), NANO_TRI_BORDER_STATES.HOVER);
    assert.deepStrictEqual(sel.getTriBorderClasses('card-1'), {
      'nano-tri-border-card': true,
      'is-hovered': true,
      'is-selected': false,
      'is-hover-active': false,
    });

    // 2. Click to select while still hovered -> 'hover-active' (2-color orbiting border)
    sel.toggleSelect('card-1', { clientX: 10, clientY: 10 });
    assert.strictEqual(sel.getTriBorderState('card-1'), NANO_TRI_BORDER_STATES.HOVER_ACTIVE);
    assert.deepStrictEqual(sel.getTriBorderClasses('card-1'), {
      'nano-tri-border-card': true,
      'is-hovered': false,
      'is-selected': true,
      'is-hover-active': true,
    });

    // 3. Pointer leaves selected card -> 'active' (persistent single-color border)
    sel.onPointerLeave('card-1');
    assert.strictEqual(sel.getTriBorderState('card-1'), NANO_TRI_BORDER_STATES.ACTIVE);
    assert.deepStrictEqual(sel.getTriBorderClasses('card-1'), {
      'nano-tri-border-card': true,
      'is-hovered': false,
      'is-selected': true,
      'is-hover-active': false,
    });

    // Pure helpers
    assert.strictEqual(resolveTriStateBorder(false, false), 'idle');
    assert.strictEqual(resolveTriStateBorder(false, true), 'hover');
    assert.strictEqual(resolveTriStateBorder(true, false), 'active');
    assert.strictEqual(resolveTriStateBorder(true, true), 'hover-active');
    assert.strictEqual(resolveTriStateBorderClasses(true, true)['is-hover-active'], true);
  });

  it('provides bindCoupledItem(id) v-bind event object and triStateClasses alias on both machine and composable', () => {
    const sel = useCoupledSelection({ initialSelectedId: 'alpha' });
    assert.strictEqual(typeof sel.bindCoupledItem, 'function');
    assert.strictEqual(typeof sel.triStateClasses, 'function');
    assert.deepStrictEqual(sel.triStateClasses('alpha'), sel.getTriBorderClasses('alpha'));

    const bindings = sel.bindCoupledItem('beta');
    assert.strictEqual(typeof bindings.onMouseenter, 'function');
    assert.strictEqual(typeof bindings.onMousemove, 'function');
    assert.strictEqual(typeof bindings.onMouseleave, 'function');
    assert.strictEqual(typeof bindings.onClick, 'function');

    bindings.onMouseenter();
    assert.strictEqual(sel.hoveredId.value, 'beta');
    bindings.onClick({ clientX: 20, clientY: 20 });
    assert.strictEqual(sel.selectedId.value, 'beta');
    bindings.onMouseleave();
    assert.strictEqual(sel.hoveredId.value, null);
  });

  it('supports modulo-wrapped ArrowLeft / ArrowRight cycling via stepSelection, selectNext, selectPrev, and bindKeyController', () => {
    const nodes = [
      { id: 'alpha', title: 'Alpha' },
      { id: 'beta', title: 'Beta' },
      { id: 'gamma', title: 'Gamma' },
      { id: 'delta', title: 'Delta' },
    ];
    const sel = useCoupledSelection({
      items: nodes,
      initialSelectedId: 'alpha',
      keyboardNavigation: false,
    });

    assert.strictEqual(sel.selectedId.value, 'alpha');
    assert.strictEqual(sel.selectNext(), 'beta');
    assert.strictEqual(sel.selectNext(), 'gamma');
    assert.strictEqual(sel.selectNext(), 'delta');
    // Wrap around forward: delta -> alpha
    assert.strictEqual(sel.selectNext(), 'alpha');
    // Wrap around backward: alpha -> delta
    assert.strictEqual(sel.selectPrev(), 'delta');
    assert.strictEqual(sel.stepSelection(-2), 'beta');
  });
});
