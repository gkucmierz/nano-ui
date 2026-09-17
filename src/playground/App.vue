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
        <div class="nav-section">
          <h3>Components</h3>
          <router-link to="/docs/switch" class="nav-link" active-class="active">NanoSwitch</router-link>
          <router-link to="/docs/modal" class="nav-link" active-class="active">NanoModal</router-link>
          <router-link to="/docs/3d-donut-chart" class="nav-link" active-class="active">ThreeDDonutChart</router-link>
          <router-link to="/docs/precision-scrubber" class="nav-link" active-class="active">PrecisionScrubber</router-link>
          <router-link to="/docs/topology-radar" class="nav-link" active-class="active">TopologyRadar</router-link>
          <router-link to="/docs/mutating-header" class="nav-link" active-class="active">MutatingHeader</router-link>
        </div>
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
  const theme = isDark.value ? 'dark' : 'light';
  if (isDark.value) {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem('nano-ui-theme', theme);
};

onMounted(() => {
  const savedTheme = localStorage.getItem('nano-ui-theme');
  if (savedTheme) {
    if (savedTheme === 'light') {
      isDark.value = false;
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.style.colorScheme = 'light';
    } else {
      isDark.value = true;
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.style.colorScheme = 'dark';
    }
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    isDark.value = false;
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.style.colorScheme = 'light';
  }
});
</script>

<style scoped>
:global(*:focus), :global(*:focus-visible) {
  outline: none;
}

.playground-layout {
  display: flex;
  min-height: 100vh;
  background: var(--nano-bg-app);
  color: var(--nano-text-main);
}

.sidebar {
  width: 280px;
  background: var(--nano-bg-sidebar);
  border-right: 1px solid var(--nano-border-subtle);
  display: flex;
  flex-direction: column;
  user-select: none;
  -webkit-user-select: none;
  position: sticky;
  top: 0;
  height: 100vh;
  flex-shrink: 0;
  overflow-y: hidden;
}

.sidebar-header {
  padding: 2rem;
  border-bottom: 1px solid var(--nano-border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: border-color var(--nano-transition-interactive);
  flex-shrink: 0;
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
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-subtle);
  padding: 2px 8px;
  border-radius: 12px;
  color: var(--nano-text-muted);
  transition: all var(--nano-transition-interactive);
}

.theme-toggle {
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border-subtle);
  color: var(--nano-text-main);
  font-size: 1.2rem;
  cursor: pointer;
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  transition: background var(--nano-transition-interactive), border-color var(--nano-transition-interactive);
}

.theme-toggle:hover {
  background: var(--nano-bg-hover);
  border-color: var(--nano-border-hover);
}

.theme-toggle:focus,
.theme-toggle:focus-visible {
  outline: none;
  box-shadow: none;
}

.sidebar-nav {
  padding: 1.5rem;
  flex-grow: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--nano-border-subtle) transparent;
}

.nav-section {
  margin-bottom: 2rem;
}

.nav-section h3 {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--nano-text-muted);
  font-weight: 700;
  margin-bottom: 0.75rem;
  padding-left: 0.5rem;
}

.nav-link {
  display: block;
  padding: 8px 12px;
  color: var(--nano-text-muted);
  text-decoration: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all var(--nano-transition-interactive);
  margin-bottom: 4px;
}

.nav-link:hover:not(.disabled) {
  background: var(--nano-bg-hover);
  color: var(--nano-text-main);
}

.nav-link.active {
  background: var(--nano-nav-active-bg);
  color: var(--nano-nav-active-color);
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
  width: calc(100% - 280px);
  max-width: 1200px;
  box-sizing: border-box;
}

.content-header {
  margin-bottom: 2rem;
}

.content-header h1 {
  font-weight: 800;
  letter-spacing: -0.5px;
  margin-bottom: 0.5rem;
  font-size: 2.2rem;
  color: var(--nano-text-main);
  user-select: none;
  -webkit-user-select: none;
}

.content-header p {
  color: var(--nano-text-muted);
  font-size: 1.1rem;
}

.component-section {
  background: var(--nano-bg-card);
  border: 1px solid var(--nano-border-subtle);
  border-radius: 16px;
  padding: 2rem;
  min-height: 400px;
  box-shadow: var(--nano-shadow-card);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--nano-transition-interactive, 150ms cubic-bezier(0.4, 0, 0.2, 1)), transform var(--nano-transition-interactive, 150ms cubic-bezier(0.4, 0, 0.2, 1));
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(5px);
}
</style>
