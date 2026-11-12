<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import NanoModal from '../../components/NanoModal.vue';
import NanoDialog from '../../components/NanoDialog.vue';
import NanoLightbox from '../../components/NanoLightbox.vue';
import { useDialog } from '../../composables/useDialog.js';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { getScopedStorageController } from '../../utils/storage-controller.js';
import { createDocTabs } from '../docSnippets.js';

const { showAlert, showConfirm } = useDialog();
const showBasic = ref(false);
const showAdvanced = ref(false);
const showCustom = ref(false);
const showLightbox = ref(false);
const lightboxIdx = ref(0);
const demoLightboxItems = [
  {
    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600"><rect width="960" height="600" fill="%23111827"/><circle cx="480" cy="300" r="160" fill="%236366f1" opacity="0.85"/><text x="480" y="312" text-anchor="middle" fill="%23f8fafc" font-family="sans-serif" font-size="34" font-weight="700">NanoLightbox Slide 1</text></svg>',
    alt: 'NanoLightbox Slide 1',
    caption: 'Top-layer native <dialog> lightbox with frosted backdrop-filter blur and keyboard navigation.',
    badge: 'Studio Render',
  },
  {
    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600"><rect width="960" height="600" fill="%230f172a"/><rect x="260" y="140" width="440" height="320" rx="28" fill="%2310b981" opacity="0.85"/><text x="480" y="312" text-anchor="middle" fill="%23f8fafc" font-family="sans-serif" font-size="34" font-weight="700">NanoLightbox Slide 2</text></svg>',
    alt: 'NanoLightbox Slide 2',
    caption: 'Click outside or press Esc to light-dismiss; click image to toggle 1.75x zoom.',
    badge: 'Color-Graded 5500K',
  },
];

const advancedModalRef = ref(null);
const storageMode = ref('ls');
const hostAppPrefix = ref('dashboard-app');
const customPropKey = ref('demo_geometry');
const storageTick = ref(0);

const nanoStorage = getScopedStorageController('nano-ui');
let unsubscribeStorage = null;

onMounted(() => {
  unsubscribeStorage = nanoStorage.subscribe(() => {
    storageTick.value += 1;
  });
});

onUnmounted(() => {
  if (unsubscribeStorage) unsubscribeStorage();
});

watch([storageMode, hostAppPrefix, customPropKey], () => {
  storageTick.value += 1;
});

const storageOptions = [
  {
    value: 'ls',
    badge: 'ls',
    label: 'localStorage (Trwały)',
    desc: 'Persists geometry across browser restarts & tabs',
  },
  {
    value: 'ss',
    badge: 'ss',
    label: 'sessionStorage (Ulotny)',
    desc: 'Persists geometry only for current tab session',
  },
  {
    value: 'none',
    badge: 'none',
    label: 'Brak zapisu (Disabled)',
    desc: 'No Web Storage write — resets on reopen',
  },
];

const appPrefixPresets = ['dashboard-app', 'workflow-app', 'cv-app', 'nano-ui'];

const liveInspection = computed(() => {
  // Depend on reactive tick so drag/resize updates immediately
  const _tick = storageTick.value;
  return nanoStorage.inspect(customPropKey.value, {
    mode: storageMode.value,
    appPrefix: hostAppPrefix.value,
  });
});

const handleGeometryChange = () => {
  storageTick.value += 1;
};

