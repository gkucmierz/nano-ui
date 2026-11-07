<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';
import NanoMap from '../../components/NanoMap.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoSlider from '../../components/NanoSlider.vue';
import NanoIcon from '../../components/NanoIcon.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import {
  DEFAULT_MAP_LAYERS,
  evaluatePolylineCursor
} from '../../utils/map-engine.js';
import { createDocTabs } from '../docSnippets.js';
import { t } from '../../locales.js';

const activeLayer = ref('osm-dark');
const mapZoom = ref(13);
const mapBearing = ref(0);
const mapCenter = ref([50.292, 18.785]);
const routeProgressPct = ref(42);
const followGps = ref(false);
const isSimulating = ref(false);

// Configurable HUD Layer Toggles (pure map element)
const showLayerPicker = ref(true);
const showZoomControls = ref(true);
const showScaleBar = ref(true);
const showCompass = ref(true);
const showLocateControl = ref(true);
const showSecondTrack = ref(false);
const showGeoJsonZone = ref(true);
const useSimulatedGps = ref(true);
const activeTrackId = ref('primary-route');

const sampleGeoJson = computed(() => {
  if (!showGeoJsonZone.value) return null;
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          id: 'zone-silesia-corridor',
          name: 'Silesia DTŚ Sector (RFC 7946 GeoJSON Polygon)',
          color: '#38bdf8',
          fillColor: '#38bdf8',
          fillOpacity: 0.16,
          strokeWidth: 2
        },
        geometry: {
          type: 'Polygon',
          // RFC 7946 GeoJSON standard: [longitude, latitude]
          coordinates: [
            [
              [18.742, 50.308],
              [18.838, 50.308],
              [18.838, 50.282],
              [18.742, 50.282],
              [18.742, 50.308]
            ]
          ]
        }
      }
    ]
  };
});

const primaryCoords = [
  [50.2945, 18.6658],
  [50.2962, 18.6912],
  [50.2981, 18.7204],
  [50.3018, 18.7515],
  [50.3025, 18.7742],
  [50.2934, 18.7988],
  [50.2908, 18.8285],
  [50.2924, 18.8641],
  [50.2865, 18.8942],
  [50.2782, 18.9214]
];

const secondaryLoopCoords = [
  [50.2782, 18.9214],
  [50.2649, 19.0238],
  [50.2512, 18.9614],
  [50.2384, 18.8842],
  [50.2255, 18.8312],
  [50.2468, 18.7541],
  [50.2742, 18.6924],
  [50.2945, 18.6658]
];

const primaryWaypoints = [
  { id: 'wp-1', lat: 50.2945, lon: 18.6658, label: '01 • West Terminal (0.0 km)', color: '#e6bd4c', radius: 4.5 },
  { id: 'wp-2', lat: 50.2981, lon: 18.7204, label: '02 • North Junction (4.2 km)', color: '#e6bd4c', radius: 4.5 },
  { id: 'wp-3', lat: 50.3018, lon: 18.7515, label: '03 • Central Overpass (6.8 km)', color: '#e6bd4c', radius: 4.5 },
  { id: 'wp-4', lat: 50.3025, lon: 18.7742, label: '04 • Valley Bridge (8.5 km)', color: '#e6bd4c', radius: 4.5 },
  { id: 'wp-5', lat: 50.2908, lon: 18.8285, label: '05 • Expressway Sector (13.1 km)', color: '#e6bd4c', radius: 4.5 },
  { id: 'wp-6', lat: 50.2865, lon: 18.8942, label: '06 • East Interchange (18.4 km)', color: '#e6bd4c', radius: 4.5 },
  { id: 'wp-7', lat: 50.2782, lon: 18.9214, label: '07 • Finish Checkpoint (23.0 km)', color: '#10b981', radius: 5.5 }
];

