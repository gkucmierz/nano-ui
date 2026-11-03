import { ref } from 'vue';

export const dialogState = ref({
  isOpen: false,
  type: 'alert', // 'alert' | 'confirm'
  title: '',
  message: '',
  okText: 'OK',
  cancelText: 'Cancel',
  resolve: null,
});

export const showAlert = (message, title = 'Notice', okText = 'OK') =>
  new Promise(resolve => {
    dialogState.value = {
      isOpen: true,
      type: 'alert',
      title,
      message,
      okText,
      cancelText: '',
      resolve,
    };
  });

export const showConfirm = (
  message,
  title = 'Confirm',
  okText = 'Confirm',
  cancelText = 'Cancel'
) =>
  new Promise(resolve => {
    dialogState.value = {
      isOpen: true,
      type: 'confirm',
      title,
      message,
      okText,
      cancelText,
      resolve,
    };
  });

export const handleOk = () => {
  dialogState.value.isOpen = false;
  if (dialogState.value.resolve) dialogState.value.resolve(true);
};

export const handleCancel = () => {
  dialogState.value.isOpen = false;
  if (dialogState.value.resolve) dialogState.value.resolve(false);
};

export const useDialog = () => ({
  dialogState,
  showAlert,
  showConfirm,
  handleOk,
  handleCancel,
});

export default useDialog;