const handleResetSavedGeometry = () => {
  if (advancedModalRef.value) {
    advancedModalRef.value.resetGeometry();
  } else {
    nanoStorage.remove(customPropKey.value, {
      mode: storageMode.value,
      appPrefix: hostAppPrefix.value,
    });
  }
  storageTick.value += 1;
};

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
    'storage="ls"',
    'app-prefix="dashboard-app"',
    'storage-key="modal_demo_geometry"',
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
        'storage: "ls" | "ss" | "none" | Boolean (default: "ls") - Storage persistence mode (localStorage, sessionStorage, or disabled)',
        'appPrefix: String (default: auto-detected) - Host app prefix for hierarchical key <appPrefix>_nano-ui_<storageKey>',
        'storageKey: String (default: "") - Prop/modal key suffix persisted via @gkucmierz/storage-controller',
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
        '@geometry-change: ({ x, y, width, height, isMaximized, mode, storageKey }) => void - Emitted on drag/resize/reset',
      ],
    },
    {
      title: 'Exposed Methods & State (via template ref)',
      items: [
        'open() / close(): void - Programmatically open or close modal',
        'toggleMaximize(): void - Toggle fullscreen vs restored window geometry',
        'resetGeometry(): void - Clear saved position/size in active storage and recenter modal',
        'effectiveStorageKey / resolvedStorageMode: ComputedRef<String>',
        'isVisible / isMaximized / isDragging / isResizing: ComputedRef/Ref',
      ],
    },
  ],
});
</script>

