import { ref } from 'vue';

const objTag = (v) => Object.prototype.toString.call(v);
const isStr = (v) => objTag(v) === '[object String]';
const isObj = (v) => v !== null && objTag(v) === '[object Object]';

export const dialogState = ref({
  isOpen: false,
  type: 'info', // 'info' | 'alert' | 'confirm' | 'warn' | 'danger' | 'success'
  title: 'Notice',
  message: '',
  okText: 'OK',
  cancelText: 'Cancel',
  okVariant: 'primary', // 'primary' | 'danger' | 'success'
  showCancel: false,
  glassmorphism: true,
  glassHeader: true,
  glassFooter: false,
  closeOnBackdrop: true,
  width: 440,
  resolve: null,
});

/**
 * Displays a Promise-based alert dialog (resolves `true` on OK, `false` on ESC/close).
 * Supports both positional `(message, 'Title', 'OK')` and options object
 * `(message, { title, type, dangerous, okText, okVariant, glassHeader, glassFooter, width })`.
 */
const settlePendingDialog = () => {
  const prevResolver = dialogState.value.resolve;
  if (prevResolver) {
    dialogState.value.resolve = null;
    prevResolver(false);
  }
};

export const showAlert = (message, options = {}, legacyOkText) => {
  settlePendingDialog();
  const opts = isStr(options)
    ? { title: options, ...(isStr(legacyOkText) ? { okText: legacyOkText } : {}) }
    : isObj(options)
      ? options
      : {};

  const isDangerous = Boolean(opts.dangerous || opts.type === 'danger');
  const resolvedType = opts.type || (isDangerous ? 'danger' : 'info');
  const resolvedVariant =
    opts.okVariant ||
    (isDangerous ? 'danger' : resolvedType === 'success' ? 'success' : 'primary');

  return new Promise((resolve) => {
    dialogState.value = {
      isOpen: true,
      type: resolvedType,
      title: opts.title || (isDangerous ? 'Error' : resolvedType === 'success' ? 'Success' : 'Notice'),
      message: String(message ?? ''),
      okText: opts.okText || 'OK',
      cancelText: '',
      okVariant: resolvedVariant,
      showCancel: false,
      glassmorphism: opts.glassmorphism !== false,
      glassHeader: opts.glassHeader !== false,
      glassFooter: Boolean(opts.glassFooter),
      closeOnBackdrop: opts.closeOnBackdrop !== false,
      width: Number(opts.width) > 0 ? Number(opts.width) : 440,
      resolve,
    };
  });
};

/**
 * Displays a Promise-based confirmation dialog (resolves `true` on Confirm, `false` on Cancel/ESC).
 * Supports both positional `(message, 'Confirm', 'OK', 'Cancel')` and options object
 * `(message, { title, dangerous: true, type, okText, cancelText, okVariant, width })`.
 */
export const showConfirm = (
  message,
  options = {},
  legacyOkText,
  legacyCancelText
) => {
  settlePendingDialog();
  const opts = isStr(options)
    ? {
      title: options,
      ...(isStr(legacyOkText) ? { okText: legacyOkText } : {}),
      ...(isStr(legacyCancelText) ? { cancelText: legacyCancelText } : {}),
    }
    : isObj(options)
      ? options
      : {};

  const isDangerous = Boolean(opts.dangerous || opts.type === 'danger');
  const resolvedType = opts.type || (isDangerous ? 'danger' : 'confirm');

  return new Promise((resolve) => {
    dialogState.value = {
      isOpen: true,
      type: resolvedType,
      title: opts.title || (isDangerous ? 'Warning' : 'Confirm'),
      message: String(message ?? ''),
      okText: opts.okText || (isDangerous ? 'Delete' : 'Confirm'),
      cancelText: opts.cancelText || 'Cancel',
      okVariant: opts.okVariant || (isDangerous ? 'danger' : 'primary'),
      showCancel: true,
      glassmorphism: opts.glassmorphism !== false,
      glassHeader: opts.glassHeader !== false,
      glassFooter: Boolean(opts.glassFooter),
      closeOnBackdrop: opts.closeOnBackdrop !== false,
      width: Number(opts.width) > 0 ? Number(opts.width) : 440,
      resolve,
    };
  });
};

export const handleOk = () => {
  const resolver = dialogState.value.resolve;
  dialogState.value.isOpen = false;
  dialogState.value.resolve = null;
  if (resolver) resolver(true);
};

export const handleCancel = () => {
  const resolver = dialogState.value.resolve;
  dialogState.value.isOpen = false;
  dialogState.value.resolve = null;
  if (resolver) resolver(false);
};

export const useDialog = () => ({
  dialogState,
  showAlert,
  showConfirm,
  handleOk,
  handleCancel,
});

export default useDialog;
