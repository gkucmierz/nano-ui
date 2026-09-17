<script setup>
import { ref } from 'vue';
import NanoModal from '../../components/NanoModal.vue';

const showBasic = ref(false);
const showAdvanced = ref(false);
const showCustom = ref(false);
</script>

<template>
  <div class="doc-page">
    <h2>NanoModal Component</h2>
    <p>A fully configurable, generic modal window component with draggable, resizable, and glassmorphism capabilities.</p>

    <div class="demo-section">
      <h3>Basic Usage</h3>
      <button class="demo-btn" @click="showBasic = true">Open Basic Modal</button>
      
      <NanoModal 
        :visible="showBasic" 
        title="Basic Modal" 
        @close="showBasic = false"
        @ok="showBasic = false"
        @cancel="showBasic = false"
      >
        <template #body>
          <p>This is a standard modal with default settings. Press ESC or click outside to close.</p>
        </template>
      </NanoModal>
    </div>

    <div class="demo-section">
      <h3>Draggable & Resizable</h3>
      <button class="demo-btn" @click="showAdvanced = true">Open Advanced Modal</button>
      
      <NanoModal 
        :visible="showAdvanced" 
        title="Draggable & Resizable" 
        :draggable="true"
        :resizable="true"
        :min-width="400"
        :min-height="300"
        @close="showAdvanced = false"
        @ok="showAdvanced = false"
        @cancel="showAdvanced = false"
      >
        <template #body>
          <p>You can drag this modal around using the header!</p>
          <p>You can also resize it using the handle in the bottom right corner.</p>
          <p>It will not escape the boundaries of your browser window.</p>
        </template>
      </NanoModal>
    </div>

    <div class="demo-section">
      <h3>No Header, No Footer</h3>
      <button class="demo-btn" @click="showCustom = true">Open Custom Modal</button>
      
      <NanoModal 
        :visible="showCustom" 
        :show-header="false"
        :show-footer="false"
        @close="showCustom = false"
      >
        <template #body>
          <div style="text-align: center; padding: 2rem;">
            <h2>Look ma, no header!</h2>
            <p>This modal only has a body slot.</p>
            <button class="demo-btn" style="margin-top: 1rem;" @click="showCustom = false">Close Me</button>
          </div>
        </template>
      </NanoModal>
    </div>

    <div class="api-reference">
      <h3>API Reference</h3>
      <pre><code>// Props
visible: Boolean (default: false)
title: String
width: String | Number (default: 600)
height: String | Number (default: 'auto')
draggable: Boolean (default: false)
resizable: Boolean (default: false)
showHeader/Body/Footer: Boolean (default: true)
showOk/Cancel: Boolean (default: true)
glassmorphism: Boolean (default: true)

// Events
@close - Emitted when modal is closed via UI (X btn, ESC, Backdrop)
@cancel - Emitted on Cancel button. Automatically triggers closeModal().
@ok - Emitted on OK button. Does NOT close the modal automatically (ideal for async operations).</code></pre>
    </div>
  </div>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

h2 {
  margin: 0;
  color: var(--nano-text-main);
}

h3 {
  margin-bottom: 1rem;
  color: var(--nano-text-main);
  border-bottom: 1px solid var(--nano-border-subtle);
  padding-bottom: 0.5rem;
}

.demo-section {
  background: var(--nano-bg-card);
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid var(--nano-border-card);
}

.demo-btn {
  background: #6366f1;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color var(--nano-transition-interactive);
}

.demo-btn:hover {
  background: #4f46e5;
}

.api-reference {
  background: var(--nano-bg-code);
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid var(--nano-border-card);
}

.api-reference h3 {
  margin-top: 0;
}

.api-reference code {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.9rem;
  color: var(--nano-text-code);
  line-height: 1.6;
}
</style>
