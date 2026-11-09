/**
 * Deterministic Element Scroll Position Persistence (`v-scroll-persist` / `useScrollPersist`)
 * for internal scrollable containers (`overflow-y: auto` / `overflow-x: auto`) inside
 * `100vh` split-pane workbenches (`NanoSplitter`, sidebars, `v-if`/`v-else` view toggles).
 *
 * Why needed:
 * Browser native `history.scrollRestoration` only restores `window.scrollY`.
 * In full-viewport (`100vh`, `overflow: hidden`) apps or across `v-if`/`v-else` tab switches,
 * internal panel `scrollTop` is lost on reload or tab toggle unless persisted per-container.
 */

const memoryScrollStore = new Map();

function resolveStorageKey(bindingVal) {
  if (typeof bindingVal === 'string' && bindingVal.trim()) {
    return `nano_scroll_${bindingVal.trim()}`;
  }
  if (bindingVal && typeof bindingVal === 'object' && typeof bindingVal.key === 'string') {
    return `nano_scroll_${bindingVal.key.trim()}`;
  }
  return '';
}

function resolveStorageBackend(bindingVal) {
  const mode =
    bindingVal && typeof bindingVal === 'object' && bindingVal.storage
      ? bindingVal.storage
      : 'session';
  if (typeof window === 'undefined') return null;
  try {
    return mode === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveElementScrollPosition(key, pos, storage = null) {
  if (!key) return;
  const payload = {
    top: Math.max(0, Math.round(Number(pos?.top) || 0)),
    left: Math.max(0, Math.round(Number(pos?.left) || 0)),
  };
  memoryScrollStore.set(key, payload);
  if (storage) {
    try {
      storage.setItem(key, JSON.stringify(payload));
    } catch {}
  }
}

export function readElementScrollPosition(key, storage = null) {
  if (!key) return null;
  if (memoryScrollStore.has(key)) {
    return memoryScrollStore.get(key);
  }
  if (storage) {
    try {
      const raw = storage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const norm = {
            top: Math.max(0, Math.round(Number(parsed.top) || 0)),
            left: Math.max(0, Math.round(Number(parsed.left) || 0)),
          };
          memoryScrollStore.set(key, norm);
          return norm;
        }
      }
    } catch {}
  }
  return null;
}

export function restoreElementScroll(el, key, storage = null) {
  if (!el || !key) return false;
  const saved = readElementScrollPosition(key, storage);
  if (!saved) return false;
  const apply = () => {
    if (saved.top > 0) el.scrollTop = saved.top;
    if (saved.left > 0) el.scrollLeft = saved.left;
  };
  apply();
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(apply);
  }
  return true;
}

export const scrollPersistDirective = {
  mounted(el, binding) {
    const key = resolveStorageKey(binding.value);
    if (!key) return;
    const storage = resolveStorageBackend(binding.value);

    restoreElementScroll(el, key, storage);

    let timer = null;
    const onScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        saveElementScrollPosition(
          key,
          { top: el.scrollTop, left: el.scrollLeft },
          storage
        );
      }, 90);
    };

    el.__nanoScrollPersistCleanup = () => {
      if (timer) clearTimeout(timer);
      saveElementScrollPosition(
        key,
        { top: el.scrollTop, left: el.scrollLeft },
        storage
      );
      el.removeEventListener('scroll', onScroll);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
  },

  beforeUnmount(el) {
    if (typeof el.__nanoScrollPersistCleanup === 'function') {
      el.__nanoScrollPersistCleanup();
      delete el.__nanoScrollPersistCleanup;
    }
  },
};
