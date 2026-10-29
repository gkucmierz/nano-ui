<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import NuMaskedInput from './NuMaskedInput.vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  unmasked: {
    type: String,
    default: '',
  },
  mask: {
    type: String,
    default: '',
  },
  length: {
    type: Number,
    default: 6,
  },
  placeholderChar: {
    type: String,
    default: '-',
  },
  guide: {
    type: Boolean,
    default: true,
  },
  masked: {
    type: Boolean,
    default: false,
  },
  autoSubmit: {
    type: Boolean,
    default: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  autofocus: {
    type: Boolean,
    default: false,
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  status: {
    type: String,
    default: 'normal',
    validator: (v) => ['normal', 'error', 'success'].includes(v),
  },
  actionLabel: {
    type: String,
    default: 'Verify',
  },
  expiresIn: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits([
  'update:modelValue',
  'update:unmasked',
  'complete',
  'submit',
  'expired',
]);

const maskedInputRef = ref(null);
const remainingSeconds = ref(Math.max(0, Math.floor(props.expiresIn || 0)));
let timerId = null;

const resolvedMask = computed(() => {
  if (props.mask) return props.mask;
  const len = Math.max(1, Math.floor(props.length || 6));
  if (len === 6) return '###-###';
  if (len === 4) return '####';
  if (len === 8) return '####-####';
  return '#'.repeat(len);
});

const isExpired = computed(() => props.expiresIn > 0 && remainingSeconds.value <= 0);

const formattedTimer = computed(() => {
  const sec = Math.max(0, remainingSeconds.value);
  const mins = Math.floor(sec / 60).toString().padStart(2, '0');
  const rem = (sec % 60).toString().padStart(2, '0');
  return `${mins}:${rem}`;
});

const clearTimer = () => {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
};

const startTimer = (seconds) => {
  clearTimer();
  const total = Math.max(0, Math.floor(seconds || 0));
  remainingSeconds.value = total;
  if (total <= 0) return;

  timerId = setInterval(() => {
    if (remainingSeconds.value > 0) {
      remainingSeconds.value -= 1;
      if (remainingSeconds.value <= 0) {
        clearTimer();
        emit('expired');
      }
    }
  }, 1000);
};

watch(() => props.expiresIn, (val) => {
  startTimer(val);
});

onMounted(() => {
  if (props.expiresIn > 0) {
    startTimer(props.expiresIn);
  }
});

onBeforeUnmount(() => {
  clearTimer();
});

const focus = () => {
  if (maskedInputRef.value) {
    maskedInputRef.value.focus();
  }
};

defineExpose({
  focus,
  remainingSeconds,
  isExpired,
});
</script>

<template>
  <div class="nu-pin-wrapper" :class="{ 'is-expired': isExpired }">
    <NuMaskedInput
      ref="maskedInputRef"
      class="nu-pin-input"
      :mask="resolvedMask"
      :model-value="modelValue"
      :unmasked="unmasked"
      :placeholder-char="placeholderChar"
      :guide="guide"
      :masked="masked"
      :auto-submit="autoSubmit"
      :disabled="disabled || isExpired"
      :autofocus="autofocus"
      :size="size"
      :status="isExpired ? 'error' : status"
      :action-label="actionLabel"
      @update:model-value="emit('update:modelValue', $event)"
      @update:unmasked="emit('update:unmasked', $event)"
      @complete="emit('complete', $event)"
      @submit="emit('submit', $event)"
    >
      <template v-if="$slots.action" #action>
        <slot name="action"></slot>
      </template>
    </NuMaskedInput>

    <div v-if="expiresIn > 0" class="nu-pin-timer" :class="{ 'is-expired': isExpired }">
      <span class="nu-pin-timer-label">{{ isExpired ? 'PIN Expired' : 'Expires in' }}</span>
      <span class="nu-pin-timer-val">{{ formattedTimer }}</span>
    </div>
  </div>
</template>

<style scoped>
.nu-pin-wrapper,
.nu-pin-wrapper *,
.nu-pin-wrapper *::before,
.nu-pin-wrapper *::after {
  box-sizing: border-box;
}

.nu-pin-wrapper {
  display: inline-flex;
  flex-direction: column;
  gap: 0.4rem;
}

.nu-pin-input {
  border-style: dashed;
  border-width: 1px;
  border-color: var(--nano-border-hover, rgba(255, 255, 255, 0.2));
}

.nu-pin-input:deep(.nu-masked-action) {
  border-left-style: dashed;
  border-left-color: var(--nano-border-hover, rgba(255, 255, 255, 0.2));
}

.nu-pin-timer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--nano-text-muted, #94a3b8);
  font-variant-numeric: tabular-nums;
  padding: 0 0.2rem;
  min-height: 18px;
}

.nu-pin-timer.is-expired {
  color: var(--nano-status-danger, #f87171);
}

.nu-pin-timer-val {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 600;
}
</style>