const secondaryWaypoints = [
  { id: 'swp-1', lat: 50.2649, lon: 19.0238, label: 'L1 • Katowice South (8.4 km)', color: '#e66b4c', radius: 4.5 },
  { id: 'swp-2', lat: 50.2384, lon: 18.8842, label: 'L2 • Mikołów Ridge (18.9 km)', color: '#e66b4c', radius: 4.5 },
  { id: 'swp-3', lat: 50.2468, lon: 18.7541, label: 'L3 • Knurów Forest (27.6 km)', color: '#e66b4c', radius: 4.5 }
];

function selectActiveTrack(trackId) {
  if (trackId === 'secondary-loop' && !showSecondTrack.value) {
    showSecondTrack.value = true;
  }
  activeTrackId.value = trackId;
}

function onToggleSecondTrack(val) {
  showSecondTrack.value = val;
  if (!val && activeTrackId.value === 'secondary-loop') {
    activeTrackId.value = 'primary-route';
  }
}

const activeCoords = computed(() =>
  activeTrackId.value === 'secondary-loop' && showSecondTrack.value
    ? secondaryLoopCoords
    : primaryCoords
);

const cursorEval = computed(() => {
  return evaluatePolylineCursor(activeCoords.value, routeProgressPct.value / 100);
});

const liveActivePoint = computed(() => {
  if (!useSimulatedGps.value) return null;
  return {
    lat: cursorEval.value.lat,
    lon: cursorEval.value.lon,
    heading: cursorEval.value.headingDeg,
    color: activeTrackId.value === 'secondary-loop' ? '#f43f5e' : '#38bdf8',
    radius: 7.5
  };
});

const activeWaypoints = computed(() =>
  showSecondTrack.value
    ? [...primaryWaypoints, ...secondaryWaypoints]
    : primaryWaypoints
);

const sampleTracks = computed(() => {
  const list = [
    {
      id: 'primary-route',
      name: 'Primary Route',
      color: '#e6bd4c',
      width: activeTrackId.value === 'primary-route' ? 5.5 : 4.2,
      opacity: activeTrackId.value === 'primary-route' ? 0.92 : 0.65,
      progress: activeTrackId.value === 'primary-route' ? routeProgressPct.value / 100 : 1,
      points: primaryCoords,
      distanceKm: 22.97
    }
  ];
  if (showSecondTrack.value) {
    list.push({
      id: 'secondary-loop',
      name: 'Extended Loop',
      color: '#e66b4c',
      secondaryColor: '#e64c8a',
      width: activeTrackId.value === 'secondary-loop' ? 5.5 : 4.2,
      opacity: activeTrackId.value === 'secondary-loop' ? 0.92 : 0.72,
      progress: activeTrackId.value === 'secondary-loop' ? routeProgressPct.value / 100 : 1,
      points: secondaryLoopCoords,
      distanceKm: 34.8
    });
  }
  return list;
});

let simTimer = null;

function toggleSimulation() {
  isSimulating.value = !isSimulating.value;
  if (isSimulating.value) {
    simTimer = setInterval(() => {
      routeProgressPct.value = (routeProgressPct.value + 1) % 101;
    }, 90);
  } else if (simTimer) {
    clearInterval(simTimer);
    simTimer = null;
  }
}

onBeforeUnmount(() => {
  if (simTimer) {
    clearInterval(simTimer);
    simTimer = null;
  }
});

