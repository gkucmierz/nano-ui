import { ref, onBeforeUnmount } from 'vue';
import { createBoundedPointerDrag } from '../utils/boundedPointerDrag.js';

/**
 * Vue 3 composable for unbroken out-of-bounds pointer drag sessions (`BOUNDED-DRAG-01`).
 *
 * Attaches active drag listeners at the highest reachable abstraction boundary
 * (`resolveHighestDragBoundary`) + W3C `setPointerCapture`, ensuring cursor excursions
 * outside the target element never sever the drag loop until `pointerup`/`pointercancel`.
 */
export function useBoundedPointerDrag(options = {}) {
  const isDragging = ref(false);
  const isInsideBounds = ref(false);
  const boundaryKind = ref('none');

  const controller = createBoundedPointerDrag({
    ...options,
    onStateChange(state) {
      isDragging.value = state.isDragging;
      isInsideBounds.value = state.isInside;
      boundaryKind.value = state.boundaryKind;
      options.onStateChange?.(state);
    },
  });

  onBeforeUnmount(() => {
    controller.destroy();
  });

  function bindDragTarget() {
    return {
      onPointerdown: controller.onPointerDown,
    };
  }

  return {
    isDragging,
    isInsideBounds,
    boundaryKind,
    onPointerDown: controller.onPointerDown,
    cancelDrag: controller.cancel,
    destroyDrag: controller.destroy,
    bindDragTarget,
    controller,
  };
}
