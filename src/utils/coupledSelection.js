import { ref, computed } from 'vue';

export const DEFAULT_REARM_MOVE_THRESHOLD_PX = 3;

/**
 * Pure deterministic state machine for the **Coupled Selection & Hover-Suppress-Rearm (`CSHR`)** pattern.
 *
 * Solves the multi-component selection UX problem (e.g. `<ThreeDDonutChart>` + Legend Grid + Data Table/Map):
 * 1. **Hover Preview (`hoveredId`)**: Entering item `A` previews `A` across all coupled views (`effectiveActiveId = A`).
 * 2. **1st Click -> Lock Selection (`selectedId = A`)**: Clicking item `A` locks `selectedId = A`.
 * 3. **2nd Click on Selected Item -> Immediate Deselect + Hover Suppression (`suppressedHoverId = A`)**:
 *    Clears `selectedId = null` AND `hoveredId = null` while setting `suppressedHoverId = A` and recording `lastClickPos = { x, y }`.
 *    Even though the pointer is still physically resting over `A`, `effectiveActiveId` immediately drops to `null` (retracting slices/highlights).
 * 4. **Deliberate Pointer Movement (`dist >= 3px`) or Leave -> Re-Arm Hover**:
 *    Moving the pointer by `>= rearmMoveThresholdPx` inside `A` clears `suppressedHoverId` and re-engages transient `hoveredId = A` until `mouseleave`.
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

  function onPointerLeave(id = null) {
    if (id === null || state.hoveredId === id) {
      state.hoveredId = null;
    }
    if (id === null || state.suppressedHoverId === id) {
      state.suppressedHoverId = null;
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

  return {
    toggleSelect,
    onPointerEnter,
    onPointerMove,
    onPointerLeave,
    setSelectedId,
    setHoveredId,
    getEffectiveActiveId,
    getSnapshot,
  };
}

/**
 * Reactive Vue 3 composable for **Coupled Selection & Hover-Suppress-Rearm (`CSHR`)**
 * across 2 or more synchronized components (e.g. `<ThreeDDonutChart>` + Legend Grid + Data Table).
 */
export function useCoupledSelection(options = {}) {
  const rearmThresholdPx =
    Number.isFinite(Number(options.rearmMoveThresholdPx)) && Number(options.rearmMoveThresholdPx) >= 0
      ? Number(options.rearmMoveThresholdPx)
      : DEFAULT_REARM_MOVE_THRESHOLD_PX;

  const selectedId = ref(options.initialSelectedId ?? null);
  const hoveredId = ref(options.initialHoveredId ?? null);
  const suppressedHoverId = ref(null);
  const lastClickPos = ref({ x: 0, y: 0 });

  const effectiveActiveId = computed(() => {
    if (hoveredId.value !== null && hoveredId.value !== suppressedHoverId.value) {
      return hoveredId.value;
    }
    return selectedId.value;
  });

  function extractCoords(event) {
    if (!event || typeof event !== 'object') return null;
    const x = Number(event.clientX ?? event.pageX);
    const y = Number(event.clientY ?? event.pageY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  }

  function toggleSelect(id, event = null) {
    if (id === undefined || id === null) return;
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

  function onPointerEnter(id) {
    if (id === undefined || id === null) return;
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

  function onPointerLeave(id = null) {
    if (id === null || hoveredId.value === id) {
      hoveredId.value = null;
    }
    if (id === null || suppressedHoverId.value === id) {
      suppressedHoverId.value = null;
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

  return {
    selectedId,
    hoveredId,
    suppressedHoverId,
    effectiveActiveId,
    toggleSelect,
    onPointerEnter,
    onPointerMove,
    onPointerLeave,
    isSelected,
    isHovered,
    isActive,
    isDimmed,
  };
}
