import { clamp, quantizeStepValue } from './math.js';

export const DEFAULT_SLIDER_FULL_SWEEP_SEC = 2.2;

/**
 * Creates a clean progressive keyboard hold state for continuous 60-FPS slider scrubbing.
 */
export function createDynamicSliderKeyState() {
  return {
    dir: 0,
    holdSec: 0,
    rawValue: 0,
    shiftBoost: false,
  };
}

/**
 * Handles initial keydown (or ignores OS key-repeat stutter while keeping hold active)
 * for ArrowLeft / ArrowRight / ArrowUp / ArrowDown on a numeric slider range [min, max].
 */
export function pressDynamicSliderKey(
  prevState = createDynamicSliderKeyState(),
  {
    dir = 0,
    currentValue = 0,
    min = 0,
    max = 100,
    step = 1,
    shiftKey = false,
    isRepeat = false,
  } = {}
) {
  const cleanDir = dir > 0 ? 1 : dir < 0 ? -1 : 0;
  const lo = Number.isFinite(Number(min)) ? Number(min) : 0;
  const hi = Number.isFinite(Number(max)) ? Number(max) : 100;
  const stepVal = Number(step) > 0 ? Number(step) : 1;
  const cur = clamp(Number.isFinite(Number(currentValue)) ? Number(currentValue) : lo, lo, hi);

  if (cleanDir === 0 || hi <= lo) {
    return {
      state: createDynamicSliderKeyState(),
      nextValue: cur,
      changed: false,
    };
  }

  if (isRepeat && prevState?.dir === cleanDir) {
    return {
      state: {
        ...prevState,
        shiftBoost: Boolean(shiftKey),
      },
      nextValue: cur,
      changed: false,
    };
  }

  const tapDelta = (shiftKey ? stepVal * 4 : stepVal) * cleanDir;
  const nextValue = quantizeStepValue(clamp(cur + tapDelta, lo, hi), {
    min: lo,
    max: hi,
    step: stepVal,
    origin: lo,
  });

  return {
    state: {
      dir: cleanDir,
      holdSec: 0,
      rawValue: nextValue,
      shiftBoost: Boolean(shiftKey),
    },
    nextValue,
    changed: nextValue !== cur,
  };
}

/**
 * Releases active keyboard hold when matching directional key (or all keys for dir === 0) lifts.
 */
export function releaseDynamicSliderKey(prevState = createDynamicSliderKeyState(), dir = 0) {
  if (!prevState || prevState.dir === 0) {
    return createDynamicSliderKeyState();
  }
  if (dir !== 0 && prevState.dir !== (dir > 0 ? 1 : -1)) {
    return prevState;
  }
  return createDynamicSliderKeyState();
}

/**
 * Advances progressive dynamic slider hold over dtSec:
 *   - Gentle precision start (~14% of span/s during first 0.25s)
 *   - Smooth Hermite ramp up to fast sweep (~70% of span/s) so sweeping 0% -> 100% takes ~2.2s.
 */
export function stepDynamicSliderKeyHold(
  prevState = createDynamicSliderKeyState(),
  {
    currentValue = 0,
    min = 0,
    max = 100,
    step = 1,
    dtSec = 1 / 60,
    fullSweepSec = DEFAULT_SLIDER_FULL_SWEEP_SEC,
  } = {}
) {
  const lo = Number.isFinite(Number(min)) ? Number(min) : 0;
  const hi = Number.isFinite(Number(max)) ? Number(max) : 100;
  const stepVal = Number(step) > 0 ? Number(step) : 1;
  const cur = clamp(Number.isFinite(Number(currentValue)) ? Number(currentValue) : lo, lo, hi);

  if (!prevState || prevState.dir === 0 || hi <= lo) {
    return {
      state: prevState || createDynamicSliderKeyState(),
      nextValue: cur,
      changed: false,
    };
  }

  const dt = clamp(Number(dtSec) || 0, 0, 0.1);
  if (dt <= 0) {
    return {
      state: prevState,
      nextValue: cur,
      changed: false,
    };
  }

  const span = hi - lo;
  const sweepT = Math.max(0.45, Number(fullSweepSec) || DEFAULT_SLIDER_FULL_SWEEP_SEC);
  const scaleTime = sweepT / DEFAULT_SLIDER_FULL_SWEEP_SEC;
  const nextHoldSec = (Number(prevState.holdSec) || 0) + dt;

  // Normalized ramp u in [0, 1] over 1.35s * scaleTime:
  // Integral of fraction/sec over 2.2s equals 1.00 full span!
  const u = clamp(nextHoldSec / (1.42 * scaleTime), 0, 1);
  const ease = u * u * (3 - 2 * u);
  const baseFracPerSec = (0.13 + 0.48 * ease) / scaleTime;
  const fracPerSec = prevState.shiftBoost ? baseFracPerSec * 1.75 : baseFracPerSec;

  const baseRaw = Number.isFinite(Number(prevState.rawValue)) ? Number(prevState.rawValue) : cur;
  const externalSync = Math.abs(baseRaw - cur) > Math.max(stepVal * 2.5, span * 0.04) ? cur : baseRaw;
  const nextRaw = clamp(externalSync + prevState.dir * fracPerSec * span * dt, lo, hi);
  const nextValue = quantizeStepValue(nextRaw, {
    min: lo,
    max: hi,
    step: stepVal,
    origin: lo,
  });

  return {
    state: {
      ...prevState,
      holdSec: Number(nextHoldSec.toFixed(5)),
      rawValue: nextRaw,
    },
    nextValue,
    changed: nextValue !== cur,
  };
}
