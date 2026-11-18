<script setup>
import { ref, computed, onMounted } from 'vue';
import NanoPanorama360 from '../../components/NanoPanorama360.vue';
import NanoSelect from '../../components/NanoSelect.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { createDocTabs } from '../docSnippets.js';
import { PANORAMA_SHOWCASE_SHADERS } from './panoramaShowcaseShaders.js';

const presetMode = ref('equirect-2x1');
const enableWasd = ref(true);
const equirectDataUrl = ref('');
const portraitDataUrl = ref('');

const presetOptions = [
  {
    value: 'shader-aurora',
    label: 'GLSL #035 — Zorza Polarna nad Fiordem 360° (Proceduralny Shader Playground)',
  },
  {
    value: 'shader-kerr',
    label: 'GLSL #017 — Czarna Dziura Kerra 360° (Soczewkowanie Grawitacyjne GR)',
  },
  {
    value: 'shader-gyroid',
    label: 'GLSL #006 — Bioluminescencyjny Labirynt Gyroidu 360° (Raymarching TPMS)',
  },
  {
    value: 'equirect-2x1',
    label: 'Raster 2:1 Equirectangular (1200×600 — Pełna sfera 360°×180°)',
  },
  {
    value: 'portrait-9x16',
    label: 'Raster 9:16 Portrait (540×960 — Adaptacyjna czasza W:H bez rozciągania)',
  },
];

const shaderMap = new Map(PANORAMA_SHOWCASE_SHADERS.map((s) => [s.id, s]));

const activeShader = computed(() => shaderMap.get(presetMode.value) || null);

const activePanoramaSrc = computed(() => {
  if (activeShader.value) return '';
  return presetMode.value === 'equirect-2x1' ? equirectDataUrl.value : portraitDataUrl.value;
});

const activeTitle = computed(() => {
  if (activeShader.value) {
    return `CH ${activeShader.value.channel} · ${activeShader.value.title}`;
  }
  return presetMode.value === 'equirect-2x1'
    ? '2:1 Equirectangular Sphere'
    : '9:16 Portrait Adaptive Dome';
});

const activeSubtitle = computed(() => {
  if (activeShader.value) return activeShader.value.subtitle;
  return 'Kliknij kadr i użyj Strzałek / WASD (płynny rozpęd ~100 ms + bezwładne wyhamowanie) lub przeciągnij myszą';
});

const activeInitialPitch = computed(() => (activeShader.value ? activeShader.value.initialPitch : 0));
const activeInitialFov = computed(() => (activeShader.value ? activeShader.value.initialFov : 75));
const activeAutoRotate = computed(() => (activeShader.value ? activeShader.value.autoRotate : false));

function selectShaderCard(id) {
  presetMode.value = id;
}

function buildProceduralPanoramaDataUrl(width, height) {
  if (!globalThis.document) return '';
  const c = globalThis.document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  if (!ctx) return '';

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#0b1930');
  grad.addColorStop(0.48, '#1e4d7b');
  grad.addColorStop(0.51, '#0f2820');
  grad.addColorStop(1, '#091418');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Latitude & longitude graticule lines + horizon markers
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.28)';
  ctx.lineWidth = 1.5;
  const cols = 12;
  const rows = 6;
  for (let i = 0; i <= cols; i++) {
    const x = (i / cols) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let j = 1; j < rows; j++) {
    const y = (j / rows) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 26px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  const labels = ['N · 0°', 'E · 90°', 'S · 180°', 'W · 270°'];
  labels.forEach((lbl, idx) => {
    const x = ((idx * 0.25 + 0.5) % 1) * width;
    ctx.fillText(lbl, x, height * 0.46);
  });

  return c.toDataURL('image/jpeg', 0.88);
}

onMounted(() => {
  equirectDataUrl.value = buildProceduralPanoramaDataUrl(1200, 600);
  portraitDataUrl.value = buildProceduralPanoramaDataUrl(540, 960);
});

const docTabs = createDocTabs({
  componentName: 'NanoPanorama360',
  template: `<NanoPanorama360
  src="/media/2026-11-15/insta360-panorama.jpg"
  title="Insta360 X3 — Park Śląski"
  subtitle="4992×2496 (2:1 Equirectangular 360°)"
  stage-aspect-ratio="2:1"
  :wasd="true"
  :accel-ms="100"
  :decel-ms="165"
/>`,
  script: `import { NanoPanorama360 } from '@gkucmierz/nano-ui';`,
  api: {
    props: [
      'src: String - Panorama image URL (prefers 2:1 equirectangular; adapts cleanly to any W:H)',
      'fragmentShader: String (default: "") - Optional custom WebGL fragment shader hook (0 B preset overhead in lib)',
      'wasd: Boolean (default: false) - Enables kinematic WASD camera thrusters alongside Arrow keys when focused',
      'keyboardSpeed: Number (default: 84) - Steady cruising angular velocity (deg/s at 75° FOV; Shift = 1.65×)',
      'accelMs: Number (default: 100) - Smooth C¹ acceleration ramp time (~100 ms to 90% cruise speed)',
      'decelMs: Number (default: 165) - Smooth kinematic release deceleration glide time (ms)',
      'stageAspectRatio: String | Number (default: "2:1") - Preferred viewport aspect ratio',
      'projectionMode: String (default: "auto") - "auto" | "force-sphere" | "adaptive-dome" | "tiny-planet"',
      'autoRotate: Boolean (default: true) - Gentle continuous spherical yaw rotation',
    ],
    events: [
      'load - Emitted with { width, height, projection } once image or custom shader resolves',
      'camera-change - Emitted with { yawDeg, pitchDeg, fovDeg }',
      'fullscreen-change - Emitted with Boolean fullscreen state',
    ],
  },
});
</script>

