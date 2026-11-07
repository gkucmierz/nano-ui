/**
 * @gkucmierz/storage-controller (Nano UI bridge & Symbol.for global singleton)
 * Supports 'ls' (localStorage), 'ss' (sessionStorage), 'none' (no persistence),
 * and 'memory' fallback, with compact acronym hierarchical keys by default:
 *   `dashboard-app` + `nano-ui` + `demo_geometry` -> `DA_NU_demo_geometry`
 */

const GLOBAL_REGISTRY_SYMBOL = Symbol.for('@gkucmierz/storage-controller.global');

export const STORAGE_MODES = Object.freeze({
  LS: 'ls',
  SS: 'ss',
  NONE: 'none',
  MEMORY: 'memory',
});

const isObjectLike = (val) => Boolean(val) && Object.prototype.toString.call(val) === '[object Object]';
const isFunction = (val) => Object.prototype.toString.call(val) === '[object Function]';
const isString = (val) => Object.prototype.toString.call(val) === '[object String]';
const isBoolean = (val) => Object.prototype.toString.call(val) === '[object Boolean]';

export const normalizeStorageMode = (mode, fallback = STORAGE_MODES.LS) => {
  if (mode === false || mode === null) return STORAGE_MODES.NONE;
  if (mode === true) return STORAGE_MODES.LS;
  if (!isString(mode)) return fallback;

  const clean = mode.trim().toLowerCase();
  if (!clean) return fallback;

  if (
    clean === 'ls' ||
    clean === 'local' ||
    clean === 'localstorage' ||
    clean === 'local-storage' ||
    clean === 'persistent'
  ) {
    return STORAGE_MODES.LS;
  }

  if (
    clean === 'ss' ||
    clean === 'session' ||
    clean === 'sessionstorage' ||
    clean === 'session-storage' ||
    clean === 'ephemeral'
  ) {
    return STORAGE_MODES.SS;
  }

  if (
    clean === 'none' ||
    clean === 'off' ||
    clean === 'disabled' ||
    clean === 'no-storage' ||
    clean === 'nostorage' ||
    clean === 'false'
  ) {
    return STORAGE_MODES.NONE;
  }

  if (clean === 'memory' || clean === 'mem') {
    return STORAGE_MODES.MEMORY;
  }

  return fallback;
};

export const sanitizePrefixSegment = (rawSegment) => {
  if (!isString(rawSegment)) return '';
  let str = rawSegment.trim();
  if (!str) return '';

  if (str.startsWith('@') && str.includes('/')) {
    str = str.split('/').slice(1).join('-');
  }

  return str
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
};

export const toAcronym = (rawSegment) => {
  if (!isString(rawSegment)) return '';
  const trimmed = rawSegment.trim();
  if (!trimmed) return '';

  if (/^[A-Z0-9]{1,5}$/.test(trimmed)) {
    return trimmed;
  }

  const clean = sanitizePrefixSegment(trimmed);
  if (!clean) return '';

  const parts = clean.split(/[-_]+/).filter(Boolean);
  if (parts.length >= 2) {
    return parts.map((p) => p[0].toUpperCase()).join('');
  }

  return clean[0].toUpperCase();
};

export const DEFAULT_ACRONYM_DICTIONARY = Object.freeze({
  DA: 'dashboard-app',
  WA: 'workflow-app',
  HCA: 'home-control-app',
  CA: 'cv-app',
  TA: 'talk-app',
  MA: 'money-app',
  SA: 'screeny-app',
  NU: 'nano-ui',
  NS: 'nano-sound',
  KC: 'key-controller',
  SC: 'storage-controller',
  KBE: 'knowledge-base-engine',
  DL: 'db-lens',
  SL: 'storage-lens',
  EH: 'ext-hub',
  RS: 'reel-shredder',
  CF: 'clown-filter',
});

