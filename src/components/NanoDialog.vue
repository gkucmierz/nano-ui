<script setup>
import { computed } from 'vue';
import NanoModal from './NanoModal.vue';
import NanoIcon from './NanoIcon.vue';
import { dialogState, handleOk, handleCancel } from '../composables/useDialog.js';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: undefined,
  },
  visible: {
    type: Boolean,
    default: undefined,
  },
  type: {
    type: String,
    default: undefined,
  },
  title: {
    type: String,
    default: undefined,
  },
  message: {
    type: String,
    default: undefined,
  },
  okText: {
    type: String,
    default: undefined,
  },
  cancelText: {
    type: String,
    default: undefined,
  },
  okVariant: {
    type: String,
    default: undefined,
  },
  showCancel: {
    type: Boolean,
    default: undefined,
  },
  showOk: {
    type: Boolean,
    default: true,
  },
  width: {
    type: [Number, String],
    default: undefined,
  },
  glassmorphism: {
    type: Boolean,
    default: undefined,
  },
  glassHeader: {
    type: Boolean,
    default: undefined,
  },
  glassFooter: {
    type: Boolean,
    default: undefined,
  },
  closeOnBackdrop: {
    type: Boolean,
    default: undefined,
  },
});

const emit = defineEmits(['ok', 'cancel', 'close', 'update:visible', 'update:modelValue']);

const isControlled = computed(
  () => props.modelValue !== undefined || props.visible !== undefined
);

const resolvedVisible = computed(() => {
  if (props.modelValue !== undefined) return props.modelValue;
  if (props.visible !== undefined) return props.visible;
  return dialogState.value.isOpen;
});

const resolvedType = computed(() => props.type || dialogState.value.type || 'info');

const resolvedTitle = computed(() =>
  props.title !== undefined ? props.title : dialogState.value.title
);

const resolvedMessage = computed(() =>
  props.message !== undefined ? props.message : dialogState.value.message
);

const resolvedOkText = computed(() => props.okText || dialogState.value.okText || 'OK');

const resolvedCancelText = computed(
  () => props.cancelText || dialogState.value.cancelText || 'Cancel'
);

const resolvedShowCancel = computed(() => {
  if (props.showCancel !== undefined) return props.showCancel;
  if (!isControlled.value) return Boolean(dialogState.value.showCancel || resolvedType.value === 'confirm');
  return resolvedType.value === 'confirm' || resolvedType.value === 'danger';
});

const resolvedOkVariant = computed(() => {
  if (props.okVariant) return props.okVariant;
  if (!isControlled.value && dialogState.value.okVariant) return dialogState.value.okVariant;
  if (resolvedType.value === 'danger') return 'danger';
  if (resolvedType.value === 'success') return 'success';
  return 'primary';
});

const resolvedWidth = computed(() => props.width ?? dialogState.value.width ?? 440);
const resolvedGlass = computed(() =>
  props.glassmorphism !== undefined ? props.glassmorphism : dialogState.value.glassmorphism !== false
);
const resolvedGlassHeader = computed(() =>
  props.glassHeader !== undefined ? props.glassHeader : Boolean(dialogState.value.glassHeader)
);
const resolvedGlassFooter = computed(() =>
  props.glassFooter !== undefined ? props.glassFooter : Boolean(dialogState.value.glassFooter)
);
const resolvedCloseOnBackdrop = computed(() =>
  props.closeOnBackdrop !== undefined
    ? props.closeOnBackdrop
    : dialogState.value.closeOnBackdrop !== false
);

const iconName = computed(() => {
  switch (resolvedType.value) {
    case 'confirm':
    case 'warn':
    case 'warning':
      return 'triangle-alert';
    case 'danger':
    case 'error':
      return 'circle-alert';
    case 'success':
      return 'circle-check';
    case 'alert':
      return 'circle-alert';
    case 'info':
    default:
      return 'info';
  }
});

const iconToneClass = computed(() => {
  switch (resolvedType.value) {
    case 'confirm':
    case 'warn':
    case 'warning':
      return 'is-warn';
    case 'danger':
    case 'error':
      return 'is-danger';
    case 'success':
      return 'is-success';
    default:
      return 'is-info';
  }
});

const onOk = () => {
  if (isControlled.value) {
    emit('ok');
    emit('update:visible', false);
    emit('update:modelValue', false);
  } else {
    handleOk();
  }
};

const onCancelOrClose = (source) => {
  if (isControlled.value) {
    emit(source);
    emit('update:visible', false);
    emit('update:modelValue', false);
  } else {
    handleCancel();
  }
};
</script>

<template>
  <NanoModal
    :visible="resolvedVisible"
    :title="resolvedTitle"
    :width="resolvedWidth"
    :show-cancel="resolvedShowCancel"
    :show-ok="showOk"
    :ok-text="resolvedOkText"
    :cancel-text="resolvedCancelText"
    :ok-variant="resolvedOkVariant"
    :close-on-backdrop="resolvedCloseOnBackdrop"
    :glassmorphism="resolvedGlass"
    :glass-header="resolvedGlassHeader"
    :glass-footer="resolvedGlassFooter"
    storage="none"
    @ok="onOk"
    @cancel="onCancelOrClose('cancel')"
    @close="onCancelOrClose('close')"
  >
    <template #body>
      <div class="nano-dialog-body">
        <div class="nano-dialog-icon" :class="iconToneClass" aria-hidden="true">
          <slot name="icon">
            <NanoIcon :name="iconName" :size="22" />
          </slot>
        </div>
        <div class="nano-dialog-message">
          <slot>
            <p>{{ resolvedMessage }}</p>
          </slot>
        </div>
      </div>
    </template>
  </NanoModal>
</template>

<style scoped>
.nano-dialog-body {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 6px 0;
}

.nano-dialog-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--nano-status-info-bg, rgba(56, 189, 248, 0.12));
  color: var(--nano-status-info-text, #0284c7);
  border: 1px solid var(--nano-status-info-border, rgba(56, 189, 248, 0.28));
}

.nano-dialog-icon.is-warn {
  background: var(--nano-status-warn-bg, rgba(245, 158, 11, 0.12));
  color: var(--nano-status-warn-text, #d97706);
  border-color: var(--nano-status-warn-border, rgba(245, 158, 11, 0.28));
}

.nano-dialog-icon.is-danger {
  background: var(--nano-status-danger-bg, rgba(239, 68, 68, 0.12));
  color: var(--nano-status-danger-text, #dc2626);
  border-color: var(--nano-status-danger-border, rgba(239, 68, 68, 0.28));
}

.nano-dialog-icon.is-success {
  background: var(--nano-status-success-bg, rgba(16, 185, 129, 0.12));
  color: var(--nano-status-success-text, #059669);
  border-color: var(--nano-status-success-border, rgba(16, 185, 129, 0.28));
}

.nano-dialog-message {
  flex: 1;
  min-width: 0;
  align-self: center;
}

.nano-dialog-message p {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--nano-modal-text, var(--nano-text-main, #0f172a));
  overflow-wrap: break-word;
  -webkit-user-select: text;
  user-select: text;
}
</style>
