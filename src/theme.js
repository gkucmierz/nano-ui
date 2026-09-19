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