export const expandAcronymKey = (rawKey, customDictionary = {}, options = {}) => {
  const strKey = isString(rawKey) ? rawKey.trim() : '';
  const sep = isString(options.separator) && options.separator ? options.separator : '_';
  const includeDefaults = options.includeDefaults !== false;

  const dict = {};
  if (includeDefaults) {
    for (const [k, v] of Object.entries(DEFAULT_ACRONYM_DICTIONARY)) {
      dict[k.toUpperCase()] = v;
    }
  }
  if (isObjectLike(customDictionary)) {
    for (const [k, v] of Object.entries(customDictionary)) {
      if (isString(k) && k.trim() && isString(v) && v.trim()) {
        dict[k.trim().toUpperCase()] = v.trim();
      }
    }
  }

  if (!strKey) {
    return {
      rawKey: '',
      expandedKey: '',
      breadcrumb: '',
      prefixes: [],
      leafKey: '',
      hasAcronyms: false,
    };
  }

  const tokens = strKey.split(sep);
  if (tokens.length <= 1) {
    return {
      rawKey: strKey,
      expandedKey: strKey,
      breadcrumb: strKey,
      prefixes: [],
      leafKey: strKey,
      hasAcronyms: false,
    };
  }

  const prefixes = [];
  let idx = 0;
  while (idx < tokens.length - 1) {
    const token = tokens[idx];
    const upper = token.toUpperCase();
    const isKnownInDict = Object.prototype.hasOwnProperty.call(dict, upper) && token === upper;
    const isUppercaseAcronymShape = /^[A-Z][A-Z0-9]{0,4}$/.test(token);

    if (isKnownInDict || isUppercaseAcronymShape) {
      const expanded = isKnownInDict ? dict[upper] : token;
      prefixes.push({
        acronym: token,
        expanded,
        known: isKnownInDict,
      });
      idx++;
    } else {
      break;
    }
  }

  const leafKey = tokens.slice(idx).join(sep);
  const expandedSegments = [...prefixes.map((p) => p.expanded), leafKey].filter(Boolean);

  return {
    rawKey: strKey,
    expandedKey: expandedSegments.join(sep),
    breadcrumb: expandedSegments.join(' / '),
    prefixes,
    leafKey,
    hasAcronyms: prefixes.length > 0,
  };
};

export const detectHostAppPrefix = (env = globalThis) => {
  if (!env) return 'app';

  const explicitGlobal = env.__STORAGE_APP_PREFIX__ || env.__NANO_UI_APP_PREFIX__;
  if (isString(explicitGlobal) && explicitGlobal.trim()) {
    const cleaned = sanitizePrefixSegment(explicitGlobal);
    if (cleaned) return cleaned;
  }

  const doc = env.document;
  if (doc) {
    const rootAttr =
      doc.documentElement && isFunction(doc.documentElement.getAttribute)
        ? doc.documentElement.getAttribute('data-app-prefix') ||
          doc.documentElement.getAttribute('data-app-name')
        : '';
    if (rootAttr) {
      const cleaned = sanitizePrefixSegment(rootAttr);
      if (cleaned) return cleaned;
    }

    if (isFunction(doc.querySelector)) {
      const metaEl = doc.querySelector('meta[name="application-name"], meta[name="app-prefix"]');
      const metaContent = metaEl && isFunction(metaEl.getAttribute) ? metaEl.getAttribute('content') : '';
      if (metaContent) {
        const cleaned = sanitizePrefixSegment(metaContent);
        if (cleaned) return cleaned;
      }
    }

    if (isString(doc.title) && doc.title.trim()) {
      const primaryTitle = doc.title.split(/[—–|·:]/)[0].trim();
      const cleaned = sanitizePrefixSegment(primaryTitle);
      if (cleaned) return cleaned;
    }
  }

  const loc = env.location;
  if (loc && isString(loc.hostname) && loc.hostname) {
    const host = loc.hostname.toLowerCase();
    if (host !== 'localhost' && host !== '127.0.0.1' && host !== '0.0.0.0') {
      const subdomain = host.split('.')[0];
      const cleaned = sanitizePrefixSegment(subdomain);
      if (cleaned) return cleaned;
    }
    if (loc.port) {
      return `app-${loc.port}`;
    }
  }

  return 'app';
};

export const buildHierarchicalKey = ({
  appPrefix = '',
  scopePrefix = '',
  key = '',
  separator = '_',
  dedupeIdenticalSegments = true,
  compactPrefixes = true,
} = {}) => {
  const rawKey = String(key || '').trim();
  if (!rawKey) return '';

  const sep = isString(separator) && separator ? separator : '_';
  const cleanApp = sanitizePrefixSegment(appPrefix);
  const cleanScope = sanitizePrefixSegment(scopePrefix);

  const rawSegments = [];
  if (cleanApp) rawSegments.push(cleanApp);
  if (cleanScope) {
    for (const sub of cleanScope.split('_').filter(Boolean)) {
      if (!dedupeIdenticalSegments || sub !== rawSegments[rawSegments.length - 1]) {
        rawSegments.push(sub);
      }
    }
  }

  if (rawSegments.length === 0) return rawKey;

  const formattedSegments = compactPrefixes
    ? rawSegments.map((seg) => toAcronym(seg)).filter(Boolean)
    : rawSegments;

  const fullPrefix = `${formattedSegments.join(sep)}${sep}`;
  if (rawKey.startsWith(fullPrefix)) {
    return rawKey;
  }

  return `${fullPrefix}${rawKey}`;
};

