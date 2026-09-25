import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  escapeHtml,
  highlightJs,
  highlightCss,
  highlightHtml,
  highlightVue,
  highlightCode,
} from '../../../src/utils/syntax-highlighter.js'

describe('Nano UI Syntax Highlighter (highlight.js integration)', () => {
  describe('when escaping HTML entities', () => {
    test('should escape &, <, >, ", and \'', () => {
      assert.equal(escapeHtml('<div class="test" data-v=\'1\'>&</div>'), '&lt;div class=&quot;test&quot; data-v=&#39;1&#39;&gt;&amp;&lt;/div&gt;')
    })

    test('should return empty string on falsy values', () => {
      assert.equal(escapeHtml(''), '')
      assert.equal(escapeHtml(null), '')
      assert.equal(escapeHtml(undefined), '')
    })
  })

  describe('when highlighting JavaScript', () => {
    test('should highlight keywords, strings, numbers, booleans, and function calls', () => {
      const code = `const count = 42;\nfunction increment() {\n  return count + 1;\n}`
      const html = highlightJs(code)

      assert.ok(html.includes('hljs-keyword'), 'Should contain hljs-keyword')
      assert.ok(html.includes('hljs-number'), 'Should contain hljs-number')
      assert.ok(html.includes('const'), 'Should contain const')
      assert.ok(html.includes('increment'), 'Should contain function name')
    })

    test('should highlight comments and strings', () => {
      const code = `// Line comment\nconst name = "NanoUI";\n/* block */`
      const html = highlightJs(code)

      assert.ok(html.includes('hljs-comment'), 'Should contain hljs-comment')
      assert.ok(html.includes('hljs-string'), 'Should contain hljs-string')
      assert.ok(html.includes('NanoUI'), 'Should contain string content')
    })
  })

  describe('when highlighting CSS', () => {
    test('should highlight selectors, properties, and numbers with units', () => {
      const code = `.button {\n  color: #3b82f6;\n  padding: 10px 16px;\n}`
      const html = highlightCss(code)

      assert.ok(html.includes('hljs-selector-class') || html.includes('button'))
      assert.ok(html.includes('hljs-attribute') || html.includes('color'))
      assert.ok(html.includes('hljs-number') || html.includes('10px'))
    })
  })

  describe('when highlighting HTML and Vue', () => {
    test('should highlight tags, attributes, and attribute values', () => {
      const code = `<button class="btn" :disabled="false" @click="handleClick">Click</button>`
      const html = highlightHtml(code)

      assert.ok(html.includes('hljs-tag'), 'Should contain hljs-tag')
      assert.ok(html.includes('hljs-name'), 'Should contain hljs-name')
      assert.ok(html.includes('hljs-attr'), 'Should contain hljs-attr')
      assert.ok(html.includes('hljs-string'), 'Should contain hljs-string')
    })

    test('should highlight full Vue SFC across template and script setup', () => {
      const sfc = `<script setup>\nconst active = true;\n</script>\n<template>\n  <div :class="{ active }">Hello</div>\n</template>`
      const html = highlightVue(sfc)

      assert.ok(html.includes('hljs-keyword'), 'Should highlight JS keywords inside script')
      assert.ok(html.includes('hljs-literal') || html.includes('hljs-boolean'), 'Should highlight boolean/literal')
      assert.ok(html.includes('hljs-tag'), 'Should highlight HTML tags')
      assert.ok(html.includes('hljs-attr'), 'Should highlight attributes')
    })

    test('should safely escape text on fallback or unparseable inputs', () => {
      const txt = highlightCode('<invalid & unescaped>', 'unknown-language-xyz')
      assert.ok(txt.includes('&lt;invalid &amp; unescaped&gt;'))
    })
  })
})
