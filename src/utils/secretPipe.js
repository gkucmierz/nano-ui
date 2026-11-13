const TERMINAL_ESCAPE_RE =
  /\x1b(?:\][^\x07\x1b]*(?:\x07|\x1b\\)|[PX^_][\s\S]*?\x1b\\|\[[0-9;?]*[ -/]*[@-~]|[@-Z\\-_])/g;
const CONTROL_AND_BIDI_RE =
  /[\x00-\x1f\x7f-\x9f\u061C\u200B-\u200F\u2028-\u202E\u2066-\u2069\uFEFF]/g;

/**
 * Sanitizes pasted secret text by stripping CSI/OSC/DCS terminal escape sequences,
 * C0/C1 control characters (\r, \n, \t, NUL), and invisible Unicode BiDi/zero-width characters
 * while preserving all valid printable passphrase characters (including Polish diacritics & symbols).
 */
export const sanitizeSecretPaste = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return '';
  return rawText.replace(TERMINAL_ESCAPE_RE, '').replace(CONTROL_AND_BIDI_RE, '');
};

/**
 * Checks whether a KeyboardEvent represents a printable single Unicode scalar value,
 * preserving macOS Option and Windows/Linux AltGr diacritics (ąęćłńóśźż, @, €) while
 * rejecting Ctrl/Cmd shortcuts and dead/IME control keys.
 */
export const isPrintableSecretKeyEvent = (e) => {
  if (!e || typeof e.key !== 'string' || !e.key) return false;
  if (e.key === 'Dead' || e.key === 'Process' || e.key === 'Unidentified') return false;
  if (e.metaKey) return false;
  if (e.ctrlKey) {
    const isAltGraph = typeof e.getModifierState === 'function' && e.getModifierState('AltGraph');
    if (!isAltGraph && !e.altKey) return false;
    if (!isAltGraph && e.altKey && e.key.length !== 1 && Array.from(e.key).length !== 1) return false;
  }
  return Array.from(e.key).length === 1;
};

/**
 * Zero-String Cryptographic RAM Buffer (Uint8Array).
 * Keystrokes are UTF-8 encoded via zero-allocation encodeInto() into a fixed-size Uint8Array
 * and wiped with .fill(0) on Backspace, Clear, or Extraction so secrets never persist as
 * immutable JS Strings in Vue reactive state or DOM attributes.
 */
export const createSecretByteBuffer = (maxBytes = 512) => {
  const capacity = Number.isInteger(maxBytes) && maxBytes > 0 ? maxBytes : 512;
  const textEncoder = new TextEncoder();
  const secretBytes = new Uint8Array(capacity);
  const scratch4 = new Uint8Array(4);
  const charByteLengths = [];
  let secretByteLen = 0;

  const wipe = () => {
    secretBytes.fill(0);
    scratch4.fill(0);
    charByteLengths.length = 0;
    secretByteLen = 0;
  };

  const appendText = (rawStr) => {
    const clean = sanitizeSecretPaste(rawStr);
    if (!clean) return charByteLengths.length;

    for (const ch of clean) {
      if (typeof textEncoder.encodeInto === 'function') {
        const { written } = textEncoder.encodeInto(ch, scratch4);
        if (written > 0 && secretByteLen + written <= secretBytes.length) {
          for (let i = 0; i < written; i++) {
            secretBytes[secretByteLen + i] = scratch4[i];
          }
          secretByteLen += written;
          charByteLengths.push(written);
        }
        scratch4.fill(0);
      } else {
        const encoded = textEncoder.encode(ch);
        if (secretByteLen + encoded.length <= secretBytes.length) {
          secretBytes.set(encoded, secretByteLen);
          secretByteLen += encoded.length;
          charByteLengths.push(encoded.length);
        }
        encoded.fill(0);
      }
    }
    return charByteLengths.length;
  };

  const popChar = () => {
    if (charByteLengths.length === 0) return 0;
    const lastLen = charByteLengths.pop();
    const nextLen = Math.max(0, secretByteLen - lastLen);
    secretBytes.fill(0, nextLen, secretByteLen);
    secretByteLen = nextLen;
    return charByteLengths.length;
  };

  const extractAndWipe = () => {
    const payload = secretBytes.slice(0, secretByteLen);
    wipe();
    return payload;
  };

  return {
    appendText,
    pushText: appendText,
    popChar,
    popCodePoint: popChar,
    wipe,
    extractAndWipe,
    toUint8Array: extractAndWipe,
    getCharCount: () => charByteLengths.length,
    getCharLength: () => charByteLengths.length,
    getByteLength: () => secretByteLen,
    getCapacity: () => capacity,
    getInternalView: () => secretBytes.slice(),
  };
};
