<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { tooltipDirective as vTooltip } from '../directives/tooltip.js';
import {
  IDEAL_PANORAMA_ASPECT_RATIO,
  DEFAULT_TINY_PLANET_HORIZON_RADIUS,
  DEFAULT_PANORAMA_KEYBOARD_SPEED_DEG,
  DEFAULT_PANORAMA_ACCEL_MS,
  DEFAULT_PANORAMA_DECEL_MS,
  resolvePanoramaProjectionMeta,
  clampPanoramaCameraState,
  projectViewPixelToPanoramaUv,
  formatCompassHeading,
  normalizePanoramaKeyToken,
  isPanoramaNavigationKey,
  resolvePanoramaKeyInputVector,
  stepPanoramaKinematics,
} from '../utils/panorama360.js';

const VERTEX_SHADER_SRC = `
attribute vec2 a_pos;
varying vec2 v_ndc;
void main() {
  v_ndc = a_pos;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SRC = `
precision highp float;
varying vec2 v_ndc;
uniform sampler2D u_tex;
uniform float u_yaw;
uniform float u_pitch;
uniform float u_tanHalfFov;
uniform float u_fovDeg;
uniform float u_aspect;
uniform float u_imgAspect;
uniform float u_hSpan;
uniform float u_vSpan;
uniform float u_wrapYaw;
uniform float u_projType;
uniform float u_planetRadius;

