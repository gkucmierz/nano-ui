<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import NanoIcon from './NanoIcon.vue';
import {
  DEFAULT_MAP_LAYERS,
  getMapLayerById,
  buildVisibleTileGrid,
  latLonToViewportPoint,
  viewportPointToLatLon,
  computeMapScaleBar,
  computePolylineDistanceKm,
  computeFitBoundsView,
  evaluatePolylineCursor,
  normalizeGeoPoint,
  normalizeMapPolygons,
  clampLatitude,
  normalizeLongitude
} from '../utils/map-engine.js';

const props = defineProps({
  center: {
    type: [Array, Object],
    default: () => [50.2991, 18.6749]
  },
  zoom: {
    type: Number,
    default: 13
  },
  minZoom: {
    type: Number,
    default: 2
  },
  maxZoom: {
    type: Number,
    default: 19
  },
  bearing: {
    type: Number,
    default: 0
  },
  height: {
    type: [Number, String],
    default: 360
  },
  layers: {
    type: Array,
    default: () => DEFAULT_MAP_LAYERS
  },
  layer: {
    type: String,
    default: 'osm-dark'
  },
  tracks: {
    type: Array,
    default: () => []
  },
  polygons: {
    type: Array,
    default: () => []
  },
  geojson: {
    type: [Object, Array],
    default: null
  },
  markers: {
    type: Array,
    default: () => []
  },
  /**
   * Reactive GPS position — supports any of:
   * 1) Array tuple: `[lat, lon]`
   * 2) Object: `{ lat, lon }` / `{ lat, lng }` / `{ latitude, longitude }`
   * 3) Separate props: `:gps-lat` and `:gps-lon` (or `:lat` and `:lon`)
   * If omitted/null, clicking the Locate button requests `navigator.geolocation.getCurrentPosition()`.
   */
  gps: {
    type: [Array, Object],
    default: null
  },
  activePoint: {
    type: [Array, Object],
    default: null
  },
  gpsLat: {
    type: Number,
    default: null
  },
  gpsLon: {
    type: Number,
    default: null
  },
  lat: {
    type: Number,
    default: null
  },
  lon: {
    type: Number,
    default: null
  },
  followGps: {
    type: Boolean,
    default: false
  },
  showLayerPicker: {
    type: Boolean,
    default: true
  },
  showZoomControls: {
    type: Boolean,
    default: true
  },
  showScaleBar: {
    type: Boolean,
    default: true
  },
  showCompass: {
    type: Boolean,
    default: true
  },
  showLocateControl: {
    type: Boolean,
    default: true
  },
  enableLayerHotkeys: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'update:center',
  'update:zoom',
  'update:bearing',
  'update:layer',
  'update:gps',
  'update:followGps',
  'marker-click',
  'polygon-click',
  'map-click',
  'locate',
  'locate-error'
]);

const viewportRef = ref(null);
const layerMenuRef = ref(null);
const viewportWidth = ref(640);
const viewportHeight = ref(typeof props.height === 'number' ? props.height : 360);

const initialCenterNorm = normalizeGeoPoint(props.center) || { lat: 50.2991, lon: 18.6749 };
const internalCenter = ref([initialCenterNorm.lat, initialCenterNorm.lon]);
const internalZoom = ref(Number(props.zoom) || 13);
const internalBearing = ref(Number(props.bearing) || 0);
const activeLayerId = ref(props.layer || 'osm-dark');
const isFollowing = ref(Boolean(props.followGps));
const showLayerDropdown = ref(false);
const isDragging = ref(false);
const isLocatingDevice = ref(false);
const deviceGpsPoint = ref(null);

let resizeObserver = null;
let dragState = null;

// Resolve GPS point from any supported prop shape (`gps`, `activePoint`, `gpsLat`+`gpsLon`, `lat`+`lon`), or fallback to acquired device GPS
const resolvedPropGps = computed(() => {
  return (
    normalizeGeoPoint(
      props.gps ?? props.activePoint,
      props.gpsLat ?? props.lat,
      props.gpsLon ?? props.lon
    ) || null
  );
});

