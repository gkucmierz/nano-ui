/**
 * @gkucmierz/key-controller (1st-Party Built-In Engine for @gkucmierz/nano-ui)
 * Ultra-minimal, focus-aware keyboard shortcut front-controller with automatic
 * used-modifier collision resolution (`ignoreUsedKeyModifiers`) — supporting both
 * standard modifiers (`Shift`, `Ctrl`, `Alt`, `Meta`) and held letter/key modifiers
 * (e.g. `C+ArrowLeft`, `U+ArrowRight`).
 *
 * Shares the global singleton via `Symbol.for('@gkucmierz/key-controller.global')`.
 */

export const NON_TEXT_INPUT_TYPES = new Set([
  'checkbox',
  'radio',
  'range',
  'button',
  'submit',
  'reset',
  'image',
  'color',
  'file',
  'hidden',
]);

const ARROW_KEYS = new Set(['arrowleft', 'arrowright', 'arrowup', 'arrowdown']);

export const isEditableTextTarget = (target) => {
  if (!target || typeof target !== 'object') return false;
  if (target.isContentEditable || target.contentEditable === 'true') return true;

  const tag = String(target.tagName || '').toUpperCase();
  if (tag === 'TEXTAREA' || tag === 'SELECT') {
    return !target.readOnly && !target.disabled;
  }
  if (tag === 'INPUT') {
    const type = String(target.type || 'text').toLowerCase();
    if (NON_TEXT_INPUT_TYPES.has(type)) return false;
    return !target.readOnly && !target.disabled;
  }
  return false;
};

export const isNativeControlConflict = (target, normalizedKey) => {
  if (!target || typeof target !== 'object') return false;
  const tag = String(target.tagName || '').toUpperCase();
  const type = tag === 'INPUT' ? String(target.type || '').toLowerCase() : '';
  const role =
    typeof target.getAttribute === 'function' ? String(target.getAttribute('role') || '') : '';

  if (normalizedKey === ' ' || normalizedKey === 'space' || normalizedKey === 'enter') {
    if (tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY') return true;
    if (tag === 'INPUT' && NON_TEXT_INPUT_TYPES.has(type)) return true;
    if (role === 'button' || role === 'switch' || role === 'checkbox') return true;
  }

  if (ARROW_KEYS.has(normalizedKey)) {
    if ((tag === 'INPUT' && (type === 'range' || type === 'radio')) || role === 'slider') {
      return true;
    }
  }

  return false;
};

const normalizeKeyName = (rawKey) => {
  const k = String(rawKey || '').trim().toLowerCase();
  if (k === 'space' || k === 'spacebar') return ' ';
  if (k === 'esc') return 'escape';
  if (k === 'left') return 'arrowleft';
  if (k === 'right') return 'arrowright';
  if (k === 'up') return 'arrowup';
  if (k === 'down') return 'arrowdown';
  return k;
};

const sameHeldKeys = (a, b) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

export const parseKeyCombo = (combo) => {
  const raw = String(combo || '').trim();
  if (raw === '+' || raw === ' ') {
    return { key: raw, shift: false, ctrl: false, alt: false, meta: false, heldKeys: [] };
  }

  const parts = raw
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean);
  const spec = {
    key: '',
    shift: false,
    ctrl: false,
    alt: false,
    meta: false,
    heldKeys: [],
  };

  for (let i = 0; i < parts.length; i++) {
    const token = parts[i].toLowerCase();
    if (i < parts.length - 1) {
      if (token === 'shift') {
        spec.shift = true;
        continue;
      }
      if (token === 'ctrl' || token === 'control') {
        spec.ctrl = true;
        continue;
      }
      if (token === 'alt' || token === 'option') {
        spec.alt = true;
        continue;
      }
      if (token === 'meta' || token === 'cmd' || token === 'command') {
        spec.meta = true;
        continue;
      }
      const modKey = normalizeKeyName(parts[i]);
      if (modKey && !spec.heldKeys.includes(modKey)) {
        spec.heldKeys.push(modKey);
      }
      continue;
    }
    spec.key = normalizeKeyName(parts[i]);
  }

  spec.heldKeys.sort();
  return spec;
};