<template>
  <div class="doc-page">
    <h2>NanoModal Component</h2>
    <p>A fully configurable, generic modal window component with draggable, resizable, glassmorphism, and hierarchical storage persistence (<code>@gkucmierz/storage-controller</code>).</p>

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
      <h3>Draggable, Resizable &amp; Storage Persistence (<code>ls</code> / <code>ss</code> / <code>none</code>)</h3>
      <p class="section-subtitle">
        Choose how <code>NanoModal</code> persists its dragged position and resized dimensions via the
        <code>@gkucmierz/storage-controller</code> singleton and hierarchical key inheritance
        (<code>&lt;appPrefix&gt;_nano-ui_&lt;storageKey&gt;</code>).
      </p>

      <div class="storage-playground-grid">
        <div class="storage-mode-radios" role="radiogroup" aria-label="Storage Persistence Mode">
          <label
            v-for="opt in storageOptions"
            :key="opt.value"
            class="storage-mode-card"
            :class="{ active: storageMode === opt.value }"
          >
            <input
              :id="`nano-modal-storage-mode-${opt.value}`"
              v-model="storageMode"
              type="radio"
              name="nano-modal-storage-mode"
              :value="opt.value"
              class="sr-only-radio"
            />
            <div class="storage-mode-card-top">
              <span class="storage-badge" :class="`badge-${opt.value}`">{{ opt.badge }}</span>
              <span class="storage-label">{{ opt.label }}</span>
            </div>
            <span class="storage-desc">{{ opt.desc }}</span>
          </label>
        </div>

        <div class="prefix-config-row">
          <div class="prefix-field">
            <span class="field-label">Host App Prefix (<code>appPrefix</code>):</span>
            <div class="preset-chips">
              <button
                v-for="preset in appPrefixPresets"
                :key="preset"
                type="button"
                class="preset-chip"
                :class="{ active: hostAppPrefix === preset }"
                @click="hostAppPrefix = preset"
              >
                {{ preset }}
              </button>
            </div>
          </div>

          <div class="prefix-field">
            <label class="field-label" for="modal-storage-key-input">
              Prop Key Suffix (<code>storageKey</code>):
            </label>
            <input
              id="modal-storage-key-input"
              v-model="customPropKey"
              name="modal-storage-key-input"
              type="text"
              class="key-input"
              placeholder="modal_demo_geometry"
            />
          </div>
        </div>

        <div class="storage-inspector-box">
          <div class="inspector-header">
            <div class="resolved-key-display">
              <span class="inspector-caption">Resolved Acronym Key:</span>
              <code
                v-tooltip="`from ${liveInspection.verboseKey}`"
                class="hierarchical-key-pill"
                style="cursor: help;"
              ><template v-if="liveInspection.displayAppSeg && liveInspection.displayAppSeg !== liveInspection.displayScopeSeg"><span class="seg-app">{{ liveInspection.displayAppSeg }}</span>_</template><span class="seg-lib">{{ liveInspection.displayScopeSeg }}</span>_<span class="seg-key">{{ liveInspection.rawKey }}</span></code>
              <span class="inspector-caption">
                (from <code>{{ liveInspection.verboseKey }}</code>)
              </span>
            </div>
            <div class="inspector-badges">
              <span class="status-pill" :class="liveInspection.mode === 'none' ? 'is-muted' : 'is-active'">
                Backend: {{ liveInspection.backend }}
              </span>
              <span class="status-pill" :class="liveInspection.exists ? 'is-saved' : 'is-empty'">
                {{ liveInspection.exists ? `Saved (${liveInspection.byteLength} B)` : 'Not saved yet' }}
              </span>
            </div>
          </div>

          <pre class="inspector-json">{{ liveInspection.exists ? JSON.stringify(liveInspection.parsedValue, null, 2) : (liveInspection.mode === 'none' ? '// Persistence disabled (storage="none")' : '// Drag or resize the modal to persist { x, y, width, height, isMaximized }') }}</pre>

          <div class="inspector-actions">
            <button class="demo-btn" @click="showAdvanced = true">
              Open Draggable &amp; Resizable Modal
            </button>
            <button
              type="button"
              class="demo-btn secondary-btn"
              @click="handleResetSavedGeometry"
            >
              Reset Saved Geometry
            </button>
          </div>
        </div>
      </div>

      <NanoModal
        ref="advancedModalRef"
        :visible="showAdvanced"
        title="Draggable & Resizable (Storage Controller Demo)"
        :draggable="true"
        :resizable="true"
        :storage="storageMode"
        :app-prefix="hostAppPrefix"
        :storage-key="customPropKey"
        :min-width="420"
        :min-height="320"
        @geometry-change="handleGeometryChange"
        @close="showAdvanced = false"
        @ok="showAdvanced = false"
        @cancel="showAdvanced = false"
      >
        <template #body>
          <div class="modal-live-telemetry">
            <p style="margin-top: 0;">
              Drag this window by its header, resize from the bottom-right corner, or double-click the header to toggle fullscreen.
            </p>
            <div class="modal-inline-mode-bar">
              <label
                v-for="opt in storageOptions"
                :key="`inline-${opt.value}`"
                class="inline-mode-pill"
                :class="{ active: storageMode === opt.value }"
              >
                <input
                  :id="`nano-modal-inline-storage-mode-${opt.value}`"
                  v-model="storageMode"
                  type="radio"
                  name="nano-modal-inline-storage-mode"
                  :value="opt.value"
                  class="sr-only-radio"
                />
                <span>{{ opt.badge.toUpperCase() }} — {{ opt.label }}</span>
              </label>
            </div>
            <div class="modal-telemetry-readout">
              <div><strong>Key:</strong> <code>{{ liveInspection.resolvedKey }}</code></div>
              <div><strong>Backend:</strong> <code>{{ liveInspection.backend }}</code></div>
              <div><strong>Stored Payload:</strong> <code>{{ liveInspection.rawValue || 'null (center default)' }}</code></div>
            </div>
          </div>
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

    <div class="demo-section">
      <h3>Promise-Based Alert &amp; Confirm (NanoDialog + useDialog)</h3>
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <button class="demo-btn" @click="showAlert('Operation completed cleanly.', 'System Notice')">
          Trigger Alert
        </button>
        <button class="demo-btn" @click="showConfirm('Proceed with configuration reset?', 'Confirm Action')">
          Trigger Confirm
        </button>
      </div>
      <NanoDialog />
    </div>

    <div class="demo-section">
      <h3>Blurred Backdrop Photo Lightbox (NanoLightbox)</h3>
      <button class="demo-btn" @click="showLightbox = true">Open Photo Lightbox</button>
      <NanoLightbox
        v-model="showLightbox"
        v-model:active-index="lightboxIdx"
        :items="demoLightboxItems"
      />
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
  margin-bottom: 0.75rem;
  color: var(--nano-text-main);
  border-bottom: 1px solid var(--nano-border-subtle);
  padding-bottom: 0.5rem;
}

.section-subtitle {
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--nano-text-muted);
  font-size: 0.92rem;
  line-height: 1.5;
}

.demo-section {
  background: var(--nano-bg-card);
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid var(--nano-border-card);
}

.storage-playground-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.storage-mode-radios {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 0.75rem;
}

.storage-mode-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.85rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-muted);
  cursor: pointer;
  user-select: none;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.storage-mode-card.active {
  border-color: var(--nano-accent-primary);
  background: var(--nano-nav-active-bg);
}

