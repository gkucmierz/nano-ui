<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import pkg from '../../package.json';
import { currentLang, toggleLang, initSavedLang, t } from '../locales.js';
import { usePlaygroundSearch, PLAYGROUND_NAV_ITEMS } from './usePlaygroundSearch.js';
import { sharedBrandConcept, playConceptSonicLogo } from './brandLogoState.js';
import {
  getGlobalKeyController,
  resolveInteractiveDomGroup,
  stepInteractiveDomGroup,
} from '../utils/key-controller.js';
import './playground.css';

const router = useRouter();
const version = pkg.version;
const isDark = ref(true);
const isNarrow = ref(false);
const searchInputRef = ref(null);
const mainContentRef = ref(null);
const activeHighlightIdx = ref(0);
let lastInteractedGroupEl = null;
let offGlobalKeys = null;

const {
  searchQuery,
  matchedItems,
  matchedIdSet,
  clearSearch,
} = usePlaygroundSearch();

const isRouteVisible = (path) => !searchQuery.value.trim() || matchedIdSet.value.has(path);

const hasSectionMatches = (sectionKey) => {
  if (!searchQuery.value.trim()) return true;
  return PLAYGROUND_NAV_ITEMS.some(
    item => item.sectionKey === sectionKey && matchedIdSet.value.has(item.id)
  );
};

const SIDEBAR_SECTIONS_STORAGE_KEY = 'nano-ui-sidebar-sections';
const collapsedSections = ref({
  'nav.gettingStarted': false,
  'nav.formControls': false,
  'nav.layoutNavigation': false,
  'nav.advanced3dViz': false,
  'nav.directives': false,
});

const isSectionExpanded = (sectionKey) => {
  if (searchQuery.value.trim()) return true;
  return !collapsedSections.value[sectionKey];
};

const toggleSection = (sectionKey) => {
  collapsedSections.value[sectionKey] = !collapsedSections.value[sectionKey];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SIDEBAR_SECTIONS_STORAGE_KEY, JSON.stringify(collapsedSections.value));
    }
  } catch {}
};

const getSectionItemCount = (sectionKey) =>
  PLAYGROUND_NAV_ITEMS.filter(item => item.sectionKey === sectionKey).length;

const getComponentTag = (path) => {
  const item = PLAYGROUND_NAV_ITEMS.find(entry => entry.id === path);
  return item ? item.componentTag : '';
};

const isKeyboardSelected = (path) => {
  if (!searchQuery.value.trim()) return false;
  const activeItem = matchedItems.value[activeHighlightIdx.value];
  return Boolean(activeItem && activeItem.id === path);
};

watch(searchQuery, () => {
  activeHighlightIdx.value = 0;
});

const handleSearchInputKeydown = (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    if (searchQuery.value) {
      clearSearch();
    } else if (searchInputRef.value) {
      searchInputRef.value.blur();
    }
    return;
  }
  const count = matchedItems.value.length;
  if (!count) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeHighlightIdx.value = (activeHighlightIdx.value + 1) % count;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeHighlightIdx.value = (activeHighlightIdx.value - 1 + count) % count;
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const target = matchedItems.value[activeHighlightIdx.value] || matchedItems.value[0];
    if (target && target.to) {
      router.push(target.to);
    }
  }
};

const updateViewport = () => {
  if (typeof window !== 'undefined') {
    isNarrow.value = window.innerWidth <= 860;
  }
};

const syncThemeFavicon = (dark) => {
  if (typeof document === 'undefined') return;
  const iconLink = document.querySelector('link[rel="icon"]');
  if (iconLink) {
    const nextHref = dark ? '/nano-ui-dark.svg' : '/nano-ui-light.svg';
    if (iconLink.getAttribute('href') !== nextHref) {
      iconLink.setAttribute('href', nextHref);
    }
  }
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', dark ? '#09090b' : '#f8fafc');
  }
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
  syncThemeFavicon(isDark.value);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('theme-switching');
    });
  });
};

const onContentPointerEvent = (e) => {
  if (!e || !e.target) return;
  const group = resolveInteractiveDomGroup(e.target, mainContentRef.value);
  if (group) {
    lastInteractedGroupEl = group;
  }
};

const focusSearchInput = () => {
  searchInputRef.value?.focus();
  searchInputRef.value?.select();
};

