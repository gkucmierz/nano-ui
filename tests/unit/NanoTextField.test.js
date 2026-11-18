import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  insertDictationAtCursor,
  computeTextareaAutoResize,
  computeVoiceRmsBars,
  isImeSafeEnterEvent,
  createVoiceAdapterSession,
} from '../../src/utils/textFieldVoice.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const textFieldSfc = readFileSync(
  resolve(__dirname, '../../src/components/NanoTextField.vue'),
  'utf8'
);
const indexSrc = readFileSync(resolve(__dirname, '../../src/index.js'), 'utf8');

describe('Recipe 06 — NanoTextField & Voice Dictation Engine', () => {
  it('splices streaming onPartial and onFinal transcripts at selectionStart..selectionEnd without duplicating text', () => {
    const initial = 'Hello world!';
    // Place cursor at index 5 ("Hello| world!")
    const step1 = insertDictationAtCursor({
      text: initial,
      anchorStart: 5,
      selectionEnd: 5,
      interimLength: 0,
      transcript: 'beautiful',
      isFinal: false,
    });
    assert.equal(step1.text, 'Hello beautiful world!');
    assert.equal(step1.anchorStart, 5);
    assert.ok(step1.interimLength > 0);

    // Updated partial replaces previous interim slice cleanly
    const step2 = insertDictationAtCursor({
      text: step1.text,
      anchorStart: step1.anchorStart,
      interimLength: step1.interimLength,
      transcript: 'deterministic brave',
      isFinal: false,
    });
    assert.equal(step2.text, 'Hello deterministic brave world!');

    // Final transcript commits and advances anchorStart to end of inserted text
    const step3 = insertDictationAtCursor({
      text: step2.text,
      anchorStart: step2.anchorStart,
      interimLength: step2.interimLength,
      transcript: 'deterministic brave',
      isFinal: true,
    });
    assert.equal(step3.text, 'Hello deterministic brave world!');
    assert.equal(step3.interimLength, 0);
    assert.equal(step3.anchorStart, step3.caret);
  });

  it('replaces selected text range cleanly when dictation starts with selectionStart < selectionEnd', () => {
    const res = insertDictationAtCursor({
      text: 'Replace OLD_TOKEN immediately',
      anchorStart: 8,
      selectionEnd: 17,
      interimLength: 0,
      transcript: 'NEW_TOKEN',
      isFinal: true,
    });
    assert.equal(res.text, 'Replace NEW_TOKEN immediately');
  });

  it('clamps multiline autoResize height strictly between minRows and maxRows', () => {
    const compact = computeTextareaAutoResize({
      scrollHeight: 18,
      lineHeightPx: 20,
      verticalPaddingPx: 16,
      borderPx: 2,
      minRows: 3,
      maxRows: 6,
    });
    assert.equal(compact.heightPx, compact.minHeightPx);
    assert.equal(compact.overflowY, 'hidden');

    const overflowing = computeTextareaAutoResize({
      scrollHeight: 280,
      lineHeightPx: 20,
      verticalPaddingPx: 16,
      borderPx: 2,
      minRows: 3,
      maxRows: 6,
    });
    assert.equal(overflowing.heightPx, overflowing.maxHeightPx);
    assert.equal(overflowing.overflowY, 'auto');
  });

  it('computes stationary RMS bar scales in [0.22, 1.0] (CLS = 0) and guards IME composition Enter', () => {
    const silent = computeVoiceRmsBars(0, 4);
    assert.deepEqual(silent, [0.22, 0.22, 0.22, 0.22]);

    const loud = computeVoiceRmsBars(0.9, 4);
    assert.equal(loud.length, 4);
    assert.ok(loud.every((v) => v > 0.5 && v <= 1));

    // IME-safe Enter checks
    assert.equal(isImeSafeEnterEvent({ key: 'Enter', isComposing: true, timeStamp: 200 }), false);
    assert.equal(isImeSafeEnterEvent({ key: 'Enter', keyCode: 229, timeStamp: 200 }), false);
    assert.equal(isImeSafeEnterEvent({ key: 'Enter', isComposing: false, timeStamp: 220 }, 200), false);
    assert.equal(isImeSafeEnterEvent({ key: 'Enter', isComposing: false, timeStamp: 300 }, 200), true);
  });

  it('manages voiceAdapter start(), stop(), onPartial(), and onFinal() lifecycle cleanly', () => {
    const events = [];
    let pushedPartial = null;
    let pushedFinal = null;
    let stoppedCount = 0;

    const adapter = {
      onPartial(cb) {
        pushedPartial = cb;
        return () => {
          pushedPartial = null;
        };
      },
      onFinal(cb) {
        pushedFinal = cb;
        return () => {
          pushedFinal = null;
        };
      },
      start() {
        events.push('started');
      },
      stop() {
        stoppedCount += 1;
      },
    };

    const session = createVoiceAdapterSession(adapter, {
      onPartial: (t) => events.push(`partial:${t}`),
      onFinal: (t) => events.push(`final:${t}`),
    });

    assert.equal(session.supported, true);
    assert.equal(session.start(), true);
    pushedPartial('hel');
    pushedFinal('hello');
    session.stop();

    assert.deepEqual(events, ['started', 'partial:hel', 'final:hello']);
    assert.equal(stoppedCount, 1);
    assert.equal(pushedPartial, null);
  });

  it('enforces locked textarea horizontal width, non-breaking asterisk (\\u00A0*), and index.js registration', () => {
    assert.ok(textFieldSfc.includes('resize: vertical;'));
    assert.ok(textFieldSfc.includes('width: 100%;'));
    assert.ok(textFieldSfc.includes('max-width: 100%;'));
    assert.ok(textFieldSfc.includes('box-sizing: border-box;'));
    assert.ok(textFieldSfc.includes('\\u00A0*'));
    assert.ok(indexSrc.includes('NanoTextField'));
  });
});
