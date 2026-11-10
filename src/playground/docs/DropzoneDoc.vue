<script setup>
import { ref } from 'vue';
import NanoDropzone from '../../components/NanoDropzone.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoNumberStepper from '../../components/NanoNumberStepper.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { formatDropzoneBytes } from '../../utils/dropzoneState.js';
import { createDocTabs } from '../docSnippets.js';

// Demo 1: Standalone Box Mode (independent state)
const boxDropzoneRef = ref(null);
const boxForceHover = ref(false);
const boxCompact = ref(false);
const boxDisabled = ref(false);
const boxAccent = ref('cyan');
const boxMaxSizeMb = ref(25);
const boxDroppedLog = ref([]);

// Demo 2: Container Overlay Mode (independent state)
const overlayDropzoneRef = ref(null);
const overlayForceHover = ref(false);
const overlayAccent = ref('indigo');
const overlayActiveFile = ref('nagranie-z-index-demo.mov (14.2 MB)');

const ACCENT_OPTIONS = ['cyan', 'indigo', 'emerald', 'amber', 'rose'];

function onBoxFiles(accepted, { rejected }) {
  const first = accepted[0];
  if (first) {
    boxDroppedLog.value.unshift({
      id: `${Date.now()}-${Math.random()}`,
      status: 'accepted',
      text: `${first.name} (${formatDropzoneBytes(first.size)})`,
    });
  }
  if (rejected?.length) {
    boxDroppedLog.value.unshift({
      id: `${Date.now()}-${Math.random()}`,
      status: 'rejected',
      text: rejected[0].message,
    });
  }
  boxDroppedLog.value = boxDroppedLog.value.slice(0, 5);
}

function onBoxReject(rejected) {
  if (rejected?.length) {
    boxDroppedLog.value.unshift({
      id: `${Date.now()}-${Math.random()}`,
      status: 'rejected',
      text: rejected[0].message,
    });
    boxDroppedLog.value = boxDroppedLog.value.slice(0, 5);
  }
}

function onOverlayFiles(accepted) {
  const first = accepted[0];
  if (first) {
    overlayActiveFile.value = `${first.name} (${formatDropzoneBytes(first.size)})`;
  }
}

function simulateVideoDrop() {
  const synthetic = new File(
    [new Uint8Array(1024 * 64)],
    `screen-recording-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.mov`,
    { type: 'video/quicktime' }
  );
  onOverlayFiles([synthetic]);
}

const codeTabs = createDocTabs({
  componentName: 'NanoDropzone',
  stateRef: 'droppedFiles',
  initialValue: '[]',
  templateAttrs: [
    'mode="overlay"',
    'accept="video/*,.mov,.mp4"',
    ':max-size-bytes="50 * 1024 * 1024"',
    'overlay-title="Upuść nagranie .mov / .mp4 do analizy klatek A/B"',
    '@files="onFilesDropped"',
  ],
  apiSections: [
    {
      title: 'Props',
      items: [
        'mode: "box" | "overlay" (default: "box") — Standalone upload card vs. full-container anti-flicker drag overlay',
        'accept: String (default: "") — HTML5 accept filter (e.g. "video/*,.mov,.mp4", "image/*,.svg")',
        'multiple: Boolean (default: false) — Allow dropping/selecting multiple files at once',
        'maxSizeBytes: Number (default: 0) — Client-side file size limit in bytes (0 = unlimited)',
        'accent: "cyan" | "indigo" | "emerald" | "amber" | "rose" (default: "cyan") — Glow & border accent color',
        'compact: Boolean (default: false) — Horizontal compact drop bar layout in box mode',
        'forceDragOver: Boolean (default: false) — Programmatically preview the active drag-hover state',
        'disabled: Boolean (default: false) — Disables file dialog and drag hover reactions',
      ],
    },
    {
      title: 'Events',
      items: [
        '@files / @drop-files: (accepted: File[], payload: { accepted, rejected, event }) => void',
        '@reject: (rejected: Array<{ file, reason: "type" | "size" | "count", message: string }>) => void',
        '@drag-change: (isDragOver: boolean) => void — Emitted when anti-flicker dragDepth transitions between 0 and >0',
      ],
    },
    {
      title: 'Headless Utilities',
      items: [
        'createDropzoneStateMachine({ disabled }) — Depth-counted + contains(relatedTarget) anti-flicker drag controller',
        'validateDroppedFiles(fileList, { accept, maxSizeBytes, multiple }) — Pure validator returning { accepted, rejected }',
        'matchesAcceptPattern(file, accept) — MIME wildcard ("video/*") and extension (".mov") matcher',
      ],
    },
  ],
});
</script>

