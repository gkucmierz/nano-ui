const ANSI_ESCAPE_RE = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;
const CONTROL_AND_BIDI_RE = /[\x00-\x08\x0b-\x1f\x7f\r\n\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

/**
 * Sanitizes pasted secret text by stripping ANSI terminal escape sequences,
 * line breaks (\r, \n), null bytes, and invisible Unicode BiDi/zero-width characters
 * while preserving all valid printable password characters.
 */
export const sanitizeSecretPaste = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return '';
  return rawText.replace(ANSI_ESCAPE_RE, '').replace(CONTROL_AND_BIDI_RE, '');
};

/**
 * Zero-String Cryptographic RAM Buffer (Uint8Array).
 * Keystrokes are UTF-8 encoded directly into a fixed-size Uint8Array and wiped with .fill(0)
 * on Backspace, Clear, or Extraction so secrets never persist as immutable JS Strings in Vue state or DOM.
 */
export const createSecretByteBuffer = (maxBytes = 512) => {
  const capacity = Number.isInteger(maxBytes) && maxBytes > 0 ? maxBytes : 512;
  const textEncoder = new TextEncoder();
  const secretBytes = new Uint8Array(capacity);
  const charByteLengths = [];
  let secretByteLen = 0;

  const wipe = () => {
    secretBytes.fill(0);
    charByteLengths.length = 0;
    secretByteLen = 0;
  };

  const appendText = (rawStr) => {
    const clean = sanitizeSecretPaste(rawStr);
    if (!clean) return charByteLengths.length;

    for (const ch of clean) {
      const encoded = textEncoder.encode(ch);
      if (secretByteLen + encoded.length <= secretBytes.length) {
        secretBytes.set(encoded, secretByteLen);
        secretByteLen += encoded.length;
        charByteLengths.push(encoded.length);
      }
      encoded.fill(0);
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
    popChar,
    wipe,
    extractAndWipe,
    getCharCount: () => charByteLengths.length,
    getByteLength: () => secretByteLen,
    getCapacity: () => capacity,
    getInternalView: () => secretBytes,
  };
};