const effectiveGpsPoint = computed(() => {
  return resolvedPropGps.value || deviceGpsPoint.value || null;
});

watch(
  () => props.center,
  (val) => {
    const norm = normalizeGeoPoint(val);
    if (norm) {
      internalCenter.value = [norm.lat, norm.lon];
    }
  },
  { deep: true }
);

watch(
  () => props.zoom,
  (val) => {
    if (Number.isFinite(Number(val))) {
      internalZoom.value = Math.max(props.minZoom, Math.min(props.maxZoom, Number(val)));
    }
  }
);

watch(
  () => props.bearing,
  (val) => {
    if (Number.isFinite(Number(val))) {
      internalBearing.value = Number(val);
    }
  }
);

watch(
  () => props.layer,
  (val) => {
    if (val) activeLayerId.value = val;
  }
);

watch(
  () => props.followGps,
  (val) => {
    isFollowing.value = Boolean(val);
    if (isFollowing.value && effectiveGpsPoint.value) {
      syncFollowCamera(effectiveGpsPoint.value);
    }
  }
);

watch(
  resolvedPropGps,
  (pt) => {
    if (isFollowing.value && pt) {
      syncFollowCamera(pt);
    }
  },
  { deep: true }
);

const effectiveLayers = computed(() => {
  return Array.isArray(props.layers) && props.layers.length > 0 ? props.layers : DEFAULT_MAP_LAYERS;
});

const currentLayerObj = computed(() => {
  return getMapLayerById(activeLayerId.value, effectiveLayers.value);
});

const normalizedTracks = computed(() => {
  return (props.tracks || []).map((t, idx) => {
    const pts = Array.isArray(t.points) ? t.points : [];
    const dist = Number.isFinite(t.distanceKm) ? t.distanceKm : computePolylineDistanceKm(pts);
    return {
      id: t.id || `track-${idx + 1}`,
      name: t.name || `Track ${idx + 1}`,
      color: t.color || '#e6bd4c',
      secondaryColor: t.secondaryColor || null,
      width: Number(t.width) || 5,
      opacity: Number.isFinite(t.opacity) ? t.opacity : 0.88,
      dashed: Boolean(t.dashed),
      progress: Number.isFinite(t.progress) ? t.progress : null,
      points: pts,
      distanceKm: dist
    };
  });
});

const tileGrid = computed(() => {
  return buildVisibleTileGrid({
    centerLat: internalCenter.value[0],
    centerLon: internalCenter.value[1],
    zoom: internalZoom.value,
    width: viewportWidth.value,
    height: viewportHeight.value,
    layer: currentLayerObj.value,
    buffer: 1
  });
});

const projectedTracks = computed(() => {
  const projOpts = {
    centerLat: internalCenter.value[0],
    centerLon: internalCenter.value[1],
    zoom: internalZoom.value,
    width: viewportWidth.value,
    height: viewportHeight.value,
    bearing: 0
  };

  return normalizedTracks.value.map((track) => {
    const screenPts = track.points
      .map((raw) => normalizeGeoPoint(raw))
      .filter(Boolean)
      .map((pt) => {
        const p = latLonToViewportPoint(pt.lat, pt.lon, projOpts);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      });

    let progressPointsStr = '';
    if (track.progress !== null && track.points.length > 1) {
      const evalState = evaluatePolylineCursor(track.points, track.progress);
      progressPointsStr = evalState.prefixPoints
        .map(([lat, lon]) => {
          const p = latLonToViewportPoint(lat, lon, projOpts);
          return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
        })
        .join(' ');
    }

    return {
      ...track,
      pointsStr: screenPts.join(' '),
      progressPointsStr
    };
  });
});

const normalizedPolygons = computed(() => {
  return normalizeMapPolygons(props.polygons, props.geojson);
});

