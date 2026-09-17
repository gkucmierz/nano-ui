<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import pkg from '../../package.json';
import './playground.css';

const version = pkg.version;
const isDark = ref(true);

const toggleTheme = () => {
  document.documentElement.classList.add('theme-switching');
  isDark.value = !isDark.value;
  const theme = isDark.value ? 'dark' : 'light';
  if (isDark.value) {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem('nano-ui-theme', theme);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('theme-switching');
    });
  });
};

const handleKeyDown = (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) {
    return;
  }
  if (e.key === 'l' || e.key === 'L') {
    e.preventDefault();
    toggleTheme();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  document.documentElement.classList.remove('preload');
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

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div class="playground-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="header-title">
          <svg class="brand-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
            <rect width="32" height="32" rx="8" fill="var(--nano-bg-card, #0f172a)" stroke="var(--nano-border-card, rgba(255,255,255,0.15))" stroke-width="1.5"/>
            <path d="M10 22V10M10 10L22 22M22 22V10" stroke="var(--nano-accent-primary, #6366f1)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="22" cy="10" r="2.2" fill="var(--nano-state-active, #00f2fe)"/>
          </svg>
          <div class="brand-text">
            <h1>Nano UI</h1>
            <div class="version">v{{ version }}</div>
          </div>
        </div>
        <button class="theme-toggle" @click="toggleTheme" aria-label="Toggle theme" v-tooltip="'Toggle Theme (L)'">
          <svg v-if="isDark" class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
          <svg v-else class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
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
          <router-link to="/docs/kinetic" class="nav-link" active-class="active">KineticRotator</router-link>
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

