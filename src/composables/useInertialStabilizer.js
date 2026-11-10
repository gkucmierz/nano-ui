import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import {
  IDENTITY_QUAT,
  quatNormalize,
  quatConjugate,
  quatMultiply,
  quatSlerp,
  quatFromEulerYXZ,
  quatFromAxisAngle,
  deviceOrientationToQuaternion,
  computeStabilizedWorldQuaternion,
  createInertialStabilizerEngine,
} from '../../../algorithms-app/js/inertial_orientation_stabilizer.js';

export {
  IDENTITY_QUAT,
  quatNormalize,
  quatConjugate,
  quatMultiply,
  quatSlerp,
  quatFromEulerYXZ,
  quatFromAxisAngle,
  deviceOrientationToQuaternion,
  computeStabilizedWorldQuaternion,
  createInertialStabilizerEngine,
};

/**
 * Vue 3 Composable for Inertial 3D World-Space Stabilization ("Horizon & Room Lock" from btc.7u.pl).
 *
 * Keeps a 3D object (Three.js mesh/group) or 2.5D DOM layer stationary in real-world space
 * when the user tilts, rolls, or turns their smartphone/tablet.
 *
 * Features:
 * - iOS 13+ DeviceOrientationEvent.requestPermission() flow (`needsPermission`, `requestPermission()`)
 * - Automatic initial pose calibration (`recalibrate()` on double-tap or button click)
 * - Silky SLERP frame interpolation (`stepFrame()`)
 * - Desktop `Shift + Drag` virtual gyroscope simulator (`simulateOrientationDelta(dx, dy)`)
 *
 * @param {object} [options]
 * @param {boolean} [options.autoStart=true] - Attach window deviceorientation listener on mount
 * @param {number} [options.smoothing=0.18] - SLERP smoothing factor per frame
 * @param {number} [options.gain=1.0] - Stabilization strength (1.0 = 1:1 room-space lock)
 * @param {number} [options.dragSensitivity=0.005] - Manual touch-drag offset sensitivity
 */
