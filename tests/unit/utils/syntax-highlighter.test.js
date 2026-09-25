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

describe('Nano UI Syntax Highlighter (playground-code-blocks recipe)', () => {
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

      assert.ok(html.includes('<span class="hl-keyword">const</span>'))
      assert.ok(html.includes('<span class="hl-number">42</span>'))
      assert.ok(html.includes('<span class="hl-keyword">function</span>'))
      assert.ok(html.includes('<span class="hl-function">increment</span>'))
      assert.ok(html.includes('<span class="hl-keyword">return</span>'))
      assert.ok(html.includes('<span class="hl-number">1</span>'))
    })

    test('should highlight comments and strings', () => {
      const code = `// Line comment\nconst name = "NanoUI";\n/* block */`
      const html = highlightJs(code)

      assert.ok(html.includes('<span class="hl-comment">// Line comment</span>'))
      assert.ok(html.includes('<span class="hl-string">&quot;NanoUI&quot;</span>'))
      assert.ok(html.includes('<span class="hl-comment">/* block */</span>'))
    })
  })

  describe('when highlighting CSS', () => {
    test('should highlight selectors, properties, numbers with units, and variables', () => {
      const code = `.button {\n  color: var(--nano-color);\n  padding: 10px 16px;\n}`
      const html = highlightCss(code)

      assert.ok(html.includes('<span class="hl-selector">.button </span>') || html.includes('hl-selector'))
      assert.ok(html.includes('<span class="hl-property">color</span>') || html.includes('hl-property'))
      assert.ok(html.includes('<span class="hl-var">var(--nano-color)</span>'))
      assert.ok(html.includes('<span class="hl-property">padding</span>') || html.includes('hl-property'))
      assert.ok(html.includes('<span class="hl-number">10px</span>'))
    })
  })

  describe('when highlighting HTML and Vue', () => {
    test('should highlight tags, attributes, and attribute values', () => {
      const code = `<button class="btn" :disabled="false" @click="handleClick">Click</button>`
      const html = highlightHtml(code)

      assert.ok(html.includes('<span class="hl-tag">button</span>'))
      assert.ok(html.includes('<span class="hl-attr">class</span>'))
      assert.ok(html.includes('<span class="hl-string">&quot;btn&quot;</span>'))
      assert.ok(html.includes('<span class="hl-attr">:disabled</span>'))
      assert.ok(html.includes('<span class="hl-attr">@click</span>'))
    })

    test('should highlight full Vue SFC across template, script, and style', () => {
      const sfc = `<script setup>\nconst active = true;\n</script>\n<template>\n  <div :class="{ active }">Hello</div>\n</template>\n<style scoped>\n.active { color: #00f2fe; }\n</style>`
      const html = highlightVue(sfc)

      assert.ok(html.includes('<span class="hl-keyword">const</span>'), 'Should highlight JS inside script')
      assert.ok(html.includes('<span class="hl-boolean">true</span>'), 'Should highlight boolean inside script')
      assert.ok(html.includes('<span class="hl-tag">div</span>'), 'Should highlight HTML tag inside template')
      assert.ok(html.includes('<span class="hl-attr">:class</span>'), 'Should highlight Vue attribute inside template')
      assert.ok(html.includes('<span class="hl-property">color</span>'), 'Should highlight CSS property inside style')
      assert.ok(html.includes('<span class="hl-string">#00f2fe</span>'), 'Should highlight CSS color inside style')
    })

    test('should fallback to plain escaped text for unsupported languages', () => {
      const txt = highlightCode('git commit -m "feat"', 'bash')
      assert.equal(txt, 'git commit -m &quot;feat&quot;')
    })
  })
})
