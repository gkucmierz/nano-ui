import { ref, computed, getCurrentInstance, onMounted, onBeforeUnmount } from 'vue';
import { getGlobalKeyController, stepWrappedIndex } from './key-controller.js';

export const DEFAULT_REARM_MOVE_THRESHOLD_PX = 3;

export const NANO_TRI_BORDER_STATES = Object.freeze({
  IDLE: 'idle',
  HOVER: 'hover',
  ACTIVE: 'active',
  HOVER_ACTIVE: 'hover-active',
});

let nextCoupledScopeUid = 1;
let activeCoupledKeyboardScopeId = null;

/**
 * Extracts an ordered array of item IDs from an array, Vue ref/computed, or getter function.
 * Supports primitive IDs (`['alpha', 'beta']`) or objects (`[{ id: 'alpha' }, { key: 'beta' }]`).
 */
export function resolveCoupledItemIds(rawItems) {
  let source = rawItems;
  if (typeof source === 'function') {
    source = source();
  } else if (source && typeof source === 'object' && 'value' in source && Array.isArray(source.value)) {
    source = source.value;
  }
  if (!Array.isArray(source)) return [];
  const ids = [];
  for (const entry of source) {
    if (entry === null || entry === undefined) continue;
    if (typeof entry === 'object') {
      const id = entry.id ?? entry.key ?? entry.value ?? entry.slug;
      if (id !== null && id !== undefined) ids.push(id);
    } else {
      ids.push(entry);
    }
  }
  return ids;
}

/**
 * Resolves the 4-state / 3-highlight interactive card border state:
 * - `'idle'`:         Neither hovered nor selected
 * - `'hover'`:        Hovered only (transient pointer preview, e.g. Cyan `#38bdf8`)
 * - `'active'`:       Selected/locked only (persistent selection SSoT, e.g. Amber `#fbbf24`)
 * - `'hover-active'`: Both selected AND hovered simultaneously (2-color orbiting conic-gradient border)
 */
export function resolveTriStateBorder(selected, hovered) {
  const isSel = Boolean(selected);
  const isHov = Boolean(hovered);
  if (isSel && isHov) return NANO_TRI_BORDER_STATES.HOVER_ACTIVE;
  if (isSel) return NANO_TRI_BORDER_STATES.ACTIVE;
  if (isHov) return NANO_TRI_BORDER_STATES.HOVER;
  return NANO_TRI_BORDER_STATES.IDLE;
}

/**
 * Returns deterministic Vue `:class` bindings for the Tri-State Card Border protocol (`.nano-tri-border-card`).
 */
export function resolveTriStateBorderClasses(selected, hovered) {
  const isSel = Boolean(selected);
  const isHov = Boolean(hovered);
  return {
    'nano-tri-border-card': true,
    'is-hovered': isHov && !isSel,
    'is-selected': isSel,
    'is-hover-active': isSel && isHov,
  };
}

/**
 * Pure deterministic state machine for the **Coupled Selection & Hover-Suppress-Rearm (`CSHR`)** pattern,
 * including built-in modulo-wrapped `Left` / `Right` (`stepSelection`) list/grid stepping.
 *
 * Solves the multi-component selection UX problem (e.g. `<ThreeDDonutChart>` + Legend Grid + Data Table/Map):
 * 1. **Hover Preview (`hoveredId`)**: Entering item `A` previews `A` across all coupled views (`effectiveActiveId = A`).
 * 2. **1st Click -> Lock Selection (`selectedId = A`)**: Clicking item `A` locks `selectedId = A`.
 * 3. **2nd Click on Selected Item -> Immediate Deselect + Hover Suppression (`suppressedHoverId = A`)**:
 *    Clears `selectedId = null` AND `hoveredId = null` while setting `suppressedHoverId = A` and recording `lastClickPos = { x, y }`.
 *    Even though the pointer is still physically resting over `A`, `effectiveActiveId` immediately drops to `null` (retracting slices/highlights).
 * 4. **Deliberate Pointer Movement (`dist >= 3px`) or Leave -> Re-Arm Hover**:
 *    Moving the pointer by `>= rearmMoveThresholdPx` inside `A` clears `suppressedHoverId` and re-engages transient `hoveredId = A` until `mouseleave`.
 * 5. **Keyboard `ArrowLeft` / `ArrowRight` Cycling (`stepSelection(delta)`)**:
 *    Steps `selectedId` backward (`-1`) or forward (`+1`) across `options.items` with modulo wrap-around.
 */
