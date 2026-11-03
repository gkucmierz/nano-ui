<script setup>
import NanoModal from './NanoModal.vue';
import { dialogState, handleOk, handleCancel } from '../composables/useDialog.js';
</script>

<template>
  <NanoModal
    :visible="dialogState.isOpen"
    :title="dialogState.title"
    :width="440"
    :show-cancel="dialogState.type === 'confirm'"
    :show-ok="true"
    :ok-text="dialogState.okText"
    :cancel-text="dialogState.cancelText"
    :close-on-backdrop="true"
    :glassmorphism="true"
    @ok="handleOk"
    @cancel="handleCancel"
    @close="handleCancel"
  >
    <template #body>
      <div class="nano-dialog-body">
        <div class="nano-dialog-icon" :class="dialogState.type">
          <svg
            v-if="dialogState.type === 'confirm'"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          <svg
            v-else
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div class="nano-dialog-message">
          <p>{{ dialogState.message }}</p>
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
  padding: 8px 0;
}

.nano-dialog-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(56, 189, 248, 0.12);
  color: var(--accent, #38bdf8);
  border: 1px solid rgba(56, 189, 248, 0.25);
}

.nano-dialog-icon.confirm {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.25);
}

.nano-dialog-message {
  flex: 1;
}

.nano-dialog-message p {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: var(--text-main, #f8fafc);
  -webkit-user-select: text;
  user-select: text;
}
</style>