const apiDoc = `// Props
center: Array<[lat, lon]> | Object<{ lat, lon | lng }> (default: [50.2991, 18.6749]) - Map center (v-model:center)
lat: Number (default: undefined) - Optional separate center latitude prop
lon: Number (default: undefined) - Optional separate center longitude prop
zoom: Number (default: 13) - Continuous Web Mercator zoom level (v-model:zoom)
minZoom: Number (default: 2) - Minimum allowed zoom level
maxZoom: Number (default: 19) - Maximum allowed zoom level
bearing: Number (default: 0) - Compass rotation bearing in degrees (v-model:bearing)
layer: String (default: 'osm-dark') - Active tile layer ID (v-model:layer)
layers: Array<LayerDef> (default: DEFAULT_MAP_LAYERS) - Configurable tile layer definitions (keys 1..9)
tracks: Array<{ id, name, color, secondaryColor?, width?, opacity?, progress?, points: Array<[lat, lon] | {lat, lon}> }> - SVG GPS polylines
polygons: Array<{ id?, name?, color?, fillColor?, fillOpacity?, strokeWidth?, points: Array<[lat, lon] | {lat, lon}> }> - Closed shaded area polygons
geojson: Object (default: null) - Standard IETF RFC 7946 GeoJSON FeatureCollection / Feature / Polygon / MultiPolygon ([lon, lat] rings)
markers: Array<{ id?, lat, lon, label?, color?, radius? }> - Waypoint markers rendered on the map
gps: Array<[lat, lon]> | Object<{ lat, lon | lng, heading?, color? }> (default: null) - Reactive GPS position (tuple, object, or null for native device geolocation)
gpsLat: Number (default: undefined) - Optional separate reactive GPS latitude prop
gpsLon: Number (default: undefined) - Optional separate reactive GPS longitude prop
activePoint: Array | Object (default: null) - Alias for :gps (telemetry cursor with optional heading)
followActivePoint: Boolean (default: false) - Lock viewport center to active GPS point (v-model:follow-active-point)
height: Number | String (default: 360) - Map viewport height in px or CSS units
showLayerPicker: Boolean (default: true) - Show top-left tile layer dropdown (hotkeys 1–9)
showZoomControls: Boolean (default: true) - Show top-right + / − zoom buttons
showScaleBar: Boolean (default: true) - Show bottom-left dynamic metric scale bar (m / km)
showCompass: Boolean (default: true) - Show bottom-right rotating compass button (<NanoIcon name="compass" />)
showLocateControl: Boolean (default: true) - Show bottom-right GPS locate button (<NanoIcon name="locate-fixed" />)
requestDeviceGpsOnLocate: Boolean (default: true) - Request navigator.geolocation.getCurrentPosition() when :gps prop is not provided
enableLayerHotkeys: Boolean (default: true) - Enable keyboard shortcuts 1–9 for switching tile layers

// Exposed Methods (ref)
zoomBy(delta: Number) - Increment or decrement zoom level within [minZoom, maxZoom]
resetNorth() - Reset compass bearing to 0° North
fitAllBounds() - Automatically center and zoom viewport to fit all tracks, markers, and GPS points
locateGps() - Center on reactive :gps prop, or request real device GPS via navigator.geolocation, or fall back to fitAllBounds()
requestDeviceGeolocation() - Explicitly query navigator.geolocation.getCurrentPosition()

// Events
@update:center - Emits [lat, lon] tuple when map is panned or recentered
@update:zoom - Emits new numeric zoom level
@update:bearing - Emits new compass bearing angle in degrees
@update:layer - Emits selected layer ID string
@update:followActivePoint - Emits boolean GPS follow lock state
@locate - Emits { source: 'prop' | 'device' | 'bounds', lat, lon, accuracy? } when Locate button is triggered
@locate-error - Emits geolocation error payload if device GPS permission is denied or unavailable
@marker-click - Emits clicked marker object
@polygon-click - Emits clicked normalized polygon / GeoJSON feature object`;

const codeTabs = createDocTabs({
  name: 'NanoMap',
  apiDoc,
  props: {
    'v-model:layer': 'activeLayer',
    'v-model:zoom': 'zoom',
    'v-model:bearing': 'bearing',
    ':layers': 'DEFAULT_MAP_LAYERS',
    ':tracks': 'tracks',
    ':geojson': 'districtGeoJson',
    ':gps': 'gpsPosition',
    ':show-zoom-controls': true,
    ':show-layer-picker': true,
    ':show-scale-bar': true,
    ':show-compass': true,
    ':show-locate-control': true,
  },
  imports: [
    "import { ref } from 'vue';",
    "import { DEFAULT_MAP_LAYERS } from '@gkucmierz/nano-ui';",
    '',
    "const activeLayer = ref('osm-dark');",
    'const zoom = ref(13);',
    'const bearing = ref(0);',
    '',
    '// Coordinate input supports: [lat, lon] tuple, { lat, lon } object, or :gps-lat + :gps-lon props',
    '// Omit :gps (or pass null) to let the Locate button request real device GPS via navigator.geolocation',
    'const gpsPosition = ref([50.2934, 18.7988]);',
    '',
    '// Standard IETF RFC 7946 GeoJSON ([lon, lat] coordinate order) for shaded boundary polygons:',
    'const districtGeoJson = {',
    "  type: 'Feature',",
    "  properties: { name: 'Sector Alpha', color: '#38bdf8', fillOpacity: 0.18 },",
    '  geometry: {',
    "    type: 'Polygon',",
    '    coordinates: [[[18.742, 50.308], [18.838, 50.308], [18.838, 50.282], [18.742, 50.282], [18.742, 50.308]]]',
    '  }',
    '};',
    '',
    'const tracks = [',
    '  {',
    "    id: 'primary-route',",
    "    color: '#e6bd4c',",
    '    width: 5.5,',
    '    progress: 0.42,',
    '    points: [[50.2945, 18.6658], [50.3018, 18.7515], [50.2782, 18.9214]]',
    '  }',
    '];',
  ],
  wrapTemplate: true,
});
</script>

