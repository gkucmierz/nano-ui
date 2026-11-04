<script setup>
import { ref, computed, onUnmounted } from 'vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import { t } from '../../locales.js';

// Interactive Playground State
const inputValue = ref('');
const placeholder = ref('Enter value...');
const selectedSize = ref('default');
const selectedState = ref('normal');
const hasPrefix = ref(false);
const hasButton = ref(true);
const buttonVariant = ref('primary');

const sizes = ['sm', 'default', 'lg'];
const states = ['normal', 'danger', 'success', 'disabled'];

const generatedCode = computed(() => {
  const isDanger = selectedState.value === 'danger';
  const isSuccess = selectedState.value === 'success';
  const isDisabled = selectedState.value === 'disabled';

  const inputClasses = ['nano-input'];
  if (selectedSize.value !== 'default') {
    inputClasses.push(`nano-input-${selectedSize.value}`);
  }
  if (isDanger && !hasPrefix.value && !hasButton.value) {
    inputClasses.push('nano-input-danger');
  }
  if (isSuccess && !hasPrefix.value && !hasButton.value) {
    inputClasses.push('nano-input-success');
  }

  const disabledAttr = isDisabled ? ' disabled' : '';

  if (hasPrefix.value || hasButton.value) {
    const groupClasses = ['nano-input-group'];
    if (isDanger) groupClasses.push('is-invalid');
    if (isSuccess) groupClasses.push('is-valid');

    let inner = '';
    if (hasPrefix.value) {
      inner += '\n  <span class="nano-input-addon">https://</span>';
    }
    inner += `\n  <input type="text" class="${inputClasses.join(' ')}" placeholder="${placeholder.value}"${disabledAttr} />`;
    if (hasButton.value) {
      const btnSize = selectedSize.value === 'sm' ? ' nano-btn-sm' : selectedSize.value === 'lg' ? ' nano-btn-lg' : '';
      inner += `\n  <button class="nano-btn nano-btn-${buttonVariant.value}${btnSize}"${disabledAttr}>Connect</button>`;
    }
    return `<div class="${groupClasses.join(' ')}">${inner}\n</div>`;
  }

  return `<input type="text" class="${inputClasses.join(' ')}" placeholder="${placeholder.value}"${disabledAttr} />`;
});

// Gallery interactive search state
const searchQuery = ref('');
const apiKey = ref('nano_live_99f2c842b10a4e7');
const copyFeedback = ref(false);
let copyInputTimer = null;
const stepperValue = ref(5190);

const handleCopyKey = async () => {
  try {
    await navigator.clipboard.writeText(apiKey.value);
    copyFeedback.value = true;
    if (copyInputTimer) clearTimeout(copyInputTimer);
    copyInputTimer = setTimeout(() => {
      copyInputTimer = null;
      copyFeedback.value = false;
    }, 1500);
  } catch {}
};

onUnmounted(() => {
  if (copyInputTimer) {
    clearTimeout(copyInputTimer);
    copyInputTimer = null;
  }
});

const cssApiDoc = `/* Nano UI Input Primitives & Form Controls */
.nano-input              /* Base text input: background, border, focus-glow, typography */
.nano-input:focus        /* High-contrast active ring without native browser outline */
.nano-input:disabled     /* Locked / readonly opacity with not-allowed cursor */

/* Sizing Modifiers */
.nano-input-sm           /* Compact input: height ~24px (toolbars & tables) */
.nano-input-lg           /* Large input: height ~40px (hero search & modals) */

/* Validation States */
.nano-input-danger,
.nano-input.is-invalid   /* Red border for validation errors */
.nano-input-success,
.nano-input.is-valid     /* Emerald border for verified fields */

/* Number Inputs */
.nano-input[type="number"] /* Native desktop spin buttons hidden */

/* Input Groups */
.nano-input-group        /* Flex container with seamless outer borders */
.nano-input-group:focus-within /* Focuses entire group when nested input is focused */
.nano-input-addon        /* Subdued text/icon prefix or suffix tag */`;
</script>

