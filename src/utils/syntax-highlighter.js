/**
 * Nano UI Syntax Highlighter powered by Highlight.js
 * Robust AST / grammar-based highlighting matching knowledge-base & ecosystem standards.
 */
import hljs from 'highlight.js'

// Ensure 'vue' and 'htmls' are registered as aliases for XML/HTML template syntax
if (!hljs.getLanguage('vue')) {
  hljs.registerAliases(['vue', 'htmls'], { languageName: 'xml' })
}

export const escapeHtml = (str) => {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const highlightJs = (code) => highlightCode(code, 'javascript')
export const highlightCss = (code) => highlightCode(code, 'css')
export const highlightHtml = (code) => highlightCode(code, 'html')
export const highlightVue = (code) => highlightCode(code, 'vue')

/**
 * Highlights a code snippet using highlight.js with safe fallback to escaped HTML.
 * @param {string} code
 * @param {string} [lang='']
 * @returns {string}
 */
export const highlightCode = (code, lang = '') => {
  if (!code) return ''
  const normalizedLang = String(lang).toLowerCase().trim()

  try {
    if (normalizedLang && hljs.getLanguage(normalizedLang)) {
      return hljs.highlight(code, { language: normalizedLang, ignoreIllegals: true }).value
    }
    if (!normalizedLang) {
      return hljs.highlightAuto(code).value || escapeHtml(code)
    }
    return escapeHtml(code)
  } catch {
    return escapeHtml(code)
  }
}

export default highlightCode
