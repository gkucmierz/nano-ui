import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DROPZONE_MODES,
  formatDropzoneBytes,
  matchesAcceptPattern,
  validateDroppedFiles,
  createDropzoneStateMachine,
} from '../../src/utils/dropzoneState.js';
import { computeAdaptiveCardExpansion } from '../../src/utils/selectPositioning.js';

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
