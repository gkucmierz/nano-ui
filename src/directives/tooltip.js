import { showTooltip, hideTooltip, tooltipState } from '../composables/useTooltip.js'

export const tooltipDirective = {
  mounted(el, binding) {
    el._tooltipOptions = binding.value;
    el._touchTimeout = null;
    el._touchResetTimeout = null;
    let isTouch = false;

    el._handleMouseEnter = () => {
      if (!isTouch) showTooltip(el, el._tooltipOptions);
    };
    el._handleMouseLeave = () => {
      if (!isTouch) hideTooltip();
    };
    el._handleFocus = () => {
      if (!isTouch) showTooltip(el, el._tooltipOptions);
    };
    el._handleBlur = () => {
      if (!isTouch) hideTooltip();
    };

    el._handleTouchStart = () => {
      isTouch = true;
      if (el._touchTimeout) clearTimeout(el._touchTimeout);
      if (el._touchResetTimeout) clearTimeout(el._touchResetTimeout);
      el._touchTimeout = setTimeout(() => {
        el._touchTimeout = null;
        showTooltip(el, el._tooltipOptions);
      }, 400); // 400ms long press threshold
    };

    el._handleTouchEnd = () => {
      if (el._touchTimeout) {
        clearTimeout(el._touchTimeout);
        el._touchTimeout = null;
      }
      hideTooltip();
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
      hideTooltip();
      if (el._touchResetTimeout) clearTimeout(el._touchResetTimeout);
      el._touchResetTimeout = setTimeout(() => {
        el._touchResetTimeout = null;
        isTouch = false;
      }, 500);
    };

    el._handleContextMenu = (e) => {
      // Prevent the OS context menu if we're showing a tooltip via long press
      const currentText = typeof el._tooltipOptions === 'object' ? el._tooltipOptions.text : el._tooltipOptions;
      if (isTouch && tooltipState.isVisible && tooltipState.text === currentText) {
        e.preventDefault();
      }
    };

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

    const currentText = typeof binding.value === 'object' ? binding.value.text : binding.value;

    if (tooltipState.isVisible && tooltipState.text !== currentText) {
      if (el.matches(':hover') || document.activeElement === el) {
        showTooltip(el, binding.value);
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
      el.removeEventListener('mouseenter', el._handleMouseEnter);
      el.removeEventListener('mouseleave', el._handleMouseLeave);
      el.removeEventListener('focus', el._handleFocus);
      el.removeEventListener('blur', el._handleBlur);
      el.removeEventListener('touchstart', el._handleTouchStart);
      el.removeEventListener('touchend', el._handleTouchEnd);
      el.removeEventListener('touchmove', el._handleTouchCancel);
      el.removeEventListener('touchcancel', el._handleTouchCancel);
      el.removeEventListener('contextmenu', el._handleContextMenu);
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
    hideTooltip();
  },
};
