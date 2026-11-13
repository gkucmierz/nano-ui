import {
  createSecretByteBuffer,
  sanitizeSecretPaste,
  isPrintableSecretKeyEvent,
} from '../utils/secretPipe.js';

function resolveOptions(bindingValue) {
  if (typeof bindingValue === 'function') {
    return {
      onSubmit: bindingValue,
      onChange: null,
      maxBytes: 512,
      wipeOnSubmit: true,
      exposeMetrics: false,
    };
  }
  if (bindingValue && typeof bindingValue === 'object') {
    return {
      onSubmit: typeof bindingValue.onSubmit === 'function' ? bindingValue.onSubmit : null,
      onChange: typeof bindingValue.onChange === 'function' ? bindingValue.onChange : null,
      maxBytes: Number(bindingValue.maxBytes) > 0 ? Number(bindingValue.maxBytes) : 512,
      wipeOnSubmit: bindingValue.wipeOnSubmit !== false,
      exposeMetrics: bindingValue.exposeMetrics === true,
    };
  }
  return {
    onSubmit: null,
    onChange: null,
    maxBytes: 512,
    wipeOnSubmit: true,
    exposeMetrics: false,
  };
}

export const secretPipeDirective = {
  mounted(el, binding) {
    const opts = resolveOptions(binding.value);
    el._secretPipeOpts = opts;
    const buffer = createSecretByteBuffer(opts.maxBytes);
    el._secretPipeBuffer = buffer;
    let isSubmitting = false;

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
    if (!el.dataset) el.dataset = {};
    el.dataset.secretArmed = 'false';

    const syncMetrics = () => {
      const byteCount = buffer.getByteLength();
      const charCount = buffer.getCharCount();
      if (el.dataset) {
        el.dataset.secretArmed = byteCount > 0 ? 'true' : 'false';
        if (el._secretPipeOpts?.exposeMetrics) {
          el.dataset.secretBytes = String(byteCount);
          el.dataset.secretChars = String(charCount);
        } else {
          delete el.dataset.secretBytes;
          delete el.dataset.secretChars;
        }
      }
      if (el._secretPipeOpts?.onChange) {
        el._secretPipeOpts.onChange({
          byteCount,
          charCount,
          armed: byteCount > 0,
          wipe: () => {
            buffer.wipe();
            syncMetrics();
          },
        });
      }
    };

    const submitSecret = async () => {
      if (isSubmitting) return;
      const byteCount = buffer.getByteLength();
      if (byteCount === 0) return;
      const charCount = buffer.getCharCount();
      const snapshot = buffer.extractAndWipe();
      syncMetrics();

      isSubmitting = true;
      try {
        if (el._secretPipeOpts?.onSubmit) {
          await el._secretPipeOpts.onSubmit({
            bytes: snapshot,
            byteCount,
            charCount,
            wipe: () => {
              snapshot.fill(0);
              buffer.wipe();
              syncMetrics();
            },
          });
        }
      } finally {
        if (el._secretPipeOpts?.wipeOnSubmit !== false) {
          snapshot.fill(0);
        }
        isSubmitting = false;
      }
    };

    el._secretPipeKeydown = (e) => {
      if ((e.metaKey || e.ctrlKey) && typeof e.key === 'string' && e.key.toLowerCase() === 'v') {
        return;
      }
      if ((e.ctrlKey && typeof e.key === 'string' && e.key.toLowerCase() === 'u') || (e.metaKey && e.key === 'Backspace')) {
        e.preventDefault();
        e.stopPropagation();
        buffer.wipe();
        syncMetrics();
        return;
      }
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
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
      if ((e.key === 'Backspace' || e.key === 'Delete') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        buffer.popChar();
        syncMetrics();
        return;
      }
      if (isPrintableSecretKeyEvent(e)) {
        e.preventDefault();
        e.stopPropagation();
        buffer.appendText(e.key);
        syncMetrics();
      }
    };

    el._secretPipePaste = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const raw = e.clipboardData?.getData('text/plain') || e.clipboardData?.getData('text') || '';
      const clean = sanitizeSecretPaste(raw);
      if (clean) {
        buffer.appendText(clean);
        syncMetrics();
      }
    };

    el._secretPipeBlockGuard = (e) => {
      e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    };

    el.addEventListener('keydown', el._secretPipeKeydown);
    el.addEventListener('paste', el._secretPipePaste);
    el.addEventListener('contextmenu', el._secretPipeBlockGuard);
    el.addEventListener('copy', el._secretPipeBlockGuard);
    el.addEventListener('cut', el._secretPipeBlockGuard);
    el.addEventListener('drop', el._secretPipeBlockGuard);
    el.addEventListener('dragover', el._secretPipeBlockGuard);
  },

  updated(el, binding) {
    el._secretPipeOpts = resolveOptions(binding.value);
  },

  unmounted(el) {
    if (el._secretPipeBuffer) {
      el._secretPipeBuffer.wipe();
      delete el._secretPipeBuffer;
    }
    if (el.dataset) {
      delete el.dataset.secretArmed;
      delete el.dataset.secretBytes;
      delete el.dataset.secretChars;
    }
    if (el._secretPipeKeydown) {
      el.removeEventListener('keydown', el._secretPipeKeydown);
      el.removeEventListener('paste', el._secretPipePaste);
      el.removeEventListener('contextmenu', el._secretPipeBlockGuard);
      el.removeEventListener('copy', el._secretPipeBlockGuard);
      el.removeEventListener('cut', el._secretPipeBlockGuard);
      el.removeEventListener('drop', el._secretPipeBlockGuard);
      el.removeEventListener('dragover', el._secretPipeBlockGuard);
      delete el._secretPipeKeydown;
      delete el._secretPipePaste;
      delete el._secretPipeBlockGuard;
    }
    delete el._secretPipeOpts;
  },
};
