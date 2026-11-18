import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  highlightCode,
  highlightGlb,
  isParserRegistered,
  splitHighlightedHtmlIntoLines,
} from '../../src/utils/syntax-highlighter.js';
import {
  GLB_MAGIC_UINT32,
  GLB_JSON_CHUNK_TYPE,
  GLB_BIN_CHUNK_TYPE,
  inspectGlbBinary,
  parseGlbHeaderAndChunks,
} from '../../src/utils/glb-inspector.js';
import { detectLangFromPath } from '../../src/utils/git-diff.js';
import { GLB_COMPLETIONS } from '../../src/parsers/glb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

function buildSyntheticGlbBuffer(jsonObj, binBytes = new Uint8Array([0, 1, 2, 3, 255, 128, 64, 32])) {
  const jsonText = JSON.stringify(jsonObj);
  const enc = new TextEncoder();
  const rawJson = enc.encode(jsonText);
  const jsonPad = (4 - (rawJson.byteLength % 4)) % 4;
  const jsonChunkLen = rawJson.byteLength + jsonPad;

  const binPad = (4 - (binBytes.byteLength % 4)) % 4;
  const binChunkLen = binBytes.byteLength + binPad;

  const totalLen = 12 + 8 + jsonChunkLen + 8 + binChunkLen;
  const buf = new ArrayBuffer(totalLen);
  const view = new DataView(buf);
  const out = new Uint8Array(buf);

  view.setUint32(0, GLB_MAGIC_UINT32, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, totalLen, true);

  view.setUint32(12, jsonChunkLen, true);
  view.setUint32(16, GLB_JSON_CHUNK_TYPE, true);
  out.set(rawJson, 20);
  for (let i = 0; i < jsonPad; i++) out[20 + rawJson.byteLength + i] = 0x20;

  const binOffset = 20 + jsonChunkLen;
  view.setUint32(binOffset, binChunkLen, true);
  view.setUint32(binOffset + 4, GLB_BIN_CHUNK_TYPE, true);
  out.set(binBytes, binOffset + 8);

  return buf;
}

test('glbParser registers out-of-the-box, maps .glb/.gltf paths, and highlights dissected GLB containers', () => {
  assert.equal(isParserRegistered('glb'), true);
  assert.equal(isParserRegistered('gltf'), true);
  assert.equal(detectLangFromPath('public/models/fox-scene.glb'), 'glb');
  assert.equal(detectLangFromPath('scene.gltf'), 'glb');
  assert.ok(Array.isArray(GLB_COMPLETIONS) && GLB_COMPLETIONS.length >= 10);

  const sampleGlb = buildSyntheticGlbBuffer({
    asset: { version: '2.0', generator: 'Khronos glTF Blender I/O v5.2' },
    extensionsUsed: ['EXT_meshopt_compression'],
    scenes: [{ name: 'Scene', nodes: [0] }],
    nodes: [{ name: 'Fox_Head', mesh: 0, translation: [0, 0.52, 0] }],
    meshes: [{ name: 'Fox_Head', primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, material: 0 }] }],
    materials: [{ name: 'Fox_Fur', pbrMetallicRoughness: { baseColorFactor: [0.85, 0.35, 0.15, 1], roughnessFactor: 0.55 } }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 240, type: 'VEC3' },
      { bufferView: 1, componentType: 5126, count: 240, type: 'VEC3' },
    ],
  });

  const header = parseGlbHeaderAndChunks(sampleGlb);
  assert.equal(header.valid, true);
  assert.equal(header.version, 2);
  assert.equal(header.chunks.length, 2);

  const inspected = inspectGlbBinary(sampleGlb, { fileName: 'fox-scene.glb' });
  assert.equal(inspected.valid, true);
  assert.equal(inspected.summary.meshesCount, 1);
  assert.equal(inspected.summary.materialsCount, 1);
  assert.ok(inspected.code.includes('0x46546C67'));
  assert.ok(inspected.code.includes('EXT_meshopt_compression'));
  assert.ok(inspected.code.includes('Fox_Head'));

  const html = highlightGlb(inspected.code);
  assert.ok(html.includes('hljs-'), 'Expected highlight.js token spans in highlighted GLB output');
  assert.equal(html, highlightCode(inspected.code, 'glb'));

  // Regression guard: >256B BIN chunk must report true (binByteLength - hexPreviewBytes) omitted bytes
  // and highlight all 16 hex bytes per row (including the 16th byte before |ASCII|, e.g. 0xBE / 0x3F).
  const largeBin = new Uint8Array(4096);
  for (let i = 0; i < largeBin.length; i++) {
    largeBin[i] = i % 16 === 15 ? 0xbe : 0x3f;
  }
  const largeGlb = buildSyntheticGlbBuffer({ asset: { version: '2.0' } }, largeBin);
  const largeInspected = inspectGlbBinary(largeGlb, { fileName: 'deer-glade.glb', hexPreviewBytes: 128 });
  assert.ok(
    largeInspected.code.includes('+3,968 B (3.9 KB BIN geometry/animation data omitted)'),
    `Expected +3,968 B omitted summary, got:\n${largeInspected.code}`
  );
  assert.ok(!largeInspected.code.includes('+128 '), 'Must not subtract from internal preview slice cap');
  const largeHtml = highlightGlb(largeInspected.code);
  assert.ok(
    largeHtml.includes('<span class="hljs-number">BE</span>'),
    '16th hex byte (BE) before |ASCII| gutter must be highlighted as hljs-number'
  );
});

test('splitHighlightedHtmlIntoLines balances multi-line <span> tags cleanly for NanoCodeBlock line numbers', () => {
  const pyCode = [
    '"""',
    'Multi-line Blender docstring',
    'spanning three lines',
    '"""',
    'import bpy',
    'bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3)',
  ].join('\n');

  const html = highlightCode(pyCode, 'bpy');
  const lines = splitHighlightedHtmlIntoLines(html);
  assert.equal(lines.length, 6);

  for (let i = 0; i < lines.length; i++) {
    const opens = (lines[i].match(/<span\b[^>]*>/g) || []).length;
    const closes = (lines[i].match(/<\/span>/g) || []).length;
    assert.equal(opens, closes, `Line ${i + 1} has unbalanced <span> tags: ${lines[i]}`);
  }

  const blockSrc = fs.readFileSync(path.join(rootDir, 'src/components/NanoCodeBlock.vue'), 'utf8');
  assert.ok(blockSrc.includes('defaultLineNumbers'), 'NanoCodeBlock must support defaultLineNumbers');
  assert.ok(blockSrc.includes('code-line-num'), 'NanoCodeBlock must render non-selectable line numbers');
});