const projectedPolygons = computed(() => {
  const projOpts = {
    centerLat: internalCenter.value[0],
    centerLon: internalCenter.value[1],
    zoom: internalZoom.value,
    width: viewportWidth.value,
    height: viewportHeight.value,
    bearing: 0
  };

  return normalizedPolygons.value
    .map((poly) => {
      const pathParts = poly.rings
        .map((ring) => {
          const pts = ring.map(([lat, lon]) => {
            const p = latLonToViewportPoint(lat, lon, projOpts);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          });
          if (pts.length < 3) return '';
          return `M ${pts.join(' L ')} Z`;
        })
        .filter(Boolean);

      if (pathParts.length === 0) return null;
      return {
        ...poly,
        pathD: pathParts.join(' ')
      };
    })
    .filter(Boolean);
});

const projectedMarkers = computed(() => {
  const projOpts = {
    centerLat: internalCenter.value[0],
    centerLon: internalCenter.value[1],
    zoom: internalZoom.value,
    width: viewportWidth.value,
    height: viewportHeight.value,
    bearing: 0
  };

  return (props.markers || [])
    .map((m, idx) => {
      const norm = normalizeGeoPoint(m);
      if (!norm) return null;
      const p = latLonToViewportPoint(norm.lat, norm.lon, projOpts);
      return {
        ...m,
        id: m.id ?? `marker-${idx}`,
        x: Number(p.x.toFixed(2)),
        y: Number(p.y.toFixed(2)),
        color: m.color || '#e6bd4c',
        borderColor: m.borderColor || '#0b0f19',
        radius: Number(m.radius) || 4.5,
        label: m.label || m.title || ''
      };
    })
    .filter(Boolean);
});

const projectedGpsPoint = computed(() => {
  const pt = effectiveGpsPoint.value;
  if (!pt) return null;
  const p = latLonToViewportPoint(pt.lat, pt.lon, {
    centerLat: internalCenter.value[0],
    centerLon: internalCenter.value[1],
    zoom: internalZoom.value,
    width: viewportWidth.value,
    height: viewportHeight.value,
    bearing: 0
  });
  return {
    ...pt,
    x: Number(p.x.toFixed(2)),
    y: Number(p.y.toFixed(2)),
    color: pt.color || '#38bdf8',
    radius: Number(pt.radius) || 7.5
  };
});

const scaleBar = computed(() => {
  return computeMapScaleBar({
    lat: internalCenter.value[0],
    zoom: internalZoom.value,
    maxPixelWidth: 94,
    minPixelWidth: 44
  });
});

const stageHeightStyle = computed(() => {
  return typeof props.height === 'number' ? `${props.height}px` : String(props.height);
});

function setCenterAndZoom(newCenter, newZoom) {
  if (Array.isArray(newCenter) && newCenter.length >= 2) {
    internalCenter.value = [clampLatitude(newCenter[0]), normalizeLongitude(newCenter[1])];
    emit('update:center', [...internalCenter.value]);
  }
  if (Number.isFinite(newZoom)) {
    const maxAllowed = Math.min(props.maxZoom, currentLayerObj.value?.maxZoom || 19);
    const clampedZ = Math.max(props.minZoom, Math.min(maxAllowed, Number(newZoom.toFixed(2))));
    internalZoom.value = clampedZ;
    emit('update:zoom', clampedZ);
  }
}

function setBearing(deg) {
  const norm = ((((Number(deg) || 0) % 360) + 540) % 360) - 180;
  internalBearing.value = Math.abs(norm) < 0.2 ? 0 : Number(norm.toFixed(1));
  emit('update:bearing', internalBearing.value);
}

function syncFollowCamera(pt = effectiveGpsPoint.value) {
  if (!pt) return;
  const targetZ = Math.max(internalZoom.value, 14.5);
  setCenterAndZoom([pt.lat, pt.lon], targetZ);
}

function fitBoundsToTracks() {
  const allPts = [];
  for (const t of normalizedTracks.value) {
    if (Array.isArray(t.points)) {
      allPts.push(...t.points);
    }
  }
  for (const poly of normalizedPolygons.value) {
    for (const ring of poly.rings || []) {
      allPts.push(...ring);
    }
  }
  if (allPts.length === 0 && props.markers?.length) {
    allPts.push(...props.markers);
  }
  if (allPts.length === 0) return;

  const fitted = computeFitBoundsView(allPts, {
    width: viewportWidth.value || 640,
    height: viewportHeight.value || 360,
    padding: 36,
    minZoom: props.minZoom,
    maxZoom: Math.min(props.maxZoom, 17)
  });
  setCenterAndZoom(fitted.center, fitted.zoom);
}

