import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@vue/compiler-sfc'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sfcPath = path.resolve(__dirname, '../../../src/components/NanoCodeBlock.vue')
const sfcContent = fs.readFileSync(sfcPath, 'utf-8')
const { descriptor } = parse(sfcContent)

describe('NanoCodeBlock Component Structure & Slot Fallback', () => {
  test('should import highlightCode from syntax-highlighter', () => {
    assert.match(descriptor.scriptSetup.content, /import\s*\{\s*highlightCode\s*\}\s*from\s*['"]\.\.\/utils\/syntax-highlighter\.js['"]/)
  })

  test('should compute highlightedCode using highlightCode utility', () => {
    assert.match(descriptor.scriptSetup.content, /const\s+highlightedCode\s*=\s*computed\(/)
    assert.match(descriptor.scriptSetup.content, /highlightCode\(currentCode\.value,\s*currentLang\.value\)/)
  })

  test('should preserve default slot fallback in pre element when currentCode is empty', () => {
    const templateContent = descriptor.template.content
    assert.match(templateContent, /<pre ref="preRef" class="code-block-pre">/)
    assert.match(templateContent, /<slot\s+v-else\s*\/>/)
  })

  test('should include scoped styling tokens for syntax highlight classes', () => {
    const styleContent = descriptor.styles.map(s => s.content).join('\n')
    assert.match(styleContent, /\.hl-keyword/)
    assert.match(styleContent, /\.hl-string/)
    assert.match(styleContent, /\.hl-number/)
    assert.match(styleContent, /\.hl-comment/)
    assert.match(styleContent, /\.hl-tag/)
  })
})