.sr-only-radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
}

.storage-mode-card-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.storage-badge {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 4px;
}

.badge-ls {
  background: var(--nano-status-success-bg);
  border: 1px solid var(--nano-status-success-border);
  color: var(--nano-status-success-text);
}

.badge-ss {
  background: var(--nano-status-info-bg);
  border: 1px solid var(--nano-status-info-border);
  color: var(--nano-status-info-text);
}

.badge-none {
  background: var(--nano-status-neutral-bg);
  border: 1px solid var(--nano-status-neutral-border);
  color: var(--nano-status-neutral-text);
}

.storage-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--nano-text-main);
}

.storage-desc {
  font-size: 0.78rem;
  color: var(--nano-text-muted);
  line-height: 1.35;
}

.prefix-config-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-subtle);
}

.prefix-field {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.field-label {
  font-size: 0.84rem;
  color: var(--nano-text-muted);
}

.preset-chips {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.preset-chip {
  height: 30px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-card);
  color: var(--nano-text-main);
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.78rem;
  cursor: pointer;
}

.preset-chip.active {
  border-color: var(--nano-accent-primary);
  background: var(--nano-nav-active-bg);
  color: var(--nano-nav-active-color);
  font-weight: 600;
}

.key-input {
  height: 30px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-card);
  color: var(--nano-text-main);
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.82rem;
}

.storage-inspector-box {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 8px;
  background: var(--nano-bg-code);
  border: 1px solid var(--nano-border-card);
}

.inspector-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.resolved-key-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.inspector-caption {
  font-size: 0.8rem;
  color: var(--nano-text-muted);
}

.hierarchical-key-pill {
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-card);
  color: var(--nano-text-main);
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.84rem;
}

.seg-app {
  color: var(--nano-status-info-text);
  font-weight: 600;
}

.seg-lib {
  color: var(--nano-status-purple-text);
  font-weight: 600;
}

.seg-key {
  color: var(--nano-status-success-text);
  font-weight: 600;
}

.inspector-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.status-pill {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
}

.status-pill.is-active {
  background: var(--nano-nav-active-bg);
  border: 1px solid var(--nano-border-card);
  color: var(--nano-nav-active-color);
}

.status-pill.is-muted {
  background: var(--nano-status-neutral-bg);
  border: 1px solid var(--nano-status-neutral-border);
  color: var(--nano-status-neutral-text);
}

.status-pill.is-saved {
  background: var(--nano-status-success-bg);
  border: 1px solid var(--nano-status-success-border);
  color: var(--nano-status-success-text);
}

.status-pill.is-empty {
  background: var(--nano-status-warn-bg);
  border: 1px solid var(--nano-status-warn-border);
  color: var(--nano-status-warn-text);
}

.inspector-json {
  margin: 0;
  padding: 0.75rem;
  border-radius: 6px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-subtle);
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.82rem;
  color: var(--nano-text-code);
  overflow-x: auto;
}

.inspector-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.demo-btn {
  height: 36px;
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  line-height: 1;
  background: #6366f1;
  color: white;
  border: none;
  padding: 0 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color var(--nano-transition-interactive);
}

.demo-btn:hover {
  background: #4f46e5;
}

.secondary-btn {
  background: transparent;
  color: var(--nano-text-main);
  border: 1px solid var(--nano-border-card);
}

.secondary-btn:hover {
  background: rgba(148, 163, 184, 0.12);
}

.modal-live-telemetry {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.modal-inline-mode-bar {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.inline-mode-pill {
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-muted);
  color: var(--nano-text-main);
  font-size: 0.8rem;
  cursor: pointer;
  user-select: none;
}

.inline-mode-pill.active {
  border-color: var(--nano-accent-primary);
  background: var(--nano-nav-active-bg);
  color: var(--nano-nav-active-color);
  font-weight: 600;
}

.modal-telemetry-readout {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.75rem;
  border-radius: 6px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-subtle);
  color: var(--nano-text-main);
  font-size: 0.84rem;
}
</style>