export function useInertialStabilizer(options = {}) {
  const isEnabled = ref(options.enabled ?? options.autoStart ?? false);
  const isSupported = ref(
    typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
  );
  const isSensorActive = ref(false);
  const isCalibrated = computed(() => isSensorActive.value);
  const needsPermission = ref(
    typeof window !== 'undefined' &&
      typeof window.DeviceOrientationEvent !== 'undefined' &&
      typeof window.DeviceOrientationEvent.requestPermission === 'function'
  );
  const permissionState = ref(needsPermission.value ? 'prompt' : 'granted');

  const worldQuaternion = ref([0, 0, 0, 1]);
  const tiltDeg = ref({ pitch: 0, yaw: 0, roll: 0 });
  const simulatedAngles = ref({ alpha: 0, beta: 45, gamma: 0 });

  const engine = createInertialStabilizerEngine({
    smoothing: options.smoothing ?? 0.18,
    gain: options.gain ?? 1.0,
    dragSensitivity: options.dragSensitivity ?? 0.005,
  });

  function getScreenOrientationDeg() {
    if (typeof window === 'undefined') return 0;
    if (window.screen?.orientation && typeof window.screen.orientation.angle === 'number') {
      return window.screen.orientation.angle;
    }
    if (typeof window.orientation === 'number') {
      return window.orientation;
    }
    return 0;
  }

  function handleDeviceOrientation(event) {
    if (!isEnabled.value || !event) return;
    if (event.alpha === null && event.beta === null && event.gamma === null) return;
    const accepted = engine.ingestOrientation({
      alpha: event.alpha ?? 0,
      beta: event.beta ?? 0,
      gamma: event.gamma ?? 0,
      screenOrientationDeg: getScreenOrientationDeg(),
    });
    if (accepted) {
      isSensorActive.value = true;
      const res = engine.stepFrame();
      worldQuaternion.value = res.worldQuaternion;
      tiltDeg.value = res.tiltDeg;
    }
  }

  async function requestPermission() {
    if (
      typeof window !== 'undefined' &&
      typeof window.DeviceOrientationEvent !== 'undefined' &&
      typeof window.DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        const res = await window.DeviceOrientationEvent.requestPermission();
        permissionState.value = res;
        needsPermission.value = res !== 'granted';
        if (res === 'granted') {
          isEnabled.value = true;
          attachListeners();
          return true;
        }
        return false;
      } catch {
        permissionState.value = 'denied';
        return false;
      }
    }
    needsPermission.value = false;
    permissionState.value = 'granted';
    isEnabled.value = true;
    attachListeners();
    return true;
  }

  async function enable() {
    return requestPermission();
  }

  function disable() {
    isEnabled.value = false;
    detachListeners();
    worldQuaternion.value = [0, 0, 0, 1];
    tiltDeg.value = { pitch: 0, yaw: 0, roll: 0 };
  }

  async function toggle() {
    if (isEnabled.value) {
      disable();
      return false;
    }
    return enable();
  }

  function setSimulatedAngles({ alpha = 0, beta = 45, gamma = 0 } = {}) {
    simulatedAngles.value = { alpha, beta, gamma };
    engine.ingestOrientation({
      alpha,
      beta,
      gamma,
      screenOrientationDeg: getScreenOrientationDeg(),
    });
    isSensorActive.value = true;
    const res = engine.stepFrame();
    worldQuaternion.value = res.worldQuaternion;
    tiltDeg.value = res.tiltDeg;
  }

  function recalibrate() {
    engine.recalibrate();
    worldQuaternion.value = [0, 0, 0, 1];
    tiltDeg.value = { pitch: 0, yaw: 0, roll: 0 };
  }

  function addDragOffset(deltaXPixels = 0, deltaYPixels = 0) {
    engine.addDragOffset(deltaXPixels, deltaYPixels);
  }

  function simulateOrientationDelta(deltaXPixels = 0, deltaYPixels = 0) {
    simulatedAngles.value.alpha = (simulatedAngles.value.alpha + deltaXPixels * 0.45) % 360;
    simulatedAngles.value.beta = Math.max(
      -85,
      Math.min(85, simulatedAngles.value.beta + deltaYPixels * 0.45)
    );
    engine.ingestOrientation({
      alpha: simulatedAngles.value.alpha,
      beta: simulatedAngles.value.beta,
      gamma: 0,
      screenOrientationDeg: getScreenOrientationDeg(),
    });
    isSensorActive.value = true;
  }

  function stepFrame() {
    if (!isEnabled.value || !isSensorActive.value) {
      return {
        active: false,
        worldQuaternion: IDENTITY_QUAT,
        tiltDeg: { pitch: 0, yaw: 0, roll: 0 },
      };
    }
    const res = engine.stepFrame();
    worldQuaternion.value = res.worldQuaternion;
    tiltDeg.value = res.tiltDeg;
    return {
      active: true,
      worldQuaternion: res.worldQuaternion,
      tiltDeg: res.tiltDeg,
    };
  }

  const cssTransformStyle = computed(() => {
    if (!isEnabled.value || !isSensorActive.value) return {};
    const { pitch, yaw, roll } = tiltDeg.value;
    return {
      transform: `perspective(900px) rotateX(${pitch.toFixed(2)}deg) rotateY(${yaw.toFixed(2)}deg) rotateZ(${roll.toFixed(2)}deg)`,
    };
  });

  let listenersAttached = false;
  function attachListeners() {
    if (listenersAttached || typeof window === 'undefined') return;
    window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
    listenersAttached = true;
  }

  function detachListeners() {
    if (!listenersAttached || typeof window === 'undefined') return;
    window.removeEventListener('deviceorientation', handleDeviceOrientation);
    listenersAttached = false;
  }

  onMounted(() => {
    if (options.autoStart !== false && !needsPermission.value) {
      attachListeners();
    }
  });

  onBeforeUnmount(() => {
    detachListeners();
  });

  return {
    isEnabled,
    isSupported,
    isSensorActive,
    isCalibrated,
    needsPermission,
    permissionState,
    worldQuaternion,
    tiltDeg,
    cssTransformStyle,
    requestPermission,
    enable,
    disable,
    toggle,
    recalibrate,
    addDragOffset,
    simulateOrientationDelta,
    setSimulatedAngles,
    stepFrame,
    handleDeviceOrientation,
  };
}
