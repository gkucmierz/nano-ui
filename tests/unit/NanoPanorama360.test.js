import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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
  isPanoramaNavigationKey,
  resolvePanoramaKeyInputVector,
  stepPanoramaKinematics,
} from '../../src/utils/panorama360.js';
import { PANORAMA_SHOWCASE_SHADERS } from '../../src/playground/docs/panoramaShowcaseShaders.js';
import { getWcagContrastRatio } from '../../src/utils/colors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sfcPath = resolve(__dirname, '../../src/components/NanoPanorama360.vue');
const utilPath = resolve(__dirname, '../../src/utils/panorama360.js');
const docPath = resolve(__dirname, '../../src/playground/docs/Panorama360Doc.vue');
const modalPath = resolve(__dirname, '../../src/components/NanoModal.vue');
const tooltipPath = resolve(__dirname, '../../src/components/GlobalTooltip.vue');
const indexPath = resolve(__dirname, '../../src/index.js');

const compositeOverWhiteSky = (r, g, b, alpha) => {
  const blend = (ch) => Math.round(ch * alpha + 255 * (1 - alpha));
  return `rgb(${blend(r)}, ${blend(g)}, ${blend(b)})`;
};

describe('NanoPanorama360 Spherical 2:1 Equirectangular, Tiny-Planet & Adaptive Aspect-Ratio Engine', () => {
  it('prefers 2:1 (width:height) equirectangular full-sphere mapping for 4992x2496 Insta360 photos', () => {
    assert.equal(IDEAL_PANORAMA_ASPECT_RATIO, 2);
    const meta = resolvePanoramaProjectionMeta(4992, 2496);
    assert.equal(meta.isPreferredRatio, true);
    assert.equal(meta.mode, 'equirect-sphere');
    assert.equal(meta.wrapYaw, true);
    assert.equal(meta.hSpanDeg, 360);
    assert.equal(meta.vSpanDeg, 180);
    assert.equal(meta.stageAspectRatio, 2);
  });

  it('preserves isotropic pixel aspect ratio without vertical stretching for wide cylindrical (4:1) and portrait (9:16) images', () => {
    const wideCyl = resolvePanoramaProjectionMeta(6000, 1500);
    assert.equal(wideCyl.isPreferredRatio, false);
    assert.equal(wideCyl.mode, 'cylindrical-360');
    assert.equal(wideCyl.wrapYaw, true);
    assert.equal(wideCyl.hSpanDeg, 360);
    assert.equal(wideCyl.vSpanDeg, 90);

    const portrait = resolvePanoramaProjectionMeta(1080, 1920);
    assert.equal(portrait.isPreferredRatio, false);
    assert.equal(portrait.mode, 'adaptive-dome');
    assert.equal(portrait.wrapYaw, false);
    const angularRatio = portrait.hSpanDeg / portrait.vSpanDeg;
    assert.ok(
      Math.abs(angularRatio - 1080 / 1920) < 0.02,
      `Expected isotropic angular ratio ~0.5625, got ${angularRatio}`
    );

    const forcedSphere = resolvePanoramaProjectionMeta(1080, 1920, {
      projectionMode: 'force-sphere',
    });
    assert.equal(forcedSphere.mode, 'equirect-sphere');
    assert.equal(forcedSphere.wrapYaw, true);
    assert.equal(forcedSphere.hSpanDeg, 360);
    assert.equal(forcedSphere.vSpanDeg, 180);
  });

  it('unwraps Insta360 Stereographic Tiny Planet photos conformally with isotropic pixel circles across non-square exports', () => {
    const planetMeta = resolvePanoramaProjectionMeta(1440, 1920, {
      projectionMode: 'tiny-planet',
      planetHorizonRadius: DEFAULT_TINY_PLANET_HORIZON_RADIUS,
    });
    assert.equal(planetMeta.mode, 'tiny-planet-unwrap');
    assert.equal(planetMeta.isTinyPlanetSource, true);
    assert.equal(planetMeta.wrapYaw, true);

    // Nadir ray (pitch = -90°) maps straight to image center (0.5, 0.5)
    const nadirUv = projectViewPixelToPanoramaUv(0, 0, {
      yawDeg: 0,
      pitchDeg: -90,
      fovDeg: 74,
      viewAspect: 2,
      meta: planetMeta,
    });
    assert.ok(Math.abs(nadirUv.u - 0.5) < 1e-6);
    assert.ok(Math.abs(nadirUv.v - 0.5) < 1e-6);

    // Horizon North (yaw = 0°, pitch = 0°) and Horizon East (yaw = 90°, pitch = 0°)
    // must lie at identical physical pixel radius R_px = R_h * H on non-square 1440x1920 export!
    const northHorizon = projectViewPixelToPanoramaUv(0, 0, {
      yawDeg: 0,
      pitchDeg: 0,
      fovDeg: 74,
      viewAspect: 2,
      meta: planetMeta,
    });
    const eastHorizon = projectViewPixelToPanoramaUv(0, 0, {
      yawDeg: 90,
      pitchDeg: 0,
      fovDeg: 74,
      viewAspect: 2,
      meta: planetMeta,
    });
    const radiusNorthPx = Math.hypot((northHorizon.u - 0.5) * 1440, (northHorizon.v - 0.5) * 1920);
    const radiusEastPx = Math.hypot((eastHorizon.u - 0.5) * 1440, (eastHorizon.v - 0.5) * 1920);
    assert.ok(Math.abs(radiusNorthPx - DEFAULT_TINY_PLANET_HORIZON_RADIUS * 1920) < 1e-3);
    assert.ok(Math.abs(radiusNorthPx - radiusEastPx) < 1e-3);

    const flatPlanetMeta = resolvePanoramaProjectionMeta(1440, 1920, {
      projectionMode: 'tiny-planet-flat',
    });
    assert.equal(flatPlanetMeta.mode, 'tiny-planet-flat');
    const flatCenter = projectViewPixelToPanoramaUv(0, 0, {
      yawDeg: 45,
      pitchDeg: 0,
      fovDeg: 75,
      viewAspect: 2,
      meta: flatPlanetMeta,
    });
    assert.ok(Math.abs(flatCenter.u - 0.5) < 1e-6);
    assert.ok(Math.abs(flatCenter.v - 0.5) < 1e-6);
  });

  it('wraps yaw seamlessly on 360° spheres and clamps camera inside non-360° dome bounds', () => {
    const sphereMeta = resolvePanoramaProjectionMeta(4992, 2496);
    const wrapped = clampPanoramaCameraState(
      { yawDeg: 195, pitchDeg: 92, fovDeg: 75 },
      sphereMeta,
      2
    );
    assert.equal(wrapped.yawDeg, -165);
    assert.ok(wrapped.pitchDeg <= 85);

    const portraitMeta = resolvePanoramaProjectionMeta(1080, 1920);
    const clamped = clampPanoramaCameraState(
      { yawDeg: 140, pitchDeg: -120, fovDeg: 90 },
      portraitMeta,
      2
    );
    assert.ok(Math.abs(clamped.yawDeg) <= portraitMeta.hSpanDeg / 2);
    assert.ok(Math.abs(clamped.pitchDeg) <= portraitMeta.vSpanDeg / 2);
  });

  it('projects screen center and cardinal yaw rays accurately onto panorama UV coordinates', () => {
    const sphereMeta = resolvePanoramaProjectionMeta(4992, 2496);
    const centerUv = projectViewPixelToPanoramaUv(0, 0, {
      yawDeg: 0,
      pitchDeg: 0,
      fovDeg: 75,
      viewAspect: 2,
      meta: sphereMeta,
    });
    assert.equal(centerUv.inBounds, true);
    assert.ok(Math.abs(centerUv.u - 0.5) < 1e-6);
    assert.ok(Math.abs(centerUv.v - 0.5) < 1e-6);

    const eastUv = projectViewPixelToPanoramaUv(0, 0, {
      yawDeg: 90,
      pitchDeg: 0,
      fovDeg: 75,
      viewAspect: 2,
      meta: sphereMeta,
    });
    assert.ok(Math.abs(eastUv.u - 0.75) < 1e-6);
    assert.ok(Math.abs(eastUv.v - 0.5) < 1e-6);
    assert.equal(formatCompassHeading(0), '0° N');
    assert.equal(formatCompassHeading(90), '90° E');
    assert.equal(formatCompassHeading(-90), '270° W');
  });

  it('exports NanoPanorama360 cleanly with zero raw typeof and stationary hover styles', () => {
    const sfc = readFileSync(sfcPath, 'utf8');
    const idx = readFileSync(indexPath, 'utf8');
    assert.doesNotMatch(sfc, /\btypeof\b/);
    assert.match(sfc, /aspect-ratio:\s*var\(--np360-stage-aspect,\s*2\s*\/\s*1\)/);
    assert.match(idx, /NanoPanorama360/);
    assert.match(idx, /resolvePanoramaProjectionMeta/);
  });

  it('enforces MEDIA-HUD-CONTRAST-01 (> 10:1 WCAG AAA over bright white sky) and fullscreen API contract on NanoPanorama360', () => {
    const sfc = readFileSync(sfcPath, 'utf8');

    // Active button surface rgba(8, 47, 73, 0.92) + #f0f9ff composited over pure white sky (#ffffff)
    const activeOnWhiteSky = compositeOverWhiteSky(8, 47, 73, 0.92);
    const activeContrast = getWcagContrastRatio(activeOnWhiteSky, '#f0f9ff');
    assert.ok(activeContrast >= 10, `Expected >= 10:1 active HUD contrast on bright sky, got ${activeContrast}`);

    // Default button/badge surface rgba(8, 15, 28, 0.88) + #f1f5f9 composited over pure white sky (#ffffff)
    const baseOnWhiteSky = compositeOverWhiteSky(8, 15, 28, 0.88);
    const baseContrast = getWcagContrastRatio(baseOnWhiteSky, '#f1f5f9');
    assert.ok(baseContrast >= 12, `Expected >= 12:1 base HUD contrast on bright sky, got ${baseContrast}`);

    assert.match(sfc, /\.np360-btn\.is-active\s*\{[\s\S]*rgba\(8,\s*47,\s*73,\s*0\.92\)[\s\S]*color:\s*#f0f9ff/);
    assert.match(sfc, /\.np360-btn\.is-active\s+svg\s*\{\s*color:\s*#38bdf8/);
    assert.match(sfc, /\.np360-btn\s*\{[\s\S]*rgba\(8,\s*15,\s*28,\s*0\.88\)[\s\S]*color:\s*#f1f5f9/);
    assert.doesNotMatch(sfc, /rgba\(14,\s*116,\s*144,\s*0\.34\)/);

    // Fullscreen methods, keyboard shortcuts, canvas dblclick, event & defineExpose contract
    assert.match(sfc, /isCssFullscreen\s*=\s*ref\(false\)/);
    assert.match(sfc, /async function enterFullscreen\(\)/);
    assert.match(sfc, /async function exitFullscreen\(\)/);
    assert.match(sfc, /@dblclick="toggleFullscreen"/);
    assert.match(sfc, /emit\('fullscreen-change',\s*isFullscreen\.value\)/);
    assert.match(
      sfc,
      /defineExpose\(\{\s*enterFullscreen,\s*exitFullscreen,\s*toggleFullscreen,\s*resetCamera,\s*isFullscreen,\s*stageRef,?\s*\}\)/
    );
  });

  it('enforces TOP-LAYER-TELEPORT-01 top-layer host resolution in NanoModal and GlobalTooltip', () => {
    const modalSfc = readFileSync(modalPath, 'utf8');
    const tooltipSfc = readFileSync(tooltipPath, 'utf8');

    assert.doesNotMatch(modalSfc, /\btypeof\b/);
    assert.doesNotMatch(tooltipSfc, /\btypeof\b/);

    // NanoModal: teleportTo prop, activeFullscreenHost, resolvedTeleportTarget, and inner fullscreen Escape guard
    assert.match(modalSfc, /teleportTo:\s*\{\s*type:\s*\[String,\s*Object\],\s*default:\s*undefined\s*\}/);
    assert.match(modalSfc, /activeFullscreenHost\s*=\s*ref\(null\)/);
    assert.match(modalSfc, /props\.teleportTo\s*\|\|\s*activeFullscreenHost\.value\s*\|\|\s*'body'/);
    assert.match(modalSfc, /<Teleport\s+v-if="isMounted"\s+:to="resolvedTeleportTarget">/);
    assert.match(modalSfc, /modalOverlay\.value\.contains\(document\.fullscreenElement\)/);
    assert.match(modalSfc, /modalOverlay\.value\.querySelector\('\.is-css-fullscreen'\)/);

    // GlobalTooltip: dialog[open] || fullscreenElement || 'body' dynamic Teleport host
    assert.match(tooltipSfc, /isMounted\s*=\s*ref\(false\)/);
    assert.match(tooltipSfc, /fullscreenRevision\s*=\s*ref\(0\)/);
    assert.match(tooltipSfc, /getActiveTooltipTarget\(\)\?\.closest\?\.\('dialog\[open\]'\)/);
    assert.match(tooltipSfc, /globalThis\.document\?\.fullscreenElement\s*\|\|\s*'body'/);
    assert.match(tooltipSfc, /<Teleport\s+v-if="isMounted"\s+:to="resolvedTooltipHost">/);
  });

  it('delivers C1-continuous ~100ms acceleration, steady hold cruise, frame-rate-independent integration, and kinematic release glide', () => {
    const meta = resolvePanoramaProjectionMeta(4096, 2048);
    let state = { yawDeg: 0, pitchDeg: 0, fovDeg: 75, velYaw: 0, velPitch: 0, velFov: 0 };
    const holdRight = resolvePanoramaKeyInputVector(['ArrowRight'], { wasd: false });
    assert.equal(holdRight.ux, 1);
    assert.equal(holdRight.uy, 0);

    // 50 ms (~half ramp): smoothly accelerating, well below max cruise speed
    for (let i = 0; i < 5; i++) {
      state = stepPanoramaKinematics(state, holdRight, 0.01, { meta });
    }
    const velAt50ms = state.velYaw;
    assert.ok(velAt50ms > 20 && velAt50ms < DEFAULT_PANORAMA_KEYBOARD_SPEED_DEG * 0.8);

    // 100 ms: reaches ~90% of steady cruising speed (DEFAULT_PANORAMA_ACCEL_MS = 100)
    for (let i = 0; i < 5; i++) {
      state = stepPanoramaKinematics(state, holdRight, 0.01, { meta });
    }
    const expected90 = DEFAULT_PANORAMA_KEYBOARD_SPEED_DEG * 0.9;
    assert.ok(
      Math.abs(state.velYaw - expected90) < 1.5,
      `Expected ~90% cruise (${expected90} deg/s) at 100ms, got ${state.velYaw}`
    );

    // 400 ms held: steady constant cruising speed
    for (let i = 0; i < 30; i++) {
      state = stepPanoramaKinematics(state, holdRight, 0.01, { meta });
    }
    assert.ok(Math.abs(state.velYaw - DEFAULT_PANORAMA_KEYBOARD_SPEED_DEG) < 0.2);
    const yawAtRelease = state.yawDeg;

    // Release key: smooth kinematic deceleration glide without snapping or reversing
    const released = { ux: 0, uy: 0, uz: 0, boost: false };
    let prevVel = state.velYaw;
    for (let i = 0; i < 60; i++) {
      state = stepPanoramaKinematics(state, released, 0.01, {
        meta,
        accelMs: DEFAULT_PANORAMA_ACCEL_MS,
        decelMs: DEFAULT_PANORAMA_DECEL_MS,
      });
      assert.ok(state.velYaw <= prevVel + 1e-9);
      assert.ok(state.velYaw >= 0);
      prevVel = state.velYaw;
    }
    assert.equal(state.velYaw, 0);
    assert.equal(state.isMoving, false);
    assert.ok(state.yawDeg > yawAtRelease + 2, 'Camera must glide smoothly forward after keyup');

    // Exact analytical integration guarantees 60 Hz vs 240 Hz equivalence (< 0.02 deg)
    const runSim = (hz) => {
      let s = { yawDeg: 0, pitchDeg: 0, fovDeg: 75, velYaw: 0, velPitch: 0, velFov: 0 };
      const dt = 1 / hz;
      const holdSteps = Math.round(0.3 * hz);
      const glideSteps = Math.round(0.4 * hz);
      for (let i = 0; i < holdSteps; i++) s = stepPanoramaKinematics(s, holdRight, dt, { meta });
      for (let i = 0; i < glideSteps; i++) s = stepPanoramaKinematics(s, released, dt, { meta });
      return s.yawDeg;
    };
    assert.ok(Math.abs(runSim(60) - runSim(240)) < 0.02);
  });

  it('supports opt-in WASD navigation with 1/sqrt(2) diagonal normalization and keeps all 3 GLSL showcase shaders strictly in playground', () => {
    assert.equal(isPanoramaNavigationKey({ code: 'KeyW', key: 'w' }, { wasd: false }), false);
    assert.equal(isPanoramaNavigationKey({ code: 'KeyW', key: 'w' }, { wasd: true }), true);

    const disabledWasd = resolvePanoramaKeyInputVector(['KeyW', 'KeyD'], { wasd: false });
    assert.equal(disabledWasd.isActive, false);

    const diagWasd = resolvePanoramaKeyInputVector(['KeyW', 'KeyD'], { wasd: true });
    assert.equal(diagWasd.isActive, true);
    assert.ok(Math.abs(Math.hypot(diagWasd.ux, diagWasd.uy) - 1) < 1e-9);
    assert.ok(diagWasd.ux > 0.7 && diagWasd.uy > 0.7);

    // PKG-PURITY-01 / Zero Library Bloat: showcase shaders exist ONLY in src/playground
    const sfc = readFileSync(sfcPath, 'utf8');
    const utilJs = readFileSync(utilPath, 'utf8');
    const docVue = readFileSync(docPath, 'utf8');
    assert.doesNotMatch(utilJs, /\btypeof\b/);
    assert.doesNotMatch(docVue, /\btypeof\b/);
    assert.doesNotMatch(sfc, /kerrStarfield|traceAuroraSky|gyroidMap|PANORAMA_SHOWCASE_SHADERS/);
    assert.doesNotMatch(utilJs, /kerrStarfield|traceAuroraSky|gyroidMap|PANORAMA_SHOWCASE_SHADERS/);

    assert.equal(PANORAMA_SHOWCASE_SHADERS.length, 3);
    for (const sh of PANORAMA_SHOWCASE_SHADERS) {
      assert.ok(sh.glsl.includes('gl_FragColor'));
      assert.ok(sh.glsl.includes('computeSphereRay'));
      assert.doesNotMatch(sh.glsl, /#version 300 es|gl_VertexID|dFdx|dFdy/);
      assert.ok(Buffer.byteLength(sh.glsl, 'utf8') < 8500);
    }
  });
});
