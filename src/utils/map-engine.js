/**
 * @file src/utils/map-engine.js
 * @description Zero-dependency Web Mercator (EPSG:3857) slippy tile grid,
 * cartographic scale bar, compass bearing rotation, and GPS polyline geometry engine.
 */

export const DEFAULT_MAP_LAYERS = [
  {
    id: 'osm-dark',
    name: 'OpenStreetMap (Dark)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    maxNativeZoom: 19,
    maxZoom: 19,
    darkFilter: true
  },
  {
    id: 'osm-standard',
    name: 'OpenStreetMap (Standard)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    maxNativeZoom: 19,
    maxZoom: 19,
    darkFilter: false
  },
  {
    id: 'esri-topo',
    name: 'Topographic (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    maxNativeZoom: 19,
    maxZoom: 19,
    darkFilter: false
  },
  {
    id: 'esri-street',
    name: 'Street Map (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    maxNativeZoom: 19,
    maxZoom: 19,
    darkFilter: false
  },
  {
    id: 'esri-satellite',
    name: 'Satellite (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxNativeZoom: 18,
    maxZoom: 19,
    darkFilter: false
  },
  {
    id: 'google-hybrid',
    name: 'Satellite + Streets (Google)',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    maxNativeZoom: 20,
    maxZoom: 20,
    darkFilter: false
  },
  {
    id: 'google-roadmap',
    name: 'Roadmap (Google)',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    maxNativeZoom: 20,
    maxZoom: 20,
    darkFilter: false
  },
  {
    id: 'google-terrain',
    name: 'Terrain (Google)',
    url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    maxNativeZoom: 20,
    maxZoom: 20,
    darkFilter: false
  },
  {
    id: 'opentopomap',
    name: 'OpenTopoMap',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    maxNativeZoom: 17,
    maxZoom: 17,
    darkFilter: false
  }
];

export const MAP_LAYERS = DEFAULT_MAP_LAYERS;

const MAX_MERCATOR_LAT = 85.05112878;
const EARTH_RADIUS_KM = 6371.0088;
const EQUATOR_METERS_PER_PX_Z0 = 156543.03392804097;

export function clampLatitude(lat) {
  const n = Number(lat);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-MAX_MERCATOR_LAT, Math.min(MAX_MERCATOR_LAT, n));
}

export function normalizeLongitude(lon) {
  const n = Number(lon);
  if (!Number.isFinite(n)) return 0;
  return ((((n + 180) % 360) + 360) % 360) - 180;
}

export function getMapLayerById(layerId, layers = DEFAULT_MAP_LAYERS) {
  const list = Array.isArray(layers) && layers.length > 0 ? layers : DEFAULT_MAP_LAYERS;
  return list.find((l) => l.id === layerId) || list[0];
}

export function resolveTileUrl(layer, { z, x, y }) {
  const spec = layer || DEFAULT_MAP_LAYERS[0];
  const tpl = String(spec.url || '');
  const subs = String(spec.subdomains || 'abc');
  const sub = subs[Math.abs(x + y) % Math.max(1, subs.length)] || 'a';
  return tpl
    .replace('{s}', sub)
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y));
}

/**
 * Projects [lat, lon] to continuous Web Mercator world pixel coordinates at `zoom`.
 */