function selectLayer(layerId) {
  activeLayerId.value = layerId;
  showLayerDropdown.value = false;
  emit('update:layer', layerId);
}

function zoomIn() {
  setCenterAndZoom(internalCenter.value, Math.round((internalZoom.value + 1) * 2) / 2);
}

function zoomOut() {
  setCenterAndZoom(internalCenter.value, Math.round((internalZoom.value - 1) * 2) / 2);
}

function handleCompassClick() {
  if (Math.abs(internalBearing.value) > 0.5) {
    setBearing(0);
  } else {
    const heading = Number(effectiveGpsPoint.value?.heading);
    setBearing(Number.isFinite(heading) && heading !== 0 ? heading : -35);
  }
}

/**
 * Locate button handler:
 * - If a reactive GPS coordinate was provided via props (`gps`, `activePoint`, `gpsLat`+`gpsLon`, `lat`+`lon`),
 *   immediately centers and follows that coordinate.
 * - Otherwise requests real device geolocation via `navigator.geolocation.getCurrentPosition()`.
 */
function handleLocateClick() {
  if (resolvedPropGps.value) {
    isFollowing.value = true;
    emit('update:followGps', true);
    syncFollowCamera(resolvedPropGps.value);
    emit('locate', {
      lat: resolvedPropGps.value.lat,
      lon: resolvedPropGps.value.lon,
      source: 'prop'
    });
    return;
  }

  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    isLocatingDevice.value = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        isLocatingDevice.value = false;
        const point = {
          lat: clampLatitude(pos.coords.latitude),
          lon: normalizeLongitude(pos.coords.longitude),
          accuracy: pos.coords.accuracy || null,
          heading: Number.isFinite(pos.coords.heading) ? pos.coords.heading : null,
          color: '#38bdf8',
          radius: 7.5,
          source: 'device'
        };
        deviceGpsPoint.value = point;
        isFollowing.value = true;
        emit('update:gps', [point.lat, point.lon]);
        emit('update:followGps', true);
        setCenterAndZoom([point.lat, point.lon], Math.max(internalZoom.value, 15));
        emit('locate', point);
      },
      (err) => {
        isLocatingDevice.value = false;
        emit('locate-error', err);
        if (deviceGpsPoint.value) {
          syncFollowCamera(deviceGpsPoint.value);
        } else {
          fitBoundsToTracks();
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
    return;
  }

  fitBoundsToTracks();
}

function onPointerDown(e) {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  if (e.target.closest('.nano-map-hud-control') || e.target.closest('.nano-map-marker-hit')) return;

  isDragging.value = true;
  dragState = {
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    lastX: e.clientX,
    lastY: e.clientY,
    moved: false
  };
  e.currentTarget.setPointerCapture?.(e.pointerId);
}

function onPointerMove(e) {
  if (!dragState || e.pointerId !== dragState.pointerId) return;
  const dx = e.clientX - dragState.lastX;
  const dy = e.clientY - dragState.lastY;
  if (Math.hypot(e.clientX - dragState.startX, e.clientY - dragState.startY) > 3) {
    dragState.moved = true;
    if (isFollowing.value) {
      isFollowing.value = false;
      emit('update:followGps', false);
    }
  }
  dragState.lastX = e.clientX;
  dragState.lastY = e.clientY;

  const newCenter = viewportPointToLatLon(
    viewportWidth.value / 2 - dx,
    viewportHeight.value / 2 - dy,
    {
      centerLat: internalCenter.value[0],
      centerLon: internalCenter.value[1],
      zoom: internalZoom.value,
      width: viewportWidth.value,
      height: viewportHeight.value,
      bearing: internalBearing.value
    }
  );
  setCenterAndZoom([newCenter.lat, newCenter.lon], internalZoom.value);
}

