<template>
  <div class="playground-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="header-title">
          <h1>Nano UI</h1>
          <div class="version">v{{ version }}</div>
        </div>
        <button class="theme-toggle" @click="toggleTheme">
          <span v-if="isDark">☀️</span>
          <span v-else>🌙</span>
        </button>
      </div>
      
      <nav class="sidebar-nav">
        <div class="nav-section">
          <h3>Directives</h3>
          <router-link to="/docs/ripple" class="nav-link" active-class="active">v-ripple</router-link>
          <router-link to="/docs/tooltip" class="nav-link" active-class="active">v-tooltip</router-link>
        </div>
        <!-- Future sections go here -->
      </nav>
    </aside>
    
    <main class="content">
      <div class="content-header">
        <h1>Playground</h1>
        <p>Testing ground for all library components and directives.</p>
      </div>
      
      <div class="component-section">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>

    <GlobalTooltip />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import pkg from '../../package.json';

const version = pkg.version;
const isDark = ref(true);

const toggleTheme = () => {
  isDark.value = !isDark.value;
  if (isDark.value) {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
};

onMounted(() => {
  // Check system preference on load
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    isDark.value = false;
    document.documentElement.setAttribute('data-theme', 'light');
  }
});
</script>

<style scoped>
/* Global resets */
:global(body) {
  margin: 0;
  background: #09090b; /* bg-zinc-950 */
  color: #f4f4f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  transition: background 0.3s ease, color 0.3s ease;
}

:global(*:focus), :global(*:focus-visible) {
  outline: none !important;
}

.playground-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 280px;
  background: #18181b; /* bg-zinc-900 */
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: border-color 0.3s ease;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebar-header h1 {
  font-weight: 800;
  letter-spacing: -0.5px;
  font-size: 1.5rem;
  margin: 0;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.version {
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
  color: #a1a1aa;
  transition: all 0.3s ease;
}

.theme-toggle {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: inherit;
  font-size: 1.2rem;
  cursor: pointer;
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.theme-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.05);
}

.theme-toggle:active {
  transform: scale(0.95);
}

.theme-toggle:focus-visible {
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.5);
}

.sidebar-nav {
  padding: 1.5rem;
  flex-grow: 1;
}

.nav-section {
  margin-bottom: 2rem;
}

.nav-section h3 {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #52525b; /* zinc-600 */
  font-weight: 700;
  margin-bottom: 0.75rem;
  padding-left: 0.5rem;
}

.nav-link {
  display: block;
  padding: 8px 12px;
  color: #a1a1aa;
  text-decoration: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s ease;
  margin-bottom: 4px;
}

.nav-link:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.05);
  color: #f4f4f5;
}

.nav-link.active {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  font-weight: 600;
}

.nav-link.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.nav-link:focus-visible {
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.5);
}

.content {
  flex-grow: 1;
  padding: 3rem;
  max-width: 1000px;
}

.content-header {
  margin-bottom: 2rem;
}

.content-header h1 {
  font-weight: 800;
  letter-spacing: -0.5px;
  margin-bottom: 0.5rem;
  font-size: 2.2rem;
}

.content-header p {
  color: #a1a1aa;
  font-size: 1.1rem;
}

.component-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 2rem;
  min-height: 400px;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

</style>

<style>
/* Light Mode Overrides */
:root[data-theme="light"] body {
  background: #f8fafc !important;
  color: #0f172a !important;
}

:root[data-theme="light"] .playground-layout {
  background: #f8fafc;
}

:root[data-theme="light"] .sidebar {
  background: #ffffff;
  border-right-color: #e2e8f0;
}

:root[data-theme="light"] .sidebar-header {
  border-bottom-color: #e2e8f0;
}

:root[data-theme="light"] .version {
  background: #e2e8f0;
  color: #475569;
}

:root[data-theme="light"] .nav-section h3 {
  color: #64748b;
}

:root[data-theme="light"] .nav-link {
  color: #334155;
  font-weight: 500;
}

:root[data-theme="light"] .nav-link:hover:not(.disabled) {
  background: #f1f5f9;
  color: #0f172a;
}

:root[data-theme="light"] .nav-link.active {
  background: #e0e7ff; /* indigo-100 */
  color: #4338ca;
}

:root[data-theme="light"] .content-header p {
  color: #475569;
}

:root[data-theme="light"] .component-section {
  background: #ffffff;
  border-color: #e2e8f0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
}

:root[data-theme="light"] .theme-toggle {
  background: #f1f5f9;
  border-color: #e2e8f0;
}

:root[data-theme="light"] .theme-toggle:hover {
  background: #e2e8f0;
}
</style>
