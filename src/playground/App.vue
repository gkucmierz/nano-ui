<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import pkg from '../../package.json';
import './playground.css';

const version = pkg.version;
const isDark = ref(true);
const isNarrow = ref(false);

const updateViewport = () => {
  isNarrow.value = window.innerWidth <= 860;
};

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
  updateViewport();
  window.addEventListener('resize', updateViewport, { passive: true });
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
  window.removeEventListener('resize', updateViewport);
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div class="playground-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <router-link to="/" class="header-brand" v-tooltip="isNarrow ? 'Nano UI' : undefined">
          <svg class="brand-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
            <rect width="32" height="32" rx="9" fill="var(--nano-bg-card-elevated, #0f172a)" stroke="var(--nano-border-card, rgba(255,255,255,0.18))" stroke-width="1.5"/>
            <path d="M8.5 23.5V8.5L23.5 23.5V8.5" stroke="var(--nano-accent-primary, #6366f1)" stroke-width="5.0" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="23.5" cy="8.5" r="3.2" fill="var(--nano-state-active, #00f2fe)"/>
            <circle cx="23.5" cy="8.5" r="1.2" fill="#ffffff"/>
          </svg>
          <div class="brand-info">
            <div class="brand-heading">
              <h1 class="brand-title">Nano UI</h1>
              <span class="version">v{{ version }}</span>
            </div>
          </div>
        </router-link>
        <button class="theme-toggle desktop-toggle" @click="toggleTheme" aria-label="Toggle theme" v-tooltip="'Toggle Theme (L)'">
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
          <router-link to="/docs/ripple" class="nav-link" active-class="active" v-tooltip="isNarrow ? 'v-ripple' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <circle cx="12" cy="12" r="5"/>
              <circle cx="12" cy="12" r="1"/>
            </svg>
            <span class="nav-label">v-ripple</span>
          </router-link>
          <router-link to="/docs/tooltip" class="nav-link" active-class="active" v-tooltip="isNarrow ? 'v-tooltip' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span class="nav-label">v-tooltip</span>
          </router-link>
        </div>
        <div class="nav-section">
          <h3>Components</h3>
          <router-link to="/docs/kinetic" class="nav-link" active-class="active" v-tooltip="isNarrow ? 'KineticRotator' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.8 1.04 6.44 2.73L21 8"/>
              <polyline points="21 3 21 8 16 8"/>
            </svg>
            <span class="nav-label">KineticRotator</span>
          </router-link>
          <router-link to="/docs/switch" class="nav-link" active-class="active" v-tooltip="isNarrow ? 'NanoSwitch' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="5" width="22" height="14" rx="7"/>
              <circle cx="16" cy="12" r="3"/>
            </svg>
            <span class="nav-label">NanoSwitch</span>
          </router-link>
          <router-link to="/docs/modal" class="nav-link" active-class="active" v-tooltip="isNarrow ? 'NanoModal' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            <span class="nav-label">NanoModal</span>
          </router-link>
          <router-link to="/docs/3d-donut-chart" class="nav-link" active-class="active" v-tooltip="isNarrow ? 'ThreeDDonutChart' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
              <path d="M22 12A10 10 0 0 0 12 2v10z"/>
            </svg>
            <span class="nav-label">ThreeDDonutChart</span>
          </router-link>
          <router-link to="/docs/precision-scrubber" class="nav-link" active-class="active" v-tooltip="isNarrow ? 'PrecisionScrubber' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="4" y1="21" x2="4" y2="14"/>
              <line x1="4" y1="10" x2="4" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12" y2="3"/>
              <line x1="20" y1="21" x2="20" y2="16"/>
              <line x1="20" y1="12" x2="20" y2="3"/>
              <line x1="1" y1="14" x2="7" y2="14"/>
              <line x1="9" y1="8" x2="15" y2="8"/>
              <line x1="17" y1="16" x2="23" y2="16"/>
            </svg>
            <span class="nav-label">PrecisionScrubber</span>
          </router-link>
          <router-link to="/docs/topology-radar" class="nav-link" active-class="active" v-tooltip="isNarrow ? 'TopologyRadar' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6"/>
              <line x1="12" y1="2" x2="12" y2="22"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
            </svg>
            <span class="nav-label">TopologyRadar</span>
          </router-link>
          <router-link to="/docs/mutating-header" class="nav-link" active-class="active" v-tooltip="isNarrow ? 'MutatingHeader' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="20" height="6" rx="2"/>
              <rect x="2" y="14" width="20" height="6" rx="2"/>
            </svg>
            <span class="nav-label">MutatingHeader</span>
          </router-link>
        </div>
      </nav>

      <div class="sidebar-footer">
        <button class="theme-toggle mobile-toggle" @click="toggleTheme" aria-label="Toggle theme" v-tooltip="'Toggle Theme (L)'">
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

