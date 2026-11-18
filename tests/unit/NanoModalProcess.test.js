import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MAX_PROCESS_ERROR_CODE_LENGTH,
  normalizeProcessStatus,
  truncateProcessErrorCode,
  normalizeModalProcessState,
} from '../../src/utils/modalProcess.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const modalSfc = readFileSync(resolve(__dirname, '../../src/components/NanoModal.vue'), 'utf8');
const badgeSfc = readFileSync(
  resolve(__dirname, '../../src/components/NanoProcessBadge.vue'),
  'utf8'
);
const buttonSfc = readFileSync(
  resolve(__dirname, '../../src/components/NanoProcessButton.vue'),
  'utf8'
);

describe('Recipe 08 — NanoModal Process State Mirroring & Trigger Continuity', () => {
  it('normalizes pending/working, success/ok, failed/error, and idle process states', () => {
    assert.equal(normalizeProcessStatus('working'), 'pending');
    assert.equal(normalizeProcessStatus('running'), 'pending');
    assert.equal(normalizeProcessStatus('ok'), 'success');
    assert.equal(normalizeProcessStatus('passed'), 'success');
    assert.equal(normalizeProcessStatus('error'), 'failed');
    assert.equal(normalizeProcessStatus('idle'), 'idle');
    assert.equal(normalizeProcessStatus(null), 'idle');
  });

  it('truncates long errorCode values to <= 24 characters while preserving full tooltip context', () => {
    assert.equal(MAX_PROCESS_ERROR_CODE_LENGTH, 24);
    const longCode = 'EXIT_1: test:unit:govern:extra-long-step-name';
    const short = truncateProcessErrorCode(longCode);
    assert.ok(short.length <= 24, `Expected <= 24 chars, got ${short.length}: ${short}`);
    assert.ok(short.endsWith('…'));

    const state = normalizeModalProcessState({
      status: 'failed',
      label: 'CI Build #418',
      errorCode: longCode,
    });
    assert.equal(state.status, 'failed');
    assert.equal(state.isActive, true);
    assert.ok(state.shortErrorCode.length <= 24);
    assert.ok(state.tooltip.includes(longCode));
  });

  it('supports both shared SSoT :process object and declarative flat processState/processLabel/processErrorCode props', () => {
    const shared = { status: 'pending', label: 'AI WORKING (3)' };
    const fromObj = normalizeModalProcessState(shared);
    assert.equal(fromObj.status, 'pending');
    assert.equal(fromObj.displayText, 'AI WORKING (3)');

    const overridden = normalizeModalProcessState(shared, {
      processState: 'success',
      processLabel: '✓ Build #112 Passed',
    });
    assert.equal(overridden.status, 'success');
    assert.equal(overridden.displayText, 'Build #112 Passed');
  });

  it('renders NanoProcessBadge inside .nano-modal-header with v-tooltip and var(--font-mono) error codes', () => {
    assert.ok(modalSfc.includes('NanoProcessBadge'));
    assert.ok(modalSfc.includes('nano-modal-header-main'));
    assert.ok(modalSfc.includes('processState:'));
    assert.ok(modalSfc.includes('processErrorCode:'));

    assert.ok(badgeSfc.includes('v-tooltip'));
    assert.ok(badgeSfc.includes('var(--font-mono'));
    assert.ok(badgeSfc.includes('nano-process-spinner'));

    assert.ok(buttonSfc.includes('NanoProcessBadge'));
    assert.ok(buttonSfc.includes('size: props.size'));
  });
});
