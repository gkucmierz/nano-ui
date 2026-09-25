/**
 * Nano UI Built-in Lightweight Syntax Highlighter
 * Zero external dependencies. Fast, deterministic regex-based tokenizer.
 * Supported languages: vue, html, htmls, js, javascript, css.
 */

export const escapeHtml = (str) => {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Highlights JavaScript code tokens.
 * @param {string} code
 * @returns {string}
 */
export const highlightJs = (code) => {
  if (!code) return ''

  // Token definition: comments, strings, regex, numbers, keywords, function calls, punctuation
  const tokenRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\.|[^`])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b(?:true|false|null|undefined|NaN|Infinity)\b)|(\b(?:async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|let|new|return|super|switch|this|throw|try|typeof|var|void|while|with|yield|from|as|of)\b)|(\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)|(\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\())|([{}()[\].,;:?+\-*/%&|^!=<>~])/g

  let lastIndex = 0
  let html = ''
  let match

  while ((match = tokenRegex.exec(code)) !== null) {
    const textBefore = code.slice(lastIndex, match.index)
    if (textBefore) html += escapeHtml(textBefore)

    const [full, comment, string, boolean, keyword, number, fnCall, punct] = match

    if (comment) {
      html += `<span class="hl-comment">${escapeHtml(comment)}</span>`
    } else if (string) {
      html += `<span class="hl-string">${escapeHtml(string)}</span>`
    } else if (boolean) {
      html += `<span class="hl-boolean">${escapeHtml(boolean)}</span>`
    } else if (keyword) {
      html += `<span class="hl-keyword">${escapeHtml(keyword)}</span>`
    } else if (number) {
      html += `<span class="hl-number">${escapeHtml(number)}</span>`
    } else if (fnCall) {
      html += `<span class="hl-function">${escapeHtml(fnCall)}</span>`
    } else if (punct) {
      html += `<span class="hl-punct">${escapeHtml(punct)}</span>`
    } else {
      html += escapeHtml(full)
    }

    lastIndex = match.index + full.length
  }

  const remaining = code.slice(lastIndex)
  if (remaining) html += escapeHtml(remaining)

  return html
}

/**
 * Highlights CSS code tokens.
 * @param {string} code
 * @returns {string}
 */
export const highlightCss = (code) => {
  if (!code) return ''

  // Split into declarations inside {} and selectors outside {}
  const blockRegex = /(\/\*[\s\S]*?\*\/)|(".*?"|'.*?')|(var\(--[a-zA-Z0-9_-]+\)|--[a-zA-Z0-9_-]+)|([^{};]+)([{};])/g

  let lastIndex = 0
  let html = ''
  let match
  let inBlock = false

  while ((match = blockRegex.exec(code)) !== null) {
    const textBefore = code.slice(lastIndex, match.index)
    if (textBefore) html += escapeHtml(textBefore)

    const [full, comment, string, cssVar, segment, separator] = match

    if (comment) {
      html += `<span class="hl-comment">${escapeHtml(comment)}</span>`
    } else if (string) {
      html += `<span class="hl-string">${escapeHtml(string)}</span>`
    } else if (cssVar) {
      html += `<span class="hl-var">${escapeHtml(cssVar)}</span>`
    } else if (segment !== undefined && separator !== undefined) {
      if (separator === '{') {
        // Selector block
        html += `<span class="hl-selector">${escapeHtml(segment)}</span><span class="hl-punct">{</span>`
        inBlock = true
      } else if (separator === '}') {
        // End of block
        if (inBlock && segment.trim()) {
          html += highlightCssDeclaration(segment)
        } else {
          html += escapeHtml(segment)
        }
        html += `<span class="hl-punct">}</span>`
        inBlock = false
      } else if (separator === ';') {
        if (inBlock) {
          html += highlightCssDeclaration(segment) + `<span class="hl-punct">;</span>`
        } else {
          html += escapeHtml(segment) + `<span class="hl-punct">;</span>`
        }
      }
    } else {
      html += escapeHtml(full)
    }

    lastIndex = match.index + full.length
  }

  const remaining = code.slice(lastIndex)
  if (remaining) html += escapeHtml(remaining)

  return html
}

const highlightCssDeclaration = (decl) => {
  const colonIdx = decl.indexOf(':')
  if (colonIdx === -1) return escapeHtml(decl)

  const rawProp = decl.slice(0, colonIdx)
  const val = decl.slice(colonIdx + 1)

  const propMatch = rawProp.match(/^(\s*)(.*?)(\s*)$/)
  const leadingSpace = propMatch ? propMatch[1] : ''
  const prop = propMatch ? propMatch[2] : rawProp
  const trailingSpace = propMatch ? propMatch[3] : ''

  const propHtml = `${escapeHtml(leadingSpace)}<span class="hl-property">${escapeHtml(prop)}</span>${escapeHtml(trailingSpace)}`
  const colonHtml = `<span class="hl-punct">:</span>`

  // Highlight value tokens (strings, numbers with units, colors, vars)
  const valRegex = /(\/\*[\s\S]*?\*\/)|(var\(--[a-zA-Z0-9_-]+\)|--[a-zA-Z0-9_-]+)|(#[0-9a-fA-F]{3,8})|(\b\d+(?:\.\d+)?(?:px|rem|em|vw|vh|%|s|ms|deg|fr)?\b)|(!important\b)/g
  let last = 0
  let valHtml = ''
  let vm
  while ((vm = valRegex.exec(val)) !== null) {
    const before = val.slice(last, vm.index)
    if (before) valHtml += escapeHtml(before)

    const [full, comment, cssVar, color, numUnit, important] = vm
    if (comment) valHtml += `<span class="hl-comment">${escapeHtml(comment)}</span>`
    else if (cssVar) valHtml += `<span class="hl-var">${escapeHtml(cssVar)}</span>`
    else if (color) valHtml += `<span class="hl-string">${escapeHtml(color)}</span>`
    else if (numUnit) valHtml += `<span class="hl-number">${escapeHtml(numUnit)}</span>`
    else if (important) valHtml += `<span class="hl-keyword">${escapeHtml(important)}</span>`
    else valHtml += escapeHtml(full)

    last = vm.index + full.length
  }
  const rem = val.slice(last)
  if (rem) valHtml += escapeHtml(rem)

  return propHtml + colonHtml + valHtml
}

/**
 * Highlights HTML / Template code tokens.
 * @param {string} code
 * @returns {string}
 */
export const highlightHtml = (code) => {
  if (!code) return ''

  // Matches HTML comments, DOCTYPE, and tags with attributes
  const tagRegex = /(<!--[\s\S]*?-->)|(<!DOCTYPE[^>]*>)|(<(\/?[a-zA-Z0-9_:-]+)((?:\s+[@:v#a-zA-Z0-9_:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>)/g

  let lastIndex = 0
  let html = ''
  let match

  while ((match = tagRegex.exec(code)) !== null) {
    const textBefore = code.slice(lastIndex, match.index)
    if (textBefore) html += escapeHtml(textBefore)

    const [full, comment, doctype, tagContent, tagName, attrs, selfClose] = match

    if (comment) {
      html += `<span class="hl-comment">${escapeHtml(comment)}</span>`
    } else if (doctype) {
      html += `<span class="hl-keyword">${escapeHtml(doctype)}</span>`
    } else if (tagContent) {
      const isClosing = tagName.startsWith('/')
      html += `<span class="hl-punct">&lt;${isClosing ? '/' : ''}</span><span class="hl-tag">${escapeHtml(isClosing ? tagName.slice(1) : tagName)}</span>`

      if (attrs) {
        // Tokenize attributes: attr="value" or attr
        const attrRegex = /\s+([@:v#a-zA-Z0-9_:-]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g
        let am
        while ((am = attrRegex.exec(attrs)) !== null) {
          const [, attrName, attrVal] = am
          html += ` <span class="hl-attr">${escapeHtml(attrName)}</span>`
          if (attrVal !== undefined) {
            html += `<span class="hl-punct">=</span><span class="hl-string">${escapeHtml(attrVal)}</span>`
          }
        }
      }

      if (selfClose) {
        html += `<span class="hl-punct"> /&gt;</span>`
      } else {
        html += `<span class="hl-punct">&gt;</span>`
      }
    } else {
      html += escapeHtml(full)
    }

    lastIndex = match.index + full.length
  }

  const remaining = code.slice(lastIndex)
  if (remaining) html += escapeHtml(remaining)

  return html
}

/**
 * Highlights a complete Vue Single File Component (.vue).
 * Parses <template>, <script>, and <style> sections and applies sub-highlighters.
 * @param {string} code
 * @returns {string}
 */
export const highlightVue = (code) => {
  if (!code) return ''

  const sectionRegex = /(<(template|script|style)(\b[^>]*)>)([\s\S]*?)(<\/\2>)/gi
  let lastIndex = 0
  let html = ''
  let match
  let foundSection = false

  while ((match = sectionRegex.exec(code)) !== null) {
    foundSection = true
    const textBefore = code.slice(lastIndex, match.index)
    if (textBefore) html += highlightHtml(textBefore)

    const [full, openTag, tagType, _tagAttrs, body, closeTag] = match

    // Highlight opening tag
    html += highlightHtml(openTag)

    // Highlight body based on section type
    const lowerType = tagType.toLowerCase()
    if (lowerType === 'script') {
      html += highlightJs(body)
    } else if (lowerType === 'style') {
      html += highlightCss(body)
    } else {
      html += highlightHtml(body)
    }

    // Highlight closing tag
    html += highlightHtml(closeTag)

    lastIndex = match.index + full.length
  }

  const remaining = code.slice(lastIndex)
  if (remaining) {
    html += foundSection ? highlightHtml(remaining) : highlightHtml(code)
  }

  return html
}

/**
 * Highlights a code snippet based on the target language.
 *
 * @param {string} code - Raw code string
 * @param {string} [lang=''] - Target language identifier ('vue', 'html', 'htmls', 'js', 'javascript', 'css')
 * @returns {string} HTML string with syntax tokens wrapped in span elements
 */
export const highlightCode = (code, lang = '') => {
  if (!code) return ''

  const normalizedLang = String(lang).toLowerCase().trim()

  switch (normalizedLang) {
  case 'vue':
    return highlightVue(code)
  case 'html':
  case 'htmls':
    return highlightHtml(code)
  case 'js':
  case 'javascript':
    return highlightJs(code)
  case 'css':
    return highlightCss(code)
  default:
    return escapeHtml(code)
  }
}
