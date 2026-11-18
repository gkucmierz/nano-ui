import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DROPZONE_MODES,
  classifyMediaFile,
  inspectDataTransferMedia,
  formatDropzoneBytes,
  matchesAcceptPattern,
  validateDroppedFiles,
  createDropzoneStateMachine,
} from '../../src/utils/dropzoneState.js';
import { freezeThemeTransitions } from '../../src/theme.js';
import { computeAdaptiveCardExpansion } from '../../src/utils/selectPositioning.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

test('dropzoneState: formatDropzoneBytes formats byte limits deterministically', () => {
  assert.deepEqual(DROPZONE_MODES, ['box', 'overlay']);
  assert.equal(formatDropzoneBytes(0), '0 B');
  assert.equal(formatDropzoneBytes(512), '512 B');
  assert.equal(formatDropzoneBytes(1024 * 1024 * 5), '5 MB');
  assert.equal(formatDropzoneBytes(-1), 'Unlimited');
});

test('dropzoneState: matchesAcceptPattern supports MIME wildcards and file extensions', () => {
  assert.equal(
    matchesAcceptPattern({ name: 'clip.mov', type: 'video/quicktime' }, 'video/*,.mov,.mp4'),
    true
  );
  assert.equal(
    matchesAcceptPattern({ name: 'clip.MOV', type: '' }, 'video/*'),
    true
  );
  assert.equal(
    matchesAcceptPattern({ name: 'notes.txt', type: 'text/plain' }, 'video/*,.mov,.mp4'),
    false
  );
  assert.equal(
    matchesAcceptPattern({ name: 'any.bin', type: 'application/octet-stream' }, ''),
    true
  );
});

test('dropzoneState: validateDroppedFiles partitions accepted and rejected files by type, size, and count', () => {
  const files = [
    { name: 'valid.mp4', type: 'video/mp4', size: 2 * 1024 * 1024 },
    { name: 'too-big.mov', type: 'video/quicktime', size: 50 * 1024 * 1024 },
    { name: 'wrong.pdf', type: 'application/pdf', size: 1024 },
  ];

  const singleResult = validateDroppedFiles(files, {
    accept: 'video/*,.mov,.mp4',
    maxSizeBytes: 10 * 1024 * 1024,
    multiple: false,
  });
  assert.equal(singleResult.accepted.length, 1);
  assert.equal(singleResult.accepted[0].name, 'valid.mp4');
  assert.equal(singleResult.rejected.length, 2);
  assert.equal(singleResult.rejected[0].reason, 'count');

  const multiResult = validateDroppedFiles(files, {
    accept: 'video/*,.mov,.mp4',
    maxSizeBytes: 10 * 1024 * 1024,
    multiple: true,
  });
  assert.equal(multiResult.accepted.length, 1);
  assert.equal(multiResult.rejected.length, 2);
  assert.equal(multiResult.rejected[0].reason, 'size');
  assert.equal(multiResult.rejected[1].reason, 'type');
});

test('dropzoneState: createDropzoneStateMachine prevents child dragenter/dragleave hover flickering', () => {
  const machine = createDropzoneStateMachine();
  assert.equal(machine.getState().isDragOver, false);

  // Enter parent container
  machine.onDragEnter();
  assert.equal(machine.getState().isDragOver, true);
  assert.equal(machine.getState().dragDepth, 1);

  // Enter nested child button/canvas -> depth = 2, still drag-over
  machine.onDragEnter();
  assert.equal(machine.getState().isDragOver, true);
  assert.equal(machine.getState().dragDepth, 2);

  // Leave nested child -> depth = 1, still drag-over (no flicker!)
  machine.onDragLeave();
  assert.equal(machine.getState().isDragOver, true);
  assert.equal(machine.getState().dragDepth, 1);

  // Leave parent container -> depth = 0, hover cleared
  machine.onDragLeave();
  assert.equal(machine.getState().isDragOver, false);
  assert.equal(machine.getState().dragDepth, 0);

  // Drop resets depth immediately
  machine.onDragEnter();
  machine.onDragEnter();
  machine.onDrop();
  assert.equal(machine.getState().isDragOver, false);
  assert.equal(machine.getState().dragDepth, 0);
});

test('selectPositioning: computeAdaptiveCardExpansion does not ratchet when natural content fits baseCardHeight', () => {
  const res = computeAdaptiveCardExpansion({
    baseCardHeight: 236,
    baseStageHeight: 300,
    contentScrollHeight: 220,
  });
  assert.equal(res.activeCardHeight, 236);
  assert.equal(res.effectiveStageHeight, 300);
  assert.equal(res.isExpanded, false);
});

test('dropzoneState: classifyMediaFile and inspectDataTransferMedia detect video/image/audio pre-drop MIME types', () => {
  assert.deepEqual(classifyMediaFile({ name: 'clip.mov', type: '' }), {
    category: 'video',
    mimeType: 'video/*',
    isMedia: true,
  });
  assert.deepEqual(classifyMediaFile('video/mp4'), {
    category: 'video',
    mimeType: 'video/mp4',
    isMedia: true,
  });
  assert.deepEqual(classifyMediaFile({ name: 'photo.png', type: 'image/png' }), {
    category: 'image',
    mimeType: 'image/png',
    isMedia: true,
  });

  const dragVideoEvent = {
    dataTransfer: {
      items: [
        { kind: 'file', type: 'video/quicktime' },
      ],
    },
  };
  const info = inspectDataTransferMedia(dragVideoEvent);
  assert.equal(info.hasFiles, true);
  assert.equal(info.itemCount, 1);
  assert.equal(info.primaryMime, 'video/quicktime');
  assert.equal(info.category, 'video');
  assert.equal(info.isVideo, true);
  assert.equal(info.isImage, false);

  const emptyInfo = inspectDataTransferMedia(null);
  assert.equal(emptyInfo.hasFiles, false);
  assert.equal(emptyInfo.isVideo, false);
});

test('v1.8.41 governance invariants: THEME-INSTANT-01, NanoModal size presets, NanoCodeBlock nowrap tabs, and ThreeDDonutChart 3D slice click', () => {
  const styleCss = fs.readFileSync(path.join(ROOT, 'src/style.css'), 'utf8');
  assert.match(styleCss, /html\.theme-switching/);
  assert.match(styleCss, /transition:\s*none\s*!important/);

  assert.equal(typeof freezeThemeTransitions, 'function');

  const modalSrc = fs.readFileSync(path.join(ROOT, 'src/components/NanoModal.vue'), 'utf8');
  assert.match(modalSrc, /MODAL_SIZE_WIDTHS/);
  assert.match(modalSrc, /lg:\s*860/);

  const codeBlockSrc = fs.readFileSync(path.join(ROOT, 'src/components/NanoCodeBlock.vue'), 'utf8');
  assert.match(codeBlockSrc, /white-space:\s*nowrap/);
  assert.match(codeBlockSrc, /flex-shrink:\s*0/);

  const donutSrc = fs.readFileSync(path.join(ROOT, 'src/components/ThreeDDonutChart.vue'), 'utf8');
  assert.match(donutSrc, /immediate:\s*true/);
  assert.match(donutSrc, /@click="handleSliceClick\(slice\.item\.id,\s*\$event\)"/);

  const primitivesCss = fs.readFileSync(path.join(ROOT, 'src/assets/primitives.css'), 'utf8');
  assert.match(primitivesCss, /--nano-tri-bg/);
  assert.match(primitivesCss, /background-clip:\s*padding-box,\s*border-box\s*!important/);
});
