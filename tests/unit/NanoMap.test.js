import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MAP_LAYERS,
  getMapLayerById,
  resolveTileUrl,
  latLonToWorldPixel,
  worldPixelToLatLon,
  latLonToViewportPoint,
  viewportPointToLatLon,
  buildVisibleTileGrid,
  computeMapScaleBar,
  computePolylineDistanceKm,
  computeGeoBounds,
  computeFitBoundsView,
  evaluatePolylineCursor,
  normalizeGeoPoint,
  normalizeMapPolygons
} from '../../src/utils/map-engine.js';
import { BUILTIN_ICONS } from '../../src/icons/index.js';

describe('NanoMap & map-engine utilities', () => {
  test('DEFAULT_MAP_LAYERS should provide all 9 keyless tile layers', () => {
    assert.equal(DEFAULT_MAP_LAYERS.length, 9);
    const ids = DEFAULT_MAP_LAYERS.map((l) => l.id);
    assert.deepEqual(ids, [
      'osm-dark',
      'osm-standard',
      'esri-topo',
      'esri-street',
      'esri-satellite',
      'google-hybrid',
      'google-roadmap',
      'google-terrain',
      'opentopomap'
    ]);
    assert.equal(getMapLayerById('google-hybrid').name, 'Satellite + Streets (Google)');
    assert.equal(getMapLayerById('unknown-id').id, 'osm-dark');
  });

  test('resolveTileUrl should substitute {s}, {z}, {x}, {y} placeholders cleanly', () => {
    const osmUrl = resolveTileUrl(DEFAULT_MAP_LAYERS[0], { z: 13, x: 4512, y: 2774 });
    assert.match(osmUrl, /^https:\/\/[abc]\.tile\.openstreetmap\.org\/13\/4512\/2774\.png$/);

    const esriUrl = resolveTileUrl(getMapLayerById('esri-topo'), { z: 12, x: 2250, y: 1380 });
    assert.equal(
      esriUrl,
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/12/1380/2250'
    );
  });

  test('latLonToWorldPixel and worldPixelToLatLon should round-trip accurately', () => {
    const lat = 50.2991;
    const lon = 18.6749;
    const zoom = 14;
    const px = latLonToWorldPixel(lat, lon, zoom);
    const back = worldPixelToLatLon(px.x, px.y, zoom);
    assert.ok(Math.abs(back.lat - lat) < 1e-6);
    assert.ok(Math.abs(back.lon - lon) < 1e-6);
  });

  test('latLonToViewportPoint and viewportPointToLatLon should handle bearing rotation', () => {
    const opts = {
      centerLat: 50.2991,
      centerLon: 18.6749,
      zoom: 13,
      width: 640,
      height: 360,
      bearing: 35
    };
    const pt = latLonToViewportPoint(50.312, 18.715, opts);
    const unproj = viewportPointToLatLon(pt.x, pt.y, opts);
    assert.ok(Math.abs(unproj.lat - 50.312) < 1e-5);
    assert.ok(Math.abs(unproj.lon - 18.715) < 1e-5);
  });

  test('buildVisibleTileGrid should generate non-empty tile matrix covering viewport', () => {
    const grid = buildVisibleTileGrid({
      centerLat: 50.2991,
      centerLon: 18.6749,
      zoom: 13.5,
      width: 600,
      height: 320,
      layer: DEFAULT_MAP_LAYERS[0]
    });
    assert.equal(grid.tileZoom, 14);
    assert.ok(grid.tiles.length >= 6);
    assert.ok(grid.tiles.every((t) => t.url.includes('/14/')));
  });

  test('computeMapScaleBar should return clean 1-2-5 metric distances and pixel widths', () => {
    const streetScale = computeMapScaleBar({ lat: 50.3, zoom: 15 });
    assert.equal(streetScale.unit, 'm');
    assert.ok(streetScale.pixelWidth >= 44 && streetScale.pixelWidth <= 96);

    const countryScale = computeMapScaleBar({ lat: 50.3, zoom: 5 });
    assert.equal(countryScale.unit, 'km');
    assert.ok(countryScale.value >= 50);
    assert.match(countryScale.label, /^\d+ km$/);
  });

  test('computePolylineDistanceKm, computeFitBoundsView and evaluatePolylineCursor should work on GPS tracks', () => {
    const track = [
      [50.2945, 18.6658],
      [50.3018, 18.7515],
      [50.2908, 18.8285],
      [50.2782, 18.9214]
    ];
    const dist = computePolylineDistanceKm(track);
    assert.ok(dist > 15 && dist < 25);

    const bounds = computeGeoBounds(track);
    assert.equal(bounds.minLat, 50.2782);
    assert.equal(bounds.maxLat, 50.3018);

    const fit = computeFitBoundsView(track, { width: 640, height: 360 });
    assert.ok(fit.zoom >= 10 && fit.zoom <= 15);

    const mid = evaluatePolylineCursor(track, 0.5);
    assert.ok(mid.prefixPoints.length >= 2);
    assert.ok(mid.headingDeg >= 0 && mid.headingDeg < 360);
  });

  test('normalizeGeoPoint should accept [lat, lon] tuple, { lat, lon | lng } object, and separate (null, lat, lon) numbers', () => {
    const fromTuple = normalizeGeoPoint([50.2945, 18.6658]);
    assert.equal(fromTuple.lat, 50.2945);
    assert.ok(Math.abs(fromTuple.lon - 18.6658) < 1e-9);
    assert.equal(fromTuple.heading, null);
    assert.equal(fromTuple.color, '#38bdf8');
    assert.equal(fromTuple.radius, 7.5);

    const fromObj = normalizeGeoPoint({ lat: 50.3018, lng: 18.7515, heading: 120, color: '#10b981' });
    assert.equal(fromObj.lat, 50.3018);
    assert.ok(Math.abs(fromObj.lon - 18.7515) < 1e-9);
    assert.equal(fromObj.heading, 120);
    assert.equal(fromObj.color, '#10b981');

    const fromSeparate = normalizeGeoPoint(null, 50.2782, 18.9214);
    assert.equal(fromSeparate.lat, 50.2782);
    assert.ok(Math.abs(fromSeparate.lon - 18.9214) < 1e-9);

    assert.equal(normalizeGeoPoint(null), null);
  });

  test('normalizeMapPolygons should support both [lat, lon] polygons and RFC 7946 GeoJSON [lon, lat] FeatureCollections', () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            id: 'metro-core-district',
            name: 'Metropolitan Core District',
            color: '#f59e0b',
            fillOpacity: 0.25
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [19.085, 50.292],
                [19.118, 50.292],
                [19.118, 50.268],
                [19.085, 50.268],
                [19.085, 50.292]
              ]
            ]
          }
        }
      ]
    };

    const customPolygons = [
      {
        id: 'custom-zone',
        name: 'Custom Zone',
        color: '#38bdf8',
        points: [
          [50.29, 19.09],
          [50.29, 19.11],
          [50.27, 19.11]
        ]
      }
    ];

    const normalized = normalizeMapPolygons(customPolygons, geojson);
    assert.equal(normalized.length, 2);
    assert.equal(normalized[0].id, 'custom-zone');
    assert.equal(normalized[0].rings[0].length, 3);
    assert.equal(normalized[1].id, 'metro-core-district');
    assert.equal(normalized[1].name, 'Metropolitan Core District');
    assert.equal(normalized[1].fillOpacity, 0.25);
    // Verify RFC 7946 [lon, lat] was converted to internal [lat, lon]
    assert.deepEqual(normalized[1].rings[0][0], [50.292, 19.085]);
  });

  test('BUILTIN_ICONS should expose map, compass-rose, locate-fixed, plus, minus and layers icons', () => {
    for (const iconName of ['map', 'compass', 'compass-rose', 'locate-fixed', 'plus', 'minus', 'layers']) {
      assert.ok(BUILTIN_ICONS[iconName], `Icon "${iconName}" should be registered in BUILTIN_ICONS`);
    }
  });
});
