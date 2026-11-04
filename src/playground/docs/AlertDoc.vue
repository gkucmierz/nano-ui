<script setup>
import { ref, computed } from 'vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import { t } from '../../locales.js';

// Interactive Sandbox State
const selectedVariant = ref('success');
const hasIcon = ref(true);
const hasTitle = ref(true);
const hasClose = ref(true);
const isAccentLeft = ref(false);
const isBanner = ref(false);
const isDismissed = ref(false);

const alertTitle = ref('System Verification Complete');
const alertMessage = ref('All schema integrity constraints and foreign keys passed verification without errors.');

const variants = ['success', 'warn', 'danger', 'info'];

const resetAlert = () => {
  isDismissed.value = false;
};

const generatedCode = computed(() => {
  const classes = ['nano-alert', `nano-alert-${selectedVariant.value}`];
  if (isAccentLeft.value) classes.push('nano-alert-accent-left');
  if (isBanner.value) classes.push('nano-alert-banner');

  let markup = `<div class="${classes.join(' ')}">\n`;

  if (hasIcon.value) {
    markup += `  <div class="nano-alert-icon">\n`;
    markup += `    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n`;
    if (selectedVariant.value === 'success') {
      markup += `      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>\n`;
      markup += `      <polyline points="22 4 12 14.01 9 11.01"/>\n`;
    } else if (selectedVariant.value === 'warn') {
      markup += `      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>\n`;
      markup += `      <line x1="12" y1="9" x2="12" y2="13"/>\n`;
      markup += `      <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/>\n`;
    } else if (selectedVariant.value === 'danger') {
      markup += `      <circle cx="12" cy="12" r="10"/>\n`;
      markup += `      <line x1="15" y1="9" x2="9" y2="15"/>\n`;
      markup += `      <line x1="9" y1="9" x2="15" y2="15"/>\n`;
    } else {
      markup += `      <circle cx="12" cy="12" r="10"/>\n`;
      markup += `      <line x1="12" y1="11" x2="12" y2="16"/>\n`;
      markup += `      <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none"/>\n`;
    }
    markup += `    </svg>\n`;
    markup += `  </div>\n`;
  }

  markup += `  <div class="nano-alert-content">\n`;
  if (hasTitle.value) {
    markup += `    <strong class="nano-alert-title">${alertTitle.value}</strong>\n`;
  }
  markup += `    <p class="nano-alert-desc">${alertMessage.value}</p>\n`;
  markup += `  </div>\n`;

  if (hasClose.value) {
    markup += `  <button class="nano-alert-close" aria-label="Dismiss">\n`;
    markup += `    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">\n`;
    markup += `      <line x1="18" y1="6" x2="6" y2="18"/>\n`;
    markup += `      <line x1="6" y1="6" x2="18" y2="18"/>\n`;
    markup += `    </svg>\n`;
    markup += `  </button>\n`;
  }

  markup += `</div>`;
  return markup;
});

const cssApiDoc = `/* Nano UI Alert & Banner Primitives */
.nano-alert              /* Flexible layout container (12px gap, 6px radius, padding: 12px 16px) */
.nano-alert-ok,
.nano-alert-success      /* Emerald green fill + border + high-contrast text (success states) */
.nano-alert-warn,
.nano-alert-warning      /* Warm amber fill + border + high-contrast text (cautionary notes) */
.nano-alert-danger,
.nano-alert-error        /* Crimson red fill + border + high-contrast text (failures, errors) */
.nano-alert-info         /* Neon/Sky blue fill + border + high-contrast text (guidance, informational) */

/* Structural Sub-Elements */
.nano-alert-icon         /* Fixed-width icon slot with top alignment (flex-shrink: 0) */
.nano-alert-content      /* Fluid text viewport (flex: 1, min-width: 0) */
.nano-alert-title        /* Emphasized heading line (font-weight: 700, font-size: 0.88rem) */
.nano-alert-desc         /* Body message paragraph with soft opacity (font-size: 0.8rem) */
.nano-alert-close        /* Minimalist dismiss button (opacity hover transition) */

/* Visual Style Modifiers */
.nano-alert-accent-left  /* Thick 4px indicator border on the left boundary */
.nano-alert-banner       /* Full-width docked card treatment with zero border-radius */`;
</script>