<template>
  <div class="doc-page">
    <h2>{{ t('nav.inputs') }}</h2>
    <p class="desc">
      Clean, ergonomic form controls with native zero-outline focus glow, docked prefix/suffix addons, seamless action buttons, and validation states.
    </p>

    <!-- Interactive Sandbox -->
    <div class="sandbox-container">
      <div class="sandbox-preview">
        <div class="preview-area">
          <div
            v-if="hasPrefix || hasButton"
            :class="[
              'nano-input-group',
              selectedState === 'danger' ? 'is-invalid' : '',
              selectedState === 'success' ? 'is-valid' : ''
            ]"
          >
            <span v-if="hasPrefix" class="nano-input-addon">https://</span>
            <input
              type="text"
              v-model="inputValue"
              :class="[
                'nano-input',
                selectedSize !== 'default' ? `nano-input-${selectedSize}` : ''
              ]"
              :placeholder="placeholder"
              :disabled="selectedState === 'disabled'"
            />
            <button
              v-if="hasButton"
              :class="[
                'nano-btn',
                `nano-btn-${buttonVariant}`,
                selectedSize === 'sm' ? 'nano-btn-sm' : selectedSize === 'lg' ? 'nano-btn-lg' : ''
              ]"
              :disabled="selectedState === 'disabled'"
              v-ripple
            >
              Connect
            </button>
          </div>

          <input
            v-else
            type="text"
            v-model="inputValue"
            :class="[
              'nano-input',
              selectedSize !== 'default' ? `nano-input-${selectedSize}` : '',
              selectedState === 'danger' ? 'nano-input-danger' : '',
              selectedState === 'success' ? 'nano-input-success' : ''
            ]"
            :placeholder="placeholder"
            :disabled="selectedState === 'disabled'"
          />
        </div>

        <NanoCodeBlock :code="generatedCode" lang="html" title="Generated Markup" :default-wrap="true" />
      </div>

      <!-- Controls Panel -->
      <div class="controls-panel">
        <div class="control-group">
          <label class="control-label">Size</label>
          <div class="nano-btn-group">
            <button
              v-for="s in sizes"
              :key="s"
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': selectedSize === s }"
              @click="selectedSize = s"
            >
              {{ s }}
            </button>
          </div>
        </div>

        <div class="control-group">
          <label class="control-label">State</label>
          <div class="nano-cluster">
            <button
              v-for="st in states"
              :key="st"
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': selectedState === st }"
              @click="selectedState = st"
            >
              {{ st }}
            </button>
          </div>
        </div>

        <label class="control-group toggle-row">
          <span class="control-label">Prefix Addon</span>
          <NanoSwitch v-model="hasPrefix" />
        </label>

        <label class="control-group toggle-row">
          <span class="control-label">Action Button</span>
          <NanoSwitch v-model="hasButton" />
        </label>

        <div v-if="hasButton" class="control-group">
          <label class="control-label">Button Style</label>
          <div class="nano-btn-group">
            <button
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': buttonVariant === 'primary' }"
              @click="buttonVariant = 'primary'"
            >
              Primary
            </button>
            <button
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': buttonVariant === 'secondary' }"
              @click="buttonVariant = 'secondary'"
            >
              Secondary
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Compositions Gallery -->
    <h3 class="section-title">Common Compositions & Input Groups</h3>
    <p class="desc">Pre-built practical patterns ready for drop-in use in any application toolbar or modal.</p>
    <div class="compositions-grid">
      <!-- Search Input Group -->
      <div class="composition-card">
        <span class="composition-title">Global Search Field</span>
        <div class="nano-input-group">
          <span class="nano-input-addon">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input type="text" class="nano-input" v-model="searchQuery" placeholder="Search components, APIs..." />
          <button class="nano-btn nano-btn-secondary" v-ripple>Search</button>
        </div>
      </div>

      <!-- API Key Field with Copy Button -->
      <div class="composition-card">
        <span class="composition-title">API Token (Secret Key)</span>
        <div class="nano-input-group">
          <input type="text" class="nano-input" :value="apiKey" readonly />
          <button
            class="nano-btn nano-btn-secondary nano-btn-icon"
            v-tooltip="copyFeedback ? 'Copied!' : 'Copy to clipboard'"
            v-ripple
            @click="handleCopyKey"
          >
            <svg v-if="!copyFeedback" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#22c55e" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
        </div>
      </div>

      <!-- Currency & Unit Addon -->
      <div class="composition-card">
        <span class="composition-title">Financial & Units Addon</span>
        <div class="nano-input-group">
          <span class="nano-input-addon">$</span>
          <input type="number" class="nano-input" placeholder="0.00" />
          <span class="nano-input-addon">USD</span>
        </div>
      </div>

      <!-- Precision Stepper & Numeric Controls -->
      <div class="composition-card">
        <span class="composition-title">Precision Numeric Stepper</span>
        <div class="nano-input-group">
          <button class="nano-btn nano-btn-secondary" @click="stepperValue = Math.max(0, stepperValue - 100)" v-ripple>-100</button>
          <input
            type="number"
            class="nano-input nano-input-center"
            v-model.number="stepperValue"
          />
          <button class="nano-btn nano-btn-secondary" @click="stepperValue = Math.min(10000, stepperValue + 100)" v-ripple>+100</button>
        </div>
      </div>

      <!-- URL with Domain Suffix -->
      <div class="composition-card">
        <span class="composition-title">Subdomain & Vanity URL</span>
        <div class="nano-input-group">
          <span class="nano-input-addon">https://</span>
          <input type="text" class="nano-input" placeholder="app-name" />
          <span class="nano-input-addon">.7u.pl</span>
        </div>
      </div>
    </div>

    <!-- Sizing Matrix -->
    <h3 class="section-title">Sizing Matrix</h3>
    <div class="matrix-card">
      <div class="matrix-row">
        <div class="matrix-meta">
          <code class="selectable-all">.nano-input-sm</code>
          <span>Compact inputs for dense data tables and filter bars (height: ~24px)</span>
        </div>
        <div class="matrix-actions">
          <input type="text" class="nano-input nano-input-sm matrix-input-demo" placeholder="Compact input..." />
        </div>
      </div>

      <div class="matrix-row">
        <div class="matrix-meta">
          <code class="selectable-all">.nano-input</code>
          <span>Standard UI form controls (height: ~32px)</span>
        </div>
        <div class="matrix-actions">
          <input type="text" class="nano-input matrix-input-demo" placeholder="Standard input..." />
        </div>
      </div>

      <div class="matrix-row">
        <div class="matrix-meta">
          <code class="selectable-all">.nano-input-lg</code>
          <span>Prominent search bars and hero inputs (height: ~40px)</span>
        </div>
        <div class="matrix-actions">
          <input type="text" class="nano-input nano-input-lg matrix-input-demo" placeholder="Large input..." />
        </div>
      </div>
    </div>

    <!-- CSS Reference -->
    <h3 class="section-title">CSS Class Reference</h3>
    <NanoCodeBlock :code="cssApiDoc" lang="css" title="primitives.css Reference" />
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

