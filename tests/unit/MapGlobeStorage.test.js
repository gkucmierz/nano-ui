import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createStorageController,
  createMemoryStorageAdapter,
} from '../../src/utils/storage-controller.js';
import {
  MAP_VIEWPORT_DEBOUNCE_MS,
  resolveViewportStorageConfig,
  sanitizeMapViewportPayload,
  sanitizeGlobeViewportPayload,
  createViewportStorageManager,
} from '../../src/utils/viewport-storage.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mapSfc = readFileSync(resolve(__dirname, '../../src/components/NanoMap.vue'), 'utf8');
const globeSfc = readFileSync(resolve(__dirname, '../../src/components/NanoGlobe.vue'), 'utf8');

describe('Recipe 05 — NanoMap & NanoGlobe Viewport Storage Persistence', () => {
  let lsAdapter;
  let ssAdapter;
  let storageCtrl;

  beforeEach(() => {
    lsAdapter = createMemoryStorageAdapter();
    ssAdapter = createMemoryStorageAdapter();
    storageCtrl = createStorageController({
      defaultScope: 'nano-ui',
      localStorage: lsAdapter,
      sessionStorage: ssAdapter,
    });
  });

  it('resolves ls, ss, and none storage modes with hierarchical appPrefix keys', () => {
    assert.equal(MAP_VIEWPORT_DEBOUNCE_MS, 150);

    const lsCfg = resolveViewportStorageConfig({
      storage: 'ls',
      appPrefix: 'trip-hub',
      storageKey: 'main_map',
    });
    assert.equal(lsCfg.enabled, true);
    assert.equal(lsCfg.mode, 'ls');
    assert.ok(lsCfg.resolvedKey.endsWith('main_map'));

    const noneCfg = resolveViewportStorageConfig({
      storage: 'none',
      appPrefix: 'trip-hub',
      storageKey: 'main_map',
    });
    assert.equal(noneCfg.enabled, false);
    assert.equal(noneCfg.mode, 'none');
  });

  it('debounces NanoMap viewport writes by 150ms and persists { center, zoom, bearing, layerId }', () => {
    const scheduled = [];
    const manager = createViewportStorageManager({
      getConfig: () =>
        resolveViewportStorageConfig({
          storage: 'ls',
          appPrefix: 'dashboard-app',
          storageKey: 'fleet_map',
        }),
      debounceMs: 150,
      storageController: storageCtrl,
      setTimer: (fn, ms) => {
        const entry = { fn, ms, cleared: false };
        scheduled.push(entry);
        return entry;
      },
      clearTimer: (entry) => {
        if (entry) entry.cleared = true;
      },
    });

    manager.scheduleSave({
      center: [50.286, 19.104],
      zoom: 12.4,
      bearing: 15,
      layerId: 'osm-dark',
    });
    manager.scheduleSave({
      center: [50.2991, 18.6749],
      zoom: 14.2,
      bearing: -30,
      layerId: 'esri-sat',
    });

    // First timer cancelled, nothing written before 150ms elapses
    assert.equal(scheduled.length, 2);
    assert.equal(scheduled[0].ms, 150);
    assert.equal(scheduled[0].cleared, true);
    assert.equal(manager.readSaved(), null);

    // Fire 150ms timer -> latest snapshot persisted cleanly
    scheduled[1].fn();
    const restored = sanitizeMapViewportPayload(manager.readSaved(), {
      minZoom: 2,
      maxZoom: 19,
      validLayerIds: ['osm-dark', 'esri-sat'],
    });
    assert.deepEqual(restored, {
      center: [50.2991, 18.6749],
      zoom: 14.2,
      bearing: -30,
      layerId: 'esri-sat',
    });
  });

  it('persists NanoGlobe { rotLon, rotLat, zoom } immediately on drag-end and clamps spherical bounds', () => {
    const manager = createViewportStorageManager({
      getConfig: () =>
        resolveViewportStorageConfig({
          storage: 'ss',
          appPrefix: 'science-blog',
          storageKey: 'earth_globe',
        }),
      debounceMs: 0,
      storageController: storageCtrl,
    });

    const clean = sanitizeGlobeViewportPayload(
      { rotLon: 195.5, rotLat: 92, zoom: 1.75 },
      { minZoom: 0.5, maxZoom: 3 }
    );
    assert.deepEqual(clean, {
      rotLon: -164.5,
      rotLat: 85,
      zoom: 1.75,
    });

    manager.writeNow(clean);
    assert.deepEqual(manager.readSaved(), clean);
  });

  it('wires storage, appPrefix, storageKey, and fitBounds skip-restore guard in NanoMap.vue and NanoGlobe.vue', () => {
    assert.ok(mapSfc.includes('storage:'));
    assert.ok(mapSfc.includes('appPrefix:'));
    assert.ok(mapSfc.includes('storageKey:'));
    assert.ok(mapSfc.includes('fitBounds:'));
    assert.ok(mapSfc.includes('props.fitBounds === true'));
    assert.ok(mapSfc.includes('props.fitBounds !== true'));

    assert.ok(globeSfc.includes('storage:'));
    assert.ok(globeSfc.includes('appPrefix:'));
    assert.ok(globeSfc.includes('storageKey:'));
    assert.ok(globeSfc.includes("'drag-end'"));
  });
});
