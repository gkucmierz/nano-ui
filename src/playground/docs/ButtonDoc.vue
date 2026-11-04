<script setup>
import { ref, computed } from 'vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import { t } from '../../locales.js';

// Interactive Playground State
const selectedVariant = ref('primary');
const selectedSize = ref('default');
const isOutline = ref(false);
const isDisabled = ref(false);
const hasIcon = ref(false);
const hasRipple = ref(true);
const clickCount = ref(0);

const variants = ['primary', 'success', 'danger', 'active', 'secondary', 'ghost'];
const sizes = ['sm', 'default', 'lg'];

const handleClick = () => {
  if (!isDisabled.value) {
    clickCount.value++;
  }
};

const generatedCode = computed(() => {
  const classes = ['nano-btn'];
  if (selectedVariant.value) {
    classes.push(`nano-btn-${selectedVariant.value}`);
  }
  if (isOutline.value && selectedVariant.value !== 'ghost') {
    classes.push('nano-btn-outline');
  }
  if (selectedSize.value !== 'default') {
    classes.push(`nano-btn-${selectedSize.value}`);
  }

  const attrs = [];
  attrs.push(`class="${classes.join(' ')}"`);
  if (hasRipple.value) {
    attrs.push('v-ripple');
  }
  if (isDisabled.value) {
    attrs.push(':disabled="true"');
  }

  const iconMarkup = hasIcon.value
    ? '\n  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">\n    <polyline points="13 17 18 12 13 7" />\n  </svg>'
    : '';

  return `<button ${attrs.join(' ')}>${iconMarkup}\n  Action Button\n</button>`;
});

// Button Group Demo State
const activeSegment = ref('daily');
const segments = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

const groupCode = `<div class="nano-btn-group">
  <button class="nano-btn nano-btn-secondary nano-btn-active">Daily</button>
  <button class="nano-btn nano-btn-secondary">Weekly</button>
  <button class="nano-btn nano-btn-secondary">Monthly</button>
</div>`;

const cssApiDoc = `/* Nano UI Button Primitives & Modifiers */
.nano-btn                /* Base button: flex alignment, typography, border-radius, transitions */

/* Semantic Colors */
.nano-btn-primary        /* Primary action color (accent indigo) */
.nano-btn-success        /* Success / confirm action color (emerald/green) */
.nano-btn-danger         /* Destructive / delete action color (crimson red) */
.nano-btn-active         /* Highlighted / active action color (neon cyan) */
.nano-btn-secondary      /* Neutral elevated card surface with subtle border */
.nano-btn-ghost          /* Flat transparent button with soft hover fill */

/* Visual Treatments (Orthogonal Modifiers) */
.nano-btn-outline        /* Visible matching border + soft 12% tinted fill */
.nano-btn-solid          /* Forced solid saturated fill + crisp white text */

/* Sizing Modifiers */
.nano-btn-sm             /* Compact size: padding 3px 8px, font 0.72rem (dense UI/tables) */
.nano-btn-lg             /* Large size: padding 10px 20px, font 0.95rem (hero/modals) */
.nano-btn-icon           /* 1:1 aspect ratio square button for standalone icons */

/* Grouping Container */
.nano-btn-group          /* Docked inline-flex container with seamless shared borders */`;
</script>