export const createMemoryStorageAdapter = (initialEntries = {}) => {
  const map = new Map(Object.entries(initialEntries || {}));
  return {
    get length() {
      return map.size;
    },
    key(index) {
      const keys = [...map.keys()];
      return keys[index] ?? null;
    },
    getItem(k) {
      const strKey = String(k);
      return map.has(strKey) ? map.get(strKey) : null;
    },
    setItem(k, v) {
      map.set(String(k), String(v));
    },
    removeItem(k) {
      map.delete(String(k));
    },
    clear() {
      map.clear();
    },
    _map: map,
  };
};

const resolveWebStorageBackend = (mode, customAdapters = {}, env = globalThis) => {
  if (mode === STORAGE_MODES.NONE) {
    return { adapter: null, backendName: 'none', isFallbackMemory: false };
  }

  if (mode === STORAGE_MODES.MEMORY) {
    return {
      adapter: customAdapters.memory || createMemoryStorageAdapter(),
      backendName: 'memory',
      isFallbackMemory: false,
    };
  }

  const targetProp = mode === STORAGE_MODES.SS ? 'sessionStorage' : 'localStorage';
  const explicitAdapter =
    mode === STORAGE_MODES.SS ? customAdapters.sessionStorage : customAdapters.localStorage;

  if (explicitAdapter && isFunction(explicitAdapter.getItem)) {
    return { adapter: explicitAdapter, backendName: targetProp, isFallbackMemory: false };
  }

  try {
    const nativeStorage = env && env[targetProp];
    if (nativeStorage && isFunction(nativeStorage.getItem) && isFunction(nativeStorage.setItem)) {
      return { adapter: nativeStorage, backendName: targetProp, isFallbackMemory: false };
    }
  } catch {
    // Private browsing / sandboxed iframe fallback
  }

  return {
    adapter: customAdapters.memory || createMemoryStorageAdapter(),
    backendName: 'memory',
    isFallbackMemory: true,
  };
};

