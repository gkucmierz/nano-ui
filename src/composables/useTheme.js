import { ref } from 'vue';
import { initTheme as coreInitTheme } from '../theme.js';
import {
  getScopedStorageController,
  normalizeStorageMode,
  STORAGE_MODES,
} from '../utils/storage-controller.js';

const isDark = ref(true);
const themeStorageCtrl = getScopedStorageController('nano-ui');

export const getNextTheme = (currentTheme) => (currentTheme === 'light' ? 'dark' : 'light');

export const useTheme = ({
  storageKey = 'theme',
  storage = 'ls',
  appPrefix = '',
  defaultTheme = 'dark',
} = {}) => {
  const applyTheme = (dark) => {
    isDark.value = dark;
    const theme = dark ? 'dark' : 'light';
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('theme-switching');
      if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      document.documentElement.style.colorScheme = theme;
      setTimeout(() => {
        document.documentElement.classList.remove('theme-switching');
      }, 60);
    }

    const mode = normalizeStorageMode(storage, STORAGE_MODES.LS);
    if (mode !== STORAGE_MODES.NONE) {
      themeStorageCtrl.set(storageKey, theme, {
        mode,
        appPrefix,
        raw: true,
      });
      if (mode === STORAGE_MODES.LS && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('nano-ui-theme', theme);
          if (storageKey && storageKey !== 'theme') {
            localStorage.setItem(storageKey, theme);
          }
        } catch {}
      }
    }
  };

  const toggleTheme = () => {
    applyTheme(!isDark.value);
  };

  const initTheme = () => {
    const active = coreInitTheme({ storageKey, storage, appPrefix, defaultTheme });
    isDark.value = active !== 'light';
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        document.documentElement.classList.remove('preload');
      }, 60);
    }
    return active;
  };

  if (typeof document !== 'undefined' && document.documentElement) {
    const domTheme = document.documentElement.getAttribute('data-theme');
    if (domTheme === 'light') {
      isDark.value = false;
    } else if (domTheme === 'dark') {
      isDark.value = true;
    }
    if (document.documentElement.classList.contains('preload')) {
      initTheme();
    }
  }

  const resolvedStorageKey = () =>
    themeStorageCtrl.resolveKey(storageKey, { appPrefix });

  return {
    isDark,
    toggleTheme,
    initTheme,
    applyTheme,
    resolvedStorageKey,
  };
};

export default useTheme;
