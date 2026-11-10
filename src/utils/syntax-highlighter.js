/**
 * Nano UI Modular Syntax Highlighter powered by Highlight.js Core
 * Supports separately importable language parsers and selectable syntax color profiles.
 */
import hljs from 'highlight.js/lib/core';
import { CORE_PARSERS, PARSER_MAP } from '../parsers/index.js';

export const SYNTAX_THEMES = [
  { id: 'nano', label: 'Nano Cyber (Default)', badge: 'AUTO' },
  { id: 'github', label: 'GitHub Pro', badge: 'DUAL' },
  { id: 'monokai', label: 'Monokai Classic', badge: 'DARK' },
  { id: 'dracula', label: 'Dracula Vampire', badge: 'DARK' },
  { id: 'one-dark', label: 'Atom One Dark', badge: 'DARK' },
  { id: 'nord', label: 'Nord Arctic', badge: 'DARK' },
  { id: 'solarized', label: 'Solarized Studio', badge: 'DUAL' },
  { id: 'cyberpunk', label: 'Neon Cyberpunk', badge: 'NEON' },
];

/**
 * Registers one or more language parser definitions into the Nano UI highlighter.
 * @param {object|Array<object>|string} parserOrList - Parser descriptor `{ id, aliases, grammar, dependencies }` or array of descriptors
 * @returns {Array<string>} List of currently registered language IDs
 */
export const registerParser = (parserOrList) => {
  if (!parserOrList) return getRegisteredParsers();
  const list = Array.isArray(parserOrList) ? parserOrList : [parserOrList];

  for (const item of list) {
    const parser = typeof item === 'string' ? PARSER_MAP[item.toLowerCase().trim()] : item;
    if (!parser || typeof parser.grammar !== 'function' || !parser.id) continue;

    if (Array.isArray(parser.dependencies)) {
      registerParser(parser.dependencies);
    }

    hljs.registerLanguage(parser.id, parser.grammar);
    if (Array.isArray(parser.aliases) && parser.aliases.length > 0) {
      hljs.registerAliases(parser.aliases, { languageName: parser.id });
    }
  }

  return getRegisteredParsers();
};

/**
 * Unregisters a language parser by ID or alias.
 * @param {string} langId
 */
export const unregisterParser = (langId) => {
  if (!langId) return;
  const norm = String(langId).toLowerCase().trim();
  try {
    if (hljs.getLanguage(norm)) {
      hljs.unregisterLanguage(norm);
    }
  } catch {}
};

/**
 * Checks whether a language or alias is currently registered in the highlighter.
 * @param {string} lang
 * @returns {boolean}
 */
export const isParserRegistered = (lang) => {
  if (!lang) return false;
  return Boolean(hljs.getLanguage(String(lang).toLowerCase().trim()));
};

/**
 * Returns all currently registered language names.
 * @returns {Array<string>}
 */
export const getRegisteredParsers = () => {
  return hljs.listLanguages();
};

// Register default core workspace parsers out-of-the-box
registerParser(CORE_PARSERS);

export const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export const highlightJs = (code) => highlightCode(code, 'javascript');
export const highlightCss = (code) => highlightCode(code, 'css');
export const highlightHtml = (code) => highlightCode(code, 'html');
export const highlightVue = (code) => highlightCode(code, 'vue');
export const highlightGlsl = (code) => highlightCode(code, 'glsl');

/**
 * Highlights a code snippet using highlight.js with safe fallback to escaped HTML.
 * @param {string} code
 * @param {string} [lang='']
 * @returns {string}
 */
export const highlightCode = (code, lang = '') => {
  if (!code) return '';
  const normalizedLang = String(lang).toLowerCase().trim();

  try {
    if (normalizedLang && hljs.getLanguage(normalizedLang)) {
      return hljs.highlight(code, { language: normalizedLang, ignoreIllegals: true }).value;
    }
    if (!normalizedLang) {
      return hljs.highlightAuto(code).value || escapeHtml(code);
    }
    return escapeHtml(code);
  } catch {
    return escapeHtml(code);
  }
};

export default highlightCode;