/* Sandbox */
.sandbox-container {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 1.5rem;
  max-width: 100%;
  box-sizing: border-box;
  background: var(--nano-bg-card-elevated);
  border: 1px solid var(--nano-border-card);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--nano-shadow-card);
}

@media (max-width: 900px) {
  .sandbox-container {
    grid-template-columns: 1fr;
  }
}

.sandbox-preview {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0;
  max-width: 100%;
}

.preview-area {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  background: var(--nano-bg-app);
  border: 1px dashed var(--nano-border-card);
  border-radius: 8px;
  min-height: 120px;
}

.controls-panel {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-subtle);
  border-radius: 8px;
  padding: 1.25rem;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-group.toggle-row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.25rem;
  cursor: pointer;
  user-select: none;
}

.control-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--nano-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Compositions Grid */
.compositions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.composition-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
  background: var(--nano-bg-card-elevated);
  border: 1px solid var(--nano-border-card);
  border-radius: 10px;
}

.composition-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--nano-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Sizing Matrix */
.matrix-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--nano-bg-card-elevated);
  border: 1px solid var(--nano-border-card);
  border-radius: 12px;
}

.matrix-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--nano-border-subtle);
}

.matrix-row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

@media (max-width: 600px) {
  .matrix-row {
    flex-direction: column;
    align-items: flex-start;
  }
}

.matrix-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.matrix-meta code {
  font-size: 0.85rem;
  color: var(--nano-state-active);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  user-select: all !important;
  -webkit-user-select: all !important;
  cursor: pointer;
}

.matrix-meta span {
  font-size: 0.8rem;
  color: var(--nano-text-muted);
}

.matrix-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  justify-content: flex-end;
}

.matrix-input-demo {
  max-width: 220px;
}
</style>
