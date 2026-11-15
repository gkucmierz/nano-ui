/**
 * Deterministic ISO/IEC 12113 (Khronos glTF 2.0 Binary `.glb`) Dissector & Code Formatter
 * Parses raw `.glb` ArrayBuffer / Uint8Array containers into human-readable, syntax-highlightable
 * `.glb` source listings (12-byte Header + Chunk 0 JSON Scene Graph + Chunk 1 BIN Hex/ASCII Preview)
 * with zero external runtime dependencies.
 */

export const GLB_MAGIC_UINT32 = 0x46546c67; // ASCII 'glTF' in little-endian
export const GLB_JSON_CHUNK_TYPE = 0x4e4f534a; // ASCII 'JSON'
export const GLB_BIN_CHUNK_TYPE = 0x004e4942; // ASCII 'BIN\0'

const toUint8View = (input) => {
  if (!input) return null;
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input) && input.buffer instanceof ArrayBuffer) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  return null;
};

const formatBytesHuman = (bytes) => {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

const decodeChunkTypeAscii = (typeUint32) => {
  if (typeUint32 === GLB_JSON_CHUNK_TYPE) return 'JSON';
  if (typeUint32 === GLB_BIN_CHUNK_TYPE) return 'BIN';
  const chars = [
    typeUint32 & 0xff,
    (typeUint32 >>> 8) & 0xff,
    (typeUint32 >>> 16) & 0xff,
    (typeUint32 >>> 24) & 0xff,
  ]
    .filter((b) => b >= 32 && b <= 126)
    .map((b) => String.fromCharCode(b))
    .join('');
  return chars || `0x${typeUint32.toString(16).toUpperCase().padStart(8, '0')}`;
};

/**
 * Formats a compact hex + ASCII row preview of a binary buffer slice.
 * @param {Uint8Array} bytes
 * @param {{ maxBytes?: number, baseOffset?: number }} [options]
 * @returns {string}
 */
export const formatGlbHexPreview = (bytes, { maxBytes = 128, baseOffset = 0 } = {}) => {
  const view = toUint8View(bytes);
  if (!view || view.byteLength === 0) return '// (empty BIN payload)';
  const limit = Math.min(view.byteLength, Math.max(16, Number(maxBytes) || 128));
  const lines = [];

  for (let row = 0; row < limit; row += 16) {
    const sliceEnd = Math.min(limit, row + 16);
    const hexCols = [];
    let ascii = '';
    for (let i = row; i < row + 16; i++) {
      if (i < sliceEnd) {
        const b = view[i];
        hexCols.push(b.toString(16).toUpperCase().padStart(2, '0'));
        ascii += b >= 32 && b <= 126 ? String.fromCharCode(b) : '.';
      } else {
        hexCols.push('  ');
        ascii += ' ';
      }
    }
    const addr = `0x${(baseOffset + row).toString(16).toUpperCase().padStart(6, '0')}`;
    const leftHex = hexCols.slice(0, 8).join(' ');
    const rightHex = hexCols.slice(8).join(' ');
    lines.push(`${addr}:  ${leftHex}  ${rightHex}  |${ascii}|`);
  }

  if (view.byteLength > limit) {
    lines.push(
      `// ... +${(view.byteLength - limit).toLocaleString('en-US')} bytes (${formatBytesHuman(view.byteLength - limit)} binary geometry/animation buffers omitted)`
    );
  }
  return lines.join('\n');
};

/**
 * Parses the 12-byte ISO/IEC 12113 header and chunk directory from a `.glb` binary buffer.
 * @param {ArrayBuffer|Uint8Array} buffer
 */
export const parseGlbHeaderAndChunks = (buffer) => {
  const bytes = toUint8View(buffer);
  if (!bytes || bytes.byteLength < 12) {
    return {
      valid: false,
      error: 'Buffer shorter than 12-byte glTF 2.0 GLB header',
      byteLength: bytes ? bytes.byteLength : 0,
      chunks: [],
    };
  }

  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = dv.getUint32(0, true);
  const version = dv.getUint32(4, true);
  const declaredLength = dv.getUint32(8, true);

  if (magic !== GLB_MAGIC_UINT32) {
    return {
      valid: false,
      error: `Invalid GLB magic signature (expected 0x46546C67 "glTF", got 0x${magic.toString(16).toUpperCase()})`,
      magic,
      version,
      declaredLength,
      byteLength: bytes.byteLength,
      chunks: [],
    };
  }

  const chunks = [];
  let cursor = 12;
  let chunkIndex = 0;
  let jsonText = '';
  let jsonObject = null;
  let binByteLength = 0;
  let binPreviewBytes = null;
  let binDataOffset = 0;

  while (cursor + 8 <= bytes.byteLength) {
    const chunkLength = dv.getUint32(cursor, true);
    const chunkType = dv.getUint32(cursor + 4, true);
    const dataStart = cursor + 8;
    const dataEnd = Math.min(bytes.byteLength, dataStart + chunkLength);
    const slice = bytes.subarray(dataStart, dataEnd);
    const typeLabel = decodeChunkTypeAscii(chunkType);

    if (chunkType === GLB_JSON_CHUNK_TYPE && !jsonText) {
      const decoder = new TextDecoder('utf-8');
      jsonText = decoder.decode(slice).replace(/\0+$/g, '').trim();
      try {
        jsonObject = JSON.parse(jsonText);
      } catch {
        jsonObject = null;
      }
    } else if (chunkType === GLB_BIN_CHUNK_TYPE && binPreviewBytes === null) {
      binByteLength += slice.byteLength;
      binPreviewBytes = slice.subarray(0, Math.min(slice.byteLength, 256));
      binDataOffset = dataStart;
    } else if (chunkType === GLB_BIN_CHUNK_TYPE) {
      binByteLength += slice.byteLength;
    }

    chunks.push({
      index: chunkIndex++,
      type: typeLabel,
      typeHex: `0x${chunkType.toString(16).toUpperCase().padStart(8, '0')}`,
      headerOffset: cursor,
      dataOffset: dataStart,
      byteLength: slice.byteLength,
      declaredChunkLength: chunkLength,
    });

    if (chunkLength === 0) break;
    cursor = dataStart + chunkLength;
  }

  const summary = {
    generator: jsonObject?.asset?.generator || 'Unknown',
    gltfVersion: jsonObject?.asset?.version || `${version}.0`,
    scenes: Array.isArray(jsonObject?.scenes) ? jsonObject.scenes.length : 0,
    scenesCount: Array.isArray(jsonObject?.scenes) ? jsonObject.scenes.length : 0,
    nodes: Array.isArray(jsonObject?.nodes) ? jsonObject.nodes.length : 0,
    nodesCount: Array.isArray(jsonObject?.nodes) ? jsonObject.nodes.length : 0,
    meshes: Array.isArray(jsonObject?.meshes) ? jsonObject.meshes.length : 0,
    meshesCount: Array.isArray(jsonObject?.meshes) ? jsonObject.meshes.length : 0,
    materials: Array.isArray(jsonObject?.materials) ? jsonObject.materials.length : 0,
    materialsCount: Array.isArray(jsonObject?.materials) ? jsonObject.materials.length : 0,
    accessors: Array.isArray(jsonObject?.accessors) ? jsonObject.accessors.length : 0,
    accessorsCount: Array.isArray(jsonObject?.accessors) ? jsonObject.accessors.length : 0,
    bufferViews: Array.isArray(jsonObject?.bufferViews) ? jsonObject.bufferViews.length : 0,
    bufferViewsCount: Array.isArray(jsonObject?.bufferViews) ? jsonObject.bufferViews.length : 0,
    animations: Array.isArray(jsonObject?.animations) ? jsonObject.animations.length : 0,
    animationsCount: Array.isArray(jsonObject?.animations) ? jsonObject.animations.length : 0,
    extensionsUsed: Array.isArray(jsonObject?.extensionsUsed) ? jsonObject.extensionsUsed : [],
  };

  return {
    valid: true,
    magicHex: '0x46546C67',
    version,
    declaredLength,
    byteLength: bytes.byteLength,
    jsonByteLength: jsonText ? new TextEncoder().encode(jsonText).byteLength : 0,
    binByteLength,
    binDataOffset,
    binPreviewBytes,
    chunks,
    jsonObject,
    jsonText,
    summary,
  };
};

/**
 * Formats a `.glb` binary ArrayBuffer / Uint8Array into a complete, syntax-highlighted
 * `.glb` inspection listing suitable for `<NanoCodeBlock lang="glb">` or `<NanoCodeEditor lang="glb">`.
 *
 * @param {ArrayBuffer|Uint8Array} buffer
 * @param {{ fileName?: string, hexPreviewBytes?: number, maxJsonLines?: number }} [options]
 * @returns {string}
 */
export const inspectGlbBinary = (
  buffer,
  { fileName = 'model.glb', hexPreviewBytes = 128, maxJsonLines = 420 } = {}
) => {
  const parsed = parseGlbHeaderAndChunks(buffer);
  if (!parsed.valid) {
    const fallbackCode = `// Invalid or incomplete .glb binary (${fileName}): ${parsed.error}`;
    return {
      valid: false,
      error: parsed.error,
      byteLength: parsed.byteLength,
      summary: {
        generator: 'Invalid',
        gltfVersion: '0.0',
        scenes: 0,
        scenesCount: 0,
        nodes: 0,
        nodesCount: 0,
        meshes: 0,
        meshesCount: 0,
        materials: 0,
        materialsCount: 0,
        accessors: 0,
        accessorsCount: 0,
        bufferViews: 0,
        bufferViewsCount: 0,
        animations: 0,
        animationsCount: 0,
        extensionsUsed: [],
      },
      code: fallbackCode,
      toString() {
        return fallbackCode;
      },
    };
  }

  const { summary } = parsed;
  const extStr =
    summary.extensionsUsed.length > 0 ? summary.extensionsUsed.join(', ') : 'none (core glTF 2.0)';

  const headerLines = [
    `// Khronos glTF ${summary.gltfVersion} Binary Container (ISO/IEC 12113) — ${fileName}`,
    `// Total Size: ${formatBytesHuman(parsed.byteLength)} (${parsed.byteLength.toLocaleString('en-US')} B) | Generator: ${summary.generator}`,
    `// Scene Graph: ${summary.nodes} nodes, ${summary.meshes} meshes, ${summary.materials} PBR materials, ${summary.accessors} accessors, ${summary.animations} animations`,
    `// Extensions: ${extStr}`,
    `[GLB HEADER] magic: ${parsed.magicHex} ("glTF") | version: ${parsed.version} | length: ${parsed.declaredLength} B`,
  ];

  for (const ch of parsed.chunks) {
    headerLines.push(
      `[CHUNK ${ch.index}: ${ch.type}] type: ${ch.typeHex} | offset: 0x${ch.dataOffset.toString(16).toUpperCase().padStart(4, '0')} | length: ${ch.byteLength.toLocaleString('en-US')} B (${formatBytesHuman(ch.byteLength)})`
    );
  }

  let prettyJson = parsed.jsonText || '{}';
  if (parsed.jsonObject) {
    prettyJson = JSON.stringify(parsed.jsonObject, null, 2);
  }
  const jsonLines = prettyJson.split('\n');
  const capLines = Math.max(40, Number(maxJsonLines) || 420);
  const bodyJson =
    jsonLines.length > capLines
      ? [
        ...jsonLines.slice(0, capLines),
        `  // ... (${jsonLines.length - capLines} more JSON lines omitted for compact viewport inspection)`,
        '}',
      ].join('\n')
      : prettyJson;

  const sections = [
    headerLines.join('\n'),
    '',
    '// ── Chunk 0: Scene Graph & PBR Descriptor (JSON) ──────────────────────────',
    bodyJson,
  ];

  if (parsed.binPreviewBytes && parsed.binPreviewBytes.byteLength > 0) {
    sections.push(
      '',
      `[BIN HEX PREVIEW] offset: 0x${parsed.binDataOffset.toString(16).toUpperCase().padStart(4, '0')} | total: ${formatBytesHuman(parsed.binByteLength)}`,
      formatGlbHexPreview(parsed.binPreviewBytes, {
        maxBytes: hexPreviewBytes,
        baseOffset: parsed.binDataOffset,
      })
    );
  }

  const code = sections.join('\n');
  return {
    valid: true,
    magicHex: parsed.magicHex,
    version: parsed.version,
    byteLength: parsed.byteLength,
    jsonByteLength: parsed.jsonByteLength,
    binByteLength: parsed.binByteLength,
    chunks: parsed.chunks,
    summary,
    code,
    toString() {
      return code;
    },
  };
};

export default inspectGlbBinary;