void main() {
  if (u_projType > 1.5) {
    float rot = -u_yaw;
    float zoomScale = u_fovDeg / 75.0;
    float panY = (u_pitch / 1.5707963) * 0.35;
    float px = v_ndc.x * 0.5 * u_aspect * zoomScale;
    float py = (-v_ndc.y * 0.5 * zoomScale) + panY;
    float cr = cos(rot);
    float sr = sin(rot);
    float rx = px * cr - py * sr;
    float ry = px * sr + py * cr;
    float uFlat = 0.5 + rx / max(0.2, u_imgAspect);
    float vFlat = 0.5 + ry;
    if (uFlat < 0.0 || uFlat > 1.0 || vFlat < 0.0 || vFlat > 1.0) {
      gl_FragColor = vec4(0.03, 0.05, 0.1, 1.0);
      return;
    }
    gl_FragColor = texture2D(u_tex, vec2(uFlat, vFlat));
    return;
  }

  float cp = cos(u_pitch);
  float sp = sin(u_pitch);
  float cy = cos(u_yaw);
  float sy = sin(u_yaw);

  vec3 fwd = vec3(sy * cp, sp, cy * cp);
  vec3 right = vec3(cy, 0.0, -sy);
  vec3 up = vec3(-sy * sp, cp, -cy * sp);

  vec3 ray = normalize(
    fwd +
    (v_ndc.x * u_tanHalfFov * u_aspect) * right +
    (v_ndc.y * u_tanHalfFov) * up
  );

  if (u_projType > 0.5) {
    float k = u_planetRadius / max(0.12, 1.0 - ray.y);
    float uPlanet = 0.5 + (k * ray.x) / max(0.2, u_imgAspect);
    float vPlanet = 0.5 + k * ray.z;
    if (uPlanet < 0.0 || uPlanet > 1.0 || vPlanet < 0.0 || vPlanet > 1.0) {
      gl_FragColor = vec4(0.03, 0.05, 0.1, 1.0);
      return;
    }
    gl_FragColor = texture2D(u_tex, vec2(uPlanet, vPlanet));
    return;
  }

  float lon = atan(ray.x, ray.z);
  float lat = asin(clamp(ray.y, -1.0, 1.0));

  float u = 0.5 + lon / u_hSpan;
  if (u_wrapYaw > 0.5) {
    u = fract(u);
  }
  float v = 0.5 - lat / u_vSpan;

  if ((u_wrapYaw < 0.5 && (u < 0.0 || u > 1.0)) || v < 0.0 || v > 1.0) {
    gl_FragColor = vec4(0.03, 0.05, 0.1, 1.0);
    return;
  }

  gl_FragColor = texture2D(u_tex, vec2(clamp(u, 0.0, 1.0), clamp(v, 0.0, 1.0)));
}
`;

const props = defineProps({
  src: {
    type: String,
    default: '',
  },
  alt: {
    type: String,
    default: 'Panorama 360°',
  },
  title: {
    type: String,
    default: '',
  },
  subtitle: {
    type: String,
    default: '',
  },
  stageAspectRatio: {
    type: [Number, String],
    default: '2:1',
  },
  projectionMode: {
    type: String,
    default: 'auto', // 'auto' | 'force-sphere' | 'adaptive-dome' | 'tiny-planet' | 'tiny-planet-flat'
  },
  planetHorizonRadius: {
    type: Number,
    default: DEFAULT_TINY_PLANET_HORIZON_RADIUS,
  },
  initialYaw: {
    type: Number,
    default: 0,
  },
  initialPitch: {
    type: Number,
    default: 0,
  },
  initialFov: {
    type: Number,
    default: 75,
  },
  autoRotate: {
    type: Boolean,
    default: true,
  },
  autoRotateSpeed: {
    type: Number,
    default: 4.5, // deg / sec
  },
  wasd: {
    type: Boolean,
    default: false,
  },
  keyboardSpeed: {
    type: Number,
    default: DEFAULT_PANORAMA_KEYBOARD_SPEED_DEG,
  },
  accelMs: {
    type: Number,
    default: DEFAULT_PANORAMA_ACCEL_MS,
  },
  decelMs: {
    type: Number,
    default: DEFAULT_PANORAMA_DECEL_MS,
  },
  fragmentShader: {
    type: String,
    default: '',
  },
  animateShader: {
    type: Boolean,
    default: true,
  },
  showHud: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['load', 'error', 'camera-change', 'fullscreen-change']);

const stageRef = ref(null);
const canvasRef = ref(null);
const isLoaded = ref(false);
const loadError = ref('');
const naturalDims = ref({ width: 0, height: 0 });
const modeOverride = ref('');

const yawDeg = ref(props.initialYaw);
const pitchDeg = ref(props.initialPitch);
const fovDeg = ref(props.initialFov);
const isDragging = ref(false);
const isAutoRotating = ref(Boolean(props.autoRotate));
const isNativeFullscreen = ref(false);
const isCssFullscreen = ref(false);
const isFullscreen = computed(() => isNativeFullscreen.value || isCssFullscreen.value);
const stageBounds = ref({ width: 960, height: 480 });

let loadedImageEl = null;
let glCtx = null;
let glProgram = null;
let glPosBuf = null;
let glTexture = null;
let glUniforms = null;
let rafId = null;
let lastTickMs = 0;
let shaderEpochMs = 0;
let velYaw = 0;
let velPitch = 0;
let velFov = 0;
let activePointerId = null;
let lastPointerX = 0;
let lastPointerY = 0;
let lastPointerMoveMs = 0;
let autoRotateDir = 1;
let resizeObserver = null;
const pressedKeys = new Set();

const hasCustomShader = computed(() => Boolean(props.fragmentShader && props.fragmentShader.trim()));

const isTinyPlanetProp = computed(
  () => props.projectionMode === 'tiny-planet' || props.projectionMode === 'tiny-planet-flat'
);

const effectiveProjectionMode = computed(() =>
  hasCustomShader.value ? 'force-sphere' : modeOverride.value || props.projectionMode || 'auto'
);

const projectionMeta = computed(() => {
  const base = resolvePanoramaProjectionMeta(naturalDims.value.width, naturalDims.value.height, {
    projectionMode: effectiveProjectionMode.value,
    preferredStageRatio: props.stageAspectRatio,
    planetHorizonRadius: props.planetHorizonRadius,
  });
  if (hasCustomShader.value) {
    return {
      ...base,
      isPreferredRatio: true,
      ratioBadge: 'GLSL · 360°×180°',
    };
  }
  return base;
});

const stageCssVars = computed(() => {
  const ratio = projectionMeta.value.stageAspectRatio || IDEAL_PANORAMA_ASPECT_RATIO;
  return {
    '--np360-stage-aspect': `${ratio} / 1`,
  };
});

const compassText = computed(() => formatCompassHeading(yawDeg.value));

function applyClampedCamera(nextYaw, nextPitch, nextFov) {
  const viewAspect =
    stageBounds.value.height > 0
      ? stageBounds.value.width / stageBounds.value.height
      : IDEAL_PANORAMA_ASPECT_RATIO;
  const clamped = clampPanoramaCameraState(
    { yawDeg: nextYaw, pitchDeg: nextPitch, fovDeg: nextFov },
    projectionMeta.value,
    viewAspect
  );
  yawDeg.value = clamped.yawDeg;
  pitchDeg.value = clamped.pitchDeg;
  fovDeg.value = clamped.fovDeg;
  emit('camera-change', clamped);
}

function compilePanoramaProgram(gl, customFragSrc = '') {
  if (!gl) return false;
  const compileShader = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  };

  const vs = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
  const fragSource = customFragSrc && customFragSrc.trim() ? customFragSrc : FRAGMENT_SHADER_SRC;
  const fs = compileShader(gl.FRAGMENT_SHADER, fragSource);
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    return false;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteProgram(prog);
    return false;
  }

  if (glProgram) {
    gl.deleteProgram(glProgram);
  }
  glProgram = prog;
  glUniforms = {
    aPos: gl.getAttribLocation(prog, 'a_pos'),
    uTex: gl.getUniformLocation(prog, 'u_tex'),
    uYaw: gl.getUniformLocation(prog, 'u_yaw'),
    uPitch: gl.getUniformLocation(prog, 'u_pitch'),
    uTanHalfFov: gl.getUniformLocation(prog, 'u_tanHalfFov'),
    uFovDeg: gl.getUniformLocation(prog, 'u_fovDeg'),
    uAspect: gl.getUniformLocation(prog, 'u_aspect'),
    uImgAspect: gl.getUniformLocation(prog, 'u_imgAspect'),
    uHSpan: gl.getUniformLocation(prog, 'u_hSpan'),
    uVSpan: gl.getUniformLocation(prog, 'u_vSpan'),
    uWrapYaw: gl.getUniformLocation(prog, 'u_wrapYaw'),
    uProjType: gl.getUniformLocation(prog, 'u_projType'),
    uPlanetRadius: gl.getUniformLocation(prog, 'u_planetRadius'),
    uTime: gl.getUniformLocation(prog, 'u_time'),
    uResolution: gl.getUniformLocation(prog, 'u_resolution'),
  };
  return true;
}

function initWebGlPipeline(canvas) {
  if (!canvas) return false;
  let gl = null;
  try {
    gl =
      canvas.getContext('webgl', { antialias: true, alpha: false, preserveDrawingBuffer: false }) ||
      canvas.getContext('experimental-webgl');
  } catch {
    gl = null;
  }
  if (!gl) return false;

  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  glCtx = gl;
  glPosBuf = posBuf;
  return compilePanoramaProgram(gl, props.fragmentShader);
}

function uploadWebGlTexture(img) {
  if (!glCtx || !img) return;
  const gl = glCtx;
  if (glTexture) {
    gl.deleteTexture(glTexture);
  }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  glTexture = tex;
}

function syncCanvasResolution() {
  const canvas = canvasRef.value;
  const stage = stageRef.value;
  if (!canvas || !stage) return;
  const rect = stage.getBoundingClientRect?.();
  const cssW = Math.max(240, Math.round(rect?.width || stage.clientWidth || 960));
  const cssH = Math.max(140, Math.round(rect?.height || stage.clientHeight || 480));
  stageBounds.value = { width: cssW, height: cssH };
  const dpr = Math.min(2, Number(globalThis.window?.devicePixelRatio) || 1);
  const targetW = Math.round(cssW * dpr);
  const targetH = Math.round(cssH * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
}

function render2dFallback(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = '#070d19';
  ctx.fillRect(0, 0, w, h);
  if (!loadedImageEl) return;

  const meta = projectionMeta.value;
  const viewAspect = h > 0 ? w / h : IDEAL_PANORAMA_ASPECT_RATIO;
  const center = projectViewPixelToPanoramaUv(0, 0, {
    yawDeg: yawDeg.value,
    pitchDeg: pitchDeg.value,
    fovDeg: fovDeg.value,
    viewAspect,
    meta,
  });

  const imgW = loadedImageEl.naturalWidth || w;
  const imgH = loadedImageEl.naturalHeight || h;
  const fracH = Math.min(1, fovDeg.value / Math.max(1, meta.vSpanDeg));
  const fracW = Math.min(1, (fovDeg.value * viewAspect) / Math.max(1, meta.hSpanDeg));
  const cropW = Math.max(32, imgW * fracW);
  const cropH = Math.max(32, imgH * fracH);
  const sx = Math.max(0, Math.min(imgW - cropW, center.u * imgW - cropW * 0.5));
  const sy = Math.max(0, Math.min(imgH - cropH, center.v * imgH - cropH * 0.5));
  ctx.drawImage(loadedImageEl, sx, sy, cropW, cropH, 0, 0, w, h);
}

function nowClockMs() {
  return globalThis.performance?.now ? globalThis.performance.now() : Date.now();
}

function renderFrame(nowMs = nowClockMs()) {
  const canvas = canvasRef.value;
  if (!canvas || !isLoaded.value) return;
  syncCanvasResolution();

  if (glCtx && glProgram && (hasCustomShader.value || glTexture)) {
    const gl = glCtx;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(glProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, glPosBuf);
    if (glUniforms.aPos >= 0) {
      gl.enableVertexAttribArray(glUniforms.aPos);
      gl.vertexAttribPointer(glUniforms.aPos, 2, gl.FLOAT, false, 0, 0);
    }

    if (glTexture && glUniforms.uTex !== null) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, glTexture);
      gl.uniform1i(glUniforms.uTex, 0);
    }

    const deg2rad = Math.PI / 180;
    const meta = projectionMeta.value;
    const aspect = canvas.height > 0 ? canvas.width / canvas.height : IDEAL_PANORAMA_ASPECT_RATIO;
    const projType =
      meta.mode === 'tiny-planet-flat' ? 2.0 : meta.mode === 'tiny-planet-unwrap' ? 1.0 : 0.0;
    if (!shaderEpochMs) shaderEpochMs = nowMs;
    const elapsedSec = Math.max(0, (nowMs - shaderEpochMs) / 1000);

    gl.uniform1f(glUniforms.uYaw, yawDeg.value * deg2rad);
    gl.uniform1f(glUniforms.uPitch, pitchDeg.value * deg2rad);
    gl.uniform1f(glUniforms.uTanHalfFov, Math.tan((fovDeg.value * 0.5) * deg2rad));
    gl.uniform1f(glUniforms.uFovDeg, fovDeg.value);
    gl.uniform1f(glUniforms.uAspect, aspect);
    gl.uniform1f(glUniforms.uImgAspect, meta.imageAspect || IDEAL_PANORAMA_ASPECT_RATIO);
    gl.uniform1f(glUniforms.uHSpan, meta.hSpanDeg * deg2rad);
    gl.uniform1f(glUniforms.uVSpan, meta.vSpanDeg * deg2rad);
    gl.uniform1f(glUniforms.uWrapYaw, meta.wrapYaw ? 1.0 : 0.0);
    gl.uniform1f(glUniforms.uProjType, projType);
    gl.uniform1f(
      glUniforms.uPlanetRadius,
      meta.planetHorizonRadius || DEFAULT_TINY_PLANET_HORIZON_RADIUS
    );
    if (glUniforms.uTime !== null) {
      gl.uniform1f(glUniforms.uTime, elapsedSec);
    }
    if (glUniforms.uResolution !== null) {
      gl.uniform2f(glUniforms.uResolution, canvas.width, canvas.height);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    return;
  }

  render2dFallback(canvas);
}

function stopLoop() {
  if (rafId !== null && globalThis.cancelAnimationFrame) {
    globalThis.cancelAnimationFrame(rafId);
    rafId = null;
  }
  lastTickMs = 0;
}

function ensureLoop() {
  if (rafId !== null || !globalThis.requestAnimationFrame) {
    renderFrame();
    return;
  }
  const step = (nowMs) => {
    rafId = null;
    const dtSec = lastTickMs > 0 ? Math.min(0.06, Math.max(0.001, (nowMs - lastTickMs) / 1000)) : 1 / 60;
    lastTickMs = nowMs;

    const keyInput = resolvePanoramaKeyInputVector(pressedKeys, { wasd: props.wasd });
    const viewAspect =
      stageBounds.value.height > 0
        ? stageBounds.value.width / stageBounds.value.height
        : IDEAL_PANORAMA_ASPECT_RATIO;

    let needsNext = Boolean(hasCustomShader.value && props.animateShader);
    if (!isDragging.value) {
      if (
        keyInput.isActive ||
        Math.abs(velYaw) > 0 ||
        Math.abs(velPitch) > 0 ||
        Math.abs(velFov) > 0
      ) {
        const next = stepPanoramaKinematics(
          {
            yawDeg: yawDeg.value,
            pitchDeg: pitchDeg.value,
            fovDeg: fovDeg.value,
            velYaw,
            velPitch,
            velFov,
          },
          keyInput,
          dtSec,
          {
            meta: projectionMeta.value,
            viewAspect,
            keyboardSpeed: props.keyboardSpeed,
            accelMs: props.accelMs,
            decelMs: props.decelMs,
          }
        );
        velYaw = next.velYaw;
        velPitch = next.velPitch;
        velFov = next.velFov;
        if (
          next.yawDeg !== yawDeg.value ||
          next.pitchDeg !== pitchDeg.value ||
          next.fovDeg !== fovDeg.value
        ) {
          yawDeg.value = next.yawDeg;
          pitchDeg.value = next.pitchDeg;
          fovDeg.value = next.fovDeg;
          emit('camera-change', {
            yawDeg: next.yawDeg,
            pitchDeg: next.pitchDeg,
            fovDeg: next.fovDeg,
          });
        }
        if (next.isMoving) {
          needsNext = true;
        }
      } else if (isAutoRotating.value && props.autoRotateSpeed > 0) {
        const meta = projectionMeta.value;
        const delta = props.autoRotateSpeed * autoRotateDir * dtSec;
        const prevYaw = yawDeg.value;
        applyClampedCamera(prevYaw + delta, pitchDeg.value, fovDeg.value);
        if (!meta.wrapYaw && Math.abs(yawDeg.value - prevYaw) < 1e-4) {
          autoRotateDir *= -1;
        }
        needsNext = true;
      }
    } else {
      needsNext = true;
    }

    renderFrame(nowMs);
    if (needsNext && isLoaded.value) {
      rafId = globalThis.requestAnimationFrame(step);
    } else {
      lastTickMs = 0;
    }
  };
  rafId = globalThis.requestAnimationFrame(step);
}

async function activateShaderSource(glslSource) {
  stopLoop();
  loadError.value = '';
  naturalDims.value = { width: 4096, height: 2048 };
  isLoaded.value = true;
  shaderEpochMs = nowClockMs();
  await nextTick();
  syncCanvasResolution();
  if (canvasRef.value) {
    if (!glCtx) {
      initWebGlPipeline(canvasRef.value);
    } else {
      compilePanoramaProgram(glCtx, glslSource);
    }
  }
  const meta = projectionMeta.value;
  applyClampedCamera(props.initialYaw, props.initialPitch, props.initialFov || meta.defaultFovDeg);
  emit('load', {
    width: 4096,
    height: 2048,
    projection: meta,
  });
  ensureLoop();
}

function loadPanoramaSource(url) {
  if (hasCustomShader.value) {
    activateShaderSource(props.fragmentShader);
    return;
  }
  stopLoop();
  isLoaded.value = false;
  loadError.value = '';
  if (!url || !globalThis.Image) return;

  const img = new globalThis.Image();
  img.crossOrigin = 'anonymous';
  img.onload = async () => {
    if (hasCustomShader.value) return;
    loadedImageEl = img;
    naturalDims.value = {
      width: img.naturalWidth || img.width || 4096,
      height: img.naturalHeight || img.height || 2048,
    };
    isLoaded.value = true;
    await nextTick();
    syncCanvasResolution();
    if (!glCtx && canvasRef.value) {
      initWebGlPipeline(canvasRef.value);
    } else if (glCtx) {
      compilePanoramaProgram(glCtx, '');
    }
    uploadWebGlTexture(img);
    const meta = projectionMeta.value;
    const startPitch =
      props.initialPitch !== 0
        ? props.initialPitch
        : Number.isFinite(meta.defaultPitchDeg)
          ? meta.defaultPitchDeg
          : 0;
    applyClampedCamera(
      props.initialYaw,
      startPitch,
      props.initialFov || meta.defaultFovDeg
    );
    emit('load', {
      width: naturalDims.value.width,
      height: naturalDims.value.height,
      projection: meta,
    });
    ensureLoop();
  };
  img.onerror = () => {
    if (hasCustomShader.value) return;
    loadError.value = 'Nie udało się wczytać obrazu panoramy 360°.';
    emit('error', { src: url });
  };
  img.src = url;
}

function handlePointerDown(e) {
  if (e.button !== undefined && e.button !== 0) return;
  stageRef.value?.focus?.({ preventScroll: true });
  isDragging.value = true;
  isAutoRotating.value = false;
  activePointerId = e.pointerId;
  lastPointerX = e.clientX;
  lastPointerY = e.clientY;
  lastPointerMoveMs = nowClockMs();
  velYaw = 0;
  velPitch = 0;
  e.currentTarget?.setPointerCapture?.(e.pointerId);
  ensureLoop();
}

function handlePointerMove(e) {
  if (!isDragging.value || (activePointerId !== null && e.pointerId !== activePointerId)) return;
  const nowP = nowClockMs();
  const dtP = Math.min(0.08, Math.max(0.004, (nowP - lastPointerMoveMs) / 1000));
  lastPointerMoveMs = nowP;

  const dx = e.clientX - lastPointerX;
  const dy = e.clientY - lastPointerY;
  lastPointerX = e.clientX;
  lastPointerY = e.clientY;

  const h = Math.max(180, stageBounds.value.height);
  const degPerPx = fovDeg.value / h;
  const dYaw = -dx * degPerPx;
  const dPitch = dy * degPerPx;

  const instVelYaw = Math.max(-520, Math.min(520, (dYaw / dtP) * 0.55));
  const instVelPitch = Math.max(-420, Math.min(420, (dPitch / dtP) * 0.55));
  velYaw = velYaw * 0.35 + instVelYaw * 0.65;
  velPitch = velPitch * 0.35 + instVelPitch * 0.65;
  applyClampedCamera(yawDeg.value + dYaw, pitchDeg.value + dPitch, fovDeg.value);
  renderFrame(nowP);
}

function handlePointerUp(e) {
  if (!isDragging.value) return;
  isDragging.value = false;
  if (nowClockMs() - lastPointerMoveMs > 80) {
    velYaw = 0;
    velPitch = 0;
  }
  if (activePointerId !== null) {
    e.currentTarget?.releasePointerCapture?.(activePointerId);
  }
  activePointerId = null;
  ensureLoop();
}

function handleWheel(e) {
  const step = e.deltaY > 0 ? 4.2 : -4.2;
  velFov = Math.max(-180, Math.min(180, velFov + step * 5.2));
  applyClampedCamera(yawDeg.value, pitchDeg.value, fovDeg.value + step * 0.3);
  ensureLoop();
}

function adjustZoom(deltaFov) {
  velFov = Math.max(-180, Math.min(180, velFov + deltaFov * 5.6));
  applyClampedCamera(yawDeg.value, pitchDeg.value, fovDeg.value + deltaFov * 0.32);
  ensureLoop();
}

function clearPressedKeys() {
  if (pressedKeys.size === 0) return;
  pressedKeys.clear();
  ensureLoop();
}

function handleVisibilityChange() {
  if (globalThis.document?.hidden) {
    clearPressedKeys();
  }
}

function handleStageFocusOut(e) {
  if (!stageRef.value?.contains?.(e?.relatedTarget)) {
    clearPressedKeys();
  }
}

function resetCamera() {
  pressedKeys.clear();
  velYaw = 0;
  velPitch = 0;
  velFov = 0;
  const meta = projectionMeta.value;
  const startPitch =
    props.initialPitch !== 0
      ? props.initialPitch
      : Number.isFinite(meta.defaultPitchDeg)
        ? meta.defaultPitchDeg
        : 0;
  applyClampedCamera(props.initialYaw, startPitch, meta.defaultFovDeg);
  renderFrame();
}

function toggleAutoRotate() {
  isAutoRotating.value = !isAutoRotating.value;
  if (isAutoRotating.value) {
    ensureLoop();
  }
}

function toggleProjectionOverride() {
  if (isTinyPlanetProp.value || projectionMeta.value.isTinyPlanetSource) {
    modeOverride.value =
      effectiveProjectionMode.value === 'tiny-planet-flat' ? 'tiny-planet' : 'tiny-planet-flat';
    const meta = projectionMeta.value;
    const nextPitch = Number.isFinite(meta.defaultPitchDeg) ? meta.defaultPitchDeg : 0;
    applyClampedCamera(yawDeg.value, nextPitch, meta.defaultFovDeg);
    ensureLoop();
    return;
  }
  modeOverride.value =
    effectiveProjectionMode.value === 'force-sphere' ? 'adaptive-dome' : 'force-sphere';
  const meta = projectionMeta.value;
  applyClampedCamera(yawDeg.value, pitchDeg.value, meta.defaultFovDeg);
  ensureLoop();
}

async function enterFullscreen() {
  const el = stageRef.value;
  const doc = globalThis.document;
  if (!el || !doc) return false;
  if (isFullscreen.value) return true;

  if (el.requestFullscreen) {
    try {
      await el.requestFullscreen();
      isNativeFullscreen.value = Boolean(doc.fullscreenElement === el);
      if (isNativeFullscreen.value) {
        syncCanvasResolution();
        renderFrame();
        return true;
      }
    } catch {
      // Fallback to CSS fixed fullscreen (e.g. iOS Safari or non-gesture host)
    }
  }

  isCssFullscreen.value = true;
  await nextTick();
  syncCanvasResolution();
  renderFrame();
  return true;
}

async function exitFullscreen() {
  const el = stageRef.value;
  const doc = globalThis.document;
  if (isCssFullscreen.value) {
    isCssFullscreen.value = false;
    await nextTick();
    syncCanvasResolution();
    renderFrame();
    return;
  }
  if (doc?.fullscreenElement === el) {
    try {
      await doc.exitFullscreen?.();
    } catch {
      isNativeFullscreen.value = false;
    }
    syncCanvasResolution();
    renderFrame();
  }
}

async function toggleFullscreen() {
  if (isFullscreen.value) {
    await exitFullscreen();
  } else {
    await enterFullscreen();
  }
}

function handleFullscreenChange() {
  isNativeFullscreen.value = Boolean(globalThis.document?.fullscreenElement === stageRef.value);
  syncCanvasResolution();
  renderFrame();
}

watch(isFullscreen, () => {
  emit('fullscreen-change', isFullscreen.value);
});

function handleKeydown(e) {
  if (e.key === 'Escape' && isCssFullscreen.value) {
    e.preventDefault();
    e.stopPropagation();
    exitFullscreen();
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    e.stopPropagation();
    toggleFullscreen();
    return;
  }
  if (e.key === '0') {
    e.preventDefault();
    e.stopPropagation();
    resetCamera();
    return;
  }

  const tok = normalizePanoramaKeyToken(e);
  if (tok === 'shift') {
    pressedKeys.add('shift');
    return;
  }

  if (isPanoramaNavigationKey(e, { wasd: props.wasd })) {
    e.preventDefault();
    e.stopPropagation();
    if (e.shiftKey) pressedKeys.add('shift');
    else pressedKeys.delete('shift');
    if (e.repeat) return;
    pressedKeys.add(tok);
    if (tok !== 'zoomin' && tok !== 'zoomout') {
      isAutoRotating.value = false;
    }
    ensureLoop();
  }
}

function handleKeyup(e) {
  const tok = normalizePanoramaKeyToken(e);
  if (tok) {
    pressedKeys.delete(tok);
  }
  if (!e.shiftKey) {
    pressedKeys.delete('shift');
  }
  if (isPanoramaNavigationKey(e, { wasd: props.wasd })) {
    e.stopPropagation();
    ensureLoop();
  }
}

watch(
  () => props.wasd,
  (enabled) => {
    if (!enabled) {
      pressedKeys.delete('keyw');
      pressedKeys.delete('keya');
      pressedKeys.delete('keys');
      pressedKeys.delete('keyd');
      ensureLoop();
    }
  }
);

watch(
  () => props.fragmentShader,
  (nextShader) => {
    modeOverride.value = '';
    pressedKeys.clear();
    velYaw = 0;
    velPitch = 0;
    velFov = 0;
    if (nextShader && nextShader.trim()) {
      activateShaderSource(nextShader);
    } else {
      loadPanoramaSource(props.src);
    }
  }
);

watch(
  () => props.src,
  (nextUrl) => {
    modeOverride.value = '';
    if (!hasCustomShader.value) {
      loadPanoramaSource(nextUrl);
    }
  }
);

watch(
  () => props.projectionMode,
  () => {
    modeOverride.value = '';
    const meta = projectionMeta.value;
    const nextPitch = Number.isFinite(meta.defaultPitchDeg) ? meta.defaultPitchDeg : pitchDeg.value;
    applyClampedCamera(yawDeg.value, nextPitch, meta.defaultFovDeg);
    renderFrame();
  }
);

onMounted(() => {
  if (globalThis.document) {
    globalThis.document.addEventListener('fullscreenchange', handleFullscreenChange);
    globalThis.document.addEventListener('visibilitychange', handleVisibilityChange);
  }
  if (globalThis.window) {
    globalThis.window.addEventListener('blur', clearPressedKeys);
  }
  if (stageRef.value && globalThis.ResizeObserver) {
    resizeObserver = new globalThis.ResizeObserver(() => {
      syncCanvasResolution();
      renderFrame();
    });
    resizeObserver.observe(stageRef.value);
  }
  if (hasCustomShader.value) {
    activateShaderSource(props.fragmentShader);
  } else {
    loadPanoramaSource(props.src);
  }
});

onBeforeUnmount(() => {
  pressedKeys.clear();
  stopLoop();
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (globalThis.document) {
    globalThis.document.removeEventListener('fullscreenchange', handleFullscreenChange);
    globalThis.document.removeEventListener('visibilitychange', handleVisibilityChange);
  }
  if (globalThis.window) {
    globalThis.window.removeEventListener('blur', clearPressedKeys);
  }
  if (glCtx) {
    if (glTexture) glCtx.deleteTexture(glTexture);
    if (glPosBuf) glCtx.deleteBuffer(glPosBuf);
    if (glProgram) glCtx.deleteProgram(glProgram);
    glCtx = null;
  }
});

defineExpose({
  enterFullscreen,
  exitFullscreen,
  toggleFullscreen,
  resetCamera,
  isFullscreen,
  stageRef,
});
</script>

<template>
  <div
    ref="stageRef"
    class="nano-panorama-360"
    :class="{
      'is-dragging': isDragging,
      'is-fullscreen': isFullscreen,
      'is-css-fullscreen': isCssFullscreen,
    }"
    :style="stageCssVars"
    tabindex="0"
    role="region"
    :aria-label="alt"
    @keydown="handleKeydown"
    @keyup="handleKeyup"
    @focusout="handleStageFocusOut"
  >
    <canvas
      ref="canvasRef"
      class="np360-canvas"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
      @dblclick="toggleFullscreen"
      @wheel.prevent="handleWheel"
    />

    <!-- Single flex HUD top bar (BAR-COLLISION-01 & CSS-HOVER-01 compliant) -->
    <div v-if="showHud" class="hud-top-bar np360-hud-bar" @pointerdown.stop>
      <div class="np360-hud-meta">
        <span class="np360-badge is-compass">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" stroke="none" />
          </svg>
          {{ compassText }}
        </span>
        <span
          class="np360-badge"
          :class="{ 'is-optimal-2x1': projectionMeta.isPreferredRatio || projectionMeta.isTinyPlanetSource }"
          v-tooltip="projectionMeta.isTinyPlanetSource ? 'Odwrotna projekcja stereograficzna Małej Planety (Insta360) z zachowaniem natywnego aspectRatio' : projectionMeta.isPreferredRatio ? 'Optymalne odwzorowanie walcowo-równoodległe 2:1 (pełna sfera 360°×180°)' : 'Adaptacyjne odwzorowanie zachowujące natywne proporcje zdjęcia bez rozciągania'"
        >
          {{ projectionMeta.ratioBadge }}
        </span>
        <span v-if="title" class="np360-title-text">{{ title }}</span>
      </div>

      <div class="np360-hud-actions">
        <button
          v-if="isLoaded && (isTinyPlanetProp || projectionMeta.isTinyPlanetSource)"
          type="button"
          class="np360-btn"
          :class="{ 'is-active': effectiveProjectionMode !== 'tiny-planet-flat' }"
          v-tooltip="'Przełącz między rozwiniętym wnętrzem sfery 3D a widokiem Małej Planety'"
          @click="toggleProjectionOverride"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <ellipse cx="12" cy="12" rx="4" ry="9" />
            <line x1="3" y1="12" x2="21" y2="12" />
          </svg>
          <span>{{ effectiveProjectionMode === 'tiny-planet-flat' ? 'Mała Planeta' : 'Wnętrze 3D' }}</span>
        </button>

        <button
          v-else-if="isLoaded && !projectionMeta.isPreferredRatio"
          type="button"
          class="np360-btn"
          :class="{ 'is-active': effectiveProjectionMode === 'force-sphere' }"
          v-tooltip="'Przełącz między wiernymi proporcjami wycinka a pełną sferą 2:1'"
          @click="toggleProjectionOverride"
        >
          {{ effectiveProjectionMode === 'force-sphere' ? 'Sfera 2:1' : 'Proporcje W:H' }}
        </button>

        <button
          type="button"
          class="np360-btn"
          :class="{ 'is-active': isAutoRotating }"
          v-tooltip="'Auto-obrót panoramy'"
          @click="toggleAutoRotate"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <polyline points="21 3 21 9 15 9" />
          </svg>
          <span>Auto</span>
        </button>

        <button type="button" class="np360-btn is-icon" v-tooltip="'Przybliż (+)'" @click="adjustZoom(-6)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button type="button" class="np360-btn is-icon" v-tooltip="'Oddal (−)'" @click="adjustZoom(6)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button type="button" class="np360-btn" v-tooltip="'Wyzeruj kadr (0)'" @click="resetCamera">
          Reset
        </button>
        <button
          type="button"
          class="np360-btn is-icon"
          :class="{ 'is-active': isFullscreen }"
          v-tooltip="isFullscreen ? 'Zamknij pełny ekran (ESC / F)' : 'Pełny ekran (F)'"
          @click="toggleFullscreen"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="subtitle && isLoaded" class="np360-bottom-caption">
      <span>{{ subtitle }}</span>
      <span class="np360-hint">
        {{ wasd ? 'Mysz / Strzałki / WASD · Zoom FOV' : 'Mysz / Strzałki · Zoom FOV' }}
        ({{ Math.round(fovDeg) }}°)
      </span>
    </div>

    <div v-if="!isLoaded && !loadError" class="np360-overlay-state">
      <span>Ładowanie sfery 360°…</span>
    </div>
    <div v-if="loadError" class="np360-overlay-state is-error">
      <span>{{ loadError }}</span>
    </div>
  </div>
</template>

<style scoped>
.nano-panorama-360 {
  position: relative;
  width: 100%;
  aspect-ratio: var(--np360-stage-aspect, 2 / 1);
  min-height: 260px;
  max-height: 82vh;
  border-radius: 14px;
  overflow: hidden;
  background: #070d19;
  border: 1px solid rgba(148, 163, 184, 0.22);
  user-select: none;
  touch-action: none;
  cursor: grab;
  outline: none;
}

.nano-panorama-360:focus-visible {
  border-color: rgba(56, 189, 248, 0.75);
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.28);
}

.nano-panorama-360.is-dragging {
  cursor: grabbing;
}

.nano-panorama-360.is-fullscreen {
  width: 100vw;
  height: 100vh;
  max-height: none;
  aspect-ratio: auto;
  border-radius: 0;
  border: none;
}

.nano-panorama-360.is-css-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 99999;
}

.np360-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.np360-hud-bar {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  pointer-events: none;
}

.np360-hud-meta,
.np360-hud-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  pointer-events: auto;
}

.np360-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 10px;
  box-sizing: border-box;
  border-radius: 8px;
  background: rgba(8, 15, 28, 0.88);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(148, 163, 184, 0.36);
  color: #f8fafc;
  font-size: 0.74rem;
  font-weight: 600;
  line-height: 1;
  box-shadow: 0 2px 8px rgba(2, 6, 23, 0.42);
  text-shadow: 0 1px 2px rgba(2, 6, 23, 0.55);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.np360-badge.is-optimal-2x1 {
  border-color: rgba(52, 211, 153, 0.62);
  color: #a7f3d0;
}

.np360-title-text {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 10px;
  box-sizing: border-box;
  border-radius: 8px;
  background: rgba(8, 15, 28, 0.88);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(148, 163, 184, 0.32);
  color: #f8fafc;
  font-size: 0.76rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(2, 6, 23, 0.42);
  text-shadow: 0 1px 2px rgba(2, 6, 23, 0.55);
  max-width: 280px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.np360-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 32px;
  padding: 0 10px;
  box-sizing: border-box;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.36);
  background: rgba(8, 15, 28, 0.88);
  backdrop-filter: blur(8px);
  color: #f1f5f9;
  font-size: 0.74rem;
  font-weight: 600;
  line-height: 1;
  box-shadow: 0 2px 8px rgba(2, 6, 23, 0.42);
  text-shadow: 0 1px 2px rgba(2, 6, 23, 0.55);
  cursor: pointer;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.np360-btn.is-icon {
  width: 32px;
  padding: 0;
}

.np360-btn:hover {
  background: rgba(12, 34, 62, 0.94);
  border-color: rgba(56, 189, 248, 0.88);
  color: #f0f9ff;
}

.np360-btn.is-active {
  background: rgba(8, 47, 73, 0.92);
  border-color: rgba(56, 189, 248, 0.92);
  color: #f0f9ff;
  box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.26), 0 2px 10px rgba(2, 6, 23, 0.48);
  text-shadow: 0 1px 2px rgba(2, 6, 23, 0.65);
}

.np360-btn.is-active svg {
  color: #38bdf8;
}

.np360-bottom-caption {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 10px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(8, 15, 28, 0.88);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(148, 163, 184, 0.32);
  color: #f8fafc;
  font-size: 0.74rem;
  box-shadow: 0 2px 8px rgba(2, 6, 23, 0.42);
  text-shadow: 0 1px 2px rgba(2, 6, 23, 0.55);
  pointer-events: none;
}

.np360-hint {
  color: #cbd5e1;
  font-size: 0.7rem;
}

.np360-overlay-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 0.85rem;
  font-weight: 600;
  pointer-events: none;
}

.np360-overlay-state.is-error {
  color: #fca5a5;
}

@media (max-width: 640px) {
  .nano-panorama-360 {
    aspect-ratio: 16 / 10;
  }
  .np360-title-text {
    display: none;
  }
}
</style>