<template>
  <div class="doc-page">
    <div class="doc-header">
      <h2>{{ t('mapDoc.title') }}</h2>
      <p>{{ t('mapDoc.subtitle') }}</p>
    </div>

    <div class="map-demo-grid">
      <!-- Pure Interactive NanoMap Element -->
      <div class="map-stage-col">
        <NanoMap
          v-model:center="mapCenter"
          v-model:zoom="mapZoom"
          v-model:bearing="mapBearing"
          v-model:layer="activeLayer"
          v-model:follow-active-point="followGps"
          :height="380"
          :layers="DEFAULT_MAP_LAYERS"
          :tracks="sampleTracks"
          :geojson="sampleGeoJson"
          :markers="activeWaypoints"
          :gps="liveActivePoint"
          :show-layer-picker="showLayerPicker"
          :show-zoom-controls="showZoomControls"
          :show-scale-bar="showScaleBar"
          :show-compass="showCompass"
          :show-locate-control="showLocateControl"
          :enable-layer-hotkeys="true"
        />
      </div>

      <!-- Interactive HUD Layer & Telemetry Controls -->
      <div class="nano-card map-controls-card">
        <div class="controls-header">
          <div class="controls-title-row">
            <NanoIcon name="sliders" :size="16" />
            <h3>{{ t('mapDoc.hudConfigTitle') }}</h3>
          </div>
          <!-- Zero-layout-shift button using 1-cell CSS Grid label stack -->
          <button
            type="button"
            class="nano-btn nano-btn-sm sim-toggle-btn"
            :class="{ 'nano-btn-primary': isSimulating }"
            @click="toggleSimulation"
          >
            <span class="btn-label-stack">
              <span :class="{ 'is-hidden': isSimulating }">
                <NanoIcon name="play" :size="13" />
                <span>{{ t('mapDoc.startSim') }}</span>
              </span>
              <span :class="{ 'is-hidden': !isSimulating }">
                <NanoIcon name="pause" :size="13" />
                <span>{{ t('mapDoc.pauseSim') }}</span>
              </span>
            </span>
          </button>
        </div>

        <div class="switches-grid">
          <NanoSwitch v-model="showZoomControls" size="compact" :label="t('mapDoc.toggleZoom')" />
          <NanoSwitch v-model="showLayerPicker" size="compact" :label="t('mapDoc.toggleLayerPicker')" />
          <NanoSwitch v-model="showScaleBar" size="compact" :label="t('mapDoc.toggleScaleBar')" />
          <NanoSwitch v-model="showCompass" size="compact" :label="t('mapDoc.toggleCompass')" />
          <NanoSwitch v-model="showLocateControl" size="compact" :label="t('mapDoc.toggleLocate')" />
          <NanoSwitch
            :model-value="showSecondTrack"
            size="compact"
            :label="t('mapDoc.toggleSecondTrack')"
            @update:model-value="onToggleSecondTrack"
          />
          <NanoSwitch v-model="useSimulatedGps" size="compact" :label="t('mapDoc.toggleSimulatedGps')" />
          <NanoSwitch v-model="followGps" size="compact" :label="t('mapDoc.toggleFollow')" />
        </div>

        <!-- Route Selector (always rendered at fixed height so UI never jumps) -->
        <div class="track-selector-block">
          <span class="track-selector-label">{{ t('mapDoc.activeTrackLabel') }}</span>
          <div class="track-pills-row">
            <button
              type="button"
              class="track-pill-btn"
              :class="{ active: activeTrackId === 'primary-route' }"
              @click="selectActiveTrack('primary-route')"
            >
              <span class="track-dot" style="background: #e6bd4c"></span>
              <span>{{ t('mapDoc.trackPrimary') }}</span>
            </button>
            <button
              type="button"
              class="track-pill-btn"
              :class="{ active: activeTrackId === 'secondary-loop' && showSecondTrack }"
              @click="selectActiveTrack('secondary-loop')"
            >
              <span class="track-dot" style="background: linear-gradient(135deg, #e66b4c, #e64c8a)"></span>
              <span>{{ t('mapDoc.trackLoop') }}</span>
            </button>
          </div>
        </div>

        <div class="sliders-stack">
          <NanoSlider
            v-model="routeProgressPct"
            :min="0"
            :max="100"
            :step="1"
            size="sm"
            :label="t('mapDoc.routeProgress')"
            :format-value="(v) => `${v}%`"
          />

          <NanoSlider
            v-model="mapZoom"
            :min="4"
            :max="18"
            :step="0.5"
            size="sm"
            :label="t('mapDoc.zoomLevel')"
            :format-value="(v) => `${v.toFixed(1)}x`"
          />

          <NanoSlider
            v-model="mapBearing"
            :min="-180"
            :max="180"
            :step="5"
            size="sm"
            :label="t('mapDoc.bearingAngle')"
            :format-value="(v) => `${v}°`"
          />
        </div>
      </div>
    </div>

    <!-- Standardized 3-Tab API Reference, Usage & Granular Import Block -->
    <NanoCodeBlock :tabs="codeTabs" />
  </div>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.doc-header h2 {
  margin: 0 0 0.4rem;
  font-size: 1.75rem;
  font-weight: 700;
}

