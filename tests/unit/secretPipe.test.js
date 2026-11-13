import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeSecretPaste,
  createSecretByteBuffer,
  isPrintableSecretKeyEvent,
} from '../../src/utils/secretPipe.js';
import { secretPipeDirective } from '../../src/directives/secretPipe.js';

describe('NanoSecretPipe — Zero-String Uint8Array RAM Buffer, AltGr/Option Diacritics & Directive Lifecycle', () => {
  it('strips CSI, OSC (BEL & ST), DCS escapes, C0/C1 controls, CR/LF, and BiDi overrides on paste', () => {
    const raw =
      '\x1b[32mMySecret\x1b]52;c;ZXZpbA==\x07\x1b]0;Title\x1b\\\r\nPass\x00\u202E\u061Cword!\x1b[0m';
    assert.strictEqual(sanitizeSecretPaste(raw), 'MySecretPassword!');
    assert.strictEqual(sanitizeSecretPaste(null), '');
  });

  it('recognizes AltGr (Ctrl+Alt) and macOS Option diacritics while rejecting plain Ctrl/Meta shortcuts and dead keys', () => {
    // Polish Windows/Linux AltGr+A -> 'ą' (ctrlKey: true, altKey: true, metaKey: false)
    assert.strictEqual(
      isPrintableSecretKeyEvent({ key: 'ą', ctrlKey: true, altKey: true, metaKey: false, isComposing: false }),
      true
    );
    // macOS Option+L -> 'ł' (ctrlKey: false, altKey: true, metaKey: false)
    assert.strictEqual(
      isPrintableSecretKeyEvent({ key: 'ł', ctrlKey: false, altKey: true, metaKey: false, isComposing: false }),
      true
    );
    // Non-BMP astral character (2 UTF-16 code units, 1 Unicode code point)
    assert.strictEqual(
      isPrintableSecretKeyEvent({ key: '🔐', ctrlKey: false, altKey: false, metaKey: false, isComposing: false }),
      true
    );
    // Plain Ctrl+C / Cmd+V must NOT be treated as printable secret input
    assert.strictEqual(
      isPrintableSecretKeyEvent({ key: 'c', ctrlKey: true, altKey: false, metaKey: false, isComposing: false }),
      false
    );
    assert.strictEqual(
      isPrintableSecretKeyEvent({ key: 'v', ctrlKey: false, altKey: false, metaKey: true, isComposing: false }),
      false
    );
    assert.strictEqual(
      isPrintableSecretKeyEvent({ key: 'Dead', ctrlKey: false, altKey: false, metaKey: false, isComposing: false }),
      false
    );
  });

  it('encodes keystrokes into Uint8Array without mutating internal storage via getInternalView and zero-wipes RAM', () => {
    const buf = createSecretByteBuffer(64);
    assert.strictEqual(buf.getCharCount(), 0);
    assert.strictEqual(buf.getByteLength(), 0);

    buf.appendText('żółć🔐!');
    assert.strictEqual(buf.getCharCount(), 6);
    assert.ok(buf.getByteLength() > 6);

    // Mutating getInternalView() must never corrupt internal secret bytes
    const clonedView = buf.getInternalView();
    clonedView.fill(0xff);

    // Pop '!' and '🔐' (4-byte UTF-8)
    buf.popChar();
    buf.popChar();
    assert.strictEqual(buf.getCharCount(), 4);

    const payload = buf.extractAndWipe();
    const decoded = new TextDecoder().decode(payload);
    assert.strictEqual(decoded, 'żółć');

    // Internal buffer must be 100% zeroed immediately after extractAndWipe()
    assert.strictEqual(buf.getCharCount(), 0);
    assert.strictEqual(buf.getByteLength(), 0);
    const viewAfterWipe = buf.getInternalView();
    assert.ok(viewAfterWipe.every((b) => b === 0));

    payload.fill(0);
    assert.ok(payload.every((b) => b === 0));
  });

  it('v-secret-pipe directive handles keystrokes, async onSubmit before zero-wipe, stealth dataset, and clean unmount', async () => {
    const listeners = new Map();
    const attrs = new Map();
    const mockEl = {
      dataset: {},
      hasAttribute: (k) => attrs.has(k),
      setAttribute: (k, v) => attrs.set(k, v),
      addEventListener: (evt, fn) => listeners.set(evt, fn),
      removeEventListener: (evt, fn) => {
        if (listeners.get(evt) === fn) listeners.delete(evt);
      },
    };

    let receivedDuringAsync = '';
    let submittedSnapshotRef = null;

    secretPipeDirective.mounted(mockEl, {
      value: {
        onSubmit: async ({ bytes, byteCount, charCount }) => {
          submittedSnapshotRef = bytes;
          assert.ok(byteCount > 4);
          assert.strictEqual(charCount, 5);
          await new Promise((r) => setTimeout(r, 15));
          // Bytes must still be intact inside async onSubmit before finally zero-wipes them!
          receivedDuringAsync = new TextDecoder().decode(bytes);
        },
      },
    });

    assert.strictEqual(listeners.size, 7);
    assert.strictEqual(mockEl.dataset.secretArmed, 'false');
    assert.strictEqual('secretBytes' in mockEl.dataset, false);

    // Type 'h', 'ą' (AltGr), paste 'sło!', backspace '!'
    const keydown = listeners.get('keydown');
    const paste = listeners.get('paste');
    const noop = () => {};

    keydown({ key: 'h', ctrlKey: false, altKey: false, metaKey: false, preventDefault: noop, stopPropagation: noop });
    keydown({ key: 'ą', ctrlKey: true, altKey: true, metaKey: false, preventDefault: noop, stopPropagation: noop });
    paste({
      clipboardData: { getData: () => '\x1b[31msło!\r\n' },
      preventDefault: noop,
      stopPropagation: noop,
    });
    keydown({ key: 'Backspace', ctrlKey: false, altKey: false, metaKey: false, preventDefault: noop, stopPropagation: noop });

    // Only boolean armed indicator exposed to DOM by default (zero length side-channel)
    assert.strictEqual(mockEl.dataset.secretArmed, 'true');
    assert.strictEqual('secretBytes' in mockEl.dataset, false);

    // Trigger Enter submission
    keydown({ key: 'Enter', ctrlKey: false, altKey: false, metaKey: false, preventDefault: noop, stopPropagation: noop });
    await new Promise((r) => setTimeout(r, 35));

    assert.strictEqual(receivedDuringAsync, 'hąsło');
    assert.ok(submittedSnapshotRef.every((b) => b === 0), 'Snapshot must be zeroed after async onSubmit resolves');
    assert.strictEqual(mockEl.dataset.secretArmed, 'false');

    // Unmount cleans all 7 listeners and expando properties
    secretPipeDirective.unmounted(mockEl);
    assert.strictEqual(listeners.size, 0);
    assert.strictEqual('_secretPipeBuffer' in mockEl, false);
    assert.strictEqual('_secretPipeKeydown' in mockEl, false);
    assert.strictEqual('_secretPipeOpts' in mockEl, false);
  });
});
