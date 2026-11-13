import {
  showTooltip,
  hideTooltip,
  scheduleHideTooltip,
  tooltipState,
  isActiveTooltipTarget,
  getActiveTooltipSource,
  recordTooltipPointerPosition,
  recordTooltipPointerDown,
  wasRecentTooltipPointerDown,
  shouldSuppressSyntheticMouseLeave,
} from '../composables/useTooltip.js';

const isObjectRecord = (val) => Boolean(val) && Object.prototype.toString.call(val) === '[object Object]';
const isFunction = (val) => Object.prototype.toString.call(val) === '[object Function]';
const resolveTooltipText = (opts) => (isObjectRecord(opts) ? opts.text : opts);

export const tooltipDirective = {
  mounted(el, binding) {
    el._tooltipOptions = binding.value;
    el._touchTimeout = null;
    el._touchResetTimeout = null;
    el._lastPointerDownAt = 0;
    let isTouch = false;

    el._handlePointerDown = () => {
      const now = Date.now();
      el._lastPointerDownAt = now;
      recordTooltipPointerDown(now);
    };

    el._handleMouseEnter = (e) => {
      if (e && Number.isFinite(e.clientX) && Number.isFinite(e.clientY)) {
        recordTooltipPointerPosition(e.clientX, e.clientY);
      }
      if (!isTouch) showTooltip(el, el._tooltipOptions, 'pointer');
    };

    el._handleMouseLeave = (e) => {
      if (isTouch) return;
      if (shouldSuppressSyntheticMouseLeave(el, e)) return;
      // Bridge narrow inter-item CSS gaps (e.g. 3px NanoHeatmap grid tracks) without opacity blink
      if (e && e.relatedTarget) {
        scheduleHideTooltip(el, 36);
        return;
      }
      hideTooltip(el);
    };

    el._handleFocus = () => {
      if (isTouch) return;
      const now = Date.now();
      const selfClickedJustNow = el._lastPointerDownAt > 0 && now - el._lastPointerDownAt <= 450;
      const globalPointerRecent = wasRecentTooltipPointerDown(now, 450);

      // Never pop up a phantom tooltip when focus was programmatically transferred to `el`
      // after the user clicked a different element (e.g. selecting an option inside NanoLangPicker / popover).
      if (globalPointerRecent && !selfClickedJustNow) {
        return;
      }

      if (selfClickedJustNow) {
        const isFocusVisible = isFunction(el.matches) ? Boolean(el.matches(':focus-visible')) : false;
        if (!isFocusVisible) {
          // Pointer click focus: keep pointer-driven modality so mouseleave dismisses cleanly
          if (isActiveTooltipTarget(el)) {
            showTooltip(el, el._tooltipOptions, 'pointer');
          }
          return;
        }
      }
      showTooltip(el, el._tooltipOptions, 'focus');
    };

    el._handleBlur = () => {
      if (!isTouch) hideTooltip(el);
    };

    el._handleTouchStart = () => {
      isTouch = true;
      if (el._touchTimeout) clearTimeout(el._touchTimeout);
      if (el._touchResetTimeout) clearTimeout(el._touchResetTimeout);
      el._touchTimeout = setTimeout(() => {
        el._touchTimeout = null;
        showTooltip(el, el._tooltipOptions, 'touch');
      }, 400); // 400ms long press threshold
    };

    el._handleTouchEnd = () => {
      if (el._touchTimeout) {
        clearTimeout(el._touchTimeout);
        el._touchTimeout = null;
      }
      hideTooltip(el);
      // Block ensuing simulated mouseenter events
      if (el._touchResetTimeout) clearTimeout(el._touchResetTimeout);
      el._touchResetTimeout = setTimeout(() => {
        el._touchResetTimeout = null;
        isTouch = false;
      }, 500);
    };

    el._handleTouchCancel = () => {
      if (el._touchTimeout) {
        clearTimeout(el._touchTimeout);
        el._touchTimeout = null;
      }
      hideTooltip(el);
      if (el._touchResetTimeout) clearTimeout(el._touchResetTimeout);
      el._touchResetTimeout = setTimeout(() => {
        el._touchResetTimeout = null;
        isTouch = false;
      }, 500);
    };

    el._handleContextMenu = (e) => {
      // Prevent the OS context menu if we're showing a tooltip via long press
      const currentText = resolveTooltipText(el._tooltipOptions);
      if (isTouch && tooltipState.isVisible && tooltipState.text === currentText) {
        e.preventDefault();
      }
    };

    el.addEventListener('pointerdown', el._handlePointerDown, { passive: true });
    el.addEventListener('mousedown', el._handlePointerDown, { passive: true });
    el.addEventListener('mouseenter', el._handleMouseEnter);
    el.addEventListener('mouseleave', el._handleMouseLeave);
    el.addEventListener('focus', el._handleFocus);
    el.addEventListener('blur', el._handleBlur);

    el.addEventListener('touchstart', el._handleTouchStart, { passive: true });
    el.addEventListener('touchend', el._handleTouchEnd);
    el.addEventListener('touchmove', el._handleTouchCancel, { passive: true });
    el.addEventListener('touchcancel', el._handleTouchCancel);
    el.addEventListener('contextmenu', el._handleContextMenu);
  },
  updated(el, binding) {
    el._tooltipOptions = binding.value;

    const currentText = resolveTooltipText(binding.value);
    if (currentText && el.hasAttribute('aria-label') && isActiveTooltipTarget(el)) {
      el.setAttribute('aria-label', currentText);
    }

    // Strictly refresh ONLY the active tooltip owner — never let a sibling with document.activeElement
    // hijack and teleport the singleton tooltip across the viewport during VNode patches!
    if (isActiveTooltipTarget(el)) {
      if (!currentText) {
        hideTooltip(el);
      } else {
        showTooltip(el, binding.value, getActiveTooltipSource());
      }
    }
  },
  unmounted(el) {
    if (el._touchTimeout) {
      clearTimeout(el._touchTimeout);
      el._touchTimeout = null;
    }
    if (el._touchResetTimeout) {
      clearTimeout(el._touchResetTimeout);
      el._touchResetTimeout = null;
    }
    if (el._handleMouseEnter) {
      el.removeEventListener('pointerdown', el._handlePointerDown);
      el.removeEventListener('mousedown', el._handlePointerDown);
      el.removeEventListener('mouseenter', el._handleMouseEnter);
      el.removeEventListener('mouseleave', el._handleMouseLeave);
      el.removeEventListener('focus', el._handleFocus);
      el.removeEventListener('blur', el._handleBlur);
      el.removeEventListener('touchstart', el._handleTouchStart);
      el.removeEventListener('touchend', el._handleTouchEnd);
      el.removeEventListener('touchmove', el._handleTouchCancel);
      el.removeEventListener('touchcancel', el._handleTouchCancel);
      el.removeEventListener('contextmenu', el._handleContextMenu);
      delete el._handlePointerDown;
      delete el._handleMouseEnter;
      delete el._handleMouseLeave;
      delete el._handleFocus;
      delete el._handleBlur;
      delete el._handleTouchStart;
      delete el._handleTouchEnd;
      delete el._handleTouchCancel;
      delete el._handleContextMenu;
    }
    delete el._tooltipOptions;
    delete el._touchTimeout;
    delete el._touchResetTimeout;
    delete el._lastPointerDownAt;
    hideTooltip(el);
  },
};
