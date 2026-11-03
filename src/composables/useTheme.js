import { ref } from 'vue';
import { initTheme as coreInitTheme } from '../theme.js';

const isDark = ref(true);

export const useTheme = ({ storageKey = 'nano-ui-theme', defaultTheme = 'dark' } = {}) => {
  const applyTheme = dark => {
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
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(storageKey, theme);
      } catch {}
    }
  };

  const toggleTheme = () => {
    applyTheme(!isDark.value);
  };

  const initTheme = () => {
    const active = coreInitTheme({ storageKey, defaultTheme });
    isDark.value = active !== 'light';
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        document.documentElement.classList.remove('preload');
      }, 60);
    }
    return active;
  };

  return {
    isDark,
    toggleTheme,
    initTheme,
  };
};

export default useTheme;
