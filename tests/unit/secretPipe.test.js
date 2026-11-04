import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSecretPaste, createSecretByteBuffer } from '../../src/utils/secretPipe.js';

describe('NanoSecretPipe — Zero-String Uint8Array RAM Buffer & Sanitizer', () => {
  it('strips ANSI escapes, CR/LF newlines, null bytes, and BiDi controls on paste', () => {
    const raw = '\x1b[32mMySecret\r\nPass\x00\u202Eword!\x1b[0m';
    assert.strictEqual(sanitizeSecretPaste(raw), 'MySecretPassword!');
    assert.strictEqual(sanitizeSecretPaste(null), '');
  });

  it('encodes keystrokes into Uint8Array, pops UTF-8 characters cleanly, and zero-wipes RAM on extract', () => {
    const buf = createSecretByteBuffer(64);
    assert.strictEqual(buf.getCharCount(), 0);
    assert.strictEqual(buf.getByteLength(), 0);

    buf.appendText('żółć!');
    assert.strictEqual(buf.getCharCount(), 5);
    assert.ok(buf.getByteLength() > 5);

    // Pop '!' and 'ć' (2-byte UTF-8)
    buf.popChar();
    buf.popChar();
    assert.strictEqual(buf.getCharCount(), 3);

    const payload = buf.extractAndWipe();
    const decoded = new TextDecoder().decode(payload);
    assert.strictEqual(decoded, 'żół');

    // Internal buffer must be 100% zeroed immediately after extractAndWipe()
    assert.strictEqual(buf.getCharCount(), 0);
    assert.strictEqual(buf.getByteLength(), 0);
    const view = buf.getInternalView();
    assert.ok(view.every((b) => b === 0));

    payload.fill(0);
    assert.ok(payload.every((b) => b === 0));
  });
});
