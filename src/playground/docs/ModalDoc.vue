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
      <code>
        // Props<br>
        visible: Boolean (default: false)<br>
        title: String<br>
        width: String | Number (default: 600)<br>
        height: String | Number (default: 'auto')<br>
        draggable: Boolean (default: false)<br>
        resizable: Boolean (default: false)<br>
        showHeader/Body/Footer: Boolean (default: true)<br>
        showOk/Cancel: Boolean (default: true)<br>
        glassmorphism: Boolean (default: true)<br>
        <br>
        // Events<br>
        @close - Emitted when modal is closed via UI (X btn, ESC, Backdrop)<br>
        @cancel - Emitted on Cancel button. Automatically triggers closeModal().<br>
        @ok - Emitted on OK button. Does NOT close the modal automatically (ideal for async operations).
      </code>
    </div>
  </div>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

h2 { margin: 0; color: #fff; }
h3 { margin-bottom: 1rem; color: #a1a1aa; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; }

.demo-section {
  background: rgba(255, 255, 255, 0.02);
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.demo-btn {
  background: #6366f1;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.demo-btn:hover { background: #4f46e5; }

.api-reference {
  background: #1e1e1e;
  padding: 1rem;
  border-radius: 8px;
  font-family: monospace;
  color: #a1a1aa;
}
</style>
