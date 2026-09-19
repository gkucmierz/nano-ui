<script setup>
import { ref } from 'vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import { createDocTabs } from '../docSnippets.js';

const basicVal = ref(true);
const compactVal = ref(false);
const miniVal = ref(true);

const cyanVal = ref(true);
const purpleVal = ref(true);
const emeraldVal = ref(true);
const dangerVal = ref(true);
const goldVal = ref(true);

const disabledOn = ref(true);
const disabledOff = ref(false);

const triStateVal = ref(null);

const cycleTriState = () => {
  if (triStateVal.value === false) {
    triStateVal.value = null;
  } else if (triStateVal.value === null) {
    triStateVal.value = true;
  } else {
    triStateVal.value = false;
  }
};

const codeBasic = '<NanoSwitch v-model="basicVal" label="Enable Telemetry & Analytics" />';
const codeIndeterminate = '<NanoSwitch v-model="status" :indeterminate="status === null" />';

const copiedId = ref(null);

const copyCode = async (text, id) => {
  try {
    await navigator.clipboard.writeText(text);
    copiedId.value = id;
    setTimeout(() => {
      if (copiedId.value === id) {
        copiedId.value = null;
      }
    }, 2000);
  } catch (err) {
    console.error('Failed to copy', err);
  }
};

const apiDoc = `// Props
modelValue: Boolean | null (default: false, supports v-model)
indeterminate: Boolean (default: false)
label: String (default: '', also supports default <slot>)
size: 'default' | 'compact' | 'mini' (default: 'default')
color: 'primary' | 'cyan' | 'purple' | 'emerald' | 'danger' | 'gold' (default: 'primary')
disabled: Boolean (default: false)
name: String (optional, form input name)
id: String (optional, html id attribute)

// Events
@update:modelValue(value: Boolean) - Emitted on state change
@update:indeterminate(value: Boolean) - Emitted when indeterminate state clears
@change(value: Boolean, event: Event) - Emitted on user toggle`;

const codeTabs = createDocTabs({
  name: 'NanoSwitch',
  apiDoc,
  props: {
    'v-model': 'isEnabled',
    size: 'default',
    color: 'cyan',
    label: 'Enable Telemetry',
  },
  imports: [
    "import { ref } from 'vue';",
    '',
    'const isEnabled = ref(true);',
  ],
});
</script>

<template>
  <div class="doc-page">
    <h2>NanoSwitch Component</h2>
    <p class="desc">A lightweight, high-performance toggle switch with smooth cubic-bezier physics, zero browser outline rings, stationary hover feedback, multi-color presets, and full indeterminate tri-state support.</p>

    <!-- Basic Demo -->
    <h3 class="section-title">Interactive Playground</h3>
    <p class="desc">
      Click or press Space/Enter when focused. Current state:
      <strong :class="{ 'state-active': basicVal, 'state-inactive': !basicVal }">
        {{ basicVal ? 'ON (true)' : 'OFF (false)' }}
      </strong>
    </p>

    <div class="switch-card">
      <div class="switch-item">
        <span class="item-label">Basic Switch</span>
        <NanoSwitch v-model="basicVal" label="Enable Telemetry & Analytics" />
      </div>
      <div 
        class="code-snippet" 
        :class="{ 'is-copied': copiedId === 'basic' }"
        @click="copyCode(codeBasic, 'basic')" 
        v-tooltip="copiedId === 'basic' ? 'Copied to clipboard!' : 'Click to copy'"
      >
        <code>&lt;NanoSwitch v-model="basicVal" label="Enable Telemetry & Analytics" /&gt;</code>
        <span class="copy-icon">{{ copiedId === 'basic' ? '✅' : '📋' }}</span>
      </div>
    </div>

    <!-- Indeterminate State Demo -->
    <h3 class="section-title">Indeterminate State (Tri-State Capsule)</h3>
    <p class="desc">
      When <code>indeterminate="true"</code> or <code>modelValue="null"</code>, the knob smoothly morphs into a centered horizontal pill capsule over a neutral track. Clicking toggles directly into <strong>ON</strong>.
    </p>

    <div class="switch-card">
      <div class="controls-row">
        <button class="action-btn primary" @click="triStateVal = null">
          Set Indeterminate
        </button>
        <button class="action-btn" @click="cycleTriState">
          Cycle State: <strong>{{ triStateVal === null ? 'INDETERMINATE (null)' : (triStateVal ? 'ON (true)' : 'OFF (false)') }}</strong>
        </button>
      </div>

      <div class="switch-item">
        <span class="item-label">Default (44×24)</span>
        <NanoSwitch v-model="triStateVal" size="default" label="Bulk Permissions (Partial Selection)" />
      </div>
      <div class="switch-item">
        <span class="item-label">Compact (38×20)</span>
        <NanoSwitch v-model="triStateVal" size="compact" color="purple" label="Sub-task Checklist (Mixed Items)" />
      </div>
      <div class="switch-item">
        <span class="item-label">Mini (30×16)</span>
        <NanoSwitch v-model="triStateVal" size="mini" color="emerald" label="Tree Node Selection" />
      </div>
      <div 
        class="code-snippet" 
        :class="{ 'is-copied': copiedId === 'indeterminate' }"
        @click="copyCode(codeIndeterminate, 'indeterminate')" 
        v-tooltip="copiedId === 'indeterminate' ? 'Copied to clipboard!' : 'Click to copy'"
      >
        <code>&lt;NanoSwitch v-model="status" :indeterminate="status === null" /&gt;</code>
        <span class="copy-icon">{{ copiedId === 'indeterminate' ? '✅' : '📋' }}</span>
      </div>
    </div>

    <!-- Sizes -->
    <h3 class="section-title">Sizes</h3>
    <p class="desc">Three carefully proportioned scales for dense tables, sidebars, or primary application settings.</p>

    <div class="switch-card">
      <div class="switch-item">
        <span class="item-label">Default (44×24)</span>
        <NanoSwitch v-model="basicVal" size="default" label="Default Size Switch" />
      </div>
      <div class="switch-item">
        <span class="item-label">Compact (38×20)</span>
        <NanoSwitch v-model="compactVal" size="compact" label="Compact Size Switch" />
      </div>
      <div class="switch-item">
        <span class="item-label">Mini (30×16)</span>
        <NanoSwitch v-model="miniVal" size="mini" label="Mini Size Switch" />
      </div>
    </div>

    <!-- Color Themes -->
    <h3 class="section-title">Color Themes</h3>
    <p class="desc">Presets matching standard workspace design systems (Cyber Cyan, LoL Purple, Emerald, Danger Red, Hextech Gold).</p>

    <div class="switch-card">
      <div class="switch-item">
        <span class="item-label">Primary / Cyan</span>
        <NanoSwitch v-model="cyanVal" color="cyan" label="Cyan Active Glow" />
      </div>
      <div class="switch-item">
        <span class="item-label">Purple (LoL)</span>
        <NanoSwitch v-model="purpleVal" color="purple" label="Purple Accent Switch" />
      </div>
      <div class="switch-item">
        <span class="item-label">Emerald</span>
        <NanoSwitch v-model="emeraldVal" color="emerald" label="Emerald Active Switch" />
      </div>
      <div class="switch-item">
        <span class="item-label">Danger</span>
        <NanoSwitch v-model="dangerVal" color="danger" label="Danger Red Action" />
      </div>
      <div class="switch-item">
        <span class="item-label">Gold</span>
        <NanoSwitch v-model="goldVal" color="gold" label="Hextech Gold Switch" />
      </div>
    </div>

    <!-- Disabled States -->
    <h3 class="section-title">Disabled States</h3>
    <p class="desc">Non-interactive controls with reduced opacity and prevented pointer events.</p>

    <div class="switch-card">
      <div class="switch-item">
        <span class="item-label">Disabled (Active)</span>
        <NanoSwitch v-model="disabledOn" :disabled="true" label="Locked Active Switch" />
      </div>
      <div class="switch-item">
        <span class="item-label">Disabled (Inactive)</span>
        <NanoSwitch v-model="disabledOff" :disabled="true" label="Locked Inactive Switch" />
      </div>
    </div>

    <!-- API Reference & Usage Guide -->
    <NanoCodeBlock :tabs="codeTabs" />
  </div>
