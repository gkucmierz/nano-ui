import { ref } from 'vue';
import enDict from './locales/en.json';
import plDict from './locales/pl.json';
import {
  getScopedStorageController,
  normalizeStorageMode,
  STORAGE_MODES,
} from './utils/storage-controller.js';

const LEGACY_STORAGE_KEY = 'nano_ui_lang';
const SCOPED_LANG_KEY = 'lang';
const localeStorageCtrl = getScopedStorageController('nano-ui');

// Deterministic initial language matching SSR baseline
export const currentLang = ref('en');

const normalizeLangValue = (val) => {
  if (!val) return null;
  const clean = String(val).replace(/^"|"$/g, '').trim();
  return clean === 'en' || clean === 'pl' ? clean : null;
};

export const initSavedLang = ({ storage = 'ls', appPrefix = '', storageKey = SCOPED_LANG_KEY } = {}) => {
  try {
    const mode = normalizeStorageMode(storage, STORAGE_MODES.LS);
    if (mode === STORAGE_MODES.NONE) return currentLang.value;

    let saved = normalizeLangValue(
      localeStorageCtrl.get(storageKey, null, { mode, appPrefix, raw: true })
    );

    if (!saved && mode === STORAGE_MODES.LS && typeof localStorage !== 'undefined') {
      saved = normalizeLangValue(localStorage.getItem(LEGACY_STORAGE_KEY));
    }

    if (saved) {
      currentLang.value = saved;
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('lang', saved);
      }
    }
  } catch {}
  return currentLang.value;
};

export const setLang = (lang, { storage = 'ls', appPrefix = '', storageKey = SCOPED_LANG_KEY } = {}) => {
  if (['en', 'pl'].includes(lang)) {
    currentLang.value = lang;
    try {
      const mode = normalizeStorageMode(storage, STORAGE_MODES.LS);
      if (mode !== STORAGE_MODES.NONE) {
        localeStorageCtrl.set(storageKey, lang, { mode, appPrefix, raw: true });
        if (mode === STORAGE_MODES.LS && typeof localStorage !== 'undefined') {
          localStorage.setItem(LEGACY_STORAGE_KEY, lang);
        }
      }
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('lang', lang);
      }
    } catch {}
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
  if (!path || Object.prototype.toString.call(path) !== '[object String]') return '';
  const lang = currentLang.value;
  const keys = path.split('.');
  let current = Object.hasOwn(dictionaries, lang) ? dictionaries[lang] : undefined;

  for (const key of keys) {
    if (current && typeof current === 'object' && Object.hasOwn(current, key)) {
      current = current[key];
    } else {
      // Fallback to English if key missing in current locale
      let fallback = dictionaries['en'];
      for (const fbKey of keys) {
        if (fallback && typeof fallback === 'object' && Object.hasOwn(fallback, fbKey)) {
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

  // Parameter replacement e.g., {name}, {count} (literal callback avoids $& / $' expansion and RegExp injection)
  if (params && typeof params === 'object' && !Array.isArray(params)) {
    for (const [key, value] of Object.entries(params)) {
      const replacement = value !== undefined && value !== null ? String(value) : '';
      text = text.replaceAll(`{${key}}`, () => replacement);
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
