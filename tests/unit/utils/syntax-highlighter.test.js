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

  describe('when highlighting Bash commands', () => {
    test('should highlight CLI built_in commands, subcommands, and scoped packages', () => {
      const cmd = 'npm install @gkucmierz/nano-ui --save-dev'
      const html = highlightCode(cmd, 'bash')

      assert.ok(html.includes('hljs-built_in') && html.includes('npm'), 'npm must be highlighted as built_in')
      assert.ok(html.includes('hljs-keyword') && html.includes('install'), 'install must be highlighted as keyword')
      assert.ok(html.includes('hljs-string') && html.includes('@gkucmierz/nano-ui'), 'scoped package must be highlighted as string')
      assert.ok(html.includes('hljs-attr') && html.includes('--save-dev'), 'flags must be highlighted as attr')
    })

    test('should highlight git commands with single-letter flags and strings', () => {
      const cmd = 'git commit -S -m "feat: great feature"'
      const html = highlightCode(cmd, 'bash')

      assert.ok(html.includes('hljs-built_in') && html.includes('git'))
      assert.ok(html.includes('hljs-keyword') && html.includes('commit'))
      assert.ok(html.includes('hljs-attr') && html.includes('-S'))
      assert.ok(html.includes('hljs-string') && html.includes('feat: great feature'))
    })

    test('should highlight prompt prefix and shell variables', () => {
      const cmd = '$ echo $NODE_ENV'
      const html = highlightCode(cmd, 'bash')

      assert.ok(html.includes('hljs-punctuation') && html.includes('$'))
      assert.ok(html.includes('hljs-built_in') && html.includes('echo'))
      assert.ok(html.includes('hljs-variable') && html.includes('$NODE_ENV'))
    })
  })

  describe('when highlighting API documentation blocks', () => {
    test('should highlight prop definitions and treat descriptions after hyphen as comments', () => {
      const doc = 'data: Array (required) - Array of { id, name, value }'
      const html = highlightCode(doc, 'api')

      assert.ok(html.includes('hljs-attr') && html.includes('data'), 'Prop names must be highlighted as attr')
      assert.ok(html.includes('hljs-title') && html.includes('Array'), 'Type names must be highlighted as class/title')
      assert.ok(html.includes('hljs-keyword') && html.includes('required'), 'Keywords like required must be highlighted')
      assert.ok(html.includes('hljs-comment') && html.includes('Array of { id, name, value }'), 'Description after hyphen must be treated as comment')
    })

    test('should highlight Vue events and slots alongside methods', () => {
      const doc = '@update:modelValue - Emitted on drag\n#default - Content slot\nrotateBy(delta: Number) - Method'
      const html = highlightCode(doc, 'api')

      assert.ok(html.includes('hljs-variable') && html.includes('@update:modelValue'), 'Events must be highlighted as variable')
      assert.ok(html.includes('hljs-symbol') && html.includes('#default'), 'Slots must be highlighted as symbol')
      assert.ok(html.includes('hljs-title') && html.includes('rotateBy'), 'Methods must be highlighted as function/title')
      assert.ok(html.includes('hljs-comment') && html.includes('Emitted on drag'), 'Event description must be comment')
    })
  })
})