<template>
  <section class="doc-section">
    <h2>NanoPanorama360 — Sferyczny Podgląd 360° (Kinetyka C¹ + Sceny GLSL)</h2>
    <p class="doc-lead">
      Natywny sferyczny projektor WebGL ray-casting dla zdjęć <code>360°</code> (np.
      <code>Insta360 X3</code> <code>4992×2496</code>) oraz lekkich proceduralnych światów
      <code>GLSL</code> przekazywanych z zewnątrz przez <code>:fragment-shader</code> (presety poniżej
      żyją wyłącznie w kodzie playgroundu — <code>0 B</code> narzutu w paczce biblioteki).
    </p>

    <div class="np360-shader-deck" role="group" aria-label="Wybór proceduralnego świata 360° GLSL">
      <button
        v-for="sh in PANORAMA_SHOWCASE_SHADERS"
        :key="sh.id"
        type="button"
        class="np360-shader-card"
        :class="{ 'is-selected': presetMode === sh.id }"
        :style="{ '--sh-accent': sh.accent }"
        :aria-pressed="presetMode === sh.id ? 'true' : 'false'"
        @click="selectShaderCard(sh.id)"
      >
        <div class="np360-shader-card-top">
          <span class="np360-ch-pill">CH {{ sh.channel }}</span>
          <span class="np360-tag-pill">{{ sh.badge }}</span>
          <span class="np360-kb-pill">{{ sh.kbLabel }}</span>
        </div>
        <div class="np360-shader-card-title">{{ sh.title }}</div>
        <div class="np360-shader-card-sub">{{ sh.subtitle }}</div>
      </button>
    </div>

    <div class="demo-toolbar np360-demo-controls">
      <div class="np360-select-col">
        <span class="np360-ctrl-label">Źródło sceny (3× GLSL Playground + 2× Raster W:H)</span>
        <NanoSelect v-model="presetMode" :options="presetOptions" />
      </div>

      <label class="np360-wasd-toggle">
        <NanoSwitch v-model="enableWasd" />
        <span class="np360-wasd-copy">
          <strong>Opcja <code>:wasd="true"</code> + Kinetyka C¹</strong>
          <small>Rozpęd ~100 ms → stały przelot → płynne wyhamowanie (Strzałki / WASD / Shift)</small>
        </span>
      </label>
    </div>

    <NanoPanorama360
      :src="activePanoramaSrc"
      :fragment-shader="activeShader ? activeShader.glsl : ''"
      :title="activeTitle"
      :subtitle="activeSubtitle"
      :initial-pitch="activeInitialPitch"
      :initial-fov="activeInitialFov"
      :auto-rotate="activeAutoRotate"
      :wasd="enableWasd"
    />

    <div style="margin-top: 18px;">
      <NanoCodeBlock :tabs="docTabs" />
    </div>
  </section>
</template>

<style scoped>
.np360-shader-deck {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.np360-shader-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-card);
  color: var(--nano-text-main);
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
  transition: border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease;
}

.np360-shader-card:hover {
  border-color: var(--sh-accent, #38bdf8);
  background: var(--nano-bg-hover);
}

.np360-shader-card.is-selected {
  border-color: var(--sh-accent, #38bdf8);
  box-shadow: inset 0 0 0 1px var(--sh-accent, #38bdf8);
  background: var(--nano-bg-hover);
}

.np360-shader-card-top {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  width: 100%;
}

.np360-ch-pill {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  border-radius: 5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.68rem;
  font-weight: 700;
  color: #0f172a;
  background: var(--sh-accent, #38bdf8);
}

.np360-tag-pill {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--nano-text-secondary);
}

.np360-kb-pill {
  margin-left: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.68rem;
  color: var(--nano-text-muted);
}

.np360-shader-card-title {
  font-size: 0.88rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--nano-text-main);
}

.np360-shader-card-sub {
  font-size: 0.75rem;
  line-height: 1.38;
  color: var(--nano-text-secondary);
}

.np360-demo-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
}

.np360-select-col {
  flex: 1 1 340px;
  max-width: 520px;
}

.np360-ctrl-label {
  display: block;
  font-size: 0.78rem;
  margin-bottom: 6px;
  font-weight: 600;
  color: var(--nano-text-main);
}

.np360-wasd-toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-card);
  color: var(--nano-text-main);
  cursor: pointer;
  user-select: none;
  box-sizing: border-box;
  transition: border-color 0.16s ease, background-color 0.16s ease;
}

.np360-wasd-toggle:hover {
  border-color: var(--nano-border-hover);
  background: var(--nano-bg-hover);
}

.np360-wasd-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.25;
}

.np360-wasd-copy strong {
  font-size: 0.8rem;
  color: var(--nano-text-main);
}

.np360-wasd-copy small {
  font-size: 0.71rem;
  color: var(--nano-text-secondary);
}
</style>