.doc-header p {
  margin: 0;
  color: var(--nano-text-muted);
  line-height: 1.55;
}

.map-demo-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(320px, 1fr);
  gap: 1.25rem;
  align-items: start;
}

@media (max-width: 960px) {
  .map-demo-grid {
    grid-template-columns: 1fr;
  }
}

.map-controls-card {
  padding: 1.15rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.controls-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.controls-title-row {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.controls-title-row h3 {
  margin: 0;
  font-size: 0.94rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sim-toggle-btn {
  flex-shrink: 0;
}

.btn-label-stack {
  display: inline-grid;
  align-items: center;
  justify-items: center;
}

.btn-label-stack > span {
  grid-area: 1 / 1;
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  white-space: nowrap;
}

.btn-label-stack > span.is-hidden {
  visibility: hidden;
  pointer-events: none;
}

.switches-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem 0.75rem;
}

.track-selector-block {
  display: flex;
  flex-direction: column;
  gap: 0.42rem;
  padding-top: 0.55rem;
  border-top: 1px solid var(--nano-border);
}

.track-selector-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--nano-text-muted);
}

.track-pills-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.track-pill-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.42rem;
  padding: 0.38rem 0.55rem;
  border-radius: 8px;
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.14));
  background: var(--nano-bg-muted, rgba(255, 255, 255, 0.04));
  color: var(--nano-text-muted);
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.track-pill-btn:hover {
  color: var(--nano-text-main);
  border-color: var(--nano-border-hover, rgba(255, 255, 255, 0.28));
}

.track-pill-btn.active {
  color: var(--nano-text-main);
  border-color: var(--nano-state-active, #00f2fe);
  background: color-mix(in srgb, var(--nano-state-active, #00f2fe) 12%, transparent);
}

.track-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sliders-stack {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding-top: 0.55rem;
  border-top: 1px solid var(--nano-border);
}
</style>