export function latLonToWorldPixel(lat, lon, zoom, tileSize = 256) {
  const clampedLat = clampLatitude(lat);
  const normLon = normalizeLongitude(lon);
  const scale = tileSize * Math.pow(2, Number(zoom) || 0);
  const x = ((normLon + 180) / 360) * scale;
  const sinLat = Math.sin((clampedLat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

/**
 * Unprojects Web Mercator world pixel coordinates (x, y) at `zoom` back to { lat, lon }.
 */
export function worldPixelToLatLon(x, y, zoom, tileSize = 256) {
  const scale = tileSize * Math.pow(2, Number(zoom) || 0);
  const lon = normalizeLongitude((Number(x) / scale) * 360 - 180);
  const n = Math.PI - (2 * Math.PI * Number(y)) / scale;
  const lat = clampLatitude((180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
  return { lat, lon };
}

/**
 * Projects [lat, lon] into viewport pixel coordinates { x, y } relative to top-left (0, 0),
 * accounting for center, zoom, and optional map rotation (`bearing` in degrees).
 */
export function latLonToViewportPoint(
  lat,
  lon,
  { centerLat = 50.2991, centerLon = 18.6749, zoom = 13, width = 600, height = 320, bearing = 0, tileSize = 256 } = {}
) {
  const centerWorld = latLonToWorldPixel(centerLat, centerLon, zoom, tileSize);
  const ptWorld = latLonToWorldPixel(lat, lon, zoom, tileSize);
  const dx = ptWorld.x - centerWorld.x;
  const dy = ptWorld.y - centerWorld.y;

  const rad = ((-Number(bearing) || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;

  return {
    x: width / 2 + rx,
    y: height / 2 + ry
  };
}

/**
 * Converts a viewport point (vx, vy) back into { lat, lon } accounting for `bearing`.
 */
export function viewportPointToLatLon(
  vx,
  vy,
  { centerLat = 50.2991, centerLon = 18.6749, zoom = 13, width = 600, height = 320, bearing = 0, tileSize = 256 } = {}
) {
  const rx = Number(vx) - width / 2;
  const ry = Number(vy) - height / 2;

  const rad = ((Number(bearing) || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const dx = rx * cos - ry * sin;
  const dy = rx * sin + ry * cos;

  const centerWorld = latLonToWorldPixel(centerLat, centerLon, zoom, tileSize);
  return worldPixelToLatLon(centerWorld.x + dx, centerWorld.y + dy, zoom, tileSize);
}

/**
 * Builds the visible slippy tile grid covering a viewport of (width x height)
 * around [centerLat, centerLon] at `zoom`.
 */
export function buildVisibleTileGrid({
  centerLat = 50.2991,
  centerLon = 18.6749,
  zoom = 13,
  width = 600,
  height = 320,
  layer = DEFAULT_MAP_LAYERS[0],
  buffer = 1,
  tileSize = 256
} = {}) {
  const maxNative = layer?.maxNativeZoom || 19;
  const tileZoom = Math.max(1, Math.min(maxNative, Math.round(Number(zoom) || 13)));
  const zoomScale = Math.pow(2, (Number(zoom) || 13) - tileZoom);
  const numTiles = Math.pow(2, tileZoom);

  const centerWorld = latLonToWorldPixel(centerLat, centerLon, tileZoom, tileSize);
  const halfDiag = Math.hypot(width, height) / (2 * Math.max(0.25, zoomScale));

  const minWorldX = centerWorld.x - halfDiag;
  const maxWorldX = centerWorld.x + halfDiag;
  const minWorldY = centerWorld.y - halfDiag;
  const maxWorldY = centerWorld.y + halfDiag;

  const minTileX = Math.floor(minWorldX / tileSize) - buffer;
  const maxTileX = Math.floor(maxWorldX / tileSize) + buffer;
  const minTileY = Math.max(0, Math.floor(minWorldY / tileSize) - buffer);
  const maxTileY = Math.min(numTiles - 1, Math.floor(maxWorldY / tileSize) + buffer);

  const tiles = [];
  for (let ty = minTileY; ty <= maxTileY; ty++) {
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      const wrappedX = ((tx % numTiles) + numTiles) % numTiles;
      const url = resolveTileUrl(layer, { z: tileZoom, x: wrappedX, y: ty });
      const offsetX = (tx * tileSize - centerWorld.x) * zoomScale;
      const offsetY = (ty * tileSize - centerWorld.y) * zoomScale;
      const scaledSize = tileSize * zoomScale;

      tiles.push({
        key: `${layer?.id || 'tile'}-${tileZoom}-${tx}-${ty}`,
        z: tileZoom,
        x: wrappedX,
        y: ty,
        url,
        left: width / 2 + offsetX,
        top: height / 2 + offsetY,
        size: scaledSize + 0.65
      });
    }
  }

  return {
    tileZoom,
    zoomScale,
    tiles
  };
}

const NICE_SCALE_STEPS_METERS = [
  1, 2, 5, 10, 20, 50, 100, 200, 500,
  1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000, 2000000, 5000000
];

/**
 * Computes a cartographic metric scale bar (`200 m |_____|`, `2 km |_____|`, `200 km |_____|`)
 * calibrated to latitude and Web Mercator zoom level.
 */
export function computeMapScaleBar({
  lat = 50.2991,
  zoom = 13,
  maxPixelWidth = 96,
  minPixelWidth = 44
} = {}) {
  const clampedLat = clampLatitude(lat);
  const cosLat = Math.max(0.05, Math.cos((clampedLat * Math.PI) / 180));
  const metersPerPx = (EQUATOR_METERS_PER_PX_Z0 * cosLat) / Math.pow(2, Number(zoom) || 0);
  const maxMeters = Math.max(1, metersPerPx * maxPixelWidth);

  let chosenMeters = NICE_SCALE_STEPS_METERS[0];
  for (const step of NICE_SCALE_STEPS_METERS) {
    if (step <= maxMeters) {
      chosenMeters = step;
    } else {
      break;
    }
  }

  const rawPx = chosenMeters / metersPerPx;
  const pixelWidth = Math.max(minPixelWidth, Math.min(maxPixelWidth, Math.round(rawPx)));
  const isKm = chosenMeters >= 1000;
  const value = isKm ? chosenMeters / 1000 : chosenMeters;
  const unit = isKm ? 'km' : 'm';

  return {
    distanceMeters: chosenMeters,
    pixelWidth,
    value,
    unit,
    label: `${value} ${unit}`
  };
}

/**
 * Great-circle Haversine distance between two coordinates in kilometers.
 */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

function normalizeCoordPair(pt) {
  if (Array.isArray(pt) && pt.length >= 2) {
    const lat = Number(pt[0]);
    const lon = Number(pt[1]);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return [lat, lon];
    }
  }
  if (pt && typeof pt === 'object') {
    const rawLat = pt.lat ?? pt.latitude;
    const rawLon = pt.lon ?? pt.lng ?? pt.longitude;
    const lat = Number(rawLat);
    const lon = Number(rawLon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return [lat, lon];
    }
  }
  return null;
}

/**
 * Universal coordinate normalizer supporting:
 * 1) 2-number tuple: `[lat, lon]`
 * 2) Object: `{ lat, lon }`, `{ lat, lng }`, or `{ latitude, longitude }`
 * 3) Separate numeric arguments: `normalizeGeoPoint(null, lat, lon)`
 * Returns `{ lat, lon, heading, accuracy, color, radius, label } | null`.
 */
export function normalizeGeoPoint(input, separateLat = null, separateLon = null) {
  if (Array.isArray(input) && input.length >= 2) {
    const lat = Number(input[0]);
    const lon = Number(input[1]);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return {
        lat: clampLatitude(lat),
        lon: normalizeLongitude(lon),
        heading: null,
        accuracy: null,
        color: '#38bdf8',
        radius: 7.5,
        label: ''
      };
    }
  }

  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const rawLat = input.lat ?? input.latitude;
    const rawLon = input.lon ?? input.lng ?? input.longitude;
    const lat = Number(rawLat);
    const lon = Number(rawLon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return {
        lat: clampLatitude(lat),
        lon: normalizeLongitude(lon),
        heading: Number.isFinite(Number(input.heading)) ? Number(input.heading) : null,
        accuracy: Number.isFinite(Number(input.accuracy)) ? Number(input.accuracy) : null,
        color: input.color || '#38bdf8',
        radius: Number(input.radius) || 7.5,
        label: input.label || input.title || ''
      };
    }
  }

  if (
    separateLat !== null &&
    separateLon !== null &&
    separateLat !== undefined &&
    separateLon !== undefined &&
    Number.isFinite(Number(separateLat)) &&
    Number.isFinite(Number(separateLon))
  ) {
    return {
      lat: clampLatitude(Number(separateLat)),
      lon: normalizeLongitude(Number(separateLon)),
      heading: null,
      accuracy: null,
      color: '#38bdf8',
      radius: 7.5,
      label: ''
    };
  }

  return null;
}

/**
 * Computes total polyline distance in kilometers.
 */
export function computePolylineDistanceKm(points = []) {
  if (!Array.isArray(points) || points.length < 2) return 0;
  let total = 0;
  let prev = normalizeCoordPair(points[0]);
  for (let i = 1; i < points.length; i++) {
    const cur = normalizeCoordPair(points[i]);
    if (prev && cur && Number.isFinite(prev[0]) && Number.isFinite(cur[0])) {
      total += haversineDistanceKm(prev[0], prev[1], cur[0], cur[1]);
    }
    if (cur) prev = cur;
  }
  return Number(total.toFixed(2));
}

/**
 * Computes geographic bounding box for an array of coordinates `[lat, lon]` or `{ lat, lon }`.
 */
export function computeGeoBounds(points = []) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  let count = 0;

  for (const raw of points) {
    const pair = normalizeCoordPair(raw);
    if (!pair || !Number.isFinite(pair[0]) || !Number.isFinite(pair[1])) continue;
    const [lat, lon] = pair;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    count++;
  }

  if (count === 0) {
    return {
      minLat: 50.2991,
      maxLat: 50.2991,
      minLon: 18.6749,
      maxLon: 18.6749,
      center: [50.2991, 18.6749]
    };
  }

  return {
    minLat,
    maxLat,
    minLon,
    maxLon,
    center: [(minLat + maxLat) / 2, (minLon + maxLon) / 2]
  };
}

/**
 * Computes optimal `{ center: [lat, lon], zoom }` to fit all given points inside a viewport.
 */
export function computeFitBoundsView(
  points = [],
  { width = 600, height = 320, padding = 32, minZoom = 2, maxZoom = 18, tileSize = 256 } = {}
) {
  const bounds = computeGeoBounds(points);
  const availW = Math.max(64, width - padding * 2);
  const availH = Math.max(64, height - padding * 2);

  const nw = latLonToWorldPixel(bounds.maxLat, bounds.minLon, 0, tileSize);
  const se = latLonToWorldPixel(bounds.minLat, bounds.maxLon, 0, tileSize);
  const spanX = Math.abs(se.x - nw.x);
  const spanY = Math.abs(se.y - nw.y);

  if (spanX < 1e-6 && spanY < 1e-6) {
    return { center: bounds.center, zoom: Math.min(maxZoom, 15) };
  }

  const zoomX = spanX > 0 ? Math.log2(availW / spanX) : maxZoom;
  const zoomY = spanY > 0 ? Math.log2(availH / spanY) : maxZoom;
  const rawZoom = Math.floor(Math.min(zoomX, zoomY) * 2) / 2;
  const zoom = Math.max(minZoom, Math.min(maxZoom, rawZoom));

  return {
    center: bounds.center,
    zoom
  };
}

/**
 * Evaluates a normalized progress ratio `0..1` along a polyline, returning
 * interpolated `{ lat, lon, headingDeg, prefixPoints }`.
 */
export function evaluatePolylineCursor(points = [], progressRatio = 0) {
  const valid = points.map(normalizeCoordPair).filter(Boolean);
  if (valid.length === 0) {
    return { lat: 50.2991, lon: 18.6749, headingDeg: 0, prefixPoints: [] };
  }
  if (valid.length === 1) {
    return { lat: valid[0][0], lon: valid[0][1], headingDeg: 0, prefixPoints: [valid[0]] };
  }

  const clamped = Math.max(0, Math.min(1, Number(progressRatio) || 0));
  const exactIdx = clamped * (valid.length - 1);
  const i0 = Math.min(valid.length - 1, Math.floor(exactIdx));
  const i1 = Math.min(valid.length - 1, i0 + 1);
  const frac = exactIdx - i0;

  const p0 = valid[i0];
  const p1 = valid[i1];
  const lat = p0[0] + (p1[0] - p0[0]) * frac;
  const lon = p0[1] + (p1[1] - p0[1]) * frac;

  const lookIdx = i1 > i0 ? i1 : Math.max(0, i0 - 1);
  const fromPt = i1 > i0 ? p0 : valid[lookIdx];
  const toPt = i1 > i0 ? p1 : p0;
  const dLat = toPt[0] - fromPt[0];
  const dLon = (toPt[1] - fromPt[1]) * Math.cos((lat * Math.PI) / 180);
  const headingDeg = (Math.round((Math.atan2(dLon, dLat) * 180) / Math.PI) + 360) % 360;

  const prefixPoints = valid.slice(0, i0 + 1);
  if (frac > 0.001) {
    prefixPoints.push([lat, lon]);
  }

  return {
    lat,
    lon,
    headingDeg,
    prefixPoints
  };
}