export const createStorageController = (options = {}) => {
  const env = options.env || globalThis;
  const separator = isString(options.separator) && options.separator ? options.separator : '_';
  const dedupeIdenticalSegments = isBoolean(options.dedupeIdenticalSegments)
    ? options.dedupeIdenticalSegments
    : true;
  let compactPrefixes = isBoolean(options.compactPrefixes) ? options.compactPrefixes : true;
  const fallbackRawKey = options.fallbackRawKey !== false;

  let explicitAppPrefix = isString(options.appPrefix) ? sanitizePrefixSegment(options.appPrefix) : '';
  const currentScopePrefix = isString(options.scopePrefix) ? sanitizePrefixSegment(options.scopePrefix) : '';
  let defaultMode = normalizeStorageMode(options.defaultMode ?? options.mode, STORAGE_MODES.LS);

  const memoryFallbackStore = options.memoryStorage || createMemoryStorageAdapter();
  const customAdapters = {
    localStorage: options.localStorage || null,
    sessionStorage: options.sessionStorage || null,
    memory: memoryFallbackStore,
  };

  const listeners = new Set();
  const parentController = options._parent || null;

  const notify = (event) => {
    for (const fn of listeners) {
      try {
        fn(event);
      } catch {
        // Ignore subscriber error
      }
    }
    if (parentController && isFunction(parentController._notifyFromChild)) {
      parentController._notifyFromChild(event);
    }
  };

  const getAppPrefix = () => {
    if (explicitAppPrefix) return explicitAppPrefix;
    if (parentController && isFunction(parentController.getAppPrefix)) {
      return parentController.getAppPrefix();
    }
    return detectHostAppPrefix(env);
  };

  const setAppPrefix = (nextPrefix) => {
    explicitAppPrefix = sanitizePrefixSegment(nextPrefix);
    notify({ type: 'appPrefix', appPrefix: getAppPrefix(), scopePrefix: currentScopePrefix });
    return getAppPrefix();
  };

  const getScopePrefix = () => currentScopePrefix;

  const getCompactPrefixes = () => {
    if (parentController && isFunction(parentController.getCompactPrefixes) && options.compactPrefixes === undefined) {
      return parentController.getCompactPrefixes();
    }
    return compactPrefixes;
  };

  const setCompactPrefixes = (flag) => {
    compactPrefixes = Boolean(flag);
    notify({ type: 'compactPrefixes', compactPrefixes });
    return compactPrefixes;
  };

  const setDefaultMode = (nextMode) => {
    defaultMode = normalizeStorageMode(nextMode, STORAGE_MODES.LS);
    notify({ type: 'mode', mode: defaultMode, appPrefix: getAppPrefix(), scopePrefix: currentScopePrefix });
    return defaultMode;
  };

  const getDefaultMode = () => defaultMode;

  const resolveKey = (key, callOptions = {}) => {
    const rawKey = String(key || '').trim();
    if (!rawKey) return '';
    if (callOptions && callOptions.exactKey === true) return rawKey;

    const appPref =
      callOptions && isString(callOptions.appPrefix) && callOptions.appPrefix.trim()
        ? sanitizePrefixSegment(callOptions.appPrefix)
        : getAppPrefix();

    const scopePref =
      callOptions && isString(callOptions.scopePrefix)
        ? sanitizePrefixSegment(callOptions.scopePrefix)
        : currentScopePrefix;

    const useCompact =
      callOptions && isBoolean(callOptions.compactPrefixes)
        ? callOptions.compactPrefixes
        : getCompactPrefixes();

    return buildHierarchicalKey({
      appPrefix: appPref,
      scopePrefix: scopePref,
      key: rawKey,
      separator,
      dedupeIdenticalSegments:
        callOptions && isBoolean(callOptions.dedupeIdenticalSegments)
          ? callOptions.dedupeIdenticalSegments
          : dedupeIdenticalSegments,
      compactPrefixes: useCompact,
    });
  };

  const resolvePrefixHeader = (callOptions = {}) => {
    const sample = resolveKey('__probe__', callOptions);
    return sample.endsWith('__probe__') ? sample.slice(0, -'__probe__'.length) : '';
  };

  const get = (key, defaultValue = null, callOptions = {}) => {
    const opts = isString(callOptions) ? { mode: callOptions } : callOptions || {};
    const mode = normalizeStorageMode(opts.mode ?? defaultMode, defaultMode);
    if (mode === STORAGE_MODES.NONE) return defaultValue;

    const resolvedKey = resolveKey(key, opts);
    if (!resolvedKey) return defaultValue;

    const { adapter } = resolveWebStorageBackend(mode, customAdapters, env);
    if (!adapter) return defaultValue;

    try {
      let rawVal = adapter.getItem(resolvedKey);
      const allowFallback = opts.fallbackRawKey !== undefined ? Boolean(opts.fallbackRawKey) : fallbackRawKey;
      if (rawVal === null && allowFallback) {
        const altKey = resolveKey(key, { ...opts, compactPrefixes: !(opts.compactPrefixes ?? getCompactPrefixes()) });
        if (altKey && altKey !== resolvedKey) {
          rawVal = adapter.getItem(altKey);
        }
        if (rawVal === null && key && String(key).trim() !== resolvedKey) {
          rawVal = adapter.getItem(String(key).trim());
        }
      }

      if (rawVal === null || rawVal === undefined) return defaultValue;
      if (opts.raw === true) return rawVal;

      return JSON.parse(rawVal);
    } catch {
      return defaultValue;
    }
  };

  const set = (key, value, callOptions = {}) => {
    const opts = isString(callOptions) ? { mode: callOptions } : callOptions || {};
    const mode = normalizeStorageMode(opts.mode ?? defaultMode, defaultMode);
    const resolvedKey = resolveKey(key, opts);

    if (mode === STORAGE_MODES.NONE || !resolvedKey) {
      return {
        stored: false,
        mode: STORAGE_MODES.NONE,
        backend: 'none',
        resolvedKey,
        serialized: null,
      };
    }

    const { adapter, backendName } = resolveWebStorageBackend(mode, customAdapters, env);
    if (!adapter) {
      return {
        stored: false,
        mode,
        backend: 'none',
        resolvedKey,
        serialized: null,
      };
    }

    try {
      const serialized = opts.raw === true ? String(value) : JSON.stringify(value);
      adapter.setItem(resolvedKey, serialized);
      const event = {
        type: 'set',
        mode,
        backend: backendName,
        key: String(key),
        resolvedKey,
        value,
        serialized,
      };
      notify(event);
      return {
        stored: true,
        mode,
        backend: backendName,
        resolvedKey,
        serialized,
      };
    } catch {
      return {
        stored: false,
        mode,
        backend: backendName,
        resolvedKey,
        serialized: null,
      };
    }
  };

  const remove = (key, callOptions = {}) => {
    const opts = isString(callOptions) ? { mode: callOptions } : callOptions || {};
    const mode = normalizeStorageMode(opts.mode ?? defaultMode, defaultMode);
    const resolvedKey = resolveKey(key, opts);
    if (!resolvedKey || mode === STORAGE_MODES.NONE) {
      return { removed: false, mode, resolvedKey };
    }

    const { adapter, backendName } = resolveWebStorageBackend(mode, customAdapters, env);
    if (!adapter) return { removed: false, mode, resolvedKey };

    try {
      adapter.removeItem(resolvedKey);
      const altKey = resolveKey(key, { ...opts, compactPrefixes: !(opts.compactPrefixes ?? getCompactPrefixes()) });
      if (altKey && altKey !== resolvedKey) {
        adapter.removeItem(altKey);
      }
      if (opts.removeLegacyRawKey !== false && key && String(key).trim() !== resolvedKey) {
        adapter.removeItem(String(key).trim());
      }
      notify({
        type: 'remove',
        mode,
        backend: backendName,
        key: String(key),
        resolvedKey,
      });
      return { removed: true, mode, backend: backendName, resolvedKey };
    } catch {
      return { removed: false, mode, backend: backendName, resolvedKey };
    }
  };

  const inspect = (key, callOptions = {}) => {
    const opts = isString(callOptions) ? { mode: callOptions } : callOptions || {};
    const mode = normalizeStorageMode(opts.mode ?? defaultMode, defaultMode);
    const appPref =
      opts && isString(opts.appPrefix) && opts.appPrefix.trim()
        ? sanitizePrefixSegment(opts.appPrefix)
        : getAppPrefix();
    const scopePref =
      opts && isString(opts.scopePrefix)
        ? sanitizePrefixSegment(opts.scopePrefix)
        : currentScopePrefix;
    const useCompact =
      opts && isBoolean(opts.compactPrefixes)
        ? opts.compactPrefixes
        : getCompactPrefixes();

    const displayAppSeg = useCompact ? toAcronym(appPref) : appPref;
    const displayScopeSeg = useCompact ? toAcronym(scopePref) : scopePref;
    const resolvedKey = resolveKey(key, opts);
    const verboseKey = resolveKey(key, { ...opts, compactPrefixes: false });

    if (mode === STORAGE_MODES.NONE) {
      return {
        mode: STORAGE_MODES.NONE,
        backend: 'none',
        appPrefix: appPref,
        scopePrefix: scopePref,
        displayAppSeg,
        displayScopeSeg,
        appSegment: displayAppSeg,
        libSegment: displayScopeSeg,
        keySegment: String(key || ''),
        compactPrefixes: useCompact,
        rawKey: String(key || ''),
        resolvedKey,
        verboseKey,
        exists: false,
        rawValue: null,
        parsedValue: null,
        byteLength: 0,
      };
    }

    const { adapter, backendName } = resolveWebStorageBackend(mode, customAdapters, env);
    let rawValue = null;
    let parsedValue = null;
    if (adapter && resolvedKey) {
      try {
        rawValue = adapter.getItem(resolvedKey);
        if (rawValue !== null) {
          try {
            parsedValue = JSON.parse(rawValue);
          } catch {
            parsedValue = rawValue;
          }
        }
      } catch {
        rawValue = null;
      }
    }

    return {
      mode,
      backend: backendName,
      appPrefix: appPref,
      scopePrefix: scopePref,
      displayAppSeg,
      displayScopeSeg,
      appSegment: displayAppSeg,
      libSegment: displayScopeSeg,
      keySegment: String(key || ''),
      compactPrefixes: useCompact,
      rawKey: String(key || ''),
      resolvedKey,
      verboseKey,
      exists: rawValue !== null,
      rawValue,
      parsedValue,
      byteLength: isString(rawValue) ? rawValue.length : 0,
    };
  };

  const listKeys = (callOptions = {}) => {
    const opts = isString(callOptions) ? { mode: callOptions } : callOptions || {};
    const mode = normalizeStorageMode(opts.mode ?? defaultMode, defaultMode);
    if (mode === STORAGE_MODES.NONE) return [];

    const { adapter } = resolveWebStorageBackend(mode, customAdapters, env);
    if (!adapter) return [];

    const prefixHeader = resolvePrefixHeader(opts);
    const matched = [];
    try {
      const len = Number(adapter.length) || 0;
      for (let i = 0; i < len; i++) {
        const k = adapter.key(i);
        if (isString(k) && (!prefixHeader || k.startsWith(prefixHeader))) {
          matched.push(k);
        }
      }
    } catch {
      // Ignore enumeration error
    }
    return matched.sort();
  };

  const clearScope = (callOptions = {}) => {
    const opts = isString(callOptions) ? { mode: callOptions } : callOptions || {};
    const mode = normalizeStorageMode(opts.mode ?? defaultMode, defaultMode);
    if (mode === STORAGE_MODES.NONE) return 0;

    const { adapter, backendName } = resolveWebStorageBackend(mode, customAdapters, env);
    if (!adapter) return 0;

    const keys = listKeys(opts);
    for (const k of keys) {
      try {
        adapter.removeItem(k);
      } catch {
        // Ignore removal error
      }
    }
    notify({
      type: 'clearScope',
      mode,
      backend: backendName,
      removedCount: keys.length,
      keys,
    });
    return keys.length;
  };

  const subscribe = (listener) => {
    if (!isFunction(listener)) return () => {};
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const scope = (childScopePrefix, childOptions = {}) => {
    const cleanChild = sanitizePrefixSegment(childScopePrefix);
    const mergedScope =
      currentScopePrefix && cleanChild && currentScopePrefix !== cleanChild
        ? `${currentScopePrefix}${separator}${cleanChild}`
        : cleanChild || currentScopePrefix;

    return createStorageController({
      env,
      separator,
      dedupeIdenticalSegments,
      compactPrefixes,
      fallbackRawKey,
      defaultMode,
      localStorage: customAdapters.localStorage,
      sessionStorage: customAdapters.sessionStorage,
      memoryStorage: memoryFallbackStore,
      ...childOptions,
      appPrefix: isString(childOptions.appPrefix) ? childOptions.appPrefix : '',
      scopePrefix: mergedScope,
      _parent: controller,
    });
  };

  const controller = {
    getAppPrefix,
    setAppPrefix,
    getScopePrefix,
    getCompactPrefixes,
    setCompactPrefixes,
    getDefaultMode,
    setDefaultMode,
    resolveKey,
    resolvePrefixHeader,
    get,
    set,
    remove,
    inspect,
    listKeys,
    clearScope,
    subscribe,
    scope,
    _notifyFromChild: (event) => {
      for (const fn of listeners) {
        try {
          fn(event);
        } catch {
          // Ignore
        }
      }
    },
  };

  return controller;
};

export const getGlobalStorageController = (options = {}) => {
  const host = globalThis;
  if (!host[GLOBAL_REGISTRY_SYMBOL]) {
    host[GLOBAL_REGISTRY_SYMBOL] = createStorageController(options);
  } else if (isObjectLike(options)) {
    if (isString(options.appPrefix) && options.appPrefix.trim()) {
      host[GLOBAL_REGISTRY_SYMBOL].setAppPrefix(options.appPrefix);
    }
    if (isBoolean(options.compactPrefixes)) {
      host[GLOBAL_REGISTRY_SYMBOL].setCompactPrefixes(options.compactPrefixes);
    }
    if (options.defaultMode !== undefined || options.mode !== undefined) {
      host[GLOBAL_REGISTRY_SYMBOL].setDefaultMode(options.defaultMode ?? options.mode);
    }
  }
  return host[GLOBAL_REGISTRY_SYMBOL];
};

export const configureGlobalStorage = (options = {}) => getGlobalStorageController(options);

export const getScopedStorageController = (scopePrefix = 'nano-ui', options = {}) => {
  const root = getGlobalStorageController(options);
  return root.scope(scopePrefix, options);
};

export default createStorageController;