</template>

<style scoped>
.doc-page {
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.doc-page h2 {
  font-weight: 700;
  margin-bottom: 0.5rem;
  font-size: 1.8rem;
  color: var(--nano-text-main);
}

.section-title {
  font-weight: 700;
  font-size: 1.3rem;
  margin-top: 2rem;
  margin-bottom: 0.5rem;
  color: var(--nano-text-main);
}

.desc {
  color: var(--nano-text-muted);
  margin-bottom: 1rem;
  font-size: 0.95rem;
  line-height: 1.5;
}

.desc code {
  background: var(--nano-bg-muted);
  color: var(--nano-text-code);
  border: 1px solid var(--nano-border-subtle);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.88rem;
}

.state-active {
  color: var(--nano-state-active);
  font-weight: 700;
}

.state-inactive {
  color: var(--nano-text-muted);
}

.switch-card {
  background: var(--nano-bg-card-elevated);
  border: 1px solid var(--nano-border-card);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 650px;
  box-shadow: var(--nano-shadow-card);
}

.switch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--nano-border-subtle);
}

.switch-item:last-child {
  border-bottom: none;
}

.item-label {
  font-size: 0.88rem;
  color: var(--nano-text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  min-width: 140px;
  flex-shrink: 0;
}

.controls-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.action-btn {
  padding: 7px 14px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-card);
  border-radius: 8px;
  color: var(--nano-text-main);
  cursor: pointer;
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
  transition: background var(--nano-transition-interactive), border-color var(--nano-transition-interactive);
}

.action-btn:hover {
  background: var(--nano-bg-hover);
  border-color: var(--nano-border-hover);
}

.action-btn.primary {
  background: rgba(2, 132, 199, 0.12);
  border-color: rgba(2, 132, 199, 0.4);
  color: var(--nano-state-active);
}

.action-btn.primary:hover {
  background: rgba(2, 132, 199, 0.2);
  border-color: rgba(2, 132, 199, 0.7);
}

.code-snippet {
  background: var(--nano-bg-code);
  border: 1px solid var(--nano-border-card);
  padding: 8px 12px;
  border-radius: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  color: var(--nano-text-code);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  outline: none;
  user-select: none;
  -webkit-user-select: none;
  transition: background var(--nano-transition-interactive), border-color var(--nano-transition-interactive);
  margin-top: 0.5rem;
}

.code-snippet:hover {
  border-color: var(--nano-border-hover);
}

.copy-icon {
  font-size: 14px;
  opacity: 0.6;
}

.api-reference {
  background: var(--nano-bg-code);
  border: 1px solid var(--nano-border-card);
  border-radius: 10px;
  padding: 1.5rem;
  max-width: 650px;
  box-shadow: var(--nano-shadow-card);
}

.api-reference code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.88rem;
  color: var(--nano-text-code);
  line-height: 1.6;
  display: block;
}
</style>