<template>
  <div class="doc-page">
    <h2>{{ t('nav.alerts') }}</h2>
    <p class="desc">
      Contextual feedback messages, system warnings, confirmation banners, and dismissible inline alerts with high-contrast theme tokens.
    </p>

    <!-- Interactive Sandbox -->
    <div class="sandbox-container">
      <div class="sandbox-preview">
        <div class="preview-area">
          <div v-if="!isDismissed" :class="[
            'nano-alert',
            `nano-alert-${selectedVariant}`,
            isAccentLeft ? 'nano-alert-accent-left' : '',
            isBanner ? 'nano-alert-banner' : ''
          ]">
            <div v-if="hasIcon" class="nano-alert-icon">
              <NanoIcon :name="selectedVariant" :size="18" />
            </div>

            <div class="nano-alert-content">
              <strong v-if="hasTitle" class="nano-alert-title">{{ alertTitle }}</strong>
              <p class="nano-alert-desc">{{ alertMessage }}</p>
            </div>

            <button v-if="hasClose" class="nano-alert-close" aria-label="Dismiss alert" @click="isDismissed = true">
              <NanoIcon name="close" :size="16" />
            </button>
          </div>

          <div v-else class="dismissed-restore-box">
            <span>Alert dismissed.</span>
            <button class="nano-btn nano-btn-secondary nano-btn-sm" @click="resetAlert">
              Restore Alert
            </button>
          </div>
        </div>

        <NanoCodeBlock :code="generatedCode" lang="html" title="Generated Markup" :default-wrap="true" />
      </div>

      <!-- Controls Panel -->
      <div class="controls-panel">
        <div class="control-group">
          <label class="control-label">Variant</label>
          <div class="nano-btn-group wrap-group">
            <button
              v-for="v in variants"
              :key="v"
              class="nano-btn nano-btn-secondary nano-btn-sm"
              :class="{ 'nano-btn-active': selectedVariant === v }"
              @click="selectedVariant = v; resetAlert()"
            >
              {{ v }}
            </button>
          </div>
        </div>

        <label class="control-group toggle-row">
          <span class="control-label">Icon</span>
          <NanoSwitch v-model="hasIcon" />
        </label>

        <label class="control-group toggle-row">
          <span class="control-label">Title Heading</span>
          <NanoSwitch v-model="hasTitle" />
        </label>

        <label class="control-group toggle-row">
          <span class="control-label">Close Button</span>
          <NanoSwitch v-model="hasClose" />
        </label>

        <label class="control-group toggle-row">
          <span class="control-label">Accent Left Border</span>
          <NanoSwitch v-model="isAccentLeft" />
        </label>

        <label class="control-group toggle-row">
          <span class="control-label">Banner Mode</span>
          <NanoSwitch v-model="isBanner" />
        </label>
      </div>
    </div>

    <!-- Gallery Showcase -->
    <h3 class="section-title">Common Application Scenarios</h3>
    <div class="gallery-stack">
      <div class="nano-alert nano-alert-success nano-alert-accent-left">
        <div class="nano-alert-icon">
          <NanoIcon name="success" :size="18" />
        </div>
        <div class="nano-alert-content">
          <strong class="nano-alert-title">Deployment Succeeded</strong>
          <p class="nano-alert-desc">Production release v1.8.4 rolled out across 12 worker clusters without downtime.</p>
        </div>
      </div>

      <div class="nano-alert nano-alert-warn nano-alert-accent-left">
        <div class="nano-alert-icon">
          <NanoIcon name="warn" :size="18" />
        </div>
        <div class="nano-alert-content">
          <strong class="nano-alert-title">High Memory Utilization</strong>
          <p class="nano-alert-desc">Node heap usage exceeded 85% threshold. Automatic garbage collection initiated.</p>
        </div>
      </div>

      <div class="nano-alert nano-alert-danger nano-alert-accent-left">
        <div class="nano-alert-icon">
          <NanoIcon name="danger" :size="18" />
        </div>
        <div class="nano-alert-content">
          <strong class="nano-alert-title">Database Replication Failure</strong>
          <p class="nano-alert-desc">Primary replica lost quorum. Switching to read-only failover pool.</p>
        </div>
      </div>

      <div class="nano-alert nano-alert-info nano-alert-accent-left">
        <div class="nano-alert-icon">
          <NanoIcon name="info" :size="18" />
        </div>
        <div class="nano-alert-content">
          <strong class="nano-alert-title">Scheduled Maintenance Window</strong>
          <p class="nano-alert-desc">Automated database cluster compaction is scheduled for Sunday at 03:00 UTC.</p>
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
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  color: var(--nano-text-main);
}

.desc {
  font-size: 0.95rem;
  color: var(--nano-text-muted);
  line-height: 1.5;
  margin: 0;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 1.5rem 0 0.5rem;
  color: var(--nano-text-main);
}

/* Sandbox Layout */
.sandbox-container {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 1.5rem;
  align-items: start;
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
}

.preview-area {
  display: flex;
  flex-direction: column;
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-subtle);
  border-radius: 8px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  min-height: 90px;
  justify-content: center;
}

.dismissed-restore-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--nano-bg-muted);
  border: 1px dashed var(--nano-border-card);
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--nano-text-muted);
}

/* Gallery Stack */
.gallery-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Controls */
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

.wrap-group {
  flex-wrap: wrap;
  gap: 4px;
}
.wrap-group > .nano-btn {
  border-radius: var(--nano-radius-sm, 4px) !important;
  margin-left: 0 !important;
}
</style>
