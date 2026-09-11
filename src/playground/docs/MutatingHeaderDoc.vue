<script setup>
import { ref } from 'vue';
import MutatingHeader from '../../components/MutatingHeader.vue';

const isHeaderStuck = ref(false);
const thresholdVal = ref(24);
const hysteresisVal = ref(8);
</script>

<template>
  <div class="doc-page">
    <h2>MutatingHeader Component</h2>
    <p>A reactive, high-performance adaptive sticky navbar that floats as an elevated card when at the top of the view, and smoothly morphs (via cubic-bezier easing) into a seamless edge-to-edge docked bar as the user scrolls.</p>

    <div class="demo-section">
      <h3>Interactive Scroll Simulation</h3>
      <p class="demo-desc">
        Scroll inside the container below to witness the header mutate between floating card and edge-to-edge docked states.
        Current State: <span class="status-pill" :class="{ stuck: isHeaderStuck }">{{ isHeaderStuck ? 'Docked (is-stuck)' : 'Floating Card' }}</span>
      </p>

      <div class="scroll-demo-viewport" id="demo-scroll-box">
        <!-- The Mutating Header inside the demo container -->
        <MutatingHeader
          scroll-container="#demo-scroll-box"
          :threshold="thresholdVal"
          :hysteresis="hysteresisVal"
          v-model:stuck="isHeaderStuck"
        >
          <template #left>
            <div class="demo-brand">
              <span class="brand-icon">⚡</span>
              <span class="brand-name">Nano Mutating Nav</span>
            </div>
            <span class="demo-badge">PORT 45330</span>
          </template>

          <template #center>
            <div class="demo-center-stat">
              <span class="stat-num">11</span>
              <span class="stat-lbl">active tasks</span>
            </div>
            <div class="demo-divider"></div>
            <div class="demo-center-stat">
              <span class="stat-num">37</span>
              <span class="stat-lbl">projects</span>
            </div>
          </template>

          <template #right>
            <button type="button" class="demo-btn">🛠️ Scripts</button>
            <span class="demo-pill">EN</span>
            <button type="button" class="demo-btn-action">+ Add Project</button>
          </template>
        </MutatingHeader>

        <!-- Dummy content to provide scroll distance -->
        <div class="demo-scroll-content">
          <div class="demo-card-placeholder" v-for="i in 8" :key="i">
            <h4>Sample Content Block #{{ i }}</h4>
            <p>Scroll up and down to observe the non-blocking cubic-bezier transition of margins, border-radius, border-color, and elevation shadows.</p>
          </div>
        </div>
      </div>
    </div>

    <div class="api-reference">
      <h3>API Reference</h3>
      <code>
        // Props<br>
        threshold: Number (default: 24) - Scroll distance in px to trigger docking<br>
        hysteresis: Number (default: 8) - Scroll distance in px below which header undocks<br>
        scrollContainer: String | HTMLElement (default: null -> window) - Target scroller<br>
        height: String (default: '60px') - Height of header<br>
        floatingMargin: String (default: '12px 24px 0 24px') - Top/side margin when floating<br>
        floatingRadius: String (default: '16px') - Corner radius when floating<br>
        glassmorphism: Boolean (default: true) - Backdrop blur effect<br>
        stuck: Boolean (v-model:stuck) - Two-way controlled docking state<br>
        <br>
        // Slots<br>
        #left - Brand, logo, back buttons<br>
        #center - Search inputs, telemetry metrics, tabs<br>
        #right - Actions, buttons, avatars, theme toggles<br>
        #default - Full custom layout fallback<br>
        <br>
        // Events<br>
        @update:stuck - Emits boolean docking state<br>
        @stuck - Emitted when docking activates<br>
        @unstick - Emitted when header returns to floating card
      </code>
    </div>
  </div>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.demo-desc {
  color: var(--text-muted, #94a3b8);
  font-size: 0.9rem;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-pill {
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.status-pill.stuck {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border-color: rgba(16, 185, 129, 0.3);
}

.scroll-demo-viewport {
  position: relative;
  height: 480px;
  overflow-y: auto;
  border-radius: 12px;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
  background: var(--bg-card-active, rgba(15, 23, 42, 0.6));
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
}

.demo-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 1rem;
  color: var(--text-main, #f8fafc);
}

.demo-badge {
  font-size: 0.68rem;
  font-family: var(--font-mono, monospace);
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(6, 182, 212, 0.15);
  color: #22d3ee;
  border: 1px solid rgba(6, 182, 212, 0.3);
}

.demo-center-stat {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-num {
  font-size: 0.95rem;
  font-weight: 800;
  color: #38bdf8;
}

.stat-lbl {
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
}

.demo-divider {
  width: 1px;
  height: 16px;
  background: rgba(255, 255, 255, 0.12);
}

.demo-btn {
  background: transparent;
  border: none;
  color: var(--text-muted, #94a3b8);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  outline: none !important;
  user-select: none;
}

.demo-btn-action {
  background: #0284c7;
  color: #ffffff;
  border: none;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  outline: none !important;
  user-select: none;
}

.demo-pill {
  font-size: 0.72rem;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--text-muted, #94a3b8);
}

.demo-scroll-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.demo-card-placeholder {
  padding: 20px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
}

.demo-card-placeholder h4 {
  margin: 0 0 8px 0;
  font-size: 0.95rem;
  color: var(--text-main, #f8fafc);
}

.demo-card-placeholder p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted, #94a3b8);
}

.api-reference {
  margin-top: 16px;
  padding: 16px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
}

.api-reference h3 {
  margin-top: 0;
}

.api-reference code {
  display: block;
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--text-main, #e2e8f0);
}

/* Light Theme Overrides */
:global([data-theme="light"]) .demo-desc {
  color: #64748b;
}

:global([data-theme="light"]) .status-pill {
  background: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
}

:global([data-theme="light"]) .status-pill.stuck {
  background: #ecfdf5;
  color: #059669;
  border-color: #a7f3d0;
}

:global([data-theme="light"]) .scroll-demo-viewport {
  background: #f1f5f9;
  border-color: #e2e8f0;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.04);
}

:global([data-theme="light"]) .demo-brand {
  color: #0f172a;
}

:global([data-theme="light"]) .demo-badge {
  background: rgba(6, 182, 212, 0.1);
  color: #0891b2;
  border-color: rgba(6, 182, 212, 0.25);
}

:global([data-theme="light"]) .demo-center-stat .stat-num {
  color: #0284c7;
}

:global([data-theme="light"]) .demo-center-stat .stat-lbl {
  color: #64748b;
}

:global([data-theme="light"]) .demo-divider {
  background: rgba(0, 0, 0, 0.1);
}

:global([data-theme="light"]) .demo-btn {
  color: #475569;
}

:global([data-theme="light"]) .demo-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #0f172a;
}

:global([data-theme="light"]) .demo-pill {
  border-color: rgba(0, 0, 0, 0.15);
  color: #475569;
}

:global([data-theme="light"]) .demo-card-placeholder {
  background: #ffffff;
  border-color: #e2e8f0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

:global([data-theme="light"]) .demo-card-placeholder h4 {
  color: #0f172a;
}

:global([data-theme="light"]) .demo-card-placeholder p {
  color: #64748b;
}

:global([data-theme="light"]) .api-reference {
  background: #f8fafc;
  border-color: #e2e8f0;
}

:global([data-theme="light"]) .api-reference h3 {
  color: #0f172a;
}

:global([data-theme="light"]) .api-reference code {
  color: #334155;
}
</style>
