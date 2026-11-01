<script setup>
import { ref } from 'vue';
import NanoModal from '../../components/NanoModal.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { createDocTabs } from '../docSnippets.js';

const showBasic = ref(false);
const showAdvanced = ref(false);
const showCustom = ref(false);

const codeTabs = createDocTabs({
  componentName: 'NanoModal',
  stateRef: 'isModalOpen',
  initialValue: 'false',
  templateAttrs: [
    'v-model="isModalOpen"',
    'title="Draggable & Resizable Modal"',
    ':width="600"',
    ':draggable="true"',
    ':resizable="true"',
  ],
  slotContent: '<template #body><p>Modal content</p></template>',
  apiSections: [
    {
      title: 'Props',
      items: [
        'modelValue / visible / show: Boolean (default: false) - Modal visibility (supports v-model)',
        'title: String (default: "") - Header title text',
        'width: String | Number (default: 600) - Modal window width',
        'height: String | Number (default: "auto") - Modal window height',
        'draggable: Boolean (default: false) - Allow dragging window via header bar',
        'resizable: Boolean (default: false) - Allow resizing window via bottom-right handle & header double-click fullscreen',
        'storageKey: String (default: "") - Persist window position/dimensions in localStorage',
        'showHeader / showBody / showFooter: Boolean (default: true) - Toggle modal sections',
        'glassmorphism: Boolean (default: false) - Enable backdrop blur overlay',
      ],
    },
    {
      title: 'Events',
      items: [
        '@update:modelValue / @close: () => void - Emitted when modal closes (X button, ESC, backdrop)',
        '@ok: () => void - Emitted on OK button click',
        '@cancel: () => void - Emitted on Cancel button click (auto-closes modal)',
      ],
    },
    {
      title: 'Exposed Methods & State (via template ref)',
      items: [
        'open() / close(): void - Programmatically open or close modal',
        'toggleMaximize(): void - Toggle fullscreen vs restored window geometry',
        'resetGeometry(): void - Clear saved position/size and recenter modal',
        'isVisible / isMaximized / isDragging / isResizing: ComputedRef/Ref',
      ],
    },
  ],
});
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

    <NanoCodeBlock :tabs="codeTabs" />
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
