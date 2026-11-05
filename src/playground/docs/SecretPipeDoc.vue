<script setup>
import { ref } from 'vue';
import NanoSecretPipe from '../../components/NanoSecretPipe.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { secretPipeDirective as vSecretPipe } from '../../directives/secretPipe.js';
import { createDocTabs } from '../docSnippets.js';

const lastSubmittedBytes = ref(0);
const randomDemoId = Math.floor(1000 + Math.random() * 9000);
const demoLogs = ref([
  { type: 'info', text: 'askpass-tunnel: awaiting passphrase via Zero-Cache Uint8Array pipe...' },
  { type: 'prompt', text: `Enter passphrase for demo_key_${randomDemoId}:` },
]);

const directiveByteCount = ref(0);
const directiveCharCount = ref(0);
const directiveLastSubmitted = ref(0);

const onDemoPipeSubmit = (bytes) => {
  const len = bytes ? bytes.length : 0;
  lastSubmittedBytes.value = len;
  demoLogs.value = [
    ...demoLogs.value.slice(-4),
    { type: 'info', text: `[SSH_ASKPASS] piped ${len} raw UTF-8 bytes -> RAM buffer wiped (.fill(0))` },
  ];
  if (bytes && typeof bytes.fill === 'function') {
    bytes.fill(0);
  }
};

const onDirectiveChange = ({ byteCount, charCount }) => {
  directiveByteCount.value = byteCount;
  directiveCharCount.value = charCount;
};

const onDirectiveSubmit = ({ bytes, byteCount, wipe }) => {
  directiveLastSubmitted.value = byteCount;
  if (bytes && typeof bytes.fill === 'function') {
    bytes.fill(0);
  }
  wipe();
};

const codeTabs = createDocTabs({
  componentName: 'NanoSecretPipe',
  stateRef: 'passphraseBytes',
  initialValue: '0',
  templateAttrs: [
    'prompt="Enter SSH / Sudo passphrase:"',
    ':stealth="true"',
    ':on-submit-bytes="onSecretBytes"',
  ],
  apiSections: [
    {
      title: 'Props (NanoSecretPipe / NanoPasswordTunnel)',
      items: [
        'prompt: String (default: "Enter SSH / Sudo secret:") - Interactive terminal prompt header',
        'placeholder: String (default: "Type secret directly in Zero-Cache Pipe and press Enter...")',
        'stealth: Boolean (default: true) - UNIX no-echo mode vs masked bullets mode',
        'logs: Array (default: []) - Live stdout/stderr/prompt terminal lines',
        'onSubmitBytes: (bytes: Uint8Array) => void - Receives raw UTF-8 byte snapshot before RAM buffer is wiped with .fill(0)',
      ],
    },
    {
      title: 'Directive (v-secret-pipe / secretPipeDirective)',
      items: [
        'v-secret-pipe="{ onSubmit, onChange, maxBytes: 512, wipeOnSubmit: true }" - Attaches zero-DOM-value Uint8Array capture to any custom element',
        'onSubmit({ bytes, byteCount, charCount, decodeText, wipe }) - Fired on Enter key',
        'onChange({ byteCount, charCount, wipe }) - Fired on keystroke, Backspace, Escape, or paste',
      ],
    },
  ],
});
</script>

<template>
  <div class="doc-page">
    <div class="doc-header">
      <div class="doc-badge-row">
        <span class="nano-badge nano-badge-primary">Component &amp; Directive</span>
        <span class="nano-badge">Zero &lt;input&gt; DOM Value</span>
        <span class="nano-badge">Uint8Array(512).fill(0)</span>
      </div>
      <h2>NanoSecretPipe &amp; v-secret-pipe</h2>
      <p>
        Cryptographic zero-cache passphrase tunnel and directive. Captures SSH, GPG, and
        <code>sudo -S</code> secrets directly into a pre-allocated <code>Uint8Array(512)</code> RAM buffer
        without any <code>&lt;input&gt;</code>, <code>&lt;textarea&gt;</code>, or immutable V8 DOM value string,
        wiping memory with <code>.fill(0)</code> immediately after submission.
      </p>
    </div>

    <div class="demo-section">
      <h3>1. Component: <code>&lt;NanoSecretPipe&gt;</code> (Terminal Askpass Tunnel)</h3>
      <p class="demo-desc">
        Toggle between <strong>Stealth UNIX (No Echo)</strong> and <strong>Masked Dots</strong>. Supports
        both Light and Dark themes via <code>--nano-secret-*</code> design tokens.
      </p>

      <NanoSecretPipe
        :auto-focus="false"
        :logs="demoLogs"
        prompt="Enter SSH / Sudo passphrase (Demo):"
        :on-submit-bytes="onDemoPipeSubmit"
      />

      <p v-if="lastSubmittedBytes > 0" class="pipe-feedback mono">
        ✅ Transmitted {{ lastSubmittedBytes }} raw UTF-8 bytes and zero-wiped RAM buffer (<code>.fill(0)</code>).
      </p>
    </div>

    <div class="demo-section">
      <h3>2. Headless Directive: <code>v-secret-pipe</code> on Any Custom Element</h3>
      <p class="demo-desc">
        Attach <code>v-secret-pipe</code> to any custom <code>&lt;div&gt;</code> or pill to turn it into a
        zero-autofill, zero-DOM-value <code>Uint8Array</code> keystroke receiver.
      </p>

      <div
        v-secret-pipe="{ onSubmit: onDirectiveSubmit, onChange: onDirectiveChange }"
        class="custom-secret-pill mono"
      >
        <span class="pill-icon">🔐</span>
        <span v-if="directiveCharCount === 0" class="pill-placeholder">
          Click here, type secret &amp; press Enter (Esc to wipe)...
        </span>
        <span v-else class="pill-active">
          Buffer active: {{ directiveCharCount }} chars ({{ directiveByteCount }} UTF-8 bytes) — press Enter
        </span>
      </div>

      <p v-if="directiveLastSubmitted > 0" class="pipe-feedback mono">
        ✅ Directive dispatched {{ directiveLastSubmitted }} bytes and wiped <code>Uint8Array</code>!
      </p>
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

.doc-header {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.doc-badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.doc-page h2 {
  color: var(--nano-text-main);
  margin: 0;
}

.doc-header p {
  color: var(--nano-text-muted);
  margin: 0;
  line-height: 1.6;
}

.demo-section {
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-card);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--nano-shadow-card);
}

.demo-section h3 {
  color: var(--nano-text-main);
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.demo-desc {
  color: var(--nano-text-muted);
  margin-top: 0;
  margin-bottom: 1.25rem;
  line-height: 1.5;
}

.custom-secret-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-radius: 10px;
  border: 1px dashed var(--nano-secret-border, rgba(16, 185, 129, 0.45));
  background: var(--nano-secret-input-bg, var(--nano-bg-muted));
  color: var(--nano-secret-fg, var(--nano-text-main));
  font-size: 0.82rem;
  cursor: text;
  user-select: none;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.custom-secret-pill:focus {
  border-style: solid;
  border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.pill-placeholder {
  color: var(--nano-secret-muted, var(--nano-text-muted));
}

.pill-active {
  color: var(--nano-secret-badge-fg, #10b981);
  font-weight: 700;
}

.pipe-feedback {
  margin: 10px 0 0;
  font-size: 0.8rem;
  color: var(--nano-secret-badge-fg, #10b981);
}

.mono {
  font-family: ui-monospace, SFMono-Regular, monospace;
}
</style>
