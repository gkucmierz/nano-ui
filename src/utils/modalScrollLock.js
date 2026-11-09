/**
 * Zero-CLS Modal Background Scroll Lock for @gkucmierz/nano-ui.
 *
 * Keeps the native root scrollbar visible underneath the fixed modal backdrop
 * (never mutating `document.body.style.overflow = 'hidden'`), eliminating the
 * ~15px horizontal layout shift (CLS) on the underlying page and fixed headers,
 * while strictly containing wheel, touchmove, and keyboard scrolling within the
 * active modal window.
 */

const SCROLLABLE_OVERFLOW_RE = /(auto|scroll|overlay)/i;
const SCROLL_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
]);

const activeModalLocks = new Set();
let listenersAttached = false;
let lastTouchY = null;
let lastTouchX = null;

const isEditableElement = (el) => {
  if (!el || el.nodeType !== 1) return false;
  const tag = String(el.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') {
    return true;
  }
  if (el.isContentEditable) return true;
  return false;
};

const isElementScrollableOnAxis = (el, axis = 'y') => {
  if (!el || el.nodeType !== 1) return false;
  const win = globalThis.window;
  const style = win && win.getComputedStyle ? win.getComputedStyle(el) : el.style;
  if (style) {
    const ov = axis === 'x'
      ? (style.overflowX || style.overflow || '')
      : (style.overflowY || style.overflow || '');
    if (ov && !SCROLLABLE_OVERFLOW_RE.test(ov)) {
      return false;
    }
  }
  return axis === 'x'
    ? (el.scrollWidth || 0) > (el.clientWidth || 0) + 1
    : (el.scrollHeight || 0) > (el.clientHeight || 0) + 1;
};

const canElementScrollDelta = (el, deltaX = 0, deltaY = 0) => {
  if (!el || el.nodeType !== 1) return false;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absY >= absX && absY > 0) {
    if (!isElementScrollableOnAxis(el, 'y')) return false;
    const top = el.scrollTop || 0;
    const maxTop = Math.max(0, (el.scrollHeight || 0) - (el.clientHeight || 0));
    if (deltaY < 0) return top > 0;
    if (deltaY > 0) return top < maxTop - 0.5;
  }

  if (absX > absY && absX > 0) {
    if (!isElementScrollableOnAxis(el, 'x')) return false;
    const left = el.scrollLeft || 0;
    const maxLeft = Math.max(0, (el.scrollWidth || 0) - (el.clientWidth || 0));
    if (deltaX < 0) return left > 0;
    if (deltaX > 0) return left < maxLeft - 0.5;
  }

  return false;
};

const findModalWindowRoot = (target) => {
  let curr = target;
  while (curr && curr.nodeType === 1) {
    if (
      curr.classList &&
      (curr.classList.contains('nano-modal-window') ||
        curr.classList.contains('nano-select-dropdown'))
    ) {
      return curr;
    }
    curr = curr.parentNode;
  }
  return null;
};

/**
 * Pure predicate determining whether a wheel, touchmove, or keydown event
 * should be prevented from scrolling the document background while a NanoModal is open.
 *
 * @param {Object} event - DOM event or synthetic test event
 * @returns {boolean} True when `event.preventDefault()` should be called
 */
export const shouldPreventModalBackgroundScroll = (event) => {
  if (!event) return false;
  const target = event.target || null;
  const type = String(event.type || '').toLowerCase();

  // For keydown events, NEVER block non-scroll keys (such as 't', 'l', '?', 'Escape', 'ArrowLeft', 'ArrowRight')
  // even when focus is on `.nano-modal-overlay` or `document.body` outside `.nano-modal-window`!
  // This ensures global shortcuts registered via @gkucmierz/key-controller bubble cleanly while a NanoModal is open.
  if (type === 'keydown') {
    const key = event.key || '';
    if (!SCROLL_KEYS.has(key)) return false;
    if (event.ctrlKey || event.metaKey || event.altKey) return false;
    if (isEditableElement(target)) return false;

    const modalWindow = findModalWindowRoot(target);
    if (!modalWindow) return true;

    const deltaY = key === 'ArrowUp' || key === 'PageUp' || key === 'Home' ? -1 : 1;
    let curr = target;
    while (curr && curr.nodeType === 1) {
      if (canElementScrollDelta(curr, 0, deltaY)) {
        return false;
      }
      if (curr === modalWindow) break;
      curr = curr.parentNode;
    }
    return true;
  }

  const modalWindow = findModalWindowRoot(target);

  // Anything outside `.nano-modal-window` (e.g., `.nano-modal-overlay` backdrop or page body)
  // must never scroll the underlying page via wheel or touchmove.
  if (!modalWindow) {
    return true;
  }

  if (type === 'wheel') {
    const deltaX = Number(event.deltaX) || 0;
    const deltaY = Number(event.deltaY) || 0;
    if (deltaX === 0 && deltaY === 0) return false;

    let curr = target;
    while (curr && curr.nodeType === 1) {
      if (canElementScrollDelta(curr, deltaX, deltaY)) {
        return false;
      }
      if (curr === modalWindow) break;
      curr = curr.parentNode;
    }
    return true;
  }

  if (type === 'touchmove') {
    const deltaX = Number(event.deltaX) || 0;
    const deltaY = Number(event.deltaY) || 0;
    let curr = target;
    while (curr && curr.nodeType === 1) {
      if (deltaX !== 0 || deltaY !== 0) {
        if (canElementScrollDelta(curr, deltaX, deltaY)) return false;
      } else if (
        isElementScrollableOnAxis(curr, 'y') ||
        isElementScrollableOnAxis(curr, 'x')
      ) {
        return false;
      }
      if (curr === modalWindow) break;
      curr = curr.parentNode;
    }
    return true;
  }

  return false;
};

