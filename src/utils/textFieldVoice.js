import { clamp } from './math.js';
import { is, isCallable } from './type.js';

const NEEDS_SPACE_BEFORE_RE = /[^\s([{"'“„—–-]/;
const STARTS_WITH_PUNCT_OR_SPACE_RE = /^[\s.,!?;:)\]}"'”»—–-]/;

/**
 * Pure cursor-aware streaming STT dictation splicer.
 * Replaces any initial selection once, updates live `onPartial` slices in place without duplicating text,
 * and commits `onFinal` chunks while advancing the caret cleanly.
 *
 * @param {{
 *   text?: string,
 *   anchorStart?: number,
 *   selectionEnd?: number,
 *   interimLength?: number,
 *   transcript?: string,
 *   isFinal?: boolean
 * }} params
 */
export const insertDictationAtCursor = ({
  text = '',
  anchorStart = undefined,
  selectionEnd = undefined,
  interimLength = 0,
  transcript = '',
  isFinal = false,
} = {}) => {
  const source = String(text ?? '');
  const chunk = String(transcript ?? '');
  const start = clamp(
    is(anchorStart, 'number') ? Math.trunc(anchorStart) : source.length,
    0,
    source.length
  );
  const replaceEnd =
    interimLength > 0
      ? clamp(start + Math.max(0, Math.trunc(interimLength)), start, source.length)
      : clamp(
        is(selectionEnd, 'number') ? Math.trunc(selectionEnd) : start,
        start,
        source.length
      );

  const before = source.slice(0, start);
  const after = source.slice(replaceEnd);

  if (!chunk) {
    const nextText = before + after;
    return {
      text: nextText,
      caret: start,
      anchorStart: start,
      interimLength: 0,
    };
  }

  const prevChar = start > 0 ? before[before.length - 1] : '';
  const needsLeadingSpace =
    prevChar !== '' &&
    NEEDS_SPACE_BEFORE_RE.test(prevChar) &&
    !STARTS_WITH_PUNCT_OR_SPACE_RE.test(chunk);
  const formattedChunk = needsLeadingSpace ? ` ${chunk}` : chunk;
  const nextText = before + formattedChunk + after;
  const nextCaret = start + formattedChunk.length;

  if (isFinal) {
    return {
      text: nextText,
      caret: nextCaret,
      anchorStart: nextCaret,
      interimLength: 0,
    };
  }

  return {
    text: nextText,
    caret: nextCaret,
    anchorStart: start,
    interimLength: formattedChunk.length,
  };
};

/**
 * Computes bounded vertical auto-grow dimensions (`minRows` .. `maxRows`) for `<textarea>`.
 */
export const computeTextareaAutoResize = ({
  scrollHeight = 0,
  lineHeightPx = 21,
  verticalPaddingPx = 16,
  borderPx = 2,
  minRows = 2,
  maxRows = 8,
} = {}) => {
  const safeMinRows = Math.max(1, Math.trunc(Number(minRows) || 2));
  const safeMaxRows = Math.max(safeMinRows, Math.trunc(Number(maxRows) || 8));
  const lh = Math.max(14, Number(lineHeightPx) || 21);
  const chrome = Math.max(0, Number(verticalPaddingPx) || 0) + Math.max(0, Number(borderPx) || 0);

  const minHeightPx = Math.round(safeMinRows * lh + chrome);
  const maxHeightPx = Math.round(safeMaxRows * lh + chrome);
  const rawContentPx = Number(scrollHeight) > 0 ? Number(scrollHeight) + borderPx : minHeightPx;
  const heightPx = Math.round(clamp(rawContentPx, minHeightPx, maxHeightPx));

  return {
    heightPx,
    minHeightPx,
    maxHeightPx,
    overflowY: rawContentPx > maxHeightPx + 1 ? 'auto' : 'hidden',
  };
};

/**
 * Maps scalar RMS amplitude (`0..1`) into stationary bar scale factors in `[0.22, 1.0]` (`CLS = 0`).
 */
export const computeVoiceRmsBars = (rms = 0, barCount = 4) => {
  const count = Math.max(1, Math.min(8, Math.trunc(Number(barCount) || 4)));
  const norm = clamp(Number(rms) || 0, 0, 1);
  // Perceptual soft-knee boost so quiet speech still visibly animates the micro-envelope
  const boosted = Math.pow(norm, 0.65);
  const weights = [0.62, 1.0, 0.84, 0.54, 0.76, 0.92, 0.68, 0.48];
  const bars = [];
  for (let i = 0; i < count; i++) {
    const w = weights[i % weights.length];
    const scaleY = Number(clamp(0.22 + boosted * 0.78 * w, 0.22, 1).toFixed(3));
    bars.push(scaleY);
  }
  return bars;
};

/**
 * IME-safe Enter key check (`modern-web-guidance` `ime-safe-enter-submit` contract).
 * Blocks submission during active CJK/IME composition AND within 50ms of `compositionend`
 * using `event.timeStamp` strictly.
 */
export const isImeSafeEnterEvent = (event, lastCompositionEndTimeStamp = -Infinity) => {
  if (!event || event.key !== 'Enter') return false;
  if (event.isComposing === true || event.keyCode === 229) return false;
  if (
    is(event.timeStamp, 'number') &&
    is(lastCompositionEndTimeStamp, 'number') &&
    Number.isFinite(lastCompositionEndTimeStamp) &&
    event.timeStamp - lastCompositionEndTimeStamp >= 0 &&
    event.timeStamp - lastCompositionEndTimeStamp < 50
  ) {
    return false;
  }
  return true;
};

/**
 * Binds a `voiceAdapter` (`start()`, `stop()`, `onPartial(cb)`, `onFinal(cb)`, optional `onRms(cb)`)
 * with clean subscription teardown on stop/unmount.
 */
export const createVoiceAdapterSession = (adapter, handlers = {}) => {
  if (!is(adapter, Object)) {
    return {
      supported: false,
      start: () => false,
      stop: () => {},
      destroy: () => {},
    };
  }

  let active = false;
  let cleanups = [];

  const clearCleanups = () => {
    for (const fn of cleanups) {
      if (isCallable(fn)) {
        try {
          fn();
        } catch {
          // Ignore adapter unsubscribe errors
        }
      }
    }
    cleanups = [];
  };

  const start = () => {
    if (active) return true;
    clearCleanups();

    const onPartialCb = (txt) => {
      if (!active) return;
      if (isCallable(handlers.onPartial)) handlers.onPartial(String(txt ?? ''));
    };
    const onFinalCb = (txt) => {
      if (!active) return;
      if (isCallable(handlers.onFinal)) handlers.onFinal(String(txt ?? ''));
    };
    const onRmsCb = (rmsVal) => {
      if (!active) return;
      if (isCallable(handlers.onRms)) handlers.onRms(Number(rmsVal) || 0);
    };
    const onErrorCb = (err) => {
      active = false;
      if (isCallable(handlers.onError)) handlers.onError(err);
    };

    active = true;

    if (isCallable(adapter.onPartial)) {
      const off = adapter.onPartial(onPartialCb);
      if (isCallable(off)) cleanups.push(off);
    }
    if (isCallable(adapter.onFinal)) {
      const off = adapter.onFinal(onFinalCb);
      if (isCallable(off)) cleanups.push(off);
    }
    if (isCallable(adapter.onRms)) {
      const off = adapter.onRms(onRmsCb);
      if (isCallable(off)) cleanups.push(off);
    }
    if (isCallable(adapter.onError)) {
      const off = adapter.onError(onErrorCb);
      if (isCallable(off)) cleanups.push(off);
    }

    if (isCallable(adapter.start)) {
      try {
        const res = adapter.start({
          onPartial: onPartialCb,
          onFinal: onFinalCb,
          onRms: onRmsCb,
          onError: onErrorCb,
        });
        if (res && isCallable(res.catch)) {
          res.catch((err) => onErrorCb(err));
        }
      } catch (err) {
        onErrorCb(err);
        return false;
      }
    }
    return active;
  };

  const stop = () => {
    const wasActive = active;
    active = false;
    clearCleanups();
    if (wasActive && isCallable(adapter.stop)) {
      try {
        adapter.stop();
      } catch {
        // Ignore adapter stop errors
      }
    }
  };

  return {
    supported: isCallable(adapter.start) || isCallable(adapter.onPartial) || isCallable(adapter.onFinal),
    start,
    stop,
    destroy: stop,
    isActive: () => active,
  };
};
