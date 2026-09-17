<script setup>
import { useRoute } from 'vue-router';
import { t } from '../../locales.js';

const route = useRoute();

const availableRoutes = [
  { path: '/docs/kinetic', label: 'Kinetic Rotator' },
  { path: '/docs/switch', label: 'Nano Switch' },
  { path: '/docs/modal', label: 'Nano Modal' },
  { path: '/docs/3d-donut-chart', label: '3D Donut Chart' },
  { path: '/docs/precision-scrubber', label: 'Precision Scrubber' },
  { path: '/docs/mutating-header', label: 'Mutating Header' },
  { path: '/docs/topology-radar', label: 'Topology Radar' },
  { path: '/docs/ripple', label: 'v-ripple' },
  { path: '/docs/tooltip', label: 'v-tooltip' }
];
</script>

<template>
  <div class="not-found-container">
    <div class="not-found-card">
      <div class="error-badge">404</div>
      <h2 class="error-title">{{ t('common.notFoundTitle') }}</h2>
      <p class="error-desc">{{ t('common.notFoundDesc') }}</p>

      <div class="error-path">
        <span class="path-label">Path:</span>
        <code>#{{ route.fullPath }}</code>
      </div>

      <div class="error-actions">
        <router-link to="/docs/kinetic" class="btn-primary" v-ripple>
          {{ t('common.backToHome') }}
        </router-link>
      </div>

      <div class="available-links">
        <span class="available-title">Available Components:</span>
        <div class="links-grid">
          <router-link
            v-for="item in availableRoutes"
            :key="item.path"
            :to="item.path"
            class="component-link"
            v-ripple
          >
            {{ item.label }}
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 420px;
  padding: 24px;
}

.not-found-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 580px;
  width: 100%;
  background: var(--nano-bg-card, rgba(15, 23, 42, 0.75));
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.12));
  border-radius: var(--nano-radius-lg, 16px);
  padding: 40px 32px;
  box-shadow: var(--nano-shadow-card, 0 10px 30px rgba(0, 0, 0, 0.3));
}

.error-badge {
  font-family: var(--font-mono, monospace);
  font-size: 3.8rem;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -2px;
  background: linear-gradient(135deg, #6366f1, #00f2fe);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 12px;
}

.error-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--nano-text-main, #f8fafc);
  margin: 0 0 8px 0;
}

.error-desc {
  font-size: 0.95rem;
  color: var(--nano-text-muted, #94a3b8);
  margin: 0 0 20px 0;
  line-height: 1.5;
}

.error-path {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--nano-bg-code, #0b1120);
  border: 1px solid var(--nano-border-subtle, rgba(255, 255, 255, 0.1));
  padding: 6px 14px;
  border-radius: 8px;
  margin-bottom: 24px;
  max-width: 100%;
  overflow-x: auto;
}

.path-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--nano-text-muted, #94a3b8);
}

.error-path code {
  font-family: var(--font-mono, monospace);
  font-size: 0.85rem;
  color: var(--nano-state-active, #00f2fe);
  cursor: text;
  user-select: text !important;
  -webkit-user-select: text !important;
}

.error-actions {
  margin-bottom: 32px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 22px;
  background: var(--nano-accent-primary, #6366f1);
  color: #ffffff;
  font-size: 0.88rem;
  font-weight: 700;
  border-radius: 8px;
  text-decoration: none;
  transition: var(--nano-transition-interactive, all 0.2s ease);
  user-select: none;
  -webkit-user-select: none;
}

.btn-primary:hover {
  background: #4f46e5;
  transform: translateY(0);
}

.available-links {
  width: 100%;
  border-top: 1px solid var(--nano-border-subtle, rgba(255, 255, 255, 0.1));
  padding-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.available-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--nano-text-muted, #94a3b8);
}

.links-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.component-link {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--nano-text-muted, #94a3b8);
  background: var(--nano-bg-muted, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--nano-border-subtle, rgba(255, 255, 255, 0.1));
  padding: 6px 12px;
  border-radius: 6px;
  text-decoration: none;
  transition: var(--nano-transition-interactive, all 0.15s ease);
  user-select: none;
  -webkit-user-select: none;
}

.component-link:hover {
  color: var(--nano-text-main, #ffffff);
  border-color: var(--nano-state-active, #00f2fe);
  background: var(--nano-bg-hover, rgba(255, 255, 255, 0.1));
}
</style>
