import { is } from './type.js';

export const MAX_PROCESS_ERROR_CODE_LENGTH = 24;

export const MODAL_PROCESS_STATES = Object.freeze([
  'idle',
  'pending',
  'success',
  'failed',
]);

const PENDING_ALIASES = new Set([
  'pending',
  'working',
  'running',
  'loading',
  'active',
  'in_progress',
  'in-progress',
  'building',
  'scanning',
]);

const SUCCESS_ALIASES = new Set([
  'success',
  'ok',
  'passed',
  'done',
  'completed',
  'healthy',
  'audited',
]);

const FAILED_ALIASES = new Set([
  'failed',
  'error',
  'err',
  'failure',
  'danger',
  'fatal',
]);

export function normalizeProcessStatus(rawStatus) {
  if (!is(rawStatus, 'string')) return 'idle';
  const key = rawStatus.trim().toLowerCase();
  if (!key || key === 'idle' || key === 'none') return 'idle';
  if (PENDING_ALIASES.has(key)) return 'pending';
  if (SUCCESS_ALIASES.has(key)) return 'success';
  if (FAILED_ALIASES.has(key)) return 'failed';
  return 'idle';
}

export function truncateProcessErrorCode(code, maxLength = MAX_PROCESS_ERROR_CODE_LENGTH) {
  if (code === null || code === undefined) return '';
  const text = String(code).replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const cap = is(maxLength, 'number') && Number.isFinite(maxLength) && maxLength >= 4
    ? Math.floor(maxLength)
    : MAX_PROCESS_ERROR_CODE_LENGTH;
  if (text.length <= cap) return text;
  return `${text.slice(0, cap - 1).trimEnd()}…`;
}

export function normalizeModalProcessState(processInput = null, flatOverrides = {}) {
  const baseObj = is(processInput, 'object') ? processInput : {};
  const baseStatusRaw = is(processInput, 'string')
    ? processInput
    : (baseObj.status ?? baseObj.state ?? '');

  const overrideStatusRaw = flatOverrides?.processState ?? flatOverrides?.status;
  const rawStatus = overrideStatusRaw !== undefined && overrideStatusRaw !== null && overrideStatusRaw !== ''
    ? overrideStatusRaw
    : baseStatusRaw;

  const status = normalizeProcessStatus(rawStatus);
  const isActive = status !== 'idle';

  const rawLabelCandidate =
    flatOverrides?.processLabel !== undefined && flatOverrides?.processLabel !== null
      ? flatOverrides.processLabel
      : (baseObj.label ?? '');
  const label = String(rawLabelCandidate || '').trim();

  const rawErrorCandidate =
    flatOverrides?.processErrorCode !== undefined && flatOverrides?.processErrorCode !== null
      ? flatOverrides.processErrorCode
      : (baseObj.errorCode ?? baseObj.code ?? '');
  const rawErrorCode = String(rawErrorCandidate || '').replace(/\s+/g, ' ').trim();

  const maxLen = flatOverrides?.maxErrorLength ?? baseObj.maxErrorLength ?? MAX_PROCESS_ERROR_CODE_LENGTH;
  const fallbackErrorSource = rawErrorCode || (status === 'failed' ? (label || 'ERR_FAILED') : '');
  const shortErrorCode = status === 'failed'
    ? truncateProcessErrorCode(fallbackErrorSource, maxLen)
    : truncateProcessErrorCode(rawErrorCode, maxLen);

  const explicitTooltip =
    flatOverrides?.processTooltip !== undefined && flatOverrides?.processTooltip !== null
      ? String(flatOverrides.processTooltip).trim()
      : String(baseObj.tooltip ?? baseObj.error ?? baseObj.message ?? '').trim();

  let tooltip = explicitTooltip;
  if (!tooltip && status === 'failed') {
    if (rawErrorCode && label && rawErrorCode !== label) {
      tooltip = `${label} — ${rawErrorCode}`;
    } else if (rawErrorCode && rawErrorCode !== shortErrorCode) {
      tooltip = rawErrorCode;
    } else if (fallbackErrorSource) {
      tooltip = fallbackErrorSource;
    }
  } else if (!tooltip && label) {
    tooltip = label;
  }

  const cleanSuccessLabel = label.replace(/^[✓✔]\s*/, '').trim();
  const cleanFailedCode = shortErrorCode.replace(/^[✕✖×]\s*/, '').trim();

  let displayText = label;
  if (status === 'pending') {
    displayText = label || 'Working…';
  } else if (status === 'success') {
    displayText = cleanSuccessLabel || 'Completed';
  } else if (status === 'failed') {
    displayText = cleanFailedCode || 'ERR_FAILED';
  }

  return {
    status,
    isActive,
    label,
    displayText,
    rawErrorCode,
    shortErrorCode: cleanFailedCode || shortErrorCode,
    tooltip,
  };
}