function onPointerUp(e) {
  if (!dragState || e.pointerId !== dragState.pointerId) return;
  const wasMoved = dragState.moved;
  dragState = null;
  isDragging.value = false;

  if (!wasMoved && viewportRef.value) {
    const rect = viewportRef.value.getBoundingClientRect();
    const vx = e.clientX - rect.left;
    const vy = e.clientY - rect.top;
    const coords = viewportPointToLatLon(vx, vy, {
      centerLat: internalCenter.value[0],
      centerLon: internalCenter.value[1],
      zoom: internalZoom.value,
      width: viewportWidth.value,
      height: viewportHeight.value,
      bearing: internalBearing.value
    });
    emit('map-click', coords);
  }
}

function onWheel(e) {
  e.preventDefault();
  const rawDelta = -e.deltaY * 0.0035;
  const step = Math.max(-0.5, Math.min(0.5, rawDelta));
  if (Math.abs(step) < 0.02) return;
  setCenterAndZoom(internalCenter.value, internalZoom.value + step);
}

function handleDocumentClick(e) {
  if (showLayerDropdown.value && layerMenuRef.value && !layerMenuRef.value.contains(e.target)) {
    showLayerDropdown.value = false;
  }
}

function handleKeydown(e) {
  if (!props.enableLayerHotkeys) return;
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
  if (/^[1-9]$/.test(e.key)) {
    const idx = Number(e.key) - 1;
    const target = effectiveLayers.value[idx];
    if (target) {
      e.preventDefault();
      selectLayer(target.id);
    }
  } else if (e.key === 'Escape' && showLayerDropdown.value) {
    showLayerDropdown.value = false;
  }
}

function updateDimensions() {
  if (!viewportRef.value) return;
  const w = viewportRef.value.clientWidth;
  const h = viewportRef.value.clientHeight;
  if (w > 0) viewportWidth.value = w;
  if (h > 0) viewportHeight.value = h;
}

onMounted(() => {
  updateDimensions();
  if (typeof ResizeObserver !== 'undefined' && viewportRef.value) {
    resizeObserver = new ResizeObserver(() => updateDimensions());
    resizeObserver.observe(viewportRef.value);
  }
  if (!props.followGps && normalizedTracks.value.length > 0) {
    fitBoundsToTracks();
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', handleDocumentClick);
    window.addEventListener('keydown', handleKeydown);
  }
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('pointerdown', handleDocumentClick);
    window.removeEventListener('keydown', handleKeydown);
  }
});

defineExpose({
  zoomIn,
  zoomOut,
  setBearing,
  selectLayer,
  fitBoundsToTracks,
  handleLocateClick
});
</script>