export function createCoupledSelectionMachine(options = {}) {
  const rearmThresholdPx =
    Number.isFinite(Number(options.rearmMoveThresholdPx)) && Number(options.rearmMoveThresholdPx) >= 0
      ? Number(options.rearmMoveThresholdPx)
      : DEFAULT_REARM_MOVE_THRESHOLD_PX;

  let state = {
    selectedId: options.initialSelectedId ?? null,
    hoveredId: options.initialHoveredId ?? null,
    suppressedHoverId: null,
    pointerInCorridor: Boolean(options.corridor),
    lastClickPos: { x: 0, y: 0 },
  };

  function extractCoords(event) {
    if (!event || typeof event !== 'object') return null;
    const x = Number(event.clientX ?? event.pageX);
    const y = Number(event.clientY ?? event.pageY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  }

  function getEffectiveActiveId() {
    if (state.hoveredId !== null && state.hoveredId !== state.suppressedHoverId) {
      return state.hoveredId;
    }
    return state.selectedId;
  }

  function toggleSelect(id, event = null) {
    if (id === undefined || id === null) return getSnapshot();
    const coords = extractCoords(event);
    if (state.selectedId === id) {
      state.selectedId = null;
      state.hoveredId = null;
      state.suppressedHoverId = id;
      if (coords) {
        state.lastClickPos = coords;
      }
    } else {
      state.suppressedHoverId = null;
      state.selectedId = id;
      state.hoveredId = id;
    }
    return getSnapshot();
  }

  function stepSelection(delta = 1, customItems = null) {
    const ids = resolveCoupledItemIds(customItems ?? options.items ?? options.itemIds);
    if (ids.length === 0) return getSnapshot();
    const currentId = state.selectedId ?? getEffectiveActiveId();
    const currentIdx = currentId !== null ? ids.indexOf(currentId) : -1;
    const nextIdx =
      currentIdx === -1
        ? Number(delta) >= 0
          ? 0
          : ids.length - 1
        : stepWrappedIndex(currentIdx, delta, ids.length);
    const nextId = ids[nextIdx];
    state.suppressedHoverId = null;
    if (state.hoveredId !== null && state.hoveredId !== nextId) {
      state.hoveredId = null;
    }
    state.selectedId = nextId;
    return getSnapshot();
  }

  function selectNext(customItems = null) {
    return stepSelection(1, customItems);
  }

  function selectPrev(customItems = null) {
    return stepSelection(-1, customItems);
  }

  function onPointerEnter(id) {
    if (id === undefined || id === null) return getSnapshot();
    if (state.suppressedHoverId === id) return getSnapshot();
    state.hoveredId = id;
    return getSnapshot();
  }

  function onPointerMove(id, event = null) {
    if (id === undefined || id === null) return getSnapshot();
    if (state.suppressedHoverId === id) {
      const coords = extractCoords(event);
      if (coords) {
        const dist = Math.hypot(coords.x - state.lastClickPos.x, coords.y - state.lastClickPos.y);
        if (dist >= rearmThresholdPx) {
          state.suppressedHoverId = null;
          state.hoveredId = id;
        }
      } else {
        state.suppressedHoverId = null;
        state.hoveredId = id;
      }
    } else if (state.hoveredId !== id) {
      state.hoveredId = id;
    }
    return getSnapshot();
  }

  function onCorridorEnter() {
    state.pointerInCorridor = true;
    return getSnapshot();
  }

  function onCorridorLeave() {
    state.pointerInCorridor = false;
    state.hoveredId = null;
    state.suppressedHoverId = null;
    return getSnapshot();
  }

  function onPointerLeave(id = null) {
    if (id === null || state.suppressedHoverId === id) {
      state.suppressedHoverId = null;
    }
    if (state.pointerInCorridor && id !== null) {
      return getSnapshot();
    }
    if (id === null || state.hoveredId === id) {
      state.hoveredId = null;
    }
    return getSnapshot();
  }

  function setSelectedId(id) {
    state.selectedId = id ?? null;
    if (state.selectedId !== null) {
      state.suppressedHoverId = null;
    }
    return getSnapshot();
  }

  function setHoveredId(id) {
    if (id !== null && id === state.suppressedHoverId) {
      return getSnapshot();
    }
    state.hoveredId = id ?? null;
    return getSnapshot();
  }

  function getSnapshot() {
    const effectiveActiveId = getEffectiveActiveId();
    return {
      selectedId: state.selectedId,
      hoveredId: state.hoveredId,
      suppressedHoverId: state.suppressedHoverId,
      effectiveActiveId,
    };
  }

  function getTriBorderState(id) {
    const isSel = state.selectedId !== null && state.selectedId === id;
    const isHov =
      state.hoveredId !== null &&
      state.hoveredId !== state.suppressedHoverId &&
      state.hoveredId === id;
    return resolveTriStateBorder(isSel, isHov);
  }

  function getTriBorderClasses(id) {
    const isSel = state.selectedId !== null && state.selectedId === id;
    const isHov =
      state.hoveredId !== null &&
      state.hoveredId !== state.suppressedHoverId &&
      state.hoveredId === id;
    return resolveTriStateBorderClasses(isSel, isHov);
  }

  function bindCoupledItem(id) {
    return {
      onMouseenter: () => onPointerEnter(id),
      onMousemove: (event) => onPointerMove(id, event),
      onMouseleave: () => onPointerLeave(id),
      onClick: (event) => toggleSelect(id, event),
    };
  }

  function bindCoupledCorridor() {
    return {
      onMouseenter: () => onCorridorEnter(),
      onMouseleave: () => onCorridorLeave(),
    };
  }

  return {
    toggleSelect,
    stepSelection,
    selectNext,
    selectPrev,
    onCorridorEnter,
    onCorridorLeave,
    onPointerEnter,
    onPointerMove,
    onPointerLeave,
    setSelectedId,
    setHoveredId,
    getEffectiveActiveId,
    getTriBorderState,
    getTriBorderClasses,
    triStateClasses: getTriBorderClasses,
    bindCoupledItem,
    bindCoupledCorridor,
    getSnapshot,
  };
}

/**
 * Reactive Vue 3 composable for **Coupled Selection & Hover-Suppress-Rearm (`CSHR`)**
 * across 2 or more synchronized components (e.g. `<ThreeDDonutChart>` + Legend Grid + Data Table),
 * with built-in `@gkucmierz/key-controller` `ArrowLeft` / `ArrowRight` navigation when `items` is supplied.
 */
export function useCoupledSelection(options = {}) {
  const scopeId = options.scopeId || `cshr-scope-${nextCoupledScopeUid++}`;
  if (activeCoupledKeyboardScopeId === null) {
    activeCoupledKeyboardScopeId = scopeId;
  }

  const rearmThresholdPx =
    Number.isFinite(Number(options.rearmMoveThresholdPx)) && Number(options.rearmMoveThresholdPx) >= 0
      ? Number(options.rearmMoveThresholdPx)
      : DEFAULT_REARM_MOVE_THRESHOLD_PX;

  const selectedId = ref(options.initialSelectedId ?? null);
  const hoveredId = ref(options.initialHoveredId ?? null);
  const suppressedHoverId = ref(null);
  const pointerInCorridor = ref(Boolean(options.corridor));
  const lastClickPos = ref({ x: 0, y: 0 });

  const effectiveActiveId = computed(() => {
    if (hoveredId.value !== null && hoveredId.value !== suppressedHoverId.value) {
      return hoveredId.value;
    }
    return selectedId.value;
  });

  function activateKeyboardScope() {
    activeCoupledKeyboardScopeId = scopeId;
  }

  function extractCoords(event) {
    if (!event || typeof event !== 'object') return null;
    const x = Number(event.clientX ?? event.pageX);
    const y = Number(event.clientY ?? event.pageY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  }

  function toggleSelect(id, event = null) {
    if (id === undefined || id === null) return;
    activateKeyboardScope();
    const coords = extractCoords(event);
    if (selectedId.value === id) {
      selectedId.value = null;
      hoveredId.value = null;
      suppressedHoverId.value = id;
      if (coords) {
        lastClickPos.value = coords;
      }
    } else {
      suppressedHoverId.value = null;
      selectedId.value = id;
      hoveredId.value = id;
    }
    if (typeof options.onSelectChange === 'function') {
      options.onSelectChange(selectedId.value);
    }
  }

  function stepSelection(delta = 1, customItems = null) {
    const ids = resolveCoupledItemIds(customItems ?? options.items ?? options.itemIds);
    if (ids.length === 0) return selectedId.value;
    activateKeyboardScope();
    const currentId = selectedId.value ?? effectiveActiveId.value;
    const currentIdx = currentId !== null ? ids.indexOf(currentId) : -1;
    const nextIdx =
      currentIdx === -1
        ? Number(delta) >= 0
          ? 0
          : ids.length - 1
        : stepWrappedIndex(currentIdx, delta, ids.length);
    const nextId = ids[nextIdx];
    suppressedHoverId.value = null;
    if (hoveredId.value !== null && hoveredId.value !== nextId) {
      hoveredId.value = null;
    }
    selectedId.value = nextId;
    if (typeof options.onSelectChange === 'function') {
      options.onSelectChange(selectedId.value);
    }
    return selectedId.value;
  }

  function selectNext(customItems = null) {
    return stepSelection(1, customItems);
  }

  function selectPrev(customItems = null) {
    return stepSelection(-1, customItems);
  }

  function onPointerEnter(id) {
    if (id === undefined || id === null) return;
    activateKeyboardScope();
    if (suppressedHoverId.value === id) return;
    hoveredId.value = id;
  }

  function onPointerMove(id, event = null) {
    if (id === undefined || id === null) return;
    if (suppressedHoverId.value === id) {
      const coords = extractCoords(event);
      if (coords) {
        const dist = Math.hypot(
          coords.x - lastClickPos.value.x,
          coords.y - lastClickPos.value.y
        );
        if (dist >= rearmThresholdPx) {
          suppressedHoverId.value = null;
          hoveredId.value = id;
        }
      } else {
        suppressedHoverId.value = null;
        hoveredId.value = id;
      }
    } else if (hoveredId.value !== id) {
      hoveredId.value = id;
    }
  }

  function onCorridorEnter() {
    pointerInCorridor.value = true;
  }

  function onCorridorLeave() {
    pointerInCorridor.value = false;
    hoveredId.value = null;
    suppressedHoverId.value = null;
  }

  function onPointerLeave(id = null) {
    if (id === null || suppressedHoverId.value === id) {
      suppressedHoverId.value = null;
    }
    if (pointerInCorridor.value && id !== null) {
      return;
    }
    if (id === null || hoveredId.value === id) {
      hoveredId.value = null;
    }
  }

  function isSelected(id) {
    return selectedId.value !== null && selectedId.value === id;
  }

  function isHovered(id) {
    return (
      hoveredId.value !== null &&
      hoveredId.value !== suppressedHoverId.value &&
      hoveredId.value === id
    );
  }

  function isActive(id) {
    return effectiveActiveId.value !== null && effectiveActiveId.value === id;
  }

  function isDimmed(id) {
    const active = effectiveActiveId.value;
    return active !== null && active !== id && selectedId.value !== id;
  }

  function getTriBorderState(id) {
    return resolveTriStateBorder(isSelected(id), isHovered(id));
  }

  function getTriBorderClasses(id) {
    return resolveTriStateBorderClasses(isSelected(id), isHovered(id));
  }

  function bindCoupledItem(id) {
    return {
      onMouseenter: () => onPointerEnter(id),
      onMousemove: (event) => onPointerMove(id, event),
      onMouseleave: () => onPointerLeave(id),
      onClick: (event) => toggleSelect(id, event),
    };
  }

  function bindCoupledCorridor() {
    return {
      onMouseenter: () => onCorridorEnter(),
      onMouseleave: () => onCorridorLeave(),
    };
  }

  function bindKeyController(controller = options.keyController || getGlobalKeyController(), keyOptions = {}) {
    if (!controller || typeof controller.bindAll !== 'function') return () => {};
    const prevKey = keyOptions.prevKey || options.prevKey || 'ArrowLeft';
    const nextKey = keyOptions.nextKey || options.nextKey || 'ArrowRight';
    const userEnabled = keyOptions.enabled || options.keyEnabled || null;
    const isScopeEnabled = () => {
      const ids = resolveCoupledItemIds(options.items ?? options.itemIds);
      if (ids.length === 0) return false;
      if (typeof userEnabled === 'function' && userEnabled() === false) return false;
      if (activeCoupledKeyboardScopeId && activeCoupledKeyboardScopeId !== scopeId) return false;
      return true;
    };
    return controller.bindAll(
      {
        [prevKey]: () => stepSelection(-1),
        [nextKey]: () => stepSelection(1),
      },
      {
        allowRepeat: keyOptions.allowRepeat !== false,
        enabled: isScopeEnabled,
      }
    );
  }

  const hasItemsOption = Boolean(options.items || options.itemIds);
  if (hasItemsOption && options.keyboardNavigation !== false && getCurrentInstance()) {
    let offKeys = null;
    onMounted(() => {
      activeCoupledKeyboardScopeId = scopeId;
      offKeys = bindKeyController();
    });
    onBeforeUnmount(() => {
      if (typeof offKeys === 'function') {
        offKeys();
        offKeys = null;
      }
      if (activeCoupledKeyboardScopeId === scopeId) {
        activeCoupledKeyboardScopeId = null;
      }
    });
  }

  return {
    selectedId,
    hoveredId,
    suppressedHoverId,
    pointerInCorridor,
    effectiveActiveId,
    toggleSelect,
    stepSelection,
    selectNext,
    selectPrev,
    onCorridorEnter,
    onCorridorLeave,
    onPointerEnter,
    onPointerMove,
    onPointerLeave,
    isSelected,
    isHovered,
    isActive,
    isDimmed,
    getTriBorderState,
    getTriBorderClasses,
    triStateClasses: getTriBorderClasses,
    bindCoupledItem,
    bindCoupledCorridor,
    bindKeyController,
    activateKeyboardScope,
  };
}
