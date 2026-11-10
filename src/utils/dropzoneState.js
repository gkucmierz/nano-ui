/**
 * Deterministic Drag & Drop State Machine and File Validator (`@gkucmierz/nano-ui`).
 * Prevents child-element `dragenter`/`dragleave` hover flickering via a depth counter
 * plus `contains(relatedTarget)` boundary checks, and validates dropped/selected files
 * against HTML5 `accept` patterns and byte size limits.
 */

export const DROPZONE_MODES = Object.freeze(['box', 'overlay']);

export function formatDropzoneBytes(bytes) {
  const num = Number(bytes);
  if (!Number.isFinite(num) || num < 0) return 'Unlimited';
  if (num === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(num) / Math.log(1024)));
  const scaled = num / Math.pow(1024, idx);
  const rounded = idx === 0 ? Math.round(scaled) : Number(scaled.toFixed(1));
  return `${rounded} ${units[idx]}`;
}

/**
 * Checks whether a file (`{ name, type }`) matches an HTML5 `accept` specification
 * (e.g. `"video/*,.mov,.mp4"`, `"image/*"`, `".json,.csv"`).
 */
export function matchesAcceptPattern(file, accept = '') {
  if (!file) return false;
  const rawAccept = String(accept || '').trim();
  if (!rawAccept || rawAccept === '*' || rawAccept === '*/*') return true;

  const tokens = rawAccept
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;

  const fileName = String(file.name || '').toLowerCase();
  const mimeType = String(file.type || '').toLowerCase();

  return tokens.some((token) => {
    if (token === '*' || token === '*/*') return true;
    if (token.startsWith('.')) {
      return fileName.endsWith(token);
    }
    if (token.endsWith('/*')) {
      const prefix = token.slice(0, -1); // e.g. 'video/'
      if (mimeType.startsWith(prefix)) return true;
      // Fallback extension heuristic when OS/browser omits MIME type on drag
      if (prefix === 'video/') {
        return /\.(mov|mp4|webm|m4v|mkv|avi|ogv)$/i.test(fileName);
      }
      if (prefix === 'image/') {
        return /\.(png|jpe?g|webp|gif|svg|avif|bmp|ico)$/i.test(fileName);
      }
      if (prefix === 'audio/') {
        return /\.(mp3|wav|ogg|flac|m4a|aac|nsd)$/i.test(fileName);
      }
      return false;
    }
    return mimeType === token;
  });
}

/**
 * Partitions an incoming `FileList` or `File[]` into `{ accepted, rejected }`
 * according to `accept`, `maxSizeBytes`, and `multiple`.
 */
export function validateDroppedFiles(
  fileList,
  { accept = '', maxSizeBytes = 0, multiple = false } = {}
) {
  const list = Array.from(fileList || []).filter(Boolean);
  const accepted = [];
  const rejected = [];
  const maxBytes = Number(maxSizeBytes) > 0 ? Number(maxSizeBytes) : 0;

  for (let i = 0; i < list.length; i++) {
    const file = list[i];
    if (!multiple && accepted.length >= 1) {
      rejected.push({
        file,
        reason: 'count',
        message: `Single-file mode: "${file.name || 'file'}" skipped`,
      });
      continue;
    }

    if (!matchesAcceptPattern(file, accept)) {
      rejected.push({
        file,
        reason: 'type',
        message: `File "${file.name || 'file'}" does not match accepted format (${accept})`,
      });
      continue;
    }

    const size = Number(file.size) || 0;
    if (maxBytes > 0 && size > maxBytes) {
      rejected.push({
        file,
        reason: 'size',
        message: `File "${file.name || 'file'}" (${formatDropzoneBytes(size)}) exceeds limit of ${formatDropzoneBytes(maxBytes)}`,
      });
      continue;
    }

    accepted.push(file);
  }

  return {
    accepted,
    rejected,
  };
}

/**
 * Anti-flicker drag-hover state machine for both standalone dropzones (`mode="box"`)
 * and full-panel overlay wrappers (`mode="overlay"`).
 */
export function createDropzoneStateMachine({ disabled = false } = {}) {
  let isDisabled = Boolean(disabled);
  let dragDepth = 0;
  let isDragOver = false;

  const getState = () => ({
    dragDepth,
    isDragOver: !isDisabled && isDragOver,
    disabled: isDisabled,
  });

  const setDisabled = (nextDisabled) => {
    isDisabled = Boolean(nextDisabled);
    if (isDisabled) {
      dragDepth = 0;
      isDragOver = false;
    }
    return getState();
  };

  const onDragEnter = (event = null) => {
    if (isDisabled) return getState();
    dragDepth += 1;
    isDragOver = true;
    if (event && event.dataTransfer) {
      try {
        event.dataTransfer.dropEffect = 'copy';
      } catch {}
    }
    return getState();
  };

  const onDragOver = (event = null) => {
    if (isDisabled) return getState();
    if (dragDepth <= 0) {
      dragDepth = 1;
    }
    isDragOver = true;
    if (event && event.dataTransfer) {
      try {
        event.dataTransfer.dropEffect = 'copy';
      } catch {}
    }
    return getState();
  };

  const onDragLeave = (event = null) => {
    if (isDisabled) return getState();
    // If the pointer moved into a child element inside currentTarget, keep hover active
    const cur = event?.currentTarget;
    const rel = event?.relatedTarget;
    if (cur && rel && typeof cur.contains === 'function' && cur.contains(rel)) {
      return getState();
    }
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) {
      isDragOver = false;
    }
    return getState();
  };

  const onDrop = () => {
    dragDepth = 0;
    isDragOver = false;
    return getState();
  };

  const reset = () => {
    dragDepth = 0;
    isDragOver = false;
    return getState();
  };

  return {
    getState,
    setDisabled,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    reset,
  };
}
