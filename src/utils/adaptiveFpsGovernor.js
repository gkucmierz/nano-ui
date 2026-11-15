/**
 * Adaptive 60-FPS Particle & Visual-FX Quality Governor (`ADAPTIVE-60FPS-01`).
 *
 * Designed for particle emitters, smoke/fluid plumes, soft-body/cloth solvers,
 * procedural shaders, and dynamic DPR scaling where "more particles = richer visuals"
 * up to the user's real-time hardware ceiling, without ever dropping below 60 FPS
 * or oscillating (thrashing) between quality tiers.
 *
 * Control Loop Architecture:
 *  1. Zero-Lag Hardware Seed (`resolveHardwareQualitySeed`): estimates initial scale [minScale..maxScale]
 *     from `prefers-reduced-motion`, `hardwareConcurrency`, and `deviceMemory` on frame 0.
 *  2. Drift-Free EWMA Frame & Work Estimator: tracks inter-frame `frameDeltaMs` AND optional per-frame
 *     CPU/GPU submission `workMs`, rejecting background/tab-switch outliers (`> maxValidDeltaMs`).
 *  3. AIMD Asymmetric Hysteresis + Deadband + Cooldown:
 *     - Fast Multiplicative Relief (`scale *= stepDownFactor`) after `overBudgetStreakRequired` frames above `highFrameMs`.
 *     - Slow Additive Recovery (`scale += stepUpDelta`) only after `cooldownMs` of sustained headroom below `lowFrameMs`.
 *     - Strict Deadband `[lowFrameMs, highFrameMs]` where `scale` stays 100% stationary (zero visual popping).
 */

const clampNum = (value, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
};

/**
 * Computes a passive, zero-fingerprinting initial quality scale in [minScale, maxScale].
 *
 * @param {Object} [options]
 * @param {number} [options.minScale=0.25]
 * @param {number} [options.maxScale=1.0]
 * @param {Object} [options.env] Optional injected navigator/matchMedia mock for deterministic tests
 * @returns {number}
 */
export const resolveHardwareQualitySeed = ({
  minScale = 0.25,
  maxScale = 1.0,
  env = null,
} = {}) => {
  const nav = env?.navigator ?? (typeof navigator !== 'undefined' ? navigator : null);
  const matchMediaFn =
    env?.matchMedia ??
    (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia.bind(window)
      : null);

  if (matchMediaFn) {
    try {
      if (matchMediaFn('(prefers-reduced-motion: reduce)')?.matches) {
        return clampNum(minScale, 0.05, maxScale);
      }
    } catch {}
  }

  const cores = Number(nav?.hardwareConcurrency) || 0;
  const memoryGb = Number(nav?.deviceMemory) || 0;

  let seed = 0.85;
  if (cores >= 8 && (memoryGb === 0 || memoryGb >= 8)) {
    seed = 1.0;
  } else if ((cores > 0 && cores <= 2) || (memoryGb > 0 && memoryGb <= 2)) {
    seed = 0.42;
  } else if ((cores > 0 && cores <= 4) || (memoryGb > 0 && memoryGb <= 4)) {
    seed = 0.65;
  }

  return clampNum(seed, minScale, maxScale);
};

/**
 * Creates a zero-allocation stateful 60-FPS adaptive quality governor.
 *
 * @param {Object} [options]
 * @param {number} [options.targetFps=60]
 * @param {number} [options.minScale=0.25]
 * @param {number} [options.maxScale=1.0]
 * @param {number} [options.initialScale] Optional explicit initial scale (defaults to hardware seed)
 * @param {number} [options.ewmaAlpha=0.10] Smoothing factor for frame/work EWMA
 * @param {number} [options.lowFrameMs] Recovery threshold (defaults to 0.86 * targetFrameMs, ~14.3ms @ 60Hz)
 * @param {number} [options.highFrameMs] Relief threshold (defaults to 1.12 * targetFrameMs, ~18.7ms @ 60Hz)
 * @param {number} [options.maxWorkMs=11.0] Optional per-frame JS/GL work ceiling before scaling down
 * @param {number} [options.maxValidDeltaMs=125] Ignores tab-backgrounding spikes larger than this
 * @param {number} [options.overBudgetStreakRequired=10] Consecutive heavy frames before fast step-down
 * @param {number} [options.downCooldownMs=260] Minimum ms between consecutive step-downs
 * @param {number} [options.upCooldownMs=1600] Minimum ms of sustained headroom before additive step-up
 * @param {number} [options.stepDownFactor=0.78] Multiplicative factor on overload
 * @param {number} [options.stepUpDelta=0.08] Additive increment on sustained headroom
 * @param {Object} [options.env] Optional environment override for unit tests
 */