<template>
  <div class="doc-page">
    <h2>{{ t('nav.buttons') }}</h2>
    <p class="desc">
      Ultra-lightweight, hardware-accelerated button primitives with semantic states, fluid hover transitions, native accessibility, and docked button groups.
    </p>

    <!-- Interactive Sandbox -->
    <div class="sandbox-container">
      <div class="sandbox-preview">
        <div class="preview-area">
          <button
            :class="[
              'nano-btn',
              `nano-btn-${selectedVariant}`,
              selectedSize !== 'default' ? `nano-btn-${selectedSize}` : '',
              isOutline && selectedVariant !== 'ghost' ? 'nano-btn-outline' : ''
            ]"
            :disabled="isDisabled"
            v-ripple="hasRipple"
            @click="handleClick"
          >
            <svg
              v-if="hasIcon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="13 17 18 12 13 7"></polyline>
              <polyline points="6 17 11 12 6 7"></polyline>
            </svg>
            <span>Interactive Button</span>
            <span class="badge" v-if="clickCount > 0">{{ clickCount }}</span>
          </button>
        </div>

        <NanoCodeBlock :code="generatedCode" lang="html" title="Generated Markup" :default-wrap="true" />
      </div>

      <!-- Controls Panel -->
      <div class="controls-panel">
        <div class="control-group">
          <label class="control-label">Variant</label>
          <div class="nano-cluster">
            <button
              v-for="v in variants"
              :key="v"
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': selectedVariant === v }"
              @click="selectedVariant = v"
            >
              {{ v }}
            </button>
          </div>
        </div>

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

        <label class="control-group toggle-row">
          <span class="control-label">Outline / Bordered</span>
          <NanoSwitch v-model="isOutline" />
        </label>

        <label class="control-group toggle-row">
          <span class="control-label">With Icon</span>
          <NanoSwitch v-model="hasIcon" />
        </label>

        <label class="control-group toggle-row">
          <span class="control-label">v-ripple Directive</span>
          <NanoSwitch v-model="hasRipple" />
        </label>

        <label class="control-group toggle-row">
          <span class="control-label">Disabled</span>
          <NanoSwitch v-model="isDisabled" />
        </label>
      </div>
    </div>

    <!-- Solid Treatments -->
    <h3 class="section-title">Solid Treatments (High Emphasis)</h3>
    <p class="desc">Saturated full fills with crisp white text for prominent primary and critical actions.</p>
    <div class="variants-grid">
      <div class="variant-card">
        <span class="variant-label">Primary Solid</span>
        <button class="nano-btn nano-btn-primary" v-ripple>Primary Action</button>
        <span class="variant-desc">Main call-to-action</span>
      </div>

      <div class="variant-card">
        <span class="variant-label">Success Solid</span>
        <button class="nano-btn nano-btn-success" v-ripple>Accept & Save</button>
        <span class="variant-desc">Confirm or save changes</span>
      </div>

      <div class="variant-card">
        <span class="variant-label">Danger Solid</span>
        <button class="nano-btn nano-btn-danger" v-ripple>Delete Entry</button>
        <span class="variant-desc">Destructive operations</span>
      </div>
    </div>

    <!-- Outline / Bordered Treatments -->
    <h3 class="section-title">Outline & Bordered Treatments (.nano-btn-outline)</h3>
    <p class="desc">Soft 12% tinted fills with crisp matching borders and colored text. Ideal for filters, secondary tags, and subtle feedback.</p>
    <div class="variants-grid">
      <div class="variant-card">
        <span class="variant-label">Primary Outline</span>
        <button class="nano-btn nano-btn-primary nano-btn-outline" v-ripple>Primary Outline</button>
        <span class="variant-desc">Subtle accent CTA</span>
      </div>

      <div class="variant-card">
        <span class="variant-label">Success Outline</span>
        <button class="nano-btn nano-btn-success nano-btn-outline" v-ripple>Success Outline</button>
        <span class="variant-desc">Non-disruptive confirmation</span>
      </div>

      <div class="variant-card">
        <span class="variant-label">Danger Outline</span>
        <button class="nano-btn nano-btn-danger nano-btn-outline" v-ripple>Danger Outline</button>
        <span class="variant-desc">Gentle warning / remove item</span>
      </div>

      <div class="variant-card">
        <span class="variant-label">Active Glow</span>
        <button class="nano-btn nano-btn-active" v-ripple>Active Glow</button>
        <span class="variant-desc">Docked / toggled state</span>
      </div>
    </div>

    <!-- Neutral & Chrome -->
    <h3 class="section-title">Neutral & Chrome Variants</h3>
    <div class="variants-grid">
      <div class="variant-card">
        <span class="variant-label">Secondary</span>
        <button class="nano-btn nano-btn-secondary" v-ripple>Secondary Action</button>
        <span class="variant-desc">Elevated card fill & subtle border</span>
      </div>

      <div class="variant-card">
        <span class="variant-label">Ghost</span>
        <button class="nano-btn nano-btn-ghost" v-ripple>Ghost Action</button>
        <span class="variant-desc">Transparent with soft hover fill</span>
      </div>

      <div class="variant-card">
        <span class="variant-label">Disabled</span>
        <button class="nano-btn nano-btn-secondary" :disabled="true">Disabled</button>
        <span class="variant-desc">Locked interaction (pointer-events: none)</span>
      </div>
    </div>

    <!-- Sizing Matrix -->
    <h3 class="section-title">Sizing Matrix</h3>
    <div class="matrix-card">
      <div class="matrix-row">
        <div class="matrix-meta">
          <code class="selectable-all">.nano-btn-sm</code>
          <span>Dense toolbars & tables (height: ~24px)</span>
        </div>
        <div class="matrix-actions">
          <button class="nano-btn nano-btn-primary nano-btn-sm" v-ripple>Small Primary</button>
          <button class="nano-btn nano-btn-secondary nano-btn-sm" v-ripple>Small Secondary</button>
        </div>
      </div>

      <div class="matrix-row">
        <div class="matrix-meta">
          <code class="selectable-all">.nano-btn</code>
          <span>Standard UI controls (height: ~32px)</span>
        </div>
        <div class="matrix-actions">
          <button class="nano-btn nano-btn-primary" v-ripple>Standard Primary</button>
          <button class="nano-btn nano-btn-secondary" v-ripple>Standard Secondary</button>
        </div>
      </div>

      <div class="matrix-row">
        <div class="matrix-meta">
          <code class="selectable-all">.nano-btn-lg</code>
          <span>Hero sections & modal dialogs (height: ~40px)</span>
        </div>
        <div class="matrix-actions">
          <button class="nano-btn nano-btn-primary nano-btn-lg" v-ripple>Large Primary</button>
          <button class="nano-btn nano-btn-secondary nano-btn-lg" v-ripple>Large Secondary</button>
        </div>
      </div>
    </div>

    <!-- Button Groups (.nano-btn-group) -->
    <h3 class="section-title">Segmented Controls & Button Groups</h3>
    <p class="desc">
      Wrap sibling buttons in <code>.nano-btn-group</code> to join borders seamlessly with unified outer radii.
    </p>
    <div class="groups-container">
      <div class="group-demo">
        <span class="group-label">Segmented Switch:</span>
        <div class="nano-btn-group">
          <button
            v-for="seg in segments"
            :key="seg.id"
            class="nano-btn nano-btn-secondary"
            :class="{ 'nano-btn-active': activeSegment === seg.id }"
            v-ripple
            @click="activeSegment = seg.id"
          >
            {{ seg.label }}
          </button>
        </div>
      </div>

      <div class="group-demo">
        <span class="group-label">Icon Toolbar:</span>
        <div class="nano-btn-group">
          <button class="nano-btn nano-btn-secondary nano-btn-icon" v-tooltip="'Copy Code'" v-ripple>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="nano-btn nano-btn-secondary nano-btn-icon" v-tooltip="'Download File'" v-ripple>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
          <button class="nano-btn nano-btn-secondary nano-btn-icon" v-tooltip="'Delete Selection'" v-ripple>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <NanoCodeBlock :code="groupCode" lang="html" title="Button Group Example" />

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

.badge {
  background: color-mix(in srgb, currentColor 18%, transparent);
  color: inherit;
  padding: 1px 7px;
  border-radius: var(--nano-radius-full, 9999px);
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
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

/* Variants Grid */
.variants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.variant-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem;
  background: var(--nano-bg-card-elevated);
  border: 1px solid var(--nano-border-card);
  border-radius: 10px;
  text-align: center;
}

.variant-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--nano-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.variant-desc {
  font-size: 0.76rem;
  color: var(--nano-text-muted);
  line-height: 1.3;
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
}

/* Groups Demo */
.groups-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2rem;
  padding: 1.5rem;
  background: var(--nano-bg-card-elevated);
  border: 1px solid var(--nano-border-card);
  border-radius: 12px;
}

.group-demo {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.group-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--nano-text-secondary);
}
</style>