<template>
  <div
    class="nano-map"
    :class="{ 'is-dark-filtered-tiles': currentLayerObj.darkFilter }"
  >
    <div
      ref="viewportRef"
      class="nano-map-viewport"
      :class="{ 'is-dragging': isDragging }"
      :style="{ height: stageHeightStyle }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel="onWheel"
      @dblclick="zoomIn"
    >
      <!-- Rotatable World Stage (Tiles + Vector SVG) -->
      <div
        class="nano-map-rotatable-stage"
        :style="{
          transform: internalBearing
            ? `rotate(${-internalBearing}deg)`
            : 'none'
        }"
      >
        <!-- Slippy Tile Layer -->
        <div class="nano-map-tile-pane">
          <img
            v-for="tile in tileGrid.tiles"
            :key="tile.key"
            :src="tile.url"
            alt=""
            draggable="false"
            decoding="async"
            class="nano-map-tile"
            :style="{
              left: `${tile.left.toFixed(2)}px`,
              top: `${tile.top.toFixed(2)}px`,
              width: `${tile.size.toFixed(2)}px`,
              height: `${tile.size.toFixed(2)}px`
            }"
          />
        </div>

        <!-- SVG Vector Layer (GeoJSON Polygons, Polylines, Waypoint Markers, Active GPS Cursor) -->
        <svg
          class="nano-map-vector-svg"
          :viewBox="`0 0 ${viewportWidth} ${viewportHeight}`"
          aria-hidden="true"
        >
          <!-- GeoJSON / Shaded Area Polygons (RFC 7946) -->
          <g class="nano-map-polygons-group">
            <path
              v-for="poly in projectedPolygons"
              :key="poly.id"
              :d="poly.pathD"
              fill-rule="evenodd"
              :fill="poly.fillColor"
              :fill-opacity="poly.fillOpacity"
              :stroke="poly.color"
              :stroke-width="poly.strokeWidth"
              :stroke-opacity="poly.strokeOpacity"
              :stroke-dasharray="poly.dashed ? '6 6' : undefined"
              stroke-linejoin="round"
              class="nano-map-polygon-hit"
              v-tooltip="poly.name || undefined"
              @click.stop="emit('polygon-click', poly)"
            />
          </g>

          <!-- Route Tracks -->
          <g v-for="track in projectedTracks" :key="track.id">
            <polyline
              v-if="track.pointsStr"
              :points="track.pointsStr"
              fill="none"
              stroke="rgba(9, 13, 22, 0.55)"
              :stroke-width="track.width + 3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <polyline
              v-if="track.pointsStr"
              :points="track.pointsStr"
              fill="none"
              :stroke="track.color"
              :stroke-width="track.width"
              :stroke-opacity="track.progress !== null ? track.opacity * 0.48 : track.opacity"
              :stroke-dasharray="track.dashed ? '8 8' : undefined"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <polyline
              v-if="track.secondaryColor && track.pointsStr"
              :points="track.pointsStr"
              fill="none"
              :stroke="track.secondaryColor"
              :stroke-width="Math.max(2.5, track.width - 1.5)"
              stroke-opacity="0.92"
              stroke-dasharray="8 10"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <polyline
              v-if="track.progressPointsStr"
              :points="track.progressPointsStr"
              fill="none"
              :stroke="track.color"
              :stroke-width="track.width"
              stroke-opacity="1"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </g>

          <!-- Waypoint Markers -->
          <g class="nano-map-markers-group">
            <circle
              v-for="m in projectedMarkers"
              :key="m.id"
              :cx="m.x"
              :cy="m.y"
              :r="m.radius"
              :fill="m.color"
              :stroke="m.borderColor"
              stroke-width="1.8"
              class="nano-map-marker-hit"
              v-tooltip="m.label || undefined"
              @click.stop="emit('marker-click', m)"
            />
          </g>

          <!-- Active GPS Point Cursor (Blue/Custom Dot with Glow Halo) -->
          <g v-if="projectedGpsPoint" class="nano-map-active-cursor">
            <circle
              :cx="projectedGpsPoint.x"
              :cy="projectedGpsPoint.y"
              :r="projectedGpsPoint.radius + 5.5"
              :fill="projectedGpsPoint.color"
              fill-opacity="0.24"
            />
            <circle
              :cx="projectedGpsPoint.x"
              :cy="projectedGpsPoint.y"
              :r="projectedGpsPoint.radius"
              :fill="projectedGpsPoint.color"
              stroke="#0b0f19"
              stroke-width="2.4"
            />
          </g>
        </svg>
      </div>
    </div>

    <!-- Top-Left HUD: + / - Zoom Controls -->
    <div
      v-if="showZoomControls"
      class="nano-map-hud-control nano-map-hud-zoom"
      role="group"
      aria-label="Zoom Controls"
    >
      <button
        type="button"
        class="nano-map-zoom-btn"
        aria-label="Zoom in"
        v-tooltip="'Zoom in (+)'"
        @click.stop="zoomIn"
      >
        <NanoIcon name="plus" :size="15" :stroke-width="2.5" />
      </button>
      <button
        type="button"
        class="nano-map-zoom-btn"
        aria-label="Zoom out"
        v-tooltip="'Zoom out (−)'"
        @click.stop="zoomOut"
      >
        <NanoIcon name="minus" :size="15" :stroke-width="2.5" />
      </button>
    </div>

    <!-- Top-Right HUD: Layer Picker Dropdown -->
    <div
      v-if="showLayerPicker"
      ref="layerMenuRef"
      class="nano-map-hud-control nano-map-floating-layer-picker"
    >
      <button
        type="button"
        class="nano-map-layer-trigger"
        :class="{ active: showLayerDropdown }"
        aria-haspopup="listbox"
        :aria-expanded="showLayerDropdown"
        @click.stop="showLayerDropdown = !showLayerDropdown"
      >
        <NanoIcon name="layers" :size="13" />
        <span>{{ currentLayerObj.name }}</span>
        <NanoIcon name="chevron-down" :size="13" />
      </button>
      <div v-if="showLayerDropdown" class="nano-map-layer-menu" role="listbox">
        <button
          v-for="(l, idx) in effectiveLayers"
          :key="l.id"
          type="button"
          role="option"
          :aria-selected="activeLayerId === l.id"
          class="nano-map-layer-item"
          :class="{ selected: activeLayerId === l.id }"
          @click.stop="selectLayer(l.id)"
        >
          <span class="nano-map-layer-left">
            <kbd class="nano-map-layer-kbd">{{ idx + 1 }}</kbd>
            <span>{{ l.name }}</span>
          </span>
          <NanoIcon
            v-if="activeLayerId === l.id"
            name="check"
            :size="14"
            class="nano-map-layer-check"
          />
        </button>
      </div>
    </div>

    <!-- Bottom-Right HUD Stack: Compass (<NanoIcon name="compass" />) + Locate (<NanoIcon name="locate-fixed" />) -->
    <div
      v-if="showCompass || showLocateControl"
      class="nano-map-hud-control nano-map-hud-right-stack"
    >
      <button
        v-if="showCompass"
        type="button"
        class="nano-map-circle-btn"
        :class="{ active: Math.abs(internalBearing) > 0.5 }"
        :aria-label="`Compass (${internalBearing}°)`"
        v-tooltip="
          internalBearing !== 0
            ? `Reset North (${internalBearing}°)`
            : 'Rotate / Align Compass'
        "
        @click.stop="handleCompassClick"
      >
        <span
          class="nano-map-compass-rotor"
          :style="{ transform: `rotate(${-internalBearing}deg)` }"
        >
          <NanoIcon name="compass" :size="17" :stroke-width="2" />
        </span>
      </button>

      <button
        v-if="showLocateControl"
        type="button"
        class="nano-map-circle-btn"
        :class="{ active: isFollowing, 'is-locating': isLocatingDevice }"
        aria-label="Locate GPS position"
        v-tooltip="
          resolvedPropGps
            ? 'Center on GPS position'
            : 'Request device GPS position'
        "
        @click.stop="handleLocateClick"
      >
        <NanoIcon name="locate-fixed" :size="16" :stroke-width="2.1" />
      </button>
    </div>

    <!-- Bottom-Left HUD: Dynamic Metric Scale Bar -->
    <div
      v-if="showScaleBar"
      class="nano-map-hud-control nano-map-scale-pill"
      aria-label="Map Scale"
    >
      <span class="nano-map-scale-label">{{ scaleBar.label }}</span>
      <span
        class="nano-map-scale-bracket"
        :style="{ width: `${scaleBar.pixelWidth}px` }"
      />
    </div>

    <slot name="overlay" />
  </div>
