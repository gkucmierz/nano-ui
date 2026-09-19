import { getZeroFoucScript, getZeroFoucStyle } from '../theme.js';

/**
 * Vite plugin for Nano UI.
 * Injects Zero-FOUC synchronous initialization script and styles into <head> at build and dev time.
 *
 * @param {Object} [options]
 * @param {string} [options.storageKey='nano-ui-theme'] Key in localStorage
 * @param {string} [options.defaultTheme='dark'] Fallback theme ('dark' | 'light')
 * @returns {import('vite').Plugin}
 */
export const nanoUi = ({ storageKey = 'nano-ui-theme', defaultTheme = 'dark' } = {}) => {
  return {
    name: 'vite-plugin-nano-ui',
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: { id: 'nano-ui-zero-fouc' },
          children: getZeroFoucScript({ storageKey, defaultTheme }),
          injectTo: 'head-prepend'
        },
        {
          tag: 'style',
          attrs: { id: 'nano-ui-zero-fouc-style' },
          children: getZeroFoucStyle(),
          injectTo: 'head-prepend'
        }
      ];
    }
  };
};

export const nanoThemePlugin = nanoUi;
export default nanoUi;
