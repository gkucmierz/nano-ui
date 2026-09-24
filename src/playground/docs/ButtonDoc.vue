<script setup>
import { ref, computed } from 'vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import { t } from '../../locales.js';

// Interactive Playground State
const selectedVariant = ref('primary');
const selectedSize = ref('default');
const isDisabled = ref(false);
const hasIcon = ref(false);
const hasRipple = ref(true);
const clickCount = ref(0);

const variants = ['primary', 'success', 'secondary', 'ghost', 'danger', 'active'];
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
    ? '\n  <svg class="nano-btn-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>'
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
.nano-btn-primary        /* Primary action button (accent color background) */
.nano-btn-secondary      /* Secondary action button (elevated card surface, subtle border) */
.nano-btn-ghost          /* Ghost/transparent button (minimal chrome, hover fill) */
.nano-btn-danger         /* Destructive action button (crimson tint & border) */
.nano-btn-active         /* Highlighted/active state (cyan border & glow tint) */

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
              selectedSize !== 'default' ? `nano-btn-${selectedSize}` : ''
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

        <NanoCodeBlock :code="generatedCode" lang="html" title="Generated Markup" />
      </div>

      <!-- Controls Panel -->
      <div class="controls-panel">
        <div class="control-group">
          <label class="control-label">Variant</label>
          <div class="nano-btn-group">
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

        <div class="control-group toggle-row">
          <span class="control-label">With Icon</span>
          <NanoSwitch v-model="hasIcon" />
        </div>

        <div class="control-group toggle-row">
          <span class="control-label">v-ripple Directive</span>
          <NanoSwitch v-model="hasRipple" />
        </div>

        <div class="control-group toggle-row">
          <span class="control-label">Disabled</span>
          <NanoSwitch v-model="isDisabled" />
        </div>
      </div>
    </div>

    <!-- Visual Hierarchy & Semantic Variants -->
    <h3 class="section-title">Visual Hierarchy & Semantic Variants</h3>
    <div class="variants-grid">
      <div class="variant-card">
        <span class="variant-label">Primary</span>
        <button class="nano-btn nano-btn-primary" v-ripple>Primary Action</button>
        <span class="variant-desc">Main prominent call-to-action</span>
      </div>

      <div class="variant-card">
        <span class="variant-label">Success</span>
        <button class="nano-btn nano-btn-success" v-ripple>Accept & Save</button>
        <span class="variant-desc">Confirm, accept, or save operations</span>
      </div>

      <div class="variant-card">
        <span class="variant-label">Secondary</span>
        <button class="nano-btn nano-btn-secondary" v-ripple>Secondary Action</button>
        <span class="variant-desc">Neutral background with subtle border</span>
      </div>

      <div class="variant-card">
        <span class="variant-label">Ghost</span>
        <button class="nano-btn nano-btn-ghost" v-ripple>Ghost Action</button>
        <span class="variant-desc">Transparent with soft hover fill</span>
      </div>

      <div class="variant-card">
        <span class="variant-label">Danger</span>
        <button class="nano-btn nano-btn-danger" v-ripple>Delete Entry</button>
        <span class="variant-desc">Destructive or critical operations</span>
      </div>

      <div class="variant-card">
        <span class="variant-label">Active / Glow</span>
        <button class="nano-btn nano-btn-active" v-ripple>Active State</button>
        <span class="variant-desc">Current filter or toggled mode</span>
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
          <code>.nano-btn-sm</code>
          <span>Dense toolbars & tables (height: ~24px)</span>
        </div>
        <div class="matrix-actions">
          <button class="nano-btn nano-btn-primary nano-btn-sm" v-ripple>Small Primary</button>
          <button class="nano-btn nano-btn-secondary nano-btn-sm" v-ripple>Small Secondary</button>
        </div>
      </div>

      <div class="matrix-row">
        <div class="matrix-meta">
          <code>.nano-btn</code>
          <span>Standard UI controls (height: ~32px)</span>
        </div>
        <div class="matrix-actions">
          <button class="nano-btn nano-btn-primary" v-ripple>Standard Primary</button>
          <button class="nano-btn nano-btn-secondary" v-ripple>Standard Secondary</button>
        </div>
      </div>

      <div class="matrix-row">
        <div class="matrix-meta">
          <code>.nano-btn-lg</code>
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
  grid-template-columns: 1fr 340px;
  gap: 1.5rem;
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
