import { ref } from 'vue';
import enDict from './locales/en.json';
import plDict from './locales/pl.json';

const STORAGE_KEY = 'nano_ui_lang';

// Deterministic initial language matching SSR baseline
export const currentLang = ref('en');

export const initSavedLang = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'en' || saved === 'pl')) {
        currentLang.value = saved;
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('lang', saved);
        }
      }
    }
  } catch (e) {}
};

export const setLang = (lang) => {
  if (['en', 'pl'].includes(lang)) {
    currentLang.value = lang;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, lang);
      }
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('lang', lang);
      }
    } catch (e) {}
  }
};

export const toggleLang = () => {
  setLang(currentLang.value === 'en' ? 'pl' : 'en');
};

const dictionaries = {
  en: enDict,
  pl: plDict,
};

export const t = (path, params = {}) => {
  const lang = currentLang.value;
  const keys = path.split('.');
  let current = dictionaries[lang];

  for (const key of keys) {
    if (current && current[key] !== undefined) {
      current = current[key];
    } else {
      // Fallback to English if key missing in current locale
      let fallback = dictionaries['en'];
      for (const fbKey of keys) {
        if (fallback && fallback[fbKey] !== undefined) {
          fallback = fallback[fbKey];
        } else {
          return path;
        }
      }
      current = fallback;
      break;
    }
  }

  let text = current;
  if (typeof text !== 'string') {
    return path;
  }

  // Parameter replacement e.g., {name}, {count}
  if (params && typeof params === 'object' && !Array.isArray(params)) {
    for (const [key, value] of Object.entries(params)) {
      text = text.replace(new RegExp(`{${key}}`, 'g'), value !== undefined && value !== null ? value : '');
    }
  }

  return text;
};

export default {
  install(app) {
    app.config.globalProperties.$t = t;
    app.config.globalProperties.$currentLang = currentLang;
    app.provide('t', t);
    app.provide('currentLang', currentLang);
    app.provide('setLang', setLang);
    app.provide('toggleLang', toggleLang);
  },
};
