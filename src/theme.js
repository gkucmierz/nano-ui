// Nano UI - Synchronous Theme Initialization (Zero FOUC / Instant Execution)

/**
 * Initializes data-theme and colorScheme attributes on <html> synchronously.
 * Reads saved user preference from localStorage or detects OS prefers-color-scheme.
 * Adds 'preload' class to suppress CSS transition flashes during boot.
 *
 * @param {Object} options
 * @param {string} [options.storageKey='nano-ui-theme'] Key in localStorage
 * @param {string} [options.defaultTheme='dark'] Fallback theme ('dark' | 'light')
 * @returns {string} The active theme ('dark' | 'light')
 */
export const initTheme = ({ storageKey = 'nano-ui-theme', defaultTheme = 'dark' } = {}) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return defaultTheme;
  }

  try {
    const saved = localStorage.getItem(storageKey);
    const supportDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = (saved === 'light' || saved === 'dark')
      ? saved
      : (supportDark ? 'dark' : (defaultTheme || 'light'));

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

// Immediate instant execution on module evaluation
initTheme();

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
