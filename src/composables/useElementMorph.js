import { ref, computed, getCurrentScope, onScopeDispose, nextTick } from 'vue';
import {
  DEFAULT_MORPH_DURATION_MS,
  DEFAULT_MORPH_EASING,
  evaluateCubicBezierEasing,
  measureElementMorphRect,
  interpolateMorphBox,
  normalizeBezierPairForMorph,
  interpolateCubicBeziers,
  cubicBeziersToPathD,
  textToContourBeziers,
  captureCanvasFreezeSnapshot,
  createDecimatedMorphStream,
  createMorphStrategyGovernor,
} from '../utils/nanoMorph.js';
import { is, isCallable } from '../utils/type.js';

export function useElementMorph(options = {}) {
  const duration = computed(() => Math.max(0, Number(options.duration?.value ?? options.duration ?? DEFAULT_MORPH_DURATION_MS)));
  const easing = computed(() => String(options.easing?.value ?? options.easing ?? DEFAULT_MORPH_EASING));
  const mode = computed(() => String(options.mode?.value ?? options.mode ?? 'auto'));

  const isMorphing = ref(false);
  const progress = ref(0);
  const easedProgress = ref(0);
  const activeStrategy = ref('flip');
  const ghostBox = ref(null);
  const currentPathD = ref('');
  const freezeDataUrl = ref('');

  const governor = createMorphStrategyGovernor({
    env: options.env || null,
    initialWorkMs: options.initialWorkMs ?? 2.5,
  });

  let rafId = null;
  let activeSnapshot = null;
  let activeStream = null;
  let normalizedPairCache = null;
  let lastPairSignature = '';

  const rebuildVectorPair = (fromSource, toSource, vectorBox = { width: 160, height: 64 }) => {
    const sig = JSON.stringify([fromSource, toSource, vectorBox.width, vectorBox.height]);
    if (sig === lastPairSignature && normalizedPairCache) {
      return normalizedPairCache;
    }
    lastPairSignature = sig;
    normalizedPairCache = normalizeBezierPairForMorph(fromSource, toSource, {
      minSegments: Number(options.minSegments) || 12,
    });
    return normalizedPairCache;
  };

  const evaluateVectorAt = (t, { fromPath, toPath, fromText, toText, width = 160, height = 64 } = {}) => {
    const srcA = fromPath || (fromText ? textToContourBeziers(fromText, { width, height }).segments : null);
    const srcB = toPath || (toText ? textToContourBeziers(toText, { width, height }).segments : null);
    if (!srcA || !srcB) return '';
    const pair = rebuildVectorPair(srcA, srcB, { width, height });
    if (!pair.count) return '';
    const interp = interpolateCubicBeziers(pair.segmentsA, pair.segmentsB, t);
    const d = cubicBeziersToPathD(interp, true);
    currentPathD.value = d;
    return d;
  };

  const cancelMorph = () => {
    const cancelRaf = options.env?.cancelAnimationFrame ?? globalThis.cancelAnimationFrame;
    if (rafId !== null && isCallable(cancelRaf)) {
      cancelRaf(rafId);
    }
    rafId = null;
    if (activeSnapshot) {
      activeSnapshot.release();
      activeSnapshot = null;
    }
    if (activeStream) {
      activeStream.stop();
      activeStream = null;
    }
    freezeDataUrl.value = '';
    isMorphing.value = false;
  };

  const transferFocusAfterMorph = (targetEl) => {
    if (options.transferFocus === false || !targetEl || !isCallable(targetEl.focus)) return;
    const focusable = isCallable(targetEl.querySelector)
      ? targetEl.querySelector(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) || targetEl
      : targetEl;
    if (isCallable(focusable.setAttribute) && focusable === targetEl && !focusable.hasAttribute('tabindex')) {
      focusable.setAttribute('tabindex', '-1');
    }
    try {
      focusable.focus({ preventScroll: true });
    } catch {
      focusable.focus();
    }
  };

  const runMorphTransition = async ({
    fromEl = null,
    toEl = null,
    applyStateChange = null,
    direction = 'expand',
    vectorConfig = null,
    canvasEl = null,
  } = {}) => {
    cancelMorph();

    const firstRect = fromEl ? measureElementMorphRect(fromEl, options.env) : null;
    const detectedCanvas =
      canvasEl ||
      (fromEl && isCallable(fromEl.querySelector) ? fromEl.querySelector('canvas') : null);

    const hasVector = Boolean(
      vectorConfig && (vectorConfig.fromPath || vectorConfig.toPath || vectorConfig.fromText || vectorConfig.toText)
    );
    const resolvedStrategy = governor.resolveMode(mode.value, {
      hasCanvas: Boolean(detectedCanvas),
      hasVector,
    });
    activeStrategy.value = resolvedStrategy;

    const decision = governor.evaluate();
    if (resolvedStrategy === 'freeze' && detectedCanvas) {
      activeSnapshot = await captureCanvasFreezeSnapshot(detectedCanvas, options.env);
      freezeDataUrl.value = activeSnapshot.dataUrl || '';
    } else if (resolvedStrategy === 'kinetic-worker' && detectedCanvas) {
      activeStream = createDecimatedMorphStream({
        width: firstRect?.width || detectedCanvas.width || 320,
        height: firstRect?.height || detectedCanvas.height || 180,
        frameStride: decision.frameStride || 2,
        dprScale: decision.dprScale || 0.5,
      });
    }

    if (isCallable(applyStateChange)) {
      await applyStateChange();
    }
    await nextTick();

    const resolvedToEl = isCallable(toEl) ? toEl() : toEl;
    const lastRect = resolvedToEl ? measureElementMorphRect(resolvedToEl, options.env) : firstRect;

    const requestRaf = options.env?.requestAnimationFrame ?? globalThis.requestAnimationFrame;
    const nowFn =
      options.env?.now ??
      (is(globalThis.performance, Object) && isCallable(globalThis.performance.now)
        ? () => globalThis.performance.now()
        : () => Date.now());

    // Instant completion when reduced-motion is preferred, duration <= 0, or RAF unavailable (SSR/Node)
    if (decision.instant || duration.value <= 0 || !isCallable(requestRaf)) {
      const endU = direction === 'collapse' ? 0 : 1;
      progress.value = 1;
      easedProgress.value = 1;
      if (firstRect && lastRect) {
        ghostBox.value = interpolateMorphBox(firstRect, lastRect, 1);
      }
      if (hasVector) {
        evaluateVectorAt(endU, vectorConfig);
      }
      cancelMorph();
      transferFocusAfterMorph(resolvedToEl);
      return { completed: true, instant: true, strategy: resolvedStrategy };
    }

    isMorphing.value = true;
    progress.value = 0;
    easedProgress.value = 0;
    if (firstRect && lastRect) {
      ghostBox.value = interpolateMorphBox(firstRect, lastRect, 0);
    }

    const startMs = nowFn();
    let prevMs = startMs;
    let frameIndex = 0;

    return new Promise((resolve) => {
      const tick = (tsRaw) => {
        const nowMs = Number.isFinite(Number(tsRaw)) ? Number(tsRaw) : nowFn();
        const elapsed = Math.max(0, nowMs - startMs);
        const frameDelta = Math.max(0.1, nowMs - prevMs);
        prevMs = nowMs;

        const workStart = nowFn();
        const rawT = Math.min(1, elapsed / Math.max(1, duration.value));
        const easedT = evaluateCubicBezierEasing(rawT, easing.value);
        progress.value = Number(rawT.toFixed(4));
        easedProgress.value = Number(easedT.toFixed(4));

        if (firstRect && lastRect) {
          ghostBox.value = interpolateMorphBox(firstRect, lastRect, easedT);
        }

        if (hasVector) {
          const vecT = direction === 'collapse' ? 1 - easedT : easedT;
          evaluateVectorAt(vecT, vectorConfig);
        }

        if (activeStream) {
          activeStream.stepFrame(frameIndex, rawT);
        }

        const workCost = Math.max(0.05, nowFn() - workStart);
        governor.sampleFrame(frameDelta, workCost);
        frameIndex += 1;

        if (rawT >= 1) {
          cancelMorph();
          transferFocusAfterMorph(resolvedToEl);
          resolve({ completed: true, instant: false, strategy: resolvedStrategy });
          return;
        }

        rafId = requestRaf(tick);
      };

      rafId = requestRaf(tick);
    });
  };

  if (getCurrentScope()) {
    onScopeDispose(() => {
      cancelMorph();
    });
  }

  return {
    isMorphing,
    progress,
    easedProgress,
    activeStrategy,
    ghostBox,
    currentPathD,
    freezeDataUrl,
    governor,
    evaluateVectorAt,
    runMorphTransition,
    cancelMorph,
  };
}