</template>

<style scoped>
.nano-map {
  position: relative;
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--nano-border, rgba(148, 163, 184, 0.2));
  background: #070b14;
  box-shadow: var(--nano-shadow-sm, 0 10px 30px rgba(0, 0, 0, 0.35));
  user-select: none;
  -webkit-user-select: none;
}

.nano-map-viewport {
  position: relative;
  width: 100%;
  border-radius: 11px;
  overflow: hidden;
  background: #070b14;
  cursor: grab;
  touch-action: none;
}

.nano-map-viewport.is-dragging {
  cursor: grabbing;
}

.nano-map-rotatable-stage {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform-origin: 50% 50%;
  transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1);
}

.nano-map-tile-pane {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.is-dark-filtered-tiles .nano-map-tile-pane {
  filter: invert(100%) hue-rotate(180deg) brightness(94%) contrast(90%) saturate(85%);
  background: #f2efe9;
}

.nano-map-tile {
  position: absolute;
  display: block;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
  backface-visibility: hidden;
}

.nano-map-vector-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
}

.nano-map-polygon-hit {
  pointer-events: auto;
  cursor: pointer;
  transition: fill-opacity 0.18s ease, stroke-width 0.18s ease;
}

.nano-map-polygon-hit:hover {
  fill-opacity: 0.36;
}