onMounted(() => {
  initSavedLang();
  try {
    if (typeof localStorage !== 'undefined') {
      const savedSecs = localStorage.getItem(SIDEBAR_SECTIONS_STORAGE_KEY);
      if (savedSecs) {
        const parsed = JSON.parse(savedSecs);
        if (parsed && typeof parsed === 'object') {
          collapsedSections.value = { ...collapsedSections.value, ...parsed };
        }
      }
    }
  } catch {}
  updateViewport();
  window.addEventListener('resize', updateViewport, { passive: true });
  const keys = getGlobalKeyController();
  offGlobalKeys = keys.bindAll({
    '/': () => searchInputRef.value?.focus(),
    'Ctrl+K': focusSearchInput,
    'Meta+K': focusSearchInput,
    t: toggleTheme,
    l: toggleLang,
    ArrowLeft: {
      handler: () => {
        const stepped = stepInteractiveDomGroup(mainContentRef.value, -1, lastInteractedGroupEl);
        return stepped ? true : false;
      },
      allowRepeat: true,
    },
    ArrowRight: {
      handler: () => {
        const stepped = stepInteractiveDomGroup(mainContentRef.value, 1, lastInteractedGroupEl);
        return stepped ? true : false;
      },
      allowRepeat: true,
    },
  });
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
  syncThemeFavicon(isDark.value);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateViewport);
  if (typeof offGlobalKeys === 'function') {
    offGlobalKeys();
    offGlobalKeys = null;
  }
});
</script>

