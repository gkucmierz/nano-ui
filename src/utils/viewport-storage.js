import {
  getScopedStorageController,
  normalizeStorageMode,
  STORAGE_MODES,
} from './storage-controller.js';
import { clampLatitude, normalizeLongitude } from './map-engine.js';
import { clamp } from './math.js';
import { is, isCallable } from './type.js';

export const MAP_VIEWPORT_DEBOUNCE_MS = 150;

const viewportStorageCtrl = getScopedStorageController('nano-ui');

export const resolveViewportStorageConfig = ({ storage = 'ls', storageKey = '', appPrefix = '' } = {}) => {
  const cleanKey = is(storageKey, 'string') ? storageKey.trim() : '';
  if (!cleanKey) {
    return {
      enabled: false,
      mode: STORAGE_MODES.NONE,
      storageKey: '',
      resolvedKey: '',
      appPrefix: is(appPrefix, 'string') && appPrefix.trim() ? appPrefix.trim() : undefined,
    };
  }
  const mode = normalizeStorageMode(storage, STORAGE_MODES.LS);
  const resolvedAppPrefix = is(appPrefix, 'string') && appPrefix.trim() ? appPrefix.trim() : undefined;
  return {
    enabled: mode !== STORAGE_MODES.NONE,
    mode,
    storageKey: cleanKey,
    resolvedKey: viewportStorageCtrl.resolveKey(cleanKey, { appPrefix: resolvedAppPrefix }),
    appPrefix: resolvedAppPrefix,
  };
};

export const sanitizeMapViewportPayload = (raw, { minZoom = 2, maxZoom = 19, validLayerIds = null } = {}) => {
  if (!is(raw, 'object')) return null;

  let center = null;
  if (Array.isArray(raw.center) && raw.center.length >= 2) {
    const lat = Number(raw.center[0]);
    const lon = Number(raw.center[1]);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      center = [
        Number(clampLatitude(lat).toFixed(6)),
        Number(normalizeLongitude(lon).toFixed(6)),
      ];
    }
  }
  if (!center) return null;

  const rawZoom = Number(raw.zoom);
  const zoom = Number.isFinite(rawZoom)
    ? Number(clamp(rawZoom, minZoom, maxZoom).toFixed(2))
    : 13;

  const rawBearing = Number(raw.bearing);
  const normBearing = Number.isFinite(rawBearing)
    ? ((((rawBearing % 360) + 540) % 360) - 180)
    : 0;
  const bearing = Math.abs(normBearing) < 0.2 ? 0 : Number(normBearing.toFixed(1));

  let layerId = is(raw.layerId, 'string') && raw.layerId.trim() ? raw.layerId.trim() : null;
  if (layerId && Array.isArray(validLayerIds) && validLayerIds.length > 0 && !validLayerIds.includes(layerId)) {
    layerId = null;
  }

  return {
    center,
    zoom,
    bearing,
    layerId,
  };
};

export const sanitizeGlobeViewportPayload = (raw, { minZoom = 0.5, maxZoom = 3 } = {}) => {
  if (!is(raw, 'object')) return null;
  const lon = Number(raw.rotLon);
  const lat = Number(raw.rotLat);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;

  let normLon = ((lon % 360) + 540) % 360 - 180;
  if (normLon === -180 && lon > 0) normLon = 180;
  const normLat = clamp(lat, -85, 85);
  const rawZoom = Number(raw.zoom);
  const zoom = Number.isFinite(rawZoom)
    ? Number(clamp(rawZoom, minZoom, maxZoom).toFixed(3))
    : 1;

  return {
    rotLon: Number(normLon.toFixed(3)),
    rotLat: Number(normLat.toFixed(3)),
    zoom,
  };
};

/**
 * Creates a deterministic debounced viewport persistence controller for `NanoMap` (`150ms` default)
 * or immediate `drag-end` persistence controller for `NanoGlobe`.
 */
export const createViewportStorageManager = ({
  getConfig,
  debounceMs = MAP_VIEWPORT_DEBOUNCE_MS,
  storageController = viewportStorageCtrl,
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (id) => clearTimeout(id),
} = {}) => {
  let timerId = null;
  let pendingSnapshot = null;

  const cancelPending = () => {
    if (timerId !== null) {
      clearTimer(timerId);
      timerId = null;
    }
    pendingSnapshot = null;
  };

  const writeNow = (snapshot) => {
    cancelPending();
    const cfg = isCallable(getConfig) ? getConfig() : resolveViewportStorageConfig(getConfig);
    if (!cfg || !cfg.enabled || !is(snapshot, 'object')) return false;
    return storageController.set(cfg.storageKey, snapshot, {
      mode: cfg.mode,
      appPrefix: cfg.appPrefix,
    });
  };

  const scheduleSave = (snapshot) => {
    const cfg = isCallable(getConfig) ? getConfig() : resolveViewportStorageConfig(getConfig);
    if (!cfg || !cfg.enabled || !is(snapshot, 'object')) return false;
    pendingSnapshot = snapshot;
    if (debounceMs <= 0) {
      return writeNow(snapshot);
    }
    if (timerId !== null) {
      clearTimer(timerId);
    }
    timerId = setTimer(() => {
      timerId = null;
      const toWrite = pendingSnapshot;
      pendingSnapshot = null;
      if (toWrite) {
        writeNow(toWrite);
      }
    }, debounceMs);
    if (timerId && isCallable(timerId.unref)) {
      timerId.unref();
    }
    return true;
  };

  const flushPending = () => {
    if (!pendingSnapshot) return false;
    const snap = pendingSnapshot;
    return writeNow(snap);
  };

  const readSaved = () => {
    const cfg = isCallable(getConfig) ? getConfig() : resolveViewportStorageConfig(getConfig);
    if (!cfg || !cfg.enabled) return null;
    return storageController.get(cfg.storageKey, null, {
      mode: cfg.mode,
      appPrefix: cfg.appPrefix,
    });
  };

  const clearSaved = () => {
    cancelPending();
    const cfg = isCallable(getConfig) ? getConfig() : resolveViewportStorageConfig(getConfig);
    if (!cfg || !cfg.storageKey) return false;
    return storageController.remove(cfg.storageKey, {
      mode: cfg.mode,
      appPrefix: cfg.appPrefix,
    });
  };

  return {
    writeNow,
    scheduleSave,
    flushPending,
    cancelPending,
    readSaved,
    clearSaved,
  };
};