.nano-map-marker-hit {
  pointer-events: auto;
  cursor: pointer;
  transition: r 0.15s ease;
}

.nano-map-marker-hit:hover {
  filter: brightness(1.2);
}

/* Top-Left + / - Zoom Controls */
.nano-map-hud-zoom {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.nano-map-zoom-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(15, 20, 30, 0.84);
  backdrop-filter: blur(10px);
  color: #e2e8f0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
  padding: 0;
}

.nano-map-zoom-btn:hover {
  color: #4ce6a3;
  border-color: rgba(76, 230, 163, 0.65);
  background: rgba(15, 23, 42, 0.95);
}

/* Top-Right Floating Layer Picker */
.nano-map-floating-layer-picker {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 40;
}

.nano-map-layer-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.73rem;
  font-weight: 600;
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(15, 20, 30, 0.86);
  backdrop-filter: blur(10px);
  color: #e2e8f0;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
}

.nano-map-layer-trigger:hover,
.nano-map-layer-trigger.active {
  color: #4ce6a3;
  border-color: rgba(76, 230, 163, 0.65);
  background: rgba(15, 23, 42, 0.95);
}

.nano-map-layer-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 999;
  min-width: 228px;
  padding: 6px;
  border-radius: 12px;
  background: rgba(11, 17, 29, 0.96);
  border: 1px solid rgba(16, 185, 129, 0.42);
  box-shadow: 0 16px 38px rgba(0, 0, 0, 0.68);
  display: flex;
  flex-direction: column;
  gap: 2px;
  backdrop-filter: blur(18px);
}

.nano-map-layer-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 6px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  font-size: 0.74rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.nano-map-layer-item:hover {
  background: rgba(148, 163, 184, 0.14);
  color: #f8fafc;
}

.nano-map-layer-item.selected {
  background: rgba(16, 185, 129, 0.16);
  color: #4ce6a3;
  font-weight: 700;
}

.nano-map-layer-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.nano-map-layer-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 19px;
  height: 19px;
  border-radius: 5px;
  background: rgba(148, 163, 184, 0.14);
  border: 1px solid rgba(148, 163, 184, 0.28);
  color: #94a3b8;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.66rem;
  font-weight: 700;
  line-height: 1;
}

.nano-map-layer-item.selected .nano-map-layer-kbd {
  border-color: rgba(76, 230, 163, 0.55);
  color: #4ce6a3;
  background: rgba(16, 185, 129, 0.2);
}

.nano-map-layer-check {
  color: #4ce6a3;
}

/* Bottom-Right HUD Stack: Compass + Locate Crosshair */
.nano-map-hud-right-stack {
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.nano-map-circle-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(148, 163, 184, 0.26);
  background: rgba(15, 20, 30, 0.86);
  backdrop-filter: blur(10px);
  color: #cbd5e1;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.55);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}

.nano-map-circle-btn:hover,
.nano-map-circle-btn.active {
  color: #4ce6a3;
  border-color: rgba(76, 230, 163, 0.65);
  background: rgba(15, 23, 42, 0.96);
}

.nano-map-circle-btn.is-locating {
  color: #38bdf8;
  border-color: rgba(56, 189, 248, 0.75);
}

.nano-map-compass-rotor {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Bottom-Left Metric Scale Bar Pill (e.g. 500 m |_______|) */
.nano-map-scale-pill {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 11px;
  border-radius: 8px;
  background: rgba(15, 30, 46, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.24);
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.42);
  pointer-events: none;
}

.nano-map-scale-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: #f8fafc;
  white-space: nowrap;
  line-height: 1;
}

.nano-map-scale-bracket {
  display: inline-block;
  height: 6px;
  border-bottom: 2px solid #ffffff;
  border-left: 2px solid #ffffff;
  border-right: 2px solid #ffffff;
  box-sizing: border-box;
  transition: width 0.15s ease;
}
</style>