<template>
  <div class="playground-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <router-link to="/" class="header-brand" v-tooltip="isNarrow ? 'Nano UI' : undefined" @click="playConceptSonicLogo(sharedBrandConcept)">
          <svg class="brand-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
            <rect x="1" y="1" width="30" height="30" rx="7.2" fill="var(--nano-bg-card-elevated, #0f172a)" stroke="var(--nano-border-card, rgba(148,163,184,0.35))" stroke-width="1"/>
            <template v-if="sharedBrandConcept === 'PHI'">
              <rect x="7" y="7" width="4.25" height="18" rx="0.9" fill="var(--nano-accent-primary, #6366f1)"/>
              <polygon points="11.85,7 25,25 25,15.85" fill="#06b6d4"/>
              <circle cx="22.55" cy="9.45" r="2.45" fill="var(--nano-state-active, #0284c7)"/>
            </template>
            <template v-else-if="sharedBrandConcept === 'A'">
              <path d="M6.5 9.8 L11.5 6.8 L11.5 22.8 L6.5 25.8 Z" fill="var(--nano-accent-primary, #6366f1)"/>
              <path d="M13.3 7.2 L18.7 16.6 L18.7 24.8 L13.3 15.4 Z" fill="#06b6d4"/>
              <path d="M20.5 6.8 L25.5 9.8 L25.5 21.8 L20.5 18.8 Z" fill="var(--nano-state-active, #00f2fe)"/>
            </template>
            <template v-else-if="sharedBrandConcept === 'B'">
              <path d="M6.8 7.5 H11.4 V24.5 H6.8 Z" fill="var(--nano-accent-primary, #6366f1)"/>
              <path d="M12.9 7.5 H17.5 L22.2 24.5 H17.6 Z" fill="#10b981"/>
              <path d="M20.6 7.5 H25.2 V18.5 L20.6 13.5 Z" fill="var(--nano-state-active, #00f2fe)"/>
            </template>
            <template v-else>
              <rect x="7" y="7.2" width="4.8" height="17.6" rx="2.4" fill="var(--nano-accent-primary, #6366f1)"/>
              <path d="M10.5 9.2 L22.2 22.8 V16.2" stroke="#06b6d4" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="22.2" cy="9.4" r="3.1" fill="var(--nano-state-active, #00f2fe)"/>
            </template>
          </svg>
          <div class="brand-info">
            <h1 class="brand-title">Nano UI</h1>
            <span class="version">v{{ version }}</span>
          </div>
        </router-link>
        <div class="header-controls desktop-toggle">
          <button class="lang-toggle-btn" @click="toggleLang" :aria-label="t('common.toggleLang')" v-tooltip="t('common.toggleLang')">
            {{ currentLang.toUpperCase() }}
          </button>
          <button class="theme-toggle" @click="toggleTheme" :aria-label="t('common.toggleTheme')" v-tooltip="t('common.toggleTheme')">
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
      </div>
      
      <div class="sidebar-search">
        <div class="sidebar-search-box" :class="{ 'has-query': searchQuery.trim().length > 0 }">
          <svg class="sidebar-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            id="nano-playground-search"
            ref="searchInputRef"
            v-model="searchQuery"
            name="nano-playground-search"
            type="text"
            class="sidebar-search-input"
            :placeholder="t('common.searchPlaceholder')"
            :aria-label="t('common.searchPlaceholder')"
            autocomplete="off"
            spellcheck="false"
            @keydown="handleSearchInputKeydown"
          />
          <span v-if="!searchQuery" class="sidebar-search-kbd" aria-hidden="true">/</span>
          <template v-else>
            <span class="sidebar-search-count">{{ matchedItems.length }}</span>
            <button
              type="button"
              class="sidebar-search-clear"
              :aria-label="t('common.searchClear')"
              v-tooltip="t('common.searchClear')"
              @click="clearSearch"
            >
              ×
            </button>
          </template>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div v-if="searchQuery.trim() && matchedItems.length === 0" class="sidebar-search-empty">
          <p class="empty-text">{{ t('common.searchNoResults') }} <strong>"{{ searchQuery.trim() }}"</strong></p>
          <button type="button" class="empty-reset-btn" @click="clearSearch">
            {{ t('common.searchReset') }}
          </button>
        </div>

        <div v-show="hasSectionMatches('nav.gettingStarted')" class="nav-section" :class="{ 'is-collapsed': !isSectionExpanded('nav.gettingStarted') }">
          <button
            type="button"
            class="nav-section-header"
            :aria-expanded="isSectionExpanded('nav.gettingStarted') ? 'true' : 'false'"
            @click="toggleSection('nav.gettingStarted')"
          >
            <span class="nav-section-title">{{ t('nav.gettingStarted') }}</span>
            <span class="nav-section-meta">
              <span class="nav-section-count">{{ getSectionItemCount('nav.gettingStarted') + 1 }}</span>
              <svg class="nav-section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </button>
          <div v-show="isSectionExpanded('nav.gettingStarted')" class="nav-section-body">
          <router-link v-show="isRouteVisible('/docs/overview')" to="/docs/overview" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/overview') }" active-class="active" v-tooltip="isNarrow ? t('nav.overview') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.overview') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/overview') }}</span>
            </span>
          </router-link>
          <router-link to="/showoff" class="nav-link" active-class="active" v-tooltip="isNarrow ? '3D Showoff (Φ)' : undefined">
            <NanoIcon name="sparkles" class="nav-icon" :size="18" />
            <span class="nav-label-group">
              <span class="nav-label">3D Showoff (/showoff)</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/ecosystem')" to="/docs/ecosystem" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/ecosystem') }" active-class="active" v-tooltip="isNarrow ? t('nav.ecosystem') : undefined">
            <NanoIcon name="layers" class="nav-icon" :size="18" />
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.ecosystem') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/ecosystem') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/typography')" to="/docs/typography" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/typography') }" active-class="active" v-tooltip="isNarrow ? t('nav.typography') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="4 7 4 4 20 4 20 7"/>
              <line x1="9" y1="20" x2="15" y2="20"/>
              <line x1="12" y1="4" x2="12" y2="20"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.typography') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/typography') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/icons')" to="/docs/icons" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/icons') }" active-class="active" v-tooltip="isNarrow ? t('nav.icons') : undefined">
            <NanoIcon name="sparkles" class="nav-icon" :size="18" />
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.icons') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/icons') }}</span>
            </span>
          </router-link>
          </div>
        </div>

        <div v-show="hasSectionMatches('nav.formControls')" class="nav-section" :class="{ 'is-collapsed': !isSectionExpanded('nav.formControls') }">
          <button
            type="button"
            class="nav-section-header"
            :aria-expanded="isSectionExpanded('nav.formControls') ? 'true' : 'false'"
            @click="toggleSection('nav.formControls')"
          >
            <span class="nav-section-title">{{ t('nav.formControls') }}</span>
            <span class="nav-section-meta">
              <span class="nav-section-count">{{ getSectionItemCount('nav.formControls') }}</span>
              <svg class="nav-section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </button>
          <div v-show="isSectionExpanded('nav.formControls')" class="nav-section-body">
          <router-link v-show="isRouteVisible('/docs/buttons')" to="/docs/buttons" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/buttons') }" active-class="active" v-tooltip="isNarrow ? t('nav.buttons') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="6" width="18" height="12" rx="3"/>
              <path d="M8 12h8"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.buttons') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/buttons') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/inputs')" to="/docs/inputs" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/inputs') }" active-class="active" v-tooltip="isNarrow ? t('nav.inputs') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="3"/>
              <line x1="6" y1="12" x2="10" y2="12"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.inputs') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/inputs') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/select')" to="/docs/select" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/select') }" active-class="active" v-tooltip="isNarrow ? t('nav.select') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2"/>
              <polyline points="9 11 12 14 15 11"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.select') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/select') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/switch')" to="/docs/switch" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/switch') }" active-class="active" v-tooltip="isNarrow ? t('nav.switch') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="5" width="22" height="14" rx="7"/>
              <circle cx="16" cy="12" r="3"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.switch') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/switch') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/slider')" to="/docs/slider" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/slider') }" active-class="active" v-tooltip="isNarrow ? t('nav.slider') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="2" y1="12" x2="22" y2="12"/>
              <circle cx="15" cy="12" r="4"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.slider') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/slider') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/number-stepper')" to="/docs/number-stepper" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/number-stepper') }" active-class="active" v-tooltip="isNarrow ? t('nav.numberStepper') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="3"/>
              <path d="M16 5v14M18 9l2-2 2 2M18 15l2 2 2-2"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.numberStepper') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/number-stepper') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/date-picker')" to="/docs/date-picker" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/date-picker') }" active-class="active" v-tooltip="isNarrow ? t('nav.datePicker') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.datePicker') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/date-picker') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/secret-pipe')" to="/docs/secret-pipe" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/secret-pipe') }" active-class="active" v-tooltip="isNarrow ? t('nav.secretPipe') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.secretPipe') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/secret-pipe') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/masked-input')" to="/docs/masked-input" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/masked-input') }" active-class="active" v-tooltip="isNarrow ? t('nav.maskedInput') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="6" width="18" height="12" rx="2"/>
              <path d="M7 12h2M11 12h2M15 12h2"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.maskedInput') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/masked-input') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/color-picker')" to="/docs/color-picker" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/color-picker') }" active-class="active" v-tooltip="isNarrow ? t('nav.colorPicker') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="13.5" cy="6.5" r=".5"/>
              <circle cx="17.5" cy="10.5" r=".5"/>
              <circle cx="8.5" cy="7.5" r=".5"/>
              <circle cx="6.5" cy="12.5" r=".5"/>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.colorPicker') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/color-picker') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/knob')" to="/docs/knob" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/knob') }" active-class="active" v-tooltip="isNarrow ? t('nav.knob') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <circle cx="12" cy="12" r="3"/>
              <line x1="12" y1="3" x2="12" y2="7"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.knob') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/knob') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/precision-scrubber')" to="/docs/precision-scrubber" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/precision-scrubber') }" active-class="active" v-tooltip="isNarrow ? t('nav.scrubber') : undefined">
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
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.scrubber') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/precision-scrubber') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/dropzone')" to="/docs/dropzone" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/dropzone') }" active-class="active" v-tooltip="isNarrow ? t('nav.dropzone') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.dropzone') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/dropzone') }}</span>
            </span>
          </router-link>
          </div>
        </div>

        <div v-show="hasSectionMatches('nav.layoutNavigation')" class="nav-section" :class="{ 'is-collapsed': !isSectionExpanded('nav.layoutNavigation') }">
          <button
            type="button"
            class="nav-section-header"
            :aria-expanded="isSectionExpanded('nav.layoutNavigation') ? 'true' : 'false'"
            @click="toggleSection('nav.layoutNavigation')"
          >
            <span class="nav-section-title">{{ t('nav.layoutNavigation') }}</span>
            <span class="nav-section-meta">
              <span class="nav-section-count">{{ getSectionItemCount('nav.layoutNavigation') }}</span>
              <svg class="nav-section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </button>
          <div v-show="isSectionExpanded('nav.layoutNavigation')" class="nav-section-body">
          <router-link v-show="isRouteVisible('/docs/tabs')" to="/docs/tabs" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/tabs') }" active-class="active" v-tooltip="isNarrow ? t('nav.tabs') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="3"/>
              <path d="M2 10h20M10 4v6"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.tabs') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/tabs') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/modal')" to="/docs/modal" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/modal') }" active-class="active" v-tooltip="isNarrow ? t('nav.modal') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.modal') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/modal') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/splitter')" to="/docs/splitter" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/splitter') }" active-class="active" v-tooltip="isNarrow ? t('nav.splitter') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="12" y1="3" x2="12" y2="21"/>
              <polygon points="10,5 14,5 12,9" fill="currentColor"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.splitter') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/splitter') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/cards')" to="/docs/cards" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/cards') }" active-class="active" v-tooltip="isNarrow ? t('nav.cards') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.cards') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/cards') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/sortable')" to="/docs/sortable" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/sortable') }" active-class="active" v-tooltip="isNarrow ? t('nav.sortable') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="6" r="1.2" fill="currentColor"/>
              <circle cx="15" cy="6" r="1.2" fill="currentColor"/>
              <circle cx="9" cy="12" r="1.2" fill="currentColor"/>
              <circle cx="15" cy="12" r="1.2" fill="currentColor"/>
              <circle cx="9" cy="18" r="1.2" fill="currentColor"/>
              <circle cx="15" cy="18" r="1.2" fill="currentColor"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.sortable') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/sortable') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/tables')" to="/docs/tables" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/tables') }" active-class="active" v-tooltip="isNarrow ? t('nav.tables') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="3" y1="15" x2="21" y2="15"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.tables') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/tables') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/badges')" to="/docs/badges" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/badges') }" active-class="active" v-tooltip="isNarrow ? t('nav.badges') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.badges') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/badges') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/alerts')" to="/docs/alerts" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/alerts') }" active-class="active" v-tooltip="isNarrow ? t('nav.alerts') : undefined">
            <NanoIcon name="warn" class="nav-icon" :size="18" />
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.alerts') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/alerts') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/channel-osd')" to="/docs/channel-osd" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/channel-osd') }" active-class="active" v-tooltip="isNarrow ? t('nav.channelOsd') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="4"/>
              <path d="M9 8v8M14 8h3v4h-3v4h3"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.channelOsd') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/channel-osd') }}</span>
            </span>
          </router-link>
          </div>
        </div>

        <div v-show="hasSectionMatches('nav.advanced3dViz')" class="nav-section" :class="{ 'is-collapsed': !isSectionExpanded('nav.advanced3dViz') }">
          <button
            type="button"
            class="nav-section-header"
            :aria-expanded="isSectionExpanded('nav.advanced3dViz') ? 'true' : 'false'"
            @click="toggleSection('nav.advanced3dViz')"
          >
            <span class="nav-section-title">{{ t('nav.advanced3dViz') }}</span>
            <span class="nav-section-meta">
              <span class="nav-section-count">{{ getSectionItemCount('nav.advanced3dViz') }}</span>
              <svg class="nav-section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </button>
          <div v-show="isSectionExpanded('nav.advanced3dViz')" class="nav-section-body">
          <router-link v-show="isRouteVisible('/docs/code-editor')" to="/docs/code-editor" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/code-editor') }" active-class="active" v-tooltip="isNarrow ? t('nav.codeEditor') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="16 18 22 12 16 6"/>
              <polyline points="8 6 2 12 8 18"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.codeEditor') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/code-editor') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/trend-chart')" to="/docs/trend-chart" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/trend-chart') }" active-class="active" v-tooltip="isNarrow ? t('nav.trendChart') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.trendChart') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/trend-chart') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/3d-donut-chart')" to="/docs/3d-donut-chart" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/3d-donut-chart') }" active-class="active" v-tooltip="isNarrow ? t('nav.donut') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
              <path d="M22 12A10 10 0 0 0 12 2v10z"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.donut') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/3d-donut-chart') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/globe')" to="/docs/globe" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/globe') }" active-class="active" v-tooltip="isNarrow ? t('nav.globe') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.globe') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/globe') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/map')" to="/docs/map" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/map') }" active-class="active" v-tooltip="isNarrow ? t('nav.map') : undefined">
            <NanoIcon name="map" class="nav-icon" :size="18" />
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.map') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/map') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/topology-radar')" to="/docs/topology-radar" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/topology-radar') }" active-class="active" v-tooltip="isNarrow ? t('nav.radar') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6"/>
              <line x1="12" y1="2" x2="12" y2="22"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.radar') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/topology-radar') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/kinetic')" to="/docs/kinetic" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/kinetic') }" active-class="active" v-tooltip="isNarrow ? t('nav.rotator') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.8 1.04 6.44 2.73L21 8"/>
              <polyline points="21 3 21 8 16 8"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.rotator') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/kinetic') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/kinetic-animations')" to="/docs/kinetic-animations" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/kinetic-animations') }" active-class="active" v-tooltip="isNarrow ? t('nav.kineticEngine') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 12c3-6 6-6 9 0s6 6 9 0"/>
              <circle cx="11" cy="12" r="2"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.kineticEngine') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/kinetic-animations') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/mutating-header')" to="/docs/mutating-header" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/mutating-header') }" active-class="active" v-tooltip="isNarrow ? t('nav.mutatingHeader') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="20" height="6" rx="2"/>
              <rect x="2" y="14" width="20" height="6" rx="2"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.mutatingHeader') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/mutating-header') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/coverflow')" to="/docs/coverflow" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/coverflow') }" active-class="active" v-tooltip="isNarrow ? t('nav.coverFlow') : undefined">
            <NanoIcon name="layers" class="nav-icon" :size="18" />
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.coverFlow') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/coverflow') }}</span>
            </span>
          </router-link>
          </div>
        </div>

        <div v-show="hasSectionMatches('nav.directives')" class="nav-section" :class="{ 'is-collapsed': !isSectionExpanded('nav.directives') }">
          <button
            type="button"
            class="nav-section-header"
            :aria-expanded="isSectionExpanded('nav.directives') ? 'true' : 'false'"
            @click="toggleSection('nav.directives')"
          >
            <span class="nav-section-title">{{ t('nav.directives') }}</span>
            <span class="nav-section-meta">
              <span class="nav-section-count">{{ getSectionItemCount('nav.directives') }}</span>
              <svg class="nav-section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </button>
          <div v-show="isSectionExpanded('nav.directives')" class="nav-section-body">
          <router-link v-show="isRouteVisible('/docs/tooltip')" to="/docs/tooltip" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/tooltip') }" active-class="active" v-tooltip="isNarrow ? t('nav.tooltip') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.tooltip') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/tooltip') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/ripple')" to="/docs/ripple" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/ripple') }" active-class="active" v-tooltip="isNarrow ? t('nav.ripple') : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <circle cx="12" cy="12" r="5"/>
              <circle cx="12" cy="12" r="1"/>
            </svg>
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.ripple') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/ripple') }}</span>
            </span>
          </router-link>
          <router-link v-show="isRouteVisible('/docs/layout-directives')" to="/docs/layout-directives" class="nav-link" :class="{ 'kbd-selected': isKeyboardSelected('/docs/layout-directives') }" active-class="active" v-tooltip="isNarrow ? t('nav.layoutDirectives') : undefined">
            <NanoIcon name="layers" class="nav-icon" :size="18" />
            <span class="nav-label-group">
              <span class="nav-label">{{ t('nav.layoutDirectives') }}</span>
              <span v-if="searchQuery.trim()" class="nav-match-tag">{{ getComponentTag('/docs/layout-directives') }}</span>
            </span>
          </router-link>
          </div>
        </div>
      </nav>

      <div class="sidebar-footer">
        <button class="lang-toggle-btn mobile-toggle" @click="toggleLang" :aria-label="t('common.toggleLang')" v-tooltip="t('common.toggleLang')">
          {{ currentLang.toUpperCase() }}
        </button>
        <button class="theme-toggle mobile-toggle" @click="toggleTheme" :aria-label="t('common.toggleTheme')" v-tooltip="t('common.toggleTheme')">
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
    
    <main
      ref="mainContentRef"
      class="content"
      @mouseover="onContentPointerEvent"
      @click="onContentPointerEvent"
    >
      <div class="content-header">
        <h1>Playground</h1>
        <p>{{ t('app.playgroundDesc') }}</p>
      </div>
      
      <div class="component-section">
        <router-view v-slot="{ Component, route }">
          <transition name="fade" mode="out-in">
            <component :is="Component" :key="route.path" />
          </transition>
        </router-view>
      </div>
    </main>

    <GlobalTooltip />
  </div>
</template>