<template>
  <div class="doc-page">
    <div class="header-section">
      <h2>NanoDropzone</h2>
      <p class="desc">
        Unifikuje wzorce stref zrzutu plików z <code>drop-box</code>, <code>tools-app</code> (<code>PerspectiveSurgeon</code>, <code>QrCode</code>) oraz <code>/dev/video-lab</code> w <code>dashboard-app</code>. Wspiera dwa tryby: samodzielną kartę uploadu (<code>mode="box"</code>) oraz bezmigotaniową powłokę kontenerową (<code>mode="overlay"</code>) z licznikiem głębokości <code>dragDepth</code> i weryfikacją <code>contains(relatedTarget)</code>.
      </p>
    </div>

    <div class="demo-section">
      <!-- DEMO 1: Standalone Box Mode -->
      <div class="dz-card">
        <div class="dz-card-head">
          <div>
            <h3 class="controls-title">1. Samodzielna Strefa Uploadu (<code>mode="box"</code>)</h3>
            <p class="desc-sm">
              Wzorzec znany z <code>drop-box</code> oraz <code>tools-app</code>. Kliknij kartę lub przeciągnij dowolny plik z Findera.
            </p>
          </div>
          <div class="accent-pills">
            <button
              v-for="ac in ACCENT_OPTIONS"
              :key="`box-${ac}`"
              type="button"
              class="accent-pill"
              :class="{ active: boxAccent === ac }"
              @click="boxAccent = ac"
            >
              {{ ac }}
            </button>
          </div>
        </div>

        <NanoDropzone
          ref="boxDropzoneRef"
          mode="box"
          accept="image/*,video/*,.pdf,.zip,.mov,.mp4"
          :max-size-bytes="boxMaxSizeMb * 1024 * 1024"
          :accent="boxAccent"
          :compact="boxCompact"
          :disabled="boxDisabled"
          :force-drag-over="boxForceHover"
          title="Upuść plik tutaj lub kliknij, aby wybrać z dysku"
          subtitle="Obsługuje obrazy, nagrania .mov/.mp4, archiwa ZIP oraz dokumenty PDF"
          shortcut-hint="⌘V"
          @files="onBoxFiles"
          @reject="onBoxReject"
        />

        <div class="dz-controls-row">
          <label class="dz-switch-label">
            <NanoSwitch v-model="boxForceHover" size="sm" />
            <span>Podgląd stanu <code>is-drag-over</code> (Hover)</span>
          </label>
          <label class="dz-switch-label">
            <NanoSwitch v-model="boxCompact" size="sm" />
            <span>Tryb kompaktowy (<code>compact</code>)</span>
          </label>
          <label class="dz-switch-label">
            <NanoSwitch v-model="boxDisabled" size="sm" />
            <span>Zablokowany (<code>disabled</code>)</span>
          </label>
          <div class="dz-stepper-group">
            <span>Limit rozmiaru (MB):</span>
            <NanoNumberStepper v-model="boxMaxSizeMb" :min="1" :max="500" :step="5" size="sm" />
          </div>
        </div>

        <div v-if="boxDroppedLog.length" class="dz-log-list">
          <div
            v-for="entry in boxDroppedLog"
            :key="entry.id"
            class="dz-log-item"
            :class="entry.status"
          >
            {{ entry.status === 'accepted' ? '✓ Zaakceptowano:' : '⚠️ Odrzucono:' }} {{ entry.text }}
          </div>
        </div>
      </div>

      <!-- DEMO 2: Full-Container Overlay Mode (like /dev/video-lab) -->
      <div class="dz-card">
        <div class="dz-card-head">
          <div>
            <h3 class="controls-title">
              2. Powłoka Kontenerowa (<code>mode="overlay"</code> — Wzorzec <code>/dev/video-lab</code>)
            </h3>
            <p class="desc-sm">
              Otwiera półprzezroczysty, szklany ekran powitalny w chwili przeciągnięcia pliku <code>.mov</code> / <code>.mp4</code> nad dowolny obszar roboczy, bez migotania na zagnieżdżonych przyciskach i płótnach.
            </p>
          </div>
          <div class="accent-pills">
            <button
              v-for="ac in ACCENT_OPTIONS"
              :key="`ov-${ac}`"
              type="button"
              class="accent-pill"
              :class="{ active: overlayAccent === ac }"
              @click="overlayAccent = ac"
            >
              {{ ac }}
            </button>
          </div>
        </div>

        <NanoDropzone
          ref="overlayDropzoneRef"
          mode="overlay"
          accept="video/*,.mov,.mp4"
          :accent="overlayAccent"
          :force-drag-over="overlayForceHover"
          overlay-title="🎬 Upuść plik wideo (.mov / .mp4) do analizy klatek A/B"
          overlay-subtitle="Natychmiastowe wczytanie strumienia lokalnego (URL.createObjectURL) bez wysyłania na serwer"
          class="dz-video-lab-mock"
          @files="onOverlayFiles"
        >
          <template #default="{ isDragOver, openFileDialog }">
            <div class="mock-vlab-bar" :class="{ 'is-active': isDragOver }">
              <span class="mock-vlab-pill">🎬 /dev/video-lab</span>
              <span class="mock-vlab-file">Aktywne źródło: <strong>{{ overlayActiveFile }}</strong></span>
              <div style="display: flex; gap: 8px;">
                <button type="button" class="accent-pill" @click="openFileDialog">
                  📂 Wybierz plik...
                </button>
                <button type="button" class="accent-pill active" @click="simulateVideoDrop">
                  ⚡ Symuluj Drop .mov
                </button>
              </div>
            </div>

            <div class="mock-vlab-grid">
              <div class="mock-vlab-frame">
                <strong>KLATKA A (0.00s) — Rysuj ROI</strong>
                <p>Przeciągnij plik .mov nad ten panel lub przełącz przełącznik podglądu poniżej</p>
              </div>
              <div class="mock-vlab-frame">
                <strong>KLATKA B (0.15s) · Różnica Δ = 0%</strong>
                <p>Zero migotania (anti-flicker dragDepth) podczas przesuwania kursora po klatkach</p>
              </div>
            </div>
          </template>
        </NanoDropzone>

        <div class="dz-controls-row">
          <label class="dz-switch-label">
            <NanoSwitch v-model="overlayForceHover" size="sm" />
            <span>Pokaż nakładkę <code>mode="overlay"</code> na żywo (Force Drag-Over)</span>
          </label>
        </div>
      </div>
    </div>

    <NanoCodeBlock :tabs="codeTabs" />
  </div>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: var(--nano-space-lg, 24px);
  max-width: 920px;
}