export const createAdaptiveFpsGovernor = (options = {}) => {
  const targetFps = clampNum(options.targetFps ?? 60, 24, 240);
  const targetFrameMs = 1000 / targetFps;
  const minScale = clampNum(options.minScale ?? 0.25, 0.05, 1.0);
  const maxScale = clampNum(options.maxScale ?? 1.0, minScale, 2.0);
  const ewmaAlpha = clampNum(options.ewmaAlpha ?? 0.1, 0.01, 0.5);
  const lowFrameMs = clampNum(options.lowFrameMs ?? targetFrameMs * 0.86, 4, targetFrameMs);
  const highFrameMs = clampNum(options.highFrameMs ?? targetFrameMs * 1.12, targetFrameMs, 60);
  const maxWorkMs = clampNum(options.maxWorkMs ?? targetFrameMs * 0.66, 2, 40);
  const maxValidDeltaMs = clampNum(options.maxValidDeltaMs ?? 125, 40, 1000);
  const overBudgetStreakRequired = Math.max(2, Math.trunc(options.overBudgetStreakRequired ?? 10));
  const downCooldownMs = clampNum(options.downCooldownMs ?? 260, 50, 5000);
  const upCooldownMs = clampNum(options.upCooldownMs ?? 1600, 200, 15000);
  const stepDownFactor = clampNum(options.stepDownFactor ?? 0.78, 0.4, 0.95);
  const stepUpDelta = clampNum(options.stepUpDelta ?? 0.08, 0.01, 0.35);

  let scale =
    options.initialScale !== undefined
      ? clampNum(options.initialScale, minScale, maxScale)
      : resolveHardwareQualitySeed({ minScale, maxScale, env: options.env });

  let ewmaFrameMs = targetFrameMs;
  let ewmaWorkMs = 2.0;
  let overBudgetStreak = 0;
  let headroomAccumMs = 0;
  let sinceLastDownMs = downCooldownMs;
  let adjustmentCount = 0;

  const resolveTier = (s) => {
    if (s >= 0.85) return 'ultra';
    if (s >= 0.6) return 'high';
    if (s >= 0.38) return 'medium';
    return 'eco';
  };

  /**
   * Feeds one rendered frame sample into the governor (0 heap allocations).
   *
   * @param {number} frameDeltaMs Inter-frame elapsed ms (e.g. `nowMs - prevRenderMs`)
   * @param {number} [workMs=0] Optional synchronous CPU/WebGL submission cost of the frame
   * @returns {number} Current quality scale in [minScale, maxScale]
   */
  const sampleFrame = (frameDeltaMs, workMs = 0) => {
    const dt = Number(frameDeltaMs);
    if (!Number.isFinite(dt) || dt <= 0 || dt > maxValidDeltaMs) {
      // Tab switch, pause, or invalid sample -> reset transient streak without touching scale
      overBudgetStreak = 0;
      return scale;
    }

    ewmaFrameMs += ewmaAlpha * (dt - ewmaFrameMs);
    const w = Number(workMs);
    const hasWorkSample = Number.isFinite(w) && w > 0;
    if (hasWorkSample) {
      ewmaWorkMs += ewmaAlpha * (w - ewmaWorkMs);
    }

    sinceLastDownMs += dt;

    const isOverloaded =
      (dt > highFrameMs && ewmaFrameMs > highFrameMs) ||
      (hasWorkSample && w > maxWorkMs && ewmaWorkMs > maxWorkMs);
    const hasHeadroom =
      dt < lowFrameMs &&
      ewmaFrameMs < lowFrameMs &&
      (!hasWorkSample || ewmaWorkMs < maxWorkMs * 0.55);

    if (isOverloaded) {
      overBudgetStreak += 1;
      headroomAccumMs = 0;
      if (
        overBudgetStreak >= overBudgetStreakRequired &&
        sinceLastDownMs >= downCooldownMs &&
        scale > minScale
      ) {
        scale = Math.max(minScale, Number((scale * stepDownFactor).toFixed(4)));
        ewmaFrameMs = targetFrameMs;
        ewmaWorkMs = Math.min(ewmaWorkMs, maxWorkMs * 0.7);
        overBudgetStreak = 0;
        sinceLastDownMs = 0;
        adjustmentCount += 1;
      }
    } else if (hasHeadroom) {
      overBudgetStreak = 0;
      headroomAccumMs += dt;
      if (headroomAccumMs >= upCooldownMs && scale < maxScale) {
        scale = Math.min(maxScale, Number((scale + stepUpDelta).toFixed(4)));
        headroomAccumMs = 0;
        adjustmentCount += 1;
      }
    } else {
      // Inside deadband [lowFrameMs, highFrameMs] -> hold steady (zero thrashing)
      overBudgetStreak = Math.max(0, overBudgetStreak - 1);
      headroomAccumMs = Math.max(0, headroomAccumMs - dt * 0.5);
    }

    return scale;
  };

  /**
   * Scales an integer particle/segment budget cleanly to [minCount, maxCount].
   *
   * @param {number} maxCount Ideal count at scale = 1.0
   * @param {number} [minCount=4] Floor count at minimum scale
   * @returns {number}
   */
  const scaleCount = (maxCount, minCount = 4) => {
    const hi = Math.max(1, Math.trunc(Number(maxCount) || 1));
    const lo = Math.max(0, Math.min(hi, Math.trunc(Number(minCount) ?? 4)));
    return Math.max(lo, Math.min(hi, Math.round(lo + (hi - lo) * scale)));
  };

  /**
   * Scales target devicePixelRatio smoothly within [minDpr, maxDpr].
   *
   * @param {number} [deviceDpr=1] Native `window.devicePixelRatio`
   * @param {number} [maxDpr=2.0] Cap at Ultra tier
   * @param {number} [minDpr=1.0] Floor at Eco tier
   * @returns {number}
   */
  const scaleDpr = (deviceDpr = 1, maxDpr = 2.0, minDpr = 1.0) => {
    const nativeCap = Math.min(Math.max(1, Number(deviceDpr) || 1), maxDpr);
    const floor = Math.min(nativeCap, Math.max(0.75, minDpr));
    const normalized = (scale - minScale) / Math.max(1e-6, maxScale - minScale);
    const dprBoost = clampNum(normalized * 1.25, 0, 1);
    return Number((floor + (nativeCap - floor) * dprBoost).toFixed(2));
  };

  const reset = (nextScale) => {
    scale =
      nextScale !== undefined
        ? clampNum(nextScale, minScale, maxScale)
        : resolveHardwareQualitySeed({ minScale, maxScale, env: options.env });
    ewmaFrameMs = targetFrameMs;
    ewmaWorkMs = 2.0;
    overBudgetStreak = 0;
    headroomAccumMs = 0;
    sinceLastDownMs = downCooldownMs;
    return scale;
  };

  const getSnapshot = () => ({
    scale,
    tier: resolveTier(scale),
    fpsEstimate: Math.round(1000 / Math.max(1, ewmaFrameMs)),
    ewmaFrameMs: Number(ewmaFrameMs.toFixed(2)),
    ewmaWorkMs: Number(ewmaWorkMs.toFixed(2)),
    adjustmentCount,
  });

  return {
    sampleFrame,
    scaleCount,
    scaleDpr,
    reset,
    getScale: () => scale,
    getTier: () => resolveTier(scale),
    getFpsEstimate: () => Math.round(1000 / Math.max(1, ewmaFrameMs)),
    getSnapshot,
  };
};