export const createKeyController = ({
  target = typeof window !== 'undefined' ? window : null,
} = {}) => {
  const bindings = new Set();
  const heldKeyState = new Map();
  let isListening = false;

  const isKeyUsedAsModifier = (key) => {
    for (const b of bindings) {
      if (b.enabled && b.enabled() === false) continue;
      if (b.heldKeys.length > 0 && b.heldKeys.includes(key)) return true;
    }
    return false;
  };

  const hasSpecificModifierBinding = (eventKey, shift, ctrl, alt, meta, activeHeldKeys) => {
    for (const b of bindings) {
      if (b.enabled && b.enabled() === false) continue;
      if (
        b.key === eventKey &&
        b.shift === shift &&
        b.ctrl === ctrl &&
        b.alt === alt &&
        b.meta === meta &&
        sameHeldKeys(b.heldKeys, activeHeldKeys)
      ) {
        return true;
      }
    }
    return false;
  };

  const handleKeyDown = (e) => {
    if (!e || e.defaultPrevented) return;
    const eventKey = normalizeKeyName(e.key);
    if (!eventKey) return;

    const domTarget = (typeof e.composedPath === 'function' && e.composedPath()[0]) || e.target;
    const inEditableText = isEditableTextTarget(domTarget);
    const shift = Boolean(e.shiftKey);
    const ctrl = Boolean(e.ctrlKey);
    const alt = Boolean(e.altKey);
    const meta = Boolean(e.metaKey);

    if (heldKeyState.has(eventKey)) {
      return;
    }

    if (
      !shift &&
      !ctrl &&
      !alt &&
      !meta &&
      heldKeyState.size === 0 &&
      isKeyUsedAsModifier(eventKey)
    ) {
      if (!inEditableText && !isNativeControlConflict(domTarget, eventKey)) {
        heldKeyState.set(eventKey, {
          chordUsed: false,
          domTarget,
          inEditableText,
        });
        return;
      }
    }

    const activeHeldKeys = [...heldKeyState.keys()].filter((k) => k !== eventKey).sort();
    if (activeHeldKeys.length > 0) {
      for (const k of activeHeldKeys) {
        const st = heldKeyState.get(k);
        if (st) st.chordUsed = true;
      }
    }

    const anyModifierHeld = shift || ctrl || alt || meta || activeHeldKeys.length > 0;
    const exactComboClaimed = anyModifierHeld
      ? hasSpecificModifierBinding(eventKey, shift, ctrl, alt, meta, activeHeldKeys)
      : false;

    // Iterate in LIFO order (innermost / most-recently mounted local tool first,
    // bubbling down to outermost / root application bindings last).
    const orderedBindings = [...bindings].reverse();

    for (const b of orderedBindings) {
      if (b.key !== eventKey) continue;
      if (b.enabled && b.enabled() === false) continue;
      if (!b.allowRepeat && e.repeat) continue;

      if (inEditableText && !b.allowInInput && eventKey !== 'escape') continue;
      if (isNativeControlConflict(domTarget, eventKey)) continue;

      if (b.ctrl !== ctrl || b.alt !== alt || b.meta !== meta) continue;

      if (b.shift !== shift) {
        if (b.shift && !shift) continue;
        if (b.strictModifiers) continue;
        if (b.ignoreUsedKeyModifiers && exactComboClaimed) continue;
      }

      if (!sameHeldKeys(b.heldKeys, activeHeldKeys)) {
        if (b.heldKeys.length > 0) continue;
        if (b.strictModifiers) continue;
        if (b.ignoreUsedKeyModifiers && exactComboClaimed) continue;
      }

      if (b.preventDefault !== false && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      const result = b.handler(e);
      if (result !== false && !b.bubble && b.stopPropagation !== false) {
        break;
      }
    }
  };

  const handleKeyUp = (e) => {
    if (!e) return;
    const eventKey = normalizeKeyName(e.key);
    if (!eventKey) return;

    const st = heldKeyState.get(eventKey);
    if (!st) return;
    heldKeyState.delete(eventKey);

    if (!st.chordUsed) {
      const orderedBindings = [...bindings].reverse();
      for (const b of orderedBindings) {
        if (b.key !== eventKey) continue;
        if (b.heldKeys.length > 0 || b.shift || b.ctrl || b.alt || b.meta) continue;
        if (b.enabled && b.enabled() === false) continue;
        if (st.inEditableText && !b.allowInInput && eventKey !== 'escape') continue;
        if (isNativeControlConflict(st.domTarget, eventKey)) continue;
        const result = b.handler(e);
        if (result !== false && !b.bubble && b.stopPropagation !== false) {
          break;
        }
      }
    }
  };

  const handleBlur = () => {
    heldKeyState.clear();
  };

  const attach = () => {
    if (isListening || !target || typeof target.addEventListener !== 'function') return;
    target.addEventListener('keydown', handleKeyDown);
    target.addEventListener('keyup', handleKeyUp);
    target.addEventListener('blur', handleBlur);
    isListening = true;
  };

  const detach = () => {
    if (!isListening || !target || typeof target.removeEventListener !== 'function') return;
    target.removeEventListener('keydown', handleKeyDown);
    target.removeEventListener('keyup', handleKeyUp);
    target.removeEventListener('blur', handleBlur);
    heldKeyState.clear();
    isListening = false;
  };

  const on = (combos, handler, options = {}) => {
    const list = Array.isArray(combos) ? combos : [combos];
    const added = [];

    for (const rawCombo of list) {
      const parsed = parseKeyCombo(rawCombo);
      const entry = {
        ...parsed,
        handler,
        ignoreUsedKeyModifiers: options.ignoreUsedKeyModifiers !== false,
        strictModifiers: Boolean(options.strictModifiers),
        allowInInput: Boolean(options.allowInInput || options.allowInEditable),
        allowRepeat: Boolean(options.allowRepeat),
        preventDefault: options.preventDefault !== false,
        bubble: Boolean(options.bubble),
        stopPropagation: options.stopPropagation !== false,
        enabled: typeof options.enabled === 'function' ? options.enabled : null,
      };
      bindings.add(entry);
      added.push(entry);
    }

    if (bindings.size > 0) attach();

    return () => {
      for (const entry of added) {
        bindings.delete(entry);
      }
      if (bindings.size === 0) detach();
    };
  };

  const bindAll = (map, sharedOptions = {}) => {
    const disposers = [];
    for (const [combo, val] of Object.entries(map || {})) {
      if (typeof val === 'function') {
        disposers.push(on(combo, val, sharedOptions));
      } else if (val && typeof val.handler === 'function') {
        disposers.push(on(combo, val.handler, { ...sharedOptions, ...val }));
      }
    }
    return () => {
      for (const off of disposers) off();
    };
  };

  const clear = () => {
    bindings.clear();
    heldKeyState.clear();
    detach();
  };

  return {
    on,
    bindAll,
    clear,
    handleKeyDown,
    handleKeyUp,
    handleBlur,
    get size() {
      return bindings.size;
    },
  };
};

const GLOBAL_KEY_CONTROLLER_SYMBOL = Symbol.for('@gkucmierz/key-controller.global');

export const getGlobalKeyController = () => {
  if (!globalThis[GLOBAL_KEY_CONTROLLER_SYMBOL]) {
    globalThis[GLOBAL_KEY_CONTROLLER_SYMBOL] = createKeyController();
  }
  return globalThis[GLOBAL_KEY_CONTROLLER_SYMBOL];
};

/**
 * Pure modulo-wrapped index stepper: ((currentIndex + delta) % length + length) % length
 */
export const stepWrappedIndex = (currentIndex, delta, length) => {
  const n = Number(length) || 0;
  if (n <= 0) return 0;
  const cur = Math.max(0, Number(currentIndex) || 0);
  const step = Number(delta) || 0;
  return (((cur + step) % n) + n) % n;
};

export default createKeyController;
