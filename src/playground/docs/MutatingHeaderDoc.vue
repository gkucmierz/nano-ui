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
  --status-bg: rgba(59, 130, 246, 0.15);
  --status-color: #60a5fa;
  --status-border: rgba(59, 130, 246, 0.3);
  --status-stuck-bg: rgba(16, 185, 129, 0.15);
  --status-stuck-color: #34d399;
  --status-stuck-border: rgba(16, 185, 129, 0.3);
  --viewport-bg: var(--nano-bg-card-elevated);
  --viewport-border: var(--nano-border-card);
  --viewport-shadow: var(--nano-shadow-elevated);
  --brand-color: var(--nano-text-main);
  --badge-bg: rgba(6, 182, 212, 0.15);
  --badge-color: #22d3ee;
  --badge-border: rgba(6, 182, 212, 0.3);
  --stat-num: var(--nano-state-active);
  --stat-lbl: var(--nano-text-muted);
  --divider-bg: var(--nano-border-subtle);
  --btn-color: var(--nano-text-muted);
  --btn-hover-bg: var(--nano-bg-hover);
  --btn-hover-color: var(--nano-text-main);
  --pill-border: var(--nano-border-card);
  --pill-color: var(--nano-text-muted);
  --card-bg: var(--nano-bg-card);
  --card-border: var(--nano-border-card);
  --card-title: var(--nano-text-main);
  --card-text: var(--nano-text-muted);
  --card-shadow: var(--nano-shadow-card);
  --api-bg: var(--nano-bg-code);
  --api-border: var(--nano-border-card);
  --api-title: var(--nano-text-main);
  --api-code: var(--nano-text-code);
}

.doc-page h2 {
  color: var(--nano-text-main);
  margin: 0;
}

.doc-page > p {
  color: var(--nano-text-muted);
  margin: 0;
}

.demo-section h3 {
  color: var(--nano-text-main);
  margin: 0 0 8px 0;
}

.demo-desc {
  color: var(--nano-text-muted);
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
  background: var(--status-bg);
  color: var(--status-color);
  border: 1px solid var(--status-border);
}

.status-pill.stuck {
  background: var(--status-stuck-bg);
  color: var(--status-stuck-color);
  border-color: var(--status-stuck-border);
}

.scroll-demo-viewport {
  position: relative;
  height: 480px;
  overflow-y: auto;
  border-radius: 12px;
  border: 1px solid var(--viewport-border);
  background: var(--viewport-bg);
  box-shadow: var(--viewport-shadow);
}

.demo-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 1rem;
  color: var(--brand-color);
}

.demo-badge {
  font-size: 0.68rem;
  font-family: var(--font-mono, monospace);
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--badge-bg);
  color: var(--badge-color);
  border: 1px solid var(--badge-border);
}

.demo-center-stat {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-num {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--stat-num);
}

.stat-lbl {
  font-size: 0.75rem;
  color: var(--stat-lbl);
}

.demo-divider {
  width: 1px;
  height: 16px;
  background: var(--divider-bg);
}

.demo-btn {
  background: transparent;
  border: none;
  color: var(--btn-color);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  outline: none;
  user-select: none;
  transition: var(--nano-transition-interactive);
}

.demo-btn:hover {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-color);
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
  outline: none;
  user-select: none;
  transition: var(--nano-transition-interactive);
}

.demo-btn-action:hover {
  background: #0369a1;
}

.demo-pill {
  font-size: 0.72rem;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--pill-border);
  color: var(--pill-color);
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
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  box-shadow: var(--card-shadow);
}

.demo-card-placeholder h4 {
  margin: 0 0 8px 0;
  font-size: 0.95rem;
  color: var(--card-title);
}

.demo-card-placeholder p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--card-text);
}

.api-reference {
  margin-top: 16px;
  padding: 16px;
  border-radius: 8px;
  background: var(--api-bg);
  border: 1px solid var(--api-border);
}

.api-reference h3 {
  margin-top: 0;
  color: var(--api-title);
  border-bottom: 1px solid var(--api-border);
  padding-bottom: 8px;
}

.api-reference code {
  display: block;
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--api-code);
}
</style>