.header-section h2 {
  margin: 0 0 6px 0;
  color: var(--nano-text-main);
  font-size: 1.5rem;
  font-weight: 700;
}

.desc {
  color: var(--nano-text-muted);
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.55;
}

.desc-sm {
  color: var(--nano-text-muted);
  margin: 4px 0 0 0;
  font-size: 0.84rem;
}

.demo-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dz-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px;
  border-radius: var(--nano-radius-lg, 12px);
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-card);
}

.dz-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.controls-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--nano-text-main);
}

.accent-pills {
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
}

.accent-pill {
  height: 30px;
  padding: 0 11px;
  border-radius: 7px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-muted);
  color: var(--nano-text-main);
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}

.accent-pill:hover {
  border-color: var(--nano-border-hover);
  background: var(--nano-bg-hover);
}

.accent-pill.active {
  border-color: var(--nano-status-info, #38bdf8);
  background: var(--nano-status-info-bg, rgba(56, 189, 248, 0.18));
  color: var(--nano-status-info-text, #38bdf8);
}

.dz-controls-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 18px;
  padding-top: 6px;
}

.dz-switch-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.84rem;
  color: var(--nano-text-main);
  cursor: pointer;
  user-select: none;
}

.dz-stepper-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.84rem;
  color: var(--nano-text-muted);
}

.dz-log-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dz-log-item {
  font-size: 0.8rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  padding: 6px 10px;
  border-radius: 6px;
}

.dz-log-item.accepted {
  background: var(--nano-status-success-bg, rgba(16, 185, 129, 0.12));
  border: 1px solid var(--nano-status-success-border, rgba(16, 185, 129, 0.35));
  color: var(--nano-status-success-text, #10b981);
}

.dz-log-item.rejected {
  background: var(--nano-status-danger-bg, rgba(244, 63, 94, 0.12));
  border: 1px solid var(--nano-status-danger-border, rgba(244, 63, 94, 0.35));
  color: var(--nano-status-danger-text, #f43f5e);
}

.dz-video-lab-mock {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--nano-border-card);
  background: var(--nano-bg-muted);
}

.mock-vlab-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--nano-border-subtle);
  background: var(--nano-bg-card);
}

.mock-vlab-bar.is-active {
  border-color: var(--nano-status-info, #38bdf8);
}

.mock-vlab-pill {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.76rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 5px;
  color: var(--nano-status-info-text, #38bdf8);
  background: var(--nano-status-info-bg, rgba(56, 189, 248, 0.14));
  border: 1px solid var(--nano-status-info-border, rgba(56, 189, 248, 0.35));
}

.mock-vlab-file {
  font-size: 0.82rem;
  color: var(--nano-text-muted);
}

.mock-vlab-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.mock-vlab-frame {
  min-height: 150px;
  border-radius: 8px;
  border: 1px dashed var(--nano-border-card);
  background: var(--nano-bg-card);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px;
  text-align: center;
  font-size: 0.82rem;
  color: var(--nano-text-muted);
}

.mock-vlab-frame strong {
  color: var(--nano-text-main);
  font-size: 0.78rem;
}
</style>
