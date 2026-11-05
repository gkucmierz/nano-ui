import { createSecretByteBuffer, sanitizeSecretPaste } from '../utils/secretPipe.js';

function resolveOptions(bindingValue) {
  if (typeof bindingValue === 'function') {
    return {
      onSubmit: bindingValue,
      onChange: null,
      maxBytes: 512,
      wipeOnSubmit: true,
    };
  }
  if (bindingValue && typeof bindingValue === 'object') {
    return {
      onSubmit: typeof bindingValue.onSubmit === 'function' ? bindingValue.onSubmit : null,
      onChange: typeof bindingValue.onChange === 'function' ? bindingValue.onChange : null,
      maxBytes: Number(bindingValue.maxBytes) > 0 ? Number(bindingValue.maxBytes) : 512,
      wipeOnSubmit: bindingValue.wipeOnSubmit !== false,
    };
  }
  return {
    onSubmit: null,
    onChange: null,
    maxBytes: 512,
    wipeOnSubmit: true,
  };
}

export const secretPipeDirective = {
  mounted(el, binding) {
    const opts = resolveOptions(binding.value);
    el._secretPipeOpts = opts;
    const buffer = createSecretByteBuffer(opts.maxBytes);
    el._secretPipeBuffer = buffer;

    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    if (!el.hasAttribute('role')) el.setAttribute('role', 'textbox');
    el.setAttribute('aria-autocomplete', 'none');
    el.setAttribute('data-lpignore', 'true');
    el.setAttribute('data-1p-ignore', 'true');
    el.setAttribute('data-bwignore', 'true');
    el.setAttribute('data-form-type', 'other');
    el.setAttribute('spellcheck', 'false');
    el.setAttribute('autocapitalize', 'off');
    el.setAttribute('translate', 'no');
    el.dataset.secretBytes = '0';
    el.dataset.secretChars = '0';

    const syncMetrics = () => {
      const byteCount = buffer.getByteLength();
      const charCount = buffer.getCharLength();
      el.dataset.secretBytes = String(byteCount);
      el.dataset.secretChars = String(charCount);
      if (el._secretPipeOpts?.onChange) {
        el._secretPipeOpts.onChange({
          byteCount,
          charCount,
          wipe: () => {
            buffer.wipe();
            syncMetrics();
          },
        });
      }
    };

    const submitSecret = () => {
      const byteCount = buffer.getByteLength();
      if (byteCount === 0) return;
      const charCount = buffer.getCharLength();
      const snapshot = buffer.toUint8Array();
      if (el._secretPipeOpts?.onSubmit) {
        el._secretPipeOpts.onSubmit({
          bytes: snapshot,
          byteCount,
          charCount,
          decodeText: () => new TextDecoder().decode(snapshot),
          wipe: () => {
            snapshot.fill(0);
            buffer.wipe();
            syncMetrics();
          },
        });
      }
      if (el._secretPipeOpts?.wipeOnSubmit !== false) {
        snapshot.fill(0);
        buffer.wipe();
        syncMetrics();
      }
    };

    el._secretPipeKeydown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        submitSecret();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        buffer.wipe();
        syncMetrics();
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        e.stopPropagation();
        buffer.popCodePoint();
        syncMetrics();
        return;
      }
      if (e.key && e.key.length === 1) {
        e.preventDefault();
        e.stopPropagation();
        buffer.pushText(e.key);
        syncMetrics();
      }
    };

    el._secretPipePaste = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const raw = e.clipboardData?.getData('text/plain') || '';
      const clean = sanitizeSecretPaste(raw);
      if (clean) {
        buffer.pushText(clean);
        syncMetrics();
      }
    };

    el._secretPipeContextMenu = (e) => {
      e.preventDefault();
    };

    el.addEventListener('keydown', el._secretPipeKeydown);
    el.addEventListener('paste', el._secretPipePaste);
    el.addEventListener('contextmenu', el._secretPipeContextMenu);
  },

  updated(el, binding) {
    el._secretPipeOpts = resolveOptions(binding.value);
  },

  unmounted(el) {
    if (el._secretPipeBuffer) {
      el._secretPipeBuffer.wipe();
      delete el._secretPipeBuffer;
    }
    if (el._secretPipeKeydown) {
      el.removeEventListener('keydown', el._secretPipeKeydown);
      el.removeEventListener('paste', el._secretPipePaste);
      el.removeEventListener('contextmenu', el._secretPipeContextMenu);
      delete el._secretPipeKeydown;
      delete el._secretPipePaste;
      delete el._secretPipeContextMenu;
    }
    delete el._secretPipeOpts;
  },
};
