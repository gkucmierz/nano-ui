// Nano UI - Synchronous Theme Initialization (Zero FOUC / Instant Execution)
import { getScopedStorageController, normalizeStorageMode, STORAGE_MODES } from './utils/storage-controller.js';

const themeStorageCtrl = getScopedStorageController('nano-ui');

const normalizeThemeValue = (val) => {
  if (!val) return null;
  const clean = String(val).replace(/^"|"$/g, '').trim();
  return clean === 'light' || clean === 'dark' ? clean : null;
};

/**
 * Initializes data-theme and colorScheme attributes on <html> synchronously.
 * Reads saved user preference from @gkucmierz/storage-controller (`DA_NU_theme` / `storageKey`)
 * or detects OS prefers-color-scheme.
 * Adds 'preload' class to suppress CSS transition flashes during boot.
 *
 * @param {Object} options
 * @param {string} [options.storageKey='theme'] Key in storage-controller / localStorage
 * @param {string|boolean} [options.storage='ls'] Storage mode ('ls' | 'ss' | 'none')
 * @param {string} [options.appPrefix=''] Optional host application prefix override
 * @param {string} [options.defaultTheme='dark'] Fallback theme ('dark' | 'light')
 * @returns {string} The active theme ('dark' | 'light')
 */
export const initTheme = ({
  storageKey = 'theme',
  storage = 'ls',
  appPrefix = '',
  defaultTheme = 'dark',
} = {}) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return defaultTheme;
  }

  try {
    const mode = normalizeStorageMode(storage, STORAGE_MODES.LS);
    let saved = null;

    if (mode !== STORAGE_MODES.NONE) {
      const fromCtrl = themeStorageCtrl.get(storageKey, null, {
        mode,
        appPrefix,
        raw: true,
      });
      saved = normalizeThemeValue(fromCtrl);

      if (!saved && typeof localStorage !== 'undefined' && mode === STORAGE_MODES.LS) {
        saved =
          normalizeThemeValue(localStorage.getItem(storageKey)) ||
          normalizeThemeValue(localStorage.getItem('nano-ui-theme'));
      }
    }

    const supportDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (supportDark ? 'dark' : defaultTheme || 'light');

    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    document.documentElement.style.colorScheme = theme;
    document.documentElement.classList.add('preload');
    return theme;
  } catch {
    return defaultTheme;
  }
};

/**
 * Detects whether Nano UI is loaded inside a VitePress host application
 * (where VitePress owns `<html class="dark">` and `vitepress-theme-appearance`).
 *
 * @returns {boolean}
 */
export const isVitePressHost = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (window.__VP_HASH_MAP__ || window.__VP_SITE_DATA__) return true;
  if (typeof document.querySelector === 'function') {
    const gen = document.querySelector('meta[name="generator"]');
    if (gen && /^VitePress\b/i.test(gen.getAttribute('content') || '')) return true;
  }
  return false;
};

/**
 * Synchronizes `<html data-theme="...">` and `style.colorScheme` from a boolean `isDark` signal
 * (used when Nano UI components are embedded inside VitePress or external theme hosts).
 *
 * @param {boolean} isDark
 * @returns {'dark' | 'light'}
 */
export const syncThemeWithHostDark = (isDark) => {
  const active = isDark ? 'dark' : 'light';
  if (typeof document !== 'undefined' && document.documentElement) {
    if (active === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    if (document.documentElement.style) {
      document.documentElement.style.colorScheme = active;
    }
  }
  return active;
};

// Immediate instant execution on module evaluation (respects VitePress host polarity when embedded)
if (isVitePressHost()) {
  syncThemeWithHostDark(document.documentElement.classList.contains('dark'));
} else {
  initTheme();
}

/**
 * Inlined client-side theme initialization logic.
 * Encapsulated as a standard JavaScript function for static analysis and clean formatting.
 *
 * @param {string} storageKey
 * @param {string} defaultTheme
 */
const clientThemeBoot = (storageKey, defaultTheme) => {
  try {
    const saved = localStorage.getItem(storageKey);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const active = (saved === 'light' || saved === 'dark')
      ? saved
      : (prefersDark ? 'dark' : defaultTheme);

    if (active === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    document.documentElement.style.colorScheme = active;
    document.documentElement.classList.add('preload');
  } catch {}
};

/**
 * Generates the inlined JavaScript string for synchronous execution in <head>.
 * Serializes the clean typed function into an IIFE to guarantee zero static analysis issues.
 *
 * @param {Object} [options]
 * @param {string} [options.storageKey='nano-ui-theme']
 * @param {string} [options.defaultTheme='dark']
 * @returns {string}
 */
export const getZeroFoucScript = ({ storageKey = 'nano-ui-theme', defaultTheme = 'dark' } = {}) => {
  const serializedFn = clientThemeBoot.toString();
  const safeKey = JSON.stringify(storageKey);
  const safeDefault = JSON.stringify(defaultTheme);

  return `(${serializedFn})(${safeKey}, ${safeDefault});`;
};

/**
 * Generates the critical CSS for zero FOUC and transition freezing.
 *
 * @returns {string}
 */
export const getZeroFoucStyle = () => {
  return [
    'html { background-color: #09090b; color-scheme: dark; }',
    'html[data-theme="light"] { background-color: #f8fafc; color-scheme: light; }',
    'html.preload, html.preload *, html.preload *::before, html.preload *::after,',
    'html.theme-switching, html.theme-switching *, html.theme-switching *::before, html.theme-switching *::after {',
    '  transition: none !important;',
    '}',
  ].join('\n');
};

/**
 * Generates the full HTML snippet (<script> + <style>) for inclusion in <head>.
 *
 * @param {Object} [options]
 * @returns {string}
 */
export const getZeroFoucHtml = ({ storageKey = 'nano-ui-theme', defaultTheme = 'dark' } = {}) => {
  return `<script id="nano-ui-zero-fouc">${getZeroFoucScript({ storageKey, defaultTheme })}</script>\n<style id="nano-ui-zero-fouc-style">\n${getZeroFoucStyle()}\n</style>`;
};