const onGlobalWheel = (e) => {
  if (activeModalLocks.size === 0) return;
  if (shouldPreventModalBackgroundScroll(e)) {
    if (e.cancelable !== false && e.preventDefault) {
      e.preventDefault();
    }
  }
};

const onGlobalTouchStart = (e) => {
  if (activeModalLocks.size === 0) return;
  const touch = e.touches && e.touches[0];
  if (touch) {
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
  }
};

const onGlobalTouchMove = (e) => {
  if (activeModalLocks.size === 0) return;
  const touch = e.touches && e.touches[0];
  let deltaX = 0;
  let deltaY = 0;
  if (touch && lastTouchY !== null && lastTouchX !== null) {
    deltaX = lastTouchX - touch.clientX;
    deltaY = lastTouchY - touch.clientY;
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
  }
  const synthetic = {
    type: 'touchmove',
    target: e.target,
    deltaX,
    deltaY,
  };
  if (shouldPreventModalBackgroundScroll(synthetic)) {
    if (e.cancelable !== false && e.preventDefault) {
      e.preventDefault();
    }
  }
};

const onGlobalKeyDownScrollGuard = (e) => {
  if (activeModalLocks.size === 0) return;
  if (shouldPreventModalBackgroundScroll(e)) {
    if (e.cancelable !== false && e.preventDefault) {
      e.preventDefault();
    }
  }
};

const syncGlobalListeners = () => {
  const win = globalThis.window;
  const doc = globalThis.document;
  if (!win || !doc) return;

  if (activeModalLocks.size > 0) {
    if (doc.documentElement && doc.documentElement.setAttribute) {
      doc.documentElement.setAttribute('data-nano-modal-open', 'true');
    }
    if (!listenersAttached) {
      win.addEventListener('wheel', onGlobalWheel, { passive: false, capture: true });
      win.addEventListener('touchstart', onGlobalTouchStart, { passive: true, capture: true });
      win.addEventListener('touchmove', onGlobalTouchMove, { passive: false, capture: true });
      win.addEventListener('keydown', onGlobalKeyDownScrollGuard, { capture: true });
      listenersAttached = true;
    }
  } else {
    if (doc.documentElement && doc.documentElement.removeAttribute) {
      doc.documentElement.removeAttribute('data-nano-modal-open');
    }
    if (listenersAttached) {
      win.removeEventListener('wheel', onGlobalWheel, { capture: true });
      win.removeEventListener('touchstart', onGlobalTouchStart, { capture: true });
      win.removeEventListener('touchmove', onGlobalTouchMove, { capture: true });
      win.removeEventListener('keydown', onGlobalKeyDownScrollGuard, { capture: true });
      listenersAttached = false;
      lastTouchX = null;
      lastTouchY = null;
    }
  }
};

/**
 * Registers a modal scroll lock by unique token/symbol without hiding the native scrollbar.
 */
export const lockModalBackgroundScroll = (token) => {
  const key = token || 'default-modal';
  activeModalLocks.add(key);
  syncGlobalListeners();
  return activeModalLocks.size;
};

/**
 * Releases a modal scroll lock by token/symbol.
 */
export const unlockModalBackgroundScroll = (token) => {
  const key = token || 'default-modal';
  activeModalLocks.delete(key);
  syncGlobalListeners();
  return activeModalLocks.size;
};

/**
 * Returns the number of currently active modal scroll locks.
 */
export const getActiveModalScrollLockCount = () => activeModalLocks.size;

/**
 * Clears all active modal scroll locks (useful for tests or emergency cleanup).
 */
export const resetModalScrollLocks = () => {
  activeModalLocks.clear();
  syncGlobalListeners();
};
